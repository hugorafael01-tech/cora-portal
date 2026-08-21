/**
 * Testa a resolucao de preco de extra contra o cardapio da semana
 * (api/_lib/extras-precos.js), cobrindo os casos do briefing de 21/08/2026.
 *
 * Exercita as funcoes PURAS — sem banco, sem rede. O I/O
 * (`fetchPrecosDaSemana`) e validado no Preview contra o banco real.
 *
 * Uso: `node scripts/test-extras-precos.mjs` (ou `npm run test:extras`).
 * Exit 0 em sucesso, 1 em falha.
 */
import assert from "node:assert/strict";
import { resolveExtrasPrecos, computeTotalExtras } from "../api/_lib/extras-precos.js";

// Cardapio da semana 35 (entrega 27/08/2026), como esta em `cardapios`.
const SEMANA_35 = new Map([
  ["original", 30],
  ["integral", 30],
  ["focaccia", 28],
  ["multigraos", 36],
  ["brioche", 36],
]);

const CASES = [
  {
    name: "preco adulterado pelo cliente -> gravado com o preco do cardapio",
    extras: [{ id: "brioche", nome: "Brioche", qty: 1, preco_unit: 0.01 }],
    precos: SEMANA_35,
    expected: {
      resolved: [{ id: "brioche", nome: "Brioche", qty: 1, preco_unit: 36 }],
      missing: [],
      total: 36,
    },
  },
  {
    name: "extra fora do cardapio da semana -> reportado em missing",
    extras: [
      { id: "focaccia", nome: "Focaccia Genovesa", qty: 1, preco_unit: 28 },
      { id: "ciabatta", nome: "Ciabatta", qty: 1, preco_unit: 25 },
    ],
    precos: SEMANA_35,
    expected: { resolvedIds: ["focaccia"], missing: ["ciabatta"] },
  },
  {
    name: "extra sem preco_unit no corpo -> preco vem do cardapio",
    extras: [{ id: "multigraos", nome: "Multigrãos", qty: 1 }],
    precos: SEMANA_35,
    expected: {
      resolved: [{ id: "multigraos", nome: "Multigrãos", qty: 1, preco_unit: 36 }],
      missing: [],
      total: 36,
    },
  },
  {
    name: "multiplos extras com quantidades -> total soma os precos do banco",
    extras: [
      { id: "focaccia", nome: "Focaccia Genovesa", qty: 2, preco_unit: 1 },
      { id: "multigraos", nome: "Multigrãos", qty: 1, preco_unit: 1 },
      { id: "brioche", nome: "Brioche", qty: 3, preco_unit: 1 },
    ],
    precos: SEMANA_35,
    // 2*28 + 1*36 + 3*36 = 56 + 36 + 108 = 200
    expected: { missing: [], total: 200 },
  },
  {
    name: "pao base (original) tambem e vendido avulso -> resolve normal",
    extras: [{ id: "original", nome: "Pão Original", qty: 1, preco_unit: 5 }],
    precos: SEMANA_35,
    expected: {
      resolved: [{ id: "original", nome: "Pão Original", qty: 1, preco_unit: 30 }],
      missing: [],
      total: 30,
    },
  },
  {
    name: "semana sem cardapio (precoMap null) -> nenhum extra resolve",
    extras: [{ id: "brioche", nome: "Brioche", qty: 1, preco_unit: 36 }],
    precos: null,
    expected: { resolvedIds: [], missing: ["brioche"] },
  },
  {
    name: "pedido sem extras -> resolved vazio, total 0",
    extras: [],
    precos: SEMANA_35,
    expected: { resolved: [], missing: [], total: 0 },
  },
  {
    name: "chave estranha no extra nao entra no jsonb gravado",
    extras: [{ id: "brioche", nome: "Brioche", qty: 1, preco_unit: 36, admin: true }],
    precos: SEMANA_35,
    expected: {
      resolved: [{ id: "brioche", nome: "Brioche", qty: 1, preco_unit: 36 }],
      missing: [],
      total: 36,
    },
  },
];

let failures = 0;
for (const c of CASES) {
  try {
    const { resolved, missing } = resolveExtrasPrecos(c.extras, c.precos);
    if (c.expected.resolved) assert.deepEqual(resolved, c.expected.resolved);
    if (c.expected.resolvedIds) assert.deepEqual(resolved.map((e) => e.id), c.expected.resolvedIds);
    assert.deepEqual(missing, c.expected.missing);
    if (c.expected.total !== undefined) {
      assert.equal(computeTotalExtras(resolved), c.expected.total);
    }
    console.log(`  ok   ${c.name}`);
  } catch (err) {
    failures++;
    console.error(`  FALHOU  ${c.name}\n    ${err.message}`);
  }
}

// Arredondamento: soma float crua vira dinheiro na fatura.
try {
  assert.equal(computeTotalExtras([
    { id: "a", nome: "a", qty: 3, preco_unit: 0.1 },
    { id: "b", nome: "b", qty: 1, preco_unit: 0.2 },
  ]), 0.5);
  console.log("  ok   total arredondado a 2 casas (sem dust de float)");
} catch (err) {
  failures++;
  console.error(`  FALHOU  arredondamento\n    ${err.message}`);
}

console.log(failures === 0 ? "\nTodos os casos passaram." : `\n${failures} caso(s) falharam.`);
process.exit(failures === 0 ? 0 : 1);
