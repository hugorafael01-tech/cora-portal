/**
 * Camada thin sobre fetch para os endpoints serverless.
 *
 * - postSubscription(payload): POST /api/subscriptions
 * - getSubscription(id):       GET /api/subscriptions/{id}  (null se 404)
 * - postWaitlist(payload):     POST /api/coverage-waitlist
 *
 * Erros que nao sejam 404 (no GET) viram throw com mensagem descritiva.
 * Sem deps adicionais, usa fetch nativo.
 */

const handleError = async (res, fallback) => {
  let body = null;
  try { body = await res.json(); } catch { /* noop */ }
  const detail = body?.error || `${res.status} ${res.statusText}`;
  throw new Error(`${fallback}: ${detail}`);
};

export async function postSubscription(payload) {
  const res = await fetch("/api/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok && res.status !== 200 && res.status !== 201) {
    return handleError(res, "Falha ao criar Assinatura");
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
    return handleError(res, "Falha ao consultar Assinatura");
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
    return handleError(res, "Falha ao registrar interesse");
  }
  return res.json();
}
