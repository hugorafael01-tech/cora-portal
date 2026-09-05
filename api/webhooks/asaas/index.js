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
 *   - Evento de SANDBOX nao e persistido: descartado antes do insert, com
 *     200 (ver _lib/asaas-sandbox.js). Producao segue inalterada.
 *
 * Auth e por token estatico no header (NAO assinatura HMAC sobre o corpo), entao
 * o body parseado padrao da Vercel Function serve — nao precisa de raw body nem
 * de config de bodyParser. Reusa supabaseAdmin (service_role, bypassa RLS,
 * so node-side). Cliente nunca escreve em asaas_webhook_events.
 */
import { supabaseAdmin } from "../../../src/lib/supabase-admin.js";
import { refleteStatus, resolveSubscription } from "../../_lib/asaas-reflexo.js";
import { ehEventoSandbox } from "../../_lib/asaas-sandbox.js";

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

  // ─── 2b. Evento de sandbox: descarta ANTES de persistir ───
  // O webhook de sandbox aponta pro mesmo endpoint. Sem isso, cada cobranca da
  // assinatura de teste (mensal) vira uma linha orfa no Financeiro. Ver a
  // deteccao — e a armadilha do `id` do evento — em _lib/asaas-sandbox.js.
  //
  // Responde 200 de proposito: um nao-2xx faria o Asaas reenviar e, em 15
  // tentativas consecutivas, PAUSAR a fila inteira. Descartar nao e falha,
  // entao console.info e nao console.error.
  if (ehEventoSandbox(body)) {
    console.info("[asaas webhook] evento de sandbox descartado", asaasEventId, eventType, {
      invoiceUrl: payment.invoiceUrl ?? null,
    });
    return res.status(200).json({ received: true, ignored: "sandbox" });
  }

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
    // A resolucao e o reflexo moram em _lib/asaas-reflexo.js desde 05/09: com a
    // cobranca unica por pagador o reflexo passou a alcancar mais de uma linha,
    // e isso precisa de teste (scripts/test-reflexo.mjs, com client mockado).
    subscriptionId = await resolveSubscription(supabaseAdmin, {
      externalReference,
      asaasCustomerId,
    });

    if (!subscriptionId) {
      // Nao casou: NAO e erro. O evento fica salvo com subscription_id null e
      // aparece no painel (perna 3) pra resolucao manual.
      console.log("[asaas webhook] evento sem subscription casada", asaasEventId, {
        externalReference,
        asaasCustomerId,
      });
    } else {
      // ─── 4b. Reflexo de status (so se casou E o tipo e tratado) ───
      // Alcanca a assinatura que casou E quem aponta pra ela como pagadora:
      // uma cobranca cobre o grupo inteiro, entao o pagamento vale por todas.
      // Estritamente aditivo e numa direcao so — o racional completo esta no
      // cabecalho do _lib/asaas-reflexo.js.
      const { patch, atualizadas } = await refleteStatus(supabaseAdmin, {
        subscriptionId,
        eventType,
        paymentAtIso: nowIso,
      });
      // Loga quando o reflexo passou de uma linha: e o sinal de que o
      // agrupamento por pagador funcionou, e o primeiro lugar onde olhar se
      // alguem reclamar de "paguei e o sistema nao viu".
      if (patch && atualizadas.length > 1) {
        console.log("[asaas webhook] reflexo alcancou o grupo", asaasEventId, {
          pagador: subscriptionId,
          atualizadas,
        });
      }
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
