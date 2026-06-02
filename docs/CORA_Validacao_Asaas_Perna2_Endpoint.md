# Validação — Asaas Webhooks / Perna 2: Endpoint

**Task âncora:** 86e1mk8c0 · **Perna:** 2 (endpoint que recebe) · **Rota:** `POST /api/webhooks/asaas`

CC entrega o roteiro; **Hugo executa** (tem conta + chaves sandbox). Validar no **Preview**
(lembrando: preview e prod compartilham o mesmo Supabase — `kjzuvmhedicxbuynfqev`).

---

## Pré-requisito: env var (Hugo)

`ASAAS_WEBHOOK_TOKEN` — **server-side, NUNCA `VITE_`**. Passos:

1. Gerar um token forte (ex.: `openssl rand -hex 32`).
2. Setar na Vercel em **Production + Preview** (Settings → Environment Variables), sem o prefixo `VITE_`.
3. Usar o **mesmo** valor ao criar o webhook no painel do Asaas (Sandbox).

> Sem a env var, o endpoint responde **401** a tudo (e loga `ASAAS_WEBHOOK_TOKEN ausente`). CC não inventa nem pede o token.

No painel do **Sandbox** Asaas: criar um webhook apontando para `https://<preview-url>/api/webhooks/asaas`,
com o token no campo de access token (o Asaas envia no header `asaas-access-token`).

---

## Payload de exemplo (simular via curl/Postman)

Substituir `<URL>` pela URL do preview e `<TOKEN>` pelo valor de `ASAAS_WEBHOOK_TOKEN`.

```bash
curl -i -X POST "<URL>/api/webhooks/asaas" \
  -H "Content-Type: application/json" \
  -H "asaas-access-token: <TOKEN>" \
  -d '{
    "id": "evt_test_0001",
    "event": "PAYMENT_RECEIVED",
    "dateCreated": "2026-06-02 10:00:00",
    "payment": {
      "object": "payment",
      "id": "pay_test_0001",
      "customer": "cus_test_0001",
      "subscription": null,
      "externalReference": "<SUBSCRIPTION_ID_REAL>",
      "status": "RECEIVED",
      "value": 312,
      "billingType": "PIX"
    }
  }'
```

`externalReference` = **id da subscription da Cora** (Hugo seta ao criar a cobrança no painel).
Pegar um id real com: `select id, nome, status from subscriptions order by created_at desc limit 5;`

---

## Roteiro de testes

| # | Cenário | Como | Esperado |
|---|---------|------|----------|
| 1 | Método errado | `GET <URL>/api/webhooks/asaas` | `405` |
| 2 | Token errado/ausente | POST sem header `asaas-access-token` (ou com valor errado) | `401`, nada gravado |
| 3 | Payload sem `id`/`event` | POST com token certo mas body `{}` | `400`, nada gravado |
| 4 | Evento válido | POST do exemplo acima (token certo) | `200 {received:true}`; 1 linha em `asaas_webhook_events` |
| 5 | Idempotência | Reenviar o **mesmo** `id` (`evt_test_0001`) | `200`; **sem** 2ª linha na tabela |
| 6 | Casamento + reflexo (RECEIVED) | `externalReference` = subscription real, `event=PAYMENT_RECEIVED` | subscription fica `payment_status='em_dia'`, `last_payment_at` preenchido |
| 7 | Não-casa | `externalReference` que não existe (ex.: `"nao-existe"`) | `200`; evento salvo com `subscription_id` null, `processed_at` preenchido; nenhuma subscription alterada |
| 8 | Overdue | subscription casada, `event=PAYMENT_OVERDUE` | `payment_status='vencido'` |
| 9 | Tipo não-tratado | subscription casada, `event=PAYMENT_CREATED` | `200`; evento salvo, `subscription_id` casado, `processed_at` preenchido, `payment_status` da subscription **inalterado** |

> Para os testes 6/8 use `id`s de evento **diferentes** a cada disparo (`evt_test_0002`, `0003`…), senão a idempotência (teste 5) responde 200 sem reprocessar.

---

## Queries SQL de verificação

```sql
-- Eventos recebidos (mais recentes primeiro)
select asaas_event_id, event_type, payment_status,
       external_reference, subscription_id,
       received_at, processed_at
from asaas_webhook_events
order by received_at desc
limit 20;

-- Conferir idempotência: deve haver no máximo 1 linha por asaas_event_id
select asaas_event_id, count(*)
from asaas_webhook_events
group by asaas_event_id
having count(*) > 1;

-- Reflexo de status na subscription (testes 6 e 8)
select id, nome, status, payment_status, last_payment_at, last_payment_event
from subscriptions
where id = '<SUBSCRIPTION_ID_REAL>';

-- Payload cru de um evento (auditar o que o Asaas mandou)
select payload
from asaas_webhook_events
where asaas_event_id = 'evt_test_0001';
```

### Limpeza dos dados de teste (após validar)

```sql
delete from asaas_webhook_events where asaas_event_id like 'evt_test_%';
-- E, se mexeu numa subscription real, restaurar o estado (ajustar conforme o caso):
-- update subscriptions set payment_status = null, last_payment_at = null, last_payment_event = null where id = '<SUBSCRIPTION_ID_REAL>';
```

---

## Notas de comportamento (pra interpretar os resultados)

- **`processed_at` preenchido** = o endpoint avaliou o evento até o fim (casou ou não, tipo tratado ou não). **`null`** = houve **falha real** ao resolver/refletir (erro de query/update) — o reflexo pode ser reprocessado depois a partir do evento cru.
- **`subscription_id` null** = evento não casou com nenhuma subscription (fica pra resolução manual no painel — perna 3). Não é erro.
- O endpoint **só** reage a `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` (→ `em_dia`) e `PAYMENT_OVERDUE` (→ `vencido`). Todos os outros tipos são registrados crus, sem mexer no `payment_status` (decisão fechada, Hugo 02/jun).
- Falha no reflexo de status **nunca** derruba o `200` (protege a fila do Asaas, que pausa após 15 não-2xx consecutivos).
