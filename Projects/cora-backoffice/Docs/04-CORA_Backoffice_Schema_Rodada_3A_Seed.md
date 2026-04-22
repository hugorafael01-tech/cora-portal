# Cora Backoffice — Schema Rodada 3A

## Seed completo do MVP

*Dados iniciais pra popular o banco logo após rodar as migrations.*

**Versão:** v1.1 (abril 2026) — atualizada com dados reais do `CORA_Fichas_Producao_v5.xlsx`
**Stack:** PostgreSQL 16 + pg (node-postgres) + dbmate
**Mudanças vs v1 inicial:**
- Pesos unitários corrigidos (615g/615g/615g/258g/256g/533g)
- Ingredientes ampliados (26 ingredientes, não 16) conforme ficha real
- `retail_price` agora NULL no seed (decisão: preço fica pra conversa dedicada, com benchmark Nema)
- Custos apurados incluídos como referência

---

## Princípios do seed

1. **Ordem de inserção importa** — FKs exigem dependências criadas antes
2. **Dados da ficha v5.xlsx são fonte da verdade** — pesos, % baker, gramas base, custos
3. **Idempotência** — `ON CONFLICT DO NOTHING` pra rodar várias vezes sem erro
4. **Sem UUIDs hard-coded** — IDs gerados por `gen_random_uuid()`, referências via CTE/subquery

---

## 1. Fornecedores

```sql
INSERT INTO suppliers (name, lead_time_days, notes)
VALUES
  ('CCN (Le 5 Stagioni)', 3, 'Farinhas italianas importadas. Superiore, Mora, Manitoba, Semola Rimacinata. Saco 10kg.'),
  ('Fazenda Vargem', 15, 'Farinha integral moída a pedra. Também fornece Farinha Slow (semi-integral). Saco 10kg, validade 3 meses.')
ON CONFLICT DO NOTHING;
```

---

## 2. Ingredientes (26 itens da ficha v5)

Lista completa, incluindo itens que apareceram nas fichas específicas (focaccia, multigrãos).

```sql
INSERT INTO ingredients (slug, name, unit, description)
VALUES
  -- Farinhas (5)
  ('farinha-superiore', 'Farinha Superiore', 'g', 'Le 5 Stagioni Tipo 0 W330. Farinha branca principal. R$ 12,26/kg.'),
  ('farinha-mora', 'Farinha Mora', 'g', 'Le 5 Stagioni. Integral italiana, sabor marcante. R$ 23,41/kg. Val. 8 meses.'),
  ('farinha-manitoba', 'Farinha Manitoba', 'g', 'Le 5 Stagioni. Alta força, usada em brioche e fermentações longas. (não usada no MVP, pré-cadastrada)'),
  ('semola-rimacinata', 'Semola Rimacinata', 'g', 'Le 5 Stagioni. Sêmola de trigo duro, usada em brioche. R$ 22,19/kg.'),
  ('farinha-fv-integral', 'Farinha FV Integral', 'g', 'Fazenda Vargem. Moída a pedra, integral. R$ 7,90/kg.'),
  ('farinha-slow', 'Farinha Slow (FV)', 'g', 'Fazenda Vargem. Semi-integral, usada no multigrãos. R$ 9,95/kg.'),

  -- Líquidos (2)
  ('agua-mineral', 'Água mineral', 'g', 'Água mineral para levain e massa. R$ 0,75/kg.'),
  ('leite-integral', 'Leite integral', 'g', 'Leite integral para brioche. R$ 7,99/kg.'),

  -- Sal e açúcar (3)
  ('sal-marinho', 'Sal marinho', 'g', 'Sal marinho fino. R$ 14,69/kg.'),
  ('sal-grosso', 'Sal grosso', 'g', 'Sal grosso para cobertura de focaccia. R$ 8,00/kg.'),
  ('acucar-cristal', 'Açúcar cristal', 'g', 'Açúcar cristal branco para brioche. R$ 7,96/kg.'),

  -- Gorduras (2)
  ('azeite-luglio', 'Azeite Luglio', 'g', 'Azeite extra-virgem Luglio (CCN). R$ 98,00/kg. Bombona 5L = R$ 489,99.'),
  ('manteiga-sem-sal', 'Manteiga sem sal', 'g', 'Manteiga sem sal para brioche. R$ 73,45/kg.'),

  -- Ovos e mel (2)
  ('ovos', 'Ovos', 'g', 'Preço por kg, não por unidade. R$ 39,93/kg. Usado no brioche.'),
  ('mel', 'Mel', 'g', 'Mel para brioche. R$ 38,00/kg.'),

  -- Fermento (2)
  ('levain-liquido', 'Levain líquido', 'g', 'Fermento natural da Cora. Proporção 1:2:2.'),
  ('fermento-seco', 'Fermento seco', 'g', 'Fermento instantâneo seco. Usado em pequena proporção no brioche (ferm. mista). R$ 80,00/kg.'),

  -- Sementes e grãos (6)
  ('gergelim-branco', 'Gergelim branco', 'g', 'Semente para multigrãos. R$ 4,29/kg.'),
  ('gergelim-preto', 'Gergelim preto', 'g', 'Semente para multigrãos. R$ 9,18/kg.'),
  ('quinoa-mista', 'Quinoa mista', 'g', 'Semente para multigrãos. Insumo mais caro das sementes. R$ 49,90/kg.'),
  ('linhaca-dourada', 'Linhaça dourada', 'g', 'Semente para multigrãos. R$ 2,79/kg.'),
  ('semente-girassol', 'Semente girassol', 'g', 'Para multigrãos. R$ 4,95/kg.'),
  ('semente-abobora', 'Semente abóbora', 'g', 'Para multigrãos. R$ 9,25/kg.'),

  -- Crostas e coberturas (3)
  ('aveia-fina', 'Aveia fina', 'g', 'Cobertura do multigrãos (7ª semente). R$ 8,00/kg.'),
  ('farelo-trigo', 'Farelo de trigo', 'g', 'Cobertura do integral. R$ 5,00/kg.'),

  -- Cobertura focaccia (2)
  ('cebola-roxa', 'Cebola roxa', 'g', 'Cobertura da focaccia. R$ 12,00/kg.'),
  ('alecrim-fresco', 'Alecrim fresco', 'g', 'Cobertura da focaccia. R$ 60,00/kg.')

ON CONFLICT (slug) DO NOTHING;
```

**Observação:** Farinha Manitoba está pré-cadastrada mas não é usada em nenhuma das 6 receitas do MVP. Fica no catálogo pra facilitar expansão futura (ex: pizza com biga).

---

## 3. Supplies (insumos físicos com estoque)

```sql
WITH ccn AS (SELECT id FROM suppliers WHERE name = 'CCN (Le 5 Stagioni)'),
     fv  AS (SELECT id FROM suppliers WHERE name = 'Fazenda Vargem')

INSERT INTO supplies (supplier_id, ingredient_id, name, current_stock_grams, min_stock_grams, weekly_consumption_grams)
SELECT ccn.id, (SELECT id FROM ingredients WHERE slug = 'farinha-superiore'), 'Farinha Superiore (saco 10kg)', 10000, 5000, 8000 FROM ccn
UNION ALL SELECT ccn.id, (SELECT id FROM ingredients WHERE slug = 'farinha-mora'), 'Farinha Mora (saco 10kg)', 10000, 3000, 1300 FROM ccn
UNION ALL SELECT ccn.id, (SELECT id FROM ingredients WHERE slug = 'semola-rimacinata'), 'Semola Rimacinata (saco 10kg)', 10000, 3000, 320 FROM ccn
UNION ALL SELECT fv.id, (SELECT id FROM ingredients WHERE slug = 'farinha-fv-integral'), 'Farinha FV Integral (saco 10kg)', 10000, 5000, 3000 FROM fv
UNION ALL SELECT fv.id, (SELECT id FROM ingredients WHERE slug = 'farinha-slow'), 'Farinha Slow (saco 10kg)', 10000, 3000, 220 FROM fv;
```

**Consumo semanal** é estimativa inicial baseada na planilha (somei a coluna "Produção (g)" de cada farinha). Será recalibrado com dados reais após primeiras semanas.

---

## 4. Plano default (Assinatura)

```sql
INSERT INTO plans (slug, name, price_per_item, shipping_price, active, description)
VALUES
  ('default', 'Assinatura Cora', 99.00, 15.00, true, 'Plano único. R$ 99 por pão semanal + R$ 15 frete fixo. Cliente escolhe 1 a 3 pães entre Original e Integral.')
ON CONFLICT (slug) DO NOTHING;
```

**Nota:** nome "Assinatura Cora" é uso interno. O cliente só vê "Minha Assinatura" no Portal — sem nomenclatura de plano.

---

## 5. Produtos (pesos e preços conforme decisões de abril 2026)

```sql
INSERT INTO products (slug, name, type, unit, unit_weight_grams, retail_price, short_description)
VALUES
  ('pao-original', 'Pão Original', 'fabricado', 'un', 615, 27.00,
    'Pão de fermentação natural. Farinha Superiore + FV Integral 15%.'),

  ('pao-integral', 'Pão Integral', 'fabricado', 'un', 615, 29.00,
    'Pão integral 60% FV / 40% Mora, azeite. Fermentação natural.'),

  ('multigraos', 'Multigrãos', 'fabricado', 'un', 615, 32.00,
    'Superiore + FV Integral + Slow + 6 sementes escaldadas. Crosta de aveia fina.'),

  ('focaccia', 'Focaccia', 'fabricado', 'un', 430, 22.00,
    'Focaccia genovesa em tabuleiro 60×40. Porção = 1/6 do tabuleiro (~430g assada).'),

  ('brioche', 'Brioche', 'fabricado', 'un', 256, 32.00,
    'Brioche fermentação mista (levain + fermento seco). Forma com 6 bolinhas, manteiga francesa.'),

  ('ciabatta', 'Ciabatta', 'fabricado', 'un', 533, 25.00,
    'Ciabatta rústica, couche (não banneton). Alveolagem aberta, crosta fina, sem corte.')

ON CONFLICT (slug) DO NOTHING;
```

**Preços definidos em 20/abr/2026** (benchmark Nema + custo real + posicionamento entre Nema e Slow):

| Produto | Custo | Preço avulso | Margem bruta |
|---|---|---|---|
| Original | R$ 4,85 | R$ 27 | 82% |
| Integral | R$ 7,64 | R$ 29 | 74% |
| Multigrãos | R$ 4,66 | R$ 32 | 85% |
| Focaccia (1/6) | R$ 0,55 | R$ 22 | 98% |
| Brioche (forma) | R$ 8,25 | R$ 32 | 74% |
| Ciabatta | R$ 4,60 | R$ 25 | 82% |

**Decisões registradas:**

1. **Swap neutro na Cesta.** Cliente pode trocar Original ↔ Integral 1:1 na Cesta da semana sem custo extra, mesmo que o Integral avulso seja R$ 2 mais caro. Regra implementada na aplicação, não no schema.

2. **Pesos unitários** — todos refletem peso final assado (após perda de cocção de 18%):
   - Original, Integral, Multigrãos: 750g crus → 615g assados
   - Focaccia: 258g por porção (hipótese 1/9 do tabuleiro — task `86e0zqzeb` pendente)
   - Brioche: forma com 6 bolinhas × ~52g crus = 312g → 256g assada
   - Ciabatta: 650g cru → 533g assada

3. **Descrições curtas são rascunho** — Mariane precisa rever a copy antes de ir pro portal. A skill `cora-brand-voice` não foi aplicada ainda.

---

## 6. Elegibilidade para Assinatura

Marca quais produtos podem entrar na Base da Assinatura (não na tabela `plan_products` — essa foi removida).

```sql
UPDATE products SET eligible_for_subscription = true
WHERE slug IN ('pao-original', 'pao-integral');

-- Demais produtos ficam como false (default). Só aparecem no Cardápio como Extras pagos.
```

**No MVP:** apenas Original e Integral são elegíveis para Assinatura. Multigrãos, Focaccia, Brioche e Ciabatta ficam disponíveis apenas como Extras no Cardápio da semana.

Quando algum deles virar recorrente (ex: Multigrãos vira elegível), basta UPDATE. Quando houver múltiplos planos de Assinatura, criar tabela `plan_products` pra relacionar produto × plano.

---

## 7. Receitas estruturais

Grupo sugerido (critérios do Alex) e shape definidos a partir da ficha.

```sql
WITH produtos_fabricados AS (
  SELECT id, slug FROM products
  WHERE type = 'fabricado' AND slug IN (
    'pao-original', 'pao-integral', 'multigraos',
    'focaccia', 'brioche', 'ciabatta'
  )
)
INSERT INTO recipes (product_id, suggested_group, shape)
SELECT
  id,
  CASE slug
    WHEN 'pao-original' THEN 2  -- grupo 2 — fermentação longa
    WHEN 'pao-integral' THEN 3  -- grupo 3 — simples
    WHEN 'multigraos'   THEN 3  -- grupo 3 — simples
    WHEN 'focaccia'     THEN 1  -- grupo 1 — demanda frio (azeite)
    WHEN 'brioche'      THEN 1  -- grupo 1 — demanda frio (manteiga)
    WHEN 'ciabatta'     THEN 2  -- grupo 2 — fermentação longa
  END,
  CASE slug
    WHEN 'pao-original' THEN 'banneton'::recipe_shape
    WHEN 'pao-integral' THEN 'banneton'::recipe_shape  -- corrigido: ficha diz banneton, não couche
    WHEN 'multigraos'   THEN 'banneton'::recipe_shape  -- corrigido: ficha diz banneton
    WHEN 'focaccia'     THEN 'tabuleiro'::recipe_shape -- 60×40 untada com azeite
    WHEN 'brioche'      THEN 'forma'::recipe_shape     -- forma com 6 bolinhas
    WHEN 'ciabatta'     THEN 'couche'::recipe_shape    -- ciabatta SEMPRE couche (ficha enfatiza)
  END
FROM produtos_fabricados
ON CONFLICT DO NOTHING;
```

**Correção importante:** minha versão v1 inicial tinha Integral e Multigrãos como `couche`. A ficha v5 diz explicitamente `banneton com farinha de arroz` pros dois. Só a Ciabatta é `couche` — e a ficha enfatiza isso em NOTAS.

---

## 8. Versão v1 de cada receita

```sql
INSERT INTO recipe_versions (
  recipe_id, version_number, status,
  base_dough_weight_grams, yield_units, expected_loss_percent, notes
)
SELECT
  r.id, 1, 'rascunho'::recipe_version_status,
  CASE p.slug
    WHEN 'pao-original' THEN 6750  -- produção real (9 pães): soma de Produção(g)
    WHEN 'pao-integral' THEN 6750
    WHEN 'multigraos'   THEN 6748
    WHEN 'focaccia'     THEN 3150  -- 1 receita inteira = 1 tabuleiro
    WHEN 'brioche'      THEN 2808  -- 7 receitas × 439g = produção pra 9 formas
    WHEN 'ciabatta'     THEN 5850  -- 6 receitas pra 9 pães
  END,
  CASE p.slug
    WHEN 'pao-original' THEN 9
    WHEN 'pao-integral' THEN 9
    WHEN 'multigraos'   THEN 9
    WHEN 'focaccia'     THEN 6   -- 6 porções por tabuleiro (1/6 cada)
    WHEN 'brioche'      THEN 9   -- 9 formas × 6 bolinhas cada
    WHEN 'ciabatta'     THEN 9
  END,
  18.00,  -- perda de cocção real (ficha v5)
  'v1 inicial do MVP. Ingredientes e passos na migration 003 (dados da ficha v5).'
FROM recipes r
JOIN products p ON p.id = r.product_id
WHERE p.slug IN ('pao-original', 'pao-integral', 'multigraos', 'focaccia', 'brioche', 'ciabatta');
```

**Correção importante:** `expected_loss_percent` passou de 5% (meu chute) pra 18% (ficha real). Isso impacta cálculos de massa × rendimento — o sistema precisa considerar os 18% de perda ao calcular "massa necessária pra produzir N pães".

---

## 9. Ingredientes e passos: migration 003 (separada)

Os dados técnicos completos (baker %, base_grams, 7 passos) ficam na migration 003 — arquivo dedicado, longo. Motivo: o SQL de `recipe_ingredients` tem ~50 linhas por receita × 6 receitas = ~300 linhas. E `recipe_steps` adiciona mais ~50. Separar facilita a revisão.

**Status atual:** tenho todos os dados da ficha v5 extraídos e prontos pra gerar a migration 003. Vou gerar num documento separado (próximo arquivo).

---

## 10. Seeds de desenvolvimento (opcional)

```sql
-- Rodar SÓ se SEED_DEV=true
INSERT INTO subscribers (name, email, whatsapp, cpf, gender)
VALUES
  ('Beatriz Teste', 'beatriz.teste@cora.dev', '+5521999998888', '12345678900', 'feminino'),
  ('João Teste',    'joao.teste@cora.dev',    '+5521988887777', '98765432100', 'masculino')
ON CONFLICT (email) DO NOTHING;

-- Assinatura da Beatriz (sem base_product_id — fica em subscription_items)
WITH
  beatriz AS (SELECT id FROM subscribers WHERE email = 'beatriz.teste@cora.dev'),
  default_plan AS (SELECT id FROM plans WHERE slug = 'default')
INSERT INTO subscriptions (
  subscriber_id, plan_id, status,
  address_street, address_number, address_complement, address_neighborhood,
  address_city, address_state, address_zip, address_reference, address_hash,
  started_at
)
SELECT
  beatriz.id, default_plan.id, 'ativa',
  'R. Gavião Peixoto', '118', 'Bl.3/201', 'Icaraí',
  'Niterói', 'RJ', '24230-300', 'Portaria com interfone 201',
  md5('R. Gavião Peixoto|118|Bl.3/201|Icaraí|Niterói|RJ|24230-300'),
  now()
FROM beatriz, default_plan;

-- Base da Assinatura da Beatriz: 1 Integral
WITH
  beatriz_sub AS (
    SELECT s.id FROM subscriptions s
    JOIN subscribers sb ON sb.id = s.subscriber_id
    WHERE sb.email = 'beatriz.teste@cora.dev' AND s.status = 'ativa'
  ),
  integral AS (SELECT id FROM products WHERE slug = 'pao-integral')
INSERT INTO subscription_items (subscription_id, product_id, position)
SELECT beatriz_sub.id, integral.id, 1
FROM beatriz_sub, integral;

-- Exemplo alternativo: João teria Assinatura com 2 pães (1 Original + 1 Integral)
-- (não executado, só exemplo)
-- INSERT INTO subscription_items (subscription_id, product_id, position) VALUES
--   (<joao_sub_id>, <original_id>, 1),
--   (<joao_sub_id>, <integral_id>, 2);

-- Semana de teste (20-26 abr 2026, entrega quinta 23)
INSERT INTO weeks (iso_year, iso_week, starts_on, ends_on, delivery_date, cutoff_at, status)
VALUES
  (2026, 17, '2026-04-20', '2026-04-26', '2026-04-23', '2026-04-21 15:00:00+00', 'planejamento')
ON CONFLICT DO NOTHING;
```

---

## Ordem final de execução

| Migration | Conteúdo | Obrigatória? |
|---|---|---|
| 001 | Schema (CREATE TABLEs, enums) da Rodada 2 | Sim |
| 002 | Seed essencial (seções 1-8 deste documento) | Sim |
| 003 | `recipe_ingredients` + `recipe_steps` pra cada receita (dados ficha v5) | Sim |
| 004 | Ajuste específico de Focaccia e Brioche (passos extras) | Sim |
| 099_dev | Seed de desenvolvimento (seção 10) | Condicional `SEED_DEV=true` |

---

## Pendências que não bloqueiam implementação

| Item | Task | Status |
|---|---|---|
| Validar porção Focaccia (1/9?) | 86e0zqzeb | aberta |
| Decidir preço avulso dos 6 produtos | 86e0zj8ab | aberta |
| Copy dos produtos revisada por Mariane | — | informal |

Todas podem ser resolvidas após o banco estar no ar. No MVP, `retail_price=NULL` e `unit_weight_grams=258` pra focaccia são valores provisórios que UPDATE resolve.

---

*Documento de referência · Schema Backoffice Cora · Rodada 3A · v1.1 · Abril 2026*
