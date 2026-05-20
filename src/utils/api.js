/**
 * Camada thin sobre fetch para os endpoints serverless.
 *
 * - postSubscription(payload):     POST /api/subscriptions
 * - getSubscription(id):           GET /api/subscriptions/{id}  (null se 404)
 * - patchSubscription(id,payload): PATCH /api/subscriptions/{id} (altera composicao)
 * - postWaitlist(payload):         POST /api/coverage-waitlist
 * - getSettings():                 GET /api/settings
 * - postCapacityWaitlist(payload): POST /api/capacity-waitlist
 * - postWeeklyOrder(payload):      POST /api/weekly-orders        (upsert do rascunho)
 * - confirmWeeklyOrder(id):        POST /api/weekly-orders/:id/confirmar
 * - getWeeklyOrders(subId):        GET  /api/weekly-orders?subscription_id=…
 *
 * Erros que nao sejam 404 (no GET) viram throw com mensagem descritiva.
 * O Error tem `.status` (HTTP) e `.code` (campo `error` do body) anexados
 * pra callers detectarem casos especificos (ex: 409 subscriptions_closed,
 * 409 cutoff_passed).
 */

const throwApiError = async (res, fallback) => {
  let body = null;
  try { body = await res.json(); } catch { /* noop */ }
  const code = body?.error || null;
  const detail = code || `${res.status} ${res.statusText}`;
  const err = new Error(`${fallback}: ${detail}`);
  err.status = res.status;
  err.code = code;
  err.body = body;
  throw err;
};

export async function postSubscription(payload) {
  const res = await fetch("/api/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok && res.status !== 200 && res.status !== 201) {
    return throwApiError(res, "Falha ao criar Assinatura");
  }
  const data = await res.json();
  return { subscription_id: data.subscription_id, status: data.status };
}

export async function getSubscription(id) {
  const res = await fetch(`/api/subscriptions/${encodeURIComponent(id)}`, {
    method: "GET",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    return throwApiError(res, "Falha ao consultar Assinatura");
  }
  return res.json();
}

export async function patchSubscription(id, payload, signal) {
  const res = await fetch(`/api/subscriptions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) {
    return throwApiError(res, "Falha ao alterar Assinatura");
  }
  return res.json();
}

export async function postWaitlist(payload) {
  const res = await fetch("/api/coverage-waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    return throwApiError(res, "Falha ao registrar interesse");
  }
  return res.json();
}

export async function getSettings() {
  const res = await fetch("/api/settings", { method: "GET" });
  if (!res.ok) {
    return throwApiError(res, "Falha ao ler configurações");
  }
  return res.json();
}

export async function postCapacityWaitlist(payload) {
  const res = await fetch("/api/capacity-waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok && res.status !== 200 && res.status !== 201) {
    return throwApiError(res, "Falha ao entrar na lista de espera");
  }
  return res.json();
}

export async function postWeeklyOrder(payload) {
  const res = await fetch("/api/weekly-orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    return throwApiError(res, "Falha ao salvar cesta");
  }
  return res.json();
}

export async function confirmWeeklyOrder(id) {
  const res = await fetch(`/api/weekly-orders/${encodeURIComponent(id)}/confirmar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) {
    return throwApiError(res, "Falha ao confirmar pedido");
  }
  return res.json();
}

export async function getWeeklyOrders(subscriptionId) {
  const res = await fetch(
    `/api/weekly-orders?subscription_id=${encodeURIComponent(subscriptionId)}`,
    { method: "GET" }
  );
  if (!res.ok) {
    return throwApiError(res, "Falha ao consultar cestas");
  }
  return res.json();
}
