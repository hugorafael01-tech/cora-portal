/**
 * Testa `isPastCutoff` em UTC contra os 5 casos da Seção 3.2 do briefing
 * Frente C item 1.
 *
 * Uso: `node scripts/test-cutoff.mjs` (ou `npm run test:cutoff`).
 * Exit 0 em sucesso, 1 em falha.
 */
import assert from "node:assert/strict";
import { isPastCutoff, isThursday } from "../src/utils/cutoff.js";

const CASES = [
  {
    name: "terça 11:59 BRT (14:59 UTC) — antes do cutoff",
    deliveryDate: "2026-05-14",
    now: "2026-05-12T14:59:00Z",
    expected: false,
  },
  {
    name: "terça 12:00 BRT (15:00 UTC) — cutoff exato",
    deliveryDate: "2026-05-14",
    now: "2026-05-12T15:00:00Z",
    expected: true,
  },
  {
    name: "terça 12:01 BRT (15:01 UTC) — logo após",
    deliveryDate: "2026-05-14",
    now: "2026-05-12T15:01:00Z",
    expected: true,
  },
  {
    name: "quarta 00:00 UTC — dia seguinte ao cutoff",
    deliveryDate: "2026-05-14",
    now: "2026-05-13T00:00:00Z",
    expected: true,
  },
  {
    name: "entrega da semana seguinte — cutoff ainda longe",
    deliveryDate: "2026-05-21",
    now: "2026-05-12T15:00:00Z",
    expected: false,
  },
];

let failed = 0;
for (const c of CASES) {
  const got = isPastCutoff(c.deliveryDate, new Date(c.now));
  try {
    assert.equal(got, c.expected);
    console.log(`✓ ${c.name}`);
  } catch {
    failed += 1;
    console.error(`✗ ${c.name}`);
    console.error(`    expected=${c.expected} got=${got}`);
    console.error(`    deliveryDate=${c.deliveryDate} now=${c.now}`);
  }
}

// Sanidade rápida em `isThursday`
try {
  assert.equal(isThursday("2026-05-14"), true);
  assert.equal(isThursday("2026-05-15"), false);
  console.log("✓ isThursday — sanidade");
} catch (e) {
  failed += 1;
  console.error("✗ isThursday — sanidade", e.message);
}

if (failed > 0) {
  console.error(`\n${failed} caso(s) falharam.`);
  process.exit(1);
}
console.log("\nTodos os casos passaram.");
