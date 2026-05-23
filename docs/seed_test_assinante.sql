-- ============================================================
-- Seed: assinante de teste pro Preview do Portal Cora
-- ============================================================
-- Versão: 1 (2026-05-14)
-- Branch primária de uso: feat/cardapio-refactor
--
-- O Portal não usa Supabase Auth — a "sessão" é o `id` da
-- subscription persistido em `localStorage['cora_subscription']`.
-- Pra logar como um assinante, basta criar a row no banco e colar
-- o JSON snapshot no localStorage do navegador (Seção 4).
--
-- Fluxo de teste:
--   1. Rodar Seção 1 + 2 (cria o assinante ativo) no SQL Editor do
--      Supabase ou via psql.
--   2. (Opcional) Rodar uma alternativa da Seção 3 pra testar
--      diferentes estados de `weekly_order`.
--   3. Acessar o Preview e seguir o snippet da Seção 4.
--   4. Quando terminar, rodar Seção 5 pra limpar.
--
-- Convenções:
--   - ID do assinante: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`
--     (UUID v4 literal, fácil de copiar/colar e reutilizar.)
--   - ID do weekly_order: `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`
--   - INSERTs usam ON CONFLICT DO UPDATE pra serem re-runnable.
--
-- Schema referenciado:
--   - 0001_initial.sql        → tabela `subscriptions`
--   - 0002_capacity_gate.sql  → tabela `app_settings`
--   - 0003_weekly_orders.sql  → tabela `weekly_orders`
-- ============================================================


-- ─── 1. Setup: garantir que vagas estão abertas ──────────────
-- Sem isso, o portal pode jogar o user pra CapacityWaitlist.
UPDATE app_settings SET subscriptions_open = true WHERE id = 1;


-- ─── 2. Inserir assinante de teste ───────────────────────────
-- status = 'active' destrava o portal direto (sem banner de
-- pending_payment) e libera POSTs no /api/weekly-orders.
-- itens = {original:1, integral:1} → 2 pães por semana,
-- valor_paes = 2 * 99 = 198,00; valor_frete = 15,00; total 213,00.
INSERT INTO subscriptions (
  id, nome, whatsapp, email, cpf,
  cep, rua, numero, complemento, bairro, cidade, estado,
  itens, total_paes, valor_paes, valor_frete, valor_mensal,
  status, coverage_unconfirmed
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Beatriz Silva',
  '21999999999',                                -- só dígitos (canonicalizado)
  'beatriz.teste@example.com',
  '12345678901',                                -- CPF dummy só dígitos (validador aceita esse formato porque conta dígitos; em prod o validador checa DV — pra teste local, valor literal funciona desde que entre direto via SQL)
  '22070011',                                   -- CEP só dígitos
  'Avenida Atlântica',
  '1500',
  'Bloco A, apto 502',
  'Copacabana',
  'Rio de Janeiro',
  'RJ',
  '{"original": 1, "integral": 1}'::jsonb,
  2,
  198.00,
  15.00,
  213.00,
  'active',
  false
)
ON CONFLICT (id) DO UPDATE SET
  status               = EXCLUDED.status,
  itens                = EXCLUDED.itens,
  total_paes           = EXCLUDED.total_paes,
  valor_paes           = EXCLUDED.valor_paes,
  valor_frete          = EXCLUDED.valor_frete,
  valor_mensal         = EXCLUDED.valor_mensal,
  coverage_unconfirmed = EXCLUDED.coverage_unconfirmed,
  updated_at           = NOW();


-- ─── 3. (Opcional) Estados de weekly_order pra testar a UI ───
-- Os 4 cenários abaixo são MUTUAMENTE EXCLUSIVOS — há UNIQUE
-- (subscription_id, delivery_date) na tabela. Roda no máximo
-- UM deles por vez. Pra trocar de cenário: DELETE o anterior
-- antes (ou usa Seção 5 e re-roda Seção 2 + Seção 3 nova).
--
-- delivery_date: hardcoded `2026-05-21` (quinta após hoje 14/05/2026).
-- Se a data já estiver no passado quando você for testar, ajuste
-- pra a próxima quinta editável. Helper inline pra calcular:
--   SELECT (CURRENT_DATE + ((4 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7 || ' days')::interval)::date AS prox_quinta;
-- Lembrete: cutoff é terça 12h BRT (= 15h UTC). Após o cutoff de
-- uma quinta, o backend rejeita POSTs nela com 409 cutoff_passed.

-- 3a. SEM weekly_order — pular esta seção inteira.
--     Estado da UI: cesta segue a assinatura, sem badge, sem
--     microcopy especial. Botão "Confirmar pedido" não aparece.

-- 3b. RASCUNHO com 1 extra (Focaccia).
--     Estado da UI: badge "Pedido não confirmado", microcopy
--     "Confirme seu pedido até terça, 12h…", botão "Confirmar
--     pedido" visível.
INSERT INTO weekly_orders (
  id, subscription_id, delivery_date,
  composition, extras, total_extras,
  status, first_extra_added_at
) VALUES (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '2026-05-21',
  null,                                          -- composition = null → segue assinatura
  '[{"id":"focaccia","nome":"Focaccia Genovesa","qty":1,"preco_unit":22.00}]'::jsonb,
  22.00,
  'rascunho',
  NOW() - INTERVAL '30 minutes'                  -- timer ativo, mas < 2h (cron de abandono não dispara)
)
ON CONFLICT (subscription_id, delivery_date) DO UPDATE SET
  composition              = EXCLUDED.composition,
  extras                   = EXCLUDED.extras,
  total_extras             = EXCLUDED.total_extras,
  status                   = EXCLUDED.status,
  confirmed_at             = NULL,
  first_extra_added_at     = EXCLUDED.first_extra_added_at,
  abandonment_warning_sent_at = NULL,
  updated_at               = NOW();

-- 3c. CONFIRMADO. Comentado por padrão; descomentar pra testar.
--     Estado da UI: badge "Confirmada", microcopy "Pedido
--     confirmado em dd/mm.", botão "Confirmar pedido" some.
--
-- INSERT INTO weekly_orders (
--   id, subscription_id, delivery_date,
--   composition, extras, total_extras,
--   status, first_extra_added_at, confirmed_at
-- ) VALUES (
--   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
--   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
--   '2026-05-21',
--   null,
--   '[{"id":"focaccia","nome":"Focaccia Genovesa","qty":1,"preco_unit":22.00}]'::jsonb,
--   22.00,
--   'confirmado',
--   NOW() - INTERVAL '1 hour',
--   NOW() - INTERVAL '5 minutes'
-- )
-- ON CONFLICT (subscription_id, delivery_date) DO UPDATE SET
--   status = 'confirmado', confirmed_at = NOW() - INTERVAL '5 minutes', updated_at = NOW();

-- 3d. SWAP de composição (Original→Integral). Comentado por padrão.
--     Soma da composition (0+2) precisa bater com total_paes (2).
--     Estado da UI: 2× Pão Integral com sublabel "(assinatura, trocado)".
--
-- INSERT INTO weekly_orders (
--   id, subscription_id, delivery_date,
--   composition, extras, total_extras, status
-- ) VALUES (
--   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
--   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
--   '2026-05-21',
--   '{"original": 0, "integral": 2}'::jsonb,
--   '[]'::jsonb,
--   0.00,
--   'rascunho'
-- )
-- ON CONFLICT (subscription_id, delivery_date) DO UPDATE SET
--   composition = EXCLUDED.composition, extras = '[]'::jsonb, total_extras = 0,
--   status = 'rascunho', confirmed_at = NULL, updated_at = NOW();


-- ─── 4. Como acessar no Preview ──────────────────────────────
-- Não tem login no Portal — a sessão é localStorage. Passos:
--
--   a. Abre o Preview da branch
--      (ex: https://cora-portal-git-feat-cardapio-refactor-…vercel.app)
--   b. Acrescenta `?dev=1` na URL pra pular o gate do PreCadastro.
--   c. Abre o DevTools Console (F12 → Console) e cola:
--
--      localStorage.setItem('cora_subscription', JSON.stringify({
--        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
--        status: 'active',
--        nome: 'Beatriz Silva',
--        whatsapp: '(21) 99999-9999',
--        email: 'beatriz.teste@example.com',
--        cpf: '123.456.789-01',
--        endereco: {
--          cep: '22070-011',
--          rua: 'Avenida Atlântica',
--          numero: '1500',
--          complemento: 'Bloco A, apto 502',
--          bairro: 'Copacabana',
--          cidade: 'Rio de Janeiro',
--          estado: 'RJ',
--        },
--        itens: { original: 1, integral: 1 },
--        coverage_unconfirmed: false,
--        createdAt: new Date().toISOString(),
--      }));
--      location.reload();
--
--   d. O portal carrega como Beatriz. `reconcileSubscription()`
--      bate em GET /api/subscriptions/{id} pra confirmar status.
--      Em seguida o useEffect de sync chama GET /api/weekly-orders
--      e popula `weeklyOrders` (vai trazer o que você inseriu em 3b).
--
-- Atalhos úteis na URL:
--   ?dev=1           Bypassa PreCadastro mesmo sem subscription local.
--   ?reset=true      Limpa o localStorage e cai no PreCadastro.
--   ?bypass_cutoff=true  Força cutoff=false no front (só DEV; backend continua validando).
--   ?skip=true       Pula o Onboarding caso ele apareça.


-- ─── 5. Cleanup ──────────────────────────────────────────────
-- Roda no fim do teste pra deixar o banco limpo. Ordem importa:
-- weekly_orders tem FK em subscriptions (ON DELETE CASCADE rodaria
-- automaticamente, mas é mais explícito limpar manualmente).
DELETE FROM weekly_orders WHERE subscription_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DELETE FROM subscriptions WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

-- Bônus: pra limpar SÓ o weekly_order (manter o assinante pra
-- testar outro cenário da Seção 3 sem recriar):
--   DELETE FROM weekly_orders WHERE subscription_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

-- No navegador, após Seção 5:
--   localStorage.removeItem('cora_subscription'); location.reload();
-- (ou simplesmente `?reset=true` na URL)
