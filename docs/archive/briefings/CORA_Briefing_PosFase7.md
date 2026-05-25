# Briefing — Continuação pós-Fase 7

**Data:** 2026-05-09
**Contexto:** Fase 7 do refactor de onboarding fechada e mergeada em main

---

## Onde paramos

Fase 7 (backend Supabase + Resend + Vercel Functions) foi entregue, validada e mergeada na main. Commit `58da702`.

**O que o portal tem hoje:**
- Banco real no Supabase (3 tabelas: `subscriptions`, `coverage_waitlist`, `coverage_whitelist`) com RLS deny-all
- 3 endpoints serverless: `POST /api/subscriptions`, `GET /api/subscriptions/{id}`, `POST /api/coverage-waitlist`
- E-mail transacional via Resend (best-effort com try/catch, fire-after-success)
- Frontend integrado: `reconcileSubscription()` no boot da Home sincroniza status pós-F5
- Idempotência por CPF (índice parcial único em status `pending_payment`)

**O que ainda não tem:**
- Auth real (localStorage com `subscription_id` é credencial de sessão no MVP)
- Webhook Asaas pra mudar status pra `active` (Hugo muda manualmente no Supabase)
- Backoffice (admin.acora.com.br — futuro)
- SPF/DKIM no domínio próprio (e-mail vai pelo domínio default do Resend, cai em spam)
- Capacity gate (sem teto técnico pro número de assinaturas)

---

## 3 frentes pendentes

### A. Capacity gate antes do lançamento ✅ CONCLUÍDA (2026-05-10)

**Task ClickUp:** [86e1a8q50](https://app.clickup.com/t/86e1a8q50) (high) — ver `docs/CORA_Briefing_FrenteA_CapacityGate.md` para o briefing detalhado e PORTAL_STATUS.md ("Última sessão de trabalho") para a saída.

Sem este mecanismo, o 51º assinante pode se cadastrar e pagar sem que haja capacidade de produção. Bloqueante pro lançamento de agosto.

**Solução acordada (opção a):**
- Tabela `app_settings` com campo `subscriptions_open BOOLEAN`
- Nova tabela `capacity_waitlist` (estrutura similar a `coverage_waitlist`)
- Hugo controla manualmente: `UPDATE app_settings SET subscriptions_open = false;`
- Portal lê a flag no GET inicial. Se `false`, T2 mostra "Vagas esgotadas — entre na lista de espera"
- Form salva em `capacity_waitlist`

**Estimativa:** 2-3h.

### B. SPF/DKIM no acora.com.br no Resend ⚠️ BLOQUEANTE PRO DEPLOY DE PROD

**Task ClickUp:** [86e1a8q5t](https://app.clickup.com/t/86e1a8q5t) (high)

Hoje os e-mails de assinatura nova caem em spam (validado nos testes). Sem isso, Hugo perde notificações de venda em produção.

**Passos:**
1. Resend → Domains → adicionar `acora.com.br`
2. Adicionar registros TXT/CNAME no Registro.br (zona DNS)
3. Verificar domínio no Resend
4. Trocar `EMAIL_FROM` no Vercel pra `portal@acora.com.br`
5. Disparar 1 subscription de teste pra confirmar inbox

**Independente do Google Workspace** (DNS distintos: Resend usa TXT/CNAME, Workspace usa MX).

**Estimativa:** 30min config + propagação DNS (15min-2h).

### C. Cenário 3 / Whitelist de cobertura — Fase 8

Pendência registrada. Endpoint pra consultar `coverage_whitelist`, refatorar `estaNaWhitelist` em `src/utils/coverage.js` pra async. Hoje retorna sempre false (lista local vazia em `WHITELIST_HARDCODED`).

Naturalmente entra junto com `admin.acora.com.br` (Fase 8).

---

## Estado do repositório

- **Branch principal:** `main`
- **Último commit:** `58da702` (Fase 7)
- **Stack:** Vite + React + Vercel Functions + Supabase + Resend
- **Subdomínios:** `app.acora.com.br` (live), `admin.acora.com.br` (futuro), `fin.acora.com.br` (futuro)

**Variáveis de ambiente em uso:**
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-only, bypassam RLS)
- `RESEND_API_KEY`, `EMAIL_FROM=onboarding@resend.dev` (default), `EMAIL_TO=hugorafael01@gmail.com`

**Decisões aguardando Hugo (PORTAL_STATUS.md):**
- Swap Original ↔ Integral é cost-neutral? (validar contra Fichas de Produção v5)
- Como cobranças de extras aparecem no Asaas (linha única ou separada)

---

## Onde achar contexto adicional

- `PORTAL_STATUS.md` (raiz do repo) — fonte da verdade do estado do portal
- `docs/CORA_Briefing_Fase7_Backend.md` — schema, payloads, validações
- `docs/CORA_Prompt_Fase7_ClaudeCode.md` — prompt completo executado pelo Claude Code
- `docs/CORA_Briefing_Refactor_Onboarding.md` — Fases 0-6 do onboarding (UI)
- Project knowledge no Claude: `CORA_Decisoes_v2.md`, `CORA_Precos_e_Planos_v1.md`, fichas de produção, etc.
- ClickUp lista Digital & Portal: `901712612053`

---

## Próximo passo

Hugo escolhe a frente. Recomendação: **A (capacity gate) primeiro** — é mais complexa, exige decisões técnicas, e é bloqueante. **B (SPF/DKIM)** dá pra fazer em paralelo (configuração de DNS + Resend, baixa fricção). **C (whitelist)** fica pra Fase 8 com o backoffice.
