-- ============================================================
-- Seed: smoke da tela Perfil (Frente C item 4 - Fase 1)
-- ============================================================
-- Versao: 1 (2026-05-20)  ·  Branch: feat/perfil-readonly-modal-recibo
--
-- Diferente do seed_test_assinante.sql (que cria 1 pedido da semana
-- corrente pro carrinho da Home), este popula ENTREGAS PASSADAS
-- confirmadas pra exercitar o Historico e a Cobranca do Perfil.
--
-- O Perfil le:
--   - GET /api/subscriptions/{id}      -> valor_paes, valor_frete (decomposicao + B2)
--   - GET /api/weekly-orders?history=true -> entregas passadas (delivery_date < hoje,
--                                            status='confirmado', desc, limit 4)
--   - Dados pessoais vem do snapshot do localStorage (Secao 4).
--
-- Datas de entrega sao quintas-feiras passadas calculadas a partir
-- de CURRENT_DATE (a tabela tem CHECK DOW=4). Robusto independente
-- do dia em que voce rodar:
--   d1 = quinta mais recente ESTRITAMENTE antes de hoje
--   d2 = d1 - 7   ·   d3 = d1 - 14
--
-- IDs:
--   assinante: aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
--   pedidos:   cccccccc-...-0001 / 0002 / 0003
-- INSERTs sao re-runnable (ON CONFLICT DO UPDATE).
-- ============================================================


-- ─── 0. Vagas abertas (evita CapacityWaitlist) ───────────────
UPDATE app_settings SET subscriptions_open = true WHERE id = 1;


-- ─── 1. Assinante base (B1 padrao: frete R$ 15) ──────────────
-- itens {original:1, integral:1} = 2 paes; valor_paes 198, frete 15, mensal 213.
INSERT INTO subscriptions (
  id, nome, whatsapp, email, cpf,
  cep, rua, numero, complemento, bairro, cidade, estado,
  itens, total_paes, valor_paes, valor_frete, valor_mensal,
  status, coverage_unconfirmed
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Beatriz Silva',
  '21999999999',
  'beatriz.teste@example.com',
  '12345678901',
  '22070011',
  'Avenida Atlantica',
  '1500',
  'Bloco A, apto 502',
  'Copacabana',
  'Rio de Janeiro',
  'RJ',
  '{"original": 1, "integral": 1}'::jsonb,
  2, 198.00, 15.00, 213.00,
  'active', false
)
ON CONFLICT (id) DO UPDATE SET
  status = 'active', itens = EXCLUDED.itens, total_paes = EXCLUDED.total_paes,
  valor_paes = EXCLUDED.valor_paes, valor_frete = EXCLUDED.valor_frete,
  valor_mensal = EXCLUDED.valor_mensal, updated_at = NOW();


-- ─── 2. Limpa entregas anteriores deste assinante ────────────
-- (rode sempre antes de montar um cenario de Historico)
DELETE FROM weekly_orders WHERE subscription_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';


-- ════════════════════════════════════════════════════════════
-- CENARIOS DE HISTORICO (A1 / A2 / A3) — rode UM por vez.
-- Cada bloco assume que a Secao 2 (limpeza) rodou antes.
-- d1 = focaccia (extra) -> alimenta a linha "Extras" da Cobranca.
-- ════════════════════════════════════════════════════════════

-- ─── A1. Idle completo: 3 entregas confirmadas (sem "Ver todos") ───
INSERT INTO weekly_orders (id, subscription_id, delivery_date, composition, extras, total_extras, status, confirmed_at)
VALUES
  ('cccccccc-cccc-4ccc-8ccc-cccccccc0001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   (CURRENT_DATE - COALESCE(NULLIF((EXTRACT(DOW FROM CURRENT_DATE)::int - 4 + 7) % 7, 0), 7) * INTERVAL '1 day')::date,
   null, '[{"id":"focaccia","nome":"Focaccia Genovesa","qty":1,"preco_unit":22.00}]'::jsonb, 22.00, 'confirmado', NOW() - INTERVAL '7 days'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccc0002','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   (CURRENT_DATE - COALESCE(NULLIF((EXTRACT(DOW FROM CURRENT_DATE)::int - 4 + 7) % 7, 0), 7) * INTERVAL '1 day' - INTERVAL '7 days')::date,
   null, '[]'::jsonb, 0.00, 'confirmado', NOW() - INTERVAL '14 days'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccc0003','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   (CURRENT_DATE - COALESCE(NULLIF((EXTRACT(DOW FROM CURRENT_DATE)::int - 4 + 7) % 7, 0), 7) * INTERVAL '1 day' - INTERVAL '14 days')::date,
   null, '[]'::jsonb, 0.00, 'confirmado', NOW() - INTERVAL '21 days')
ON CONFLICT (subscription_id, delivery_date) DO UPDATE SET
  composition = EXCLUDED.composition, extras = EXCLUDED.extras,
  total_extras = EXCLUDED.total_extras, status = 'confirmado',
  confirmed_at = EXCLUDED.confirmed_at, updated_at = NOW();
-- Esperado: Historico com 3 linhas (d1 com "+ Focaccia Genovesa R$ 22,00"),
-- sem "Ver todos". Cobranca: Assinatura 198 + Extras 22 + Frete 15 = 235.
-- (d2/d3 nao entram nos Extras se cairem em mes anterior ao corrente.)

-- ─── A3. Parcial: 2 entregas (descomente; rode Secao 2 antes) ───
-- INSERT INTO weekly_orders (id, subscription_id, delivery_date, composition, extras, total_extras, status, confirmed_at)
-- VALUES
--   ('cccccccc-cccc-4ccc-8ccc-cccccccc0001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
--    (CURRENT_DATE - COALESCE(NULLIF((EXTRACT(DOW FROM CURRENT_DATE)::int - 4 + 7) % 7, 0), 7) * INTERVAL '1 day')::date,
--    null, '[{"id":"focaccia","nome":"Focaccia Genovesa","qty":1,"preco_unit":22.00}]'::jsonb, 22.00, 'confirmado', NOW() - INTERVAL '7 days'),
--   ('cccccccc-cccc-4ccc-8ccc-cccccccc0002','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
--    (CURRENT_DATE - COALESCE(NULLIF((EXTRACT(DOW FROM CURRENT_DATE)::int - 4 + 7) % 7, 0), 7) * INTERVAL '1 day' - INTERVAL '7 days')::date,
--    null, '[]'::jsonb, 0.00, 'confirmado', NOW() - INTERVAL '14 days')
-- ON CONFLICT (subscription_id, delivery_date) DO UPDATE SET
--   composition = EXCLUDED.composition, extras = EXCLUDED.extras,
--   total_extras = EXCLUDED.total_extras, status = 'confirmado',
--   confirmed_at = EXCLUDED.confirmed_at, updated_at = NOW();

-- ─── A2. Vazio (cliente novo): so rode a Secao 2 (sem inserts) ───
-- Esperado: "Voce ainda nao tem entregas. / Sua primeira chega em DD/MM."


-- ════════════════════════════════════════════════════════════
-- TOGGLE DE FRETE (B1 <-> B2) — independente do cenario A acima.
-- ════════════════════════════════════════════════════════════

-- ─── B2. Condominio ativo: frete gratis ───
-- UPDATE subscriptions SET valor_frete = 0.00, valor_mensal = valor_paes, updated_at = NOW()
--   WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
-- Esperado: Frete "R$ 0,00" verde + "frete gratis - programa condominio".
-- Total (com A1) = 198 + 22 + 0 = 220.

-- ─── B1. Volta ao frete padrao ───
-- UPDATE subscriptions SET valor_frete = 15.00, valor_mensal = valor_paes + 15.00, updated_at = NOW()
--   WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';


-- ─── 4. Acessar no Preview (sessao = localStorage) ───────────
--   a. Abre o Preview da branch e (se cair no PreCadastro) usa ?dev=1
--   b. DevTools Console e cola:
--
--      localStorage.setItem('cora_subscription', JSON.stringify({
--        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
--        status: 'active',
--        nome: 'Beatriz Silva',
--        whatsapp: '(21) 99999-9999',
--        email: 'beatriz.teste@example.com',
--        cpf: '123.456.789-01',
--        endereco: { cep:'22070-011', rua:'Avenida Atlantica', numero:'1500',
--          complemento:'Bloco A, apto 502', bairro:'Copacabana',
--          cidade:'Rio de Janeiro', estado:'RJ' },
--        itens: { original: 1, integral: 1 },
--        coverage_unconfirmed: false,
--        createdAt: new Date().toISOString(),
--      })); location.reload();
--
--   c. Vai na aba Perfil.


-- ─── 5. Cleanup ──────────────────────────────────────────────
-- DELETE FROM weekly_orders WHERE subscription_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
-- DELETE FROM subscriptions WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
-- No navegador: localStorage.removeItem('cora_subscription'); location.reload();
