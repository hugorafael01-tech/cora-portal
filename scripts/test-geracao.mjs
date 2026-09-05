/**
 * Testa a logica pura da geracao (api/_lib/geracao.js). Sem banco e sem rede.
 *
 * O que importa aqui nao e o caminho feliz: e a condicao que o Hugo fixou por
 * escrito antes de autorizar o bloco — **a chamada a API usa sempre o valor
 * recem-recalculado, nunca o gravado numa fatura pendente**, e divergencia
 * entre os dois BLOQUEIA em vez de passar.
 *
 * O caso que isso previne: um retry acha uma fatura pendente de uma tentativa
 * anterior, gravada com um valor que desde entao mudou. Se a chamada usasse o
 * gravado, a cobranca sairia CERTA NA TELA e ERRADA NO BOLETO — e ninguem olha
 * o boleto de novo depois de conferir a tela.
 *
 * Uso: `node scripts/test-geracao.mjs` (ou `npm run test:geracao`).
 * Exit 0 em sucesso, 1 em falha.
 */
import assert from "node:assert/strict";
import {
  billingTypeDe,
  corpoDoPagamento,
  descricaoDaCobranca,
  linhasDeFatura,
  planoDoGrupo,
  vencimentoDoPeriodo,
} from "../api/_lib/geracao.js";

const ALDINA = "8a0ecce8-a326-471d-a5b6-ce28f8b73eb4";
const FERNANDA = "11291bf3-f9ee-4711-a4e9-52f6a975d84f";
const ABDALA = "f63ddd0f-df35-41ef-b7ab-b0cb840773bb";
const PERIODO = "2026-10";

// Os assinantes reais do subconjunto de sandbox, com os numeros conferidos no
// banco em 05/09: Aldina e Fernanda 114 + 25 de extras cada; Abdala 114 + 53.
const porId = new Map([
  [ALDINA, { id: ALDINA, nome: "Aldina", total_paes: 2, valor_mensal: 114, valor_frete: 15 }],
  [FERNANDA, { id: FERNANDA, nome: "Fernanda", total_paes: 1, valor_mensal: 114, valor_frete: 15 }],
  [ABDALA, { id: ABDALA, nome: "Abdala Farah", total_paes: 1, valor_mensal: 114, valor_frete: 15 }],
]);

function linha(id, nome, { mensalidade = 114, ajuste = 0, extras = 0, proporcional = false } = {}) {
  return {
    subscriptionId: id,
    nome,
    mensalidade,
    ajuste,
    totalExtras: extras,
    total: mensalidade + ajuste + extras,
    proporcional,
    extras: [],
  };
}

const GRUPO_ALDINA = {
  pagadorId: ALDINA,
  pagadorNome: "Aldina",
  formaPagamento: "boleto",
  assinaturas: [linha(ALDINA, "Aldina", { extras: 25 }), linha(FERNANDA, "Fernanda", { extras: 25 })],
  total: 278,
};

const GRUPO_ABDALA = {
  pagadorId: ABDALA,
  pagadorNome: "Abdala Farah",
  formaPagamento: "boleto_pix",
  assinaturas: [linha(ABDALA, "Abdala Farah", { extras: 53 })],
  total: 167,
};

let falhas = 0;
function checa(nome, fn) {
  try {
    fn();
    console.log(`  ok  ${nome}`);
  } catch (err) {
    falhas++;
    console.error(`  FALHOU  ${nome}`);
    console.error(`     ${String(err.message).split("\n").slice(0, 6).join("\n     ")}`);
  }
}

console.log("geracao de cobrancas — logica pura");

// ── os valores que o Hugo vai conferir ─────────────────────────────────────

checa("grupo da Aldina soma R$ 278,00 numa cobranca so", () => {
  const plano = planoDoGrupo(GRUPO_ALDINA, PERIODO, porId, new Map());
  assert.equal(plano.acao, "criar");
  assert.equal(plano.valor, 278);
  assert.equal(plano.linhas.length, 2, "duas faturas, uma por cesta");
});

checa("Abdala solo soma R$ 167,00", () => {
  const plano = planoDoGrupo(GRUPO_ABDALA, PERIODO, porId, new Map());
  assert.equal(plano.valor, 167);
  assert.equal(plano.linhas.length, 1);
});

// ── A CONDICAO: valor recalculado manda, divergencia bloqueia ──────────────

checa("BLOQUEIA quando a fatura pendente diverge do recalculo", () => {
  // A previa mudou desde a tentativa anterior (um extra entrou). A fatura
  // pendente tem 139; o recalculo da 164. Passar aqui cobraria o valor velho.
  const pendente = new Map([
    [ALDINA, { subscription_id: ALDINA, valor_total: 139, asaas_payment_id: null }],
    [FERNANDA, { subscription_id: FERNANDA, valor_total: 114, asaas_payment_id: null }],
  ]);
  const grupoMaior = {
    ...GRUPO_ALDINA,
    assinaturas: [linha(ALDINA, "Aldina", { extras: 50 }), linha(FERNANDA, "Fernanda", { extras: 25 })],
  };
  const plano = planoDoGrupo(grupoMaior, PERIODO, porId, pendente);
  assert.equal(plano.acao, "bloquear");
  assert.match(plano.motivo, /139/);
  assert.match(plano.motivo, /164/);
  assert.equal(plano.valor, undefined, "grupo bloqueado nao pode ter valor pra chamar");
});

checa("valor da chamada vem do recalculo, nunca da fatura gravada", () => {
  // Fatura pendente com o valor CERTO (nao bloqueia), mas com um valor gravado
  // que, se fosse usado, daria outro numero. O plano tem que devolver o
  // recalculado.
  const pendente = new Map([
    [ABDALA, { subscription_id: ABDALA, valor_total: 167, asaas_payment_id: null }],
  ]);
  const plano = planoDoGrupo(GRUPO_ABDALA, PERIODO, porId, pendente);
  assert.equal(plano.acao, "rechamar");
  assert.equal(plano.valor, 167);
  // E o corpo do POST tambem: `value` sai do plano, nao da fatura.
  const corpo = corpoDoPagamento({
    customerId: "cus_sandbox",
    grupo: GRUPO_ABDALA,
    periodoReferencia: PERIODO,
    valor: plano.valor,
    dueDate: vencimentoDoPeriodo(PERIODO),
  });
  assert.equal(corpo.value, 167);
});

// ── retry: os dois caminhos ────────────────────────────────────────────────

checa("retry PULA grupo que ja tem asaas_payment_id", () => {
  const geradas = new Map([
    [ALDINA, { subscription_id: ALDINA, valor_total: 139, asaas_payment_id: "pay_1" }],
    [FERNANDA, { subscription_id: FERNANDA, valor_total: 139, asaas_payment_id: "pay_1" }],
  ]);
  const plano = planoDoGrupo(GRUPO_ALDINA, PERIODO, porId, geradas);
  assert.equal(plano.acao, "pular");
  assert.equal(plano.asaasPaymentId, "pay_1");
});

checa("retry RECHAMA quando o insert passou e a chamada nao completou", () => {
  const pendentes = new Map([
    [ALDINA, { subscription_id: ALDINA, valor_total: 139, asaas_payment_id: null }],
    [FERNANDA, { subscription_id: FERNANDA, valor_total: 139, asaas_payment_id: null }],
  ]);
  const plano = planoDoGrupo(GRUPO_ALDINA, PERIODO, porId, pendentes);
  assert.equal(plano.acao, "rechamar", "nao pode reinserir: bateria na constraint");
  assert.equal(plano.valor, 278);
});

checa("BLOQUEIA grupo meio-gerado (parte com pagamento, parte sem)", () => {
  const meio = new Map([
    [ALDINA, { subscription_id: ALDINA, valor_total: 139, asaas_payment_id: "pay_1" }],
    [FERNANDA, { subscription_id: FERNANDA, valor_total: 139, asaas_payment_id: null }],
  ]);
  const plano = planoDoGrupo(GRUPO_ALDINA, PERIODO, porId, meio);
  assert.equal(plano.acao, "bloquear");
  assert.match(plano.motivo, /meio-gerado/);
});

// ── billingType, descricao, vencimento ─────────────────────────────────────

checa("billingType sai da forma do pagador", () => {
  assert.equal(billingTypeDe("boleto_pix"), "UNDEFINED");
  assert.equal(billingTypeDe("boleto"), "BOLETO");
  assert.equal(billingTypeDe("pix"), "PIX");
});

checa("cartao e forma nula nao ganham billingType por conta propria", () => {
  // Se o filtro da previa afrouxar, isto falha alto em vez de cobrar cartao.
  assert.throws(() => billingTypeDe("cartao"), /sem billingType/);
  assert.throws(() => billingTypeDe(null), /sem billingType/);
});

checa("descricao identifica as cestas do grupo", () => {
  assert.equal(descricaoDaCobranca(PERIODO, GRUPO_ALDINA), "Outubro: assinatura Aldina + Fernanda");
  assert.equal(descricaoDaCobranca(PERIODO, GRUPO_ABDALA), "Outubro: assinatura Abdala Farah");
});

checa("externalReference e o uuid PURO do pagador", () => {
  // Valor composto (uuid + periodo) falharia o UUID_RE do webhook e cairia no
  // fallback fraco por asaas_customer_id.
  const corpo = corpoDoPagamento({
    customerId: "cus_x", grupo: GRUPO_ALDINA, periodoReferencia: PERIODO,
    valor: 278, dueDate: vencimentoDoPeriodo(PERIODO),
  });
  assert.equal(corpo.externalReference, ALDINA);
  assert.match(corpo.externalReference, /^[0-9a-f-]{36}$/);
});

checa("vencimento e dia 8 do mes de referencia", () => {
  assert.equal(vencimentoDoPeriodo("2026-10"), "2026-10-08");
});

// ── as linhas de fatura ────────────────────────────────────────────────────

checa("uma fatura por assinatura, e paes + frete fecham a mensalidade", () => {
  const linhas = linhasDeFatura(GRUPO_ALDINA, PERIODO, porId);
  assert.equal(linhas.length, 2);
  for (const l of linhas) {
    assert.equal(l.status, "pendente");
    assert.equal(l.asaas_payment_id, undefined, "payment_id so entra depois da API");
    assert.equal(l.periodo_referencia, PERIODO);
    assert.equal(l.valor_paes + l.valor_frete, 114, "a soma tem que dar a mensalidade cobrada");
  }
  assert.equal(linhas.reduce((s, l) => s + l.valor_total, 0), 278);
});

checa("mensalidade proporcional rateia o frete junto", () => {
  // Entrada no meio do mes: 114 * 3/5 = 68.40. O frete tem que entrar rateado,
  // senao `valor_total - paes - frete` (a derivacao de extras da 0027) quebra.
  const grupo = {
    pagadorId: ABDALA, pagadorNome: "Abdala Farah", formaPagamento: "boleto_pix",
    assinaturas: [linha(ABDALA, "Abdala Farah", { mensalidade: 68.4, proporcional: true })],
    total: 68.4,
  };
  const [l] = linhasDeFatura(grupo, PERIODO, porId);
  assert.equal(l.valor_frete, 9, "15 * 3/5");
  assert.equal(l.valor_paes, 59.4);
  assert.equal(l.valor_paes + l.valor_frete, 68.4);
});

if (falhas > 0) {
  console.error(`\n${falhas} verificacao(oes) falharam.`);
  process.exit(1);
}
console.log("\ntudo certo.");
