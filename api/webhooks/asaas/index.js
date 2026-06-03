/**
 * POST /api/webhooks/asaas  (Asaas webhooks — Perna 2: endpoint que RECEBE)
 *
 * Recebe UM evento de pagamento por requisicao do Asaas, persiste o evento cru
 * em asaas_webhook_events (idempotente por asaas_event_id) e, best-effort,
 * reflete o status de pagamento na subscription casada.
 *
 * Invariantes (ver briefing CORA_Briefing_Asaas_Perna2_Endpoint):
 *   - Auth por header `asaas-access-token` === process.env.ASAAS_WEBHOOK_TOKEN
 *     (server-side, NUNCA VITE_). Sem match -> 401, sem processar nada.
 *   - Responde 200 SO depois de persistir o evento. A doc do Asaas e explicita:
 *     nao ha garantia de reenvio, entao gravar e a fonte da verdade.
 *   - Endpoint robusto a campos inesperados: nunca lanca excecao por atributo
 *     novo/faltante do payload. So `id` e `event` sao obrigatorios. (Se o
 *     endpoint falhar 15x consecutivas, o Asaas PAUSA a fila inteira.)
 *   - Idempotencia: mesmo evt id pode chegar 2x (retry). INSERT com unique em
 *     asaas_event_id; 23505 -> 200 e para.
 *   - Falha de reflexo de status NAO derruba o 200 (o evento ja esta salvo;
 *     reflexo pode ser reprocessado depois a partir do evento cru).
 *
 * Auth e por token estatico no header (NAO assinatura HMAC sobre o corpo), entao
 * o body parseado padrao da Vercel Function serve — nao precisa de raw body nem
 * de config de bodyParser. Reusa supabaseAdmin (service_role, bypassa RLS,
 * so node-side). Cliente nunca escreve em asaas_webhook_events.
 */
import { supabaseAdmin } from "../../../src/lib/supabase-admin.js";
import { statusPatchForEvent } from "../../_lib/asaas-status.js";

// subscriptions.id e uuid. external_reference vem digitado a mao no painel Asaas
// (fase 1), entao pode nao ser um uuid valido. Sem essa guarda, o PostgREST rejeita
// a busca por id com 400 ("invalid input syntax for type uuid"), o que cairia como
// FALHA de reflexo (processed_at null) em vez de "nao casou". Regex generica basta
// pra evitar o 400 antes do .eq por id.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  // ─── 1. Metodo ───
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  // ─── 1b. Auth por token estatico ───
  // Env var ausente -> 401 (config faltando; nunca inventar valor). Loga claro
  // pro Hugo. 401 (e nao 500) por decisao: trata como "nao autorizado" sem
  // sinalizar detalhe de config pra fora.
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expected) {
    console.error(
      "[asaas webhook] ASAAS_WEBHOOK_TOKEN ausente no ambiente — configurar na Vercel (Production + Preview) antes de criar o webhook no painel Asaas"
    );
    return res.status(401).json({ error: "unauthorized" });
  }
  // Comparacao string direta (===) aprovada no Alpha. Hardening futuro
  // (follow-up registrado): trocar por crypto.timingSafeEqual pra nao vazar
  // timing na comparacao do token.
  const provided = req.headers["asaas-access-token"];
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: "unauthorized" });
  }

  // ─── 2. Parse defensivo (so id e event sao obrigatorios) ───
  const body = req.body || {};
  const asaasEventId = body.id;
  const eventType = body.event;
  if (!asaasEventId || !eventType) {
    // Payload malformado: nao e um retry valido. 400 sem persistir.
    console.error("[asaas webhook] payload sem id/event", {
      hasId: !!asaasEventId,
      hasEvent: !!eventType,
    });
    return res.status(400).json({ error: "malformed_payload" });
  }

  // Tudo do payment e opcional — campo novo/faltante do Asaas nunca pode quebrar.
  const payment = body.payment || {};
  const asaasPaymentId = payment.id ?? null;
  const asaasCustomerId = payment.customer ?? null;
  const externalReference = payment.externalReference ?? null;
  const paymentStatus = payment.status ?? null;

  // ─── 3. Persiste PRIMEIRO (idempotencia por 23505) ───
  // Grava o body cru em jsonb: resolve campos novos/desconhecidos sem quebrar.
  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from("asaas_webhook_events")
    .insert({
      asaas_event_id: asaasEventId,
      event_type: eventType,
      asaas_payment_id: asaasPaymentId,
      asaas_customer_id: asaasCustomerId,
      external_reference: externalReference,
      payment_status: paymentStatus,
      payload: body,
      subscription_id: null, // resolvido no passo 4, se casar
    })
    .select("id")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      // Evento ja recebido (retry). Idempotente: 200 e para, sem reprocessar.
      return res.status(200).json({ received: true });
    }
    // Nao conseguiu persistir: responde NAO-2xx pro Asaas reenviar (preferimos a
    // fila insistir a perder o evento). Atencao: erro persistente derruba a fila
    // em 15 tentativas — por isso loga bem.
    console.error("[asaas webhook] insert do evento falhou", asaasEventId, eventType, insertErr);
    return res.status(500).json({ error: "persist_failed" });
  }

  const eventId = inserted.id;

  // ═══════════════════════════════════════════════════════════════════════
  // Daqui pra baixo NADA pode derrubar o 200 — o evento ja esta persistido.
  // ═══════════════════════════════════════════════════════════════════════

  const nowIso = new Date().toISOString();
  let subscriptionId = null;
  // reflectionFailed = falha REAL ao resolver/refletir (erro de query/update).
  // So nesse caso processed_at fica null (pra reprocessar). Nao-casar NAO conta.
  let reflectionFailed = false;

  try {
    // ─── 4a. Resolve a subscription ───
    // Caminho principal: external_reference = id (uuid) da subscription da Cora.
    // So busca por id se for um uuid valido — um valor nao-uuid nao casa por id e
    // so daria 400 no PostgREST; pula direto pro fallback (vira "nao casou", nao
    // "falha"). Com isso o throw abaixo so dispara por erro REAL de query.
    if (externalReference && UUID_RE.test(externalReference)) {
      const { data: sub, error: subErr } = await supabaseAdmin
        .from("subscriptions")
        .select("id")
        .eq("id", externalReference)
        .maybeSingle();
      if (subErr) throw subErr;
      if (sub) subscriptionId = sub.id;
    }

    // Fallback: por asaas_customer_id (pode nao estar preenchido no Alpha).
    if (!subscriptionId && asaasCustomerId) {
      const { data: sub, error: subErr } = await supabaseAdmin
        .from("subscriptions")
        .select("id")
        .eq("asaas_customer_id", asaasCustomerId)
        .maybeSingle();
      if (subErr) throw subErr;
      if (sub) subscriptionId = sub.id;
    }

    if (!subscriptionId) {
      // Nao casou: NAO e erro. O evento fica salvo com subscription_id null e
      // aparece no painel (perna 3) pra resolucao manual.
      console.log("[asaas webhook] evento sem subscription casada", asaasEventId, {
        externalReference,
        asaasCustomerId,
      });
    } else {
      // ─── 4b. Reflexo de status (so se casou E o tipo e tratado) ───
      const patch = statusPatchForEvent(eventType, nowIso);
      if (patch) {
        const { error: updErr } = await supabaseAdmin
          .from("subscriptions")
          .update(patch)
          .eq("id", subscriptionId);
        if (updErr) throw updErr;
      }
      // Tipo nao-tratado (PAYMENT_CREATED, etc.): casou mas nao mexe no status.
    }
  } catch (err) {
    // Falha de resolucao/reflexo: loga e segue. processed_at fica null.
    reflectionFailed = true;
    console.error("[asaas webhook] reflexo de status falhou", asaasEventId, eventType, err);
  }

  // ─── 4c. Carimba o evento: subscription_id sempre que casou; processed_at ───
  // se o reflexo nao falhou (inclui o caso de nao-casar e o de tipo nao-tratado).
  try {
    const stamp = { subscription_id: subscriptionId };
    if (!reflectionFailed) stamp.processed_at = nowIso;
    const { error: stampErr } = await supabaseAdmin
      .from("asaas_webhook_events")
      .update(stamp)
      .eq("id", eventId);
    if (stampErr) {
      // Carimbo e best-effort: nao derruba o 200 (o evento cru ja esta salvo).
      console.error("[asaas webhook] carimbo do evento falhou", asaasEventId, stampErr);
    }
  } catch (err) {
    console.error("[asaas webhook] carimbo do evento lancou", asaasEventId, err);
  }

  // ─── 5. Resposta ───
  return res.status(200).json({ received: true });
}
