-- ============================================================
-- Migration 004 — Passos especiais de Focaccia e Brioche
-- ============================================================
-- Esses dois produtos têm processos que divergem do template
-- padrão de 7 passos. Focaccia tem estica+dimples antes de
-- assar. Brioche tem adição de manteiga em 3 tempos durante
-- o batimento + fermentação mista (levain + fermento seco).
-- ============================================================


-- 1. FOCACCIA — 8 passos (7 padrão + estica/dimples)
-- Cocção: forno muito quente, sem vapor
WITH v AS (
  SELECT rv.id FROM recipe_versions rv
  JOIN recipes r ON r.id = rv.recipe_id
  JOIN products p ON p.id = r.product_id
  WHERE p.slug = 'focaccia' AND rv.version_number = 1
)
INSERT INTO recipe_steps (recipe_version_id, step_order, title, expected_time_offset, expected_duration, critical_variable, contextual_note)
SELECT v.id, 1, 'Autólise',              '30 minutes',           '40 minutes', 'T° água (°C)',
  'Misturar farinha + 75% da água. Descanso 40min em TA.' FROM v
UNION ALL SELECT v.id, 2, 'Batimento',             '1 hour 10 minutes',     '15 minutes', 'T° massa pós-batimento (°C)',
  'Adiciona levain, sal, H2O2 (25%) e azeite da massa. Massa bem hidratada (75%).' FROM v
UNION ALL SELECT v.id, 3, 'Dobras (4× a 30min)',   '1 hour 30 minutes',     '2 hours',    'Número de dobras realizadas',
  '4 dobras coil pra desenvolver estrutura com alta hidratação.' FROM v
UNION ALL SELECT v.id, 4, 'Fermentação primária',  '3 hours 30 minutes',    '2 hours',    'Duração + T° ambiente',
  'Fermentar até dobrar de tamanho.' FROM v
UNION ALL SELECT v.id, 5, 'Estica no tabuleiro',   '5 hours 30 minutes',    '30 minutes', 'Dimensões do tabuleiro (60×40)',
  'Untar assadeira 60×40cm com azeite generoso. Esticar massa ocupando todo o tabuleiro.' FROM v
UNION ALL SELECT v.id, 6, 'Fermentação no tabuleiro','6 hours',             '1 hour',     'Crescimento visível',
  'Fermentar na assadeira até visível aumento de volume.' FROM v
UNION ALL SELECT v.id, 7, 'Dimples + cobertura',   '7 hours',              '15 minutes', 'Azeite cobertura generoso',
  'Fazer dimples profundos com os dedos. Cobrir com cebola roxa + alecrim + sal grosso + 5% de azeite por cima.' FROM v
UNION ALL SELECT v.id, 8, 'Cocção direta',         '7 hours 15 minutes',    '20 minutes', 'T° forno real',
  'Forno bem quente: Lastro 250° / Teto 260°. 15-20min. Sem vapor. SEM retardo TF.' FROM v;

-- Nota: focaccia não vai pra retardo na geladeira. Vai direto pro forno depois do dimples.
-- Por isso o 7º passo não é "retardo TF" — é "dimples" e o 8º é "cocção".


-- 2. BRIOCHE — 9 passos (fermentação mista + manteiga em 3 tempos)
-- Fermentação mista: levain (sabor) + fermento seco (leveza)
-- Manteiga adicionada em 3 tempos no batimento
WITH v AS (
  SELECT rv.id FROM recipe_versions rv
  JOIN recipes r ON r.id = rv.recipe_id
  JOIN products p ON p.id = r.product_id
  WHERE p.slug = 'brioche' AND rv.version_number = 1
)
INSERT INTO recipe_steps (recipe_version_id, step_order, title, expected_time_offset, expected_duration, critical_variable, contextual_note)
SELECT v.id, 1, 'Mistura inicial',           '0 minutes',             '10 minutes', 'T° massa inicial',
  'Misturar farinhas + leite + ovos + açúcar + mel. Sem autólise clássica (massa enriquecida).' FROM v
UNION ALL SELECT v.id, 2, 'Batimento + fermentos',   '10 minutes',            '15 minutes', 'T° massa (°C)',
  'Adicionar levain + fermento seco. Bater até desenvolver glúten. Adicionar sal no fim.' FROM v
UNION ALL SELECT v.id, 3, 'Manteiga em 3 tempos',    '25 minutes',            '20 minutes', 'T° massa (NÃO pode passar de 24°C)',
  'Adicionar manteiga em 3 porções iguais. Cada porção só entra quando a anterior foi absorvida. Massa não pode esquentar.' FROM v
UNION ALL SELECT v.id, 4, 'Dobras (3×)',             '45 minutes',            '1 hour 30 minutes', 'Dobras leves',
  '3 dobras suaves. Massa enriquecida = menos manipulação pra não perder estrutura.' FROM v
UNION ALL SELECT v.id, 5, 'Fermentação primária',    '2 hours 15 minutes',    '2 hours',    'Duração + T° ambiente',
  'Fermentar em TA até crescer ~70% (não dobrar — massa enriquecida sobe menos).' FROM v
UNION ALL SELECT v.id, 6, 'Divisão em bolinhas',     '4 hours 15 minutes',    '20 minutes', 'Peso por bolinha (g)',
  'Dividir em bolinhas de ~52g. 6 bolinhas por forma = 1 unidade de venda.' FROM v
UNION ALL SELECT v.id, 7, 'Shape em forma',          '4 hours 35 minutes',    '15 minutes', 'Forma: 6 bolinhas',
  'Posicionar 6 bolinhas na forma (2×3). Espaço pra crescer.' FROM v
UNION ALL SELECT v.id, 8, 'Retardo TF',              '4 hours 50 minutes',    '14 hours',   'Horário de entrada no TF',
  'Retardo a 4°C. Opcionalmente pode-se deixar fermentar mais em TA antes do retardo.' FROM v
UNION ALL SELECT v.id, 9, 'Egg wash + cocção',       '18 hours 50 minutes',   '35 minutes', 'T° forno, tempo',
  'Pincelar com gema de ovo antes de assar. Cocção 180°C · 30-35min · sem vapor (açúcar carameliza em temp alta).' FROM v;


-- ============================================================
-- FIM MIGRATION 004
-- Focaccia: 8 passos. Brioche: 9 passos. Ambos diferem do template padrão.
-- ============================================================
