# Briefing — Migration: `subscriptions.user_id`

**Repo:** `cora-backoffice`
**Tipo:** Migration nova (DDL + RLS)
**Numeração sugerida:** 0014 (confirmar próximo número livre antes de aplicar)
**Motivação:** habilitar autenticação real no Portal do Assinante. Sem essa coluna, não há vínculo entre uma subscription e o usuário do Supabase Auth que a "dona".
**Dependência de:** nada
**Habilita:** Frente B do briefing `CORA_Briefing_Auth_MagicLink_SMS_Ready.md` (auth core no portal)

---

## 1. Estado atual confirmado

Output do `information_schema.columns` em 23/05/2026 mostra que `subscriptions` tem 23 colunas, nenhuma delas é `user_id`. A coluna `id` é o primary key da própria subscription (uuid), não vínculo com `auth.users`.

Hoje, uma subscription existe sem vínculo formal com um usuário do Auth — o que faz sentido porque o portal nem tem auth real implementado ainda.

---

## 2. O que essa migration faz

1. Adiciona coluna `user_id uuid` em `subscriptions`, com FK pra `auth.users(id)`
2. Cria index em `user_id` pra performance de queries por dono
3. Atualiza políticas RLS pra: usuário autenticado lê/atualiza sua própria subscription; service role mantém acesso total
4. Coluna é **NULLABLE** inicialmente — isso permite subscriptions de teste existentes continuarem válidas e o cutover ao auth real ser gradual

---

## 3. Decisões já tomadas

### 3.1. Nullable, não NOT NULL

Razão: hoje existem subscriptions de teste (Hugo, possivelmente Mariane) que não têm usuário Supabase Auth. Marcar como NOT NULL quebraria essas linhas. Depois do cutover oficial em agosto, pode-se considerar uma migration 00XX futura pra tornar NOT NULL — mas só depois que todas as subscriptions reais tiverem user_id populado.

### 3.2. `ON DELETE CASCADE`

Se o usuário Auth for deletado (cenário raro mas possível — direito ao esquecimento LGPD), a subscription associada vai junto. Alternativa seria `SET NULL`, mas isso deixaria subscriptions órfãs no banco — pior pra auditoria e pra cobrança recorrente via Asaas (que precisa de cliente identificável).

### 3.3. Unicidade: não impor 1-pra-1 agora

Não criar `UNIQUE` em `user_id`. Razão: arquiteturalmente um usuário Auth pode ter mais de uma subscription no futuro (cenário de presente, conta corporativa, etc). Negócio hoje é 1-pra-1, mas o schema não precisa travar isso.

### 3.4. RLS

Hoje a tabela provavelmente está com RLS habilitado e policies que permitem service role total + usuário lendo a própria via WhatsApp/CPF (a ser confirmado). A política nova adiciona acesso por `user_id = auth.uid()`. As policies existentes não são revogadas por essa migration — devem ser auditadas em migration separada quando o cutover acontecer.

---

## 4. SQL da migration

```sql
-- Migration 0014: add user_id to subscriptions
-- Habilita autenticação real no Portal do Assinante via Supabase Auth
-- Data: 23/05/2026

-- 1. Adiciona coluna user_id como FK pra auth.users
ALTER TABLE public.subscriptions
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Index pra performance em lookups por dono
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id)
WHERE user_id IS NOT NULL;

-- 3. RLS policy: usuário autenticado lê sua própria subscription
CREATE POLICY "subscriptions_select_own"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. RLS policy: usuário autenticado atualiza sua própria subscription
CREATE POLICY "subscriptions_update_own"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Comentário documental
COMMENT ON COLUMN public.subscriptions.user_id IS
  'FK para auth.users. NULLABLE até cutover do auth real (ago/2026). '
  'Subscriptions criadas via fluxo de onboarding novo já populam essa coluna.';
```

---

## 5. O que NÃO está nessa migration

- ❌ Backfill de subscriptions existentes (Hugo decide manualmente quais limpar/migrar)
- ❌ Política de INSERT pra `authenticated` (subscription continua sendo criada via service role nas Vercel functions do portal por enquanto — política de INSERT por usuário entra em migration futura quando o portal escrever direto)
- ❌ Revogação de policies antigas (auditar separadamente, sem urgência)
- ❌ Tornar coluna NOT NULL (migration futura, pós-cutover)

---

## 6. Smoke tests (rodar após aplicar)

### 6.1. Schema

```sql
-- Confirma coluna existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'subscriptions' AND column_name = 'user_id';
-- Deve retornar: user_id | uuid | YES

-- Confirma FK
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.subscriptions'::regclass
  AND contype = 'f'
  AND conname LIKE '%user_id%';
-- Deve retornar FK pra auth.users(id) com ON DELETE CASCADE

-- Confirma index
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'subscriptions' AND indexname = 'idx_subscriptions_user_id';
-- Deve retornar o index
```

### 6.2. RLS

```sql
-- Lista policies da tabela
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'subscriptions';
-- Deve incluir subscriptions_select_own e subscriptions_update_own
```

### 6.3. Funcional (opcional)

Criar um usuário teste no Auth, criar uma subscription com `user_id` apontando pra ele, e tentar SELECT via JWT desse usuário — deve retornar só a própria subscription. Esse teste pode esperar a Frente B do portal, onde o auth real entra em cena.

---

## 7. Como aplicar

No repo `cora-backoffice`:

1. Confirmar próximo número de migration livre (provavelmente 0014, mas pode ter 0015+ já)
2. Criar arquivo `supabase/migrations/0014_subscriptions_user_id.sql` (ou número apropriado) com o SQL da seção 4
3. Aplicar via `supabase db push` (regra de governance do projeto — nunca via dashboard)
4. Rodar smoke tests da seção 6 no SQL Editor pra confirmar
5. Commit message ASCII-only, ex: `feat(schema): add user_id FK to subscriptions for auth integration`
6. Push, abrir PR, squash merge via GitHub UI
7. Delete branch local com `git branch -D <branch>`

---

## 8. Critérios de aceite

A migration está pronta quando:

- [ ] Arquivo `0014_subscriptions_user_id.sql` (ou número correto) committed em main
- [ ] Smoke tests da seção 6.1 e 6.2 passam
- [ ] `subscriptions.user_id` aceita NULL (subscriptions de teste continuam válidas)
- [ ] Nenhuma policy existente foi revogada (auditoria separada)
- [ ] Comentário documental presente

---

## 9. Risco e rollback

**Risco:** baixo. Migration aditiva, nullable, sem alterar dados existentes.

**Rollback se necessário:**
```sql
DROP POLICY IF EXISTS "subscriptions_update_own" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
DROP INDEX IF EXISTS public.idx_subscriptions_user_id;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS user_id;
```

Mas se isso virar necessário pós-deploy, a Frente B do portal já vai estar dependendo da coluna — então rollback efetivo significa rollback do auth no portal também.

---

## 10. Validação com Hugo antes de aplicar

Antes de o CC do Backoffice rodar `supabase db push`, parar e confirmar com Hugo:

1. Número da migration está correto pro estado atual do repo? (próximo livre)
2. Política de RLS faz sentido com as policies já existentes? (sem conflito de nomes ou regras contraditórias)
3. Decisões 3.1-3.4 (nullable, cascade, sem unique, RLS) estão alinhadas?

---

**Próxima ação após aplicar:** voltar pro CC do Portal e desbloquear Frente B (auth core) com a confirmação de que `subscriptions.user_id` existe.
