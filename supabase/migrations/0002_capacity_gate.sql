-- ============================================================
-- Migration 0002: Capacity gate
-- Tabela app_settings (singleton) + capacity_waitlist
-- ============================================================

-- Garantir extensão citext (não habilitada na 0001)
CREATE EXTENSION IF NOT EXISTS citext;

-- ------------------------------------------------------------
-- app_settings (singleton: linha única forçada por CHECK)
-- ------------------------------------------------------------
CREATE TABLE app_settings (
  id                  smallint     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  subscriptions_open  boolean      NOT NULL DEFAULT true,
  updated_at          timestamptz  NOT NULL DEFAULT now()
);

-- Seed: linha única com gate aberto
INSERT INTO app_settings (id, subscriptions_open) VALUES (1, true);

-- RLS deny-all (acesso só via service_role nos endpoints)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny all" ON app_settings
  FOR ALL TO public USING (false) WITH CHECK (false);

-- ------------------------------------------------------------
-- capacity_waitlist
-- ------------------------------------------------------------
CREATE TABLE capacity_waitlist (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text         NOT NULL CHECK (length(trim(nome)) >= 2),
  email       citext       NOT NULL,
  whatsapp    text         NOT NULL CHECK (length(regexp_replace(whatsapp, '\D', '', 'g')) IN (10, 11)),
  cep         text         NOT NULL CHECK (cep ~ '^[0-9]{8}$'),
  created_at  timestamptz  NOT NULL DEFAULT now()
);

-- Idempotência por email (citext = case-insensitive nativo)
CREATE UNIQUE INDEX capacity_waitlist_email_uniq ON capacity_waitlist (email);

-- RLS deny-all
ALTER TABLE capacity_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny all" ON capacity_waitlist
  FOR ALL TO public USING (false) WITH CHECK (false);

-- ------------------------------------------------------------
-- Comentários (documentação inline)
-- ------------------------------------------------------------
COMMENT ON TABLE app_settings IS 'Singleton de configurações globais do portal. Linha única forçada por CHECK (id = 1).';
COMMENT ON COLUMN app_settings.subscriptions_open IS 'Flag mestre. Quando false, portal bloqueia novas subscriptions e oferece capacity_waitlist.';
COMMENT ON TABLE capacity_waitlist IS 'Lista de espera por capacidade produtiva. Diferente de coverage_waitlist (lista por bairro fora de cobertura).';
