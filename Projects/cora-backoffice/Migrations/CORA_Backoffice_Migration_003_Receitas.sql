-- ============================================================
-- Migration 003 — Dados das receitas v1 (ingredientes + passos)
-- Fonte: CORA_Fichas_Producao_v5.xlsx
-- ============================================================
-- Gerada em abril 2026 a partir dos dados reais da ficha.
-- Valores em "base_grams" referem-se a UMA receita (escala base).
-- Multiplicador pra produção real é calculado na aplicação.
-- ============================================================

-- ============================================================
-- PARTE 1 — RECIPE_INGREDIENTS
-- ============================================================

-- 1.1 PÃO ORIGINAL
-- Base 1 receita = 370g de farinha total | produção 9 pães = 6750g de massa
-- Custo por unidade: R$ 4,85
WITH v AS (
  SELECT rv.id FROM recipe_versions rv
  JOIN recipes r ON r.id = rv.recipe_id
  JOIN products p ON p.id = r.product_id
  WHERE p.slug = 'pao-original' AND rv.version_number = 1
)
INSERT INTO recipe_ingredients (recipe_version_id, ingredient_id, baker_percent, base_grams, display_order)
SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'farinha-superiore'),   85.00, 314.00, 1 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'farinha-fv-integral'), 15.00,  56.00, 2 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'levain-liquido'),      20.00,  74.00, 3 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'agua-mineral'),        70.00, 259.00, 4 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'sal-marinho'),          2.00,   7.00, 5 FROM v;

-- Nota técnica na receita:
-- H2O1 (autólise) = 85% da água total | H2O2 (batimento) = 15%
-- Cocção: Lastro 230° / Teto 250° · 38min · Vapor nos primeiros min
-- Dobras: 4 dobras de 30 em 30 min


-- 1.2 PÃO INTEGRAL
-- Base 1 receita = 370g de farinha total | produção 9 pães = 6750g
-- Custo por unidade: R$ 7,64
WITH v AS (
  SELECT rv.id FROM recipe_versions rv
  JOIN recipes r ON r.id = rv.recipe_id
  JOIN products p ON p.id = r.product_id
  WHERE p.slug = 'pao-integral' AND rv.version_number = 1
)
INSERT INTO recipe_ingredients (recipe_version_id, ingredient_id, baker_percent, base_grams, display_order)
SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'farinha-fv-integral'), 60.00, 222.00, 1 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'farinha-mora'),        40.00, 148.00, 2 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'levain-liquido'),      20.00,  74.00, 3 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'agua-mineral'),        75.00, 278.00, 4 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'azeite-luglio'),        6.00,  22.00, 5 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'sal-marinho'),          2.40,   9.00, 6 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'farelo-trigo'),         2.70,  10.00, 7 FROM v;

-- Nota técnica:
-- H2O1 (autólise) = 90% | H2O2 (batimento) = 10%
-- Dobras: 3 dobras (integral = menos manipulação)
-- Azeite por último no batimento (pode ser gelado)
-- Farelo de trigo: polvilhar antes do banneton (crosta)


-- 1.3 MULTIGRÃOS
-- Base 1 receita = 250g farinha | produção 9 pães = 6748g
-- Custo por unidade: R$ 4,66
WITH v AS (
  SELECT rv.id FROM recipe_versions rv
  JOIN recipes r ON r.id = rv.recipe_id
  JOIN products p ON p.id = r.product_id
  WHERE p.slug = 'multigraos' AND rv.version_number = 1
)
INSERT INTO recipe_ingredients (recipe_version_id, ingredient_id, baker_percent, base_grams, display_order)
-- Farinhas
SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'farinha-superiore'),   70.00, 175.00,  1 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'farinha-fv-integral'), 20.00,  50.00,  2 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'farinha-slow'),        10.00,  25.00,  3 FROM v
-- Fermento e líquidos (massa)
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'levain-liquido'),      40.00, 100.00,  4 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'agua-mineral'),        58.00, 145.00,  5 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'sal-marinho'),          2.00,   5.00,  6 FROM v
-- Sementes (6 × 7,68%)
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'gergelim-branco'),      7.68,  19.00,  7 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'gergelim-preto'),       7.68,  19.00,  8 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'quinoa-mista'),         7.68,  19.00,  9 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'linhaca-dourada'),      7.68,  19.00, 10 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'semente-girassol'),     7.68,  19.00, 11 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'semente-abobora'),      7.68,  19.00, 12 FROM v
-- Escaldar (água + sal separados pras sementes)
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'agua-mineral'),        54.00, 135.00, 13 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'sal-marinho'),          1.20,   3.00, 14 FROM v
-- Crosta
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'aveia-fina'),           6.00,  15.00, 15 FROM v;

-- Nota técnica:
-- Água: apenas água autólise (58%). Sem H2O2. Água escaldar é SEPARADA, pra sementes.
-- Sementes escaldadas na terça (prep). Hidratar até quarta em TA. Se calor, gelar.
-- Aveia fina: polvilhar antes do banneton (é a "7ª semente", crosta)
-- Dobras: 4 padrão, pode reduzir pra 2-3 se massa já tiver estrutura


-- 1.4 FOCACCIA
-- Base 1 receita = 1350g farinha | produção 1 tabuleiro = 3150g
-- Custo por tabuleiro: R$ 3,29 (dividir por nº de porções depois)
WITH v AS (
  SELECT rv.id FROM recipe_versions rv
  JOIN recipes r ON r.id = rv.recipe_id
  JOIN products p ON p.id = r.product_id
  WHERE p.slug = 'focaccia' AND rv.version_number = 1
)
INSERT INTO recipe_ingredients (recipe_version_id, ingredient_id, baker_percent, base_grams, display_order)
-- Massa
SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'farinha-superiore'),  100.00, 1350.00, 1 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'levain-liquido'),      30.00,  405.00, 2 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'agua-mineral'),        75.00, 1012.00, 3 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'azeite-luglio'),        3.00,   40.00, 4 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'sal-marinho'),          2.40,   32.00, 5 FROM v
-- Cobertura
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'cebola-roxa'),         15.00,  202.00, 6 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'alecrim-fresco'),       2.00,   27.00, 7 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'sal-grosso'),           1.00,   14.00, 8 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'azeite-luglio'),        5.00,   68.00, 9 FROM v;

-- Nota técnica:
-- H2O1 (autólise) = 75% | H2O2 (batimento) = 25%
-- Cocção: Lastro 250° / Teto 260° · 15-20min · Sem vapor · Forno bem quente
-- 4 dobras, depois esticar na assadeira 60x40cm
-- Dimples com os dedos antes de assar. Azeite generoso.
-- 1 tabuleiro = 9 porções = 1 unidade de venda (validação pendente: task 86e0zqzeb)


-- 1.5 BRIOCHE
-- Base 1 receita = 198g farinha | produção pra 9 formas = 2808g (7 receitas)
-- Custo por forma (6 bolinhas): R$ 8,25
WITH v AS (
  SELECT rv.id FROM recipe_versions rv
  JOIN recipes r ON r.id = rv.recipe_id
  JOIN products p ON p.id = r.product_id
  WHERE p.slug = 'brioche' AND rv.version_number = 1
)
INSERT INTO recipe_ingredients (recipe_version_id, ingredient_id, baker_percent, base_grams, display_order)
SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'farinha-superiore'),   75.00, 148.00,  1 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'semola-rimacinata'),   25.00,  50.00,  2 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'levain-liquido'),      10.00,  20.00,  3 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'fermento-seco'),        1.50,   3.00,  4 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'manteiga-sem-sal'),    30.00,  59.00,  5 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'ovos'),                40.00,  79.00,  6 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'acucar-cristal'),      10.00,  20.00,  7 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'mel'),                  5.00,  10.00,  8 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'leite-integral'),      23.00,  46.00,  9 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'sal-marinho'),          2.00,   4.00, 10 FROM v;

-- Nota técnica:
-- Fermentação mista: levain (sabor) + fermento seco (leveza)
-- 3 dobras. Massa enriquecida = menos manipulação.
-- Cocção: 180°C · 30-35min · Sem vapor (temp baixa porque açúcar carameliza)
-- Egg wash antes de assar
-- 1 forma = 6 bolinhas × ~52g = 1 unidade de venda


-- 1.6 CIABATTA
-- Base 1 receita = 500g farinha | produção 9 pães = 5850g (6 receitas)
-- Custo por unidade: R$ 4,60
WITH v AS (
  SELECT rv.id FROM recipe_versions rv
  JOIN recipes r ON r.id = rv.recipe_id
  JOIN products p ON p.id = r.product_id
  WHERE p.slug = 'ciabatta' AND rv.version_number = 1
)
INSERT INTO recipe_ingredients (recipe_version_id, ingredient_id, baker_percent, base_grams, display_order)
SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'farinha-superiore'),   90.00, 450.00, 1 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'farinha-fv-integral'), 10.00,  50.00, 2 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'levain-liquido'),      22.00, 110.00, 3 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'agua-mineral'),        76.00, 380.00, 4 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'azeite-luglio'),        1.60,   8.00, 5 FROM v
UNION ALL SELECT v.id, (SELECT id FROM ingredients WHERE slug = 'sal-marinho'),          2.20,  11.00, 6 FROM v;

-- Nota técnica:
-- H2O1 (autólise) = 84% | H2O2 (batimento) = 16%
-- 2ª fermentação em COUCHE, não banneton (ficha enfatiza)
-- 4 dobras. NÃO desgasificar. NÃO modelar demais.
-- Divisão retangular ~650g. Sem corte/pestana.
-- Cocção: Lastro 230° / Teto 250° · 25-30min · Vapor


-- ============================================================
-- PARTE 2 — RECIPE_STEPS (template padrão 7 passos)
-- ============================================================
-- Aplicável a pães de fermentação natural direta: Original, Integral,
-- Multigrãos e Ciabatta. Focaccia e Brioche têm passos adicionais
-- (migration 004).
-- ============================================================

-- 2.1 PÃO ORIGINAL — 7 passos
WITH v AS (
  SELECT rv.id FROM recipe_versions rv
  JOIN recipes r ON r.id = rv.recipe_id
  JOIN products p ON p.id = r.product_id
  WHERE p.slug = 'pao-original' AND rv.version_number = 1
)
INSERT INTO recipe_steps (recipe_version_id, step_order, title, expected_time_offset, expected_duration, critical_variable, contextual_note)
SELECT v.id, 1, 'Autólise',          '30 minutes',           '40 minutes', 'T° água (°C)',
  'Misturar farinhas + 85% da água. Descanso 40min em TA máx 23°.' FROM v
UNION ALL SELECT v.id, 2, 'Batimento',         '1 hour 10 minutes',     '15 minutes', 'T° massa pós-batimento (°C) — crítico',
  'Adiciona levain, sal e H2O2 (15% restante da água). Falsa dobra. Alvo: massa ≤ 26°C.' FROM v
UNION ALL SELECT v.id, 3, 'Dobras (4× a 30min)', '1 hour 30 minutes',   '2 hours',    'Número de dobras realizadas',
  '4 dobras de 30 em 30min. Coil ou stretch-and-fold pra alvéolos regulares.' FROM v
UNION ALL SELECT v.id, 4, 'Fermentação primária','3 hours 30 minutes',  '2 hours',    'Duração até dobrar + T° ambiente — crítico diagnóstico',
  'Esperar massa dobrar de tamanho em TA. Registrar horário quando atinge.' FROM v
UNION ALL SELECT v.id, 5, 'Divisão + pré-shape','5 hours 30 minutes',   '30 minutes', 'Peso médio por divisão (g)',
  'Dividir em 9 peças de ~750g. Pré-shape bola solta.' FROM v
UNION ALL SELECT v.id, 6, 'Shape',             '6 hours',              '20 minutes', 'Shape: banneton',
  'Shape final em banneton com farinha de arroz.' FROM v
UNION ALL SELECT v.id, 7, 'Retardo TF',        '6 hours 20 minutes',   '14 hours',   'Horário de entrada no TF',
  'Retardo a 4°C até a cocção na quinta. Lastro 230° / Teto 250° · 38min · Vapor.' FROM v;


-- 2.2 PÃO INTEGRAL — 7 passos (dobras = 3, não 4)
WITH v AS (
  SELECT rv.id FROM recipe_versions rv
  JOIN recipes r ON r.id = rv.recipe_id
  JOIN products p ON p.id = r.product_id
  WHERE p.slug = 'pao-integral' AND rv.version_number = 1
)
INSERT INTO recipe_steps (recipe_version_id, step_order, title, expected_time_offset, expected_duration, critical_variable, contextual_note)
SELECT v.id, 1, 'Autólise',          '30 minutes',           '40 minutes', 'T° água (°C)',
  'Misturar farinhas + 90% da água. Descanso 40min em TA máx 23°.' FROM v
UNION ALL SELECT v.id, 2, 'Batimento',         '1 hour 10 minutes',     '15 minutes', 'T° massa pós-batimento (°C) — crítico',
  'Adiciona levain, sal, H2O2 (10%) e azeite por último (pode ser gelado).' FROM v
UNION ALL SELECT v.id, 3, 'Dobras (3× a 30min)', '1 hour 30 minutes',   '1 hour 30 minutes', 'Número de dobras realizadas',
  'Apenas 3 dobras (integral = menos manipulação pra preservar estrutura).' FROM v
UNION ALL SELECT v.id, 4, 'Fermentação primária','3 hours',             '2 hours',    'Duração + T° ambiente — crítico diagnóstico',
  'Esperar massa dobrar em TA.' FROM v
UNION ALL SELECT v.id, 5, 'Divisão + pré-shape','5 hours',              '30 minutes', 'Peso médio por divisão (g)',
  'Dividir em 9 peças de ~750g. Pré-shape.' FROM v
UNION ALL SELECT v.id, 6, 'Shape',             '5 hours 30 minutes',   '20 minutes', 'Shape: banneton com farelo de trigo',
  'Polvilhar farelo de trigo antes do banneton (crosta).' FROM v
UNION ALL SELECT v.id, 7, 'Retardo TF',        '5 hours 50 minutes',   '14 hours',   'Horário de entrada no TF',
  'Retardo a 4°C. Lastro 230° / Teto 250° · 38min · Vapor.' FROM v;


-- 2.3 MULTIGRÃOS — 7 passos (sementes já escaldadas da terça)
WITH v AS (
  SELECT rv.id FROM recipe_versions rv
  JOIN recipes r ON r.id = rv.recipe_id
  JOIN products p ON p.id = r.product_id
  WHERE p.slug = 'multigraos' AND rv.version_number = 1
)
INSERT INTO recipe_steps (recipe_version_id, step_order, title, expected_time_offset, expected_duration, critical_variable, contextual_note)
SELECT v.id, 1, 'Autólise',          '30 minutes',           '40 minutes', 'T° água (°C) + temperar sementes',
  'Misturar farinhas + água autólise (58%). Sementes já escaldadas da terça devem estar em TA. Se calor, gelar.' FROM v
UNION ALL SELECT v.id, 2, 'Batimento + sementes','1 hour 10 minutes',   '20 minutes', 'T° massa pós-batimento (°C)',
  'Adiciona levain, sal, sementes hidratadas (já escaldadas). Sem H2O2.' FROM v
UNION ALL SELECT v.id, 3, 'Dobras (4× a 30min)', '1 hour 30 minutes',   '2 hours',    'Número de dobras realizadas',
  '4 dobras padrão. Pode reduzir pra 2-3 se massa já tiver estrutura com as sementes.' FROM v
UNION ALL SELECT v.id, 4, 'Fermentação primária','3 hours 30 minutes',  '2 hours',    'Duração + T° ambiente — crítico',
  'Fermentação até dobrar de tamanho em TA.' FROM v
UNION ALL SELECT v.id, 5, 'Divisão + pré-shape','5 hours 30 minutes',   '30 minutes', 'Peso médio por divisão (g)',
  'Dividir em 9 peças de ~750g.' FROM v
UNION ALL SELECT v.id, 6, 'Shape',             '6 hours',              '20 minutes', 'Shape: banneton com aveia fina',
  'Polvilhar aveia fina antes do banneton (7ª semente, crosta).' FROM v
UNION ALL SELECT v.id, 7, 'Retardo TF',        '6 hours 20 minutes',   '14 hours',   'Horário de entrada no TF',
  'Retardo a 4°C. Lastro 230° / Teto 250° · 38min · Vapor.' FROM v;


-- 2.4 CIABATTA — 7 passos (sem corte na cocção)
WITH v AS (
  SELECT rv.id FROM recipe_versions rv
  JOIN recipes r ON r.id = rv.recipe_id
  JOIN products p ON p.id = r.product_id
  WHERE p.slug = 'ciabatta' AND rv.version_number = 1
)
INSERT INTO recipe_steps (recipe_version_id, step_order, title, expected_time_offset, expected_duration, critical_variable, contextual_note)
SELECT v.id, 1, 'Autólise',          '30 minutes',           '40 minutes', 'T° água (°C)',
  'Misturar farinhas + 84% da água. Descanso 40min em TA.' FROM v
UNION ALL SELECT v.id, 2, 'Batimento',         '1 hour 10 minutes',     '15 minutes', 'T° massa pós-batimento (°C)',
  'Adiciona levain, sal, H2O2 (16%) e azeite. Massa bem hidratada, cuidado no manuseio.' FROM v
UNION ALL SELECT v.id, 3, 'Dobras (4× a 30min)', '1 hour 30 minutes',   '2 hours',    'Número de dobras realizadas',
  '4 dobras. NÃO desgasificar — ciabatta precisa dos alvéolos grandes.' FROM v
UNION ALL SELECT v.id, 4, 'Fermentação primária','3 hours 30 minutes',  '2 hours',    'Duração + T° ambiente',
  'Fermentar até dobrar em TA.' FROM v
UNION ALL SELECT v.id, 5, 'Divisão + pré-shape','5 hours 30 minutes',   '20 minutes', 'Peso por divisão (g)',
  'Divisão retangular ~650g. NÃO modelar demais — preservar alvéolos.' FROM v
UNION ALL SELECT v.id, 6, 'Shape em couche',   '5 hours 50 minutes',   '15 minutes', 'Shape: COUCHE (não banneton)',
  '2ª fermentação em couche, NUNCA banneton. Manter separação entre peças.' FROM v
UNION ALL SELECT v.id, 7, 'Retardo TF',        '6 hours 5 minutes',    '14 hours',   'Horário de entrada no TF',
  'Retardo a 4°C. Cocção: Lastro 230° / Teto 250° · 25-30min · Vapor · SEM corte (sem pestana).' FROM v;

-- ============================================================
-- FIM MIGRATION 003
-- Total: 6 receitas com ingredientes completos + 4 receitas com 7 passos cada
-- Focaccia e Brioche: passos na migration 004 (têm variações do template)
-- ============================================================
