/**
 * POST /api/asaas/vincular  (Asaas Perna 3 / Peca A — vinculo asaas_customer_id)
 *
 * O backoffice (SPA pura, so anon key) NAO escreve em subscriptions (migration
 * 0019 revogou escrita de authenticated). Caminho 1: so o cora-portal tem
 * service_role; o painel chama ESTE endpoint pra gravar o asaas_customer_id numa
 * subscription. Dali pra frente os pagamentos daquele cliente casam sozinhos pelo
 * fallback por asaas_customer_id do webhook (perna 2).
 *
 * Autorizacao: service_role BYPASSA RLS, entao o is_admin() das policies NAO se
 * aplica. A checagem de admin e feita por QUERY EXPLICITA contra admin_users.
 * ATENCAO: o backoffice identifica admin por EMAIL (admin_users.email e a PK; nao
 * ha coluna user_id), tanto no is_admin() SQL (auth.jwt()->>'email') quanto no
 * RequireAuth do frontend. Espelhamos esse criterio aqui: eq exato pelo email do
 * JWT, presenca de linha = admin. (Mesma project Supabase pro portal e backoffice,
 * por isso supabaseAdmin enxerga admin_users.)
 *
 * Escopo: SO o vinculo. NAO reprocessa eventos passados nem varre
 * asaas_webhook_events (decisao Hugo: so casar futuros; nao ha orfao). NAO toca
 * schema (asaas_customer_id existe em subscriptions desde a D.1).
 *
 * service_role bypassa RLS; este handler so roda node-side (api/).
 */
import { supabaseAdmin } from "../../../src/lib/supabase-admin.js";
import { withCors } from "../../_lib/cors.js";

// Guarda de UUID antes de bater na coluna uuid (licao do fix do webhook: valor
// nao-uuid no .eq faz o PostgREST devolver 400 cru). Mesma regex do webhook.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function handler(req, res) {
  // ─── 0. Metodo ───
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  // ─── 1. Autenticacao: deriva identidade do JWT (molde handlePatchMine) ───
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ error: "missing_token" });
  }
  const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !authData?.user) {
    return res.status(401).json({ error: "invalid_token" });
  }
  const email = authData.user.email;

  // ─── 2. Autorizacao: admin via query explicita (service_role bypassa RLS) ───
  // Criterio do backoffice: existe linha em admin_users com este email.
  if (!email) {
    // Usuario autenticado sem email no JWT nao tem como ser admin (PK e email).
    return res.status(403).json({ error: "forbidden" });
  }
  const { data: adminRow, error: adminErr } = await supabaseAdmin
    .from("admin_users")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (adminErr) {
    console.error("[asaas/vincular] admin check error", adminErr);
    return res.status(500).json({ error: "internal_error" });
  }
  if (!adminRow) {
    return res.status(403).json({ error: "forbidden" });
  }

  // ─── 3. Parse + validacao do body ───
  const { subscription_id, asaas_customer_id } = req.body || {};
  if (!subscription_id || !asaas_customer_id) {
    return res.status(400).json({ error: "missing_fields" });
  }
  if (typeof subscription_id !== "string" || !UUID_RE.test(subscription_id)) {
    return res.status(400).json({ error: "invalid_subscription_id" });
  }
  const customerId =
    typeof asaas_customer_id === "string" ? asaas_customer_id.trim() : "";
  if (!customerId) {
    return res.status(400).json({ error: "invalid_customer_id" });
  }

  // ─── 4. Subscription alvo existe? ───
  const { data: target, error: targetErr } = await supabaseAdmin
    .from("subscriptions")
    .select("id, asaas_customer_id")
    .eq("id", subscription_id)
    .maybeSingle();
  if (targetErr) {
    console.error("[asaas/vincular] target read error", targetErr);
    return res.status(500).json({ error: "internal_error" });
  }
  if (!target) {
    return res.status(404).json({ error: "subscription_not_found" });
  }

  // ─── 5. Idempotencia: mesmo customer ja na MESMA subscription -> no-op ───
  if (target.asaas_customer_id === customerId) {
    return res.status(200).json({
      subscription_id: target.id,
      asaas_customer_id: target.asaas_customer_id,
    });
  }

  // ─── 6. Conflito: customer ja vinculado a OUTRA subscription -> 409 ───
  // Protege contra desviar pagamento pro assinante errado (decisao Hugo: nao
  // sobrescreve).
  const { data: conflict, error: conflictErr } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("asaas_customer_id", customerId)
    .neq("id", subscription_id)
    .limit(1)
    .maybeSingle();
  if (conflictErr) {
    console.error("[asaas/vincular] conflict check error", conflictErr);
    return res.status(500).json({ error: "internal_error" });
  }
  if (conflict) {
    return res.status(409).json({ error: "customer_already_linked" });
  }

  // ─── 7. Grava o vinculo ───
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("subscriptions")
    .update({ asaas_customer_id: customerId })
    .eq("id", subscription_id)
    .select("id, asaas_customer_id")
    .single();
  if (updateErr) {
    console.error("[asaas/vincular] update error", updateErr);
    return res.status(500).json({ error: "internal_error" });
  }

  return res.status(200).json({
    subscription_id: updated.id,
    asaas_customer_id: updated.asaas_customer_id,
  });
}

// CORS por cima da logica ja validada (Peca A): preflight OPTIONS -> 204 e header
// de origem em todas as respostas. A logica do handler fica intocada.
export default withCors(handler);
