/**
 * Orquestracao da geracao de cobrancas. Fica separada do handler porque tem
 * DOIS chamadores, e a sequencia nao pode existir em duas versoes:
 *
 *   api/cobrancas/gerar   endpoint, autenticado por JWT admin, chamado pela tela
 *   scripts/gera-sandbox  o ciclo de teste, direto por service_role
 *
 * Se o script repetisse a sequencia por conta propria, seria o problema do
 * gemeo outra vez: o teste provaria um caminho e a producao rodaria outro.
 *
 * ============================================================================
 * A ORDEM IMPORTA, E E ESTA
 * ============================================================================
 *   1. RECALCULA a previa do zero, aqui no servidor, com o gemeo previa.js.
 *      Nunca confia no total que veio do browser — e a razao da fase existir.
 *   2. INSERE as N linhas em `faturas` como `pendente`, ANTES de qualquer
 *      chamada a API. Falhou o insert pela constraint
 *      (subscription_id, periodo_referencia), NAO chama. Essa e a
 *      idempotencia, e ela e LOCAL: o Asaas nao valida unicidade de
 *      externalReference.
 *   3. POST /v3/payments, uma por grupo, com o valor RECALCULADO.
 *   4. Grava o retorno nas N faturas do grupo.
 *
 * Retry: fatura com `asaas_payment_id` esta pronta e e pulada; fatura pendente
 * sem ele quer dizer que a chamada nao completou, e refaz SO a chamada. Se o
 * valor da pendente divergir do recalculo, BLOQUEIA — ver _lib/geracao.js.
 *
 * SANDBOX NESTA FASE. Os asaas_customer_id do banco sao de PRODUCAO e nao
 * existem no sandbox, entao a geracao roda contra um subconjunto declarado em
 * env (ASAAS_SANDBOX_SUBSCRIPTIONS) com os clientes trocados por um mapa
 * (ASAAS_SANDBOX_CUSTOMER_MAP). A troca e na hora da chamada: nada disso
 * escreve cliente de sandbox no dado de producao.
 */
import { supabaseAdmin } from "../../src/lib/supabase-admin.js";
import { janelaDoCiclo, montaPrevia } from "./previa.js";
import { billingTypeDe, corpoDoPagamento, planoDoGrupo, vencimentoDoPeriodo } from "./geracao.js";
import { criarPagamento, dadosDePagamento } from "./asaas.js";

const PERIODO_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Alertas que impedem gerar. Mesma lista da tela (pages/Previa/types.ts). */
const BLOQUEIAM = new Set([
  "sem_cliente_asaas",
  "forma_pagamento_ausente",
  "total_extras_divergente",
]);

/** Subconjunto de teste do sandbox, se declarado. Vazio = sem restricao. */
function subconjuntoSandbox() {
  const cru = (process.env.ASAAS_SANDBOX_SUBSCRIPTIONS || "").trim();
  return cru ? new Set(cru.split(",").map((s) => s.trim()).filter(Boolean)) : null;
}

/** Mapa subscription_id -> cliente do sandbox. Vazio = usa o do banco. */
function mapaDeClientes() {
  const cru = (process.env.ASAAS_SANDBOX_CUSTOMER_MAP || "").trim();
  if (!cru) return new Map();
  try {
    return new Map(Object.entries(JSON.parse(cru)));
  } catch {
    throw new Error("ASAAS_SANDBOX_CUSTOMER_MAP nao e JSON valido");
  }
}

/** Le tudo que a previa precisa. Espelha o usePrevia do backoffice. */
async function leEntrada(periodoReferencia) {
  const janela = janelaDoCiclo(periodoReferencia);

  const [subs, orders] = await Promise.all([
    supabaseAdmin
      .from("subscriptions")
      .select(
        "id, nome, total_paes, forma_pagamento, valor_mensal, valor_frete, activated_at, " +
          "next_billing_change_date, next_billing_value, pagador_subscription_id, asaas_customer_id",
      )
      .eq("status", "active")
      .not("nome", "ilike", "%dev%"),
    supabaseAdmin
      .from("weekly_orders")
      .select("id, subscription_id, delivery_date, status, total_extras, extras, composition")
      .gte("delivery_date", janela.primeiraQuinta)
      .lte("delivery_date", janela.ultimaQuinta),
  ]);
  if (subs.error) throw subs.error;
  if (orders.error) throw orders.error;

  const weeklyOrders = orders.data ?? [];
  const ids = weeklyOrders.map((o) => o.id);

  const [entregas, semanas] = await Promise.all([
    ids.length
      ? supabaseAdmin.from("entregas").select("weekly_order_id, status").in("weekly_order_id", ids)
      : Promise.resolve({ data: [], error: null }),
    supabaseAdmin.from("semanas").select("id, data_entrega").in("data_entrega", janela.quintas),
  ]);
  if (entregas.error) throw entregas.error;
  if (semanas.error) throw semanas.error;

  return {
    subscriptions: subs.data ?? [],
    weeklyOrders,
    entregas: entregas.data ?? [],
    precos: await lePrecos(semanas.data ?? []),
  };
}

async function lePrecos(semanas) {
  const precos = new Map();
  if (!semanas.length) return precos;

  const { data: linhas, error } = await supabaseAdmin
    .from("cardapios")
    .select("semana_id, produto_id, preco_avulso")
    .in("semana_id", semanas.map((s) => s.id));
  if (error) throw error;
  if (!linhas?.length) return precos;

  const { data: produtos, error: errProd } = await supabaseAdmin
    .from("produtos")
    .select("id, slug")
    .in("id", linhas.map((l) => l.produto_id));
  if (errProd) throw errProd;

  const slugPorId = new Map((produtos ?? []).map((p) => [p.id, p.slug]));
  const quintaPorSemana = new Map(semanas.map((s) => [s.id, s.data_entrega]));
  for (const l of linhas) {
    const quinta = quintaPorSemana.get(l.semana_id);
    const slug = slugPorId.get(l.produto_id);
    const preco = Number(l.preco_avulso);
    if (!quinta || !slug || !Number.isFinite(preco)) continue;
    const doDia = precos.get(quinta) ?? new Map();
    doDia.set(slug, preco);
    precos.set(quinta, doDia);
  }
  return precos;
}

/** Gera a cobranca de UM grupo. Nao lanca: devolve o desfecho. */
async function geraGrupo({ grupo, plano, periodoReferencia, customerId }) {
  const rotulo = { pagador: grupo.pagadorNome, pagadorId: grupo.pagadorId };

  // ─── 2. Insert ANTES da chamada ───
  // So no caminho "criar". No "rechamar" as linhas ja existem e reinserir
  // bateria na constraint — que e justamente ela fazendo o trabalho dela.
  if (plano.acao === "criar") {
    const { error } = await supabaseAdmin.from("faturas").insert(plano.linhas);
    if (error) {
      // 23505 aqui quer dizer corrida com outra execucao: alguem ja inseriu
      // entre a leitura e agora. NAO chama a API — a outra execucao chama.
      return { ...rotulo, status: "erro", etapa: "insert", erro: error.message };
    }
  }

  // ─── 3. POST /v3/payments, com o valor RECALCULADO ───
  let pagamento;
  try {
    pagamento = await criarPagamento(
      corpoDoPagamento({
        customerId,
        grupo,
        periodoReferencia,
        valor: plano.valor,
        dueDate: vencimentoDoPeriodo(periodoReferencia),
      }),
    );
  } catch (err) {
    // As faturas pendentes ficam no banco de proposito: e o que permite o retry
    // saber que o insert passou e so a chamada falhou.
    return { ...rotulo, status: "erro", etapa: "asaas", erro: err.message, valor: plano.valor };
  }

  // ─── 4. Grava o retorno nas N faturas do grupo ───
  const billingType = billingTypeDe(grupo.formaPagamento);
  const extras = await dadosDePagamento(pagamento.id, { billingType });

  const { error: updErr } = await supabaseAdmin
    .from("faturas")
    .update({
      asaas_payment_id: pagamento.id,
      asaas_invoice_url: pagamento.invoiceUrl ?? null,
      linha_digitavel: extras.linhaDigitavel,
      pix_payload: extras.pixPayload,
    })
    .eq("periodo_referencia", periodoReferencia)
    .in("subscription_id", plano.linhas.map((l) => l.subscription_id));

  if (updErr) {
    // A cobranca EXISTE no Asaas mas a fatura nao guardou o id. O retry veria
    // "pendente sem payment_id" e criaria uma segunda cobranca — por isso isto
    // e erro alto, com o id no log pra resolucao manual.
    console.error("[cobrancas/gerar] cobranca criada mas faturas nao gravaram", {
      ...rotulo,
      asaasPaymentId: pagamento.id,
      erro: updErr.message,
    });
    return {
      ...rotulo,
      status: "erro",
      etapa: "gravar_retorno",
      asaasPaymentId: pagamento.id,
      erro: `Cobranca ${pagamento.id} criada no Asaas mas as faturas nao gravaram o id. NAO rode de novo antes de resolver a mao.`,
    };
  }

  return {
    ...rotulo,
    status: plano.acao === "rechamar" ? "rechamado" : "criado",
    valor: plano.valor,
    asaasPaymentId: pagamento.id,
    faturas: plano.linhas.length,
  };
}


/**
 * Roda o ciclo inteiro de um periodo. Nao lanca por grupo: cada um vira uma
 * linha em `resultados` com o proprio desfecho, pra que um assinante problematico
 * nao impeca os outros 25 de serem cobrados.
 *
 * @returns {Promise<{previa: object, resultados: object[], resumo: object}>}
 */
export async function executaGeracao(periodoReferencia) {
  const entrada = await leEntrada(periodoReferencia);
  const previa = montaPrevia(entrada, periodoReferencia);

  // Defesa em profundidade: a tela ja desabilita o botao com alerta que
  // bloqueia, mas o servidor nao pode depender disso.
  const bloqueios = previa.alertas.filter((a) => BLOQUEIAM.has(a.codigo));
  if (bloqueios.length) {
    const err = new Error("previa_bloqueada");
    err.bloqueios = bloqueios.map((a) => ({ codigo: a.codigo, mensagem: a.mensagem }));
    throw err;
  }

  const subconjunto = subconjuntoSandbox();
  const mapa = mapaDeClientes();
  const porId = new Map(entrada.subscriptions.map((s) => [s.id, s]));

  const grupos = subconjunto
    ? previa.grupos.filter((g) => g.assinaturas.some((a) => subconjunto.has(a.subscriptionId)))
    : previa.grupos;

  const { data: existentes, error: fatErr } = await supabaseAdmin
    .from("faturas")
    .select("subscription_id, valor_total, asaas_payment_id")
    .eq("periodo_referencia", periodoReferencia);
  if (fatErr) throw fatErr;
  const faturasPorSub = new Map((existentes ?? []).map((f) => [f.subscription_id, f]));

  // Em serie de proposito: sao dezenas de grupos, e paralelizar tornaria o log
  // ilegivel justo quando algo desse errado no meio.
  const resultados = [];
  for (const grupo of grupos) {
    const plano = planoDoGrupo(grupo, periodoReferencia, porId, faturasPorSub);
    const rotulo = { pagador: grupo.pagadorNome, pagadorId: grupo.pagadorId };

    if (plano.acao === "bloquear") {
      resultados.push({ ...rotulo, status: "bloqueado", motivo: plano.motivo });
      continue;
    }
    if (plano.acao === "pular") {
      resultados.push({ ...rotulo, status: "pulado", asaasPaymentId: plano.asaasPaymentId });
      continue;
    }

    const doBanco = porId.get(grupo.pagadorId)?.asaas_customer_id ?? null;
    const customerId = mapa.get(grupo.pagadorId) ?? doBanco;
    if (!customerId) {
      resultados.push({ ...rotulo, status: "bloqueado", motivo: "pagador sem cliente no Asaas" });
      continue;
    }

    resultados.push(await geraGrupo({ grupo, plano, periodoReferencia, customerId }));
  }

  const conta = (s) => resultados.filter((r) => r.status === s).length;
  return {
    previa,
    grupos,
    resultados,
    resumo: {
      criados: conta("criado"),
      rechamados: conta("rechamado"),
      pulados: conta("pulado"),
      bloqueados: conta("bloqueado"),
      erros: conta("erro"),
    },
  };
}
