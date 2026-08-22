/**
 * Testa a montagem do cardapio da semana a partir das linhas de
 * `cardapio_publico` (src/lib/cardapio-semana.js).
 *
 * Exercita a funcao PURA — sem banco, sem rede, sem React. O I/O (o hook) e
 * validado no Preview contra o banco real.
 *
 * Uso: `node scripts/test-cardapio-semana.mjs` (ou `npm run test:cardapio`).
 * Exit 0 em sucesso, 1 em falha.
 */
import assert from "node:assert/strict";
import { montaCardapio, CARDAPIO_FALLBACK } from "../src/lib/cardapio-semana.js";

// `preco_avulso` chega como string do supabase-js (numeric do Postgres), e as
// linhas vem na ordem que o PostgREST devolver — nao da pra depender dela.
const SEMANA_35 = [
  { slug: "original", preco_avulso: "30.00", destaque: false },
  { slug: "integral", preco_avulso: "30.00", destaque: false },
  { slug: "brioche", preco_avulso: "36", destaque: true },
  { slug: "focaccia", preco_avulso: "28", destaque: false },
  { slug: "multigraos", preco_avulso: "36", destaque: false },
];

// Semana 36 (entrega 03/09) como esta no banco hoje: dois fixos, sem destaque.
// E o caso que a task veio destravar — o menu.js anunciava ciabatta, que nao
// esta em `cardapios`, e o "Adicionar a cesta" devolvia 400.
const SEMANA_36 = [
  { slug: "original", preco_avulso: "30.00", destaque: false },
  { slug: "integral", preco_avulso: "30.00", destaque: false },
];

let falhas = 0;
function teste(nome, fn) {
  try {
    fn();
    console.log(`  ok   ${nome}`);
  } catch (err) {
    falhas++;
    console.error(`  FALHA ${nome}\n        ${err.message}`);
  }
}

console.log("montaCardapio — semana completa");

teste("devolve todos os itens da semana", () => {
  const { itens } = montaCardapio(SEMANA_35, null);
  assert.deepEqual([...itens].sort(), ["brioche", "focaccia", "integral", "multigraos", "original"]);
});

teste("o destaque vira `especial`", () => {
  assert.equal(montaCardapio(SEMANA_35, null).especial, "brioche");
});

teste("precos viram Map de numero, nao string", () => {
  const { precos } = montaCardapio(SEMANA_35, null);
  assert.equal(precos.get("brioche"), 36);
  assert.equal(precos.get("original"), 30);
  assert.equal(typeof precos.get("original"), "number");
});

teste("o especial tambem fica na lista de itens (Hero + card)", () => {
  // O card menor e o unico que expande com a descricao completa, entao o
  // especial aparece nos dois lugares de proposito.
  assert.ok(montaCardapio(SEMANA_35, null).itens.includes("brioche"));
});

console.log("montaCardapio — semana sem destaque");

teste("semana sem destaque devolve especial null, sem cair no fallback", () => {
  const menu = montaCardapio(SEMANA_36, null);
  assert.equal(menu.especial, null);
  assert.deepEqual(menu.itens, ["original", "integral"]);
  assert.equal(menu.precos.get("integral"), 30);
});

console.log("montaCardapio — degradacao");

teste("erro de rede cai no fallback", () => {
  assert.equal(montaCardapio(null, new Error("network")), CARDAPIO_FALLBACK);
});

teste("erro JUNTO com dados ainda cai no fallback", () => {
  // Nao confiar em payload parcial quando o supabase sinalizou erro.
  assert.equal(montaCardapio(SEMANA_35, { message: "boom" }), CARDAPIO_FALLBACK);
});

teste("semana sem cardapio cadastrado cai no fallback", () => {
  assert.equal(montaCardapio([], null), CARDAPIO_FALLBACK);
});

teste("resposta nao-array cai no fallback", () => {
  assert.equal(montaCardapio(undefined, null), CARDAPIO_FALLBACK);
  assert.equal(montaCardapio({ slug: "original" }, null), CARDAPIO_FALLBACK);
});

teste("fallback e os 2 fixos sem especial e sem precos", () => {
  assert.deepEqual([...CARDAPIO_FALLBACK.itens], ["original", "integral"]);
  assert.equal(CARDAPIO_FALLBACK.especial, null);
  assert.equal(CARDAPIO_FALLBACK.precos.size, 0);
});

console.log("montaCardapio — linha inutilizavel");

teste("item sem preco numerico NAO entra na vitrine", () => {
  // Anunciar sem saber o preco e exatamente o botao quebrado que a task veio
  // matar: o servidor cobra pelo preco do banco.
  const menu = montaCardapio(
    [...SEMANA_36, { slug: "ciabatta", preco_avulso: null, destaque: false }],
    null
  );
  assert.ok(!menu.itens.includes("ciabatta"));
  assert.equal(menu.precos.has("ciabatta"), false);
});

teste("destaque com preco invalido nao vira especial", () => {
  const menu = montaCardapio(
    [...SEMANA_36, { slug: "ciabatta", preco_avulso: "nao-e-numero", destaque: true }],
    null
  );
  assert.equal(menu.especial, null);
  assert.ok(!menu.itens.includes("ciabatta"));
});

teste("linha sem slug e ignorada sem derrubar o resto", () => {
  const menu = montaCardapio([...SEMANA_36, { slug: null, preco_avulso: "10", destaque: false }], null);
  assert.deepEqual(menu.itens, ["original", "integral"]);
});

teste("todas as linhas invalidas cai no fallback", () => {
  const menu = montaCardapio([{ slug: null, preco_avulso: null, destaque: false }], null);
  assert.equal(menu, CARDAPIO_FALLBACK);
});

teste("preco zero e valido (item de cortesia), nao e tratado como ausente", () => {
  const menu = montaCardapio([{ slug: "original", preco_avulso: "0", destaque: false }], null);
  assert.equal(menu.precos.get("original"), 0);
  assert.ok(menu.itens.includes("original"));
});

console.log(falhas === 0 ? "\ntudo passou" : `\n${falhas} falha(s)`);
process.exit(falhas === 0 ? 0 : 1);
