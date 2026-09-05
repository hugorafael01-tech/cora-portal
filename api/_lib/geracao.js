/**
 * Logica da geracao de cobrancas (Fase 3, bloco B). PURA: sem rede, sem banco.
 *
 * Recebe a previa ja recalculada e as faturas que existirem, e devolve o que
 * fazer com cada grupo de pagador. Fica separada do handler pelo mesmo motivo
 * do previa.js: da pra testar sem chamar o Asaas, e o que decide se alguem vai
 * ser cobrado nao pode depender de rede pra ser exercitado.
 *
 * ============================================================================
 * A REGRA QUE MANDA EM TUDO AQUI
 * ============================================================================
 * A chamada a API usa SEMPRE o valor recem-recalculado. Nunca o que estiver
 * gravado numa fatura pendente.
 *
 * O caso que isso previne: um retry encontra uma fatura pendente de uma
 * tentativa anterior, gravada com um valor que desde entao mudou (um extra
 * entrou, uma entrega foi marcada). Se a chamada usasse o valor gravado, a
 * cobranca sairia CERTA NA TELA e ERRADA NO BOLETO — a pior falha possivel
 * nesta frente, porque ninguem olha o boleto de novo depois de conferir a tela.
 *
 * Por isso divergencia entre fatura pendente e recalculo **BLOQUEIA**, e nao
 * "vence". Bloquear atrasa uma cobranca; passar cobra o valor errado.
 */

/**
 * forma de pagamento do PAGADOR -> billingType do Asaas.
 *
 * `boleto_pix` -> UNDEFINED e o caso dos 25: a cobranca aceita os dois e e a
 * unica que devolve linha digitavel E payload Pix na mesma resposta.
 */
const BILLING_TYPE = {
  boleto_pix: "UNDEFINED",
  boleto: "BOLETO",
  pix: "PIX",
};

export function billingTypeDe(formaPagamento) {
  const tipo = BILLING_TYPE[formaPagamento];
  if (!tipo) {
    // cartao chega aqui se alguem afrouxar o filtro da previa; sem forma, idem.
    // Falhar e melhor que escolher um billingType por conta propria.
    throw new Error(`forma de pagamento sem billingType: ${formaPagamento}`);
  }
  return tipo;
}

const MESES = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/**
 * Descricao que aparece na fatura do Asaas e no extrato do assinante.
 *
 * Precisa identificar as cestas quando o grupo tem mais de uma — e o unico
 * lugar onde a Fernanda ve que aquele boleto tambem e dela. Vocabulario da
 * casa, sem caixa alta e sem travessao.
 *
 *   Outubro: assinatura Abdala Farah
 *   Outubro: assinatura Aldina + Fernanda
 */
export function descricaoDaCobranca(periodoReferencia, grupo) {
  const [, mes] = periodoReferencia.split("-").map(Number);
  const nomes = grupo.assinaturas.map((a) => a.nome).join(" + ");
  return `${MESES[mes - 1]}: assinatura ${nomes}`;
}

/**
 * As N linhas de `faturas` de um grupo. Uma por assinatura, sempre — a
 * cobranca e uma so, mas a fatura preserva o detalhe por cesta, que e o que
 * vira o extrato.
 *
 * SOBRE O RATEIO DE valor_paes/valor_frete: a 0027 deriva os extras na leitura
 * como `valor_total - valor_paes - valor_frete`. Pra essa conta continuar
 * fechando quando a mensalidade e proporcional (entrada no meio do mes), o
 * frete entra rateado na mesma proporcao, e nao cheio. O resto (`valor_total`
 * menos os dois) passa a ser "extras E ajuste", nao so extras — o ajuste de
 * mudanca de plano cai ali. Esta anotado porque quem ler a 0027 sozinha vai
 * supor que o resto e so extras.
 */
export function linhasDeFatura(grupo, periodoReferencia, porId) {
  return grupo.assinaturas.map((linha) => {
    const sub = porId.get(linha.subscriptionId);
    const cheia = Number(sub?.valor_mensal ?? 0);
    const freteCheio = Number(sub?.valor_frete ?? 0);
    // Proporcao da mensalidade efetivamente cobrada sobre a cheia. 1 no caso
    // normal; menor quando entrou no meio do mes.
    const proporcao = cheia > 0 ? linha.mensalidade / cheia : 1;
    const valorFrete = dinheiro(freteCheio * proporcao);
    return {
      subscription_id: linha.subscriptionId,
      periodo_referencia: periodoReferencia,
      qty_paes: Number(sub?.total_paes ?? 0),
      valor_paes: dinheiro(linha.mensalidade - valorFrete),
      valor_frete: valorFrete,
      valor_total: linha.total,
      status: "pendente",
    };
  });
}

/** Arredonda a 2 casas. Mesma conta do previa.js. */
function dinheiro(n) {
  return Math.round(n * 100) / 100;
}

/**
 * O que fazer com um grupo, dadas as faturas que ja existem para ele.
 *
 * Os quatro desfechos:
 *
 *   pular     ja tem `asaas_payment_id`: a cobranca foi criada. Retry nao
 *             recria nem rechama.
 *   rechamar  existe fatura pendente SEM payment_id e o valor confere: o
 *             insert passou e a chamada a API nao completou. Refaz so a
 *             chamada, sem reinserir (o insert daria 23505 na constraint).
 *   criar     nao existe fatura: insere as N e chama.
 *   bloquear  existe fatura pendente com valor DIFERENTE do recalculo, ou o
 *             grupo esta meio-gerado (parte com payment_id, parte sem).
 *
 * @param {object} grupo grupo de pagador da previa recalculada
 * @param {Map<string, object>} faturasPorSub fatura existente por subscription_id
 */
export function planoDoGrupo(grupo, periodoReferencia, porId, faturasPorSub) {
  const linhas = linhasDeFatura(grupo, periodoReferencia, porId);
  const existentes = linhas.map((l) => faturasPorSub.get(l.subscription_id) ?? null);

  const comPagamento = existentes.filter((f) => f && f.asaas_payment_id);
  const pendentes = existentes.filter((f) => f && !f.asaas_payment_id);
  const ausentes = existentes.filter((f) => f === null);

  // Grupo meio-gerado: parte das linhas ja tem pagamento e parte nao. Nao ha
  // desfecho seguro — recriar duplicaria, completar exigiria adivinhar qual
  // pagamento vale. E raro por construcao (as N linhas sao gravadas juntas),
  // entao vira caso pra olho humano.
  if (comPagamento.length > 0 && comPagamento.length < existentes.length) {
    return {
      acao: "bloquear",
      motivo: `Grupo meio-gerado: ${comPagamento.length} de ${existentes.length} faturas ja tem pagamento. Resolver a mao antes de gerar.`,
      linhas,
    };
  }

  if (comPagamento.length === existentes.length && existentes.length > 0) {
    return {
      acao: "pular",
      motivo: "ja gerado",
      asaasPaymentId: comPagamento[0].asaas_payment_id,
      linhas,
    };
  }

  // A CONDICAO QUE NAO PODE FALHAR: fatura pendente com valor diferente do
  // recalculo bloqueia. Ver o cabecalho do arquivo.
  for (const fatura of pendentes) {
    const linha = linhas.find((l) => l.subscription_id === fatura.subscription_id);
    const gravado = dinheiro(Number(fatura.valor_total));
    if (gravado !== dinheiro(linha.valor_total)) {
      return {
        acao: "bloquear",
        motivo:
          `Fatura pendente de ${linha.subscription_id} tem ${gravado} e o recalculo da ` +
          `${dinheiro(linha.valor_total)}. A previa mudou desde a tentativa anterior. ` +
          `Apague a fatura pendente e gere de novo.`,
        linhas,
      };
    }
  }

  const valor = dinheiro(linhas.reduce((s, l) => s + l.valor_total, 0));

  if (pendentes.length > 0 && ausentes.length === 0) {
    return { acao: "rechamar", motivo: "insert ja feito, chamada nao completou", valor, linhas };
  }
  if (pendentes.length > 0) {
    return {
      acao: "bloquear",
      motivo: `Grupo com ${pendentes.length} fatura(s) pendente(s) e ${ausentes.length} ausente(s). Resolver a mao.`,
      linhas,
    };
  }
  return { acao: "criar", motivo: "primeira geracao", valor, linhas };
}

/**
 * Corpo do POST /v3/payments.
 *
 * `externalReference` = uuid PURO da assinatura do pagador. Nao carrega o
 * periodo: o webhook so tenta o caminho principal quando o valor casa com a
 * regex de uuid, e um valor composto cairia no fallback por
 * `asaas_customer_id`, que e o caminho fraco. A idempotencia e a constraint
 * local em `faturas`, nunca este campo — o Asaas nao valida unicidade dele.
 *
 * `value` vem do plano (recalculado), nunca de fatura gravada.
 */
export function corpoDoPagamento({ customerId, grupo, periodoReferencia, valor, dueDate }) {
  return {
    customer: customerId,
    billingType: billingTypeDe(grupo.formaPagamento),
    value: valor,
    dueDate,
    description: descricaoDaCobranca(periodoReferencia, grupo),
    externalReference: grupo.pagadorId,
  };
}

/** Vencimento: dia 8 do mes de referencia. */
export function vencimentoDoPeriodo(periodoReferencia) {
  return `${periodoReferencia}-08`;
}
