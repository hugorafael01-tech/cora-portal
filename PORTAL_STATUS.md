# Portal do Assinante — Status Atual

_Auto-gerado em 2026-05-09 por Claude Code. Não editar manualmente acima da seção "Pendências não-código"._

## Versão
- **App:** v0.0.0 (produto v3.2.7)
- **Branch:** main
- **Último commit:** `e90a00f` — 2026-05-09 — docs: consolida feedbacks UX e pendencias das telas internas

## Rotas / páginas
- src/pages/PreCadastro.jsx
- src/pages/CapacityWaitlist.jsx _(Frente A)_

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
| supabase | 6 (lib + 4 endpoints + 2 migrations) |
| resend | 3 (lib + 2 endpoints) |
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

- **Frente A — Capacity gate antes do lançamento** (task ClickUp: [86e1a8q50](https://app.clickup.com/t/86e1a8q50), high). ✅ **Concluída em 2026-05-10.** Migration `0002_capacity_gate.sql` (tabelas `app_settings` + `capacity_waitlist`), endpoints `GET /api/settings`, `POST /api/capacity-waitlist`, check do gate em `POST /api/subscriptions`, página `src/pages/CapacityWaitlist.jsx`, Splash do Onboarding em modo fechado, handler 409 com toast de redirect. Controle do gate via SQL Editor (`UPDATE app_settings SET subscriptions_open = false WHERE id = 1`).
- **Frente B — SPF/DKIM no domínio acora.com.br no Resend** (task ClickUp: [86e1a8q5t](https://app.clickup.com/t/86e1a8q5t), high). ✅ **Concluída em 09/05/2026.** Domínio verificado, EMAIL_FROM=portal@acora.com.br em Production, e-mail chegando na inbox do Gmail.
- **Frente C — Telas internas pós-feedback UX.** Doc fonte: `docs/CORA_Telas_Internas_Pendencias.md`. 5 sub-itens distribuídos pelas 4 telas internas, exige discussão prévia por item antes de virar briefing técnico. Começar pelo item 1 (hierarquia da Home). Múltiplas sessões.
- **Frente D — Whitelist de cobertura** — pendência da Fase 8 (`admin.acora.com.br`): endpoint pra consultar `coverage_whitelist` no banco, refatorar `estaNaWhitelist` em `src/utils/coverage.js` pra async. Hoje retorna sempre false (lista local vazia em `WHITELIST_HARDCODED`).

## Última sessão de trabalho
- **Data:** 2026-05-11
- **Tema:** Frente A — ajustes pós-testes (copy + UX do C6) — task ClickUp 86e1a8q50, briefing `docs/CORA_Briefing_FrenteA_Ajustes.md`
- **Branch:** `feat/capacity-gate` (continuação)
- **Saída:**
  - **Copy revisada** com tom calibrado pela skill brand voice da Cora (sem travessão, sem rule of three, sem AI vocab):
    - Splash modo fechado em `src/Onboarding.jsx`: "As vagas dessa rodada já foram preenchidas. Estamos ampliando a produção aos poucos. Deixa seu contato e te avisamos quando abrir mais vagas." Botão pra `Quero entrar`.
    - `src/pages/CapacityWaitlist.jsx`: header trocado pra "Estamos ampliando a produção. Vamos te avisar por email assim que abrir uma vaga." (sem título separado em destaque). CTA do form pra `Pronto`. Tela de confirmação: "Recebemos seu contato. / Assim que uma vaga abrir te avisamos por email, ok? / Enquanto isso, acompanha a gente no Instagram @cora.padaria. / Valeu pela paciência."
    - Email Resend em `api/capacity-waitlist.js`: subject pra `Recebemos seu contato`; body texto+HTML alinhados com a nova copy.
  - **Fix UX do C6 — banner persistente** substituindo o toast curto. `App.jsx` ganhou `waitlistReason` state (`'splash' | 'closed-during-flow'`); `goToCapacityWaitlist(reason)` agora seta o reason antes de mudar a rota. Toast antigo removido (`gateRedirectToast` + useEffect de timeout zerado). `Onboarding.jsx`: Splash chama `onGoToCapacityWaitlist('splash')`; handler de 409 chama `onGoToCapacityWaitlist('closed-during-flow')`. `CapacityWaitlist.jsx` recebe prop `reason` e renderiza `<RedirectBanner/>` no topo somente quando `reason === 'closed-during-flow' && !submitted` (banner some quando o user submete e cai na tela de confirmação). Visual: fundo `B[50]`, borda `B[100]`, texto `B[900]`, sem ícone, sem cor de erro. Copy: "As vagas dessa rodada acabaram de fechar. Deixa seu contato pra próxima."
  - **O que NÃO mudou** (conforme Seção 5 do briefing de ajustes): schema do banco, endpoints `/api/settings`, validações, fluxo de idempotência, mecânica do flip via SQL Editor, mensagens de erro do form.
  - **Pendência operacional:** rodar C3-bis e C6-bis (Seção 4 do briefing) no Preview após deploy. C6-bis é o foco — confirmar banner aparece no redirect, não some sozinho, e some quando o user submete e cai na confirmação.
  - **Issue pré-existente registrada (fora desta frente):** `POST /api/lead 404` no `PreCadastro.jsx:256` em ambiente local. Pendente: criar endpoint stub local, apontar pro webhook Make.com, ou documentar que `/interesse` só funciona em deploy. Sugestão: nova task ClickUp na lista Digital & Portal quando Hugo decidir a abordagem.

## Sessão anterior
- **Data:** 2026-05-10
- **Tema:** Frente A do pós-Fase 7 — Capacity gate antes do lançamento (task ClickUp: 86e1a8q50)
- **Branch:** `feat/capacity-gate`
- **Saída:**
  - **Banco (Supabase):** migration `0002_capacity_gate.sql` cria `app_settings` (singleton com `id=1`, flag `subscriptions_open` boolean default true) + `capacity_waitlist` (nome/email/whatsapp/cep, unique index em `email` via `citext` pra idempotência case-insensitive). RLS deny-all nas duas. Total de tabelas: 5 (subscriptions, coverage_waitlist, coverage_whitelist, **app_settings**, **capacity_waitlist**).
  - **Endpoints (Vercel Functions):** `GET /api/settings` retorna `{subscriptions_open}` (fallback seguro = aberto se a row sumir). `POST /api/capacity-waitlist` valida nome/email/whatsapp/cep, insere, trata 23505 retornando 200 com `status: already_exists`, dispara email Resend best-effort (template texto+HTML simples, copy da Seção 7.6 do briefing) somente em criação nova. `POST /api/subscriptions` agora lê `app_settings.subscriptions_open` antes de validar payload — se `false`, retorna 409 `{error: 'subscriptions_closed'}` (defesa em profundidade contra condição de corrida).
  - **Frontend:** `src/utils/api.js` ganhou `getSettings()` e `postCapacityWaitlist()`. `throwApiError` agora anexa `.code` e `.status` ao Error pra callers detectarem casos específicos. `App.jsx` faz `getSettings()` no boot, mantém estado `subscriptionsOpen`, expõe via prop pra `CoraOnboarding`, adiciona rota `scr === 'lista-espera'` com toast de redirect. `Onboarding.jsx`: Splash agora tem dois modos (aberto/fechado via prop `gateClosed`), handler do POST subscription captura `err.code === 'subscriptions_closed'` e dispara toast da Seção 7.8 antes de redirecionar pra `lista-espera`. Página nova `src/pages/CapacityWaitlist.jsx` (form nome/email/whatsapp/cep + tela de confirmação via state `submitted`, reaproveita `CEPField` e estética alinhada com `CoverageBlocker`).
  - **Copy:** strings da Seção 7 do briefing aplicadas literalmente (sem travessão, sem reescrita pra "soar mais educado").
  - **Pendência operacional:** rodar a migration no ambiente Supabase (via CLI `supabase db push` ou colar no SQL Editor) antes de testar end-to-end. Validar manualmente C1-C8 (Seção 8 do briefing); C6 é o crítico (race entre Splash aberto → SQL flip → POST subscription → 409 → toast + redirect). Variáveis de ambiente existentes (`EMAIL_FROM`, `RESEND_API_KEY`, `SUPABASE_*`) reaproveitadas — sem novas envs.

## Sessão 2026-05-09 (continuação)
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

## Sessões anteriores no histórico
- **2026-05-09 — Fase 7 do refactor de onboarding — backend completo (Supabase + Resend + Vercel Functions)**
- **Saída:** branch `refactor/onboarding-fase-0` mergeada em main (commit `58da702`, 19 arquivos, +1454/-83):
  - **Banco (Supabase):** migration `0001_initial.sql` aplicada. Tabelas `subscriptions`, `coverage_waitlist`, `coverage_whitelist`. ENUM `subscription_status`. RLS `deny-all` nas 3. Constraint `valor_mensal_check` (defesa contra payload corrompido). Índice parcial único `subscriptions_cpf_pending_uniq` (idempotência por CPF + status pending_payment).
  - **Endpoints (Vercel Functions):** `POST /api/subscriptions` cria registro, dispara e-mail Resend, trata duplicata retornando id existente sem reenvio. `GET /api/subscriptions/{id}` retorna apenas campos necessários pra Home (sem CPF, e-mail, WhatsApp, endereço completo). `POST /api/coverage-waitlist` substitui stub anterior em `src/utils/api.js`.
  - **Frontend:** libs server-side `src/lib/{supabase-admin,resend,validators}.js`. Funções reais `postSubscription`, `getSubscription`, `postWaitlist` em `src/utils/api.js`. `reconcileSubscription()` em `src/utils/subscription.js` (sincroniza status do servidor pós-F5). Welcome (T2) chama POST e salva `{id, status, ...payload}` no localStorage. Home com `useEffect` que chama reconcile na montagem.
  - **E-mail transacional:** Resend integrado com `await + try/catch` (best-effort, falha não bloqueia resposta da subscription). E-mail vai pro Gmail temporário até Workspace ficar pronto.
  - **Validação:** 11/11 testes técnicos via harness Node (mocka req/res do Vercel) + 4/5 cenários end-to-end manuais (1 dentro de cobertura, 2 fora, 4 idempotência clique duplo, 5 reconcile pós-UPDATE manual). Cenário 3 (whitelist) é pendência da Fase 8.
- **Sessões anteriores no histórico:** Fases 0-6 do refactor de onboarding (2026-05-05) — UI completa.

<!-- STATUS_MANUAL_END -->
