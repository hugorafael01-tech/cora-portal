# Portal do Assinante — Status Atual

_Auto-gerado em 2026-05-15 por Claude Code. Não editar manualmente acima da seção "Pendências não-código"._

## Versão
- **App:** v0.0.0 (produto v3.2.7)
- **Branch:** main
- **Último commit:** `d8544aa` — 2026-05-15 — feat: Frente C item 3 — refactor do Cardápio, Home e Drawer

## Rotas / páginas
- src/pages/PreCadastro.jsx
- src/pages/CapacityWaitlist.jsx _(Frente A)_

## Componentes principais
- src/components/CEPField.jsx _(Fase 3)_
- src/components/CoverageBlocker.jsx _(Fase 3)_
- src/components/PendingPaymentBanner.jsx _(Fase 6/7)_
- src/components/ProductCard.jsx _(Frente C item 3: expand inline + props `onCardClick`/`inBasketLabel`)_
- `EditarCestaDrawer` _(inline em src/App.jsx — Frente C item 3)_
- `QtyStepper` _(inline em src/App.jsx — Frente C item 3, variants brand/neutral)_

## Dependências relevantes
- react @ ^19.2.4
- @supabase/supabase-js _(novo na Fase 7)_
- resend _(novo na Fase 7)_

## Marcadores de integração (grep)
| Termo | Arquivos |
|---|---|
| asaas | 1 (api/subscriptions/index.js) |
| otp | 0 |
| whatsapp | 13 |
| webhook | 1 (api/lead.js) |
| supabase | 12 (lib + 8 endpoints + 3 migrations) |
| resend | 4 (lib + 3 endpoints) |
| stripe | 0 |
| pagar.me | 0 |

## TODOs e FIXMEs no código
Nenhum encontrado

## Últimos 10 commits
- `d8544aa` — 2026-05-15 — feat: Frente C item 3 — refactor do Cardápio, Home e Drawer
- `f5ee452` — 2026-05-14 — fix(precadastro): força fontWeight 400 nos h1 com League Gothic
- `106a8f0` — 2026-05-14 — docs: decisoes + briefing + wireframe v2 da Frente C item 3
- `76515f5` — 2026-05-14 — docs: decisões da Frente C item 3 — Cardápio
- `01eb027` — 2026-05-13 — docs: atualiza PORTAL_STATUS com Frente C item 1 concluída (PR 1 + PR 2)
- `b88f410` — 2026-05-13 — feat(home): Hierarquia da Home — carrinho persistido com confirmação (Frente C item 1, PR 2) (#3)
- `f18335f` — 2026-05-12 — feat(weekly-orders): backend de cesta como carrinho persistido (Frente C item 1, PR 1) (#2)
- `751d3fc` — 2026-05-12 — docs: ajusta data do Bonus técnico (Google Workspace)
- `756ebb6` — 2026-05-11 — docs: decisões da Frente C item 1 — hierarquia da Home
- `cf4a360` — 2026-05-11 — docs: atualiza PORTAL_STATUS com Frente A concluída

## Build / Deploy
- **Último build local:** 2026-05-15
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
- [x] Google Workspace `hugo@acora.com.br` — **configurado em 12/05/2026.** Aliases criados: `oi@`, `noreply@`, `pedidos@` (todos entregam na inbox do hugo@). MX `acora.com.br` apontando pra `smtp.google.com` (Google) — MX `send.acora.com.br` continua pro Resend (bounces/auth).
- [x] SPF/DKIM no `acora.com.br` no Resend — **concluído em 09/05/2026** (task ClickUp: 86e1a8q5t fechada). Domínio verificado, EMAIL_FROM=portal@acora.com.br em Production.
- [x] Definir Asaas CPF vs CNPJ antes de criar conta (task ClickUp: 86e0rghwq) — **resolvido**

## Gap spec × código (a reconciliar)
- Spec v3.0 cita Stripe/Pagar.me como gateway → produto migrou pra Asaas. Atualizar seção 7.2 na próxima consolidação.
- Bottom nav da spec v3.0 (Home, Demonstrativo, Cardápio, Perfil) substituída na v3.1 (Home, Sua Assinatura, Cardápio, Perfil). Código reflete v3.1.
- Auth: spec ainda fala em magic link Supabase. Decisão atual (Fase 7): localStorage com `subscription_id` funciona como credencial durável no MVP. Auth real (OTP WhatsApp ou magic link via Supabase Auth) é v2, quando tiver assinantes ativos pagando.

## Próximo foco acordado

4 frentes mapeadas em `docs/CORA_Briefing_PosFase7.md`, em ordem de prioridade:

- **Frente A — Capacity gate antes do lançamento** (task ClickUp: [86e1a8q50](https://app.clickup.com/t/86e1a8q50), high). ✅ **Concluída em 11/05/2026.** Deployada em produção. Schema (`app_settings` + `capacity_waitlist`), endpoints (`/api/settings`, `/api/capacity-waitlist`, check 409 em `/api/subscriptions`), frontend (Splash modo fechado + CapacityWaitlist page + banner persistente pós-redirect) e email transacional via Resend. Validada pelos cenários C1, C2, C3, C4, C6, C7.
- **Frente B — SPF/DKIM no domínio acora.com.br no Resend** (task ClickUp: [86e1a8q5t](https://app.clickup.com/t/86e1a8q5t), high). ✅ **Concluída em 09/05/2026.** Domínio verificado, EMAIL_FROM=portal@acora.com.br em Production (também em Preview a partir de 11/05).
- **Frente C — Telas internas pós-feedback UX.** Doc fonte: `docs/CORA_Telas_Internas_Pendencias.md`. 5 sub-itens distribuídos pelas 4 telas internas, exige discussão prévia por item antes de virar briefing técnico.
- **Item 1 (hierarquia da Home) ✅ Concluída em 13/05/2026.** Cesta passa de info passiva → carrinho persistido com confirmação explícita. Backend (commit `f18335f`): tabela `weekly_orders`, 3 endpoints (`POST /api/weekly-orders`, `POST /api/weekly-orders/:id/confirmar`, `GET /api/weekly-orders`), cron de aviso de abandono via Vercel Cron schedule semanal `0 1 * * 2`. Frontend (commit `[b88f410]`): Home redesign sem foto + fundo brand-50 + lista unificada + microcopy condicional + badge condicional, `EditarCarrinhoDrawer` inline com debounce 300ms no swap, Modal com flexão de gênero no toast, Cardápio com click no card abrindo Modal e "✓ N× na sua cesta" substituindo CTA quando produto já está na cesta. Compat shim final reduzido a `confirmedLegacy` (alimenta `totalOf` do Perfil até refactor futuro). Docs: `docs/CORA_FrenteC_HomeHierarquia_Decisoes.md`, `docs/CORA_Briefing_FrenteC_Item1_Home.md` (v2), `docs/CORA_Prompt_FrenteC_Item1_ClaudeCode.md`. Tasks de follow-up: [86e1c2bnj](https://app.clickup.com/t/86e1c2bnj) (9 itens de polish/dívida técnica) e [86e1c2yh3](https://app.clickup.com/t/86e1c2yh3) (discussão estratégica do fluxo do Drawer antes do Alpha).  - Itens 2-5 ficam em fila pra sessões futuras.
- **Frente D — Whitelist de cobertura** — pendência da Fase 8 (`admin.acora.com.br`): endpoint pra consultar `coverage_whitelist` no banco, refatorar `estaNaWhitelist` em `src/utils/coverage.js` pra async. Hoje retorna sempre false (lista local vazia em `WHITELIST_HARDCODED`).

## Última sessão de trabalho
- **Data:** 2026-05-13 (quarta)
- **Tema:** Frente C item 1 — Hierarquia da Home, PR 2 (Frontend)
- **Saída:**
  - Branch `feat/home-hierarchy-redesign` mergeada em main (commit `[b88f410]`). 2 commits internos consolidados em squash: Fase 1 (refactor estrutural, `0de1f35`) + Fase 2 (Home redesign + Drawer + Modal + Cardapio, `87eb919`).
  - **Fase 1 — Refactor estrutural sem mudança visual.** Removeu `OrderFooter`, `ConfirmedFooter`, `ExtrasWarning`, state `pending`/`confirmed`/`justConfirmed`; adicionou state `weeklyOrders` + `currentWeeklyOrder` derivado; handlers canônicos (`addExtraToCart`, `removeExtraFromCart`, `updateComposition`, `confirmCurrentOrder`); `useEffect` de GET sync; compat shim pra Home/Cardapio/Perfil continuarem renderizando com adapter `confirmedLegacy`; `nextEditableThursdayISO` exportado de `src/utils/cutoff.js`.
  - **Fase 2 — Home redesign + Drawer + Modal + Cardapio refactor:**
    - Home: saudação temporal sem flexão de gênero ("Que bom ter você aqui, [nome]" no primeiro acesso / "Bom dia|Boa tarde|Boa noite, [nome]" depois), card de cesta novo (fundo brand-50, sem foto, lista unificada com × pra remover extras, microcopy condicional, badge condicional, botões "Confirmar pedido" + "→ Editar carrinho"), NovidadeCard com sub-copy emocional + CTA "+ Adicionar à cesta — R$ X" full-width, link "→ Ver tudo no Cardápio" no fim. `WeekTimeline`, `formatarDataHero`, `diasAteEntrega` deletados.
    - `EditarCarrinhoDrawer` (componente novo, inline em `src/App.jsx`): bottom sheet com SUA ASSINATURA (radio slots por pão, debounce 300ms no swap) + EXTRAS DESTA SEMANA (× imediato com POST) + sumário "Total de extras desta semana R$ X,XX" + botões Cancelar/Confirmar pedido. Pós-cutoff e `pending_payment`: controles disabled com microcopy específica de cada caso.
    - Modal de detalhes: `onAction` agora dispara `addExtraToCart` via wrapping no caller; toast com flexão de gênero por produto ("Focaccia adicionada à cesta", "Brioche adicionado à cesta") — campo `genero` adicionado em `D.extras`, `D.pães`, `D.rotativos`. Toast pós-confirmar: "Cesta confirmada. Entrega dd/mm.".
    - Cardápio: click no `ProductCard` abre Modal de detalhes (via novo prop `onCardClick`); produto já na cesta substitui CTA "Pedir" por indicador estático "✓ N× na sua cesta" (via novo prop `inBasketLabel`); banner verde "× confirmado" removido; toast antigo "Item removido da cesta" removido; helpers velhos (`addItem`, `removeItem`, `cntIn`, `addTo`, `removeFrom`, `extrasCount`) deletados.
    - `ProductCard` (`src/components/ProductCard.jsx`): ganha 2 props retrocompatíveis (`onCardClick`, `inBasketLabel`). Sem impacto em Onboarding/PreCadastro que continuam consumindo o componente igual.
    - Compat shim final reduzido a `confirmedLegacy` (alimenta `totalOf` do Perfil). Demais adapters (`pendingLegacy`, `legacyAddPending`, `legacyRemovePending`, `legacySetConfirmed`, `legacySetPending`, `houveSwap`, `catalog`, `aggregateLegacyExtras`) removidos.
  - **Validação manual em Preview deploy via Chrome DevTools mobile (375×667 e 380×647), 4 smoke tests críticos:**
    - **Test A** — Home renderiza com novo design ✓
    - **Test B** — Adicionar extra via Modal: POST 200, toast com flexão correta ("Focaccia adicionada"), item aparece imediato na lista do card de cesta ✓
    - **Test C** — Drawer abre, swap de pão dispara POST com debounce 300ms, "Confirmar pedido" muda badge pra "Confirmada" + toast "Cesta confirmada. Entrega 21/05.", editar pós-confirmar reverte badge pra "Pedido não confirmado" ✓ (tecnicamente; pontos de UX registrados pra discussão dedicada — ver task 86e1c2yh3)
    - **Test D** — Mobile 380px: lista cabe sem estouro, drawer respira, botões Cancelar/Confirmar pedido lado a lado ✓. Decisão: `(700g)` mantido ausente na lista da Home (só aparece no Drawer).
  - **2 tasks ClickUp criadas pra registrar follow-ups e questões de produto identificadas durante validação:**
    - [86e1c2bnj — Follow-ups pós-Frente C item 1 (PR 2)](https://app.clickup.com/t/86e1c2bnj). 9 itens de polish/dívida técnica: copy de cobrança separada de extras, skeleton no card de cesta enquanto GET carrega, touch-target do `×` da lista (28×28, sublimite), `EditarCarrinhoDrawer` inline em App.jsx, `cestaSemana` legacy paralelo ao POST, rollback silencioso em add pós-cutoff, branch `qty>0` inerte no Modal, `D.entrega.data` sem callers, peso/tamanho inconsistente nos extras no Drawer.
    - [86e1c2yh3 — Discussão: revisar fluxo do Drawer de edição de cesta](https://app.clickup.com/t/86e1c2yh3) (priority `high`). 3 pontos estratégicos: confusão entre "assinatura" e "esta semana", redundância de microcopy + botão "Confirmar pedido", compromisso forçado ao só explorar. Pode reescrever pedaços do código atual; sessão dedicada antes do Alpha (junho/2026), trazendo Mariane.
  - **Validações técnicas no PR 2:** `npm run build` 257.95 kB / 76.89 kB gzip ✓; lint 18 problems (4 a menos que baseline pré-PR 2 de 22) ✓; `npm run test:cutoff` 6/6 ✓.
- **Pendência operacional:** check manual semanal de carrinhos abandonados toda terça 8h BRT continua (já documentado nas sessões anteriores).
- **Próximo:** Frente C itens 2-5 (telas internas restantes), discussão do Drawer agendar antes do Alpha. Frente D (whitelist de cobertura) pendente.

## Sessões anteriores
- **Data:** 2026-05-11 (segunda)
- **Tema:** Frente A do pós-Fase 7 — Capacity gate antes do lançamento
- **Saída:**
  - Migration `supabase/migrations/0002_capacity_gate.sql` aplicada. Duas tabelas novas: `app_settings` (singleton, linha única forçada por CHECK id=1, flag `subscriptions_open` boolean) e `capacity_waitlist` (id, nome, email, whatsapp, cep, created_at). RLS deny-all em ambas. Índice único parcial em `capacity_waitlist` por email pra idempotência.
  - 3 endpoints: `GET /api/settings` (lê flag), `POST /api/capacity-waitlist` (insere + email Resend best-effort + idempotência por email), ajuste em `POST /api/subscriptions` com check 409 `subscriptions_closed` (defesa em profundidade contra race condition).
  - Frontend: getSettings() no boot do App.jsx, novo state `subscriptionsOpen`; novo state `waitlistReason` ('splash' | 'closed-during-flow'); nova página `src/pages/CapacityWaitlist.jsx` (form + estado submitted que renderiza tela de confirmação); banner persistente no topo quando `waitlistReason === 'closed-during-flow'` (some quando submitted vira true); Splash modo fechado com copy "As vagas dessa rodada já foram preenchidas…" + CTA "Quero entrar".
  - Email transacional via Resend (subject "Recebemos seu contato", assinatura simplificada só "Hugo" — "Padeiro apaixonado" segue válido pros posts do Instagram).
  - Variável `EMAIL_FROM=portal@acora.com.br` criada em Preview via `npx vercel env add` (já existia em Production). Resolveu erro 403 do Resend em modo testing.
  - Validação manual: C1 (sanity fluxo normal), C2/C3 (gate fechado + lista de espera + email chegando), C4 (idempotência por email), C6 (race: T2 aberta + flip da flag → 409 + banner persistente), C7 (reabertura do gate). C5 (validação payload) e C8 (persistência) pulados — edge cases menores.
  - 2 iterações de copy com brand voice; consolidação em `docs/CORA_Briefing_FrenteA_CapacityGate.md` (briefing original) e `docs/CORA_Briefing_FrenteA_Ajustes.md` (revisão de copy + banner C6).
  - Deploy de produção via `vercel --prod`. Smoke test em app.acora.com.br confirmou Splash modo aberto (flag reposicionada antes do deploy).
  - PR `feat/capacity-gate` mergeado em main, branch deletada localmente e no remoto.
  - Task ClickUp 86e1a8q50 fechada com comentário detalhado.
  - Banco limpo dos registros de teste ao fim da sessão (8 linhas em `capacity_waitlist` + 1 subscription).
- **Issue pré-existente registrada (não é desta frente):** `POST /api/lead` retorna 404 em ambiente local (`PreCadastro.jsx:256`). Provavelmente apontava pro webhook Make.com em produção e não tem implementação local. Virou task separada na lista Digital & Portal (ver task ClickUp).
- **Bonus técnico (12/05, dia seguinte):** Google Workspace configurado. Conta `hugo@acora.com.br` ativa, aliases `oi@`, `noreply@`, `pedidos@` criados. MX `acora.com.br` apontando pra `smtp.google.com`. `EMAIL_TO` no Vercel migrado pra `pedidos@acora.com.br` (Production + Preview). Lembrar pra futuro: **Resend mantém suppress list automática** — se um email bouncear (ex: MX faltando), os próximos pro mesmo destinatário ficam suppressed silenciosamente. Solução: remover da Suppressions list no dashboard do Resend.
- **Pendência operacional:** Hugo precisa monitorar manualmente o número de subscribers ativos. Quando bater o teto, flipar `app_settings.subscriptions_open` via SQL Editor. Evolução futura (alternativa b da task original): contagem automática.

- **Data:** 2026-05-09 (continuação)
- **Tema:** Frente B do pós-Fase 7 — SPF/DKIM no domínio acora.com.br no Resend
- **Saída:**
  - Domínio `acora.com.br` adicionado e verificado no Resend (registros SPF, DKIM, MX cadastrados no Registro.br após correção do MX que tinha sido cadastrado como TXT).
  - 5 variáveis de ambiente configuradas no Vercel (Production + Preview): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TO`.
  - `EMAIL_FROM=portal@acora.com.br` em Production, `EMAIL_FROM=onboarding@resend.dev` em Preview (corrigido posteriormente em 11/05 pra `portal@acora.com.br` também, ver Frente A).
  - Deploy de produção via `vercel --prod` (commit `e90a00f`).
  - Teste end-to-end: subscription criada em `app.acora.com.br`, e-mail chegou na inbox do Gmail com remetente `portal@acora.com.br` (não caiu em spam).
  - Briefing de continuação `docs/CORA_Briefing_PosFase7.md` commitado (commit `257bc19`).
  - Task ClickUp 86e1a8q5t fechada.
- **Pendência registrada:** DMARC ainda não configurado (bonus opcional, `p=none` pra monitoring).

## Sessões anteriores no histórico

### 2026-05-09 — Fase 7 do refactor de onboarding: backend completo (Supabase + Resend + Vercel Functions)

Branch `refactor/onboarding-fase-0` mergeada em main (commit `58da702`, 19 arquivos, +1454/-83):

- **Banco (Supabase):** migration `0001_initial.sql` aplicada. Tabelas `subscriptions`, `coverage_waitlist`, `coverage_whitelist`. ENUM `subscription_status`. RLS deny-all nas 3. Constraint `valor_mensal_check` (defesa contra payload corrompido). Índice parcial único `subscriptions_cpf_pending_uniq` (idempotência por CPF + status pending_payment).
- **Endpoints (Vercel Functions):** `POST /api/subscriptions` cria registro, dispara e-mail Resend, trata duplicata retornando id existente sem reenvio. `GET /api/subscriptions/{id}` retorna apenas campos necessários pra Home (sem CPF, e-mail, WhatsApp, endereço completo). `POST /api/coverage-waitlist` substitui stub anterior em `src/utils/api.js`.
- **Frontend:** libs server-side `src/lib/{supabase-admin,resend,validators}.js`. Funções reais `postSubscription`, `getSubscription`, `postWaitlist` em `src/utils/api.js`. `reconcileSubscription()` em `src/utils/subscription.js` (sincroniza status do servidor pós-F5). Welcome (T2) chama POST e salva `{id, status, ...payload}` no localStorage. Home com `useEffect` que chama reconcile na montagem.
- **E-mail transacional:** Resend integrado com `await + try/catch` (best-effort, falha não bloqueia resposta da subscription). E-mail vai pro Gmail temporário até Workspace ficar pronto.
- **Validação:** 11/11 testes técnicos via harness Node (mocka req/res do Vercel) + 4/5 cenários end-to-end manuais (1 dentro de cobertura, 2 fora, 4 idempotência clique duplo, 5 reconcile pós-UPDATE manual). Cenário 3 (whitelist) é pendência da Fase 8.

### 2026-05-05 — Fases 0-6 do refactor de onboarding

UI completa.

<!-- STATUS_MANUAL_END -->
