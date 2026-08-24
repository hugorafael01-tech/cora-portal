/**
 * Deteccao de evento vindo do ambiente SANDBOX do Asaas.
 *
 * O webhook de producao aponta pro mesmo endpoint que o de sandbox, entao um
 * pagamento de teste passava na validacao de token e virava linha em
 * asaas_webhook_events — no Financeiro do backoffice aparecia como "Pagamento
 * pra identificar", sem assinante, e sem contraparte no painel de producao pro
 * Hugo conferir. Caso real (23/08/2026): R$ 213,00, cus_000008013448,
 * assinatura de teste "Hugo Dev", que gera cobranca recorrente TODO MES.
 *
 * ARMADILHA — nao tente detectar sandbox pelo `id` do evento. Levantamento dos
 * 115 eventos ja gravados (24/08/2026): o evento de sandbox tinha o id
 * `evt_05b708f961d739ea7eba7e4db318f621&18324580` e havia eventos de PRODUCAO
 * com o MESMO prefixo `evt_05b708f961d739ea7eba7e4db318f621`, variando so no
 * sufixo `&<n>`. O hash e derivado do TIPO do evento (todos ali eram
 * PAYMENT_CREATED), nao do ambiente. Casar por esse prefixo descartaria
 * pagamento real.
 *
 * O sinal confiavel esta nas URLs do `payment`: no mesmo levantamento, os unicos
 * dois hosts que apareceram foram `www.asaas.com` (114 eventos) e
 * `sandbox.asaas.com` (1). Olhamos os tres campos de URL e nao so o
 * `invoiceUrl` — hoje ele nunca faltou, mas os outros dois saem de graca se um
 * payload futuro vier sem ele.
 *
 * FAIL-OPEN de proposito: na duvida, GRAVA. Perder um evento de producao e
 * muito pior que guardar um de teste — o evento cru e a fonte da verdade e o
 * Asaas nao garante reenvio. Por isso campo ausente, valor nao-string, URL
 * impossivel de parsear ou `payment` ausente devolvem false.
 */

// Comparacao por hostname exato, nao por prefixo da string. `startsWith(
// "https://sandbox.asaas.com")` tambem casaria `https://sandbox.asaas.com.
// outrodominio.com/...`, que faria descartar um evento NAO-sandbox — justo o
// lado errado do trade-off acima.
const HOST_SANDBOX = "sandbox.asaas.com";

const CAMPOS_URL = ["invoiceUrl", "bankSlipUrl", "transactionReceiptUrl"];

function ehUrlSandbox(valor) {
  if (typeof valor !== "string") return false;
  try {
    return new URL(valor).hostname === HOST_SANDBOX;
  } catch {
    // URL malformada nao e sinal de sandbox. Fail-open.
    return false;
  }
}

/**
 * @param {object} payload corpo cru do webhook (o `body` inteiro, nao o `payment`)
 * @returns {boolean} true so quando alguma URL do payment aponta pro sandbox
 */
export function ehEventoSandbox(payload) {
  const payment = payload?.payment;
  if (!payment || typeof payment !== "object") return false;
  return CAMPOS_URL.some((campo) => ehUrlSandbox(payment[campo]));
}
