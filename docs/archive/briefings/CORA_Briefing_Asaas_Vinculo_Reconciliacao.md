# Briefing — Asaas: vinculo passa a RECONCILIAR os eventos do cliente

**Repo:** `cora-portal`
**Task:** 86e1prrkz (endpoint de vinculo) / relacionada a 86e1pwnhv (C2)
**Tipo:** evolucao do endpoint POST /api/asaas/vincular (Peca A, ja no ar). Toca a logica do
endpoint. NAO toca schema.
**Sessao de origem:** 03/jun/2026

---

## Por que (o que mudou na operacao)

Hoje o endpoint de vinculo SO grava `subscriptions.asaas_customer_id`. Isso reflete a decisao
B2 ("so casar futuros, nao reprocessar orfaos"), que fazia sentido quando NAO havia nenhum
cliente cadastrado. Agora ha operacao, e a B2 cria uma experiencia confusa, confirmada em teste
real (03/jun):

- Hugo vinculou um pagamento orfao a um assinante.
- O `asaas_customer_id` gravou (a coluna "Vinculo Asaas" virou "vinculado").
- MAS: o pagamento continuou na lista "pra identificar" (porque o evento orfao manteve
  subscription_id null), e o `payment_status` continuou null ("sem status"). Os eventos que JA
  tinham chegado nao foram reprocessados.

Resultado pratico: Hugo vincula e "nada muda" na tela, parecendo que nao funcionou (mas
funcionou). Na operacao real isso vai acontecer SEMPRE: o pagamento chega orfao, Hugo vincula,
e quer ver o pagamento sair de "pra identificar" e o status virar "em dia".

## A evolucao (decisao Hugo, 03/jun): vincular = identificar E reconciliar

Ao vincular, o endpoint passa a fazer TRES coisas (hoje faz so a 1a):

1. Grava `subscriptions.asaas_customer_id` (ja faz).
2. **Carimba `subscription_id` em TODOS os eventos orfaos daquele asaas_customer_id** (os que
   estao com subscription_id null). Todos passam a pertencer aquela subscription -> saem da
   lista "pra identificar". Tambem carimbar `processed_at = now()` neles se ainda estiver null
   (foram processados agora).
3. **Reflete o `payment_status` a partir do evento MAIS RECENTE daquele cliente** (maior
   `received_at`). Regra (decisao Hugo): o mais recente manda, INCLUSIVE se for OVERDUE ->
   'vencido'. Mapeamento (mesmo do webhook):
   - mais recente e PAYMENT_CONFIRMED ou PAYMENT_RECEIVED -> payment_status='em_dia',
     last_payment_at = received_at desse evento (ou now()? ver nota), last_payment_event = tipo.
   - mais recente e PAYMENT_OVERDUE -> payment_status='vencido', last_payment_event = tipo.
   - mais recente e um tipo nao-tratado (ex PAYMENT_CREATED) -> NAO mexe no payment_status (deixa
     como esta). Ainda assim os eventos foram carimbados (passo 2).

NOTA sobre last_payment_at: usar o `received_at` do evento mais recente relevante (quando o
pagamento de fato chegou), nao now() do momento do vinculo. Razao: a data do pagamento e a do
evento, nao a do clique. Se o evento nao tiver uma data confiavel, cair em received_at mesmo.

## Reaproveitar a logica do webhook

O endpoint de webhook (api/webhooks/asaas/index.js) JA TEM a logica de "que payment_status um
event_type produz" (a funcao statusPatchForEvent ou equivalente: CONFIRMED/RECEIVED -> em_dia,
OVERDUE -> vencido). REUSAR essa mesma logica aqui, nao duplicar com regra divergente. Se ela
estiver inline no webhook, considerar extrair pra um helper compartilhado (ex em api/_lib/) pra
os dois usarem a MESMA fonte de verdade. CC avalia: extrair helper (melhor, sem divergencia) vs
replicar (risco de divergir). Recomendo extrair.

---

## Onde isso encaixa no endpoint atual

O endpoint hoje (revisado e validado): auth -> admin check -> validacao -> 404 se sub nao existe
-> idempotencia (mesmo customer mesma sub = no-op) -> conflito (customer em outra sub = 409) ->
grava asaas_customer_id -> 200.

A reconciliacao (passos 2 e 3) entra DEPOIS do passo que grava o asaas_customer_id e ANTES do
200. Ou seja: grava o vinculo, entao reconcilia os eventos, entao responde.

CUIDADOS:
- A reconciliacao NAO pode derrubar o vinculo ja gravado. Se o vinculo gravou mas a
  reconciliacao falhar (erro de query), o endpoint nao deve responder erro de um jeito que faca
  parecer que o vinculo nao aconteceu. Decidir: ou faz tudo numa transacao (ideal, se o supabase
  client permitir de forma simples), ou trata a falha de reconciliacao como nao-fatal (loga, mas
  o vinculo principal vale) e responde 200 com um aviso. CC propoe a abordagem. O importante: o
  estado nao pode ficar inconsistente de um jeito silencioso.
- O caso de NO-OP idempotente (mesmo customer, mesma sub) tambem deveria reconciliar? Sim:
  se Hugo re-vincular o mesmo par, e provavel que seja justamente pra forcar a reconciliacao de
  um evento que chegou depois. Entao o no-op nao deve "pular" a reconciliacao. Reavaliar a ordem:
  talvez a reconciliacao deva rodar mesmo no caminho idempotente. CC analisa e propoe.
- O conflito (409, customer em OUTRA sub) continua barrando ANTES de qualquer reconciliacao
  (nao reconcilia se vai recusar).

---

## Pontos de parada obrigatorios (apos item 8 do template)

9. Reusar a logica de event_type -> payment_status do webhook (extrair helper compartilhado de
   preferencia), NAO duplicar com risco de divergir.
10. Status pelo evento MAIS RECENTE (received_at), incluindo virar 'vencido' se o mais recente
    for OVERDUE. Tipo nao-tratado nao mexe no status.
11. Carimbar subscription_id em TODOS os eventos orfaos daquele customer (nao so o mais
    recente); processed_at=now() nos que estiverem null.
12. last_payment_at = received_at do evento relevante, nao now() do clique.
13. Reconciliacao nao pode deixar estado inconsistente silencioso: transacao OU falha
    nao-fatal com log e vinculo preservado. CC propoe.
14. Caminho idempotente (no-op) deve reconciliar tambem (re-vincular pode ser pra forcar
    reconciliacao de evento novo). CC analisa a ordem.
15. Conflito 409 continua barrando antes de reconciliar. NAO toca schema. NAO mexe na camada de
    CORS (ja feita).

---

## Validacao (preview/prod, banco compartilhado, evt_test_*)

CC entrega o SQL de setup/limpeza. Casos:
1. **Reconciliacao basica:** inserir 1 evento orfao (cus_test_recon, PAYMENT_RECEIVED,
   subscription_id null). Vincular a Hugo Dev -> apos vincular: o evento fica com
   subscription_id = Hugo Dev e processed_at preenchido; subscriptions.payment_status = 'em_dia',
   last_payment_at = data do evento; o orfao some da lista "pra identificar"; a Hugo Dev aparece
   vinculada E em dia.
2. **Mais recente manda (OVERDUE depois de RECEIVED):** inserir 2 eventos do mesmo customer, um
   RECEIVED (mais antigo) e um OVERDUE (mais recente, received_at maior). Vincular -> ambos
   carimbados com subscription_id; payment_status = 'vencido' (o mais recente). 
3. **Mais recente manda (RECEIVED depois de OVERDUE):** inverter as datas -> payment_status =
   'em_dia'.
4. **Tipo nao-tratado mais recente:** se o mais recente for PAYMENT_CREATED -> eventos
   carimbados, mas payment_status nao muda. (opcional)
5. **Nao-regressao:** os casos da Peca A (401/403/404/400/409) continuam iguais. O 200 agora faz
   a reconciliacao alem de gravar.
6. **Limpeza:** delete dos evt_test_*; update subscriptions set asaas_customer_id=null,
   payment_status=null, last_payment_at=null, last_payment_event=null where id = Hugo Dev.

Branch propria, PR draft, sem push direto no main (protegido).

---

## Refs

- Endpoint: api/asaas/vincular/index.js (Peca A + CORS ja aplicados).
- Logica de status a reusar: api/webhooks/asaas/index.js (statusPatchForEvent: CONFIRMED/
  RECEIVED -> em_dia, OVERDUE -> vencido).
- Tabela de eventos: asaas_webhook_events (event_type, asaas_customer_id, subscription_id,
  received_at, processed_at). Orfaos = subscription_id null.
- subscriptions: payment_status (enum em_dia/vencido), last_payment_at, last_payment_event,
  asaas_customer_id.
- Decisao original B2 (so casar futuros) era da task 86e1pfph9 / 86e1ngu34 — agora evoluida:
  ao vincular, reconcilia os eventos passados daquele cliente.
- A UI (backoffice) NAO muda: ela ja faz refetch apos o 200, entao vai refletir o novo estado
  (orfao sai, status vira em dia) automaticamente. So o endpoint muda.
