-- Limpeza pontual: remove o evento de SANDBOX que virou linha orfa no Financeiro.
--
-- O QUE E: script one-off, pra rodar UMA VEZ SO no SQL editor do Supabase.
-- NAO e migration de proposito. Migration e historico que todo ambiente novo
-- replica, e nenhum ambiente novo precisa reproduzir o apagamento de uma linha
-- de evento de teste de agosto de 2026. Alem disso a numeracao das migrations
-- de asaas_webhook_events pertence a quem governa a tabela, que e o
-- cora-backoffice (migration 0020 de la), nao este repo.
--
-- POR QUE EXISTE: ate 24/08/2026 o endpoint /api/webhooks/asaas gravava
-- qualquer evento que passasse na validacao de token, inclusive os do ambiente
-- sandbox do Asaas — o webhook de sandbox aponta pro mesmo endpoint. Uma
-- cobranca de teste de R$ 213,00 (assinatura "Hugo Dev") virou linha sem
-- assinante vinculado e aparecia no Financeiro do backoffice como "Pagamento
-- pra identificar", sem contraparte no painel de producao pra conferir.
--
-- O fix que impede novos eventos de entrar e outro: PR "fix(webhook): evento de
-- sandbox nao entra em asaas_webhook_events" (cora-portal #83), que descarta o
-- evento antes do insert. Este script so limpa o que ja tinha entrado antes.
--
-- ALVO — linha unica, conferida contra producao em 24/08/2026:
--   asaas_event_id     evt_05b708f961d739ea7eba7e4db318f621&18324580
--   event_type         PAYMENT_CREATED
--   asaas_customer_id  cus_000008013448  (cliente que so existe no sandbox)
--   subscription_id    null              (nunca casou com assinante nenhum)
--   invoiceUrl         https://sandbox.asaas.com/i/71p3842coljq34g0
--   received_at        2026-08-23 03:01:43+00
--
-- Rodar duas vezes e inofensivo: na segunda o DELETE pega 0 linhas.


-- ─── PASSO 1: confira ANTES de apagar ───
-- Rode o SELECT abaixo sozinho (descomente ou copie sem os "--"). Ele tem que
-- voltar EXATAMENTE 1 linha, e ela tem que bater com o ALVO descrito acima.
-- Se voltar 0, alguem ja limpou. Se voltar mais de 1, PARE: o banco nao esta no
-- estado que este script assume e a decisao de escopo (limpar so a linha do
-- cus_000008013448) precisa ser revista antes de apagar qualquer coisa.
--
-- select asaas_event_id, event_type, asaas_customer_id, subscription_id,
--        payload->'payment'->>'invoiceUrl' as invoice_url, received_at
-- from asaas_webhook_events
-- where asaas_customer_id = 'cus_000008013448'
--   and payload->'payment'->>'invoiceUrl' like 'https://sandbox.asaas.com/%';


-- ─── PASSO 2: o DELETE ───
-- So depois de conferir o passo 1.
--
-- Os dois predicados juntos de proposito. O customer id sozinho ficaria
-- generico demais se um dia esse id passar a existir em producao; o host de
-- sandbox sozinho pegaria QUALQUER outro evento de teste que tenha entrado, e a
-- decisao (Hugo, 24/08/2026) foi limpar so a linha do cus_000008013448.
delete from asaas_webhook_events
where asaas_customer_id = 'cus_000008013448'
  and payload->'payment'->>'invoiceUrl' like 'https://sandbox.asaas.com/%';
