# Briefing — Frente D / D.2: helpers de leitura useProfile + useSubscription

**Repo:** `cora-portal`
**Task ancora:** 86e1mba7c (Frente D — Subscription no DB)
**Sub-etapa:** D.2 (helpers de leitura). D.1 (schema) ja concluida e mergeada.
**Sessao de origem:** 29/mai/2026

---

## Contexto

A D.1 criou no banco a tabela `profiles` e adicionou as colunas novas em
`subscriptions` (modelo novo). A D.2 constroi a camada de LEITURA no portal: dois
hooks que leem esses dados direto do banco usando a sessao do usuario logado.

Isto e so leitura. Nao mexe no portao de entrada do app (ProtectedRoute = D.4),
nao troca o que as telas exibem hoje, nao escreve nada. Sao pecas novas que ainda
nao sao consumidas pelo app em producao, apenas construidas e validadas.

O furo de seguranca da task 86e1mcyuz e de ESCRITA. A D.2 e read-only, entao nao
e bloqueada por ele.

---

## Decisoes ja tomadas (nao redesenhar)

1. **Read-path direto.** Os hooks leem o banco direto do client (browser) usando o
   client supabase ja existente (criado na Auth-B) e a sessao JWT do usuario. A RLS
   `select_own` (subscriptions) e `profiles_select_own` (profiles) garante que cada
   usuario so le a propria linha. NAO criar endpoint server-side, NAO criar um
   segundo client supabase.
2. **Escopo contido: so construir e validar os hooks.** Nao consumir os hooks nas
   telas de producao, nao tocar no ProtectedRoute, nao remover `cora_subscription`
   (tudo isso e D.4). A unica UI permitida e um painel de debug temporario e
   guardado (ver Validacao).
3. **Leitura do shape novo.** useSubscription le as colunas novas (qty_*,
   zona_entrega, status, asaas_*, endereco, timestamps). Ignora as colunas legadas
   (itens, total_paes, valor_*), que serao dropadas na contract.
4. **Validacao por usuario dev via magic link.** Hugo ja criou o usuario
   `hugo+dev@acora.com.br` e semeou profile + subscription de teste (ver Pre-req).
   Login nele e pelo magic link normal (o alias cai na caixa do hugo@). Sem senha,
   sem signInWithPassword, sem mudanca de config no Supabase.

---

## Estado relevante do repo / banco

- O client supabase ja existe no portal (Auth-B). Use o mesmo. Use a forma
  existente de obter sessao/usuario (getSession/getUser ou o contexto de auth que a
  Auth-B montou). Confirme via `git log origin/main` e leitura do codigo, nao assuma.
- `profiles`: RLS ON, policy `profiles_select_own` (SELECT where user_id =
  auth.uid()). Sem policy de insert/update (cadastro e server-side).
- `subscriptions`: RLS ON, policies `select_own` e `update_own` (da 0017) + `deny all`
  permissive (no-op). user_id nullable.
- As colunas novas de subscriptions e a tabela profiles estao VAZIAS pra usuarios
  reais; so o usuario dev semeado tem dados. Por isso a validacao e contra o dev.
- Modelo de assinatura unica: um usuario tem no maximo uma subscription.

---

## Escopo (o que mexe / o que NAO mexe)

**Mexe:**
- Cria `src/hooks/useSubscription.js` (ou caminho equivalente que o repo ja use pra
  hooks).
- Cria `src/hooks/useProfile.js`.
- Painel/log de debug temporario e guardado, so pra smoke test em preview.

**NAO mexe:**
- ProtectedRoute, gate de subscription, `cora_subscription` localStorage (D.4).
- Reads existentes das telas (Home, Perfil, etc.) continuam como estao.
- Endpoints `/api/subscriptions` (continuam vivos pro fluxo legado).
- Nada de escrita.

---

## API dos hooks

Plain JS (portal nao usa TS). Padrao de retorno consistente entre os dois.

### useSubscription()
Retorna `{ subscription, loading, error }`:
- `subscription`: objeto da linha ou `null` (sem sessao, ou usuario sem assinatura).
- `loading`: boolean.
- `error`: Error ou null.

Query (ajustar nomes de coluna ao schema real):
```js
const { data, error } = await supabase
  .from('subscriptions')
  .select('id,status,qty_total,qty_original,qty_integral,zona_entrega,' +
          'cep,rua,numero,complemento,bairro,cidade,estado,' +
          'asaas_customer_id,asaas_subscription_id,' +
          'created_at,updated_at,activated_at,paused_at,cancelled_at')
  .eq('user_id', userId)
  .maybeSingle();
```
- `.eq('user_id', userId)` e redundante com a RLS, mas explicito por clareza.
- `.maybeSingle()`: 0 ou 1 linha. Se vier mais de uma (nao deveria, modelo unico),
  maybeSingle lanca erro. Tratar como sinal de dado inconsistente, propagar no
  `error`, nao silenciar.

### useProfile()
Retorna `{ profile, loading, error }`:
```js
const { data, error } = await supabase
  .from('profiles')
  .select('user_id,nome,whatsapp,cpf')
  .eq('user_id', userId)
  .maybeSingle();
```

### Comportamento comum
- Fetch no mount; refetch se o usuario da sessao mudar.
- Cleanup com flag de ignore (ou AbortController, se o repo ja usa esse padrao em
  fetch) pra evitar setState apos unmount.
- Sem sessao/usuario: retornar `{ data: null, loading: false, error: null }` sem
  crashar. Os hooks nao podem derrubar o app quando montados sem sessao.
- Nao cachear globalmente nesta etapa; estado local do hook basta.

---

## Validacao (preview Vercel)

Hooks nao sao consumidos em producao, entao pra ver a saida em preview:
- Adicionar um painel de debug TEMPORARIO e GUARDADO (so sob `?dev` ou
  `import.meta.env.DEV`) que renderiza o JSON de useProfile() e useSubscription().
- No PR, declarar explicitamente se o painel foi removido antes do ready ou se
  ficou atras de guard de dev. NAO mergear painel de debug exposto em producao.

Smoke tests:
1. Logar como `hugo+dev@acora.com.br` via magic link (o link cai na caixa do hugo@).
2. useProfile retorna nome/whatsapp/cpf semeados.
3. useSubscription retorna status='active', qty_total=2, qty_original=1,
   qty_integral=1, zona_entrega='Zona 1', endereco semeado.
4. Sem sessao (logout): ambos retornam null, loading false, sem erro, sem crash.
5. (Opcional) Confirmar no Network que a query vai direto pro Supabase (PostgREST),
   nao por um endpoint /api.

---

## Pre-requisito (Hugo ja executou antes da sessao)

- Usuario `hugo+dev@acora.com.br` criado e confirmado no dashboard Supabase.
- Seed de profile + subscription de teste rodado no SQL Editor (inclui as colunas
  legadas NOT NULL que ainda existem ate a contract).

Se ao validar o useSubscription vier vazio, primeiro confirmar que o seed rodou e
que o login foi feito como o dev (e nao outro usuario).

---

## Pontos de parada obrigatorios (adicionais aos do template, seguem apos o item 8)

9. Nao tocar no ProtectedRoute, no gate de subscription, nem em `cora_subscription`.
10. Nao consumir os hooks nas telas de producao. So o painel de debug guardado.
11. Nao criar endpoint server-side nem segundo client supabase.
12. Nao escrever no banco. D.2 e read-only.
13. Nao mergear painel de debug exposto em producao.

---

## Heads-up pra D.3 (nao e desta sessao)

Enquanto a migration de cleanup (86e1mc0ta) nao rodar, a tabela subscriptions ainda
tem as colunas legadas como NOT NULL. Entao o onboarding da D.3, ao inserir uma
subscription nova, vai ter que preencher tanto as colunas novas quanto as legadas.
O seed do usuario dev ja demonstra esse conjunto de campos.

---

## Refs

- Migration 0018 (D.1) — origem das colunas novas e das policies.
- 86e1mcyuz — furo de escrita (nao afeta D.2, read-only).
- 86e1mc0ta — cleanup/contract (dropa as colunas legadas depois do cutover).
- PORTAL_STATUS.md — estado do portal.
