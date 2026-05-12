/**
 * POST /api/weekly-orders/:id/confirmar
 *
 * Promove pedido de 'rascunho' pra 'confirmado'. Idempotência via 409
 * `already_confirmed`. Bloqueia se passou do cutoff.
 */
import { supabaseAdmin } from "../../../src/lib/supabase-admin.js";
import { isValidUUID } from "../../../src/lib/validators.js";
import { isPastCutoff } from "../../_lib/cutoff.js";

const PUBLIC_FIELDS =
  "id, subscription_id, delivery_date, composition, extras, total_extras, status, confirmed_at, created_at, updated_at";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const { id } = req.query || {};
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: "invalid_id" });
  }

  const { data: order, error: readErr } = await supabaseAdmin
    .from("weekly_orders")
    .select("id, status, delivery_date")
    .eq("id", id)
    .maybeSingle();
  if (readErr) {
    console.error("[weekly-orders confirmar] read failed", readErr);
    return res.status(500).json({ error: "internal_error" });
  }
  if (!order) return res.status(404).json({ error: "weekly_order_not_found" });
  if (order.status === "confirmado") {
    return res.status(409).json({ error: "already_confirmed" });
  }
  if (isPastCutoff(order.delivery_date)) {
    return res.status(409).json({ error: "cutoff_passed" });
  }

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("weekly_orders")
    .update({ status: "confirmado", confirmed_at: new Date().toISOString() })
    .eq("id", id)
    .select(PUBLIC_FIELDS)
    .single();
  if (updateErr) {
    console.error("[weekly-orders confirmar] update failed", updateErr);
    return res.status(500).json({ error: "internal_error" });
  }

  return res.status(200).json(updated);
}
