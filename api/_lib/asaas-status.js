/**
 * Mapeamento event_type (Asaas) -> patch de payment_status na subscription.
 *
 * Fonte de verdade UNICA, usada por dois lugares:
 *   - api/webhooks/asaas: reflete o status quando um evento chega (passa now()).
 *   - api/asaas/vincular: reconcilia eventos passados ao vincular (passa o
 *     received_at do evento mais recente — a data real do pagamento, nao a do clique).
 *
 * Regra (decisao Hugo): cartao tem RECEIVED so ~32 dias apos o CONFIRMED; Pix vai
 * direto a RECEIVED. Demais tipos sao registrados sem mexer no status ('pendente'
 * fica pra fase 2).
 */

// Eventos que "pagam" do lado da Cora.
export const EVENTS_EM_DIA = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
export const EVENTS_VENCIDO = new Set(["PAYMENT_OVERDUE"]);

// Monta o patch de status pra subscription a partir do tipo do evento.
// Retorna null pros tipos nao-tratados (nao mexe no payment_status).
// paymentAtIso: data a carimbar em last_payment_at. Webhook passa now (evento
// acabou de chegar); reconciliacao passa o received_at do evento.
export function statusPatchForEvent(eventType, paymentAtIso) {
  if (EVENTS_EM_DIA.has(eventType)) {
    return { payment_status: "em_dia", last_payment_at: paymentAtIso, last_payment_event: eventType };
  }
  if (EVENTS_VENCIDO.has(eventType)) {
    return { payment_status: "vencido", last_payment_event: eventType };
  }
  return null;
}
