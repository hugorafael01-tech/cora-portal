/**
 * Testa o piso de lançamento (LAUNCH_FIRST_DELIVERY = 06/08/2026) aplicado em
 * `calcularPrimeiraEntrega`. Mesma técnica do cutoff.js: depois de calcular a
 * quinta, eleva ao piso se a data calculada for anterior.
 *
 * `calcularPrimeiraEntrega` opera em horário LOCAL (getDay/getHours), então os
 * `now` e os esperados são construídos com componentes locais (`new Date(ano,
 * mes, dia, ...)`) — determinístico em qualquer fuso, sem depender de UTC.
 *
 * Uso: `node scripts/test-first-delivery.mjs` (ou `npm run test:first-delivery`).
 * Exit 0 em sucesso, 1 em falha.
 */
import assert from "node:assert/strict";
import { calcularPrimeiraEntrega, formatarPrimeiraEntrega } from "../src/utils/firstDelivery.js";

// Meia-noite local de 06/08/2026 (o piso), pra comparar por getTime().
const PISO = new Date(2026, 7, 6);

const CASES = [
  {
    name: "seg 27/07 09h — dentro do corte, calcula 30/07, elevado ao piso 06/08",
    now: new Date(2026, 6, 27, 9, 0),
    expected: new Date(2026, 7, 6),
  },
  {
    name: "ter 28/07 09h — antes das 12h, calcula 30/07, elevado ao piso 06/08",
    now: new Date(2026, 6, 28, 9, 0),
    expected: new Date(2026, 7, 6),
  },
  {
    name: "ter 28/07 13h — pós-corte, matemática normal já cai em 06/08 (no-op)",
    now: new Date(2026, 6, 28, 13, 0),
    expected: new Date(2026, 7, 6),
  },
  {
    name: "ter 28/07 23h — pós-corte, matemática normal (no-op), 06/08",
    now: new Date(2026, 6, 28, 23, 0),
    expected: new Date(2026, 7, 6),
  },
  {
    name: "seg 10/08 09h — pós-lançamento, piso vira no-op, calcula 13/08",
    now: new Date(2026, 7, 10, 9, 0),
    expected: new Date(2026, 7, 13),
  },
];

let failed = 0;
for (const c of CASES) {
  const got = calcularPrimeiraEntrega(c.now);
  try {
    assert.equal(got.getTime(), c.expected.getTime());
    console.log(`✓ ${c.name}`);
  } catch {
    failed += 1;
    console.error(`✗ ${c.name}`);
    console.error(`    expected=${formatarPrimeiraEntrega(c.expected)} got=${formatarPrimeiraEntrega(got)}`);
  }
}

// Sanidade: o piso é uma quinta e formata como "Quinta, 6 de agosto".
try {
  assert.equal(PISO.getDay(), 4, "piso é quinta-feira");
  assert.equal(formatarPrimeiraEntrega(PISO), "Quinta, 6 de agosto");
  console.log("✓ piso formata como 'Quinta, 6 de agosto'");
} catch (e) {
  failed += 1;
  console.error("✗ sanidade do piso", e.message);
}

if (failed > 0) {
  console.error(`\n${failed} caso(s) falharam.`);
  process.exit(1);
}
console.log("\nTodos os casos passaram.");
