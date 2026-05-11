/**
 * GET /api/settings
 *
 * Retorna flags globais lidas pelo App no boot.
 * Hoje só expõe `subscriptions_open` (capacity gate).
 *
 * Sem cache: latência aceitável e simplifica raciocínio. Se virar
 * gargalo, dá pra adicionar cache in-memory de 30s na function.
 */
import { supabaseAdmin } from "../src/lib/supabase-admin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .select("subscriptions_open")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    // Fallback seguro: assume aberto pra não bloquear o portal caso a
    // row do singleton suma. Loga pra investigação.
    console.error("[settings GET] read failed, defaulting to open", error);
    return res.status(200).json({ subscriptions_open: true });
  }

  return res.status(200).json({ subscriptions_open: data.subscriptions_open });
}
