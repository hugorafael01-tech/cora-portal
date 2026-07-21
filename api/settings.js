/**
 * GET /api/settings
 *
 * Retorna flags globais lidas pelo App no boot.
 *
 * `subscriptions_open` e o gate EFETIVO: switch manual
 * (app_settings.subscriptions_open) E capacidade (occupied < max). Quando o
 * lancamento lota, o portal fecha sozinho sem flip manual (decisao 20/07/2026).
 * Expoe tambem `capacity_full`, `max_subscriptions` e `occupied` pra quem
 * quiser exibir contexto; o Splash so precisa do gate efetivo.
 *
 * FAIL-CLOSED: qualquer falha de leitura devolve gate FECHADO
 * (`subscriptions_open:false`). Nunca abrir o gate por erro (ver readCapacityGate).
 *
 * Sem cache: latência aceitável e simplifica raciocínio. Se virar
 * gargalo, dá pra adicionar cache in-memory de 30s na function.
 */
import { supabaseAdmin } from "../src/lib/supabase-admin.js";
import { readCapacityGate } from "./_lib/capacity.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const gate = await readCapacityGate(supabaseAdmin);

  return res.status(200).json({
    subscriptions_open: gate.open,
    capacity_full: gate.capacityFull,
    max_subscriptions: gate.maxSubscriptions,
    occupied: gate.occupied,
  });
}
