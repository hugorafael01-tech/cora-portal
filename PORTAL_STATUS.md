# Portal do Assinante — Status Atual

_Auto-gerado em 2026-05-09 12:00 por Claude Code. Não editar manualmente acima da seção "Pendências não-código"._

## Versão
- **App:** v0.0.0 (produto v3.2.7)
- **Branch:** main
- **Último commit:** `58da702` — 2026-05-09 — feat(onboarding): fase 7 — backend (Supabase + Resend + Vercel Functions)

## Rotas / páginas
- src/pages/PreCadastro.jsx

## Componentes principais
- src/components/ProductCard.jsx
- src/components/PendingPaymentBanner.jsx _(novo na Fase 7)_

## Dependências relevantes
- react @ ^19.2.4
- @supabase/supabase-js _(novo na Fase 7)_
- resend _(novo na Fase 7)_

## Marcadores de integração (grep)
| Termo | Arquivos | Ocorrências |
|---|---|---|
| asaas | 0 | 0 |
| otp | 1 | 2 |
| whatsapp | 3 | 29 |
| webhook | 0 | 0 |
| supabase | 4 | (lib + endpoints + migration) |
| resend | 2 | (lib + endpoint) |
| stripe | 0 | 0 |
| pagar.me | 0 | 0 |

## TODOs e FIXMEs no código
Nenhum encontrado

## Últimos 10 commits
- `58da702` — 2026-05-09 — feat(onboarding): fase 7 — backend (Supabase + Resend + Vercel Functions)
- _(commits das Fases 0-6 da branch refactor/onboarding-fase-0 — Claude Code regenera lista após merge)_

## Build / Deploy
- **Último build local:** 2026-05-09
- **vercel.json:** presente _(rewrites refinados na Fase 7)_

---

## Pendências não-código
_Esta seção é editada manualmente durante sessões de trabalho. Claude Code não sobrescreve daqui pra baixo._

<!-- STATUS_MANUAL_START -->

## Spec vigente
- **Portal:** v3.0 (mar/2026) + Adendo v3.1 (mar/2026)
  - Backend (schema, endpoints, persistência) detalhado em `docs/CORA_Briefing_Fase7_Backend.md` e `docs/CORA_Prompt_Fase7_ClaudeCode.md`
- **Próxima consolidação prevista:** v4.0 (pós-testes de usabilidade)
- **Local dos docs:** projeto do Claude (CORA_Portal_Assinante_Especificacao_v3.docx + CORA_Portal_Adendo_v3_1_Redesign.docx)

## Observações sobre este arquivo
- `package.json` com version `0.0.0` — produto é v3.2.7, não há versionamento formal no código. A decidir: adotar semver no package.json ou tratar versão só como conceito de produto.
- Listagem de rotas/componentes pode estar incompleta (top-level apenas). Ajustar prompt na próxima regeneração se for o caso.

## Decisões de produto aguardando Hugo
- [x] Preços unitários dos pães extras na cesta semanal — **resolvido** (CORA_Precos_e_Planos_v1.md)
- [ ] Swap Original ↔ Integral é cost-neutral? Validar contra CORA_Fichas_Producao_v5.xlsx
- [ ] Como cobranças de extras aparecem no billing do Asaas (linha única? linha separada?)
- [x] Conflito de posicionamento: 3 tiers antigos vs. modelo único R$99 + R$15 frete — **resolvido: modelo único mantido**

## Blockers externos (fora do repo)
- [x] Conta Asaas — **criada** (task ClickUp: 86e0rgdhn)
- [x] Conta Supabase — **provisionada na Fase 7**
- [x] Conta Resend — **provisionada na Fase 7**
- [ ] Google Workspace `hugo@acora.com.br` — setup pendente. Fase 7 mitigou usando Gmail temporário (`hugorafael01@gmail.com` como `EMAIL_TO`; domínio default do Resend como `EMAIL_FROM`) até Workspace ficar pronto.
- [ ] SPF/DKIM no `acora.com.br` no Resend — bloqueante pro deploy de prod (task ClickUp: [86e1a8q5t](https://app.clickup.com/t/86e1a8q5t))
- [x] Definir Asaas CPF vs CNPJ antes de criar conta (task ClickUp: 86e0rghwq) — **resolvido**

## Gap spec × código (a reconciliar)
- Spec v3.0 cita Stripe/Pagar.me como gateway → produto migrou pra Asaas. Atualizar seção 7.2 na próxima consolidação.
- Bottom nav da spec v3.0 (Home, Demonstrativo, Cardápio, Perfil) substituída na v3.1 (Home, Sua Assinatura, Cardápio, Perfil). Código reflete v3.1.
- Auth: spec ainda fala em magic link Supabase. Decisão atual (Fase 7): localStorage com `subscription_id` funciona como credencial durável no MVP. Auth real (OTP WhatsApp ou magic link via Supabase Auth) é v2, quando tiver assinantes ativos pagando.

## Próximo foco acordado
- **Capacity gate antes do lançamento** (task ClickUp: [86e1a8q50](https://app.clickup.com/t/86e1a8q50), prioridade high). Tabela `app_settings` com flag `subscriptions_open`, nova tabela `capacity_waitlist`, controle manual via SQL Editor. Bloqueante pro lançamento de agosto. Estimativa: 2-3h.
- **SPF/DKIM no domínio acora.com.br no Resend** (task ClickUp: [86e1a8q5t](https://app.clickup.com/t/86e1a8q5t), prioridade high). Antes do primeiro deploy de prod. Estimativa: 30min de config + propagação DNS.
- **Cenário 3 / Whitelist de cobertura** — pendência da Fase 8 (`admin.acora.com.br`): endpoint pra consultar `coverage_whitelist` no banco, refatorar `estaNaWhitelist` em `src/utils/coverage.js` pra async. Hoje retorna sempre false (lista local vazia em `WHITELIST_HARDCODED`).

## Última sessão de trabalho
- **Data:** 2026-05-09
- **Tema:** Fase 7 do refactor de onboarding — backend completo (Supabase + Resend + Vercel Functions)
- **Saída:** branch `refactor/onboarding-fase-0` mergeada em main (commit `58da702`, 19 arquivos, +1454/-83):
  - **Banco (Supabase):** migration `0001_initial.sql` aplicada. Tabelas `subscriptions`, `coverage_waitlist`, `coverage_whitelist`. ENUM `subscription_status`. RLS `deny-all` nas 3. Constraint `valor_mensal_check` (defesa contra payload corrompido). Índice parcial único `subscriptions_cpf_pending_uniq` (idempotência por CPF + status pending_payment).
  - **Endpoints (Vercel Functions):** `POST /api/subscriptions` cria registro, dispara e-mail Resend, trata duplicata retornando id existente sem reenvio. `GET /api/subscriptions/{id}` retorna apenas campos necessários pra Home (sem CPF, e-mail, WhatsApp, endereço completo). `POST /api/coverage-waitlist` substitui stub anterior em `src/utils/api.js`.
  - **Frontend:** libs server-side `src/lib/{supabase-admin,resend,validators}.js`. Funções reais `postSubscription`, `getSubscription`, `postWaitlist` em `src/utils/api.js`. `reconcileSubscription()` em `src/utils/subscription.js` (sincroniza status do servidor pós-F5). Welcome (T2) chama POST e salva `{id, status, ...payload}` no localStorage. Home com `useEffect` que chama reconcile na montagem.
  - **E-mail transacional:** Resend integrado com `await + try/catch` (best-effort, falha não bloqueia resposta da subscription). E-mail vai pro Gmail temporário até Workspace ficar pronto.
  - **Validação:** 11/11 testes técnicos via harness Node (mocka req/res do Vercel) + 4/5 cenários end-to-end manuais (1 dentro de cobertura, 2 fora, 4 idempotência clique duplo, 5 reconcile pós-UPDATE manual). Cenário 3 (whitelist) é pendência da Fase 8.
- **Sessões anteriores no histórico:** Fases 0-6 do refactor de onboarding (2026-05-05) — UI completa.

<!-- STATUS_MANUAL_END -->
