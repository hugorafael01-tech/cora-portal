# Portal do Assinante — Status Atual

_Auto-gerado em 2026-05-09 por Claude Code. Não editar manualmente acima da seção "Pendências não-código"._

## Versão
- **App:** v0.0.0 (produto v3.2.7)
- **Branch:** main
- **Último commit:** `e90a00f` — 2026-05-09 — docs: consolida feedbacks UX e pendencias das telas internas

## Rotas / páginas
- src/pages/PreCadastro.jsx

## Componentes principais
- src/components/CEPField.jsx _(Fase 3)_
- src/components/CoverageBlocker.jsx _(Fase 3)_
- src/components/PendingPaymentBanner.jsx _(Fase 6/7)_
- src/components/ProductCard.jsx

## Dependências relevantes
- react @ ^19.2.4
- @supabase/supabase-js _(novo na Fase 7)_
- resend _(novo na Fase 7)_

## Marcadores de integração (grep)
| Termo | Arquivos |
|---|---|
| asaas | 0 |
| otp | 0 |
| whatsapp | 8 |
| webhook | 0 |
| supabase | 4 (lib + endpoints + migration) |
| resend | 2 (lib + endpoint) |
| stripe | 0 |
| pagar.me | 0 |

## TODOs e FIXMEs no código
Nenhum encontrado

## Últimos 10 commits
- `e90a00f` — 2026-05-09 — docs: consolida feedbacks UX e pendencias das telas internas
- `257bc19` — 2026-05-09 — docs: add post-Phase 7 continuation briefing
- `b2833a0` — 2026-05-09 — docs: update PORTAL_STATUS with Phase 7 completion
- `58da702` — 2026-05-09 — feat(onboarding): fase 7 — backend (Supabase + Resend + Vercel Functions)
- `5adcb70` — 2026-05-05 — docs: briefing focado da Fase 7 (backend)
- `cf97f4f` — 2026-05-05 — docs: atualiza status pos-Fase 6
- `6021b98` — 2026-05-05 — feat(onboarding): fase 6 — banner pendente + bloqueio Cardapio + Home
- `b3c99e3` — 2026-05-04 — feat(onboarding): fase 5 — Welcome reformulada + persistencia local
- `9814436` — 2026-05-04 — fix(onboarding): placeholder de rua/bairro no fallback do ViaCEP
- `e318f2a` — 2026-05-04 — feat(onboarding): fase 4 — refactor da T1 (Sobre voce + Entrega)

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
  - Continuação pós-Fase 7 (4 frentes mapeadas) em `docs/CORA_Briefing_PosFase7.md`
  - Feedbacks UXers + pendências nas 4 telas internas em `docs/CORA_Telas_Internas_Pendencias.md`
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
- [x] SPF/DKIM no `acora.com.br` no Resend — **concluído em 09/05/2026** (task ClickUp: 86e1a8q5t fechada). Domínio verificado, EMAIL_FROM=portal@acora.com.br em Production.
- [x] Definir Asaas CPF vs CNPJ antes de criar conta (task ClickUp: 86e0rghwq) — **resolvido**

## Gap spec × código (a reconciliar)
- Spec v3.0 cita Stripe/Pagar.me como gateway → produto migrou pra Asaas. Atualizar seção 7.2 na próxima consolidação.
- Bottom nav da spec v3.0 (Home, Demonstrativo, Cardápio, Perfil) substituída na v3.1 (Home, Sua Assinatura, Cardápio, Perfil). Código reflete v3.1.
- Auth: spec ainda fala em magic link Supabase. Decisão atual (Fase 7): localStorage com `subscription_id` funciona como credencial durável no MVP. Auth real (OTP WhatsApp ou magic link via Supabase Auth) é v2, quando tiver assinantes ativos pagando.

## Próximo foco acordado

4 frentes mapeadas em `docs/CORA_Briefing_PosFase7.md`, em ordem de prioridade:

- **Frente A — Capacity gate antes do lançamento** (task ClickUp: [86e1a8q50](https://app.clickup.com/t/86e1a8q50), high). Tabela `app_settings` com flag `subscriptions_open`, nova tabela `capacity_waitlist`, controle manual via SQL Editor. Bloqueante pro lançamento de agosto. Próximo na fila. Estimativa: 2-3h.
- **Frente B — SPF/DKIM no domínio acora.com.br no Resend** (task ClickUp: [86e1a8q5t](https://app.clickup.com/t/86e1a8q5t), high). ✅ **Concluída em 09/05/2026.** Domínio verificado, EMAIL_FROM=portal@acora.com.br em Production, e-mail chegando na inbox do Gmail.
- **Frente C — Telas internas pós-feedback UX.** Doc fonte: `docs/CORA_Telas_Internas_Pendencias.md`. 5 sub-itens distribuídos pelas 4 telas internas, exige discussão prévia por item antes de virar briefing técnico. Começar pelo item 1 (hierarquia da Home). Múltiplas sessões.
- **Frente D — Whitelist de cobertura** — pendência da Fase 8 (`admin.acora.com.br`): endpoint pra consultar `coverage_whitelist` no banco, refatorar `estaNaWhitelist` em `src/utils/coverage.js` pra async. Hoje retorna sempre false (lista local vazia em `WHITELIST_HARDCODED`).

## Última sessão de trabalho
- **Data:** 2026-05-09 (continuação)
- **Tema:** Frente B do pós-Fase 7 — SPF/DKIM no domínio acora.com.br no Resend
- **Saída:**
  - Domínio `acora.com.br` adicionado e verificado no Resend (registros SPF, DKIM, MX cadastrados no Registro.br após correção do MX que tinha sido cadastrado como TXT).
  - 5 variáveis de ambiente configuradas no Vercel (Production + Preview): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TO`.
  - `EMAIL_FROM=portal@acora.com.br` em Production, `EMAIL_FROM=onboarding@resend.dev` mantido em Preview pra testes.
  - Deploy de produção via `vercel --prod` (commit `e90a00f`).
  - Teste end-to-end: subscription criada em `app.acora.com.br`, e-mail chegou na inbox do Gmail com remetente `portal@acora.com.br` (não caiu em spam).
  - Briefing de continuação `docs/CORA_Briefing_PosFase7.md` commitado (commit `257bc19`).
  - Task ClickUp 86e1a8q5t fechada.
- **Pendência registrada:** DMARC ainda não configurado (bonus opcional, `p=none` pra monitoring).

## Sessão anterior
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
