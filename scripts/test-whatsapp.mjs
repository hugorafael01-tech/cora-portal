/**
 * Testa a máscara e a validação de WhatsApp contra o briefing de 31/07/2026
 * (número truncado pra quem digita com código do país).
 *
 * Uso: `node scripts/test-whatsapp.mjs` (ou `npm run test:whatsapp`).
 * Exit 0 em sucesso, 1 em falha.
 *
 * O caso que motivou tudo é o último bloco: digitação dígito a dígito de um
 * número com +55. Antes, o corte em 11 dígitos caía no meio e os dois últimos
 * nunca entravam no campo — sem erro em ponto nenhum do fluxo.
 */
import assert from "node:assert/strict";
import {
  formatWhatsApp,
  isValidWhatsApp,
  normalizeWhatsAppDigits,
} from "../src/utils/validators.js";

const digitsOf = (s) => s.replace(/\D/g, "");

// ─── Máscara ──────────────────────────────────────────────────────────────
// Nota: a máscara de saída é `(XX) XXXXX-XXXX` pra qualquer tamanho — ela não
// tem branch de 10 dígitos (isso é do fmtWhatsApp do e-mail, outra função).
// Por isso 10 dígitos saem como `(21) 99513-548`, igual a antes deste PR.
const FORMAT_CASES = [
  { in: "21995135488", out: "(21) 99513-5488", nome: "11 dígitos, sem país" },
  { in: "5521995135488", out: "(21) 99513-5488", nome: "13 dígitos com 55 — país sai" },
  { in: "+55 21 99513-5488", out: "(21) 99513-5488", nome: "com +, espaços e traço" },
  { in: "552199513548", out: "(21) 99513-548", nome: "12 dígitos com 55 (fixo) — país sai" },
  { in: "2199513548", out: "(21) 99513-548", nome: "10 dígitos, sem país" },
  { in: "5521995135", out: "(55) 21995-135", nome: "10 dígitos, DDD 55 — país NÃO sai" },
  { in: "55219951354", out: "(55) 21995-1354", nome: "11 dígitos, DDD 55 — país NÃO sai" },
  { in: "", out: "", nome: "vazio" },
  { in: null, out: "", nome: "null" },
  { in: undefined, out: "", nome: "undefined" },
  { in: "2", out: "2", nome: "1 dígito" },
  { in: "21", out: "21", nome: "2 dígitos" },
  { in: "219", out: "(21) 9", nome: "3 dígitos" },
];

let failed = 0;
for (const c of FORMAT_CASES) {
  try {
    assert.equal(formatWhatsApp(c.in), c.out);
    console.log(`✓ formatWhatsApp — ${c.nome}`);
  } catch (e) {
    failed += 1;
    console.error(`✗ formatWhatsApp — ${c.nome}: ${e.message}`);
  }
}

// ─── O bug original ───────────────────────────────────────────────────────
// 5521995135488 truncava em 11 dígitos e virava (55) 21995-1354: com cara de
// telefone válido, aprovado pela validação, dois dígitos perdidos pra sempre.
try {
  assert.notEqual(formatWhatsApp("5521995135488"), "(55) 21995-1354");
  assert.equal(digitsOf(formatWhatsApp("5521995135488")), "21995135488");
  assert.equal(isValidWhatsApp("5521995135488"), true, "com país é válido");
  assert.equal(
    normalizeWhatsAppDigits("5521995135488"),
    normalizeWhatsAppDigits("21995135488"),
    "com e sem país são o mesmo telefone",
  );
  console.log("✓ regressão — 5521995135488 não trunca mais em (55) 21995-1354");
} catch (e) {
  failed += 1;
  console.error(`✗ regressão — 5521995135488: ${e.message}`);
}

// ─── Teto ─────────────────────────────────────────────────────────────────
// O corte não sumiu, só subiu pra 13 (55 + DDD + 9 dígitos). Sem teto o campo
// aceitaria texto infinito.
try {
  assert.equal(normalizeWhatsAppDigits("5521995135488999999").length, 11, "13 dígitos, depois o país sai");
  assert.equal(formatWhatsApp("5521995135488999999"), "(21) 99513-5488");
  assert.equal(normalizeWhatsAppDigits("12345678901234567").length, 13, "sem 55 na frente, teto é 13");
  console.log("✓ teto — corta em 13 dígitos brutos");
} catch (e) {
  failed += 1;
  console.error(`✗ teto: ${e.message}`);
}

// ─── Validação ────────────────────────────────────────────────────────────
const VALID_CASES = [
  { in: "21995135488", ok: true, nome: "11 dígitos" },
  { in: "2199513548", ok: true, nome: "10 dígitos" },
  { in: "5521995135488", ok: true, nome: "13 com país" },
  { in: "552199513548", ok: true, nome: "12 com país" },
  { in: "(21) 99513-5488", ok: true, nome: "já mascarado" },
  { in: "+55 21 99513-5488", ok: true, nome: "com + e espaços" },
  { in: "5521995135", ok: true, nome: "10 dígitos, DDD 55" },
  { in: "219951354", ok: false, nome: "9 dígitos — curto demais" },
  { in: "5521995135488999999", ok: true, nome: "lixo depois do 13º é cortado" },
  { in: "", ok: false, nome: "vazio" },
  { in: null, ok: false, nome: "null" },
  { in: "abc", ok: false, nome: "sem dígito" },
];
for (const c of VALID_CASES) {
  try {
    assert.equal(isValidWhatsApp(c.in), c.ok);
    console.log(`✓ isValidWhatsApp — ${c.nome}`);
  } catch (e) {
    failed += 1;
    console.error(`✗ isValidWhatsApp — ${c.nome}: ${e.message}`);
  }
}

// ─── Digitação dígito a dígito ────────────────────────────────────────────
// É assim que a máscara roda de verdade: o campo é controlado, então cada
// tecla re-formata o valor JÁ mascarado do passo anterior. Um dígito perdido
// aqui é um dígito perdido no banco.
const typeIn = (numero) => {
  const passos = [];
  let campo = "";
  for (const ch of numero) {
    campo = formatWhatsApp(campo + ch);
    passos.push(campo);
  }
  return passos;
};

for (const numero of ["5521995135488", "21995135488", "552199513548", "2199513548"]) {
  try {
    const passos = typeIn(numero);
    passos.forEach((campo, i) => {
      const digitado = numero.slice(0, i + 1);
      assert.equal(
        digitsOf(campo),
        normalizeWhatsAppDigits(digitado),
        `passo ${i + 1} ("${digitado}") virou "${campo}"`,
      );
    });
    assert.equal(digitsOf(passos.at(-1)), normalizeWhatsAppDigits(numero), "resultado final");
    console.log(`✓ digitação — ${numero} → "${passos.at(-1)}" (nenhum dígito perdido em ${passos.length} passos)`);
  } catch (e) {
    failed += 1;
    console.error(`✗ digitação — ${numero}: ${e.message}`);
  }
}

// Colar o número inteiro de uma vez tem que dar o mesmo resultado que digitar.
try {
  for (const numero of ["5521995135488", "+55 (21) 99513-5488", "21995135488"]) {
    assert.equal(formatWhatsApp(numero), "(21) 99513-5488", numero);
    assert.equal(digitsOf(typeIn(digitsOf(numero)).at(-1)), "21995135488", `${numero} digitado`);
  }
  console.log("✓ colar === digitar — mesma saída pelos dois caminhos");
} catch (e) {
  failed += 1;
  console.error(`✗ colar === digitar: ${e.message}`);
}

if (failed > 0) {
  console.error(`\n${failed} caso(s) falharam.`);
  process.exit(1);
}
console.log("\nTodos os casos passaram.");
