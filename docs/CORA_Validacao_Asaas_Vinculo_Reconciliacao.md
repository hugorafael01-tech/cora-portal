# Validacao — Asaas: vinculo passa a RECONCILIAR os eventos do cliente

**Endpoint:** `POST /api/asaas/vincular` (evolucao da Peca A)
**Task:** 86e1prrkz

Rodar no **Preview** (ou prod). Banco Supabase COMPARTILHADO preview/prod — usar ids
`evt_test_*` e a Hugo Dev, e rodar a LIMPEZA do fim sempre.

---

## Setup

```bash
BASE="https://<preview>.vercel.app"     # ou https://app.acora.com.br
ADMIN_JWT="<access_token de admin>"      # email em admin_users (hugorafael01@gmail.com)
SUB="b6a0614c-08eb-475d-af28-b2b798590631"   # Hugo Dev
CUS="cus_test_recon"                     # customer de teste
```

Estado inicial esperado (SQL Editor):
```sql
select id, asaas_customer_id, payment_status, last_payment_at, last_payment_event
  from subscriptions where id = 'b6a0614c-08eb-475d-af28-b2b798590631';
-- esperado: asaas_customer_id null, payment_status null, last_payment_* null
```

`received_at` e `payload` (jsonb NOT NULL) sao obrigatorios no insert; uso datas
fixas pra controlar "qual e o mais recente".

---

## Caso 1 — Reconciliacao basica (RECEIVED -> em_dia, orfao sai)

Insere 1 evento orfao:
```sql
insert into asaas_webhook_events
  (asaas_event_id, event_type, asaas_customer_id, subscription_id, payload, received_at, processed_at)
values
  ('evt_test_recon_1', 'PAYMENT_RECEIVED', 'cus_test_recon', null, '{}'::jsonb,
   '2026-06-01T10:00:00Z', null);
```

Vincula:
```bash
curl -s -X POST "$BASE/api/asaas/vincular" \
  -H "Authorization: Bearer $ADMIN_JWT" -H "Content-Type: application/json" \
  -d '{"subscription_id":"'"$SUB"'","asaas_customer_id":"'"$CUS"'"}'
# esperado: 200 {"subscription_id":"b6a0614c-...","asaas_customer_id":"cus_test_recon",
#                "reconciled":true,"payment_status":"em_dia"}
```

Confere:
```sql
-- evento deixou de ser orfao e foi processado:
select asaas_event_id, subscription_id, processed_at
  from asaas_webhook_events where asaas_event_id = 'evt_test_recon_1';
-- esperado: subscription_id = Hugo Dev, processed_at preenchido

-- subscription em dia, data = a do EVENTO (nao a do clique):
select asaas_customer_id, payment_status, last_payment_at, last_payment_event
  from subscriptions where id = '<SUB>';
-- esperado: cus_test_recon / em_dia / 2026-06-01T10:00:00Z / PAYMENT_RECEIVED
```

> Reset entre casos (mantendo o vinculo do proximo caso explicito):
> ```sql
> delete from asaas_webhook_events where asaas_event_id like 'evt_test_recon%';
> update subscriptions set asaas_customer_id=null, payment_status=null,
>   last_payment_at=null, last_payment_event=null where id = '<SUB>';
> ```

## Caso 2 — Mais recente manda: OVERDUE depois de RECEIVED -> vencido

```sql
insert into asaas_webhook_events
  (asaas_event_id, event_type, asaas_customer_id, subscription_id, payload, received_at)
values
  ('evt_test_recon_a', 'PAYMENT_RECEIVED', 'cus_test_recon', null, '{}'::jsonb, '2026-06-01T10:00:00Z'),
  ('evt_test_recon_b', 'PAYMENT_OVERDUE',  'cus_test_recon', null, '{}'::jsonb, '2026-06-05T10:00:00Z');
```
Vincula (mesmo curl do caso 1). Esperado no corpo: `"reconciled":true,"payment_status":"vencido"`.
```sql
-- ambos carimbados; status do mais recente (OVERDUE):
select asaas_event_id, subscription_id from asaas_webhook_events
  where asaas_event_id in ('evt_test_recon_a','evt_test_recon_b');  -- ambos = Hugo Dev
select payment_status, last_payment_event from subscriptions where id='<SUB>';
-- esperado: vencido / PAYMENT_OVERDUE
```
(OVERDUE nao seta last_payment_at — fica o que estava. Correto: vencido nao e "pagou".)
Reset (bloco acima, trocando o LIKE pra `evt_test_recon%`).

## Caso 3 — Mais recente manda: RECEIVED depois de OVERDUE -> em_dia

Igual ao caso 2, datas invertidas:
```sql
insert into asaas_webhook_events
  (asaas_event_id, event_type, asaas_customer_id, subscription_id, payload, received_at)
values
  ('evt_test_recon_a', 'PAYMENT_OVERDUE',  'cus_test_recon', null, '{}'::jsonb, '2026-06-01T10:00:00Z'),
  ('evt_test_recon_b', 'PAYMENT_RECEIVED', 'cus_test_recon', null, '{}'::jsonb, '2026-06-05T10:00:00Z');
```
Vincula. Esperado: `"payment_status":"em_dia"`, `last_payment_at = 2026-06-05T10:00:00Z`,
`last_payment_event = PAYMENT_RECEIVED`. Reset.

## Caso 4 — Tipo nao-tratado mais recente nao mexe no status (opcional)

```sql
insert into asaas_webhook_events
  (asaas_event_id, event_type, asaas_customer_id, subscription_id, payload, received_at)
values
  ('evt_test_recon_a', 'PAYMENT_RECEIVED', 'cus_test_recon', null, '{}'::jsonb, '2026-06-01T10:00:00Z'),
  ('evt_test_recon_b', 'PAYMENT_CREATED',  'cus_test_recon', null, '{}'::jsonb, '2026-06-05T10:00:00Z');
```
Vincula. Esperado no corpo: `"reconciled":true,"payment_status":null` (o mais recente e
PAYMENT_CREATED -> nao mexe). MAS os eventos foram carimbados (passo b/c):
```sql
select asaas_event_id, subscription_id, processed_at from asaas_webhook_events
  where asaas_event_id like 'evt_test_recon%';  -- ambos = Hugo Dev, processed_at preenchido
select payment_status from subscriptions where id='<SUB>';  -- continua null (nao mexeu)
```
Reset.

## Caso 5 — Idempotente reconcilia (re-vincular forca reconciliacao de evento novo)

```sql
-- 1o evento + vinculo:
insert into asaas_webhook_events
  (asaas_event_id, event_type, asaas_customer_id, subscription_id, payload, received_at)
values ('evt_test_recon_1','PAYMENT_RECEIVED','cus_test_recon',null,'{}'::jsonb,'2026-06-01T10:00:00Z');
```
Vincula (200, em_dia). Agora chega um evento NOVO depois, ainda orfao:
```sql
insert into asaas_webhook_events
  (asaas_event_id, event_type, asaas_customer_id, subscription_id, payload, received_at)
values ('evt_test_recon_2','PAYMENT_OVERDUE','cus_test_recon',null,'{}'::jsonb,'2026-06-07T10:00:00Z');
```
Re-vincula o MESMO par (caminho idempotente):
```bash
curl -s -X POST "$BASE/api/asaas/vincular" \
  -H "Authorization: Bearer $ADMIN_JWT" -H "Content-Type: application/json" \
  -d '{"subscription_id":"'"$SUB"'","asaas_customer_id":"'"$CUS"'"}'
# esperado: 200 reconciled:true, payment_status:"vencido" (o novo evento entrou)
```
```sql
select asaas_event_id, subscription_id from asaas_webhook_events
  where asaas_event_id = 'evt_test_recon_2';  -- agora = Hugo Dev (orfao reconciliado)
select payment_status from subscriptions where id='<SUB>';  -- vencido
```
Prova: o no-op NAO pula a reconciliacao. Reset.

## Caso 6 — Nao-regressao da Peca A (com a Hugo Dev limpa)

```bash
# 401: token invalido
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/api/asaas/vincular" \
  -H "Authorization: Bearer lixo" -H "Content-Type: application/json" \
  -d '{"subscription_id":"'"$SUB"'","asaas_customer_id":"x"}'                 # 401

# 400: subscription_id nao-uuid (sem 400 cru do PostgREST)
curl -s -X POST "$BASE/api/asaas/vincular" \
  -H "Authorization: Bearer $ADMIN_JWT" -H "Content-Type: application/json" \
  -d '{"subscription_id":"nao-uuid","asaas_customer_id":"x"}'                 # 400 invalid_subscription_id

# 404: uuid valido inexistente
curl -s -X POST "$BASE/api/asaas/vincular" \
  -H "Authorization: Bearer $ADMIN_JWT" -H "Content-Type: application/json" \
  -d '{"subscription_id":"00000000-0000-0000-0000-000000000000","asaas_customer_id":"x"}'  # 404

# 409: customer em OUTRA sub. Precisa de uma 2a sub ($SUB2) ja com este customer.
#   Setup: update subscriptions set asaas_customer_id='cus_conflito' where id='<SUB2>';
curl -s -X POST "$BASE/api/asaas/vincular" \
  -H "Authorization: Bearer $ADMIN_JWT" -H "Content-Type: application/json" \
  -d '{"subscription_id":"'"$SUB"'","asaas_customer_id":"cus_conflito"}'      # 409 customer_already_linked
#   Limpar: update subscriptions set asaas_customer_id=null where id='<SUB2>';
```
(403 nao-admin: como na Peca A, exige um JWT de nao-admin ou remover/re-inserir o seed.)

---

## Limpeza obrigatoria (banco compartilhado)

```sql
delete from asaas_webhook_events where asaas_event_id like 'evt_test_recon%';
update subscriptions set asaas_customer_id=null, payment_status=null,
  last_payment_at=null, last_payment_event=null
  where id = 'b6a0614c-08eb-475d-af28-b2b798590631';
-- se o caso 6 usou $SUB2:
-- update subscriptions set asaas_customer_id=null where id='<SUB2>';
```
Conferir que nao sobrou nenhum `evt_test_*` e a Hugo Dev voltou a tudo-null.
