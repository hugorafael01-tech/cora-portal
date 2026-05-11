# Frente A — Capacity gate antes do lançamento

**Versão:** v1
**Data:** 10/05/2026
**Task ClickUp:** [86e1a8q50](https://app.clickup.com/t/86e1a8q50)
**Branch sugerida:** `feat/capacity-gate`
**Estimativa:** 2-3h
**Contexto upstream:** Fase 7 do refactor de onboarding (commit `58da702`), continuação pós-Fase 7 em `docs/CORA_Briefing_PosFase7.md`

---

## 1. Contexto

Quando o número de assinaturas ativas atingir o teto produtivo de lançamento (~50: 30 Alphas + 20 Influentes), o portal precisa parar de aceitar novas subscriptions automaticamente. Sem esse mecanismo, alguém pode se cadastrar e pagar sem que haja capacidade de produção.

Este é um problema diferente da `coverage_waitlist` (lista de espera por bairro fora de cobertura). Aqui a lista é por **capacidade**, não por localização. Os dois mecanismos coexistem.

Bloqueante pro lançamento de agosto.

---

## 2. Decisões fechadas (sessão de 10/05)

1. **Gate dispara no Splash.** Usuário fora de capacidade vê o aviso antes de entrar no onboarding. Não passa pelo T1 (dados pessoais + CEP completo).

2. **Campos da `capacity_waitlist`:** `id`, `nome`, `email`, `whatsapp`, `cep`, `created_at`. CEP em vez de endereço completo (suficiente pra Hugo saber a região da fila ao priorizar liberações).

3. **Email é o canal de notificação automática.** Resend já integrado. WhatsApp fica salvo no banco como canal manual do Hugo (ação humana ao abrir vaga). Email obrigatório no form.

4. **Backend valida a flag.** `POST /api/subscriptions` checa `app_settings.subscriptions_open` antes de inserir. Se `false` → 409. Defesa contra condição de corrida (página aberta antes do flip do switch).

---

## 3. Arquitetura geral

### Fluxo no portal

```
[App.jsx boot]
  └─ GET /api/settings ─→ subscriptionsOpen: bool
       │
       ├─ true ──→ Splash normal ─→ T1 ─→ T2 ─→ Welcome ─→ POST /api/subscriptions
       │                                                      │
       │                                                      ├─ 201 (criada) ─→ Home
       │                                                      └─ 409 closed ─→ /lista-espera (redirect)
       │
       └─ false ─→ Splash modo fechado ─→ /lista-espera
                                              │
                                              └─ POST /api/capacity-waitlist
                                                    │
                                                    ├─ 201 + email confirmação ─→ Tela confirmação
                                                    └─ 200 (já existia, idempotente) ─→ Tela confirmação
```

### Controle do flip

Manual via Supabase SQL Editor. Sem UI admin no MVP.

```sql
-- Fechar gate
UPDATE app_settings SET subscriptions_open = false, updated_at = now() WHERE id = 1;

-- Reabrir gate
UPDATE app_settings SET subscriptions_open = true, updated_at = now() WHERE id = 1;
```

---

## 4. Schema SQL

### Migration `supabase/migrations/0002_capacity_gate.sql`

```sql
-- ============================================================
-- Migration 0002: Capacity gate
-- Tabela app_settings (singleton) + capacity_waitlist
-- ============================================================

-- Garantir extensão citext (já habilitada na 0001, mas defensivo)
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

-- ------------------------------------------------------------
-- Comentários (documentação inline)
-- ------------------------------------------------------------
COMMENT ON TABLE app_settings IS 'Singleton de configurações globais do portal. Linha única forçada por CHECK (id = 1).';
COMMENT ON COLUMN app_settings.subscriptions_open IS 'Flag mestre. Quando false, portal bloqueia novas subscriptions e oferece capacity_waitlist.';
COMMENT ON TABLE capacity_waitlist IS 'Lista de espera por capacidade produtiva. Diferente de coverage_waitlist (lista por bairro fora de cobertura).';
```

### Notas sobre o schema

- **CEP normalizado:** 8 dígitos sem hífen. Frontend remove o hífen antes de enviar (mesmo padrão do `CEPField.jsx`).
- **WhatsApp:** validação aceita 10 ou 11 dígitos (com ou sem 9 inicial). Frontend envia só dígitos.
- **Sem `complemento` ou `bairro`:** se Hugo quiser segmentar por bairro depois, faz lookup via ViaCEP no momento da liberação. Mantém schema enxuto.

---

## 5. Endpoints (Vercel Functions)

### 5.1 `GET /api/settings` (novo)

**Função:** Retorna flags globais lidas pelo App no boot.

**Response:**
```json
{
  "subscriptions_open": true
}
```

**Implementação:**
- Lê `app_settings WHERE id = 1` via `supabase-admin` (service_role).
- Cache: sem cache por enquanto. Latência aceitável e simplifica raciocínio. Se virar gargalo, adiciona cache de 30s in-memory na function.
- Erro: se a row não existir (não deveria, seed garante), retorna `{"subscriptions_open": true}` como fallback seguro (assume aberto). Loga erro.

### 5.2 `POST /api/capacity-waitlist` (novo)

**Função:** Insere registro na lista de espera por capacidade. Idempotente por email.

**Request body:**
```json
{
  "nome": "Maria Silva",
  "email": "maria@exemplo.com",
  "whatsapp": "21999998888",
  "cep": "24220000"
}
```

**Response 201 (novo registro):**
```json
{
  "id": "uuid-aqui",
  "status": "created"
}
```

**Response 200 (já existia, idempotência):**
```json
{
  "id": "uuid-existente",
  "status": "already_exists"
}
```

**Response 400 (validação):**
```json
{
  "error": "validation_failed",
  "fields": { "email": "invalido" }
}
```

**Implementação:**
- Reusa `validators.js` (criado na Fase 7) pra validar nome/email/whatsapp/cep.
- Tenta INSERT. Se violar `capacity_waitlist_email_uniq`, faz SELECT do existente e retorna 200.
- Dispara email Resend best-effort (mesmo padrão do POST subscriptions): `await + try/catch`, falha de email não bloqueia a resposta.
- Email só dispara em criação nova (201), não em idempotência (200).

### 5.3 Ajuste em `POST /api/subscriptions` (defesa em profundidade)

**Mudança:** Lê `app_settings.subscriptions_open` ANTES de validar payload. Se `false`, retorna 409 imediato.

**Response 409 (gate fechado):**
```json
{
  "error": "subscriptions_closed",
  "message": "As vagas estão temporariamente fechadas. Entre na lista de espera."
}
```

**Frontend:** Captura 409 com esse `error` e redireciona pra `/lista-espera` (ou modal equivalente, ver Seção 6).

---

## 6. Frontend

### 6.1 Arquivos novos

- `src/pages/CapacityWaitlist.jsx` — página única que contém form + estado de confirmação (controlado por state local `submitted`).
- `src/utils/settings.js` — pequeno helper que chama `getSettings()` e expõe via contexto ou hook.

### 6.2 Arquivos alterados

- `src/utils/api.js` — adicionar `getSettings()` e `postCapacityWaitlist()`.
- `App.jsx` — chamar `getSettings()` no boot (`useEffect` na montagem), guardar `subscriptionsOpen` em state. Splash recebe como prop.
- `Splash` (ou componente equivalente) — renderiza dois modos baseado em `subscriptionsOpen`. Modo fechado mostra copy de gate e CTA pra lista de espera.
- Welcome / handler do POST subscription — tratar 409 `subscriptions_closed` redirecionando pra lista de espera.

### 6.3 Roteamento

Hoje o portal usa renderização condicional simples (sem router visível na estrutura). Manter padrão:

- Estado em `App.jsx`: `route: 'precadastro' | 'onboarding' | 'lista-espera' | 'home'`
- Quando `subscriptionsOpen === false` no Splash → clique no CTA seta `route = 'lista-espera'`
- Quando POST subscription retorna 409 → redirect via setState pra `route = 'lista-espera'`

### 6.4 Componente `CapacityWaitlist.jsx` — estrutura

```jsx
function CapacityWaitlist() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);
  // form state: nome, email, whatsapp, cep
  // validações inline padrão do projeto (estilo PreCadastro)

  if (submitted) {
    return <ConfirmationView id={submittedId} />;
  }
  return <WaitlistForm onSubmit={handleSubmit} />;
}
```

Reaproveitar:
- `CEPField.jsx` pro CEP (já valida via ViaCEP).
- Estética e tipografia do `CoverageBlocker.jsx` pra consistência visual.
- Padrão de erro inline do `PreCadastro` (borda vermelha + mensagem).

---

## 7. Copy (revisada pra brand voice)

> Regras aplicadas: sem travessão, sem rule of three, sem AI vocab. Tom founder-led, direto, honesto sobre o ritmo de produção.

### 7.1 Splash — modo fechado

Substitui o subtítulo "Vamos montar sua Assinatura?" por:

```
As vagas desta rodada já foram preenchidas.
Se quiser ficar pra próxima, deixe seus dados na lista de espera.
```

**Botão:** `Entrar na lista de espera`

### 7.2 Tela de captura — header

```
Lista de espera
Avisamos por email quando uma vaga abrir.
```

### 7.3 Tela de captura — labels

- Nome: `Seu nome`
- Email: `Email`
- WhatsApp: `WhatsApp`
- CEP: `CEP da entrega`

### 7.4 Tela de captura — CTA

`Entrar na lista`

### 7.5 Tela de confirmação

```
Você está na lista.

Avisamos por email quando abrir uma vaga.
O momento depende do ritmo de produção.

Enquanto isso, acompanha a gente no Instagram @cora.padaria.

Obrigado pela paciência.
```

### 7.6 Email de confirmação (Resend)

**Subject:** `Você está na lista de espera da Cora`

**Body (texto + HTML simples):**
```
Oi, [nome].

Recebemos seu cadastro na lista de espera.
Quando uma vaga abrir, avisamos por este email.
O momento depende do ritmo de produção.

Enquanto isso, acompanha a gente no Instagram @cora.padaria.

Obrigado pela paciência.

Hugo
Padeiro apaixonado
```

### 7.7 Erros no form

- Nome inválido: `Precisamos do seu nome.`
- Email inválido: `Email inválido.`
- WhatsApp inválido: `Confira o número com DDD.`
- CEP inválido: `CEP inválido.`

### 7.8 Mensagem de redirect (caso POST subscription retorne 409)

Toast curto antes de mudar pra `/lista-espera`:

```
As vagas fecharam enquanto você navegava. Pode entrar na lista de espera.
```

---

## 8. Cenários de validação

### C1 — Gate aberto, fluxo normal funciona

- `subscriptions_open = true` (estado inicial)
- Abre `app.acora.com.br` → Splash mostra "Vamos montar sua Assinatura?"
- T1, T2, Welcome funcionam como antes
- POST subscription cria registro normalmente

### C2 — Gate fechado, Splash em modo fechado

- `UPDATE app_settings SET subscriptions_open = false WHERE id = 1`
- F5 no portal → Splash mostra copy de vagas fechadas + CTA "Entrar na lista de espera"
- Clique no CTA → vai pra `/lista-espera`

### C3 — Captura na lista funciona end-to-end

- Preenche nome, email, whatsapp, cep
- Submit → POST `/api/capacity-waitlist` retorna 201
- Email de confirmação chega na inbox (Gmail temporário ou domínio Cora dependendo do ambiente)
- Tela troca pra confirmação

### C4 — Idempotência por email

- Submete o mesmo email duas vezes seguidas
- Primeira: 201 + email enviado
- Segunda: 200 + email NÃO reenviado
- Banco tem 1 row, não 2

### C5 — Validação de payload

- Nome com 1 letra → erro inline
- Email inválido → erro inline
- WhatsApp com 9 dígitos → erro inline
- CEP com letra → erro inline
- Backend retorna 400 com `fields` se passar do frontend

### C6 — Defesa em profundidade (condição de corrida)

- Abre Splash com `subscriptions_open = true`, vai até a T2
- Hugo executa `UPDATE app_settings SET subscriptions_open = false`
- Usuário confirma na Welcome → POST `/api/subscriptions`
- Backend retorna 409 `subscriptions_closed`
- Frontend mostra toast e redireciona pra `/lista-espera`

### C7 — Reabertura do gate

- `UPDATE app_settings SET subscriptions_open = true`
- F5 no portal → Splash volta ao modo normal
- Onboarding funciona

### C8 — Persistência da lista de espera durante reabertura

- Pessoa entra na fila enquanto gate fechado
- Hugo reabre gate
- Pessoa pode voltar e completar onboarding normal (mesmo email pode virar subscriber)
- Decisão: não bloquear. Lista de espera é informativa, não constraint sobre o email poder virar subscriber.

---

## 9. O que NÃO mudar

- Estrutura atual de routing em `App.jsx` (só adicionar mais uma rota `'lista-espera'`)
- `CoverageBlocker.jsx` e `coverage_waitlist` (são mecanismo diferente, coexistem)
- Lógica de reconciliação de subscription (`reconcileSubscription`)
- localStorage como credencial durável (auth real é v2)
- Design system (cores, tipografia, componentes base)
- POST `/api/subscriptions` quando gate aberto — só adiciona o check no início
- Resend integration pattern (best-effort, falha não bloqueia)

---

## 10. Documentação a atualizar (no fim da sessão)

1. **`PORTAL_STATUS.md`** seção manual:
   - Marcar Frente A como concluída em "Próximo foco acordado"
   - Adicionar nova "Última sessão de trabalho" (Frente A, 10/05/2026, saída detalhada)
   - Atualizar contagem de tabelas (subscriptions, coverage_waitlist, coverage_whitelist, **app_settings**, **capacity_waitlist** = 5)
   - Marcador grep "supabase" e "resend" devem subir (mais arquivos tocando essas libs)
2. **ClickUp task 86e1a8q50:** comentar com resumo da sessão e fechar.
3. **`docs/CORA_Briefing_PosFase7.md`:** marcar Frente A como ✅ concluída.

---

## 11. Prompt pra colar no Claude Code

```
No cora-portal, implementar Frente A — Capacity gate antes do lançamento,
conforme docs/CORA_Briefing_FrenteA_CapacityGate.md.

Task ClickUp: 86e1a8q50.
Branch: feat/capacity-gate.

Antes de começar, ler o briefing completo. Em particular as Seções 4
(schema), 5 (endpoints), 6 (frontend) e 7 (copy aprovada).

Ordem de execução:

1. Migration: criar supabase/migrations/0002_capacity_gate.sql conforme
   Seção 4. Aplicar via supabase CLI ou SQL Editor.

2. Backend endpoints:
   - GET /api/settings — lê app_settings, retorna {subscriptions_open}
   - POST /api/capacity-waitlist — valida, insere, dispara email Resend
     (best-effort), idempotente por email
   - Ajustar POST /api/subscriptions: check do gate ANTES da validação;
     retorna 409 {error: 'subscriptions_closed'} se fechado

3. Frontend:
   - src/utils/api.js: getSettings(), postCapacityWaitlist()
   - App.jsx: useEffect que chama getSettings() no boot, expõe
     subscriptionsOpen via prop ou contexto. Nova rota 'lista-espera'
   - src/pages/CapacityWaitlist.jsx: form (nome, email, whatsapp, cep)
     + estado submitted que renderiza tela de confirmação. Reaproveitar
     CEPField.jsx e estética do CoverageBlocker.jsx
   - Splash em modo fechado: copy da Seção 7.1, CTA leva pra 'lista-espera'
   - Welcome (ou onde POST subscription é chamado): captura 409
     subscriptions_closed, mostra toast da Seção 7.8, redireciona pra
     'lista-espera'

4. Copy: usar EXATAMENTE as strings da Seção 7. Sem travessão. Sem
   reescrever pra "soar mais educado". O tom está calibrado.

5. Email de confirmação: template Resend conforme Seção 7.6. Texto
   simples + HTML básico (mesmo padrão do email da Fase 7).

Validar pelos cenários C1-C8 da Seção 8. C6 (condição de corrida) é o
crítico — testar manualmente alternando o flag no SQL Editor.

Ao final, atualizar PORTAL_STATUS.md conforme Seção 10 e me avisar
quando terminar.

Rodar npm run dev e fazer deploy de preview pra app.acora.com.br não
ser quebrado durante validação.
```

---

## 12. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Race: usuário com página aberta tenta POST após flip | Backend valida flag no `/api/subscriptions` (Seção 5.3) |
| Email não chega (Resend falha) | Best-effort: registro fica salvo. Tela de confirmação aparece mesmo sem email |
| Hugo esquece de flipar o switch ao bater 50 subs | Fora do escopo desta frente. Hugo monitora manualmente. Evolução futura: contagem automática (alternativa (b) da task) |
| Lista de espera não tem deduplicação por whatsapp | Aceito. Email é o canal principal de notificação, idempotência por email é suficiente |
| Pessoa na lista vira subscriber depois — registro fica órfão na waitlist | Aceito. Cleanup manual pelo Hugo no SQL Editor, ou ignorado (não atrapalha operação) |

---

*Briefing · Frente A · Capacity Gate · 10/05/2026 · Task ClickUp 86e1a8q50*
