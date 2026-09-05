/**
 * Montagem da previa de cobranca — GEMEO do backoffice.
 *
 * ============================================================================
 * ESTE ARQUIVO E UMA COPIA. NAO EVOLUA SO ELE.
 * ============================================================================
 *   cora-backoffice/src/lib/previa.ts   ORIGEM, TypeScript, monta a tela
 *   cora-portal/api/_lib/previa.js      ESTE, JavaScript, recalcula do zero
 *
 * A geracao (Fase 3) roda aqui, e o servidor NAO pode confiar no total que veio
 * do browser — e a razao de a fase existir. Por isso a mesma conta vive nos
 * dois lugares.
 *
 * O QUE NAO PODE MUDAR NA TRAVESSIA: mesmas entradas, mesmas saidas, ate o
 * centavo e ate a ordem dos alertas. As REGRAS sao testadas do lado do
 * backoffice, onde ha framework de verdade (36 testes em previa.test.ts). Aqui
 * nao ha uma segunda suite: o que amarra os dois lados e o GOLDEN FIXTURE
 * `previa.golden.json`, o mesmo arquivo commitado nos dois repos, com uma
 * entrada rica e a saida esperada. Cada lado afirma contra ele
 * (`npm run test:previa` aqui, `previa.golden.test.ts` la). Divergiu, um dos
 * dois fica vermelho.
 *
 * Mudou regra? Muda no backoffice PRIMEIRO, regenera o golden, copia pra ca, e
 * roda os dois. A conciliacao da Fase 4 faz a versao runtime dessa mesma
 * comparacao e BLOQUEIA a geracao quando os gemeos discordam.
 *
 * Nenhuma dependencia: sem date-fns (a aritmetica de data e UTC sobre
 * 'YYYY-MM-DD', a mao, justamente pra atravessar), sem client de banco, sem
 * Date.now(). Dependencia nova aqui e dependencia a manter nos dois lados.
 *
 * ============================================================================
 * O QUE A PREVIA COBRA
 * ============================================================================
 * Uma cobranca por PAGADOR por mes:
 *   mensalidade do mes de referencia (adiantada)
 *   + extras do ciclo encerrado (pos-consumo: so o que foi ENTREGUE)
 *   + ajuste proporcional de aumento no meio do mes anterior
 */

// ---------------------------------------------------------------------------
// Datas: aritmetica em UTC sobre YYYY-MM-DD, sem dependencia externa
// ---------------------------------------------------------------------------
// As datas do banco sao `date` (sem hora) e chegam como 'YYYY-MM-DD'. Converter
// pra Date local desloca um dia dependendo do fuso — e AQUI, em serverless UTC,
// o bug apareceria so em producao. Date.UTC e deterministico nos dois lados.

const QUINTA = 4; // getUTCDay: 0=domingo

function paraUTC(ymd) {
  const [a, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

function paraYmd(d) {
  return d.toISOString().slice(0, 10);
}

function somaDias(ymd, dias) {
  const d = paraUTC(ymd);
  d.setUTCDate(d.getUTCDate() + dias);
  return paraYmd(d);
}

/** Mes anterior a 'AAAA-MM', como 'AAAA-MM'. */
export function mesAnterior(periodo) {
  const [a, m] = periodo.split('-').map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`;
}

/**
 * Ultima quinta com dia <= 25 no mes dado. E o corte do ciclo: entrega de
 * quinta depois do 25 fica pro ciclo seguinte.
 */
export function corteDoMes(periodo) {
  let cursor = `${periodo}-25`;
  for (let i = 0; i < 7; i++) {
    if (paraUTC(cursor).getUTCDay() === QUINTA) return cursor;
    cursor = somaDias(cursor, -1);
  }
  throw new Error(`sem quinta ate o dia 25 de ${periodo}`);
}

/** Todas as quintas em (depoisDe, ate]. */
export function quintasEntre(depoisDe, ate) {
  const out = [];
  let cursor = somaDias(depoisDe, 7);
  while (cursor <= ate) {
    out.push(cursor);
    cursor = somaDias(cursor, 7);
  }
  return out;
}

/** Quintas do mes inteiro. Usado no rateio de entrada nova. */
export function quintasDoMes(periodo) {
  const [a, m] = periodo.split('-').map(Number);
  const out = [];
  const d = new Date(Date.UTC(a, m - 1, 1));
  while (d.getUTCDay() !== QUINTA) d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCMonth() === m - 1) {
    out.push(paraYmd(d));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return out;
}

/**
 * Janela de extras do periodo de referencia: da primeira quinta APOS o corte
 * anterior ate a ultima quinta <= dia 25 do mes anterior. Os dois cortes juntos
 * fazem a janela ser SEM BURACO e SEM SOBREPOSICAO.
 *
 * Referencia 2026-11: corte 22/10, corte anterior 24/09 -> 01, 08, 15, 22/10.
 * A quinta 29/10 NAO entra: cai no ciclo de dezembro.
 */
export function janelaDoCiclo(periodoReferencia) {
  const mesDosExtras = mesAnterior(periodoReferencia);
  const ultimaQuinta = corteDoMes(mesDosExtras);
  const corteAnterior = corteDoMes(mesAnterior(mesDosExtras));
  const quintas = quintasEntre(corteAnterior, ultimaQuinta);
  return {
    primeiraQuinta: quintas[0] ?? somaDias(corteAnterior, 7),
    ultimaQuinta,
    quintas,
  };
}

// ---------------------------------------------------------------------------
// Dinheiro e texto de tela
// ---------------------------------------------------------------------------

/** Arredonda a 2 casas. Mesma conta do computeTotalExtras. */
export function dinheiro(n) {
  return Math.round(n * 100) / 100;
}

/** 'R$ 1.234,50'. Tem que dar exatamente o mesmo que o formatBRL do backoffice. */
export function reais(n) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** 'quinta 03/09' a partir de '2026-09-03'. */
export function quintaLegivel(ymd) {
  const [, m, d] = ymd.split('-');
  return `quinta ${d}/${m}`;
}

// ---------------------------------------------------------------------------
// Mensalidade
// ---------------------------------------------------------------------------

/**
 * Mensalidade do mes de referencia, com a regra de vigencia de 29/08: aumento
 * vale proporcional no mes corrente e cheio na renovacao; reducao SO vale na
 * renovacao. Na pratica, mudanca agendada que ja entrou em vigor ate o primeiro
 * dia do mes de referencia e a que vale.
 */
function mensalidadeVigente(sub, periodoReferencia) {
  const primeiroDia = `${periodoReferencia}-01`;
  if (
    sub.next_billing_change_date !== null &&
    sub.next_billing_change_date !== undefined &&
    sub.next_billing_value !== null &&
    sub.next_billing_value !== undefined &&
    sub.next_billing_change_date <= primeiroDia
  ) {
    return sub.next_billing_value;
  }
  return sub.valor_mensal;
}

/**
 * Entrada no meio do mes: proporcional por quintas restantes / quintas do mes.
 * `valor_mensal` JA INCLUI o frete, entao ratear ele e ratear "mensalidade e
 * frete" sem somar o frete por fora.
 */
function rateioDeEntrada(sub, periodoReferencia, mensalidadeCheia) {
  if (!sub.activated_at) return { valor: mensalidadeCheia, proporcional: false };
  const ativacao = sub.activated_at.slice(0, 10);
  if (ativacao.slice(0, 7) !== periodoReferencia) {
    return { valor: mensalidadeCheia, proporcional: false };
  }
  const todas = quintasDoMes(periodoReferencia);
  const restantes = todas.filter((q) => q >= ativacao);
  if (todas.length === 0 || restantes.length === todas.length) {
    return { valor: mensalidadeCheia, proporcional: false };
  }
  return {
    valor: dinheiro((mensalidadeCheia * restantes.length) / todas.length),
    proporcional: true,
  };
}

/**
 * Ajuste proporcional de aumento no meio do mes ANTERIOR.
 *
 * LIMITE CONHECIDO: o PATCH de mudanca de plano do portal sobrescreve
 * `valor_mensal` na hora e nao grava `next_billing_*`, entao o valor antigo
 * desaparece e o ajuste e irreconstruivel pelo banco. Decisao do Hugo (04/09):
 * lancamento manual em outubro. Esta funcao so calcula se algum dia
 * `next_billing_*` passar a ser populado; enquanto nao for, devolve 0 — mas NAO
 * em silencio, porque `montaPrevia` levanta `ajuste_nao_reconstruivel`.
 */
function ajusteProporcional(sub, periodoReferencia) {
  const quando = sub.next_billing_change_date ?? null;
  const novo = sub.next_billing_value ?? null;
  if (quando === null || novo === null) return 0;
  const mesDoAjuste = mesAnterior(periodoReferencia);
  if (quando.slice(0, 7) !== mesDoAjuste) return 0;
  if (novo <= sub.valor_mensal) return 0; // reducao nao gera ajuste

  const todas = quintasDoMes(mesDoAjuste);
  const afetadas = todas.filter((q) => q >= quando);
  if (todas.length === 0 || afetadas.length === 0) return 0;
  return dinheiro(((novo - sub.valor_mensal) * afetadas.length) / todas.length);
}

/**
 * Quantos paes da cesta ficaram VAGOS neste pedido.
 *
 * A troca de produto tira um pao da `composition` e poe o trocado nos `extras`
 * com preco 0. O slot vago e a assinatura dessa operacao.
 *
 * `composition` nula = cesta padrao, todos os slots usados => 0 vagos. NAO e
 * "ainda nao escolheu": o proprio endpoint de weekly-orders documenta que null
 * "limpa o swap (volta ao padrao da assinatura)".
 *
 * ARMADILHA: aquele endpoint valida `soma(composition) === total_paes`, entao
 * pedido feito pela tela NUNCA tem slot vago. Todo slot vago no banco veio de
 * escrita SQL direta. Formalizar a troca exige mudar aquela validacao junto.
 */
function slotsVagos(wo, totalPaes) {
  if (wo.composition === null || wo.composition === undefined) return 0;
  const usados = (wo.composition.original ?? 0) + (wo.composition.integral ?? 0);
  return Math.max(0, totalPaes - usados);
}

// ---------------------------------------------------------------------------
// Montagem
// ---------------------------------------------------------------------------

/**
 * Monta a previa de um periodo de referencia ('AAAA-MM').
 *
 * Filtro de quem entra: `forma_pagamento !== 'cartao'` do PAGADOR — nunca
 * `['boleto','pix']`, que hoje deixaria 25 dos 27 de fora em silencio. Quem
 * esta com forma nula ENTRA, com alerta: a previa jamais filtra calada.
 */
export function montaPrevia(entrada, periodoReferencia) {
  const janela = janelaDoCiclo(periodoReferencia);
  const alertas = [];
  const naJanela = new Set(janela.quintas);

  // Entrega e o portao do pos-consumo: so entra extra de pedido que virou
  // entrega ENTREGUE. `status = 'confirmado'` sozinho nao serve — ha rascunho
  // com total_extras > 0 no banco, carrinho que nunca foi entregue.
  const entreguesPorOrder = new Set(
    entrada.entregas
      .filter((e) => e.status === 'entregue' && e.weekly_order_id !== null)
      .map((e) => e.weekly_order_id),
  );

  const porId = new Map(entrada.subscriptions.map((s) => [s.id, s]));
  const extrasPorSub = new Map();

  for (const wo of entrada.weeklyOrders) {
    if (!naJanela.has(wo.delivery_date)) continue;
    if (wo.status !== 'confirmado') continue;

    if (!entreguesPorOrder.has(wo.id)) {
      // Confirmado na janela mas sem entrega entregue. NAO descarta calado:
      // pode ser atraso de marcar a entrega, e o extra sumiria sem ninguem ver.
      alertas.push({
        codigo: 'entrega_nao_confirmada',
        mensagem:
          `Cesta confirmada na ${quintaLegivel(wo.delivery_date)} sem entrega marcada como ` +
          `entregue. Não entrou na cobrança, confira antes de gerar.`,
        subscriptionId: wo.subscription_id,
      });
      continue;
    }

    const itens = wo.extras ?? [];
    const precosDaQuinta = entrada.precos.get(wo.delivery_date);
    let soma = 0;
    const cobravel = [];

    // Slots vagos sao consumidos na ORDEM do array, e um item so vira troca se
    // couber inteiro (qty <= vagos restantes). Item que nao cabe cai no caminho
    // de cortesia/alerta, sem se partir em dois.
    const assinante = porId.get(wo.subscription_id);
    let vagos = assinante ? slotsVagos(wo, assinante.total_paes) : 0;

    for (const item of itens) {
      const subtotal = dinheiro(item.qty * item.preco_unit);
      soma += subtotal;

      let tipo = 'pago';
      if (item.preco_unit === 0) {
        if (item.qty <= vagos) {
          tipo = 'troca';
          vagos -= item.qty;
        } else if (item.motivo === 'cortesia') {
          tipo = 'cortesia';
        }
      }

      cobravel.push({ ...item, quinta: wo.delivery_date, subtotal, tipo });

      // O preco gravado e um SNAPSHOT do cardapio no momento do pedido, e e ele
      // que vale: cobrar outro seria cobrar um numero que a pessoa nunca viu.
      // Zerado que a regra nao explicou: nao e troca nem cortesia declarada.
      if (item.preco_unit === 0 && tipo === 'pago') {
        alertas.push({
          codigo: 'preco_zero',
          mensagem:
            `${item.nome} na ${quintaLegivel(wo.delivery_date)} está com preço zero e ` +
            `foi cobrado como zero. Não é troca (a cesta está cheia) e não tem motivo ` +
            `gravado. Confira se faltou cadastrar o preço.`,
          subscriptionId: wo.subscription_id,
        });
      }

      // Divergencia so faz sentido pro que era pra ter preco. Em troca e em
      // cortesia o zero e a regra.
      const precoHoje = tipo === 'pago' ? precosDaQuinta?.get(item.id) : undefined;
      if (precoHoje !== undefined && precoHoje !== item.preco_unit) {
        alertas.push({
          codigo: 'preco_divergente',
          mensagem:
            `${item.nome} na ${quintaLegivel(wo.delivery_date)} foi gravado a ` +
            `${reais(item.preco_unit)} e o cardápio da semana diz ${reais(precoHoje)}. ` +
            `Cobrado o valor gravado, que foi o que apareceu para a pessoa.`,
          subscriptionId: wo.subscription_id,
        });
      }
    }

    // Invariante provado contra 44 linhas de agosto: total_extras e exatamente
    // a soma de qty*preco_unit. Se quebrar, a tela grita em vez de escolher.
    if (dinheiro(soma) !== dinheiro(wo.total_extras)) {
      alertas.push({
        codigo: 'total_extras_divergente',
        mensagem:
          `Na ${quintaLegivel(wo.delivery_date)} o total gravado é ${reais(wo.total_extras)} ` +
          `e a soma dos produtos dá ${reais(dinheiro(soma))}. Os dois números do banco ` +
          `discordam, então nenhum deles é confiável.`,
        subscriptionId: wo.subscription_id,
      });
    }

    const acumulado = extrasPorSub.get(wo.subscription_id) ?? [];
    extrasPorSub.set(wo.subscription_id, acumulado.concat(cobravel));
  }

  // ---- linhas por assinatura -------------------------------------------
  const linhas = new Map();

  for (const sub of entrada.subscriptions) {
    if (sub.forma_pagamento === null || sub.forma_pagamento === undefined) {
      alertas.push({
        codigo: 'forma_pagamento_ausente',
        mensagem:
          `${sub.nome} está ativa sem forma de pagamento. Aparece na prévia, mas ` +
          `confira no painel do Asaas antes de gerar.`,
        subscriptionId: sub.id,
      });
    }

    const cheia = mensalidadeVigente(sub, periodoReferencia);
    const { valor: mensalidade, proporcional } = rateioDeEntrada(sub, periodoReferencia, cheia);
    const ajuste = ajusteProporcional(sub, periodoReferencia);
    const extras = extrasPorSub.get(sub.id) ?? [];
    const totalExtras = dinheiro(extras.reduce((s, e) => s + e.subtotal, 0));

    linhas.set(sub.id, {
      subscriptionId: sub.id,
      nome: sub.nome,
      formaPagamento: sub.forma_pagamento ?? null,
      mensalidade,
      ajuste,
      extras,
      totalExtras,
      total: dinheiro(mensalidade + ajuste + totalExtras),
      proporcional,
    });
  }

  // ---- agrupamento por pagador -----------------------------------------
  // Um nivel so: `pagador_subscription_id ?? id`. Null = paga a propria.
  const grupos = new Map();

  for (const sub of entrada.subscriptions) {
    const apontado = sub.pagador_subscription_id ?? null;
    let pagadorId = apontado ?? sub.id;
    let pagador = porId.get(pagadorId);

    if (apontado !== null && pagador === undefined) {
      // Aponta pra assinatura que nao veio na leitura (cancelada, pausada ou
      // 'dev'). Antes isto remontava o grupo em silencio com o nome e a forma
      // do DEPENDENTE. Agora alerta, e ele volta a ser pagador de si mesmo.
      alertas.push({
        codigo: 'pagador_nao_encontrado',
        mensagem:
          `${sub.nome} aponta para quem paga por ela, mas essa assinatura não está ativa ` +
          `(pode ter sido cancelada ou pausada). Cobrada separadamente, por si mesma.`,
        subscriptionId: sub.id,
      });
      pagadorId = sub.id;
      pagador = sub;
    }

    const linha = linhas.get(sub.id);
    if (!linha) continue;

    let grupo = grupos.get(pagadorId);
    if (!grupo) {
      const raiz = pagador ?? sub;
      grupo = {
        pagadorId,
        pagadorNome: raiz.nome,
        formaPagamento: raiz.forma_pagamento ?? null,
        assinaturas: [],
        total: 0,
      };
      grupos.set(pagadorId, grupo);
    }
    grupo.assinaturas.push(linha);
  }

  // ---- filtro, totais e alertas de grupo -------------------------------
  const saida = [];

  for (const grupo of grupos.values()) {
    // Filtro pela forma do PAGADOR: quem paga e quem recebe a cobranca.
    if (grupo.formaPagamento === 'cartao') continue;

    const formas = new Set(grupo.assinaturas.map((a) => a.formaPagamento));
    if (formas.size > 1) {
      alertas.push({
        codigo: 'grupo_forma_mista',
        mensagem:
          `As assinaturas que ${grupo.pagadorNome} paga têm formas de pagamento ` +
          `diferentes. Cobrado pela forma de quem paga (${grupo.formaPagamento ?? 'sem forma'}).`,
        subscriptionId: grupo.pagadorId,
      });
    }

    const pagador = porId.get(grupo.pagadorId);
    if (pagador && (pagador.asaas_customer_id === null || pagador.asaas_customer_id === undefined)) {
      alertas.push({
        codigo: 'sem_cliente_asaas',
        mensagem:
          `${grupo.pagadorNome} não tem cliente no Asaas. A prévia monta, mas a cobrança ` +
          `não pode ser criada sem vincular antes.`,
        subscriptionId: grupo.pagadorId,
      });
    }

    grupo.assinaturas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    grupo.total = dinheiro(grupo.assinaturas.reduce((s, a) => s + a.total, 0));
    saida.push(grupo);
  }

  saida.sort((a, b) => a.pagadorNome.localeCompare(b.pagadorNome, 'pt-BR'));

  // ---- escopo dos alertas ----------------------------------------------
  // So sobrevive alerta de quem esta na previa. Os pedidos dos 13 de cartao
  // passam por aqui (a leitura nao os filtra, pra que forma nula apareca), e
  // sem este corte gerariam alerta sobre quem nao esta na lista. Alerta
  // irrelevante treina a ignorar alerta.
  const idsNaPrevia = new Set(saida.flatMap((g) => g.assinaturas.map((a) => a.subscriptionId)));
  const alertasNoEscopo = alertas.filter(
    (a) => a.subscriptionId === null || idsNaPrevia.has(a.subscriptionId),
  );

  // Enquanto ninguem popular next_billing_*, "nao houve ajuste" e "nao da pra
  // saber se houve" sao o mesmo 0. Este alerta separa os dois, e se aposenta
  // sozinho quando todas as linhas tiverem o dado.
  const semDadoDeAjuste = saida
    .flatMap((g) => g.assinaturas)
    .some((a) => {
      const sub = porId.get(a.subscriptionId);
      return sub !== undefined && (sub.next_billing_change_date ?? null) === null;
    });
  if (semDadoDeAjuste) {
    alertasNoEscopo.push({
      codigo: 'ajuste_nao_reconstruivel',
      mensagem:
        'Mudança de plano no meio do mês não deixa rastro no banco: o valor antigo é ' +
        'substituído na hora. Se alguém mudou de plano no mês passado, o ajuste proporcional ' +
        'não está nesta prévia e precisa de lançamento manual.',
      subscriptionId: null,
    });
  }

  return {
    periodoReferencia,
    janela,
    grupos: saida,
    totalGeral: dinheiro(saida.reduce((s, g) => s + g.total, 0)),
    alertas: alertasNoEscopo,
  };
}
