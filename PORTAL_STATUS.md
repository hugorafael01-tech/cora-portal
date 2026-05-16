# Portal do Assinante — Status Atual

_Auto-gerado em 2026-05-16 por Claude Code. Não editar manualmente acima da seção "Pendências não-código"._

## Versão
- **App:** v0.0.0 (produto v3.2.7)
- **Branch:** main
- **Último commit:** `9e3cb9a` — 2026-05-16 — feat(drawer): refactor da seção Sua Assinatura — QtyStepper + colapso + polish v2 (#5)

## Rotas / páginas
- src/pages/PreCadastro.jsx
- src/pages/CapacityWaitlist.jsx _(Frente A)_

## Componentes principais
- src/components/CEPField.jsx _(Fase 3)_
- src/components/CoverageBlocker.jsx _(Fase 3)_
- src/components/PendingPaymentBanner.jsx _(Fase 6/7)_
- src/components/ProductCard.jsx _(Frente C item 3: expand inline + props `onCardClick`/`inBasketLabel`)_
- `EditarCestaDrawer` _(inline em src/App.jsx — Frente C item 3; refactored em 2026-05-16: seção SUA ASSINATURA colapsável com QtyStepper por tipo, swap atômico em capacity full, comparação por composição, empty state pra extras com CTA, Confirmar disabled em composição inválida)_
- `QtyStepper` _(inline em src/App.jsx — Frente C item 3, variants brand/neutral; estendido em 2026-05-16 com `incrementDisabled`/`decrementDisabled` granulares + swap atômico no handler)_

## Dependências relevantes
- react @ ^19.2.4
- @supabase/supabase-js _(novo na Fase 7)_
- resend _(novo na Fase 7)_

## Marcadores de integração (grep)
| Termo | Arquivos |
|---|---|
| asaas | 1 (api/subscriptions/index.js) |
| otp | 0 |
| whatsapp | 15 |
| webhook | 1 (api/lead.js) |
| supabase | 12 (lib + utils + app + 9 endpoints) |
| resend | 4 (lib + 3 endpoints) |
| stripe | 0 |
| pagar.me | 0 |

## TODOs e FIXMEs no código
Nenhum encontrado

## Últimos 10 commits
- `9e3cb9a` — 2026-05-16 — feat(drawer): refactor da seção Sua Assinatura — QtyStepper + colapso + polish v2 (#5)
- `95f4dd1` — 2026-05-15 — docs: briefing + wireframe do refactor da assinatura no Drawer
- `c85921a` — 2026-05-15 — docs: atualiza PORTAL_STATUS com Frente C item 3 mergeada
- `6880217` — 2026-05-15 — docs: atualiza cabeçalho auto-gerado do PORTAL_STATUS
- `d8544aa` — 2026-05-15 — feat: Frente C item 3 — refactor do Cardápio, Home e Drawer
- `f5ee452` — 2026-05-14 — fix(precadastro): força fontWeight 400 nos h1 com League Gothic
- `106a8f0` — 2026-05-14 — docs: decisoes + briefing + wireframe v2 da Frente C item 3
- `76515f5` — 2026-05-14 — docs: decisões da Frente C item 3 — Cardápio
- `01eb027` — 2026-05-13 — docs: atualiza PORTAL_STATUS com Frente C item 1 concluída (PR 1 + PR 2)
- `b88f410` — 2026-05-13 — feat(home): Hierarquia da Home — carrinho persistido com confirmação (Frente C item 1, PR 2) (#3)

## Build / Deploy
- **Último build local:** 2026-05-16
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
- **Item 1 (hierarquia da Home) ✅ Concluída em 13/05/2026.** Cesta passa de info passiva → carrinho persistido com confirmação explícita. Detalhes na sessão de 13/05 abaixo em "Sessões anteriores". Tasks de follow-up: [86e1c2bnj](https://app.clickup.com/t/86e1c2bnj) e [86e1c2yh3](https://app.clickup.com/t/86e1c2yh3).
- **Item 3 (Cardápio + Home + Drawer) ✅ Concluída em 15/05/2026.** Refactor completo do fluxo de cesta. Detalhes na sessão de 15/05 acima em "Última sessão de trabalho". Tasks de follow-up: [86e1d14zr](https://app.clickup.com/t/86e1d14zr), [86e1d777a](https://app.clickup.com/t/86e1d777a).
- Itens 2, 4, 5 ficam em fila pra sessões futuras.
- **Frente D — Whitelist de cobertura** — pendência da Fase 8 (`admin.acora.com.br`): endpoint pra consultar `coverage_whitelist` no banco, refatorar `estaNaWhitelist` em `src/utils/coverage.js` pra async. Hoje retorna sempre false (lista local vazia em `WHITELIST_HARDCODED`).

## Última sessão de trabalho

- **Data:** 2026-05-16 (sábado)
- **Tema:** Refactor da seção SUA ASSINATURA do Drawer "Editar cesta" — QtyStepper + colapso + polish v2
- **Saída:**
  - Branch `feat/drawer-assinatura-qtystepper` mergeada em main (commit `9e3cb9a`, squash de 3 commits internos).
  - **Origem:** durante validação visual da Frente C item 3 (15/05), descobriu-se confusão conceitual no Drawer com clientes de 2-3 pães: trocar tipos entre slots posicionais marcava como alteração mesmo quando a composição final era idêntica ao baseline. UI era posicional ("Pão 1", "Pão 2"), operação era de composição (quantos de cada).
  - **Decisão de produto:** substituir slots radio por **QtyStepper por tipo de pão** (mesma metáfora dos extras), com **swap atômico** quando capacity full (resolve deadlock no plano 1 pão).
  - **Wireframes consolidados via Claude Design:** `docs/Assinatura no Drawer _standalone_.html` (v1, swap atômico + capacity hint) → `docs/Assinatura_no_Drawer v2__standalone_.html` (v2, reorganização do Drawer: colapsável + empty state). Decisão de manter ordem original "Sua Assinatura → Extras" reforçada após CD propor inversão.
  - **11 mudanças incrementais aplicadas** (documentadas em `docs/CORA_Briefing_Drawer_v2_Reorganizacao_e_Polish.md`):
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
- **Próximo:** sessão dedicada de copy dos produtos com Mariane (task 86e1d14zr); discussão estratégica do Drawer com Mariane antes do Alpha (task 86e1c2yh3); Frente C itens 2, 4, 5 (telas internas restantes) ou Frente D (whitelist de cobertura).

## Sessões anteriores
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
  - **Sources of truth adicionados:** `docs/CORA_FrenteC_Item3_Cardapio_Decisoes.md` (v3, final), `docs/CORA_Briefing_FrenteC_Item3_Cardapio.md` (briefing técnico), `docs/Cardapio Wireframe v2 _standalone_.html` (referência visual fonte primária), `docs/seed_test_assinante.sql` (SQL de seed reutilizável pra Preview deployments).
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
