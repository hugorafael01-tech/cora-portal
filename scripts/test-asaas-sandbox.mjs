/**
 * Testa a deteccao de evento de sandbox do Asaas (api/_lib/asaas-sandbox.js),
 * cobrindo os casos do briefing de 24/08/2026.
 *
 * Exercita a funcao PURA — sem banco, sem rede. O comportamento do endpoint
 * (nao persistir e responder 200 com {received:true, ignored:"sandbox"}) e
 * validado no Preview com um POST real, mesmo padrao de test-extras-precos.mjs.
 *
 * O caso 1 usa o payload REAL do evento orfao gravado em 23/08/2026 (copiado de
 * asaas_webhook_events, sem os campos de texto livre). Repare que nele
 * bankSlipUrl e transactionReceiptUrl vem null: o unico sinal e o invoiceUrl.
 *
 * Uso: `node scripts/test-asaas-sandbox.mjs` (ou `npm run test:asaas`).
 * Exit 0 em sucesso, 1 em falha.
 */
import assert from "node:assert/strict";
import { ehEventoSandbox } from "../api/_lib/asaas-sandbox.js";

// Payload real do evento de sandbox que virou linha orfa no Financeiro.
const EVENTO_ORFAO_REAL = {
  id: "evt_05b708f961d739ea7eba7e4db318f621&18324580",
  event: "PAYMENT_CREATED",
  payment: {
    id: "pay_71p3842coljq34g0",
    value: 213,
    status: "PENDING",
    dueDate: "2026-10-01",
    customer: "cus_000008013448",
    netValue: 206.15,
    creditCard: { creditCardBrand: "VISA", creditCardNumber: "4444" },
    invoiceUrl: "https://sandbox.asaas.com/i/71p3842coljq34g0",
    bankSlipUrl: null,
    billingType: "CREDIT_CARD",
    subscription: "sub_rvv4q1vwu9o4ksti",
    externalReference: null,
    transactionReceiptUrl: null,
  },
};

// Evento de producao real (24/08/2026), pra garantir que nada muda pra ele.
const EVENTO_PRODUCAO_REAL = {
  id: "evt_d26e303b238e509335ac9ba210e51b0f&1481087810",
  event: "PAYMENT_RECEIVED",
  payment: {
    id: "pay_ujw4fcg1lv0gf4en",
    customer: "cus_000195788830",
    status: "RECEIVED",
    invoiceUrl: "https://www.asaas.com/i/ujw4fcg1lv0gf4en",
    bankSlipUrl: null,
    transactionReceiptUrl:
      "https://www.asaas.com/comprovantes/h/UEFZTUVOVF9SRUNFSVZFRDpwYXlfdWp3NGZjZzFsdjBnZjRlbg%3D%3D",
  },
};

const CASES = [
  // ─── Descarta (sandbox) ───
  {
    name: "payload real do evento orfao -> sandbox, descarta",
    payload: EVENTO_ORFAO_REAL,
    expected: true,
  },
  {
    name: "invoiceUrl de sandbox -> sandbox",
    payload: { id: "evt_1", event: "PAYMENT_CREATED", payment: { invoiceUrl: "https://sandbox.asaas.com/i/abc" } },
    expected: true,
  },
  {
    name: "sandbox so no bankSlipUrl (invoiceUrl de producao ausente) -> sandbox",
    payload: { id: "evt_2", event: "PAYMENT_CREATED", payment: { bankSlipUrl: "https://sandbox.asaas.com/b/pdf/abc" } },
    expected: true,
  },
  {
    name: "sandbox so no transactionReceiptUrl -> sandbox",
    payload: { id: "evt_3", event: "PAYMENT_RECEIVED", payment: { transactionReceiptUrl: "https://sandbox.asaas.com/comprovantes/123" } },
    expected: true,
  },
  {
    name: "http em vez de https no host de sandbox -> sandbox (casa por hostname)",
    payload: { id: "evt_4", event: "PAYMENT_CREATED", payment: { invoiceUrl: "http://sandbox.asaas.com/i/abc" } },
    expected: true,
  },

  // ─── Grava (producao ou duvida: fail-open) ───
  {
    name: "payload real de producao -> nao e sandbox, persiste",
    payload: EVENTO_PRODUCAO_REAL,
    expected: false,
  },
  {
    name: "invoiceUrl de producao -> persiste",
    payload: { id: "evt_5", event: "PAYMENT_CONFIRMED", payment: { invoiceUrl: "https://www.asaas.com/i/abc" } },
    expected: false,
  },
  {
    name: "payment SEM nenhuma url -> persiste (fail-open)",
    payload: { id: "evt_6", event: "PAYMENT_CREATED", payment: { customer: "cus_1", value: 213 } },
    expected: false,
  },
  {
    name: "payload SEM payment -> persiste (comportamento atual inalterado)",
    payload: { id: "evt_7", event: "PAYMENT_CREATED" },
    expected: false,
  },
  {
    name: "payment null -> persiste",
    payload: { id: "evt_8", event: "PAYMENT_CREATED", payment: null },
    expected: false,
  },
  {
    // A razao de casar por hostname exato em vez de startsWith do prefixo:
    // este host NAO e sandbox.asaas.com, e descartar aqui perderia evento.
    name: "host sosia (sandbox.asaas.com.outrodominio.com) -> persiste",
    payload: { id: "evt_9", event: "PAYMENT_CREATED", payment: { invoiceUrl: "https://sandbox.asaas.com.outrodominio.com/i/abc" } },
    expected: false,
  },
  {
    name: "subdominio diferente (api-sandbox.asaas.com) -> persiste (fail-open)",
    payload: { id: "evt_10", event: "PAYMENT_CREATED", payment: { invoiceUrl: "https://api-sandbox.asaas.com/i/abc" } },
    expected: false,
  },
  {
    name: "invoiceUrl nao-string (numero) -> persiste",
    payload: { id: "evt_11", event: "PAYMENT_CREATED", payment: { invoiceUrl: 12345 } },
    expected: false,
  },
  {
    name: "invoiceUrl nao-string (objeto) -> persiste",
    payload: { id: "evt_12", event: "PAYMENT_CREATED", payment: { invoiceUrl: { href: "https://sandbox.asaas.com/i/abc" } } },
    expected: false,
  },
  {
    name: "url malformada -> persiste (fail-open, nao lanca)",
    payload: { id: "evt_13", event: "PAYMENT_CREATED", payment: { invoiceUrl: "nao-e-uma-url" } },
    expected: false,
  },
  {
    name: "string vazia no invoiceUrl -> persiste",
    payload: { id: "evt_14", event: "PAYMENT_CREATED", payment: { invoiceUrl: "" } },
    expected: false,
  },
  {
    name: "payload vazio -> persiste (nao lanca)",
    payload: {},
    expected: false,
  },
  {
    name: "payload null -> nao lanca",
    payload: null,
    expected: false,
  },
  {
    name: "payload undefined -> nao lanca",
    payload: undefined,
    expected: false,
  },
];

let failures = 0;
for (const c of CASES) {
  try {
    assert.equal(ehEventoSandbox(c.payload), c.expected);
    console.log(`  ok   ${c.name}`);
  } catch (err) {
    failures++;
    console.error(`  FALHOU  ${c.name}\n    ${err.message}`);
  }
}

// A armadilha registrada em asaas-sandbox.js: o prefixo do asaas_event_id e
// derivado do TIPO do evento, nao do ambiente. Os dois ids abaixo sao reais e
// compartilham o mesmo hash — um e sandbox, o outro producao. Se um dia alguem
// trocar a deteccao pra olhar o id, este caso quebra.
try {
  const mesmoHash = "evt_05b708f961d739ea7eba7e4db318f621";
  assert.ok(EVENTO_ORFAO_REAL.id.startsWith(mesmoHash));
  const producaoComMesmoHash = {
    id: `${mesmoHash}&1481064243`,
    event: "PAYMENT_CREATED",
    payment: { invoiceUrl: "https://www.asaas.com/i/7l2sgg8zcu1gqbzp" },
  };
  assert.equal(ehEventoSandbox(EVENTO_ORFAO_REAL), true);
  assert.equal(ehEventoSandbox(producaoComMesmoHash), false);
  console.log("  ok   mesmo prefixo de event id em sandbox e producao -> so a url decide");
} catch (err) {
  failures++;
  console.error(`  FALHOU  prefixo de event id nao decide ambiente\n    ${err.message}`);
}

console.log(failures === 0 ? "\nTodos os casos passaram." : `\n${failures} caso(s) falharam.`);
process.exit(failures === 0 ? 0 : 1);
