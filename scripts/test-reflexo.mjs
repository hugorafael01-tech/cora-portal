/**
 * Testa a resolucao da assinatura e o reflexo de status (api/_lib/asaas-reflexo.js).
 *
 * Sem banco e sem rede: o client e um mock que registra o que foi pedido e
 * devolve o que o teste mandar. E o unico jeito de exercitar isto — o webhook
 * de PRODUCAO nao pode ser disparado por evento de sandbox (`ehEventoSandbox`
 * descarta antes de persistir), entao ponta a ponta pelo sandbox nao existe.
 *
 * O que estas verificacoes protegem: o alargamento do reflexo pro grupo de
 * pagador toca o que ja funciona para 39 pessoas. As duas propriedades que
 * fazem isso ser seguro — ESTRITAMENTE ADITIVO e UMA DIRECAO SO — sao afirmadas
 * aqui, e nao so descritas no comentario.
 *
 * Uso: `node scripts/test-reflexo.mjs` (ou `npm run test:reflexo`).
 * Exit 0 em sucesso, 1 em falha.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { refleteStatus, resolveSubscription } from "../api/_lib/asaas-reflexo.js";

const ALDINA = "8a0ecce8-a326-471d-a5b6-ce28f8b73eb4";
const FERNANDA = "11291bf3-f9ee-4711-a4e9-52f6a975d84f";
const ABDALA = "f63ddd0f-df35-41ef-b7ab-b0cb840773bb";

/**
 * Mock do client. Registra cada chamada em `db.chamadas` e devolve o que
 * estiver em `respostas` — por tabela e operacao. Cobre so o encadeamento que
 * o modulo usa; qualquer metodo novo quebra aqui de proposito, pra que uma
 * mudanca de query nao passe sem teste.
 */
function fakeDb({ selectPorFiltro = {}, updateResultado = [], erro = null } = {}) {
  const chamadas = [];
  const api = {
    chamadas,
    from(tabela) {
      const ctx = { tabela, filtros: [] };
      const chain = {
        select(cols) {
          ctx.select = cols;
          return chain;
        },
        update(patch) {
          ctx.op = "update";
          ctx.patch = patch;
          return chain;
        },
        eq(col, val) {
          ctx.filtros.push(`${col}.eq.${val}`);
          return chain;
        },
        or(filtro) {
          ctx.filtros.push(`or(${filtro})`);
          return chain;
        },
        maybeSingle() {
          chamadas.push({ ...ctx, op: ctx.op ?? "select" });
          if (erro) return Promise.resolve({ data: null, error: erro });
          const chave = ctx.filtros[0];
          return Promise.resolve({ data: selectPorFiltro[chave] ?? null, error: null });
        },
        then(resolve) {
          // update(...).select(...) e aguardado direto, sem maybeSingle.
          chamadas.push({ ...ctx });
          if (erro) return resolve({ data: null, error: erro });
          return resolve({ data: updateResultado, error: null });
        },
      };
      return chain;
    },
  };
  return api;
}

let falhas = 0;
async function checa(nome, fn) {
  try {
    await fn();
    console.log(`  ok  ${nome}`);
  } catch (err) {
    falhas++;
    console.error(`  FALHOU  ${nome}`);
    console.error(`     ${String(err.message).split("\n").slice(0, 8).join("\n     ")}`);
  }
}

console.log("reflexo de status — resolucao e alargamento pro grupo");

// ── resolveSubscription ────────────────────────────────────────────────────

await checa("casa por externalReference quando e uuid", async () => {
  const db = fakeDb({ selectPorFiltro: { [`id.eq.${ALDINA}`]: { id: ALDINA } } });
  assert.equal(
    await resolveSubscription(db, { externalReference: ALDINA, asaasCustomerId: "cus_x" }),
    ALDINA,
  );
  // Casou no caminho principal: NAO pode ter ido ao fallback.
  assert.equal(db.chamadas.length, 1);
});

await checa("valor nao-uuid nao vai ao banco por id, cai no fallback", async () => {
  // Caso real da fase 1: externalReference digitado a mao no painel. Sem a
  // guarda, o PostgREST devolveria 400 e isso viraria FALHA de reflexo.
  const db = fakeDb({ selectPorFiltro: { "asaas_customer_id.eq.cus_x": { id: ABDALA } } });
  assert.equal(
    await resolveSubscription(db, { externalReference: "outubro-2026", asaasCustomerId: "cus_x" }),
    ABDALA,
  );
  assert.equal(db.chamadas.length, 1);
  assert.ok(db.chamadas[0].filtros[0].startsWith("asaas_customer_id."));
});

await checa("nao casar devolve null e nao e erro", async () => {
  const db = fakeDb();
  assert.equal(await resolveSubscription(db, { externalReference: null, asaasCustomerId: null }), null);
});

await checa("erro de query e lancado, nao engolido", async () => {
  const db = fakeDb({ erro: new Error("boom") });
  await assert.rejects(() => resolveSubscription(db, { externalReference: ALDINA }), /boom/);
});

// ── refleteStatus: o alargamento ───────────────────────────────────────────

await checa("pagamento do pagador alcanca o grupo inteiro", async () => {
  const db = fakeDb({ updateResultado: [{ id: ALDINA }, { id: FERNANDA }] });
  const { patch, atualizadas } = await refleteStatus(db, {
    subscriptionId: ALDINA,
    eventType: "PAYMENT_RECEIVED",
    paymentAtIso: "2026-10-08T12:00:00Z",
  });
  assert.equal(patch.payment_status, "em_dia");
  assert.deepEqual(atualizadas, [ALDINA, FERNANDA]);
});

await checa("UMA DIRECAO SO: o filtro nunca sobe do dependente pro pagador", async () => {
  // A propriedade que impede um pagamento avulso na linha de um dependente de
  // marcar o pagador como em dia — ele nao pagou nada.
  const db = fakeDb({ updateResultado: [{ id: FERNANDA }] });
  await refleteStatus(db, {
    subscriptionId: FERNANDA,
    eventType: "PAYMENT_RECEIVED",
    paymentAtIso: "2026-10-08T12:00:00Z",
  });
  const filtro = db.chamadas[0].filtros[0];
  assert.equal(filtro, `or(id.eq.${FERNANDA},pagador_subscription_id.eq.${FERNANDA})`);

  // A propriedade, afirmada de forma que nao possa passar por acidente: TODA
  // clausula do filtro aponta pra quem casou. Se alguem um dia acrescentar uma
  // clausula que mira o pagador DA Fernanda (a direcao proibida), o valor dela
  // seria outro uuid e isto quebra.
  const clausulas = filtro.replace(/^or\(/, "").replace(/\)$/, "").split(",");
  assert.deepEqual(clausulas, [
    `id.eq.${FERNANDA}`,
    `pagador_subscription_id.eq.${FERNANDA}`,
  ]);
  for (const c of clausulas) {
    assert.equal(c.split(".eq.")[1], FERNANDA, `clausula mira outra linha: ${c}`);
  }

  // E o modulo nao pode nem ter CONSULTADO quem paga pela Fernanda: uma unica
  // chamada, que e o proprio update.
  assert.equal(db.chamadas.length, 1);
});

await checa("ESTRITAMENTE ADITIVO: quem nao tem dependente casa so a si mesmo", async () => {
  // As outras 38 assinaturas: o `or` casa exatamente o que o `.eq("id")` casava.
  const db = fakeDb({ updateResultado: [{ id: ABDALA }] });
  const { atualizadas } = await refleteStatus(db, {
    subscriptionId: ABDALA,
    eventType: "PAYMENT_CONFIRMED",
    paymentAtIso: "2026-10-08T12:00:00Z",
  });
  assert.deepEqual(atualizadas, [ABDALA]);
  assert.equal(db.chamadas[0].filtros[0], `or(id.eq.${ABDALA},pagador_subscription_id.eq.${ABDALA})`);
});

await checa("OVERDUE tambem alcanca o grupo", async () => {
  // Uma cobranca vencida vence pro grupo todo: e uma so.
  const db = fakeDb({ updateResultado: [{ id: ALDINA }, { id: FERNANDA }] });
  const { patch, atualizadas } = await refleteStatus(db, {
    subscriptionId: ALDINA,
    eventType: "PAYMENT_OVERDUE",
    paymentAtIso: "2026-10-09T12:00:00Z",
  });
  assert.equal(patch.payment_status, "vencido");
  assert.equal(patch.last_payment_at, undefined); // vencido nao carimba pagamento
  assert.deepEqual(atualizadas, [ALDINA, FERNANDA]);
});

await checa("tipo nao-tratado nao toca em nada", async () => {
  const db = fakeDb({ updateResultado: [] });
  const { patch, atualizadas } = await refleteStatus(db, {
    subscriptionId: ALDINA,
    eventType: "PAYMENT_CREATED",
    paymentAtIso: "2026-10-08T12:00:00Z",
  });
  assert.equal(patch, null);
  assert.deepEqual(atualizadas, []);
  assert.equal(db.chamadas.length, 0, "nao pode nem chegar a montar o update");
});

await checa("subscriptionId nao-uuid nao entra no filtro montado por string", async () => {
  const db = fakeDb();
  await assert.rejects(
    () => refleteStatus(db, { subscriptionId: "id.eq.x,or(1)", eventType: "PAYMENT_RECEIVED" }),
    /nao e uuid/,
  );
  assert.equal(db.chamadas.length, 0);
});

// ── o caminho da reconciliacao (/api/asaas/vincular) ───────────────────────

await checa("reconciliacao carimba o received_at do evento, e alcanca o grupo", async () => {
  // O vincular reconcilia pagamentos PASSADOS, entao passa o received_at do
  // evento e nao o agora — a data real do pagamento, nao a do clique. E a
  // unica diferenca entre este caminho e o do webhook; o alcance ao grupo tem
  // que ser o mesmo nos dois.
  const RECEBIDO_EM = "2026-10-08T13:45:00Z";
  const db = fakeDb({ updateResultado: [{ id: ALDINA }, { id: FERNANDA }] });
  const { patch, atualizadas } = await refleteStatus(db, {
    subscriptionId: ALDINA,
    eventType: "PAYMENT_RECEIVED",
    paymentAtIso: RECEBIDO_EM,
  });
  assert.equal(patch.last_payment_at, RECEBIDO_EM);
  assert.deepEqual(atualizadas, [ALDINA, FERNANDA]);
  assert.equal(
    db.chamadas[0].filtros[0],
    `or(id.eq.${ALDINA},pagador_subscription_id.eq.${ALDINA})`,
  );
});

await checa("nenhum caminho reflete status por conta propria", async () => {
  // Guarda contra o bug que originou esta correcao: o alargamento pegou o
  // webhook e o /api/asaas/vincular ficou com o proprio .eq("id"), entao havia
  // dois caminhos refletindo status e so um alcancando o grupo.
  //
  // Se um terceiro caminho aparecer, ou se alguem inlinear o update de novo,
  // isto quebra — que e mais barato do que descobrir pelo assinante dizendo
  // "paguei e o sistema nao viu".
  const caminhos = [
    "../api/webhooks/asaas/index.js",
    "../api/asaas/vincular/index.js",
  ];
  for (const caminho of caminhos) {
    const src = readFileSync(new URL(caminho, import.meta.url), "utf8");
    assert.ok(
      !src.includes("statusPatchForEvent"),
      `${caminho} monta o patch de status sozinho; use refleteStatus`,
    );
    assert.ok(
      src.includes("refleteStatus"),
      `${caminho} deveria refletir status pela funcao compartilhada`,
    );
  }
});

await checa("erro no update e lancado (processed_at fica null pra reprocessar)", async () => {
  const db = fakeDb({ erro: new Error("update falhou") });
  await assert.rejects(
    () => refleteStatus(db, { subscriptionId: ALDINA, eventType: "PAYMENT_RECEIVED" }),
    /update falhou/,
  );
});

if (falhas > 0) {
  console.error(`\n${falhas} verificacao(oes) falharam.`);
  process.exit(1);
}
console.log("\ntudo certo.");
