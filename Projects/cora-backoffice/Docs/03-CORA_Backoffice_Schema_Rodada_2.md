# Cora Backoffice — Schema do Banco (Rodada 2)

*Detalhamento de campos, tipos e constraints. Pronto pra virar migration.*

**Versão:** v2 (abril 2026)
**Base:** Rodada 1 validada
**Stack:** PostgreSQL 16 + Drizzle ORM (Node/TypeScript)
**Convenções:**
- Tabelas em inglês, plural, snake_case (`subscribers`, `production_steps`)
- Colunas em inglês, singular, snake_case (`first_name`, `started_at`)
- Enums em português quando refletem vocabulário da Cora (`rascunho`, `teste`, `ativa`)
- IDs: UUID v4 (`uuid PRIMARY KEY DEFAULT gen_random_uuid()`)
- Timestamps: `timestamptz` (UTC no banco, aplicação converte pra exibição)
- Soft delete onde relevante: coluna `deleted_at timestamptz` nullable

---

## Extensões Postgres necessárias

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";      -- email case-insensitive
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- busca textual futura
```

---

## Enums

Todos os enums são definidos antes das tabelas. Mudanças de enum futuras exigem migration — por isso os valores foram pensados pra cobrir estados previsíveis.

```sql
-- Catálogo
CREATE TYPE product_type AS ENUM ('fabricado', 'revenda');
CREATE TYPE product_unit AS ENUM ('un', 'kg');
CREATE TYPE recipe_version_status AS ENUM ('rascunho', 'teste', 'ativa', 'arquivada');
CREATE TYPE recipe_shape AS ENUM ('banneton', 'couche', 'tabuleiro', 'forma');

-- Operação
CREATE TYPE week_status AS ENUM ('planejamento', 'em_producao', 'expedicao', 'concluida');
CREATE TYPE production_status AS ENUM ('planejada', 'em_producao', 'coccao', 'concluida');
CREATE TYPE levain_refresh_type AS ENUM ('primeiro', 'segundo', 'ida_tf');

-- Comercial
CREATE TYPE subscription_status AS ENUM ('ativa', 'pausada', 'cancelada');
CREATE TYPE order_type AS ENUM ('assinatura', 'avulso');
CREATE TYPE order_item_kind AS ENUM ('assinatura', 'swap', 'extra');
CREATE TYPE order_status AS ENUM ('pendente', 'confirmado', 'cancelado');
CREATE TYPE delivery_status AS ENUM ('pendente', 'separado', 'em_rota', 'entregue', 'nao_entregue');

-- Resultado
CREATE TYPE quality_assessment AS ENUM ('ok', 'ajustar');
```

**Notas sobre enums:**
- `plan_product_role` foi removido em 20/abr/2026. No MVP só existe 1 Assinatura (não nomeada como "Plano"), então papel não faz sentido. Quando (se) houver múltiplas Assinaturas no futuro, re-avaliar.
- `order_item_kind` novo: distingue tipo do item na Cesta. `assinatura` = produto da Base; `swap` = produto trocado 1:1 da Base; `extra` = adição do Cardápio (com cobrança separada).

---

## Domínio 1 — Catálogo

### `products`

Entidade central. Qualquer coisa vendável ou produzível.

```sql
CREATE TABLE products (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text NOT NULL UNIQUE,           -- 'pao-original', 'integral', 'brioche'
  name              text NOT NULL,                  -- 'Pão Original'
  type              product_type NOT NULL DEFAULT 'fabricado',
  unit              product_unit NOT NULL DEFAULT 'un',
  unit_weight_grams integer,                        -- 580 (null se unit=kg)
  retail_price      numeric(10, 2),                 -- preço avulso em R$
  short_description text,                           -- pra card do portal

  -- Revenda (null no MVP)
  supplier_id       uuid REFERENCES suppliers(id),
  purchase_cost     numeric(10, 2),

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,

  CONSTRAINT products_unit_weight_check CHECK (
    (unit = 'kg' AND unit_weight_grams IS NULL) OR
    (unit = 'un' AND unit_weight_grams IS NOT NULL)
  ),
  CONSTRAINT products_revenda_fields_check CHECK (
    type = 'fabricado' OR (type = 'revenda' AND supplier_id IS NOT NULL)
  )
);

CREATE INDEX idx_products_type ON products(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_slug ON products(slug) WHERE deleted_at IS NULL;
```

**Notas:**
- `slug` é o identificador humano-legível usado em URLs do portal e logs
- `retail_price` nullable porque produtos em desenvolvimento ainda não têm preço definido
- `CHECK` garante coerência entre `type` e campos de revenda

---

### `plans`

Planos de assinatura. No MVP existe 1 plano default (sem nome comercial exposto — o assinante só vê "Minha Assinatura"). A tabela existe pra preparar múltiplos planos no futuro.

```sql
CREATE TABLE plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,        -- 'default' no MVP; futuros: 'clasicos', 'recheados'
  name            text NOT NULL,                -- 'Assinatura Cora' (interno, não exposto no MVP)
  price_per_item  numeric(10, 2) NOT NULL,      -- 99.00 (preço por pão)
  shipping_price  numeric(10, 2) NOT NULL,      -- 15.00 (fixo, não multiplica com quantidade)
  active          boolean NOT NULL DEFAULT true,
  description     text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_plans_active ON plans(active) WHERE active = true;
```

**Nota importante:** `price_per_item` em vez de `monthly_price`. O valor final da Assinatura = `price_per_item × número de pães na Base` (ex: 2 pães × R$ 99 = R$ 198). Frete é fixo, não multiplica.

**Seed inicial:** 1 registro — plano default com `price_per_item = 99.00`.

---

### Produtos disponíveis por plano (sem tabela dedicada no MVP)

A tabela `plan_products` foi removida em 20/abr/2026. Motivo: no MVP com 1 plano só, a relação "produto pode entrar na Assinatura" é gerenciada diretamente via coluna booleana em `products`.

```sql
ALTER TABLE products ADD COLUMN eligible_for_subscription boolean NOT NULL DEFAULT false;
```

**Seed:** Original e Integral recebem `eligible_for_subscription = true`. Demais produtos ficam apenas no Cardápio avulso.

Quando houver múltiplas Assinaturas no futuro, criar tabela `plan_products` com relação N:N.

---

### `recipes`

Ficha técnica. 1:1 com Product quando `type=fabricado`.

```sql
CREATE TABLE recipes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          uuid NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  active_version_id   uuid,                          -- FK resolvida depois (ciclo)
  suggested_group     smallint NOT NULL DEFAULT 2,   -- 1, 2, ou 3 (critérios do Alex)
  shape               recipe_shape NOT NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT recipes_group_check CHECK (suggested_group BETWEEN 1 AND 3)
);

CREATE INDEX idx_recipes_product ON recipes(product_id);
```

**Nota sobre ciclo:** `recipes.active_version_id` → `recipe_versions.id`, mas `recipe_versions.recipe_id` → `recipes.id`. FK com referência cruzada. Resolvido assim:

1. `recipes` criada sem FK pra `active_version_id` (só a coluna uuid)
2. `recipe_versions` criada com FK normal pra `recipes`
3. `ALTER TABLE recipes ADD CONSTRAINT ... FOREIGN KEY (active_version_id) REFERENCES recipe_versions(id)` no final

Drizzle lida com isso nativamente via foreign keys adiadas.

---

### `recipe_versions`

Versionamento imutável. Cada edição cria nova versão.

```sql
CREATE TABLE recipe_versions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id               uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  version_number          integer NOT NULL,                       -- 1, 2, 3...
  status                  recipe_version_status NOT NULL DEFAULT 'rascunho',

  -- Parâmetros da receita
  base_dough_weight_grams integer NOT NULL,                       -- peso total da massa base (ex: 1305g pra 9 pães de ~145g)
  yield_units             integer NOT NULL,                       -- rendimento estimado em unidades
  expected_loss_percent   numeric(5, 2) NOT NULL DEFAULT 0,       -- perda esperada %

  notes                   text,                                    -- notas gerais da versão
  created_at              timestamptz NOT NULL DEFAULT now(),
  published_at            timestamptz,                            -- quando virou 'ativa'

  CONSTRAINT recipe_versions_unique UNIQUE (recipe_id, version_number),
  CONSTRAINT recipe_versions_version_positive CHECK (version_number > 0)
);

CREATE INDEX idx_recipe_versions_recipe ON recipe_versions(recipe_id);
CREATE INDEX idx_recipe_versions_status ON recipe_versions(status);
```

**Regras de negócio implementadas em código (trigger ou camada de aplicação):**

1. **Rascunho não pode ser ativa:** ao setar `recipes.active_version_id`, validar que `recipe_versions.status IN ('teste', 'ativa')`.
2. **Imutabilidade:** versão com status `ativa` ou `arquivada` não pode ter ingredientes/passos editados. Edição = nova versão.
3. **Congelamento no corte:** mudança de `active_version_id` depois da terça 12h só vale pra próxima semana (lógica na aplicação, não no banco).

---

### `ingredients`

Ingredientes conceituais (não físicos — isso é `insumos`).

```sql
CREATE TABLE ingredients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,          -- 'farinha-fv-integral', 'superiore', 'sal', 'agua'
  name         text NOT NULL,                 -- 'Farinha FV Integral'
  unit         text NOT NULL DEFAULT 'g',     -- 'g', 'ml' — sempre na menor unidade do tipo
  description  text,

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

CREATE INDEX idx_ingredients_slug ON ingredients(slug) WHERE deleted_at IS NULL;
```

---

### `recipe_ingredients`

Ingredientes de uma versão específica da receita.

```sql
CREATE TABLE recipe_ingredients (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_version_id   uuid NOT NULL REFERENCES recipe_versions(id) ON DELETE CASCADE,
  ingredient_id       uuid NOT NULL REFERENCES ingredients(id),
  baker_percent       numeric(6, 2) NOT NULL,     -- 72.00 (%)
  base_grams          numeric(10, 2) NOT NULL,    -- 578.00 (g)
  display_order       smallint NOT NULL DEFAULT 0,

  CONSTRAINT recipe_ingredients_unique UNIQUE (recipe_version_id, ingredient_id),
  CONSTRAINT recipe_ingredients_percent_positive CHECK (baker_percent >= 0),
  CONSTRAINT recipe_ingredients_grams_positive CHECK (base_grams >= 0)
);

CREATE INDEX idx_recipe_ingredients_version ON recipe_ingredients(recipe_version_id);
```

---

### `recipe_steps`

Passos do processo. Template padrão de 7, editável por receita.

```sql
CREATE TABLE recipe_steps (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_version_id     uuid NOT NULL REFERENCES recipe_versions(id) ON DELETE CASCADE,
  step_order            smallint NOT NULL,                    -- 1, 2, 3...
  title                 text NOT NULL,                        -- 'Autólise', 'Batimento'
  expected_time_offset  interval,                             -- '8 hours 30 minutes' após início
  expected_duration     interval,                             -- duração esperada da etapa (30 min, 4h...)
  critical_variable     text,                                 -- 'T° massa pós-batimento (máx 23°)'
  contextual_note       text,                                 -- nota mostrada durante a execução

  CONSTRAINT recipe_steps_unique UNIQUE (recipe_version_id, step_order),
  CONSTRAINT recipe_steps_order_positive CHECK (step_order > 0)
);

CREATE INDEX idx_recipe_steps_version ON recipe_steps(recipe_version_id);
```

**Nota sobre `expected_time_offset`:** é a distância do início do dia (quarta 8h, por exemplo). Passo "Autólise" em 8h30 tem offset de `30 minutes`. Passo "Batimento" em 9h10 tem offset de `1 hour 10 minutes`. Facilita recalcular horários quando a produção muda de dia.

---

## Domínio 2 — Operação

### `weeks`

Janela temporal de operação.

```sql
CREATE TABLE weeks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iso_year        smallint NOT NULL,                         -- 2026
  iso_week        smallint NOT NULL,                         -- 14
  starts_on       date NOT NULL,                             -- segunda-feira
  ends_on         date NOT NULL,                             -- domingo
  delivery_date   date NOT NULL,                             -- quinta (entrega)
  cutoff_at       timestamptz NOT NULL,                      -- terça 12h (congelamento)
  status          week_status NOT NULL DEFAULT 'planejamento',

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT weeks_unique UNIQUE (iso_year, iso_week),
  CONSTRAINT weeks_range_check CHECK (ends_on > starts_on)
);

CREATE INDEX idx_weeks_dates ON weeks(starts_on, ends_on);
CREATE INDEX idx_weeks_status ON weeks(status);
```

**Por que ISO year + ISO week:** padrão internacional que resolve semanas que cruzam o ano (ex: 29/dez a 4/jan pode ser semana 1 do ano seguinte). Evita bug de "semana 52" vs "semana 1" na virada.

---

### `cardapios`

Produtos disponíveis no Cardápio de uma semana específica. É o que o assinante vê no Portal na seção "Cardápio".

```sql
CREATE TABLE cardapios (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id      uuid NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  product_id   uuid NOT NULL REFERENCES products(id),
  frozen       boolean NOT NULL DEFAULT false,          -- true depois do cutoff_at

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cardapios_unique UNIQUE (week_id, product_id)
);

CREATE INDEX idx_cardapios_week ON cardapios(week_id);
CREATE INDEX idx_cardapios_product ON cardapios(product_id);
```

**Mudança em 20/abr/2026:**
- Coluna `plan_id` removida: no MVP com 1 Assinatura, `plan_id` era redundante. Quando houver múltiplas Assinaturas, adicionar coluna e relação.
- Coluna `role` removida: terminologia simplificada. Um produto está no Cardápio ou não. Se o produto for elegível para Assinatura (`products.eligible_for_subscription = true`), o cliente pode adicionar à Base ou fazer swap. Caso contrário, é Extra pago.

**Geração:** rotina na aplicação cria `cardapios` da semana copiando os produtos publicados na última semana quando `week` entra em `planejamento`. Hugo edita via módulo Planejamento. Cron atualiza `frozen=true` quando chega o `cutoff_at`.

---

### `productions`

Uma receita sendo produzida numa semana. Versão da receita congelada.

```sql
CREATE TABLE productions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id              uuid NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  recipe_version_id    uuid NOT NULL REFERENCES recipe_versions(id),
  status               production_status NOT NULL DEFAULT 'planejada',

  expected_units       integer NOT NULL,                 -- calculado dos pedidos + buffer
  actual_units         integer,                          -- preenchido no resultado

  started_at           timestamptz,                      -- quando status → em_producao
  completed_at         timestamptz,                      -- quando status → concluida

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT productions_unique UNIQUE (week_id, recipe_version_id)
);

CREATE INDEX idx_productions_week ON productions(week_id);
CREATE INDEX idx_productions_status ON productions(status);
CREATE INDEX idx_productions_recipe ON productions(recipe_version_id);
```

---

### `production_steps`

Registro operacional dos passos. Um registro por passo da receita naquela produção.

```sql
CREATE TABLE production_steps (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id      uuid NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
  recipe_step_id     uuid NOT NULL REFERENCES recipe_steps(id),
  step_order         smallint NOT NULL,                  -- snapshot, não muda se recipe_step mudar de ordem

  expected_time      timestamptz,                        -- horário calculado do offset
  actual_time        timestamptz,                        -- quando Hugo registra
  temperature_c      numeric(4, 1),                      -- 25.5 — nullable, nem todo passo mede
  notes              text,

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT production_steps_unique UNIQUE (production_id, step_order)
);

CREATE INDEX idx_production_steps_production ON production_steps(production_id);
```

**Nota:** `recipe_step_id` é FK pra rastreabilidade (qual passo da ficha foi esse?), mas `step_order` é snapshot — se a receita for editada depois, a ordem histórica se preserva.

---

### `production_contexts`

Diagnóstico da produção. 1:1 com `productions`.

```sql
CREATE TABLE production_contexts (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id              uuid NOT NULL UNIQUE REFERENCES productions(id) ON DELETE CASCADE,

  -- Variáveis críticas (todas nullable — Hugo preenche o que conseguir)
  flour_lot_identifier       text,                       -- texto livre: '#L24', 'FV abril batch 2', 'não anotei'
  hours_since_levain_refresh numeric(5, 2),              -- auto-calculado, mas permite override manual
  ambient_temp_max_c         numeric(4, 1),              -- T° ambiente máxima do dia
  hydration_adjusted_percent numeric(5, 2),              -- % efetivo se diferente da receita

  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_production_contexts_production ON production_contexts(production_id);
-- Futuro (v1.1): índice pra busca textual no lote
-- CREATE INDEX idx_production_contexts_lot_trgm ON production_contexts USING gin (flour_lot_identifier gin_trgm_ops);
```

---

### `production_results`

Fechamento da produção. 1:1 com `productions`.

```sql
CREATE TABLE production_results (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id        uuid NOT NULL UNIQUE REFERENCES productions(id) ON DELETE CASCADE,

  units_produced       integer NOT NULL,
  avg_weight_grams     numeric(6, 1),
  loss_percent         numeric(5, 2),
  crumb_assessment     quality_assessment,
  crust_assessment     quality_assessment,
  notes                text,

  oven_out_at          timestamptz,                      -- quinta, saída do forno

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
```

---

### `levain_refreshes`

Registro operacional do levain.

```sql
CREATE TABLE levain_refreshes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id           uuid NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  refresh_type      levain_refresh_type NOT NULL,
  performed_at      timestamptz NOT NULL,

  ratio             text NOT NULL DEFAULT '1:2:2',      -- texto livre pra flexibilidade
  final_grams       numeric(8, 2) NOT NULL,              -- quantidade total resultante
  notes             text,

  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT levain_refreshes_unique UNIQUE (week_id, refresh_type)
);

CREATE INDEX idx_levain_week ON levain_refreshes(week_id);
CREATE INDEX idx_levain_performed ON levain_refreshes(performed_at);
```

---

## Domínio 3 — Comercial

### `subscribers`

Dados pessoais do cliente. Permanente.

```sql
CREATE TABLE subscribers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  email         citext NOT NULL UNIQUE,                -- case-insensitive
  whatsapp      text NOT NULL,                         -- formato E.164: '+5521999998888'
  cpf           text UNIQUE,                            -- só dígitos, nullable no cadastro inicial
  gender        text,                                   -- 'feminino' | 'masculino' | 'neutro' (pro greeting)

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE INDEX idx_subscribers_email ON subscribers(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_subscribers_whatsapp ON subscribers(whatsapp) WHERE deleted_at IS NULL;
CREATE INDEX idx_subscribers_cpf ON subscribers(cpf) WHERE deleted_at IS NULL AND cpf IS NOT NULL;
```

**Nota sobre CPF:** nullable porque o cadastro inicial no portal pede só email. CPF é coletado quando vira assinante pagante. Sem CPF não dá pra cobrar via Asaas.

---

### `subscriptions`

Vínculo com um plano. **Múltiplas ativas permitidas** (caso multi-endereço).

```sql
CREATE TABLE subscriptions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id         uuid NOT NULL REFERENCES subscribers(id),
  plan_id               uuid NOT NULL REFERENCES plans(id),
  status                subscription_status NOT NULL DEFAULT 'ativa',

  -- Endereço da entrega (próprio da assinatura, não do subscriber)
  address_street        text NOT NULL,
  address_number        text NOT NULL,
  address_complement    text,                                  -- 'Bl.3/201', 'casa', 'apto 502'
  address_neighborhood  text NOT NULL,                         -- 'Icaraí', 'Fonseca'
  address_city          text NOT NULL DEFAULT 'Niterói',
  address_state         text NOT NULL DEFAULT 'RJ',
  address_zip           text NOT NULL,
  address_reference     text,                                  -- 'tocar na portaria 2', 'prédio azul'
  address_hash          text NOT NULL,                         -- hash estável dos campos de endereço (pra constraint de unicidade)

  -- Lifecycle
  started_at            timestamptz NOT NULL,
  paused_at             timestamptz,
  resumed_at            timestamptz,
  cancelled_at          timestamptz,
  cancellation_reason   text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Unicidade: 1 assinatura ativa por (assinante + endereço) simultaneamente
CREATE UNIQUE INDEX idx_subscriptions_active_unique
  ON subscriptions(subscriber_id, address_hash)
  WHERE status = 'ativa';

CREATE INDEX idx_subscriptions_subscriber ON subscriptions(subscriber_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan_id);
```

**Mudança em 20/abr/2026:** coluna `base_product_id` removida. A Base da Assinatura agora fica em `subscription_items` (ver tabela abaixo), permitindo múltiplos pães por assinatura.

**Notas:**
- `address_hash` gerado na aplicação (SHA256 dos campos normalizados) pra permitir a constraint `UNIQUE ... WHERE status = 'ativa'` funcionar em pg.
- Nada de `ON DELETE CASCADE` no subscriber_id: proteção contra apagar assinante com assinatura ativa por engano.
- `paused_at`/`resumed_at` registram o último ciclo de pausa; histórico completo vira evento em tabela separada se a gente precisar (fora do MVP).

---

### `subscription_items`

Os pães que formam a Base da Assinatura. Permite 1 a 3 pães por assinatura, com repetição ou mistura de produtos.

```sql
CREATE TABLE subscription_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id   uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  product_id        uuid NOT NULL REFERENCES products(id),
  position          smallint NOT NULL,                 -- 1, 2, 3 (ordem na Base)

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT subscription_items_position_check CHECK (position BETWEEN 1 AND 3),
  CONSTRAINT subscription_items_unique UNIQUE (subscription_id, position)
);

CREATE INDEX idx_subscription_items_subscription ON subscription_items(subscription_id);
```

**Exemplos de uso:**
- Assinatura com 1 Original: 1 registro (position=1, product=Original)
- Assinatura com 2 Originais: 2 registros (position=1 e 2, ambos product=Original)
- Assinatura com 1 Original + 1 Integral: 2 registros (position=1 Original, position=2 Integral)
- Assinatura com 2 Originais + 1 Integral: 3 registros

**Regras:**
- Produto precisa ter `eligible_for_subscription = true`
- Máximo 3 itens por Assinatura (regra da aplicação, enforçada pelo CHECK)
- Preço total da Assinatura = `count(subscription_items) × plans.price_per_item`

---

### `orders`

O que uma assinatura (ou compra avulsa) recebe em uma semana.

```sql
CREATE TABLE orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id           uuid NOT NULL REFERENCES weeks(id),
  subscription_id   uuid REFERENCES subscriptions(id),       -- NULL quando type=avulso
  subscriber_id     uuid NOT NULL REFERENCES subscribers(id), -- redundante mas útil pra consultas
  type              order_type NOT NULL DEFAULT 'assinatura',
  status            order_status NOT NULL DEFAULT 'pendente',

  total_amount      numeric(10, 2) NOT NULL DEFAULT 0,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT orders_subscription_check CHECK (
    (type = 'assinatura' AND subscription_id IS NOT NULL) OR
    (type = 'avulso' AND subscription_id IS NULL)
  )
);

CREATE INDEX idx_orders_week ON orders(week_id);
CREATE INDEX idx_orders_subscription ON orders(subscription_id);
CREATE INDEX idx_orders_subscriber ON orders(subscriber_id);
CREATE INDEX idx_orders_status ON orders(status);
```

**Nota:** `subscriber_id` duplicado (já que `subscription_id` leva a ele) é proposital. Permite consultas diretas "todos os pedidos do Hugo" sem JOIN, e mantém histórico quando a assinatura é apagada (hipótese improvável, mas defensiva).

---

### `order_items`

Linhas do pedido (itens da Cesta da semana). Liga pra versão específica da receita pra rastreabilidade.

```sql
CREATE TABLE order_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id          uuid NOT NULL REFERENCES products(id),
  recipe_version_id   uuid REFERENCES recipe_versions(id),   -- null pra produto de revenda
  kind                order_item_kind NOT NULL,              -- 'assinatura', 'swap', 'extra'

  quantity            integer NOT NULL DEFAULT 1,
  unit_price          numeric(10, 2) NOT NULL,               -- snapshot no momento do pedido
  line_total          numeric(10, 2) NOT NULL,               -- quantity * unit_price (0 pra kind='assinatura' e 'swap')

  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT order_items_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_order_items_recipe_version ON order_items(recipe_version_id);
CREATE INDEX idx_order_items_kind ON order_items(kind);
```

**Significado do `kind`:**
- `assinatura` — item que faz parte da Base da Assinatura (já pago via recorrência). `line_total = 0` na cobrança.
- `swap` — produto trocado 1:1 com um item da Base (ex: cliente tinha 1 Original na Base, trocou por 1 Integral nesta semana). Também `line_total = 0` — swap é neutro por regra da aplicação.
- `extra` — adição paga do Cardápio. `line_total` reflete preço avulso. Entra na fatura mensal separadamente.

**Regra aplicada na aplicação:** ao processar swap, criar 2 registros: um marcando o produto original da Base como cancelado/ausente, e outro marcando o produto trocado como `kind='swap'`. Rastreabilidade preservada.

---

### `deliveries`

1:1 com `orders`. Dados da entrega física.

```sql
CREATE TABLE deliveries (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  status                delivery_status NOT NULL DEFAULT 'pendente',

  -- Snapshot do endereço (congelado no momento da criação da delivery)
  address_street        text NOT NULL,
  address_number        text NOT NULL,
  address_complement    text,
  address_neighborhood  text NOT NULL,
  address_city          text NOT NULL,
  address_state         text NOT NULL,
  address_zip           text NOT NULL,
  address_reference     text,

  -- Rastreamento
  separated_at          timestamptz,
  shipped_at            timestamptz,
  delivered_at          timestamptz,
  failed_at             timestamptz,
  failure_reason        text,
  courier_note          text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliveries_order ON deliveries(order_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_neighborhood ON deliveries(address_neighborhood);
```

**Nota:** endereço congelado aqui pra garantir que "entrega da semana 14 foi pra R. Gavião Peixoto, 85" fique preservado mesmo se o assinante mudar de endereço em uma nova assinatura.

---

## Domínio 4 — Insumos (mínimo MVP)

### `suppliers`

```sql
CREATE TABLE suppliers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  lead_time_days    smallint NOT NULL DEFAULT 7,
  contact_email     citext,
  contact_whatsapp  text,
  notes             text,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

CREATE INDEX idx_suppliers_name ON suppliers(name) WHERE deleted_at IS NULL;
```

**Seed inicial:**
- CCN (Le 5 Stagioni) — lead time 3 dias
- Fazenda Vargem — lead time 15 dias

---

### `supplies`

Insumos abstratos com estoque. Lote fica em `production_contexts`, não aqui.

```sql
CREATE TABLE supplies (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id           uuid NOT NULL REFERENCES suppliers(id),
  ingredient_id         uuid REFERENCES ingredients(id),       -- opcional: liga com ingrediente conceitual
  name                  text NOT NULL,                         -- 'Farinha FV Integral 25kg'
  current_stock_grams   numeric(10, 2) NOT NULL DEFAULT 0,
  min_stock_grams       numeric(10, 2) NOT NULL DEFAULT 0,
  weekly_consumption_grams numeric(10, 2),                     -- usado pra alertas baseados em lead time

  last_restocked_at     timestamptz,
  notes                 text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz
);

CREATE INDEX idx_supplies_supplier ON supplies(supplier_id);
CREATE INDEX idx_supplies_ingredient ON supplies(ingredient_id);
-- Query "insumos em alerta": WHERE current_stock_grams < min_stock_grams OR (stock < consumption * lead_time/7)
```

---

## Tabelas auxiliares

### `audit_log` (opcional, recomendado)

Registro de eventos críticos. Não é obrigatório no MVP, mas custa quase nada e salva muito debug.

```sql
CREATE TABLE audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      uuid,                                    -- user_id (futuro) ou null pra sistema
  action        text NOT NULL,                           -- 'subscription.cancelled', 'recipe_version.activated'
  target_type   text NOT NULL,                           -- 'subscription', 'recipe_version'
  target_id     uuid NOT NULL,
  metadata      jsonb,                                   -- payload livre

  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_target ON audit_log(target_type, target_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
```

**Minha recomendação:** inclui no MVP. Quando alguém reclamar "minha assinatura foi cancelada sem eu pedir", você tem registro em ~2 minutos em vez de 2 dias de investigação.

---

## Convenções pra implementação

### Updated_at automático

```sql
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em todas as tabelas com updated_at:
CREATE TRIGGER set_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
-- (repetir pra cada tabela — Drizzle pode automatizar isso)
```

### Soft delete

Aplicação sempre filtra `WHERE deleted_at IS NULL` nas queries padrão. Views podem esconder isso:

```sql
CREATE VIEW active_products AS
  SELECT * FROM products WHERE deleted_at IS NULL;
```

### Nomenclatura de tabelas com múltiplas palavras

- `recipe_versions` (não `recipeversions`)
- `production_contexts` (não `productioncontexts`)
- `order_items` (padrão da indústria)

---

## Relações visuais (ERD resumido)

```
products ─┬─ (1:1 se fabricado) ── recipes ─── recipe_versions ─┬── recipe_ingredients ── ingredients
          │                                                      └── recipe_steps
          │
          ├── plan_products ── plans
          │
          └── order_items ── orders ─┬── subscriptions ── subscribers
                                      │
                                      └── deliveries

weeks ─┬── cardapios ── plans, products
       │
       ├── productions ── recipe_versions
       │                  ├── production_steps
       │                  ├── production_contexts
       │                  └── production_results
       │
       └── levain_refreshes

suppliers ── supplies ── ingredients
```

---

## Contagem final

- **21 tabelas** (incluindo audit_log)
- **14 enums**
- **~60 índices** (alguns compostos)
- **~30 constraints** (checks + unique + foreign keys)

Pra contexto: é o tamanho de um MVP "sério, mas não gigante". Um dev trabalhando em tempo integral monta tudo isso em 2-3 dias. Com Claude Code + Drizzle: estimo 1 dia pra definição + 2-3 dias pra implementação testada.

---

## O que virá na Rodada 3

1. **Índices otimizados** pelos casos de uso reais ("ver pedidos pendentes da semana atual", "listar assinantes ativos por bairro", "ver histórico de produções do Original")
2. **Migrations futuras documentadas:**
   - M1: Ativação do Plano Premium (só seed, zero schema change)
   - M2: Multi-plano UI (só aplicação, zero schema change)
   - M3: Empório — novos produtos `revenda`, uso de `supplies`
   - M4: View comparativa (índice textual em `flour_lot_identifier`, possível tabela materializada)
   - M5: Controle granular de consumo de insumos
3. **Seed completo** do MVP: 1 plano, 6 produtos, 6 receitas v1 com ingredientes e passos, 2 fornecedores, ~10 ingredientes base.
4. **Pontos de integração com Asaas** (campos necessários, triggers de webhook)

---

*Documento de referência · Schema Backoffice Cora · Rodada 2 · Abril 2026*
