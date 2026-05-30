/**
 * POST /api/subscriptions  (Frente D / D.3 — onboarding escreve no DB)
 *
 * Orquestra a criacao completa do assinante no Confirmar do onboarding:
 *   1. auth user (admin.createUser, sem senha, email_confirm:true)
 *   2. profile (user_id, nome, whatsapp, cpf)
 *   3. subscription (shape novo + double-write das colunas legadas)
 * e dispara e-mail pro Hugo. Os calculos monetarios sao feitos no servidor.
 *
 * Precedencia de erro: EMAIL antes de CPF.
 *   - email ja registrado -> 409 { error: "email_exists" } (nada criado).
 *   - cpf ja em profiles (unique) -> 409 { error: "cpf_exists" }, com cleanup
 *     do auth user recem-criado. A unique de profiles.cpf e a guarda real,
 *     inclusive contra corrida (sem pre-check separado nem scan de listUsers).
 * Qualquer falha pos-createUser faz cleanup pra nao deixar usuario orfao.
 *
 * service_role bypassa RLS; este handler so roda node-side (api/).
 */
import { supabaseAdmin } from "../../src/lib/supabase-admin.js";
import { resend } from "../../src/lib/resend.js";
import {
  canonicalizeDigits,
  isValidCPF,
  isValidEmail,
  isValidWhatsApp,
  isValidCEP,
} from "../../src/lib/validators.js";

const VALOR_POR_PAO = 99;
const FRETE_MENSAL = 15;

const PRODUTO_NOMES = {
  original: "Pão Original",
  integral: "Pão Integral",
};

// ─── Formatadores pra e-mail ───
const fmtWhatsApp = (d) => d?.length === 11
  ? `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  : `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
const fmtCPF = (d) => `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
const fmtCEP = (d) => `${d.slice(0,5)}-${d.slice(5)}`;
const fmtMoney = (n) => `R$ ${Number(n).toFixed(2).replace(".", ",")}`;

const detalharItens = (itens) => {
  const partes = Object.entries(itens)
    .filter(([, q]) => q > 0)
    .map(([id, q]) => `${q}× ${PRODUTO_NOMES[id] || id}`);
  return partes.join(" + ");
};

const buildEmailBody = (sub) => `Nova assinatura recebida.

Assinante: ${sub.nome}
WhatsApp: ${fmtWhatsApp(sub.whatsapp)}
E-mail: ${sub.email}
CPF: ${fmtCPF(sub.cpf)}

Endereço:
${sub.rua}, ${sub.numero}
${sub.complemento ? sub.complemento + "\n" : ""}${sub.bairro} — ${sub.cidade}/${sub.estado}
${fmtCEP(sub.cep)}

Assinatura:
${sub.total_paes} pão${sub.total_paes === 1 ? "" : "(ães)"} por semana
${detalharItens(sub.itens)}

Pães:    ${fmtMoney(sub.valor_paes)}  (${sub.total_paes} × R$ 99,00)
Entrega: ${fmtMoney(sub.valor_frete)}
Total:   ${fmtMoney(sub.valor_mensal)} / mês

Status: aguardando criação de cobrança no Asaas.
${sub.coverage_unconfirmed ? "⚠ Cobertura não confirmada automaticamente. Verificar manualmente.\n\n" : ""}
Acessar Asaas: https://www.asaas.com/

---
Esta mensagem foi gerada automaticamente pelo portal Cora.
`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  // ─── Capacity gate (defesa em profundidade contra condicao de corrida) ───
  // Frontend ja checa via GET /api/settings, mas alguem pode ter aberto a
  // pagina antes do flip do switch. Backend rejeita ANTES de validar payload.
  const { data: settings, error: settingsErr } = await supabaseAdmin
    .from("app_settings")
    .select("subscriptions_open")
    .eq("id", 1)
    .maybeSingle();

  if (settingsErr) {
    // Fail-open: prefere aceitar a assinatura a bloquear uma venda boa por
    // falha de leitura. Loga pra investigacao.
    console.error("[subscriptions POST] settings read failed, defaulting to open", settingsErr);
  } else if (settings && settings.subscriptions_open === false) {
    return res.status(409).json({
      error: "subscriptions_closed",
      message: "As vagas estão temporariamente fechadas. Entre na lista de espera.",
    });
  }

  const body = req.body || {};
  const { nome, whatsapp, email, cpf, endereco, itens, coverage_unconfirmed } = body;

  // ─── Campos obrigatorios ───
  const missing = [];
  if (!nome) missing.push("nome");
  if (!whatsapp) missing.push("whatsapp");
  if (!email) missing.push("email");
  if (!cpf) missing.push("cpf");
  if (!endereco) missing.push("endereco");
  if (!itens) missing.push("itens");
  if (endereco) {
    ["cep", "rua", "numero", "bairro", "cidade", "estado"].forEach((f) => {
      if (!endereco[f]) missing.push(`endereco.${f}`);
    });
  }
  if (missing.length > 0) {
    return res.status(400).json({ error: "missing_fields", fields: missing });
  }

  // ─── Canonicaliza ───
  const cpfDigits = canonicalizeDigits(cpf);
  const whatsappDigits = canonicalizeDigits(whatsapp);
  const cepDigits = canonicalizeDigits(endereco.cep);
  const emailNorm = String(email).trim().toLowerCase();

  // ─── Validacoes ───
  if (!isValidCPF(cpfDigits)) return res.status(422).json({ error: "invalid_cpf" });
  if (!isValidEmail(emailNorm)) return res.status(422).json({ error: "invalid_email" });
  if (!isValidWhatsApp(whatsappDigits)) return res.status(422).json({ error: "invalid_whatsapp" });
  if (!isValidCEP(cepDigits)) return res.status(422).json({ error: "invalid_cep" });

  const qtyOriginal = Number(itens.original) || 0;
  const qtyIntegral = Number(itens.integral) || 0;
  const totalPaes = Object.values(itens).reduce((s, q) => s + (Number(q) || 0), 0);
  if (totalPaes < 1 || totalPaes > 3) {
    return res.status(422).json({ error: "invalid_qty" });
  }

  // ─── Calculos no servidor (nao confia no payload) ───
  const valorPaes = totalPaes * VALOR_POR_PAO;
  const valorFrete = FRETE_MENSAL;
  const valorMensal = valorPaes + valorFrete;

  const nomeTrim = String(nome).trim();
  const bairroTrim = String(endereco.bairro).trim();
  const cidadeTrim = String(endereco.cidade).trim();

  // zona_entrega: sugestao derivada do endereco (revisavel pelo Hugo). COVERED_AREAS
  // nao expoe nome de zona, entao usa o bairro como melhor proxy, com fallback pra
  // cidade e, no pior caso, "a confirmar". Nunca null.
  const zonaEntrega = bairroTrim || cidadeTrim || "a confirmar";

  // Shape legado (colunas NOT NULL ainda presentes ate o cleanup 86e1mc0ta).
  // Reusado no insert da subscription (double-write) e no corpo do e-mail.
  const record = {
    nome: nomeTrim,
    whatsapp: whatsappDigits,
    email: emailNorm,
    cpf: cpfDigits,
    cep: cepDigits,
    rua: String(endereco.rua).trim(),
    numero: String(endereco.numero).trim(),
    complemento: endereco.complemento ? String(endereco.complemento).trim() : null,
    bairro: bairroTrim,
    cidade: cidadeTrim,
    estado: String(endereco.estado).trim(),
    itens,
    total_paes: totalPaes,
    valor_paes: valorPaes,
    valor_frete: valorFrete,
    valor_mensal: valorMensal,
    coverage_unconfirmed: !!coverage_unconfirmed,
  };

  // ════════════════════════════════════════════════════════════════
  // Orquestracao D.3: auth user -> profile -> subscription.
  // ════════════════════════════════════════════════════════════════

  // 1. Cria o usuario de auth (sem senha; magic-link funciona depois pois ja existe).
  const { data: createdAuth, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: emailNorm,
    email_confirm: true,
  });

  if (createErr) {
    // gotrue recusa e-mail ja registrado. Nada foi criado -> sem orfao.
    const dupEmail =
      createErr.code === "email_exists" ||
      /already.*regist/i.test(createErr.message || "");
    if (dupEmail) {
      return res.status(409).json({ error: "email_exists" });
    }
    console.error("[subscriptions POST] createUser failed", createErr);
    return res.status(500).json({ error: "internal_error" });
  }

  const userId = createdAuth.user.id;

  // Cleanup helper: desfaz o que foi criado (ordem inversa) pra nao deixar orfao.
  // Loga falhas de cleanup sem mascarar o erro original.
  const cleanup = async ({ profile = false } = {}) => {
    if (profile) {
      const { error } = await supabaseAdmin.from("profiles").delete().eq("user_id", userId);
      if (error) console.error("[subscriptions POST] cleanup profile delete failed", userId, error);
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) console.error("[subscriptions POST] cleanup deleteUser failed", userId, error);
  };

  // 2. Insere o profile. cpf UNIQUE e a guarda real contra dupe/corrida.
  const { error: profileErr } = await supabaseAdmin.from("profiles").insert({
    user_id: userId,
    nome: nomeTrim,
    whatsapp: whatsappDigits,
    cpf: cpfDigits,
  });

  if (profileErr) {
    if (profileErr.code === "23505") {
      // CPF ja cadastrado em outro profile. Remove o auth user recem-criado.
      await cleanup();
      return res.status(409).json({ error: "cpf_exists" });
    }
    console.error("[subscriptions POST] profile insert failed", profileErr);
    await cleanup();
    return res.status(500).json({ error: "internal_error" });
  }

  // 3. Insere a subscription (shape novo + double-write legado).
  const { data: insertedSub, error: subErr } = await supabaseAdmin
    .from("subscriptions")
    .insert({
      user_id: userId,
      status: "pending_payment",
      qty_total: totalPaes,
      qty_original: qtyOriginal,
      qty_integral: qtyIntegral,
      zona_entrega: zonaEntrega,
      ...record,
    })
    .select("id, status")
    .single();

  if (subErr) {
    await cleanup({ profile: true });
    // 23505 aqui = colisao no indice legado subscriptions_cpf_pending_uniq
    // (ex: assinatura de teste pendente sem profile com o mesmo CPF). Trata
    // como CPF ja existente em vez de estourar 500.
    if (subErr.code === "23505") {
      console.error("[subscriptions POST] subscription unique violation (legacy cpf_pending?)", subErr);
      return res.status(409).json({ error: "cpf_exists" });
    }
    console.error("[subscriptions POST] subscription insert failed", subErr);
    return res.status(500).json({ error: "internal_error" });
  }

  // 4. E-mail pro Hugo (best-effort; falha nao bloqueia a resposta).
  try {
    // SDK Resend v4+ retorna { data, error } sem throw. Precisa checar
    // .error explicitamente, senao falhas silenciosas passam batido.
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO,
      subject: `[Cora] Nova assinatura — ${record.nome}`,
      text: buildEmailBody(record),
    });
    if (result?.error) {
      console.error("[subscriptions POST] email error", result.error);
    } else {
      console.log("[subscriptions POST] email sent", result?.data?.id);
    }
  } catch (err) {
    console.error("[subscriptions POST] email throw", err);
  }

  return res.status(201).json({ subscription_id: insertedSub.id, status: insertedSub.status });
}
