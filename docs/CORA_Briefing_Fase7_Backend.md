# Briefing — Fase 7: Backend do Onboarding

**Versão:** 1.0  
**Data:** Maio/2026  
**Continuação de:** `docs/CORA_Briefing_Refactor_Onboarding.md` (Fases 0-6 já concluídas)

---

## 1. Estado atual do refactor

**Fases 0-6 concluídas em 2026-05-05.** Onboarding completo visualmente:

- ✅ T1 (Sobre você) — nome, WhatsApp, e-mail, CPF, CEP autocomplete, validação de cobertura por lista de bairros + whitelist
- ✅ T2 (Sua Assinatura) — cards Original/Integral com seletor direto, footer com total + frete
- ✅ Welcome — saudação sem flexão ("Que bom ter você com a gente, [nome]"), recap, aviso de link de pagamento via WhatsApp
- ✅ Banner persistente em todas as 4 telas quando status = `pending_payment`
- ✅ Bloqueio de extras no Cardápio + Home quando pendente
- ✅ Persistência via `localStorage` (chave `cora_subscription`)
- ✅ Reset via `?reset=true`

**O que falta:** backend real. Hoje tudo funciona local (localStorage). Pra produção, precisa banco, e-mail transacional e endpoint serverless.

---

## 2. Escopo da Fase 7

### 2.1 Supabase (banco de dados)

**Decisão:** confirmado, conta criada.

**Aplicar migration `0001_initial.sql`:**

```sql
-- ============================================================
-- Cora — Migration inicial (Fase 7 do refactor de Onboarding)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ENUM de status
CREATE TYPE subscription_status AS ENUM (
  'pending_payment', 'active', 'paused', 'cancelled'
);

-- Função genérica de updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- subscriptions
CREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                  TEXT NOT NULL,
  whatsapp              TEXT NOT NULL,                          -- só dígitos
  email                 TEXT NOT NULL,
  cpf                   TEXT NOT NULL,                          -- só dígitos
  cep                   TEXT NOT NULL,
  rua                   TEXT NOT NULL,
  numero                TEXT NOT NULL,
  complemento           TEXT,
  bairro                TEXT NOT NULL,
  cidade                TEXT NOT NULL,
  estado                TEXT NOT NULL,
  itens                 JSONB NOT NULL,                         -- {original:1, integral:0}
  total_paes            INT  NOT NULL,
  valor_paes            NUMERIC(10,2) NOT NULL,                 -- soma dos pães
  valor_frete           NUMERIC(10,2) NOT NULL,                 -- 15,00 no MVP
  valor_mensal          NUMERIC(10,2) NOT NULL,                 -- valor_paes + valor_frete
  status                subscription_status NOT NULL DEFAULT 'pending_payment',
  coverage_unconfirmed  BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscriptions_valor_mensal_check
    CHECK (valor_mensal = valor_paes + valor_frete)
);

CREATE INDEX subscriptions_email_idx  ON subscriptions(email);
CREATE INDEX subscriptions_cpf_idx    ON subscriptions(cpf);
CREATE INDEX subscriptions_status_idx ON subscriptions(status);
CREATE INDEX subscriptions_coverage_unconfirmed_idx 
  ON subscriptions(coverage_unconfirmed) 
  WHERE coverage_unconfirmed = true;

CREATE TRIGGER subscriptions_set_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- coverage_waitlist (append-only)
CREATE TABLE coverage_waitlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf         TEXT,
  nome        TEXT,
  whatsapp    TEXT NOT NULL,
  email       TEXT,
  cep         TEXT NOT NULL,
  bairro      TEXT,
  cidade      TEXT,
  estado      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- coverage_whitelist (append-only; CRUD manual no MVP)
CREATE TABLE coverage_whitelist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf         TEXT,
  email       TEXT,
  cep         TEXT,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RLS — fechar tudo. service_role da Vercel Function bypassa.
-- ============================================================
ALTER TABLE subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_waitlist   ENABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_whitelist  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny all" ON subscriptions       FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY "deny all" ON coverage_waitlist   FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY "deny all" ON coverage_whitelist  FOR ALL TO public USING (false) WITH CHECK (false);
```

Salvar em `supabase/migrations/0001_initial.sql` e rodar no painel SQL.

### 2.2 Resend (e-mail transacional)

**Decisão:** confirmado, conta criada.

**Configuração MVP:**
- API key: já criada (Hugo guardou)
- Domínio: usar default do Resend (`onboarding@resend.dev` ou similar) até `acora.com.br` estar configurado
- Destinatário: `hugorafael01@gmail.com` (Gmail pessoal do Hugo) até Workspace ficar pronto

**Quando dispara:** ao criar subscription com sucesso no Supabase.

**Conteúdo do e-mail:**

```
Assunto: [Cora] Nova assinatura — {nome do assinante}

Corpo (texto plano):

Nova assinatura recebida.

Assinante: {nome}
WhatsApp: {whatsapp}
E-mail: {email}
CPF: {cpf}

Endereço:
{rua}, {numero}
{complemento, se houver}
{bairro} — {cidade}/{estado}
{cep}

Assinatura:
{N pão(ães) por semana}
{detalhamento dos itens}
Total mensal: R$ {valor_mensal}

Status: aguardando criação de cobrança no Asaas.

{se coverage_unconfirmed: ⚠ Cobertura não confirmada automaticamente. Verificar manualmente.}

Acessar Asaas: https://www.asaas.com/

---
Esta mensagem foi gerada automaticamente pelo portal Cora.
```

### 2.3 Endpoints Vercel Functions

**Decisão:** confirmado, sem backend separado.

**Endpoint 1: `POST /api/subscriptions`**

Substitui o fluxo atual onde a Welcome grava direto no localStorage.

Fluxo:
1. Recebe payload com dados da T1 + T2
2. Valida no servidor (defesa contra payload malformado)
3. Insere em `subscriptions` via Supabase service_role
4. Dispara e-mail via Resend (assíncrono, não bloqueia resposta)
5. Retorna `{ subscription_id, status: 'pending_payment' }`

Erro silencioso no e-mail: se Resend falhar, não bloquear resposta. Logar erro.

**Endpoint 2: `POST /api/coverage-waitlist`**

Substitui o stub atual em `src/utils/api.js`.

Fluxo:
1. Recebe payload (cpf, nome, whatsapp, email, cep, bairro, cidade, estado)
2. Insere em `coverage_waitlist` via Supabase service_role
3. Retorna `{ ok: true }`

### 2.4 Atualizar `src/utils/subscription.js`

Hoje grava o payload completo no localStorage. Depois da Fase 7:

```js
// API atual (mantém)
loadSubscription()    → { id, status, ...dados }
saveSubscription(p)   → grava
clearSubscription()   → limpa

// Internamente: ao chegar Fase 7, saveSubscription guarda só { id, status }.
// A Home que precise dos detalhes faz GET /api/subscriptions/{id} (futuro)
// ou consome do estado em memória que veio do POST inicial.
```

Pra MVP, manter o payload completo no localStorage também (faz sentido — evita GET extra). Quando a Home precisar do dado mais "vivo" (futuro), aí migra pra GET.

### 2.5 Variáveis de ambiente no Vercel

```
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ... (NUNCA exposta no front)
RESEND_API_KEY=re_...
EMAIL_FROM=onboarding@resend.dev (até acora.com.br ficar pronto)
EMAIL_TO=hugorafael01@gmail.com (até Workspace ficar pronto)
```

---

## 3. Pré-requisitos prontos

- [x] Conta Supabase criada
- [x] Conta Resend criada
- [x] API keys guardadas
- [x] Briefing técnico (este documento)
- [x] Fases 0-6 concluídas e em produção (commit `b9fceb2` + posteriores)

---

## 4. Pendências fora desta fase

- **Auth (login do 2º acesso):** OTP por WhatsApp ou magic link. Fora do escopo. No MVP, `localStorage` com subscription_id funciona como "credencial" durável de sessão.
- **Webhook Asaas pra mudar status pra `active`:** fora do escopo. Hugo muda manualmente no painel Supabase.
- **Domínio próprio `acora.com.br` no Resend:** depende do Workspace Google. Migrar `EMAIL_FROM` quando ficar pronto.
- **Migrar `EMAIL_TO` pra `hugo@acora.com.br`:** mesma dependência do Workspace.
- **Termos de Uso e Política de Privacidade:** Hugo + Mariane redigem. Bloqueante pro lançamento, não pra Fase 7.
- **Geração de proposta/pré-fatura em PDF:** Hugo gera manual nos primeiros assinantes (Canva). Automatização é v2.
- **Backoffice de gestão da whitelist e waitlist:** `admin.acora.com.br` futuro. CRUD manual via Supabase no MVP.

---

## 5. Critérios de aceite

1. Migration `0001_initial.sql` aplicada com sucesso no Supabase
2. RLS está fechando acesso público (testar com chave anon: insert/select devem falhar)
3. `POST /api/subscriptions` cria registro real e dispara e-mail
4. `POST /api/coverage-waitlist` cria registro real
5. E-mail chega em `hugorafael01@gmail.com`
6. Welcome grava `subscription_id` retornado do POST no localStorage (não mais payload completo, ou ambos durante transição)
7. Reload da página com `subscription_id` carrega Home com banner pendente
8. Hugo consegue mudar status manualmente no painel Supabase pra `active`, F5 no portal e banner some
9. `coverage_unconfirmed = true` aparece no e-mail quando aplicável (fallback ViaCEP)
10. Stub `postWaitlist` em `src/utils/api.js` foi substituído por chamada real ao endpoint
11. Variáveis de ambiente configuradas no Vercel (não em arquivo `.env` commitado)

---

## 6. Princípios mantidos da sessão anterior

- Evolve, don't revolutionize: refactor cirúrgico, sem reescrever o que funciona
- Zero coleta de cartão no portal: Asaas no link
- Hugo é notificado por e-mail e gerencia cobrança manualmente
- Sem auth real no MVP: localStorage como credencial de sessão
- RLS fechado por padrão: acesso só via Vercel Function com service_role
