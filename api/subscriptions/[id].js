/**
 * /api/subscriptions/[id]
 *
 * GET — retorna so o que o Perfil precisa pro bloco Cobranca (decomposicao
 *       valor_paes/valor_frete + next_billing_*) e a Home pra reconciliar
 *       status. NAO retorna CPF, e-mail, WhatsApp, endereco completo.
 *
 * Frente D / D.4: a edicao de composicao saiu daqui. Agora e PATCH
 * /api/subscriptions (session-scoped, user_id do JWT) — ver api/subscriptions/
 * index.js. Este arquivo ficou GET-only.
 */
import { supabaseAdmin } from "../../src/lib/supabase-admin.js";
import { isValidUUID } from "../../src/lib/validators.js";

// Campos que GET expoe (inclui os 2 de cobranca futura e a decomposicao
// valor_paes/valor_frete usada pelo bloco Cobranca do Perfil). Frete e R$ 15
// universal; valor_frete e so a fonte do valor exibido. Sem CPF/email/whatsapp.
const GET_FIELDS =
  "id, status, nome, itens, total_paes, valor_paes, valor_frete, valor_mensal, next_billing_change_date, next_billing_value, created_at";

export default async function handler(req, res) {
  const { id } = req.query || {};
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: "invalid_id" });
  }

  if (req.method === "GET") {
    return handleGet(id, res);
  }
  return res.status(405).json({ error: "method_not_allowed" });
}

async function handleGet(id, res) {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select(GET_FIELDS)
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
