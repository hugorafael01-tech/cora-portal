/**
 * Ciclo de geracao contra o SANDBOX do Asaas, com dados REAIS de producao.
 *
 * ============================================================================
 * ESTE SCRIPT ESCREVE NO BANCO DE PRODUCAO. LEIA ANTES DE RODAR.
 * ============================================================================
 * Autorizado por escrito pelo Hugo em 05/09/2026, com condicoes, e todas elas
 * estao implementadas aqui:
 *
 *   0. RECUSA RODAR se a migration 0046 nao estiver aplicada. Sem ela o
 *      `asaas_payment_id` ainda e UNIQUE, e as duas faturas do grupo da Aldina
 *      dividem o mesmo id — a segunda violaria a constraint DEPOIS de a
 *      cobranca ja existir no Asaas, que e o pior estado possivel. Esta guarda
 *      nao estava na lista do Hugo: entrou porque a checagem em 05/09 mostrou
 *      que o UNIQUE ainda estava de pe.
 *   1. RECUSA RODAR se `faturas` nao estiver vazia. Nao limpa o que nao criou;
 *      linha que ja estava la e de outra pessoa ou de outra tentativa, e apagar
 *      as duas coisas juntas seria pior que nao rodar.
 *   2. LIMPEZA EM try/finally. Falhando a geracao no meio, as faturas criadas
 *      ate ali sao apagadas do mesmo jeito.
 *   3. VERIFICA que voltou a zero. E se a limpeza falhar, FALHA ALTO: mensagem
 *      inequivoca, os ids que sobraram, e exit != 0.
 *   4. RECUSA RODAR se algum cliente do mapa de sandbox estiver sem cpfCnpj.
 *      Tambem nao estava na lista: entrou depois da primeira execucao real, em
 *      05/09, que falhou com 400 do Asaas DEPOIS de inserir as faturas.
 *
 * As guardas nao rodam na ordem do numero: a 1 vem antes da 0 porque a sonda da
 * 0 escreve, e so da pra escrever sabendo que a tabela estava vazia.
 *
 * Roda contra o periodo REAL 2026-10 de proposito: periodo inventado deixaria a
 * janela de extras vazia e o teste perderia justamente o que interessa — os
 * R$ 25 da Aldina e da Fernanda e os R$ 53 do Abdala.
 *
 * O que NAO e apagado: as cobrancas criadas no sandbox do Asaas. Elas ficam la,
 * e tudo bem — sandbox e descartavel. O que nao pode sobrar e linha em
 * `faturas`, que e producao.
 *
 * Uso: `node --env-file=.env.local scripts/gera-sandbox.mjs`
 *      (ou `npm run gera:sandbox`)
 */
import assert from "node:assert/strict";
import { supabaseAdmin } from "../src/lib/supabase-admin.js";
import { executaGeracao, mapaDeClientes } from "../api/_lib/geracao-runner.js";
import { baseAtual, buscaCliente } from "../api/_lib/asaas.js";

const PERIODO = "2026-10";
// Periodo de fantasia da sonda da guarda 0. Fica ao lado do PERIODO real de
// proposito: quem limpa, limpa os dois, e nao ha um segundo lugar pra esquecer.
const SONDA_PERIODO = "2099-01";

// O que o Hugo vai conferir, do briefing e do banco.
const ESPERADO = { Aldina: 278, "Abdala Farah": 167 };

function real(n) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * A 0046 ja soltou o UNIQUE de asaas_payment_id?
 *
 * Sem service_role nao da pra ler pg_constraint pelo PostgREST, entao a
 * checagem e por comportamento: tenta gravar o mesmo id em duas linhas dentro
 * de um insert que e desfeito em seguida. E feio, e e o unico jeito honesto de
 * saber daqui.
 */
async function uniqueDePagamentoJaCaiu() {
  const { data: subs, error: subErr } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("status", "active")
    .limit(2);
  if (subErr) throw subErr;
  if ((subs ?? []).length < 2) throw new Error("preciso de 2 assinaturas ativas pra checar a 0046");

  const sonda = subs.map((s) => ({
    subscription_id: s.id,
    periodo_referencia: SONDA_PERIODO,
    qty_paes: 1,
    valor_paes: 1,
    valor_frete: 0,
    valor_total: 1,
    status: "pendente",
    asaas_payment_id: "pay_sonda_0046",
  }));

  // PostgREST NAO TEM TRANSACAO. O "desfaz" da sonda e um delete comum, entao
  // ele tem que rodar em `finally` — no caminho feliz a sonda entrou e precisa
  // sair; no 23505 nao entrou nada (insert multi-linha e uma statement so, o
  // Postgres rejeita inteira); e se o insert ESTOURAR (rede, timeout), nao da
  // pra saber qual dos dois foi, e o delete tem que rodar do mesmo jeito.
  // Fora isso, `tocouATabela` ja esta ligado antes da chamada: se o processo
  // morrer aqui dentro, a rede de baixo ainda apaga os dois periodos.
  let error;
  try {
    ({ error } = await supabaseAdmin.from("faturas").insert(sonda));
  } finally {
    const { error: errLimpeza } = await supabaseAdmin
      .from("faturas")
      .delete()
      .eq("periodo_referencia", SONDA_PERIODO);
    // Limpeza que falha calada e pior que sonda nenhuma: deixaria duas linhas
    // de mentira em producao e o script seguiria dizendo que esta tudo bem.
    if (errLimpeza) {
      throw new Error(
        `a sonda da guarda 0 entrou e nao saiu (periodo ${SONDA_PERIODO}): ${errLimpeza.message}. ` +
          "Apague a mao antes de rodar de novo.",
      );
    }
  }
  if (!error) return true;
  if (String(error.code) === "23505") return false;
  throw error;
}

async function contaFaturas() {
  const { count, error } = await supabaseAdmin
    .from("faturas")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

async function limpaPeriodo() {
  const { data, error } = await supabaseAdmin
    .from("faturas")
    .delete()
    .in("periodo_referencia", [PERIODO, SONDA_PERIODO])
    .select("id");
  if (error) throw error;
  return (data ?? []).length;
}

// Ligado ANTES da primeira escrita — que e a sonda da guarda 0, nao a geracao.
// Se ficasse ligado so antes de gerar, a sonda cairia fora da rede.
let tocouATabela = false;

async function main() {
  console.log("ciclo de geracao em sandbox");
  console.log(`  base da API: ${baseAtual()}`);
  console.log(`  periodo:     ${PERIODO}`);

  // ─── Guarda 1: so roda com faturas vazia ───
  const antes = await contaFaturas();
  console.log(`  faturas antes: ${antes} linha(s)`);
  if (antes !== 0) {
    console.error(
      `\nRECUSANDO RODAR: faturas tem ${antes} linha(s).\n` +
        "Este script so roda com a tabela vazia, porque a limpeza dele apaga por\n" +
        "periodo e nao teria como distinguir o que ele criou do que ja estava la.\n" +
        "Confira o que ha em faturas antes de tentar de novo.",
    );
    process.exit(2);
  }

  // ─── Guarda 0: a 0046 precisa estar aplicada ───
  // Roda DEPOIS da guarda 1 embora tenha numero menor: a sonda escreve, e so da
  // pra escrever com seguranca depois de saber que a tabela estava vazia.
  tocouATabela = true;
  if (!(await uniqueDePagamentoJaCaiu())) {
    console.error(
      "\nRECUSANDO RODAR: a migration 0046 nao foi aplicada.\n" +
        "O asaas_payment_id ainda e UNIQUE, e as duas faturas do grupo da Aldina\n" +
        "dividem o mesmo id. A segunda violaria a constraint DEPOIS de a cobranca\n" +
        "ja existir no Asaas — cobranca criada e nao registrada, resolucao a mao.\n" +
        "Aplique 0046 e 0047 pelo SQL Editor e rode de novo.",
    );
    process.exit(2);
  }

  if (!baseAtual().includes("sandbox")) {
    console.error(`\nRECUSANDO RODAR: a base ${baseAtual()} nao e sandbox.`);
    process.exit(2);
  }

  // ─── Guarda 4: os clientes de sandbox precisam de cpfCnpj ───
  // Descoberta na primeira execucao, em 05/09/2026: o Asaas devolve
  // "necessario preencher o CPF ou CNPJ do cliente" no POST /payments, e a essa
  // altura as faturas JA foram inseridas — o ciclo falha depois de escrever, e
  // so nao deixa lixo porque a limpeza do finally existe. Conferir antes custa
  // duas chamadas GET e transforma um 400 confuso em uma frase.
  //
  // Producao nao tem esse risco: os boletos de hoje sao emitidos, e o Asaas nao
  // emite boleto sem CPF no cliente. O buraco e dos clientes de sandbox, que
  // foram criados so com nome e e-mail.
  const semDocumento = [];
  for (const [subId, customerId] of mapaDeClientes()) {
    const cliente = await buscaCliente(customerId);
    if (!cliente?.cpfCnpj) semDocumento.push(`${customerId} (${cliente?.name ?? subId})`);
  }
  if (semDocumento.length > 0) {
    console.error(
      "\nRECUSANDO RODAR: cliente de sandbox sem cpfCnpj.\n" +
        "O Asaas exige CPF/CNPJ no CLIENTE para emitir boleto/Pix, e recusaria o\n" +
        "POST /payments DEPOIS de as faturas ja terem sido inseridas.\n" +
        "Preencha o cpfCnpj destes clientes no painel do sandbox:\n  " +
        semDocumento.join("\n  "),
    );
    process.exit(2);
  }

  console.log("\ngerando...\n");
  const { previa, grupos, resultados, resumo } = await executaGeracao(PERIODO);

  console.log(`  grupos considerados: ${grupos.length} (de ${previa.grupos.length} na previa)`);
  for (const r of resultados) {
    const valor = r.valor != null ? ` ${real(r.valor)}` : "";
    const pag = r.asaasPaymentId ? ` ${r.asaasPaymentId}` : "";
    const motivo = r.motivo || r.erro ? `  <- ${r.motivo ?? r.erro}` : "";
    console.log(`  ${r.status.padEnd(11)} ${r.pagador.padEnd(16)}${valor}${pag}${motivo}`);
  }
  console.log(`\n  resumo: ${JSON.stringify(resumo)}`);

  // ─── Conferencia dos valores ───
  console.log("\nconferindo os valores esperados:");
  for (const [nome, esperado] of Object.entries(ESPERADO)) {
    const r = resultados.find((x) => x.pagador === nome);
    assert.ok(r, `${nome} nao apareceu nos resultados`);
    assert.equal(r.status, "criado", `${nome} deu "${r.status}": ${r.motivo ?? r.erro ?? ""}`);
    assert.equal(r.valor, esperado, `${nome} saiu ${real(r.valor)}, esperado ${real(esperado)}`);
    console.log(`  ok  ${nome}: ${real(r.valor)}  ${r.asaasPaymentId}`);
  }
  assert.equal(resumo.erros, 0, "houve erro na geracao");
  assert.equal(resumo.bloqueados, 0, "houve grupo bloqueado");

  // ─── As faturas gravaram o retorno? ───
  const { data: fats, error } = await supabaseAdmin
    .from("faturas")
    .select("subscription_id, valor_total, asaas_payment_id, asaas_invoice_url, linha_digitavel, pix_payload")
    .eq("periodo_referencia", PERIODO);
  if (error) throw error;

  console.log(`\n${fats.length} fatura(s) gravadas:`);
  const porPagamento = new Map();
  for (const f of fats) {
    porPagamento.set(f.asaas_payment_id, (porPagamento.get(f.asaas_payment_id) ?? 0) + 1);
    console.log(
      `  ${real(Number(f.valor_total)).padEnd(12)} ${f.asaas_payment_id}` +
        `  linha:${f.linha_digitavel ? "sim" : "nao"}  pix:${f.pix_payload ? "sim" : "nao"}`,
    );
  }
  assert.equal(fats.length, 3, "esperado 3 faturas: Aldina, Fernanda e Abdala");
  const doGrupo = [...porPagamento.values()].filter((n) => n === 2);
  assert.equal(doGrupo.length, 1, "o par Aldina/Fernanda tem que dividir UM asaas_payment_id");
  console.log("\n  ok  as duas faturas do grupo dividem o mesmo pagamento");
}

let codigo = 0;
try {
  await main();
  console.log("\nCICLO OK.");
} catch (err) {
  codigo = 1;
  console.error("\nCICLO FALHOU:", err.message);
} finally {
  // ─── Guarda 2 e 3: limpeza sempre, e verificacao de que voltou a zero ───
  if (tocouATabela) {
    console.log("\nlimpando as faturas do periodo (e a sonda da guarda 0)...");
    try {
      const apagadas = await limpaPeriodo();
      const sobrou = await contaFaturas();
      console.log(`  ${apagadas} apagada(s); faturas agora tem ${sobrou} linha(s)`);
      if (sobrou !== 0) {
        const { data } = await supabaseAdmin.from("faturas").select("id, periodo_referencia");
        console.error(
          "\n" + "!".repeat(70) +
            `\nLIMPEZA INCOMPLETA: sobraram ${sobrou} linha(s) em faturas, em PRODUCAO.` +
            "\nApague a mao antes de qualquer outra coisa. Linhas:\n  " +
            (data ?? []).map((r) => `${r.id} (${r.periodo_referencia})`).join("\n  ") +
            "\n" + "!".repeat(70),
        );
        codigo = 3;
      }
    } catch (err) {
      console.error(
        "\n" + "!".repeat(70) +
          "\nA LIMPEZA FALHOU: pode haver linha em faturas, em PRODUCAO." +
          `\nErro: ${err.message}` +
          "\nConfira `select * from faturas` e apague a mao.\n" + "!".repeat(70),
      );
      codigo = 3;
    }
  }
}
process.exit(codigo);
