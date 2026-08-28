/**
 * Testa o sync do contato com o segmento da newsletter do Resend
 * (syncContatoResend em api/subscriptions/index.js).
 *
 * SEM REDE E SEM RESEND REAL. Importar o modulo do endpoint puxaria
 * src/lib/resend.js, que faz `throw` sem RESEND_API_KEY e instanciaria um
 * cliente de verdade — e um teste que cria contato na conta de producao nao e
 * teste, e efeito colateral. Entao a funcao e EXTRAIDA do fonte e executada
 * com um `resend` dublê, mesma tecnica ja usada pra validar copy de e-mail
 * sem enviar. O custo e conhecido: se alguem renomear a funcao, a extracao
 * falha alto (exit 1) em vez de passar vazia.
 *
 * O que os casos travam:
 *   - o payload sai com `segments: [{ id }]` e NUNCA com `segmentIds`, que
 *     nao existe no SDK v6 e criaria o contato fora do segmento devolvendo
 *     sucesso (a falha silenciosa que a frente A existe pra matar);
 *   - contato duplicado cai no segments.add e conta como sucesso;
 *   - nenhum caminho de erro propaga excecao pro handler (best-effort).
 *
 * Uso: `node scripts/test-resend-sync.mjs` (ou `npm run test:resend-sync`).
 * Exit 0 em sucesso, 1 em falha.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Resend } from "resend";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FONTE = readFileSync(join(ROOT, "api/subscriptions/index.js"), "utf8");

const SEGMENT_ID = "8abed496-6e80-47fa-90dc-63348f22d37b";

// ─── Extracao das duas funcoes do fonte do endpoint ───
// Recorta do `const partirNome` ate a chave que fecha syncContatoResend na
// coluna 0. Falha alto se o formato mudar — melhor quebrar que testar nada.
function extrairFonte() {
  const ini = FONTE.indexOf("const partirNome =");
  assert.notEqual(ini, -1, "nao achei `const partirNome =` em api/subscriptions/index.js");
  const decl = FONTE.indexOf("async function syncContatoResend(", ini);
  assert.notEqual(decl, -1, "nao achei `async function syncContatoResend(`");
  const fim = FONTE.indexOf("\n}\n", decl);
  assert.notEqual(fim, -1, "nao achei o fechamento de syncContatoResend");
  return FONTE.slice(ini, fim + 3);
}

// Monta a funcao com as deps injetadas (resend dublê, env, console dublê).
const CORPO = extrairFonte();
const montar = (resend, segmentId, console_) =>
  new Function(
    "resend",
    "RESEND_SEGMENT_ASSINANTES",
    "console",
    `${CORPO}\nreturn { partirNome, syncContatoResend };`,
  )(resend, segmentId, console_);

// Dublê do cliente: registra as chamadas e devolve o que o caso mandar.
function fakeResend({ createResult, addResult, createThrows }) {
  const calls = { create: [], add: [] };
  return {
    calls,
    client: {
      contacts: {
        create: async (payload) => {
          calls.create.push(payload);
          if (createThrows) throw createThrows;
          return createResult;
        },
        segments: {
          add: async (options) => {
            calls.add.push(options);
            return addResult;
          },
        },
      },
    },
  };
}

const silencioso = { log: () => {}, warn: () => {}, error: () => {} };
const OK_CREATE = { data: { id: "cont_123" }, error: null };
const OK_ADD = { data: { id: "cont_123" }, error: null };
const ERRO_DUPLICATA = {
  data: null,
  error: { message: "Contact already exists", statusCode: 422, name: "validation_error" },
};
const ERRO_CHAVE = {
  data: null,
  error: { message: "API key is invalid", statusCode: 401, name: "invalid_api_key" },
};

let failures = 0;
const test = async (name, fn) => {
  try {
    await fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures++;
    console.error(`  FALHOU  ${name}\n    ${err.message}`);
  }
};

// ─── 1. Caminho feliz: cria o contato ja dentro do segmento ───
await test("contato novo -> create com segments:[{id}], sem segments.add", async () => {
  const { client, calls } = fakeResend({ createResult: OK_CREATE });
  const { syncContatoResend } = montar(client, SEGMENT_ID, silencioso);
  await syncContatoResend("marla@exemplo.com", "Marla Souza");
  assert.equal(calls.create.length, 1);
  assert.equal(calls.add.length, 0, "nao deve chamar segments.add quando o create passa");
  assert.deepEqual(calls.create[0], {
    email: "marla@exemplo.com",
    firstName: "Marla",
    lastName: "Souza",
    segments: [{ id: SEGMENT_ID }],
  });
});

// A armadilha do briefing: `segmentIds` nao existe no SDK v6. Um payload com
// esse nome criaria o contato FORA do segmento e devolveria sucesso — o erro
// mais caro possivel aqui, porque parece funcionar.
await test("payload NUNCA usa segmentIds (campo inexistente no SDK v6)", async () => {
  const { client, calls } = fakeResend({ createResult: OK_CREATE });
  const { syncContatoResend } = montar(client, SEGMENT_ID, silencioso);
  await syncContatoResend("marla@exemplo.com", "Marla");
  assert.ok(!("segmentIds" in calls.create[0]), "payload nao pode conter segmentIds");
  assert.ok(Array.isArray(calls.create[0].segments), "segments tem que ser array");
  assert.equal(calls.create[0].segments[0].id, SEGMENT_ID);
});

// ─── 2. Idempotencia: contato que ja existe ───
await test("contato duplicado -> cai no segments.add e conta como sucesso", async () => {
  const { client, calls } = fakeResend({ createResult: ERRO_DUPLICATA, addResult: OK_ADD });
  const { syncContatoResend } = montar(client, SEGMENT_ID, silencioso);
  await syncContatoResend("eva@exemplo.com", "Eva");
  assert.equal(calls.create.length, 1);
  assert.equal(calls.add.length, 1, "duplicata tem que tentar o add");
  assert.deepEqual(calls.add[0], { email: "eva@exemplo.com", segmentId: SEGMENT_ID });
});

// Cenario "cancelou e voltou": o contato existe mas saiu do segmento. Se o
// codigo so engolisse o erro do create, a pessoa ficaria fora da newsletter.
await test("cancelou e voltou -> o add reinsere no segmento", async () => {
  const { client, calls } = fakeResend({ createResult: ERRO_DUPLICATA, addResult: OK_ADD });
  const { syncContatoResend } = montar(client, SEGMENT_ID, silencioso);
  await syncContatoResend("claudio@exemplo.com", "Claudio Otero Ascoli");
  assert.equal(calls.add[0].segmentId, SEGMENT_ID);
});

// ─── 3. Falhas: best-effort, nunca propaga ───
await test("chave invalida -> tenta o add, loga e NAO lanca", async () => {
  const { client, calls } = fakeResend({ createResult: ERRO_CHAVE, addResult: ERRO_CHAVE });
  const { syncContatoResend } = montar(client, SEGMENT_ID, silencioso);
  await syncContatoResend("teste@exemplo.com", "Teste");
  assert.equal(calls.create.length, 1);
  assert.equal(calls.add.length, 1);
});

await test("create lanca excecao -> capturada, NAO propaga", async () => {
  const { client } = fakeResend({ createThrows: new Error("ECONNRESET") });
  const { syncContatoResend } = montar(client, SEGMENT_ID, silencioso);
  await syncContatoResend("teste@exemplo.com", "Teste");
});

await test("env var ausente -> pula sem chamar o Resend", async () => {
  const { client, calls } = fakeResend({ createResult: OK_CREATE });
  const { syncContatoResend } = montar(client, undefined, silencioso);
  await syncContatoResend("teste@exemplo.com", "Teste");
  assert.equal(calls.create.length, 0);
  assert.equal(calls.add.length, 0);
});

await test("env var vazia -> tratada como ausente", async () => {
  const { client, calls } = fakeResend({ createResult: OK_CREATE });
  const { syncContatoResend } = montar(client, "", silencioso);
  await syncContatoResend("teste@exemplo.com", "Teste");
  assert.equal(calls.create.length, 0);
});

// ─── 4. primeiroNome ───
await test("partirNome quebra no primeiro espaco", () => {
  const { partirNome } = montar({}, SEGMENT_ID, silencioso);
  assert.deepEqual(partirNome("Claudio Otero Ascoli"), { firstName: "Claudio", lastName: "Otero Ascoli" });
  assert.deepEqual(partirNome("  Eva   Maria  "), { firstName: "Eva", lastName: "Maria" });
  // Token unico -> lastName undefined, nao "": o SDK omite a chave do payload
  // em vez de gravar sobrenome vazio no contato.
  assert.deepEqual(partirNome("Marla"), { firstName: "Marla", lastName: undefined });
  assert.deepEqual(partirNome(""), { firstName: "", lastName: undefined });
  assert.deepEqual(partirNome(null), { firstName: "", lastName: undefined });
  assert.deepEqual(partirNome(undefined), { firstName: "", lastName: undefined });
});

// Nome de token unico nao pode virar lastName:"" no payload que vai pra API.
await test("nome sem sobrenome -> lastName undefined no payload", async () => {
  const { client, calls } = fakeResend({ createResult: OK_CREATE });
  const { syncContatoResend } = montar(client, SEGMENT_ID, silencioso);
  await syncContatoResend("eva@exemplo.com", "Eva");
  assert.equal(calls.create[0].firstName, "Eva");
  assert.equal(calls.create[0].lastName, undefined);
});

// ─── 5. Contrato do SDK instalado ───
// O dublê acima aceitaria qualquer forma. Estes dois casos olham o cliente
// REAL (construido offline, sem request) pra garantir que os metodos usados
// continuam existindo depois de um upgrade do pacote.
await test("SDK instalado expoe contacts.create e contacts.segments.add", () => {
  const real = new Resend("re_chave_de_teste_nao_usada");
  assert.equal(typeof real.contacts.create, "function");
  assert.equal(typeof real.contacts.segments.add, "function");
});

console.log(failures === 0 ? "\nTodos os casos passaram." : `\n${failures} caso(s) falharam.`);
process.exit(failures === 0 ? 0 : 1);
