/**
 * Helper de CORS reutilizavel pra Vercel Functions (api/).
 *
 * Por que existe: o backoffice (admin.acora.com.br) chama endpoints do portal
 * (app.acora.com.br) do navegador -> cross-origin. Sem CORS o browser bloqueia a
 * chamada (preflight OPTIONS sem resposta + POST sem Access-Control-Allow-Origin).
 *
 * SEGURANCA:
 * - ALLOWLIST fixa de origens. NUNCA "*" (o endpoint e autenticado por Bearer; e
 *   wildcard deixaria qualquer site chamar).
 * - Eco SEGURO: so reflete no Access-Control-Allow-Origin a origem do request SE
 *   ela estiver na allowlist. Origem fora da lista -> nenhum header CORS -> o
 *   browser bloqueia (comportamento correto). Nunca refletir origem arbitraria.
 * - So libera o que o backoffice usa: POST/OPTIONS + Authorization/Content-Type.
 *   NAO seta Access-Control-Allow-Credentials: a auth e por header Authorization
 *   (Bearer), nao cookies, entao credentials mode nao se aplica.
 *
 * Uso: export default withCors(handler). O wrapper seta os headers CEDO (antes do
 * dispatch), entao TODAS as respostas do handler (200/4xx/5xx) herdam o header de
 * origem, e o preflight OPTIONS e respondido com 204 sem cair na logica do POST.
 */

// Allowlist de origens. Hoje so o backoffice; adicionar novas aqui (ex: URL de
// preview) sem reescrever o helper.
const ALLOWED_ORIGINS = ["https://admin.acora.com.br"];

export function withCors(handler) {
  return async function corsWrappedHandler(req, res) {
    const origin = req.headers.origin;

    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin"); // cache correto ao ecoar a origem
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.setHeader("Access-Control-Max-Age", "86400"); // cacheia o preflight 24h
    }

    // Preflight: responde e encerra, sem cair na logica do handler.
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    return handler(req, res);
  };
}
