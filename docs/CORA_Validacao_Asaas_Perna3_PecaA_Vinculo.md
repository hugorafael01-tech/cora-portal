# Validacao — Asaas Perna 3 / Peca A: endpoint de vinculo asaas_customer_id

**Endpoint:** `POST /api/asaas/vincular`
**Arquivo:** `api/asaas/vincular/index.js`
**Task:** 86e1prrkz

Rodar no **Preview deployment** (Vercel). Banco Supabase e COMPARTILHADO entre
preview e prod — usar a subscription de teste indicada e SEMPRE restaurar ao fim.

---

## Setup

- **Subscription de teste:** Hugo Dev — `b6a0614c-08eb-475d-af28-b2b798590631`.
- **Token de admin:** JWT de um usuario logado cujo email esta em `admin_users`
  (hoje o seed e `hugorafael01@gmail.com`). Pegue o `access_token` da sessao
  Supabase (no portal logado: `localStorage` / DevTools, ou copie do app).
- **Token de nao-admin (caso 2):** JWT de um usuario logado cujo email NAO esta em
  `admin_users` (ex.: um assinante comum). Se nao houver um a mao, ver nota no
  caso 2.
- **`BASE`** = URL do preview deployment.

Atalho pra exportar:

```bash
BASE="https://<preview>.vercel.app"
ADMIN_JWT="<access_token do admin>"
SUB="b6a0614c-08eb-475d-af28-b2b798590631"
```

> Confira o estado inicial no SQL Editor antes de comecar:
> `select id, asaas_customer_id from subscriptions where id = '<SUB>';`
> (esperado: `asaas_customer_id` null).

---

## Casos

### 1. Sem token / token invalido -> 401

```bash
# sem header
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/api/asaas/vincular" \
  -H "Content-Type: application/json" \
  -d '{"subscription_id":"'"$SUB"'","asaas_customer_id":"cus_test_001"}'
# esperado: 401  (body {"error":"missing_token"})

# token lixo
curl -s -X POST "$BASE/api/asaas/vincular" \
  -H "Authorization: Bearer not-a-real-token" \
  -H "Content-Type: application/json" \
  -d '{"subscription_id":"'"$SUB"'","asaas_customer_id":"cus_test_001"}'
# esperado: 401  {"error":"invalid_token"}
```

### 2. Token de usuario NAO-admin -> 403

```bash
curl -s -X POST "$BASE/api/asaas/vincular" \
  -H "Authorization: Bearer $NONADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"subscription_id":"'"$SUB"'","asaas_customer_id":"cus_test_001"}'
# esperado: 403  {"error":"forbidden"}
```

Se nao houver um nao-admin facil de testar: a checagem pode ser exercitada
removendo TEMPORARIAMENTE o email do admin de `admin_users` e repetindo o caso 3
com o `ADMIN_JWT` (deve virar 403); depois re-inserir a linha. Alternativa menos
invasiva: confiar nos casos 3+ (que SO passam porque a query de admin retornou a
linha) como prova de que o gate roda.

> Nao esquecer de re-inserir:
> `insert into admin_users (email, nome) values ('hugorafael01@gmail.com','Hugo Rafael');`

### 3. Admin + subscription valida + customer novo -> 200 (grava)

```bash
curl -s -X POST "$BASE/api/asaas/vincular" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"subscription_id":"'"$SUB"'","asaas_customer_id":"cus_test_001"}'
# esperado: 200  {"subscription_id":"b6a0614c-...","asaas_customer_id":"cus_test_001"}
```

Conferir no banco:
`select asaas_customer_id from subscriptions where id = '<SUB>';` -> `cus_test_001`.

### 4. Mesmo customer + mesma subscription de novo -> 200 no-op (idempotente)

```bash
# repetir o MESMO request do caso 3
curl -s -X POST "$BASE/api/asaas/vincular" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"subscription_id":"'"$SUB"'","asaas_customer_id":"cus_test_001"}'
# esperado: 200  {"subscription_id":"...","asaas_customer_id":"cus_test_001"}  (sem erro, nada muda)
```

### 5. Mesmo customer + OUTRA subscription -> 409 (nao altera)

Precisa de uma 2a subscription. Pegue outro id real:
`select id from subscriptions where id <> '<SUB>' limit 1;` -> chame de `$SUB2`.

```bash
curl -s -X POST "$BASE/api/asaas/vincular" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"subscription_id":"'"$SUB2"'","asaas_customer_id":"cus_test_001"}'
# esperado: 409  {"error":"customer_already_linked"}
```

Conferir que `$SUB2.asaas_customer_id` continua o que era (NAO virou cus_test_001).

### 6. subscription_id inexistente (uuid valido) -> 404

```bash
curl -s -X POST "$BASE/api/asaas/vincular" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"subscription_id":"00000000-0000-0000-0000-000000000000","asaas_customer_id":"cus_test_999"}'
# esperado: 404  {"error":"subscription_not_found"}
```

### 7. subscription_id nao-uuid -> 400 (sem 400 cru do PostgREST)

```bash
curl -s -X POST "$BASE/api/asaas/vincular" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"subscription_id":"nao-sou-uuid","asaas_customer_id":"cus_test_999"}'
# esperado: 400  {"error":"invalid_subscription_id"}
```

### 8. body faltando campo -> 400

```bash
# sem asaas_customer_id
curl -s -X POST "$BASE/api/asaas/vincular" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"subscription_id":"'"$SUB"'"}'
# esperado: 400  {"error":"missing_fields"}

# asaas_customer_id so com espacos (trim -> vazio)
curl -s -X POST "$BASE/api/asaas/vincular" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"subscription_id":"'"$SUB"'","asaas_customer_id":"   "}'
# esperado: 400  {"error":"invalid_customer_id"}

# bonus: metodo errado
curl -s -o /dev/null -w "%{http_code}\n" -X GET "$BASE/api/asaas/vincular"
# esperado: 405
```

---

## Limpeza obrigatoria (banco compartilhado)

Ao fim, restaurar a(s) subscription(s) de teste:

```sql
update subscriptions set asaas_customer_id = null
  where id = 'b6a0614c-08eb-475d-af28-b2b798590631';
-- e $SUB2, se foi tocada (caso 5 nao deveria ter alterado, mas conferir):
-- update subscriptions set asaas_customer_id = null where id = '<SUB2>';
```

Conferir que `admin_users` esta intacto (se o caso 2 mexeu, re-inserir o seed).
