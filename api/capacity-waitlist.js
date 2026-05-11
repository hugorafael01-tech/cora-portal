/**
 * POST /api/capacity-waitlist
 *
 * Insere registro na lista de espera por capacidade produtiva.
 * Idempotente por email (citext + unique index).
 *
 * Dispara email de confirmação via Resend (best-effort, igual ao
 * pattern de POST /api/subscriptions). Email só sai em criação nova,
 * não em hit de idempotência.
 *
 * Diferente de /api/coverage-waitlist (waitlist por bairro fora de
 * cobertura). Aqui a lista é por capacidade do lançamento.
 */
import { supabaseAdmin } from "../src/lib/supabase-admin.js";
import { resend } from "../src/lib/resend.js";
import {
  canonicalizeDigits,
  isValidEmail,
  isValidWhatsApp,
  isValidCEP,
} from "../src/lib/validators.js";

const buildEmailText = (nome) => `Oi, ${nome}.

Recebemos seu contato. Assim que uma vaga abrir te avisamos, ok?

Enquanto isso, acompanha a gente no Instagram @cora.padaria.

Valeu pela paciência.

Hugo
`;

const buildEmailHtml = (nome) => `<!doctype html>
<html lang="pt-BR">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; line-height: 1.6; max-width: 520px; margin: 0 auto; padding: 24px;">
  <p>Oi, ${nome}.</p>
  <p>Recebemos seu contato. Assim que uma vaga abrir te avisamos, ok?</p>
  <p>Enquanto isso, acompanha a gente no Instagram <a href="https://instagram.com/cora.padaria" style="color: #1a1a1a;">@cora.padaria</a>.</p>
  <p>Valeu pela paciência.</p>
  <p style="margin-top: 32px;">Hugo</p>
</body>
</html>`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const body = req.body || {};
  const { nome, email, whatsapp, cep } = body;

  // ─── Validações por campo (retorna 400 com fields detalhados) ───
  const fields = {};
  const nomeTrim = (nome ?? "").toString().trim();
  if (nomeTrim.length < 2) fields.nome = "invalido";

  if (!isValidEmail(email)) fields.email = "invalido";

  const whatsappDigits = canonicalizeDigits(whatsapp);
  if (!isValidWhatsApp(whatsappDigits)) fields.whatsapp = "invalido";

  const cepDigits = canonicalizeDigits(cep);
  if (!isValidCEP(cepDigits)) fields.cep = "invalido";

  if (Object.keys(fields).length > 0) {
    return res.status(400).json({ error: "validation_failed", fields });
  }

  const emailNormalized = String(email).trim().toLowerCase();
  const insertPayload = {
    nome: nomeTrim,
    email: emailNormalized,
    whatsapp: whatsappDigits,
    cep: cepDigits,
  };

  // ─── INSERT com tratamento de duplicata (idempotência por email) ───
  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from("capacity_waitlist")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertErr) {
    // 23505 = unique_violation → email já existe, idempotência
    if (insertErr.code === "23505") {
      const { data: existing, error: selectErr } = await supabaseAdmin
        .from("capacity_waitlist")
        .select("id")
        .eq("email", emailNormalized)
        .maybeSingle();
      if (selectErr || !existing) {
        console.error("[capacity-waitlist POST] dupe but select failed", selectErr);
        return res.status(500).json({ error: "internal_error" });
      }
      return res.status(200).json({ id: existing.id, status: "already_exists" });
    }
    console.error("[capacity-waitlist POST] insert error", insertErr);
    return res.status(500).json({ error: "internal_error" });
  }

  // ─── Email best-effort (igual pattern de subscriptions) ───
  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: emailNormalized,
      subject: "Recebemos seu contato",
      text: buildEmailText(nomeTrim),
      html: buildEmailHtml(nomeTrim),
    });
    if (result?.error) {
      console.error("[capacity-waitlist POST] email error", result.error);
    } else {
      console.log("[capacity-waitlist POST] email sent", result?.data?.id);
    }
  } catch (err) {
    console.error("[capacity-waitlist POST] email throw", err);
  }

  return res.status(201).json({ id: inserted.id, status: "created" });
}
