/**
 * Afirma que o GEMEO daqui produz exatamente a mesma previa que o original do
 * backoffice (`cora-backoffice/src/lib/previa.ts`).
 *
 * O contrato entre os dois nao e uma suite espelhada: as REGRAS sao testadas la,
 * onde ha framework de verdade (36 testes). Manter uma segunda suite neste
 * estilo seria manter duas coisas, e elas divergiriam. O que amarra os dois e o
 * arquivo `api/_lib/previa.golden.json` — o MESMO em ambos os repos, com uma
 * entrada rica e a saida esperada.
 *
 * Este script prova uma coisa so: mesma entrada, mesma saida.
 *
 * Se falhar, NAO conserte o gemeo pra passar. Descubra qual dos dois lados
 * mudou. A ordem certa e sempre: muda no backoffice, `npm run golden` la, copia
 * o JSON pra ca, roda isto.
 *
 * O HASH IMPRESSO ABAIXO e o ponto cego que sobrava: como cada lado afirma
 * contra a PROPRIA copia do fixture, regenerar de um lado so deixa os dois
 * verdes enquanto ja divergiram. O hash nao impede — torna visivel. Os dois
 * testes imprimem o mesmo numero quando estao em sincronia, e por isso **o
 * fixture viaja com o gemeo, no MESMO PR.**
 *
 * Uso: `node scripts/test-previa.mjs` (ou `npm run test:previa`).
 * Exit 0 em sucesso, 1 em falha.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { montaPrevia } from "../api/_lib/previa.js";

const golden = JSON.parse(
  readFileSync(new URL("../api/_lib/previa.golden.json", import.meta.url), "utf8"),
);

// JSON nao tem Map, e `entrada.precos` e um. A reconstrucao tem que ser
// identica a do outro lado (src/lib/previaGolden.ts).
function montaPrecos(cru) {
  const precos = new Map();
  for (const [quinta, porSlug] of Object.entries(cru)) {
    precos.set(quinta, new Map(Object.entries(porSlug)));
  }
  return precos;
}

/**
 * cyrb53, gemea de `hashGolden` em cora-backoffice/src/lib/previaGolden.ts.
 * Nao e criptografica e nem precisa ser: o que se quer e um numero que muda
 * quando o conteudo muda e que da o MESMO resultado nos dois runtimes. Se as
 * duas implementacoes divergirem, os hashes divergem e o alarme dispara sem
 * motivo — que e o lado seguro de errar.
 */
function hashGolden(conteudo) {
  const texto = JSON.stringify(conteudo);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}

const entrada = { ...golden.entrada, precos: montaPrecos(golden.entrada.precos) };
const saida = montaPrevia(entrada, golden.periodoReferencia);

let falhas = 0;
function checa(nome, fn) {
  try {
    fn();
    console.log(`  ok  ${nome}`);
  } catch (err) {
    falhas++;
    console.error(`  FALHOU  ${nome}`);
    console.error(`     ${err.message.split("\n").slice(0, 6).join("\n     ")}`);
  }
}

console.log("gemeo da previa — travessia contra o golden");
console.log(`  golden hash: ${golden.hash}`);
console.log("  (tem que bater com o que o vitest do backoffice imprime)\n");

checa("o hash do fixture confere com o conteudo", () => {
  assert.equal(
    hashGolden({
      periodoReferencia: golden.periodoReferencia,
      entrada: golden.entrada,
      saida: golden.saida,
    }),
    golden.hash,
  );
});

// A afirmacao que importa. As demais existem so pra que uma falha diga ONDE
// divergiu, em vez de despejar dois objetos grandes lado a lado.
checa("saida identica ao golden", () => {
  assert.deepEqual(saida, golden.saida);
});

checa("total geral", () => {
  assert.equal(saida.totalGeral, golden.saida.totalGeral);
});

checa("janela do ciclo (a quinta 29/10 fica fora)", () => {
  assert.deepEqual(saida.janela.quintas, golden.saida.janela.quintas);
  assert.ok(!saida.janela.quintas.includes("2026-10-29"));
});

checa("grupos: quantidade, ordem e totais", () => {
  assert.deepEqual(
    saida.grupos.map((g) => [g.pagadorNome, g.total]),
    golden.saida.grupos.map((g) => [g.pagadorNome, g.total]),
  );
});

checa("classificacao dos extras (pago, troca, cortesia)", () => {
  const tipos = (p) => p.grupos.flatMap((g) => g.assinaturas.flatMap((a) => a.extras.map((e) => e.tipo)));
  assert.deepEqual(tipos(saida), tipos(golden.saida));
});

checa("alertas: codigos, ordem e destinatarios", () => {
  const chaves = (p) => p.alertas.map((a) => `${a.codigo}:${a.subscriptionId ?? "geral"}`);
  assert.deepEqual(chaves(saida), chaves(golden.saida));
});

checa("mensagens de alerta, texto a texto", () => {
  // Pega divergencia de formatacao de moeda e de data dentro das mensagens: o
  // `reais()` daqui usa toLocaleString e depende do ICU do runtime.
  assert.deepEqual(
    saida.alertas.map((a) => a.mensagem),
    golden.saida.alertas.map((a) => a.mensagem),
  );
});

if (falhas > 0) {
  console.error(`\n${falhas} verificacao(oes) falharam. Os gemeos DIVERGIRAM.`);
  process.exit(1);
}
console.log("\ntudo certo: os gemeos concordam.");
