# Prompt — Claude Code — Fase 7 (Backend do Onboarding)

**Task ClickUp:** 86e17u9k1
**Branch:** `refactor/onboarding-fase-0` (continuar nessa branch, não criar nova)
**Briefing técnico:** `docs/CORA_Briefing_Fase7_Backend.md` (já commitado nessa branch)

---

## Pré-requisitos do Hugo (já prontos)

- Conta Supabase ativa, projeto provisionado, `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` guardados
- Conta Resend ativa, `RESEND_API_KEY` guardada
- Decisões fixadas: domínio default do Resend até `acora.com.br` ficar pronto, `EMAIL_TO=hugorafael01@gmail.com` até Workspace ficar pronto

---

## Antes de começar — auditoria

Ler antes de tocar em qualquer arquivo:

1. `src/utils/subscription.js` — formato atual do payload salvo em localStorage (chave `cora_subscription`)
2. `src/utils/api.js` — stub atual de `postWaitlist`
3. `src/Onboarding.jsx` (ou onde estiver a Welcome) — onde a save no localStorage acontece hoje (vai virar POST)
4. `src/Home.jsx` (ou equivalente) — onde o banner pendente lê status
5. `package.json` — confirmar que `@supabase/supabase-js` e `resend` ainda não estão instalados

---

## Pacotes a instalar

```bash
npm install @supabase/supabase-js resend
```

---

## Passo 1 — Migration

Criar `supabase/migrations/0001_initial.sql` com o SQL abaixo. É o SQL do briefing técnico (seção 2.1) + **uma linha adicional** (índice parcial pra idempotência) marcada com `-- ADICIONADO`.

```sql
-- ============================================================
-- Cora — Migration inicial (Fase 7 do refactor de Onboarding)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE subscription_status AS ENUM (
  'pending_payment', 'active', 'paused', 'cancelled'
);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                  TEXT NOT NULL,
  whatsapp              TEXT NOT NULL,
  email                 TEXT NOT NULL,
  cpf                   TEXT NOT NULL,
  cep                   TEXT NOT NULL,
  rua                   TEXT NOT NULL,
  numero                TEXT NOT NULL,
  complemento           TEXT,
  bairro                TEXT NOT NULL,
  cidade                TEXT NOT NULL,
  estado                TEXT NOT NULL,
  itens                 JSONB NOT NULL,
  total_paes            INT  NOT NULL,
  valor_paes            NUMERIC(10,2) NOT NULL,
  valor_frete           NUMERIC(10,2) NOT NULL,
  valor_mensal          NUMERIC(10,2) NOT NULL,
  status                subscription_status NOT NULL DEFAULT 'pending_payment',
  coverage_unconfirmed  BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscriptions_valor_mensal_check
    CHECK (valor_mensal = valor_paes + valor_frete)
);

CREATE INDEX subscriptions_email_idx  ON subscriptions(email);
CREATE INDEX subscriptions_cpf_idx    ON subscriptions(cpf);
CREATE INDEX subscriptions_status_idx ON subscriptions(status);
CREATE INDEX subscriptions_coverage_unconfirmed_idx
  ON subscriptions(coverage_unconfirmed)
  WHERE coverage_unconfirmed = true;

-- ADICIONADO: idempotência — 1 só pending por CPF
CREATE UNIQUE INDEX subscriptions_cpf_pending_uniq
  ON subscriptions(cpf)
  WHERE status = 'pending_payment';

CREATE TRIGGER subscriptions_set_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE coverage_waitlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf         TEXT,
  nome        TEXT,
  whatsapp    TEXT NOT NULL,
  email       TEXT,
  cep         TEXT NOT NULL,
  bairro      TEXT,
  cidade      TEXT,
  estado      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE coverage_whitelist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf         TEXT,
  email       TEXT,
  cep         TEXT,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_waitlist   ENABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_whitelist  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny all" ON subscriptions
  FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY "deny all" ON coverage_waitlist
  FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY "deny all" ON coverage_whitelist
  FOR ALL TO public USING (false) WITH CHECK (false);
```

**Aplicação:** Hugo cola esse SQL no SQL Editor do painel Supabase e roda. Não usar Supabase CLI.

**Validação após aplicar:**
- `SELECT * FROM subscriptions LIMIT 1` retorna 0 linhas, sem erro
- Tentar `INSERT INTO subscriptions (valor_paes, valor_frete, valor_mensal, ...) VALUES (99, 15, 999, ...)` deve falhar (constraint `valor_mensal_check` rejeita)
- Com chave `anon` (não service_role), `SELECT * FROM subscriptions` deve falhar com erro de permissão (RLS funcionando)
- `SELECT indexname FROM pg_indexes WHERE tablename = 'subscriptions'` deve listar `subscriptions_cpf_pending_uniq`

---

## Passo 2 — Libs server-side

### `src/lib/supabase-admin.js`

```js
import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase env vars');
}

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
```

**Importante:** esse arquivo NUNCA pode ser importado por código que termina no bundle do front. Só por endpoints em `api/`.

### `src/lib/resend.js`

```js
import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('Missing Resend API key');
}

export const resend = new Resend(process.env.RESEND_API_KEY);
```

### `src/lib/validators.js`

Funções puras, sem dependências externas. Usadas pelos endpoints (server) e podem ser reusadas no front também.

- `canonicalizeDigits(str)` → remove tudo que não é dígito
- `isValidCPF(cpf)` → 11 dígitos + algoritmo de dígitos verificadores
- `isValidEmail(email)` → regex padrão (RFC 5322 simplificada)
- `isValidWhatsApp(wa)` → 11 dígitos puros (DDD + número, sem 55)
- `isValidCEP(cep)` → 8 dígitos puros
- `isValidUUID(id)` → regex de UUID v4

---

## Passo 3 — Endpoints

Estrutura de pastas:
```
api/
  subscriptions/
    index.js       (POST)
    [id].js        (GET)
  coverage-waitlist.js  (POST)
```

### `api/subscriptions/index.js` — POST

**Request body:**
```json
{
  "nome": "Beatriz",
  "whatsapp": "(21) 99999-9999",
  "email": "beatriz@example.com",
  "cpf": "123.456.789-00",
  "endereco": {
    "cep": "24220-000",
    "rua": "Rua X",
    "numero": "123",
    "complemento": "apto 502",
    "bairro": "Icaraí",
    "cidade": "Niterói",
    "estado": "RJ"
  },
  "itens": { "original": 1, "integral": 0 },
  "coverage_unconfirmed": false
}
```

**Fluxo:**

1. Validar método = POST. Se não, 405.
2. Validar campos obrigatórios. Se faltar, retornar 400 `{ error: 'missing_fields', fields: [...] }`.
3. Canonicalizar `whatsapp`, `cpf`, `cep` (só dígitos).
4. Validar formato:
   - CPF inválido → 422 `{ error: 'invalid_cpf' }`
   - E-mail inválido → 422 `{ error: 'invalid_email' }`
   - WhatsApp ≠ 11 dígitos → 422 `{ error: 'invalid_whatsapp' }`
   - CEP ≠ 8 dígitos → 422 `{ error: 'invalid_cep' }`
   - Soma de `itens` fora de [1, 3] → 422 `{ error: 'invalid_qty' }`
5. **Calcular valores no servidor** (não confiar no payload se vier valor monetário):
   - `total_paes = sum(Object.values(itens))`
   - `valor_paes = total_paes * 99`
   - `valor_frete = 15`
   - `valor_mensal = valor_paes + valor_frete`
6. INSERT em `subscriptions` via `supabaseAdmin`.
7. **Tratamento de duplicata:** se erro com código `23505` (UNIQUE violation no índice `subscriptions_cpf_pending_uniq`):
   - Fazer SELECT do registro existente: `WHERE cpf = $1 AND status = 'pending_payment'`
   - Retornar 200 com o `subscription_id` antigo + `status: 'pending_payment'`
   - **Não disparar segundo e-mail.**
8. Se INSERT ok: disparar e-mail com `await` + `try/catch`:
   ```js
   try {
     await resend.emails.send({
       from: process.env.EMAIL_FROM,
       to: process.env.EMAIL_TO,
       subject: `[Cora] Nova assinatura — ${nome}`,
       text: buildEmailBody(subscription)
     });
   } catch (err) {
     console.error('[email] failed', err);
   }
   ```
9. Retornar 201 com `{ subscription_id, status: 'pending_payment' }`.

**Template do e-mail** (texto plano, conforme briefing 2.2):

```
Nova assinatura recebida.

Assinante: {nome}
WhatsApp: {whatsapp formatado}
E-mail: {email}
CPF: {cpf formatado}

Endereço:
{rua}, {numero}
{complemento se houver}
{bairro} — {cidade}/{estado}
{cep formatado}

Assinatura:
{total_paes} pão(ães) por semana
{detalhamento dos itens — ex: "1× Pão Original + 1× Pão Integral"}
Total mensal: R$ {valor_mensal}

Status: aguardando criação de cobrança no Asaas.
{se coverage_unconfirmed: "⚠ Cobertura não confirmada automaticamente. Verificar manualmente."}

Acessar Asaas: https://www.asaas.com/

---
Esta mensagem foi gerada automaticamente pelo portal Cora.
```

Formatadores: WhatsApp `(XX) 9XXXX-XXXX`, CPF `XXX.XXX.XXX-XX`, CEP `XXXXX-XXX`, valor com 2 casas decimais e vírgula.

### `api/subscriptions/[id].js` — GET

**Path param:** `id` (UUID)

**Fluxo:**

1. Validar método = GET. Se não, 405.
2. Validar `id` é UUID válido. Se não, 400 `{ error: 'invalid_id' }`.
3. SELECT em `subscriptions`:
   ```sql
   SELECT id, status, nome, itens, total_paes, valor_mensal, created_at
   FROM subscriptions
   WHERE id = $1
   ```
4. Se 0 linhas, 404 `{ error: 'not_found' }`.
5. Retornar 200 com os campos selecionados.

**Importante:** esse endpoint NÃO retorna CPF, e-mail, WhatsApp ou endereço completo. Só o que a Home precisa renderizar. Se no futuro algo na UI precisar mais, criar endpoint específico ou adicionar campos sob demanda.

### `api/coverage-waitlist.js` — POST

**Request body:**
```json
{
  "cpf": "123.456.789-00",
  "nome": "Beatriz",
  "whatsapp": "(21) 99999-9999",
  "email": "beatriz@example.com",
  "cep": "01310-100",
  "bairro": "Bela Vista",
  "cidade": "São Paulo",
  "estado": "SP"
}
```

`whatsapp` e `cep` são obrigatórios. Resto é opcional.

**Fluxo:**

1. Validar método = POST. Se não, 405.
2. Validar `whatsapp` e `cep`. Se faltar, 400.
3. Canonicalizar `whatsapp`, `cpf` (se vier), `cep`.
4. INSERT em `coverage_waitlist`.
5. Retornar 201 `{ ok: true }`.

Não dispara e-mail.

---

## Passo 4 — Refactor frontend

### `src/utils/api.js`

Substituir/adicionar:

- `postSubscription(payload)` → POST `/api/subscriptions`. Retorna `{ subscription_id, status }`. Em erro, throw com mensagem do servidor.
- `getSubscription(id)` → GET `/api/subscriptions/${id}`. Retorna objeto da subscription. Em 404, retorna `null`. Em outros erros, throw.
- `postWaitlist(payload)` → POST `/api/coverage-waitlist`. **Substitui o stub atual.**

Todos usam `fetch` nativo, sem libs adicionais.

### `src/utils/subscription.js`

Manter API pública atual: `loadSubscription()`, `saveSubscription(data)`, `clearSubscription()`.

**Mudança em `saveSubscription`:** o objeto salvo agora inclui `id` e `status` no topo, junto com o payload completo:

```js
{
  id: 'uuid-...',
  status: 'pending_payment',
  nome: '...',
  whatsapp: '...',
  // ... resto do payload
}
```

**Adicionar nova função `reconcileSubscription()`:**

```js
export async function reconcileSubscription() {
  const local = loadSubscription();
  if (!local?.id) return null;

  try {
    const remote = await getSubscription(local.id);
    if (!remote) {
      // 404 — subscription não existe mais. Limpa.
      clearSubscription();
      return null;
    }
    if (remote.status !== local.status) {
      // Status mudou no servidor. Atualiza localStorage mantendo
      // os outros campos do payload local.
      const updated = { ...local, status: remote.status };
      saveSubscription(updated);
      return updated;
    }
    return local;
  } catch (err) {
    // Erro de rede — degrade graciosamente, retorna o que tem.
    console.warn('[reconcile] failed, using local', err);
    return local;
  }
}
```

### Home (`src/Home.jsx` ou onde for)

`useEffect` inicial (executa 1x ao montar):

```js
useEffect(() => {
  reconcileSubscription().then(updated => {
    if (updated) setSubscription(updated);
  });
}, []);
```

O banner pendente reage ao `subscription.status`. Quando status virar `active` no Supabase e Hugo der F5, o `useEffect` chama o GET, detecta a mudança, atualiza state e localStorage. Banner some sem ação manual.

### Onboarding / Welcome

Onde hoje a Welcome chama `saveSubscription(payload)` direto:

```js
// Antes:
saveSubscription(payload);
navigate('/');

// Depois:
try {
  const { subscription_id, status } = await postSubscription(payload);
  saveSubscription({ id: subscription_id, status, ...payload });
  navigate('/');
} catch (err) {
  // Mostrar erro genérico na Welcome ou voltar pra T2.
  // Decidir UX: alert simples por enquanto.
  alert('Algo deu errado, tenta de novo em alguns segundos.');
}
```

**Botão "Continuar" da T2 deve ficar `disabled` durante o `await`** (idempotência camada A — evita clique duplo). Mostrar spinner ou texto "Enviando...".

Onde a tela de fora-de-cobertura hoje chama o stub de `postWaitlist`: agora chama o real (mesma assinatura de função, só muda a implementação em `api.js`).

---

## Passo 5 — Variáveis de ambiente

### `.env.local` (dev local — **não commitar**)

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...
EMAIL_FROM=onboarding@resend.dev
EMAIL_TO=hugorafael01@gmail.com
```

Confirmar que `.env.local` está no `.gitignore`.

### Vercel (Production + Preview)

Mesmas variáveis, configuradas via UI do painel Vercel. Aplicar em ambos os ambientes.

**Atenção:** nenhuma dessas variáveis pode ter prefixo `VITE_`. Se tiver, o Vite vai expor pro bundle do front, e a `SERVICE_ROLE_KEY` vaza. Validar que nenhum arquivo do front (`src/`, exceto `src/lib/supabase-admin.js` e `src/lib/resend.js`) referencia essas variáveis.

---

## Critérios de aceitação

Validar todos antes de avisar o Hugo:

### Banco
- [ ] Migration aplicada sem erro
- [ ] 3 tabelas criadas, ENUM criado, trigger criado
- [ ] Índice `subscriptions_cpf_pending_uniq` existe
- [ ] RLS ativo nas 3 tabelas (testar com chave `anon` — INSERT e SELECT devem falhar)
- [ ] Constraint `valor_mensal_check` funciona (INSERT inconsistente é rejeitado)

### POST /api/subscriptions
- [ ] Payload válido cria registro real no banco e retorna `subscription_id`
- [ ] E-mail chega em `hugorafael01@gmail.com` em < 30s (verificar caixa de entrada e spam)
- [ ] Resend falhando (testar com API key inválida temporária) NÃO bloqueia a resposta
- [ ] Clique duplo / requisição duplicada com mesmo CPF: retorna o mesmo `subscription_id`, e-mail só sai 1x
- [ ] CPF inválido retorna 422 com `{ error: 'invalid_cpf' }`
- [ ] `coverage_unconfirmed: true` no payload aparece com warning no e-mail

### GET /api/subscriptions/{id}
- [ ] UUID válido retorna `{ id, status, nome, itens, total_paes, valor_mensal, created_at }`
- [ ] UUID inexistente retorna 404
- [ ] String não-UUID retorna 400
- [ ] CPF, e-mail, WhatsApp e endereço NÃO aparecem na resposta

### POST /api/coverage-waitlist
- [ ] Payload válido cria registro em `coverage_waitlist`
- [ ] WhatsApp/CEP ausentes retornam 400
- [ ] Substitui o stub anterior (validar que `src/utils/api.js` não tem mais a versão fake)

### Frontend
- [ ] Welcome após T2 chama POST e salva `{id, status, ...payload}` no localStorage
- [ ] Botão "Continuar" da T2 desabilita durante request
- [ ] F5 na Home com subscription_id no localStorage chama GET e reconcilia status
- [ ] Hugo muda status pra `active` manualmente no Supabase, F5 → banner some
- [ ] Stub `postWaitlist` removido de `src/utils/api.js`

### Segurança
- [ ] `SUPABASE_SERVICE_ROLE_KEY` não aparece no bundle do front (buscar no `dist/` após `npm run build`)
- [ ] Nenhuma variável de ambiente sensível tem prefixo `VITE_`

---

## Validação manual end-to-end

Rodar localmente com `vercel dev` (não só `npm run dev` — precisa das functions ativas).

**Cenário 1 — Subscription dentro de cobertura:**
1. Onboarding com CEP de Icaraí
2. T2 com 1 Original + 1 Integral (total 2 pães)
3. Confirmar
4. Verificar: registro em `subscriptions` com `valor_mensal = 213`, e-mail no Gmail, banner pendente em todas as 4 telas

**Cenário 2 — Fora de cobertura:**
1. Onboarding com CEP de São Paulo
2. Card de fora de cobertura aparece
3. Preenche WhatsApp, clica "Me avise"
4. Verificar: registro em `coverage_waitlist`, sem subscription criada

**Cenário 3 — CPF na whitelist:**
1. INSERT manual em `coverage_whitelist`: `INSERT INTO coverage_whitelist (cpf, note) VALUES ('99988877766', 'Teste');`
2. Onboarding com esse CPF + CEP fora de cobertura
3. Confirma que cobertura é liberada
4. Subscription é criada normalmente

**Cenário 4 — Idempotência:**
1. Submit T2 com CPF X
2. Sem mudar nada, submit de novo (simular clique duplo via DevTools ou recarregar e refazer)
3. Verificar: 1 só registro em `subscriptions`, 1 só e-mail no Gmail

**Cenário 5 — Reconciliação:**
1. Completa onboarding, banner aparece na Home
2. No painel Supabase, UPDATE manual: `UPDATE subscriptions SET status = 'active' WHERE id = 'xxx';`
3. F5 no portal
4. Banner some. Cardápio libera extras.

---

## Fora desta task (Hugo faz separadamente)

- **Antes do primeiro deploy de produção:** configurar SPF/DKIM do domínio `acora.com.br` no Resend, adicionar registros DNS no Registro.br, validar domínio no Resend, trocar `EMAIL_FROM=portal@acora.com.br` no Vercel (Production).
- Quando Workspace Google ficar pronto: trocar `EMAIL_TO=hugo@acora.com.br` no Vercel.
- Atualizar `PORTAL_STATUS.md` na raiz do repo após Fase 7 fechada.

---

## Ao terminar

Rodar `vercel dev`, executar os 5 cenários de validação manual, conferir todos os critérios de aceitação, avisar o Hugo com:

- Branch atualizada
- Migration aplicada (printscreen do Supabase ou confirmação de que rodou sem erro)
- Resultado dos 5 cenários
- Quaisquer pontos de atenção que apareceram durante a implementação

Não fazer merge pra `main`. Hugo faz manualmente após validar.

---

*Prompt · Fase 7 Backend · Maio 2026 · Task 86e17u9k1 · Branch refactor/onboarding-fase-0*
