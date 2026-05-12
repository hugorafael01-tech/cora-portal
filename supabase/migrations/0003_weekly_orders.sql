-- ============================================================
-- Cora — Migration 0003: weekly_orders (Frente C item 1)
-- Carrinho persistido da semana com confirmação explícita.
-- ============================================================

CREATE TYPE weekly_order_status AS ENUM ('rascunho', 'confirmado');

CREATE TABLE weekly_orders (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id               UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  delivery_date                 DATE NOT NULL,
  composition                   JSONB,                              -- {original: 1, integral: 1} ou null se segue assinatura
  extras                        JSONB NOT NULL DEFAULT '[]',        -- [{id, nome, qty, preco_unit}]
  total_extras                  NUMERIC(10,2) NOT NULL DEFAULT 0,
  status                        weekly_order_status NOT NULL DEFAULT 'rascunho',
  confirmed_at                  TIMESTAMPTZ,
  first_extra_added_at          TIMESTAMPTZ,                        -- inicia timer de aviso de abandono
  abandonment_warning_sent_at   TIMESTAMPTZ,                        -- marca quando o cron disparou o email
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT weekly_orders_unique_per_week
    UNIQUE (subscription_id, delivery_date),
  CONSTRAINT weekly_orders_delivery_is_thursday
    CHECK (EXTRACT(DOW FROM delivery_date) = 4)
);

CREATE INDEX weekly_orders_subscription_idx ON weekly_orders(subscription_id);
CREATE INDEX weekly_orders_delivery_date_idx ON weekly_orders(delivery_date);
CREATE INDEX weekly_orders_status_idx ON weekly_orders(status);

-- Índice parcial otimizado pra query do cron de abandono (roda a cada 15min)
CREATE INDEX weekly_orders_abandonment_pending_idx
  ON weekly_orders(first_extra_added_at, delivery_date)
  WHERE status = 'rascunho'
    AND abandonment_warning_sent_at IS NULL
    AND first_extra_added_at IS NOT NULL;

ALTER TABLE weekly_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny all" ON weekly_orders
  FOR ALL TO public USING (false) WITH CHECK (false);

CREATE TRIGGER weekly_orders_set_updated_at
BEFORE UPDATE ON weekly_orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
