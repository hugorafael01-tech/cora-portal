# Briefing — Asaas Webhooks / Perna 2: ENDPOINT (cora-portal)

**Repo:** `cora-portal`
**Task ancora:** 86e1mk8c0 (Financeiro: webhooks Asaas)
**Esta perna:** o endpoint que RECEBE os webhooks. Perna 1 (schema, migration 0020) ja
esta no ar. Perna 3 (painel no backoffice) e a seguinte, NAO entra aqui.
**Sessao de origem:** 02/jun/2026

---

## O que ja existe (perna 1, confirmado no banco)

- Tabela `asaas_webhook_events`: id uuid PK, `asaas_event_id` text UNIQUE NOT NULL (guarda
  de idempotencia), event_type text NOT NULL, asaas_payment_id, asaas_customer_id,
  external_reference, subscription_id uuid FK->subscriptions (nullable), payment_status text,
  payload jsonb NOT NULL, received_at timestamptz default now(), processed_at timestamptz null.
  Escrita SO service_role; leitura admin via is_admin().
- `subscriptions`: colunas novas `payment_status` (enum payment_status_enum:
  em_dia/pendente/vencido), `last_payment_at` timestamptz, `last_payment_event` text. Todas
  nullable, ainda null.

## Padrao da casa (confirmado lendo api/subscriptions/index.js e src/lib/supabase-admin.js)

- Vercel Function: `export default async function handler(req, res)`, dispatch por
  `req.method`. Reusa `supabaseAdmin` de `../../src/lib/supabase-admin.js` (service_role, ja
  instanciado, bypassa RLS, so node-side).
- `req.body` chega JA PARSEADO como objeto JSON nessas Functions (o subscriptions faz
  `const body = req.body` direto). CONFIRMAR que vale pro webhook tambem (primeira coisa a
  checar — ver pontos de parada). Se por algum motivo vier raw/string, o body.event/body.id
  quebram.
- Erros: `console.error("[prefixo]", ...)`. Calculos/decisoes no servidor, nunca confiando
  no payload do cliente.

## Fatos do Asaas (confirmados na doc oficial, 02/jun)

- Header do token: `asaas-access-token`, enviado em TODA notificacao. Definido por nos ao
  criar o webhook no painel Asaas.
- UM evento por requisicao, JSON: `{ id: "evt_...", event: "PAYMENT_RECEIVED", dateCreated,
  payment: { object:"payment", id:"pay_...", customer:"cus_...", subscription:"sub_..."|null,
  externalReference, status, value, billingType, ... } }`. Nao vem em lote.
- Resposta tem que ser 2xx (>=200 <300). Responder 200 SO depois de persistir o evento (a
  doc e explicita: nao ha garantia de reenvio automatico).
- Se o endpoint falhar (nao-2xx) 15 vezes consecutivas, o Asaas PAUSA a fila inteira e para
  de enviar ate reativacao manual no painel. Por isso o endpoint tem que ser robusto: nunca
  lançar excecao por campo inesperado.
- Idempotencia: o mesmo evt id pode chegar mais de uma vez (retry). O exemplo oficial e
  exatamente: INSERT com unique em asaas_event_id; se vier 23505, responder 2xx e parar.
- Campos novos no payload podem aparecer sem aviso. O codigo NAO pode quebrar com atributo
  desconhecido (senao pausa a fila). Guardar payload cru em jsonb resolve.

## Decisoes tomadas (recorte da frente, ja alinhadas com Hugo)

- Fase 1: cobranca criada MANUALMENTE no painel Asaas. Casamento evento->assinante via
  `payment.externalReference` = id da subscription da Cora (Hugo seta ao criar a cobranca).
- "Pago" do lado da Cora dispara com `PAYMENT_CONFIRMED` OU `PAYMENT_RECEIVED` (cartao tem
  RECEIVED so 32 dias depois do CONFIRMED; Pix vai direto a RECEIVED). "Vencido" com
  `PAYMENT_OVERDUE`.
- Notificacao = painel no backoffice (perna 3). SEM WhatsApp/email nesta perna.

---

## Escopo da perna 2

Criar `api/webhooks/asaas/index.js` (ou `api/webhooks/asaas.js`, seguindo a convencao de
rotas do repo — verificar como subscriptions resolve a rota /api/subscriptions). Handler:

### 1. Metodo e auth
- So `POST`. Outros -> 405.
- Ler o header `asaas-access-token`. Comparar com `process.env.ASAAS_WEBHOOK_TOKEN` (nova env
  var, server-side, NUNCA VITE_). Se ausente ou diferente -> 401, sem processar nada.
  - Comparacao deve ser segura (evitar vazar timing); se for trivial demais, ok comparar
    string direta no Alpha, mas registrar a env var como obrigatoria (lançar/avisar se faltar,
    igual o supabase-admin faz com as suas).

### 2. Parse e extracao (defensivo)
- `const body = req.body || {}`. Extrair `asaas_event_id = body.id`, `event_type = body.event`,
  `payment = body.payment || {}`.
- Se faltar `body.id` ou `body.event` -> 400 (payload malformado; nao e retry valido). Logar.
- Extrair do payment (todos opcionais, defensivo): `asaas_payment_id = payment.id`,
  `asaas_customer_id = payment.customer`, `external_reference = payment.externalReference`,
  `payment_status = payment.status`.
- NAO validar/assumir nenhum campo alem de id e event. Qualquer outro ausente nao pode
  quebrar (campos novos/faltantes do Asaas).

### 3. Idempotencia + persistencia (grava PRIMEIRO, responde 200)
- INSERT em `asaas_webhook_events` com: asaas_event_id, event_type, asaas_payment_id,
  asaas_customer_id, external_reference, payment_status, payload (o body inteiro, cru),
  subscription_id (resolvido no passo 4 se der — ver nota de ordem abaixo).
- Se o insert vier com erro `23505` (unique violation no asaas_event_id) -> evento ja
  recebido. Responder 200 imediatamente e PARAR (idempotente). Nao reprocessar.
- Se outro erro de insert -> responder NAO-2xx (500) e logar. (Aqui SIM queremos o nao-2xx:
  se nao conseguimos persistir, o Asaas deve reenviar; melhor a fila insistir do que perder o
  evento. Mas atencao: erro de insert persistente derruba a fila em 15 tentativas. Logar bem.)
- So responder 200 APOS confirmar a persistencia.

### 4. Resolver a subscription e refletir o status (apos persistir)
Ordem recomendada (decidir com o CC, ver nota): o caminho mais simples e resolver a
subscription ANTES do insert (pra ja gravar subscription_id no evento), mas o insert do evento
nao pode falhar so porque nao casou. Alternativa: insert primeiro com subscription_id null,
depois resolver e dar update no evento + na subscription. CC escolhe o mais limpo, desde que:
(a) o evento SEMPRE seja persistido mesmo sem casar; (b) a resposta 200 saia rapido.

Resolver a subscription:
- Por `external_reference` (= id da subscription da Cora) -> `subscriptions.id`. Caminho
  principal (Hugo seta no painel).
- Fallback opcional: por `asaas_customer_id` -> `subscriptions.asaas_customer_id` (se ja
  estiver preenchido). No Alpha pode nao estar; se nao casar, tudo bem: o evento fica
  registrado com subscription_id null e aparece no painel pra resolucao manual.
- Se nao casar, NAO e erro. Loga e segue (o evento esta salvo, o painel mostra).

Refletir o status na subscription (so se casou):
- `PAYMENT_CONFIRMED` ou `PAYMENT_RECEIVED` -> `payment_status = 'em_dia'`,
  `last_payment_at = now()`, `last_payment_event = event_type`.
- `PAYMENT_OVERDUE` -> `payment_status = 'vencido'`, `last_payment_event = event_type`.
- Outros eventos (PAYMENT_CREATED, PAYMENT_UPDATED, etc.) -> NAO mudam payment_status (so
  ficam registrados no evento cru). DECISAO FECHADA (Hugo, 02/jun): esta perna trata SO
  CONFIRMED/RECEIVED -> em_dia e OVERDUE -> vencido. NAO setar 'pendente' a partir de
  PAYMENT_CREATED agora: a cobranca e manual na fase 1 e o estado inicial da assinatura ja e
  pending_payment no outro eixo (subscriptions.status). O 'pendente' do payment_status fica
  pra fase 2 (criacao automatica da cobranca). Registrar todos os eventos crus de qualquer
  forma.
- Marcar `processed_at = now()` no evento apos refletir.
- IMPORTANTE: uma falha ao refletir o status NAO pode derrubar a resposta 200. O evento ja
  esta salvo (a fonte da verdade). Se o update do status falhar, logar e ainda responder 200
  (o reflexo pode ser reprocessado depois a partir do evento cru; processed_at fica null).
  Isso protege a fila do Asaas.

### 5. Resposta
- 200 `{ received: true }` em: sucesso, evento duplicado (23505), evento que nao casou,
  evento de tipo nao-tratado. Tudo que foi recebido e persistido responde 200.
- 401 em token invalido. 400 em payload sem id/event. 500 so se nao conseguiu PERSISTIR o
  evento.

---

## Env var nova

`ASAAS_WEBHOOK_TOKEN` (server-side, sem VITE_). O valor e o mesmo token que o Hugo vai
definir no painel do Asaas ao criar o webhook. Documentar no briefing que o Hugo precisa:
(a) gerar um token forte, (b) por no env da Function (Vercel, escopo Production e Preview),
(c) usar o MESMO ao criar o webhook no painel Asaas. CC NAO inventa o token nem pede a chave;
so referencia a env var.

---

## Pontos de parada obrigatorios (apos item 8 do template)

9. PRIMEIRO confirmar que `req.body` chega parseado como objeto JSON nesta Function (como no
   subscriptions). Se a rota /api/webhooks/asaas precisar de config diferente de body parsing,
   PARAR e avisar antes de prosseguir.
10. So service_role (supabaseAdmin). Cliente nunca escreve em asaas_webhook_events.
11. Responder 200 SO apos persistir o evento. Falha de reflexo de status NAO derruba o 200.
12. Endpoint robusto a campos inesperados: nunca lançar excecao por atributo novo/faltante do
    payload (senao pausa a fila do Asaas). So id e event sao obrigatorios.
13. Idempotencia por 23505 no asaas_event_id -> 200 e para.
14. Nao tocar schema (perna 1 ja fez). Nao escrever o painel (perna 3). So o endpoint.
15. ASAAS_WEBHOOK_TOKEN server-side, nunca VITE_. Avisar se faltar (nao inventar valor).

---

## Decisao fechada (Hugo, 02/jun)

- `PAYMENT_CREATED` (cobranca gerada, ainda nao paga) NAO seta payment_status. O endpoint so
  reage a CONFIRMED/RECEIVED (-> em_dia) e OVERDUE (-> vencido). 'pendente' fica pra fase 2.

---

## Validacao (preview + sandbox Asaas)

CC entrega as instrucoes; Hugo executa (tem conta + chaves sandbox). Roteiro:
1. Hugo configura um webhook no SANDBOX do Asaas apontando pra URL do preview
   (.../api/webhooks/asaas), com o token.
2. Token errado -> 401 (testar mandando um POST sem o header correto, ex via curl/Postman).
3. Evento valido (Hugo dispara um pagamento de teste no sandbox, ou simula o POST com um
   payload de exemplo da doc) -> 200, e o evento aparece em asaas_webhook_events (Hugo
   confere via SQL).
4. Reenviar o MESMO evt id -> 200 (idempotente), sem segunda linha na tabela.
5. Evento com external_reference = id de uma subscription real (hugo+dev ou a de teste) e
   event PAYMENT_RECEIVED -> a subscription fica payment_status='em_dia', last_payment_at
   preenchido (Hugo confere via SQL).
6. Evento com external_reference que nao casa -> 200, evento salvo com subscription_id null,
   nenhuma subscription alterada.
7. Evento PAYMENT_OVERDUE numa subscription casada -> payment_status='vencido'.
CC entrega as queries SQL de verificacao + um exemplo de payload pra simular. Branch propria,
PR draft, sem push direto no main (protegido).

---

## Refs

- Doc Asaas: receba-eventos-do-asaas-no-seu-endpoint-de-webhook, payment-events,
  how-to-implement-idempotence-in-webhooks, sobre-os-webhooks (fila pausa em 15 falhas).
- api/subscriptions/index.js (padrao de Function, supabaseAdmin, tratamento 23505).
- src/lib/supabase-admin.js (service_role pronto, reusar).
- Migration 0020 (perna 1): a tabela e as colunas que este endpoint popula.
- Eventos relevantes: PAYMENT_CONFIRMED, PAYMENT_RECEIVED (-> em_dia), PAYMENT_OVERDUE
  (-> vencido). Demais: registrados crus, sem mexer no status (por ora).
