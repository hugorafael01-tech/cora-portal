/**
 * Camada thin sobre fetch para os endpoints serverless.
 *
 * - postSubscription(payload):     POST /api/subscriptions
 * - getSubscription(id):           GET /api/subscriptions/{id}  (null se 404)
 * - postWaitlist(payload):         POST /api/coverage-waitlist
 * - getSettings():                 GET /api/settings
 * - postCapacityWaitlist(payload): POST /api/capacity-waitlist
 *
 * Erros que nao sejam 404 (no GET) viram throw com mensagem descritiva.
 * O Error tem `.status` (HTTP) e `.code` (campo `error` do body) anexados
 * pra callers detectarem casos especificos (ex: 409 subscriptions_closed).
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
