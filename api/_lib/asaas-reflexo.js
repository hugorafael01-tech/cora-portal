/**
 * Resolucao da assinatura e reflexo de status de um evento do Asaas.
 *
 * Saiu de dentro do handler do webhook (api/webhooks/asaas/index.js) pra ca por
 * um motivo: com a cobranca unica por pagador (Fase 3), o reflexo passa a
 * alcancar mais de uma linha, e isso e logica que precisa de teste. Dentro do
 * handler nao tinha como testar sem banco nem sem rede.
 *
 * As duas funcoes recebem o client (`db`) como argumento em vez de importar o
 * supabaseAdmin: e o que permite passar um mock em scripts/test-reflexo.mjs.
 *
 * ============================================================================
 * O ALARGAMENTO, E POR QUE ELE E SEGURO
 * ============================================================================
 * Ate 05/09 o reflexo era `.eq("id", subscriptionId)`: uma linha, a que casou.
 * Com uma cobranca cobrindo duas assinaturas, quando a Aldina pagasse, a
 * Fernanda continuaria marcada como nao paga — apareceria como "paguei e o
 * sistema nao viu" no primeiro ciclo.
 *
 * Agora alcanca tambem quem aponta pra ela como pagadora. Duas propriedades
 * que sao a razao de isto poder entrar sem medo:
 *
 *   ESTRITAMENTE ADITIVO. O conjunto de linhas tocadas so cresce; nunca
 *   encolhe. Quem nao tem `pagador_subscription_id` apontando pra assinatura
 *   que casou continua vendo exatamente o comportamento de antes. Hoje sao 2
 *   linhas em todo o banco com essa coluna preenchida, entao pras outras 38 o
 *   filtro casa exatamente o que casava.
 *
 *   UMA DIRECAO SO. Pagamento que resolve pra X atualiza X e quem aponta pra X
 *   como pagadora. NUNCA o contrario: se X for dependente, o pagador dela NAO
 *   e tocado. Um pagamento avulso na linha de um dependente nao pode marcar o
 *   pagador como em dia — ele nao pagou nada.
 *
 * Consequencia que NAO e coberta por isto, e e proposital: no par
 * Sabina/Maria Helena o cliente do Asaas esta na linha da Maria Helena, que e
 * a DEPENDENTE. Um pagamento resolve pra ela e nao sobe pra Sabina, porque
 * subir seria a direcao proibida. Isso se resolve na migracao do cartao,
 * movendo o `asaas_customer_id` pra linha da Sabina (ver BACKOFFICE_STATUS).
 */
import { statusPatchForEvent } from "./asaas-status.js";

// Mesma regex do handler e do vincular. Guarda o `.eq` por id (valor nao-uuid
// faz o PostgREST devolver 400 cru) e, aqui, tambem o filtro `.or` montado por
// string abaixo.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Qual assinatura este evento toca.
 *
 * Caminho principal: `externalReference` = uuid da subscription. Fallback:
 * `asaas_customer_id` do pagador. Devolve null quando nao casa — o que NAO e
 * erro: o evento fica salvo sem subscription e aparece no painel pra resolucao
 * manual. Erro de query, esse sim, e lancado.
 *
 * @returns {Promise<string|null>} id da subscription, ou null
 */
export async function resolveSubscription(db, { externalReference, asaasCustomerId }) {
  if (externalReference && UUID_RE.test(externalReference)) {
    const { data, error } = await db
      .from("subscriptions")
      .select("id")
      .eq("id", externalReference)
      .maybeSingle();
    if (error) throw error;
    if (data) return data.id;
  }

  // O fallback usa `.maybeSingle()`, que DA ERRO com mais de uma linha. E de
  // proposito: dois assinantes com o mesmo asaas_customer_id e ambiguidade, e
  // adivinhar seria pior que falhar. Ver a nota do par Sabina/Maria Helena no
  // BACKOFFICE_STATUS — nunca preencher a mesma coluna nas duas linhas.
  if (asaasCustomerId) {
    const { data, error } = await db
      .from("subscriptions")
      .select("id")
      .eq("asaas_customer_id", asaasCustomerId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data.id;
  }

  return null;
}

/**
 * Aplica o status do evento na assinatura que casou E em quem e paga por ela.
 *
 * Tipo nao-tratado (PAYMENT_CREATED e afins) devolve patch null e nao toca em
 * nada — casou, mas nao mexe no status.
 *
 * @returns {Promise<{patch: object|null, atualizadas: string[]}>}
 */
export async function refleteStatus(db, { subscriptionId, eventType, paymentAtIso }) {
  const patch = statusPatchForEvent(eventType, paymentAtIso);
  if (!patch) return { patch: null, atualizadas: [] };

  // O filtro `.or` e montado por string, entao o valor tem que ser uuid antes
  // de entrar nela. Ele vem de uma linha do proprio banco e sempre sera — mas
  // "sempre sera" nao e guarda, e a diferenca aqui e entre um 400 e um filtro
  // que casa o que nao devia.
  if (!UUID_RE.test(subscriptionId)) {
    throw new Error(`subscriptionId nao e uuid: ${subscriptionId}`);
  }

  const { data, error } = await db
    .from("subscriptions")
    .update(patch)
    .or(`id.eq.${subscriptionId},pagador_subscription_id.eq.${subscriptionId}`)
    .select("id");
  if (error) throw error;

  return { patch, atualizadas: (data ?? []).map((r) => r.id) };
}
