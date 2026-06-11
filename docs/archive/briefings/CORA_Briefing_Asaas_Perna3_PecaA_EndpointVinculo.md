# Briefing — Asaas Perna 3 / Peca A: endpoint de vinculo asaas_customer_id

**Repo:** `cora-portal`
**Task:** 86e1prrkz (subtarefa da perna 3, ancora 86e1pfph9 / 86e1mk8c0)
**Tipo:** endpoint novo (Vercel Function, service_role). NAO toca schema (coluna ja existe).
**Sessao de origem:** 03/jun/2026

---

## Contexto e porque este endpoint existe

O painel do Asaas NAO deixa setar externalReference na criacao manual de cobranca (achado de
02/jun, confirmado na doc oficial). Como o Alpha cria cobranca manual no painel (fase 1), o
casamento evento->assinante tem que ser pelo `asaas_customer_id` (o fallback que o endpoint de
webhook ja implementa e ja foi testado). Mas hoje NAO ha onde gravar o asaas_customer_id na
subscription. Este endpoint e esse "onde".

Fluxo que ele habilita: chega pagamento de assinante novo -> webhook grava o evento sem casar
(subscription_id null) -> Hugo ve no painel (Peca C) -> escolhe a subscription e chama este
endpoint pra vincular o asaas_customer_id -> dali pra frente os pagamentos daquele cliente
casam sozinhos pelo fallback do webhook.

Decisao de arquitetura (Hugo, 02-03/jun): CAMINHO 1. So o cora-portal tem service_role. O
backoffice (SPA pura, so anon key) NAO escreve em subscriptions; chama este endpoint. Respeita
a migration 0019 (que revogou escrita de authenticated em subscriptions).

---

## TAREFA 0 (investigacao, ANTES de codar) — como o admin e identificado

Hugo nao sabe de cabeca como um admin e identificado no sistema, e o endpoint PRECISA checar
isso server-side. Primeira tarefa do CC, sem escrever o endpoint ainda:

1. No `cora-backoffice`: achar a funcao/logica que o backoffice usa pra reconhecer admin. O
   plano referencia `is_admin()` (usada nas policies RLS, ex migrations 0007/0008) e uma
   provavel tabela `admin_users`. CONFIRMAR no schema/migrations:
   - O que a funcao SQL `is_admin()` consulta por baixo? (provavel: existe linha em
     `admin_users` com o `auth.uid()` atual.)
   - Qual a tabela exata, o nome da coluna que guarda o user_id do admin, e se ha flag de
     ativo/role.
2. Por que isso importa pro endpoint: o endpoint usa `supabaseAdmin` (service_role), que
   BYPASSA RLS. Entao a funcao `is_admin()` de RLS NAO se aplica automaticamente. O endpoint
   tera que checar admin por QUERY EXPLICITA: pega o user_id do JWT (padrao do PATCH, abaixo) e
   consulta a tabela de admins pra confirmar que aquele user_id e admin.
3. CC mostra o achado (qual tabela/coluna, como is_admin decide) ANTES de escrever o endpoint.
   Se a identificacao de admin for diferente do esperado (ex: claim no JWT, role do Supabase em
   vez de tabela), o desenho da checagem muda — por isso e tarefa 0.

---

## Padrao de auth a espelhar (do PATCH da D.4, ja no repo)

`handlePatchMine` em `api/subscriptions/index.js` (linhas ~324-335) ja faz a derivacao de
identidade por JWT, e e o molde:

```js
const authHeader = req.headers.authorization || req.headers.Authorization || "";
const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
if (!token) return res.status(401).json({ error: "missing_token" });
const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
if (authErr || !authData?.user) return res.status(401).json({ error: "invalid_token" });
const userId = authData.user.id;
```

DIFERENCA CRUCIAL: o PATCH usa o userId pra mexer na PROPRIA assinatura do usuario
(`.eq("user_id", userId)`) — autorizacao implicita ("so mexe no que e seu"). AQUI o admin mexe
na assinatura de OUTRA pessoa, entao depois de derivar o userId do JWT, o endpoint TEM que
checar que esse userId e admin (a query explicita da Tarefa 0). Sem essa checagem, qualquer
usuario logado poderia vincular customers — falha de autorizacao grave.

---

## Escopo do endpoint

Rota: decidir nome (sugestao `POST /api/asaas/vincular`, arquivo `api/asaas/vincular/index.js`
seguindo a convencao subpasta+index.js). Handler:

1. **Metodo:** so POST -> outros 405.

2. **Auth (JWT) + autorizacao (admin):**
   - Deriva userId do Bearer token (padrao acima). Sem token / invalido -> 401.
   - Checa que userId e admin via query explicita (Tarefa 0). NAO admin -> 403 (forbidden).
     (401 = nao autenticado; 403 = autenticado mas sem permissao. Use 403 aqui.)

3. **Parse e validacao do body:** `{ subscription_id, asaas_customer_id }`.
   - Faltando qualquer um -> 400.
   - `subscription_id` deve ser uuid valido (mesma licao do fix do webhook: guarda de uuid
     antes de bater na coluna uuid, senao PostgREST devolve 400 cru). Se nao for uuid -> 400
     com erro claro (`invalid_subscription_id`).
   - `asaas_customer_id`: validar que e string nao-vazia. (Formato Asaas e tipo "cus_...", mas
     nao travar num regex rigido demais; string nao-vazia basta. Trim.)

4. **Regra: rejeitar se asaas_customer_id ja vinculado a OUTRA subscription** (decisao Hugo):
   - Antes de gravar, consultar se existe subscription com esse asaas_customer_id E id !=
     subscription_id alvo.
   - Se existir -> 409 `{ error: "customer_already_linked" }` (nao sobrescreve; protege contra
     desviar pagamento pro assinante errado).
   - Idempotencia: se o MESMO asaas_customer_id ja estiver na MESMA subscription alvo, NAO e
     erro -> 200 (no-op), retorna o estado atual.

5. **Verifica que a subscription alvo existe:**
   - SELECT da subscription por id. Nao existe -> 404 `{ error: "subscription_not_found" }`.

6. **Grava:** `update subscriptions set asaas_customer_id = <id> where id = <subscription_id>`
   via supabaseAdmin (service_role). Retorna 200 com o essencial
   (`{ subscription_id, asaas_customer_id }` ou a subscription atualizada enxuta).

7. **NAO reprocessa eventos passados** (decisao Hugo: so casar futuros; nao ha orfao porque nao
   ha cliente cadastrado ainda). Este endpoint SO faz o vinculo. O casamento dos PROXIMOS
   eventos daquele customer ja acontece pelo fallback do webhook (perna 2). Nada de varrer
   asaas_webhook_events aqui.

---

## Pontos de parada obrigatorios (apos item 8 do template)

9. Tarefa 0 primeiro: descobrir como admin e identificado e MOSTRAR antes de codar. Nao
   assumir admin_users sem confirmar.
10. Autorizacao admin e OBRIGATORIA e server-side (query explicita, porque service_role bypassa
    RLS). Nao-admin -> 403. Sem isso e furo de seguranca.
11. So service_role (supabaseAdmin). O endpoint e a UNICA via de escrita do asaas_customer_id;
    backoffice nunca escreve direto (respeita 0019).
12. Rejeitar (409) customer ja vinculado a outra subscription. Mesmo customer + mesma
    subscription = no-op 200 (idempotente).
13. Guarda de uuid no subscription_id antes do .eq (licao do fix do webhook).
14. NAO reprocessar eventos / NAO varrer asaas_webhook_events. So o vinculo.
15. NAO toca schema (asaas_customer_id ja existe em subscriptions desde a D.1). NAO escreve a
    UI (Peca C, proxima).

---

## Validacao (preview)

CC entrega instrucoes. Casos:
1. Sem token / token invalido -> 401.
2. Token de usuario NAO-admin (se der pra simular) -> 403. (Se nao houver um nao-admin facil de
   testar, CC explica como exercitar a checagem; no minimo provar que a query de admin roda.)
3. Token de admin + subscription_id valido + asaas_customer_id novo -> 200; no banco,
   subscriptions.asaas_customer_id setado.
4. Mesmo customer + mesma subscription de novo -> 200 no-op (idempotente), sem erro.
5. Mesmo customer + OUTRA subscription -> 409 customer_already_linked, nada alterado.
6. subscription_id inexistente (uuid valido) -> 404.
7. subscription_id nao-uuid -> 400 invalid_subscription_id (sem 400 cru do PostgREST).
8. body faltando campo -> 400.

Usar a Hugo Dev (b6a0614c-08eb-475d-af28-b2b798590631) como subscription de teste; LIMPAR
depois (`update subscriptions set asaas_customer_id = null where id = '...'`). Banco
compartilhado preview/prod — cuidado de sempre restaurar.

Branch propria, PR draft, sem push direto no main (protegido).

---

## Refs

- api/subscriptions/index.js, handlePatchMine (linhas ~324-335): padrao de auth por JWT.
- src/lib/supabase-admin.js: service_role pronto.
- subscriptions.asaas_customer_id: coluna text nullable, existe desde D.1.
- Migration 0019: escrita em subscriptions so service_role (por isso o caminho 1).
- Endpoint de webhook (api/webhooks/asaas/index.js): o fallback por asaas_customer_id que este
  vinculo "alimenta". Veja tambem a guarda UUID_RE la (mesma licao pro subscription_id aqui).
- cora-backoffice: investigar is_admin() / tabela de admins (Tarefa 0).
