/**
 * POST /api/subscriptions
 *
 * Cria assinatura pendente em pending_payment, dispara e-mail pro Hugo.
 * Idempotente por CPF: clique duplo retorna o mesmo subscription_id e nao
 * dispara segundo e-mail.
 *
 * Os calculos monetarios sao feitos no servidor — payload nao envia valores.
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

  // ─── Validacoes ───
  if (!isValidCPF(cpfDigits)) return res.status(422).json({ error: "invalid_cpf" });
  if (!isValidEmail(email)) return res.status(422).json({ error: "invalid_email" });
  if (!isValidWhatsApp(whatsappDigits)) return res.status(422).json({ error: "invalid_whatsapp" });
  if (!isValidCEP(cepDigits)) return res.status(422).json({ error: "invalid_cep" });

  const totalPaes = Object.values(itens).reduce((s, q) => s + (Number(q) || 0), 0);
  if (totalPaes < 1 || totalPaes > 3) {
    return res.status(422).json({ error: "invalid_qty" });
  }

  // ─── Calculos no servidor (nao confia no payload) ───
  const valorPaes = totalPaes * VALOR_POR_PAO;
  const valorFrete = FRETE_MENSAL;
  const valorMensal = valorPaes + valorFrete;

  const insertPayload = {
    nome: String(nome).trim(),
    whatsapp: whatsappDigits,
    email: String(email).trim().toLowerCase(),
    cpf: cpfDigits,
    cep: cepDigits,
    rua: String(endereco.rua).trim(),
    numero: String(endereco.numero).trim(),
    complemento: endereco.complemento ? String(endereco.complemento).trim() : null,
    bairro: String(endereco.bairro).trim(),
    cidade: String(endereco.cidade).trim(),
    estado: String(endereco.estado).trim(),
    itens,
    total_paes: totalPaes,
    valor_paes: valorPaes,
    valor_frete: valorFrete,
    valor_mensal: valorMensal,
    coverage_unconfirmed: !!coverage_unconfirmed,
  };

  // ─── INSERT com tratamento de duplicata ───
  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from("subscriptions")
    .insert(insertPayload)
    .select("id, status")
    .single();

  let subscription_id;
  let status;
  let newRecord = true;

  if (insertErr) {
    // 23505 = unique_violation. Indice subscriptions_cpf_pending_uniq impede
    // 2 pendings com mesmo CPF.
    if (insertErr.code === "23505") {
      const { data: existing, error: selectErr } = await supabaseAdmin
        .from("subscriptions")
        .select("id, status")
        .eq("cpf", cpfDigits)
        .eq("status", "pending_payment")
        .maybeSingle();
      if (selectErr || !existing) {
        console.error("[subscriptions POST] dupe but select failed", selectErr);
        return res.status(500).json({ error: "internal_error" });
      }
      subscription_id = existing.id;
      status = existing.status;
      newRecord = false;
    } else {
      console.error("[subscriptions POST] insert error", insertErr);
      return res.status(500).json({ error: "internal_error" });
    }
  } else {
    subscription_id = inserted.id;
    status = inserted.status;
  }

  // ─── Email so dispara em insert novo ───
  if (newRecord) {
    try {
      // SDK Resend v4+ retorna { data, error } sem throw. Precisa checar
      // .error explicitamente, senao falhas silenciosas passam batido.
      const result = await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: process.env.EMAIL_TO,
        subject: `[Cora] Nova assinatura — ${insertPayload.nome}`,
        text: buildEmailBody(insertPayload),
      });
      if (result?.error) {
        console.error("[subscriptions POST] email error", result.error);
      } else {
        console.log("[subscriptions POST] email sent", result?.data?.id);
      }
    } catch (err) {
      // Falha de email NAO bloqueia resposta. Logado pra debug.
      console.error("[subscriptions POST] email throw", err);
    }
    return res.status(201).json({ subscription_id, status });
  }

  // Idempotencia: registro pre-existente, retorna 200 sem novo email
  return res.status(200).json({ subscription_id, status });
}
