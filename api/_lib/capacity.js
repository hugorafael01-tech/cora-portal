/**
 * Gate de assinaturas — trava de capacidade no servidor.
 *
 * Fonte de verdade UNICA, usada por dois lugares:
 *   - GET  /api/settings          : expoe o gate efetivo pro boot do App.
 *   - POST /api/subscriptions     : rejeita a criacao quando fechado/lotado.
 *
 * Decisao de produto (20/07/2026): o gate deixou de ser binario
 * (app_settings.subscriptions_open) e virou capacidade. Todo assinante que
 * OCUPA vaga conta: status IN ('active','pending_payment'). Quando a contagem
 * bate app_settings.max_subscriptions (schema criado na migration 0030/0031 do
 * Backoffice, integer NOT NULL DEFAULT 30), o portal fecha sozinho — sem flip
 * manual do switch.
 *
 * FAIL-CLOSED: qualquer falha de leitura (settings ou contagem) trata o gate
 * como FECHADO (`ok:false`, `open:false`). Nunca abrir o gate por erro — vale
 * mais recusar uma venda boa do que estourar a capacidade produtiva por um
 * timeout de banco.
 *
 * A contagem e feita no momento da chamada; a corrida de dois onboards
 * simultaneos batendo o limite ao mesmo tempo e risco aceito nesta escala
 * (sem lock).
 */

// Status que ocupam vaga (contam contra a capacidade).
export const STATUS_OCUPA_VAGA = ["active", "pending_payment"];

/**
 * Le o estado do gate. Retorna:
 *   ok:            leitura bem-sucedida (false => fail-closed por erro)
 *   flagOpen:      app_settings.subscriptions_open (switch manual)
 *   maxSubscriptions, occupied
 *   capacityFull:  occupied >= maxSubscriptions
 *   open:          gate efetivo = flagOpen && !capacityFull (e sem erro)
 */
export async function readCapacityGate(supabaseAdmin) {
  const closed = {
    ok: false,
    flagOpen: false,
    maxSubscriptions: null,
    occupied: null,
    capacityFull: true,
    open: false,
  };

  const { data: settings, error: settingsErr } = await supabaseAdmin
    .from("app_settings")
    .select("subscriptions_open, max_subscriptions")
    .eq("id", 1)
    .maybeSingle();

  if (settingsErr || !settings) {
    console.error("[capacity] settings read failed, fail-closed", settingsErr);
    return closed;
  }

  // count exato das assinaturas que ocupam vaga (head:true nao traz linhas).
  const { count, error: countErr } = await supabaseAdmin
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .in("status", STATUS_OCUPA_VAGA);

  if (countErr || count == null) {
    console.error("[capacity] occupied count failed, fail-closed", countErr);
    return closed;
  }

  const flagOpen = settings.subscriptions_open !== false;
  const maxSubscriptions = settings.max_subscriptions;
  const occupied = count;
  const capacityFull = occupied >= maxSubscriptions;

  return {
    ok: true,
    flagOpen,
    maxSubscriptions,
    occupied,
    capacityFull,
    open: flagOpen && !capacityFull,
  };
}
