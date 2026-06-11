# Briefing — Fix: external_reference nao-uuid cai como falha de reflexo no webhook Asaas

**Repo:** `cora-portal`
**Task:** 86e1pcyzj
**Tipo:** bug de borda no endpoint (api/webhooks/asaas/index.js). NAO toca schema, NAO toca o
contrato de resposta (200/401/400 seguem iguais).
**Sessao de origem:** 02/jun/2026

---

## Diagnostico (FECHADO — confirmado no log da Vercel, nao re-investigar)

Durante a validacao da perna 2, eventos cujo `externalReference` NAO casa com subscription
ficaram com `processed_at` NULL no asaas_webhook_events. Pelo desenho, deveriam ficar com
`processed_at = now()` (foram avaliados ate o fim; null e exclusivo de FALHA real de reflexo).
Reproduzido com 2 ids (evt_test_0001, evt_test_0002), entao nao e artefato de redeploy.

Log da Function (3 chamadas ao Supabase no evento de teste):
- POST asaas_webhook_events -> 201  (evento inserido OK)
- GET subscriptions -> **400**       (a resolucao da subscription FALHOU)
- PATCH asaas_webhook_events -> 204  (carimbo rodou, mas sem processed_at)

CAUSA: o endpoint resolve a subscription com `.eq("id", externalReference)` contra a coluna
`subscriptions.id`, que e UUID. Quando `externalReference` NAO e um uuid valido (ex
"nao-existe", ou um valor digitado errado no painel Asaas), o PostgREST rejeita a query com
HTTP 400 ("invalid input syntax for type uuid"). Esse erro cai no `if (subErr) throw subErr`
dentro do try, vai pro catch, marca `reflectionFailed = true`, e por isso o carimbo final
grava `subscription_id` null mas NAO grava `processed_at`.

Ou seja: um external_reference que simplesmente NAO casa (porque o valor nem e um uuid) esta
sendo tratado como "falha de reflexo" em vez de "nao casou". Conceitualmente errado: nao casar
e um caso NORMAL, nao uma falha.

## Por que importa (nao e so cosmetico)

Na fase 1 a cobranca e criada manualmente no painel do Asaas, e o Hugo digita o
`externalReference` (= id da subscription da Cora) na mao. Se ele errar o valor (digita algo
que nao e um uuid valido), o evento desse pagamento cairia como `processed_at` null = "falha
de reflexo, reprocessar", quando na verdade foi so um valor que nao casa. No painel da perna 3
isso apareceria como erro de sistema a investigar, mascarando que foi um typo. O campo
`processed_at` precisa significar EXCLUSIVAMENTE "falha real" pra ser confiavel.

---

## A correcao

Antes de fazer o `.eq("id", external_reference)`, validar se `external_reference` tem formato
de UUID. Se NAO for uuid, NAO executa a query por id (ela so daria 400): pula direto pro
fallback por `asaas_customer_id`. Se tambem nao casar por ali, fica como "nao casou" legitimo:
`subscription_id` null E `processed_at` carimbado (porque foi avaliado ate o fim, sem erro).

Esqueleto (ajustar ao estilo do arquivo):

```js
// uuid v4/genérico — regex simples basta pra evitar o 400 do PostgREST.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 4a. Resolve a subscription
if (externalReference && UUID_RE.test(externalReference)) {
  const { data: sub, error: subErr } = await supabaseAdmin
    .from("subscriptions").select("id").eq("id", externalReference).maybeSingle();
  if (subErr) throw subErr;          // agora so erra por motivo REAL, nao por uuid invalido
  if (sub) subscriptionId = sub.id;
}
// se externalReference existe mas NAO e uuid: nao tenta por id (evita o 400), cai no fallback.

if (!subscriptionId && asaasCustomerId) {
  // fallback por asaas_customer_id (coluna text, sem problema de cast)
  ...
}
```

### Cuidados

1. O comportamento de "nao casou" tem que resultar em `processed_at` CARIMBADO (reflectionFailed
   permanece false). So erro REAL de query/update (ex: Supabase fora do ar, permissao) pode
   deixar `processed_at` null. Esse e o ponto inteiro do fix.
2. NAO mudar o contrato de resposta: continua 200 pra tudo recebido+persistido, 401 token,
   400 sem id/event, 500 so se nao persistiu. O fix e so na logica de resolucao interna.
3. O fallback por asaas_customer_id ja usa coluna text (sem cast de uuid), entao nao precisa
   de guarda; so a busca por id precisa.
4. Nao mexer no insert do evento (passo 3), na idempotencia (23505), nem no carimbo (4c) —
   so na condicao que dispara a query por id.
5. Robustez geral mantida: o try/catch continua envolvendo tudo; uma falha real ainda cai no
   catch e protege o 200. So que agora "nao-uuid" nao e mais uma falha.

---

## Pontos de parada (apos item 8 do template)

9. So a logica de resolucao (passo 4a). Nao tocar schema, contrato de resposta, insert,
   idempotencia, carimbo.
10. external_reference nao-uuid -> "nao casou" (processed_at carimbado), nunca "falha".
11. processed_at null deve ficar EXCLUSIVO de erro real de query/update (catch por motivo
    legitimo).
12. Nao reintroduzir o 400 do PostgREST: a guarda de uuid tem que vir ANTES do .eq por id.

---

## Validacao (preview/prod — banco compartilhado, usar ids evt_test_*)

Reusar o roteiro da perna 2. Casos-chave deste fix:
1. Evento com external_reference NAO-uuid (ex "nao-existe"), id novo (ex evt_test_0010):
   -> 200; no banco, subscription_id null E **processed_at preenchido** (era o bug).
2. Evento com external_reference uuid VALIDO mas inexistente (ex
   "00000000-0000-0000-0000-000000000000"), id novo: -> 200; subscription_id null,
   processed_at preenchido (nao casa, mas sem erro de cast).
3. Evento com external_reference = subscription real (Hugo Dev
   b6a0614c-08eb-475d-af28-b2b798590631), PAYMENT_RECEIVED, id novo: -> 200; subscription fica
   payment_status='em_dia', last_payment_at preenchido, e o evento com processed_at preenchido.
4. Nao regrediu: idempotencia (reenviar id repetido -> 200, sem 2a linha) e os 405/401/400
   seguem iguais.

Query de verificacao:
```sql
select asaas_event_id, event_type, external_reference, subscription_id, processed_at
from asaas_webhook_events where asaas_event_id like 'evt_test_%' order by received_at desc;
```
Limpeza apos validar:
```sql
delete from asaas_webhook_events where asaas_event_id like 'evt_test_%';
-- se mexeu na Hugo Dev no caso 3, restaurar:
-- update subscriptions set payment_status=null, last_payment_at=null, last_payment_event=null
--   where id = 'b6a0614c-08eb-475d-af28-b2b798590631';
```

Branch propria, PR draft, sem push direto no main (protegido).

---

## Refs

- api/webhooks/asaas/index.js, passo 4a (resolucao da subscription) — onde entra a guarda de uuid.
- Log da Vercel confirmou GET subscriptions -> 400 (uuid invalido) como a causa.
- subscriptions.id e uuid; subscriptions.asaas_customer_id e text (fallback nao precisa de guarda).
- Perna 2 (PR #35 ja mergeado): este fix e um ajuste pontual em cima dela.
