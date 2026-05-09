/**
 * GET /api/subscriptions/[id]
 *
 * Retorna so o que a Home precisa renderizar pra reconciliar status.
 * NAO retorna CPF, e-mail, WhatsApp, endereco completo.
 */
import { supabaseAdmin } from "../../src/lib/supabase-admin.js";
import { isValidUUID } from "../../src/lib/validators.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const { id } = req.query || {};
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: "invalid_id" });
  }

  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("id, status, nome, itens, total_paes, valor_mensal, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[subscriptions GET] select error", error);
    return res.status(500).json({ error: "internal_error" });
  }

  if (!data) {
    return res.status(404).json({ error: "not_found" });
  }

  return res.status(200).json(data);
}
