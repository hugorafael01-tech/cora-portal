# Portal do Assinante — Status Atual

_Auto-gerado em 2026-06-11 por Claude Code. Não editar manualmente acima da seção "Pendências não-código"._

## Versão
- **App:** v0.0.0 (produto v3.2.7)
- **Branch:** main
- **Último commit:** `8c3cf6a` — 2026-06-11 — feat(login): segundo passo com codigo OTP do email no /login-sent (#44)

## Rotas / páginas
- src/pages/Login.jsx _(Auth B.2)_
- src/pages/LoginSent.jsx _(Auth B.2; campo "Código do email" via verifyOtp, jun/2026)_
- src/pages/AuthCallback.jsx _(Auth B.2.4)_
- src/pages/PreCadastro.jsx _(redesign Variante A em mai/2026)_
- src/pages/CapacityWaitlist.jsx _(Frente A)_
- src/pages/DevFrenteD.jsx _(harness dev da Frente D)_

## Componentes principais
- src/components/CEPField.jsx _(Fase 3)_
- src/components/CoverageBlocker.jsx _(Fase 3)_
- src/components/PendingPaymentBanner.jsx _(Fase 6/7)_
- src/components/ProductCard.jsx _(Frente C item 3: expand inline + props `onCardClick`/`inBasketLabel`)_
- `EditarCestaDrawer` _(inline em src/App.jsx — Frente C item 3; refactored em 2026-05-16: seção SUA ASSINATURA colapsável com QtyStepper por tipo, swap atômico em capacity full, comparação por composição, empty state pra extras com CTA, Confirmar disabled em composição inválida)_
- `Assinatura` _(inline em src/App.jsx — Frente C item 2, editável em 2026-05-20: edição inline da composição/total da assinatura permanente com QtyStepper + swap atômico no cap, modal de confirmação bottom-sheet, AbortController, state derivado `has_pending_change` com microcopy "vale a partir da entrega"; PATCH em api/subscriptions/[id].js)_
- `QtyStepper` _(inline em src/App.jsx — Frente C item 3, variants brand/neutral; estendido em 2026-05-16 com `incrementDisabled`/`decrementDisabled` granulares + swap atômico no handler)_

## Dependências relevantes
- react @ ^19.2.4
- react-router-dom @ ^7.15.1
- @supabase/supabase-js _(novo na Fase 7)_
- resend _(novo na Fase 7)_

## Marcadores de integração (grep)
| Termo | Arquivos |
|---|---|
| asaas | 6 (api/_lib/asaas-status + api/_lib/cors + vincular + webhook + subscriptions + App.jsx) |
| otp | 3 (useAuth + Login + LoginSent) |
| whatsapp | 16 |
| webhook | 4 (api/webhooks/asaas + vincular + asaas-status + lead) |
| supabase | 23 (lib + auth + hooks + pages + endpoints) |
| resend | 5 (lib + 4 endpoints) |
| stripe | 0 |
| pagar.me | 0 |

## TODOs e FIXMEs no código
Nenhum encontrado _(1 falso positivo: "TODOS" em comentário de api/asaas/vincular/index.js)_

## Últimos 10 commits
- `8c3cf6a` — 2026-06-11 — feat(login): segundo passo com codigo OTP do email no /login-sent (#44)
- `4914d13` — 2026-06-03 — docs(status): registra sessao de integracao Asaas (webhook, vinculo, CORS, reconciliacao) (#43)
- `a3c33d8` — 2026-06-03 — feat(asaas): vincular passa a RECONCILIAR eventos do cliente (86e1prrkz) (#42)
- `2dfc0a8` — 2026-06-03 — feat(asaas): helper de CORS reutilizavel + aplica no /vincular (C2 parte 1) (86e1pwnhv) (#41)
- `03518fd` — 2026-06-03 — docs(status): registra Asaas Perna 3 / Peca A concluida (#40)
- `38758f8` — 2026-06-03 — feat(asaas): endpoint de vinculo asaas_customer_id (perna 3 / peca A) (86e1prrkz) (#39)
- `c3654e8` — 2026-06-02 — docs(status): registra fix do external_reference nao-uuid (86e1pcyzj) (#38)
- `ef55fd5` — 2026-06-02 — fix(asaas): external_reference nao-uuid vira "nao casou", nao "falha" (86e1pcyzj) (#37)
- `31d2420` — 2026-06-02 — docs(status): registra Asaas Webhooks / Perna 2 (endpoint) concluida (#36)
- `cff992b` — 2026-06-02 — feat(asaas): endpoint de webhooks — perna 2 (86e1mk8c0) (#35)

## Build / Deploy
- **Último build local:** 2026-06-11
- **vercel.json:** presente _(rewrites refinados na Fase 7)_

---

## Pendências não-código
_Esta seção é editada manualmente durante sessões de trabalho. Claude Code não sobrescreve daqui pra baixo._

<!-- STATUS_MANUAL_START -->

## Sessão 20/07/2026 — Capacity gate por capacidade no servidor (branch `feat/capacity-gate-servidor`)

Decisão de produto (20/07/2026): o gate de assinaturas deixa de ser binário (`app_settings.subscriptions_open`) e vira **trava de capacidade no servidor** — o portal conta assinaturas ocupadas e fecha sozinho ao lotar, sem flip manual do switch. Pré-requisito de schema já cumprido no Backoffice: `app_settings.max_subscriptions` (integer NOT NULL DEFAULT 30, migration 0031, aplicada no banco 20/jul). Este PR (repo cora-portal) consome a coluna.

- **`api/_lib/capacity.js` (novo):** `readCapacityGate(supabaseAdmin)` — fonte única do gate. Lê `subscriptions_open` + `max_subscriptions`, conta assinaturas que ocupam vaga (`status IN ('active','pending_payment')`) e devolve `{ ok, flagOpen, maxSubscriptions, occupied, capacityFull, open }`. Contagem no momento da chamada (corrida de dois onboards simultâneos batendo o limite é risco aceito nesta escala — sem lock). **Fail-closed:** qualquer falha de leitura → gate fechado.
- **`api/settings.js`:** usa o helper; `subscriptions_open` retornado é o gate **efetivo** (switch E capacidade). Expõe também `capacity_full`/`max_subscriptions`/`occupied`. **Inverte o fail-open anterior → fail-closed** (falha de leitura devolve `subscriptions_open:false`).
- **`api/subscriptions/index.js` (POST):** substitui o check flag-only pelo helper, antes de criar auth user. Switch fechado ou fail-closed → 409 `subscriptions_closed`; capacidade lotada → 409 `capacity_full`.
- **Cliente:** `src/App.jsx` — `getSettings()` no boot agora é fail-closed (catch → `setSubscriptionsOpen(false)`); o Splash já mostra a tela de capacidade quando `subscriptionsOpen===false`, então lotado no splash cai direto na lista de espera sem preencher nada. `src/Onboarding.jsx` — 409 `capacity_full` tratado igual a `subscriptions_closed` (redirect `closed-during-flow` pra `CapacityWaitlist`). Reaproveita a UX de lista de espera existente (Frente A), sem tela nova.
- **Não tocado:** `/interesse`, `ProtectedRoute`, fluxo de quem já tem assinatura, e nada do PR #49 (botão Confirmar do drawer — validação separada). Branch criado a partir de `origin/main`.
- **Validação (Vercel Preview, do Hugo):** (1) `max_subscriptions=1` + seed com 1 assinatura active → `/onboarding` cai na tela de capacidade no splash; (2) `max_subscriptions=30` → onboarding flui até criar `pending_payment`; (3) bloquear a request de `/api/settings` no DevTools → gate fechado, não aberto.
- **Pós-merge (do Hugo):** setar `subscriptions_open=true` e conferir `max_subscriptions=30` via SQL; aí o link `/onboarding` abre pros 30.

## Spec vigente
- **Portal:** v3.0 (mar/2026) + Adendo v3.1 (mar/2026)
  - Backend (schema, endpoints, persistência) detalhado em `docs/archive/briefings/CORA_Briefing_Fase7_Backend.md` e `docs/archive/briefings/CORA_Prompt_Fase7_ClaudeCode.md`
  - Continuação pós-Fase 7 (4 frentes mapeadas) em `docs/archive/briefings/CORA_Briefing_PosFase7.md`
  - Feedbacks UXers + pendências nas 4 telas internas em `docs/CORA_Telas_Internas_Pendencias.md`
- **Próxima consolidação prevista:** v4.0 (pós-testes de usabilidade)
- **Local dos docs:** projeto do Claude (CORA_Portal_Assinante_Especificacao_v3.docx + CORA_Portal_Adendo_v3_1_Redesign.docx)

## Observações sobre este arquivo
- `package.json` com version `0.0.0` — produto é v3.2.7, não há versionamento formal no código. A decidir: adotar semver no package.json ou tratar versão só como conceito de produto.
- Listagem de rotas/componentes pode estar incompleta (top-level apenas). Ajustar prompt na próxima regeneração se for o caso.
- Handoffs de design vivem em `docs/handoff/[escopo]-[mes-ano]/` (convenção a partir de mai/2026, ex.: `docs/archive/handoff/precadastro-v1-mai2026/`). Próximos handoffs do Claude Design ou de outras frentes seguem o mesmo padrão.

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
- Auth: spec ainda fala em magic link Supabase. Decisão atual (Fase 7): localStorage com `subscription_id` funciona como credencial durável no MVP. Auth real (OTP WhatsApp ou magic link via Supabase Auth) é v2, quando tiver assinantes ativos pagando. **(SUPERADA em 25/05/2026 — auth real iniciada antes do Alpha; ver bloco "Auth do Portal — Magic Link (SMS-ready)" abaixo. Auth — Frente A mergeada PR #17.)**

## Próximo foco acordado

4 frentes mapeadas em `docs/archive/briefings/CORA_Briefing_PosFase7.md`, em ordem de prioridade:

- **Frente A — Capacity gate antes do lançamento** (task ClickUp: [86e1a8q50](https://app.clickup.com/t/86e1a8q50), high). ✅ **Concluída em 11/05/2026.** Deployada em produção. Schema (`app_settings` + `capacity_waitlist`), endpoints (`/api/settings`, `/api/capacity-waitlist`, check 409 em `/api/subscriptions`), frontend (Splash modo fechado + CapacityWaitlist page + banner persistente pós-redirect) e email transacional via Resend. Validada pelos cenários C1, C2, C3, C4, C6, C7.
- **Frente B — SPF/DKIM no domínio acora.com.br no Resend** (task ClickUp: [86e1a8q5t](https://app.clickup.com/t/86e1a8q5t), high). ✅ **Concluída em 09/05/2026.** Domínio verificado, EMAIL_FROM=portal@acora.com.br em Production (também em Preview a partir de 11/05).
- **Frente C — Telas internas pós-feedback UX.** Doc fonte: `docs/CORA_Telas_Internas_Pendencias.md`. 5 sub-itens distribuídos pelas 4 telas internas, exige discussão prévia por item antes de virar briefing técnico.
- **Item 1 (hierarquia da Home) ✅ Concluída em 13/05/2026.** Cesta passa de info passiva → carrinho persistido com confirmação explícita. Detalhes na sessão de 13/05 abaixo em "Sessões anteriores". Tasks de follow-up: [86e1c2bnj](https://app.clickup.com/t/86e1c2bnj) e [86e1c2yh3](https://app.clickup.com/t/86e1c2yh3).
- **Item 3 (Cardápio + Home + Drawer) ✅ Concluída em 15/05/2026.** Refactor completo do fluxo de cesta. Detalhes na sessão de 15/05 abaixo em "Sessões anteriores". Tasks de follow-up: [86e1d14zr](https://app.clickup.com/t/86e1d14zr), [86e1d777a](https://app.clickup.com/t/86e1d777a).
- **Item 4 (Perfil read-only + Modal de Recibo) ✅ Concluída em 21/05/2026.** Tela 100% read-only (5 blocos) + modal de recibo bottom-sheet (3 variantes). Merge squash `e912675` (PR #8). Detalhes na "Última sessão de trabalho". Task ClickUp: [86e1fu240](https://app.clickup.com/t/86e1fu240).
- Itens 2, 5 ficam em fila pra sessões futuras.
- **Frente D — Whitelist de cobertura** — pendência da Fase 8 (`admin.acora.com.br`): endpoint pra consultar `coverage_whitelist` no banco, refatorar `estaNaWhitelist` em `src/utils/coverage.js` pra async. Hoje retorna sempre false (lista local vazia em `WHITELIST_HARDCODED`).
- **PreCadastro polimento v1 (Digital & Portal, não Frente C)** ✅ **Concluído em 23/05/2026.** Tela 2 (`/interesse`) redesenhada conforme a Variante A do Claude Design. Merge squash `0cd58c4` (PR #14). Detalhes na "Última sessão de trabalho". Task ClickUp: [86e1heqvg](https://app.clickup.com/t/86e1heqvg) (Complete).

## Auth do Portal — Magic Link (SMS-ready)

Iniciativa de auth real do portal, em 5 frentes. Fonte: `docs/archive/briefings/CORA_Briefing_Auth_MagicLink_SMS_Ready.md`. Substitui o gate atual (localStorage `cora_subscription`) por autenticação Supabase com magic link por e-mail, deixando a arquitetura preparada pra ligar SMS OTP no futuro com flip de feature flag. Prazo de referência: antes do início das entregas Alpha (agosto/2026).

- **Auth — Frente A — Schema e infra.** ✅ **Mergeada em 25/05/2026** (PR #17, squash `0d115fe`). Schema confirmado (sem migration), `.env.local.example` com scaffold das vars `VITE_` + distinção anon vs service_role, e checklist de configuração do dashboard em `docs/CORA_Auth_Frente_A_Checklist.md` (Hugo executa). **Pendência:** rodar o checklist no dashboard Supabase.
- **Auth — Frente B — Auth core.** Concluída em 29/mai. PRs #21-#24 mergeadas. Ciclo completo end-to-end: magic link → callback → ProtectedRoute → logout.
- **Auth — Frente C — Onboarding integration.** Pendente. Normalização E.164 no T1, helper `src/lib/phone.js`, criação do usuário Supabase no fim do onboarding, magic link automático pós-cadastro, Welcome screen atualizada.
- **Auth — Frente D — SMS-ready dormante.** Pendente. Componentes `OTPInput`/`PhoneInput`, feature flag em `src/auth/methods.js`, UI condicional na tela de login, smoke tests em preview com `VITE_AUTH_METHODS=sms,email`.
- **Auth — Frente E — Documentação e cleanup.** Pendente. `src/auth/adminRecovery.md`, `docs/CORA_Auth_Ligar_SMS.md`, atualização do PORTAL_STATUS e do `.env.local.example`.

**Decisões estruturais:**
- **Provedor SMS futuro:** Twilio. Configurado só no momento da virada da chave (sem custo no Alpha; em dev/preview o OTP aparece no log do console).
- **Sender do magic link:** `oi@acora.com.br` (raiz já verificada no Resend), display "Cora". Override da §4.2 do briefing (que apontava `oi@send.acora.com.br`).

## Auth — Frente B fechada (29/mai/2026)

Ciclo completo de autenticação mergeado em main em uma única sessão de 3 dias.

**PRs mergeadas:**
- PR #21 (B.2.1 + B.2.2 + B.2.3): helpers `signInWithMagicLink`/`signOut` + telas `/login` + `/login-sent`
- PR #22 (B.2.4): handler `/auth/callback` (implicit flow + detectSessionInUrl)
- PR #23 (B.2.5): `ProtectedRoute` com gate session+subscription + deep linking via `cora_auth_intent`
- PR #24 (B.2.6): logout no Perfil ("Sair") com cleanup de `cora_subscription` e `cora_auth_intent`

**Estado funcional end-to-end:**
1. Usuário acessa rota protegida sem nada → ProtectedRoute manda pra `/login` (preservando intent em `cora_auth_intent` com TTL 1h)
2. Digita email em `/login` → magic link via Supabase OTP → `/login-sent` (cooldown 60s, reenvio com banner success)
3. Clica no link recebido → `/auth/callback` (Supabase auto-processa via `detectSessionInUrl`) → navega pro destino do intent
4. ProtectedRoute valida session + subscription:
   - Sem nenhum → `/login`
   - Session sem subscription → `/interesse` (pré-Alpha; vai virar `/onboarding` pós-Alpha)
   - Tem subscription (modo dev OR real) → entra
5. No Perfil, click em "Sair" → `signOut` do Supabase + remoção explícita de `cora_subscription` e `cora_auth_intent` → `navigate("/login", { replace: true })`

**Convenções consolidadas neste ciclo:**
- CSS via inline styles + `tokens.js` (não criar arquivos `.css` novos)
- ASCII strict em comentários, identifiers, commit messages
- Acentos preservados em copy visível ao usuário e documentação interna
- Reticências sempre `...` ASCII, nunca o caractere unicode
- Estado derivado em render > useState ortogonal quando faz sentido (ex.: `effectiveCtaState`, banner warning derivado de `cooldownSeconds > 0`)
- Helpers de erro (`isRateLimitError`, `extractCooldownSeconds`) duplicados entre `Login.jsx`, `LoginSent.jsx`, `AuthCallback.jsx` — extrair pra util quando uma 4ª tela precisar

**Tasks de follow-up registradas:**
- `86e1m4um5` — ProtectedRoute trocar redirect `/interesse` pra `/onboarding` pós-Alpha (low)
- `86e1m4upa` — Dev mode `?dev=1` não bypassa gate com session ativa (normal, investigar)
- `86e1m4uem` — Refatorar box-drawing chars em `Login.jsx` + `LoginSent.jsx` pra ASCII puro (low)
- `86e1k923r` — Banner de erro inline pra falha de reenvio não-rate-limit em LoginSent (low, criada 27/mai)

**Próximas frentes (fora do escopo de B):**
- Frente C: `shouldCreateUser: false` no `signInWithMagicLink` (evitar usuários órfãos no Auth) + microcopy de anti-enumeração em `/login-sent`
- Substituir `cora_subscription` localStorage por registro real de `subscriptions` no DB (Backoffice)
- Onboarding integrado ao auth real (criar user Supabase no fim do fluxo de cadastro)

## Última sessão de trabalho

**23/jul/2026 — Catalogo: precos, pesos de vitrine e copy da Focaccia (FINANCE v4.1 + Hugo 22/jul)**

Atualiza o hardcode do catalogo do Portal (const D em src/App.jsx: D.paes, D.rotativos,
D.extras). Fontes: CORA_FINANCE v4.1 (precos) + decisao Hugo 22/jul (pesos de vitrine e
copy). Mexeu SOMENTE em preco/precoNum/peso e, na Focaccia, desc/ingredientes. Substitui
o rascunho anterior de precos (PR #51, fechada como superseded).

- Precos: original R$ 30 / integral R$ 30 / multigraos R$ 36 / ciabatta R$ 25 (inalterado)
  / focaccia R$ 28 (D.extras[0] E D.rotativos) / brioche R$ 36. Original e Integral empatam
  em R$ 30 -> troca "sem custo extra".
- Pesos de VITRINE (com "~" de aproximado — promessa comercial, corte manual varia;
  proposital NAO igualar ao peso_alvo_g tecnico do banco): original ~700g / integral ~700g
  / multigraos ~620g / ciabatta ~480g / focaccia ~420g / brioche ~350g.
- Copy da Focaccia (nos dois lugares, identicos): desc e ingredientes novos (cebola roxa
  macerada, azeite infusionado com alecrim, flor de sal). Campo `sobre` NAO mexido nesta
  rodada.

Nao mexeu em assinatura (R$99/pao), frete (R$15), MENU_SEMANA nem no `sobre`/`subCopy`.
Pizza fora do Portal.

**11/jun/2026 — Faxina: arquiva briefings Asaas + limpa branches + regenera cabecalho**

Pos-merge da PR #44. (a) 5 briefings Asaas de trabalho concluido movidos pra
docs/archive/briefings/ (Perna2_Endpoint, Fix_ExternalRef_NaoUuid, C2_CORS_Helper,
Perna3_PecaA_EndpointVinculo, Vinculo_Reconciliacao — os 3 ultimos estavam untracked e
foram commitados ja no archive). Os 3 roteiros CORA_Validacao_Asaas_* ficam na raiz de
docs/ de proposito: a pendencia do webhook de PRODUCAO vai reusa-los. (b) Branches
locais e remotas de PRs mergeadas removidas — sobrou so main. (c) Cabecalho auto-gerado
deste arquivo regenerado (rotas completas, grep markers, commits, datas).

**11/jun/2026 — Login: segundo passo com codigo OTP do email no /login-sent**

PR #44 (draft), branch feat/login-otp. O template de Magic Link do Supabase (compartilhado
com o backoffice) agora inclui um codigo OTP ({{ .Token }}, 6-10 digitos) alem do link; o
portal ganha o campo pra digita-lo, espelhando a solucao do backoffice (cora-backoffice
src/pages/Login.tsx, PRs #38/#39). SEM SCHEMA.

- /login-sent ganha o form "Código do email": inputMode numeric, autoComplete
  one-time-code, maxLength 10; CTA primario "Entrar com código" habilita com 6+
  digitos. Submit: strip de nao-digitos (colar com espacos funciona), validacao
  6-10 digitos, verifyEmailOtp -> navigate(resolveAuthIntent()) — MESMO destino
  pos-login do /auth/callback (deep link cora_auth_intent, TTL 1h, consumido).
- Novo helper verifyEmailOtp(email, token) em src/auth/useAuth.js (verifyOtp type
  'email'; mesmo contrato throw/void de signInWithMagicLink/signOut).
- Erro do codigo (invalido/expirado/rede) -> mensagem inline amigavel sem perder o
  estado da tela; some ao digitar de novo. Copy sem jargao (nada de "OTP"/"token").
- resolveAuthIntent duplicado de AuthCallback.jsx (mesma decisao de zero acoplamento
  entre telas do fluxo; extrair pra util quando uma 3a tela precisar).
- Copy atualizada: /login "A gente envia um link e um código pro seu email";
  /login-sent h1 "Email enviado", corpo cita link E codigo, "Reenviar email", fine
  print "O link e o código funcionam por uma hora". Fluxo por link intacto (reenvio,
  cooldown e callback inalterados).
- npm run build limpo; eslint identico ao baseline do main (32 problems, nenhum nos
  arquivos tocados); test:cutoff 6/6.

Pendente (Hugo, Preview): pedir acesso -> digitar codigo -> logado no mesmo destino do
link; codigo errado -> erro claro + retry; colar com espacos; login por link intacto.

## Sessões anteriores

**03/jun/2026 — Asaas: vincular passa a RECONCILIAR eventos do cliente (86e1prrkz)**

PR #42 (squash a3c33d8), branch feat/asaas-vinculo-reconciliacao (removida). Evolucao do
endpoint da Peca A: antes vincular SO gravava asaas_customer_id, entao o pagamento orfao
continuava em "pra identificar" e o payment_status null. Confirmado em teste real (03/jun):
Hugo vincula e "nada muda" na tela. Decisao Hugo: vincular = identificar E reconciliar os
eventos passados do cliente. NAO toca schema.

- Helper compartilhado (fonte de verdade unica): extraido api/_lib/asaas-status.js
  (statusPatchForEvent + EVENTS_EM_DIA/VENCIDO), antes inline no webhook. O webhook passa a
  importar de la; chamada byte-identica (o 2o arg ja era a data a carimbar — webhook segue
  passando now(), reconciliacao passa o received_at do evento).
- Reconciliacao no /vincular (best-effort, apos gravar o vinculo): (a) le o evento mais
  recente do cliente; (b) carimba subscription_id em TODOS os orfaos do customer; (c)
  processed_at = now() so onde for null (nao sobrescreve historico); (d) reflete
  payment_status pelo MAIS RECENTE (received_at), incl. OVERDUE -> vencido; tipo nao-tratado
  nao mexe no status. last_payment_at = received_at do evento, nao o clique.
- Atomicidade: sem transacao (RPC = schema, fora do escopo). Reconciliacao best-effort NAO
  derruba o vinculo: falha -> loga + 200 reconciled:false (sinalizado, nao silencioso). Cada
  passo idempotente; re-vincular reconcilia de novo -> auto-curavel/converge.
- Ordem nova: 404 -> conflito 409 (barra ANTES) -> grava (pula no idempotente, mas NAO
  retorna cedo) -> reconcilia (nos DOIS caminhos) -> 200. Resposta ganha reconciled +
  payment_status (aditivo; a UI so da refetch e ignora o corpo). CORS intocado.
- node --check + npm run build limpos; eslint sem novos problemas (process no-undef do
  webhook e baseline pre-existente, identico ao main). Roteiro de validacao (6 casos + SQL de
  setup/limpeza, incl. "mais recente manda" RECEIVED/OVERDUE) em
  docs/CORA_Validacao_Asaas_Vinculo_Reconciliacao.md.

VALIDADA EM PRODUCAO (03/jun) pelos casos centrais, via curl com a Hugo Dev (banco
restaurado no fim): caso 1 reconciliacao basica (RECEIVED -> em_dia, last_payment_at = data
do evento, orfao sai) e caso 2 "mais recente manda" (RECEIVED 01/jun + OVERDUE 05/jun ->
payment_status vencido, ambos eventos saem de orfao). Os demais 4 casos (RECEIVED depois de
OVERDUE, tipo nao-tratado, idempotente, nao-regressao da Peca A) considerados cobertos como
variacoes da mesma mecanica que os 2 centrais exercitaram. A UI do backoffice nao muda (ja
da refetch pos-200).

Proximo: Peca C parte 2 (UI/acao de vincular no backoffice, task 86e1pwnhv) + criar o
webhook do Asaas em producao (hoje so Sandbox).

**03/jun/2026 — Asaas C2 parte 1: helper de CORS reutilizavel (86e1pwnhv)**

PR #41 (squash 2dfc0a8), branch feat/asaas-cors-helper (removida). O backoffice
(admin.acora.com.br) precisa chamar POST /api/asaas/vincular (app.acora.com.br) do
navegador -> cross-origin; antes OPTIONS -> 405 e nenhuma resposta com
Access-Control-Allow-Origin, entao o browser bloqueava (por curl funcionava).

- TAREFA 0: api/_lib/ ja e a casa de utilitarios API-only (junto do cutoff.js) -> novo
  api/_lib/cors.js. Nenhum endpoint setava header/OPTIONS antes (so res.status().json() +
  dispatch por req.method). Unico endpoint do portal que o backoffice chama e o /vincular
  (confirmado no cora-backoffice; demais sao mesma-origem ou chamados pelo Asaas).
- withCors(handler): allowlist fixa (hoje so https://admin.acora.com.br), eco SEGURO (so
  reflete origem que esta na lista), NUNCA "*", nunca reflete origem fora da allowlist.
  Libera so POST/OPTIONS + Authorization/Content-Type. Sem Allow-Credentials (auth e Bearer,
  nao cookie). Vary: Origin + Max-Age 24h. Preflight OPTIONS -> 204 sem cair na logica.
- Aplicado so no /vincular (export default withCors(handler)). Logica da Peca A intocada: so
  ganha CORS por cima -> todas as respostas (200/4xx/5xx) herdam o header de origem.
- node --check + eslint + npm run build limpos. Mergeado e deployado.

**03/jun/2026 — Asaas Perna 3 / Peca A: endpoint de vinculo asaas_customer_id (86e1prrkz)**

PR #39 (squash 38758f8), branch feat/asaas-vincular-customer (removida). Mergeado e
deployado. Endpoint novo que o backoffice chama pra gravar o asaas_customer_id numa
subscription; habilita o casamento evento->assinante pelo fallback do webhook (perna 2),
ja que o painel do Asaas nao deixa setar externalReference na cobranca manual da fase 1.

- TAREFA 0 (investigacao antes de codar): como o admin e identificado no cora-backoffice.
  ACHADO que diverge do briefing: admin_users identifica por EMAIL (PK), NAO por user_id.
  is_admin() SQL faz WHERE email = auth.jwt()->>'email' (migration 0002_admin_users); o
  RequireAuth.tsx do backoffice idem (.eq('email', session.user.email)). Sem coluna
  user_id, sem flag de ativo/role: presenca de linha = admin. Seed atual
  hugorafael01@gmail.com.
- Novo POST /api/asaas/vincular (api/asaas/vincular/index.js). service_role (caminho 1):
  so o portal escreve em subscriptions; backoffice (anon key) chama o endpoint (respeita
  a 0019). Auth por JWT (molde handlePatchMine). Como service_role BYPASSA RLS, autorizacao
  de admin e por QUERY EXPLICITA contra admin_users pelo email do JWT (o is_admin() de RLS
  nao se aplica). Nao-admin -> 403.
- Contrato: 405 (metodo); 401 (sem token/invalido); 403 (nao-admin); 400 (campo faltando /
  subscription_id nao-uuid via guarda UUID_RE / customer vazio); 404 (alvo inexistente);
  200 no-op idempotente (mesmo customer/mesma sub); 409 customer_already_linked (customer
  ja em OUTRA sub, nao sobrescreve); 200 grava {subscription_id, asaas_customer_id}.
- SO o vinculo: NAO reprocessa eventos passados nem varre asaas_webhook_events (decisao
  Hugo: so casar futuros, nao ha orfao). Schema intocado (asaas_customer_id existe desde a
  D.1). Guarda UUID_RE espelha o fix do webhook (sem 400 cru do PostgREST).
- node --check + eslint + npm run build limpos. Roteiro de validacao (8 casos: curl + SQL +
  limpeza) em docs/CORA_Validacao_Asaas_Perna3_PecaA_Vinculo.md.

VALIDADO EM PRODUCAO (03/jun): metodo = curl contra prod com JWT de admin real, Hugo Dev
(b6a0614c) como cobaia, restaurada a asaas_customer_id = null no fim. Resultado por caso:
  1) sem/invalido token -> 401 (PASS, via curl)
  2) nao-admin -> 403 (provado por consequencia: casos admin so passam porque a query de
     admin retornou a linha; o gate roda)
  3) admin + sub valida + customer novo -> 200, asaas_customer_id gravado (PASS, via curl)
  4) mesmo customer/mesma sub de novo -> 200 no-op idempotente, sem erro (PASS, via curl)
  5) mesmo customer/OUTRA sub -> 409 (coberto pela logica; nao exercitado por curl porque so
     ha 1 subscription no banco hoje)
  6) sub inexistente (uuid valido) -> 404 (PASS, via curl)
  7) subscription_id nao-uuid -> 400 invalid_subscription_id, sem 400 cru do PostgREST
     (PASS, via curl)
  8) campo faltando / customer vazio -> 400 (PASS, via curl)
Veredito: endpoint aprovado. Contrato e autorizacao confirmados em prod; Hugo Dev de volta a
asaas_customer_id null (banco limpo).

Pendencias (Hugo): (1) Peca C — UI do painel no backoffice que chama este endpoint;
(2) criar o webhook do Asaas em PRODUCAO (hoje so Sandbox). Validacao da Peca A NAO esta mais
pendente.

## Sessões anteriores

**02/jun/2026 — Fix: external_reference nao-uuid no webhook Asaas (86e1pcyzj)**

PR #37 (squash ef55fd5), branch fix/asaas-external-ref-nao-uuid (removida). Bug de
borda em cima da perna 2; diagnostico fechado pelo log da Vercel (GET subscriptions
-> 400 por uuid invalido).

- CAUSA: external_reference vem digitado a mao no painel Asaas (fase 1). A
  resolucao fazia .eq("id", external_reference) contra subscriptions.id (uuid);
  valor nao-uuid -> PostgREST rejeita com 400 -> caia no catch -> reflectionFailed
  -> carimbo gravava subscription_id null SEM processed_at. Ou seja: "nao casou"
  (caso normal) era tratado como "falha de reflexo" (reprocessar), mascarando typo
  como erro de sistema no painel da perna 3.
- FIX: guarda UUID_RE no nivel do modulo; a busca por id so roda se
  external_reference for uuid valido, senao pula pro fallback por
  asaas_customer_id (coluna text, sem cast). Nao casando -> "nao casou" legitimo:
  subscription_id null E processed_at carimbado. O throw permanece, mas so dispara
  por erro REAL. processed_at null volta a ser exclusivo de falha real.
- Cirurgico: so a condicao da query por id no passo 4a. Insert (3), idempotencia
  (23505), carimbo (4c) e contrato de resposta (200/401/400/500) intocados.
- Validado via harness Node local contra o Supabase compartilhado (token local
  arbitrario, ids evt_test_*, restore + cleanup no fim): 13/13 checks PASS —
  nao-uuid e uuid-inexistente -> processed_at preenchido; happy path na Hugo Dev
  (b6a0614c) -> em_dia + last_payment_at; idempotencia e contrato preservados.
  DB deixado limpo (Hugo Dev de volta a payment_status null, zero evt_test_*).

Perna 2 VALIDADA com evento real do Asaas no Sandbox (ASAAS_WEBHOOK_TOKEN gerado e
setado na Vercel; webhook criado no Sandbox; evento real chegou e refletiu). Pendencia
operacional que RESTA: criar o webhook do Asaas em PRODUCAO (hoje so Sandbox).

**02/jun/2026 — Asaas Webhooks / Perna 2: endpoint (86e1mk8c0) CONCLUIDA**

PR #35 (squash cff992b), branch feat/asaas-webhooks-perna2 (removida). So o
endpoint que RECEBE os webhooks; perna 1 (schema, migration 0020) ja estava no
ar; perna 3 (painel no backoffice) e a proxima.

- Novo endpoint POST /api/webhooks/asaas (api/webhooks/asaas/index.js). Reusa
  supabaseAdmin (service_role); cliente nunca escreve em asaas_webhook_events.
- Auth por header estatico asaas-access-token === process.env.ASAAS_WEBHOOK_TOKEN
  (server-side, sem VITE_). Env ausente OU token errado -> 401 (decidido: 500
  repetido pausaria a fila do Asaas em 15 falhas; erro de config nao derruba a
  fila). Comparacao === no Alpha, com comentario marcando crypto.timingSafeEqual
  como hardening futuro.
- So id e event sao obrigatorios; todo payment.* opcional -> robusto a campo
  novo/faltante (nunca lanca excecao por atributo desconhecido).
- Persiste PRIMEIRO (body cru em jsonb), responde 200 so apos. 23505 no
  asaas_event_id -> 200 e para (idempotente). Outro erro de insert -> 500.
- Casa subscription por external_reference (fallback asaas_customer_id);
  CONFIRMED/RECEIVED -> payment_status em_dia + last_payment_at; OVERDUE ->
  vencido; demais tipos so ficam registrados crus (PAYMENT_CREATED NAO seta
  pendente — fica pra fase 2). Reflexo e best-effort: falha NUNCA derruba o 200.
- processed_at = now() quando o evento foi avaliado ate o fim (inclui nao-casar e
  tipo nao-tratado); null EXCLUSIVAMENTE em falha real de resolucao/reflexo (o
  catch) -> sinaliza "reprocessar".
- Body parsing: req.body chega parseado como objeto JSON (runtime Node padrao da
  Vercel, igual a api/subscriptions). Auth e por token no header, nao assinatura
  HMAC sobre o corpo, entao nao precisa de raw body nem config de bodyParser.
- node --check limpo. Briefing + roteiro de validacao (SQL + payload curl de
  exemplo) commitados em docs/.

Pendencias pra Hugo (nao-codigo, fora do escopo da perna):
- Gerar ASAAS_WEBHOOK_TOKEN forte e setar na Vercel (Production + Preview, sem
  VITE_); usar o MESMO ao criar o webhook no Sandbox do Asaas. CC nao inventa o
  valor — sem a env var o endpoint responde 401 a tudo.
- Validar no Preview com docs/CORA_Validacao_Asaas_Perna2_Endpoint.md (9 cenarios:
  405/401/400, evento valido, idempotencia, casamento+reflexo, nao-casa, overdue,
  tipo nao-tratado). ATENCAO: Preview e prod compartilham o mesmo Supabase — usar
  ids evt_test_* e rodar o DELETE de limpeza ao fim.

Proximo: perna 3 (painel no backoffice pra eventos sem subscription casada).

**01/jun/2026 — Fixes da cesta da semana (pos-D.4)**

Dois bugs da cesta da semana, achados na esteira da D.4, fechados no mesmo dia.

- **86e1na332 — composicao da semana nao persistia no F5** (PR #32, bcc469c). Bug de
  hidratacao no cliente: o weekly-order ja gravava a composition, mas cestaSemana
  nascia null e nunca era semeado dela. Seed render-phase guardado por
  currentWeeklyOrder.id (espelha o seed de assinaturaQtds da D.4), map generico
  sobre D.paes com 0-default (nao buildQtdsFrom, que cai no mock). Nao atropela
  edicao em andamento nem os setCestaSemana(null) deliberados. So src/App.jsx.
- **86e1neypw — adicionar extra reprovava com 400 composition_quantity_mismatch**
  (PR #33, 4ee5e62). O cliente reenviava a composition em todo POST e o endpoint
  revalidava soma === total_paes mesmo em op de extra; com a composicao da semana
  divergente do total_paes (plano editado 2->3), o extra ficava refem. Fix:
  desacoplar. Op de extra nao manda composition (cliente) e o endpoint so
  valida/grava quando ela vem no request (ausente -> preserva sem revalidar; objeto
  -> valida; null -> limpa swap). Validacao em si mantida. App.jsx + api/weekly-orders.

Ambos: branch propria, PR draft, squash-merge, branch removida. Build + test:cutoff
(6/6) limpos, lint baseline preservado. Validacao de preview pelo Hugo.

Follow-up aberto (NAO neste escopo): 86e1ngu34 — auto-sincronizar a composicao da
semana com o novo total do plano quando o plano muda no meio da semana.

**01/jun/2026 — Frente D / D.4 (subscription no DB) CONCLUIDA**

PR #29 (cae4a60), branch feat/frente-d-subscription-db (removida). Opcao A:
leitura E escrita da subscription migradas do localStorage pro DB.

- Leitura: useSubscriptionView compoe useSubscription+useProfile (D.2) +
  email da sessao; traduz qty_*->itens, monta endereco aninhado. Sem estender
  o select da D.2. SubscriptionProvider (contexto unico em main.jsx, dentro do
  AuthProvider) -> "gate liberou = dado pronto", expoe refetch().
- Gate (ProtectedRoute): loader enquanto carrega (nao redireciona), erro nunca
  vira /interesse, ?dev=1->/onboarding mantido.
- Estado do App vem do contexto; reconcileSubscription removido; localStorage
  (cora_subscription) eliminado; src/utils/subscription.js deletado.
- Edicao: PATCH /api/subscriptions session-scoped (user_id do JWT, cliente nao
  manda id nem escreve direto - revoke 0019). So persiste composicao (recalcula
  total_paes/qty_total/valor_paes/valor_mensal, double-write itens+qty_*; nao
  toca next_billing_*). PATCH do [id].js removido (GET-only pro Perfil).
- Validado no preview: deslogado->/login; logado-sem-sub->/interesse sem flash;
  logado-com-sub (hugo+dev) le tudo do DB; edicao da assinatura recorrente
  PERSISTE apos F5 (prova da Opcao A). Erro de leitura nao bounca.

Follow-ups abertos (nao bloqueiam): 86e1n9990 (WhatsApp -> ja resolvido no #29),
86e1na332 (cesta da semana nao persiste composicao no F5 - bug separado, fora D.4),
86e1mn1x7 (duplicado na T1), 86e1mn1xz (login mintando conta).

**29/mai/2026 — Frente B fechada end-to-end**

Sessão maratona consolidando B.2.4 + B.2.5 + B.2.6 num único dia, após B.2.1-B.2.3 terem fechado em 27/mai.

- B.2.4 (`/auth/callback`): pré-investigação descobriu que o Supabase client usa implicit flow com `detectSessionInUrl`, então o magic link é auto-processado e o componente só observa a sessão. Bug pego no smoke (tela de erro piscando antes de redirect) corrigido com guarda `if (errorKind) return` no effect que observa session.
- B.2.5 (`ProtectedRoute`): 3 fixes no briefing pegos pelo CC antes de codar — `=== "true"` quebrava o gate inteiro (subscription é JSON, não string), `?dev=1` precisava ser replicado da `RequireSubscription`, Layout precisava ser aninhado como layout-route sob ProtectedRoute. Deep linking implementado via `cora_auth_intent` em localStorage com TTL 1h.
- B.2.6 (logout): 1 commit cirúrgico — link textual "Sair" no rodapé do Perfil, `handleSignOut` com cleanup de `cora_subscription` + `cora_auth_intent` + redirect.

Decisão de produto consolidada: `/interesse` é tela temporária pré-Alpha. Pós-Alpha (fechar 30+20 ou operação estabilizar), aquisição vira `/onboarding`, e o ProtectedRoute precisa apontar pra lá — registrado em task `86e1m4um5`.

Próximo: pausa nesta frente. Frente C (auth hardening) e migração de subscription pro DB são as próximas peças, sem urgência imediata.

- **Data:** 2026-05-25 (segunda)
- **Tema:** Remoção do Cenário B2 (frete grátis em condomínio) — frete R$ 15 passa a universal
- **Saída:**
  - Branch `fix/remove-frete-gratis-condominio` (a partir de main). Fonte: `docs/archive/briefings/CORA_Briefing_Remover_Cenario_B2.md` + `CORA_Decisoes_v2.md` v2.2 (22/05/2026).
  - **Perfil read-only (Cobrança):** removida a detecção `valor_frete === 0`, o estilo `success-text`/weight 600 e a microcopy "frete grátis · programa condomínio". A linha Frete agora renderiza sempre `R$ 15,00` em estilo padrão, idêntica às linhas Assinatura/Extras. `valor_frete` segue como a fonte do valor exibido (B1).
  - **Fluxo Assinatura (limpeza além do briefing, aprovada por Hugo):** removidos o `CondominioModal` ("Frete grátis em condomínio"), o card "Mora num condomínio?" e o estado/handlers (`condoModal`/`fecharCondo`) — promoviam a regra descartada direto na tela, antes do teste com usuários.
  - **E-mail de admin (`api/subscriptions/index.js`):** removido o rodapé "Entrega gratuita a partir de 5 assinantes... aplicar desconto manualmente".
  - **Backend:** `valor_frete` mantido no `GET /api/subscriptions/[id]` (rule 4 do briefing — é a fonte do R$ 15); só atualizado o comentário stale que citava o B2.
  - **Banco:** discovery read-only (service-role) → **0 registros** com `valor_frete = 0` ou NULL (de 2 subscriptions). Nenhum UPDATE necessário. Schema intocado (governança no `cora-backoffice`).
  - **Verificação:** `npm run build` limpo; `eslint` igual ao main (29 problems, todos pré-existentes — nenhum nos trechos tocados).
  - **Mergeado** via PR #16 (squash `57f2264`).

- **Data:** 2026-05-23 (sábado)
- **Tema:** Redesign da Tela 2 (Form) do PreCadastro `/interesse` — Variante A (Digital & Portal)
- **Saída:**
  - Branch `feat/precadastro-polimento-v1` mergeada em main (squash `0cd58c4`, PR #14). Só `src/pages/PreCadastro.jsx` mudou; Splash (Tela 1) e Confirm (Tela 3) ficaram byte-identical ao baseline (verificado por diff).
  - **Tela 2 reescrita em 4 seções nomeadas** com eyebrows League Gothic + linha divisória: "Quem é você", "Pães", "Onde você está", "Antes de enviar". Header virou barra warm-50 full-width com conteúdo interno alinhado ao max-width do body (logo alinha com o form no desktop). Sub-heading "Seus dados ficam só com a Cora." removido.
  - **Cards de produto (Variante A):** foto 16:10 no topo, info embaixo, checkbox sobreposto à foto, nome em Montagu Slab sentence case (corrige bug do `text-transform: uppercase` global do DS via `textTransform:'none'` + `letterSpacing:0`; brand-700 quando selecionado). **Peso removido do render** (mantido no array `PRODUCTS` pra uso em outras telas). Estados: default / hover (border warm-300) / selected (brand-50 + border brand-500) / disabled (véu + opacity 0.55 ao atingir 2).
  - **CounterChip "X de 2"** (copy curta, `whiteSpace:nowrap`, vira verde em 2/2) + dica "Pra trocar, desmarque um dos que já estão escolhidos." ao atingir o limite.
  - **Responsivo via hook `useIsDesktop`** (matchMedia ≥768px, `addEventListener('change')` + cleanup): grid 2 colunas (Nome+WhatsApp, Cidade+Bairro) no desktop, empilhado no mobile; heading 32px mobile / 44px desktop; CTA full-width mobile / max-width 320 centralizado no desktop.
  - **PRODUCTS atualizado** com pesos corretos (700/700/430/615/533/256g) e copys aprovadas, paths `.webp`.
  - **Validação do nome relaxada** pra aceitar 1+ palavra ("Conta pra gente como prefere ser chamado(a).") alinhando com a nova copy "Como quer ser chamado(a)?"; mantém anti-bot. Border de erro unificado em `#DC2626`. **P0 corrigido:** falha de validação agora dá scroll suave pro topo do form (antes ia pro bloco de erro agregado no rodapé) via novo `formTopRef`.
  - **A11y:** card com `role="button"`, `tabIndex`, `onKeyDown` (Enter/Space), `aria-disabled`; optin reusa o `Checkbox` compartilhado, com suporte a teclado.
  - **Intocados (restrição §8 do briefing):** sanitização anti-XSS, honeypot `website`, máscara WhatsApp, webhook `POST /api/lead`, payload exato.
  - **Verificação:** `npm run build` + `eslint` limpos; verificação visual headless (Chrome CDP) em mobile 390 e desktop 1440 confirmou alinhamento do logo (logoLeft==contentLeft), heading 44px, CTA centralizado, chip curto verde em 2/2 e scroll-to-top no erro (scrollY 2486→0). Smoke test funcional do submit em Vercel Preview pelo Hugo.
  - **Smoke em produção:** validado em `app.acora.com.br/interesse` em 24/05/2026 (mobile + desktop) antes do push de captura na terça (26/05).
  - **Fonte:** briefing `docs/archive/handoff/precadastro-v1-mai2026/CORA_Briefing_CC_PreCadastro_v1.md` + referências do Claude Design (Variante A).
- **Refinamento Tela 3 (PR #15):** CTA padronizado com as demais telas, pequeno refinamento de texto, "Niterói" removido do copy de compartilhamento. Sem mexer em estrutura ou lógica da Confirm.
- **Pendências pós-merge:** propagar a regra de nome de produto da DS (Montagu Slab sentence case, `docs/archive/handoff/precadastro-v1-mai2026/DS-PATCH.md`) — tasks ClickUp: Portal [86e1heqw3](https://app.clickup.com/t/86e1heqw3), landing [86e1heqw8](https://app.clickup.com/t/86e1heqw8), Backoffice [86e1heqwb](https://app.clickup.com/t/86e1heqwb). Entrega registrada na lista Digital & Portal (`901712612053`): [86e1heqvg](https://app.clickup.com/t/86e1heqvg) (Complete).
- **Pendência operacional:** check manual semanal de carrinhos abandonados toda terça 8h BRT continua.
- **Próximo:** Frente C itens 2 e 5 (telas internas restantes) ou Frente D (whitelist de cobertura).

- **Data:** 2026-05-21 (quinta)
- **Tema:** Frente C item 4 — Tela Perfil read-only + Modal de Recibo (+ follow-up de tipografia da Cobrança)
- **Saída:**
  - Branch `feat/perfil-readonly-modal-recibo` mergeada em main (squash `e912675`, PR #8). Follow-up `chore/cobranca-typography-status-doc` na sequência.
  - **Tela Perfil reescrita 100% read-only**, 5 blocos: Header de perfil, Dados Pessoais (snapshot local, CPF com olho, sem chevrons), Histórico de pedidos, Cobrança (decomposição), Pausar/Cancelar (WhatsApp) + microcopy final sem `<strong>`. Saíram: chevrons, botão "Atualizar" do Cartão, "Sair da conta", "(estimado)" e o **bloco Cartão inteiro** (sem Asaas no MVP). Sino fora do topbar.
  - **Histórico real** com 3 estados (A1 idle 3 entregas / A2 vazio cliente novo / A3 parcial); "Ver todos →" só quando `entregas.length > 3`.
  - **Cobrança real**: decomposição Assinatura + Extras (soma dos confirmados do mês) + Frete = Total; "Próxima fatura · 01/MM" derivada client-side; cenário B2 (frete grátis condomínio) detectado por `valor_frete === 0` com microcopy success-text **(removido em 25/05/2026 — frete R$ 15 universal; ver Última sessão de trabalho)**. Sub-linha "Pago" omitida (não afirmar pagamento). Tipografia dos rótulos alinhada ao `.bk-row .k` do v4 no follow-up (League Gothic caixa-alta 11px; Total em Montagu Slab 16px brand-500).
  - **Modal de Recibo (bottom-sheet)** reusando o padrão do modal de confirmação da Assinatura v4 + `useModalA11y` (Esc, click fora, foco volta pra linha). 3 variantes: **C2** (sem extras) e **C3** (com extras) ativas; **C1** (futura) dormante porque o histórico é só passado. Seção "Assinatura" (gramatura como meta, sem preço) + "Extras" condicional (total da seção em brand-500 15px/700). Footnotes sem afirmar pagamento.
  - **Endpoints (sem schema novo):** modo `?history=true` em `GET /api/weekly-orders` (entregas passadas confirmadas; "entregue" inferido por `delivery_date < hoje && status='confirmado'`); `valor_paes` + `valor_frete` expostos no `GET /api/subscriptions/[id]`. Wrapper `getWeeklyOrders(id, {history})`.
  - **Smoke em Preview** (Hugo): A1×B1, A1×B2, A2×B1, A3×B1 + modal C2/C3 + a11y completa. Build validado no ambiente da Vercel (build local quebra porque o iCloud esvazia o binário nativo do rolldown — não é bug do código).
  - **Limpeza:** removido código morto do Perfil antigo (copyEntradaCiclo, pluralizarPao, MESES_PT, totalOf, confirmedLegacy, simulate, historicoCiclosPassados, import plural) e um arquivo-lixo de iCloud (`api/weekly-orders/[id]/confirmar 2.js`).
- **Pendências externas (cora-backoffice):** tabela `faturas` (status "Pago" + datas → reativa a sub-linha de cobrança paga e o footnote "paga em") e valor `'entregue'` no enum `weekly_order_status` (troca a inferência do `?history=true` por filtro direto). Documento de recomendação já existe.
- **Housekeeping de repo:** task ClickUp [86e1ga7fz](https://app.clickup.com/t/86e1ga7fz) aberta — migrations untracked copiadas do backoffice (`0002_admin_users` etc.) colidindo com a numeração do portal + arquivos-lixo de iCloud com espaço no nome (ex.: `package-lock 4.json`).
- **Pendência operacional:** check manual semanal de carrinhos abandonados toda terça 8h BRT continua.
- **Próximo:** Frente C itens 2 e 5 (telas internas restantes) ou Frente D (whitelist de cobertura).

- **Data:** 2026-05-16 (sábado)
- **Tema:** Refactor da seção SUA ASSINATURA do Drawer "Editar cesta" — QtyStepper + colapso + polish v2
- **Saída:**
  - Branch `feat/drawer-assinatura-qtystepper` mergeada em main (commit `9e3cb9a`, squash de 3 commits internos).
  - **Origem:** durante validação visual da Frente C item 3 (15/05), descobriu-se confusão conceitual no Drawer com clientes de 2-3 pães: trocar tipos entre slots posicionais marcava como alteração mesmo quando a composição final era idêntica ao baseline. UI era posicional ("Pão 1", "Pão 2"), operação era de composição (quantos de cada).
  - **Decisão de produto:** substituir slots radio por **QtyStepper por tipo de pão** (mesma metáfora dos extras), com **swap atômico** quando capacity full (resolve deadlock no plano 1 pão).
  - **Wireframes consolidados via Claude Design:** `docs/archive/wireframes/Assinatura no Drawer _standalone_.html` (v1, swap atômico + capacity hint) → `docs/archive/wireframes/Assinatura_no_Drawer v2__standalone_.html` (v2, reorganização do Drawer: colapsável + empty state). Decisão de manter ordem original "Sua Assinatura → Extras" reforçada após CD propor inversão.
  - **11 mudanças incrementais aplicadas** (documentadas em `docs/archive/briefings/CORA_Briefing_Drawer_v2_Reorganizacao_e_Polish.md`):
    - Seção Sua Assinatura colapsável (default colapsada quando `composition == baseline`)
    - Auto-expand handler-side (sem useEffect, evita lint `react-hooks/set-state-in-effect`) quando user faz alteração
    - Composição compacta dinâmica no header (linha clicável): "1× Original + 1× Integral", "2× Original", etc
    - Pill "Trocado só esta semana" no header colapsado (visível sem precisar expandir)
    - Empty state quando cesta sem extras: "Nada adicionado pra esta semana. / Confira nossos pães no cardápio. Em breve teremos novidades." + CTA "Ver cardápio →"
    - Total card de extras oculto quando empty (sem R$ 0,00 mudo)
    - Footer label dinâmico: "Sem alterações" disabled quando empty AND sem alteração
    - **Bug crítico:** Confirmar pedido disabled em composição inválida (`sumAll !== totalPaes`) + microcopy "Sua cesta é composta por {N} pães, falta(m) {M}." Bloqueio do `-` da última row em qty=1 só aplica quando `totalPaes === 1` (planos 2+ permitem inválido temporário)
    - Capacity card sem "— cheio"; warning bg só em composição inválida
    - `+` brand-500 vívido em row esmaecida (opacity 0.55 só no name container, stepper íntegro)
    - Divisor visual entre seções
  - **QtyStepper estendido:** novos props opcionais `incrementDisabled` e `decrementDisabled` (granulares por botão). Retro-compat preservada via fallback pro `disabled` global. Decisão coerente com o requisito de UX do swap atômico (`+` enabled em capacity full quando outra row tem qty>0).
  - **Smoke test em Preview deployment** com 9 cenários cobertos por Hugo (16/05/2026): normal com extras, expand manual, swap atômico plano 2 pães, composição inválida, revert preserva estado aberto, remove extra → empty state, CTA "Ver cardápio" navega, pós-confirmado disabled, e o **caso crítico do plano 1 pão** (swap atômico em 1 click resolve o deadlock que motivou o refactor — testado modificando temporariamente Beatriz pra plano 1 pão via SQL).
  - **3 ajustes pós-validação aplicados antes do merge:**
    - Divisor visual entre seções (mais explícito)
    - Toda a linha do header (label + composição compacta) clicável pro toggle (não só o label)
    - Copy do erro de composição inválida: "Sua cesta é composta por X pães, falta(m) N." (mais natural que "precisa de")
  - **Validações técnicas pós-merge:** `npm run build` 276.79 kB / 82.12 kB gzip ✓; lint baseline preservado (18/17/1); test:cutoff 6/6 ✓.
- **3 tasks ClickUp criadas durante a validação** (não entram no PR atual, são pendências futuras):
  - [86e1dwcgk — UX: Linhas do Card de Cesta da Home clicáveis (abre Drawer)](https://app.clickup.com/t/86e1dwcgk) (priority normal). Padrão "card inteiro clicável", melhoria de affordance.
  - [86e1dwdqe — UX: Aplicar QtyStepper + swap atômico na edição da assinatura permanente (tela Assinatura)](https://app.clickup.com/t/86e1dwdqe) (priority high, antes do Alpha). Consistência entre edição semanal e permanente.
  - [86e1dwk1v — UX: Recibo detalhado pós-confirmação da cesta](https://app.clickup.com/t/86e1dwk1v) (priority high, antes do Alpha). Momento ideal pro recibo é justamente no click "Confirmar pedido" — caminhos a discutir: modal pós-confirmação, e-mail transacional, seção "Próxima entrega" em Perfil, ou combinação.
- **Pendência operacional:** check manual semanal de carrinhos abandonados toda terça 8h BRT continua.
- **Próximo:** sessão dedicada de copy dos produtos com Mariane (task 86e1d14zr); discussão estratégica do Drawer com Mariane antes do Alpha (task 86e1c2yh3); Frente C itens 2, 5 (telas internas restantes) ou Frente D (whitelist de cobertura).

- **Data:** 2026-05-15 (sexta)
- **Tema:** Frente C item 3 — Refactor do Cardápio, Home e Drawer
- **Saída:**
  - Branch `feat/cardapio-refactor` mergeada em main (commit `d8544aa`). PR resolve os 3 sub-itens da Frente C item 3 e os feedbacks UX de João e Astrid em `docs/CORA_Telas_Internas_Pendencias.md` (itens 4.2.1, 4.2.2, 4.2.3).
  - **Cardápio:** ProductCard com expand inline (Sobre + Ingredientes como chips), Modal sobreposto removido; NovidadeCard Hero reintroduzido antes da lista; linha "Extras entram na sua próxima fatura." abaixo do aviso de cutoff; section header "NOSSOS PÃES" removido (lista flui direto); Hero sem "estreia desta quinta" no meta line; fix do bug do botão "Adicionar à cesta" grudando na foto quando descrição é curta.
  - **Home:** saudação unificada "Oi, [nome], bom dia/boa tarde/boa noite!" (sem flexão de gênero, sem mensagem especial de 1º acesso); Card de Cesta novo com pill "Assinatura" + "Incluso" pras linhas de assinatura, `[- N +]` no lugar do `×` pras linhas de extras; animação `slideOutFade` 450ms na remoção de extras (sem toast); botão "Editar cesta" link ghost dashed com ícone de pencil; botão "Confirmar pedido" mantido entre total e link de edição; badge `brand-500` no Nav Início quando `currentWeeklyOrder?.status === 'rascunho' && (extras.length > 0 || composition != null)`; microcopy reduzida (badges de status removidos, mantidos "Pedido confirmado em dd/mm." e "Prazo encerrado..." quando aplicáveis).
  - **Drawer "Editar cesta":** renomeação completa (componente `EditarCestaDrawer`, título "EDITAR CESTA", aria-label, toast pós-confirmar "Cesta confirmada. Entrega dd/mm."); 3 zonas flex-column (head fixo + body scrollável + footer fixo) resolve bug de footer fora da viewport; subtítulo do header consolidado em 1 linha "Entrega quinta, dd de mes · pedidos até terça, 12h"; slots de assinatura mostram "Incluso" à direita; pill "Trocado" quando slot != baseline; extras com `[- N +]` reutilizando QtyStepper (variant neutral); animação de remoção idêntica à Home (mesma classe `cesta-row-removing`, 450ms); 2 botões SEMPRE visíveis no rodapé (Cancelar ghost flex:1 + Confirmar pedido primary flex:2); estado "Confirmado ✓" disabled (fundo verde claro `#D1FAE5`, border `#6EE7B7`, text `#065F46`) quando `status === 'confirmado' && !cutoff`; microcopy do rodapé "💳 Extras entram na sua próxima fatura. Alterações até terça, 12h.".
  - **ToastStack (compartilhado):** visual conforme wireframe v2 (fundo branco, borda lateral 3px em `#10B981`, texto `warm-800`, check verde sólido em círculo); stack até 3 toasts simultâneos com `gap: 8px` real, opacity decrescente (1.0 → 0.85 → 0.65), scale leve (1.0 → 0.97 → 0.94); animação `fadeUp` 280ms ease-out na entrada; flexão de gênero por produto (`genero: 'm' | 'f'` no catálogo D).
  - **QtyStepper (componente novo):** reutilizável Home + Drawer, variants `brand` (Home, sobre `brand-50`) e `neutral` (Drawer, sobre `#FFF`); 32×32 botões, SVG inline pros sinais − e +, número tabular-nums; disabled durante animação de remoção pra evitar click duplo; mesma metáfora do `directQtySelector` do Onboarding.
  - **Bug fixes:**
    - Badge do Nav sempre ativo após confirmar (item 10 da task 86e1c2bnj): condição robusta + fallback em `confirmCurrentOrder` por `delivery_date` quando `saved.id` não bate no setState. Console.warn pra rastreamento.
    - Botão "Adicionar à cesta" grudando na foto quando descrição do ProductCard é curta: fix de CSS de respiro entre `.row` e `.cta-zone`.
  - **Sources of truth adicionados:** `docs/archive/briefings/CORA_FrenteC_Item3_Cardapio_Decisoes.md` (v3, final), `docs/archive/briefings/CORA_Briefing_FrenteC_Item3_Cardapio.md` (briefing técnico), `docs/archive/wireframes/Cardapio Wireframe v2 _standalone_.html` (referência visual fonte primária), `supabase/seeds/seed_test_assinante.sql` (SQL de seed reutilizável pra Preview deployments).
  - **Resíduos endereçados da task 86e1c2bnj (PR 2 anterior):** itens 1 (copy de cobrança), 3 (touch-target do `×` sublimite — `×` removido), 7 (branch `qty>0` inerte no Modal — Modal removido), 9 (peso/tamanho inconsistente nos extras no Drawer).
  - **Validações técnicas:** `npm run build` 271.76 kB / 81.04 kB gzip ✓; lint 18 problems (baseline mantido) ✓; `npm run test:cutoff` 6/6 ✓.
  - **Validação manual em Preview deployment:** 12 cenários do smoke test rodados pelos 3 commits da branch (Fase 1, Fase 2, Fase 3, mais 2 commits de fix do badge + polish do Hero).
- **Tasks ClickUp criadas/atualizadas:**
  - [86e1d14zr](https://app.clickup.com/t/86e1d14zr) — Revisar copy dos produtos do catálogo (priority normal). Pendente Mariane.
  - [86e1d777a](https://app.clickup.com/t/86e1d777a) — UX: Repensar edição multi-slot da assinatura no Drawer (priority high). Caminho escolhido: QtyStepper por tipo. Resolvida pelo PR de 16/05.
  - [86e1c2bnj](https://app.clickup.com/t/86e1c2bnj) — Items 1, 3, 7, 9 fechados pelo PR; item 10 (bug do badge) fechado; itens 2, 4, 5, 6, 8 (resíduos) + 11 (INP issue) continuam pendentes.
  - [86e1c2yh3](https://app.clickup.com/t/86e1c2yh3) — Item 1 (confusão "assinatura" vs "esta semana") parcialmente endereçado pelo "Incluso"; itens 2 e 3 continuam pra sessão dedicada com Mariane antes do Alpha (junho/2026).
  - **Refactor multi-slot da Assinatura no Drawer (não previsto na Frente C original) ✅ Concluído em 16/05/2026.** Decisão emergente durante validação da Frente C item 3: substituir slots posicionais por QtyStepper + swap atômico na seção SUA ASSINATURA do Drawer. Iteração v2 com colapsável e empty state. Detalhes na sessão de 16/05 acima em "Última sessão de trabalho". Tasks resolvidas: [86e1d777a](https://app.clickup.com/t/86e1d777a). Tasks pendentes correlatas: [86e1dwcgk](https://app.clickup.com/t/86e1dwcgk), [86e1dwdqe](https://app.clickup.com/t/86e1dwdqe), [86e1dwk1v](https://app.clickup.com/t/86e1dwk1v).

- **Data:** 2026-05-13 (quarta)
- **Tema:** Frente C item 1 — Hierarquia da Home, PR 2 (Frontend)
- **Saída:**
  - Branch `feat/home-hierarchy-redesign` mergeada em main (commit `b88f410`). 2 commits internos consolidados em squash: Fase 1 (refactor estrutural, `0de1f35`) + Fase 2 (Home redesign + Drawer + Modal + Cardapio, `87eb919`).
  - **Fase 1 — Refactor estrutural sem mudança visual.** Removeu `OrderFooter`, `ConfirmedFooter`, `ExtrasWarning`, state `pending`/`confirmed`/`justConfirmed`; adicionou state `weeklyOrders` + `currentWeeklyOrder` derivado; handlers canônicos (`addExtraToCart`, `removeExtraFromCart`, `updateComposition`, `confirmCurrentOrder`); `useEffect` de GET sync; compat shim pra Home/Cardapio/Perfil continuarem renderizando com adapter `confirmedLegacy`; `nextEditableThursdayISO` exportado de `src/utils/cutoff.js`.
  - **Fase 2 — Home redesign + Drawer + Modal + Cardapio refactor:**
    - Home: saudação temporal sem flexão de gênero, card de cesta novo (fundo brand-50, sem foto, lista unificada com × pra remover extras, microcopy condicional, badge condicional, botões "Confirmar pedido" + "→ Editar carrinho"), NovidadeCard com sub-copy emocional + CTA "+ Adicionar à cesta — R$ X" full-width, link "→ Ver tudo no Cardápio" no fim.
    - `EditarCarrinhoDrawer` (componente novo, inline em `src/App.jsx`): bottom sheet com SUA ASSINATURA (radio slots por pão, debounce 300ms no swap) + EXTRAS DESTA SEMANA (× imediato com POST) + sumário "Total de extras desta semana R$ X,XX" + botões Cancelar/Confirmar pedido. Pós-cutoff e `pending_payment`: controles disabled com microcopy específica.
    - Modal de detalhes: `onAction` dispara `addExtraToCart` via wrapping no caller; toast com flexão de gênero por produto; campo `genero` adicionado em `D.extras`, `D.pães`, `D.rotativos`. Toast pós-confirmar: "Cesta confirmada. Entrega dd/mm.".
    - Cardápio: click no `ProductCard` abre Modal de detalhes (via novo prop `onCardClick`); produto já na cesta substitui CTA "Pedir" por indicador estático "✓ N× na sua cesta" (via novo prop `inBasketLabel`); banner verde "× confirmado" removido; toast antigo "Item removido da cesta" removido.
    - `ProductCard`: ganha 2 props retrocompatíveis (`onCardClick`, `inBasketLabel`). Sem impacto em Onboarding/PreCadastro.
    - Compat shim final reduzido a `confirmedLegacy` (alimenta `totalOf` do Perfil).
  - **Validação manual em Preview deploy** via Chrome DevTools mobile (375×667 e 380×647), 4 smoke tests críticos: Test A (Home renderiza com novo design), Test B (adicionar extra via Modal: POST 200 + toast com flexão correta), Test C (Drawer abre + swap dispara POST com debounce + Confirmar pedido + edição reverte badge), Test D (mobile 380px: lista cabe, drawer respira).
  - **2 tasks ClickUp criadas pra follow-up:**
    - [86e1c2bnj](https://app.clickup.com/t/86e1c2bnj) — 9 itens de polish/dívida técnica.
    - [86e1c2yh3](https://app.clickup.com/t/86e1c2yh3) — Discussão estratégica do Drawer (priority high), sessão dedicada antes do Alpha com Mariane.
  - **Validações técnicas:** `npm run build` 257.95 kB / 76.89 kB gzip ✓; lint 18 problems (4 a menos que baseline pré-PR 2 de 22) ✓; `npm run test:cutoff` 6/6 ✓.
- **Pendência operacional:** check manual semanal de carrinhos abandonados toda terça 8h BRT continua.

- **Data:** 2026-05-11 (segunda)
- **Tema:** Frente A do pós-Fase 7 — Capacity gate antes do lançamento
- **Saída:**
  - Migration `supabase/migrations/0002_capacity_gate.sql` aplicada. Duas tabelas novas: `app_settings` (singleton, linha única forçada por CHECK id=1, flag `subscriptions_open` boolean) e `capacity_waitlist` (id, nome, email, whatsapp, cep, created_at). RLS deny-all em ambas. Índice único parcial em `capacity_waitlist` por email pra idempotência.
  - 3 endpoints: `GET /api/settings` (lê flag), `POST /api/capacity-waitlist` (insere + email Resend best-effort + idempotência por email), ajuste em `POST /api/subscriptions` com check 409 `subscriptions_closed` (defesa em profundidade contra race condition).
  - Frontend: getSettings() no boot do App.jsx, novo state `subscriptionsOpen`; novo state `waitlistReason` ('splash' | 'closed-during-flow'); nova página `src/pages/CapacityWaitlist.jsx` (form + estado submitted que renderiza tela de confirmação); banner persistente no topo quando `waitlistReason === 'closed-during-flow'` (some quando submitted vira true); Splash modo fechado com copy "As vagas dessa rodada já foram preenchidas…" + CTA "Quero entrar".
  - Email transacional via Resend (subject "Recebemos seu contato", assinatura simplificada só "Hugo" — "Padeiro apaixonado" segue válido pros posts do Instagram).
  - Variável `EMAIL_FROM=portal@acora.com.br` criada em Preview via `npx vercel env add` (já existia em Production). Resolveu erro 403 do Resend em modo testing.
  - Validação manual: C1 (sanity fluxo normal), C2/C3 (gate fechado + lista de espera + email chegando), C4 (idempotência por email), C6 (race: T2 aberta + flip da flag → 409 + banner persistente), C7 (reabertura do gate). C5 (validação payload) e C8 (persistência) pulados — edge cases menores.
  - 2 iterações de copy com brand voice; consolidação em `docs/archive/briefings/CORA_Briefing_FrenteA_CapacityGate.md` (briefing original) e `docs/archive/briefings/CORA_Briefing_FrenteA_Ajustes.md` (revisão de copy + banner C6).
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
  - Briefing de continuação `docs/archive/briefings/CORA_Briefing_PosFase7.md` commitado (commit `257bc19`).
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
