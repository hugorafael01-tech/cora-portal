/**
 * POST /api/coverage-waitlist
 *
 * Registra interesse de usuario fora de cobertura. Nao dispara e-mail.
 */
import { supabaseAdmin } from "../src/lib/supabase-admin.js";
import { canonicalizeDigits } from "../src/lib/validators.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const body = req.body || {};
  const { cpf, nome, whatsapp, email, cep, bairro, cidade, estado } = body;

  if (!whatsapp) return res.status(400).json({ error: "missing_fields", fields: ["whatsapp"] });
  if (!cep) return res.status(400).json({ error: "missing_fields", fields: ["cep"] });

  const insertPayload = {
    cpf: cpf ? canonicalizeDigits(cpf) : null,
    nome: nome ? String(nome).trim() : null,
    whatsapp: canonicalizeDigits(whatsapp),
    email: email ? String(email).trim().toLowerCase() : null,
    cep: canonicalizeDigits(cep),
    bairro: bairro ? String(bairro).trim() : null,
    cidade: cidade ? String(cidade).trim() : null,
    estado: estado ? String(estado).trim() : null,
  };

  const { error } = await supabaseAdmin
    .from("coverage_waitlist")
    .insert(insertPayload);

  if (error) {
    console.error("[coverage-waitlist POST] insert error", error);
    return res.status(500).json({ error: "internal_error" });
  }

  return res.status(201).json({ ok: true });
}
