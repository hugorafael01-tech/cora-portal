# Portal do Assinante — Status Atual

_Auto-gerado em 2026-04-24 18:19 por Claude Code. Não editar manualmente acima da seção "Pendências não-código"._

## Versão
- **App:** v0.0.0
- **Branch:** main
- **Último commit:** `40a67bd` — 2026-04-24 — copy: descricao do Pao Original atualizada

## Rotas / páginas
- src/pages/PreCadastro.jsx

## Componentes principais
- src/components/ProductCard.jsx

## Dependências relevantes
- react @ ^19.2.4

## Marcadores de integração (grep)
| Termo | Arquivos | Ocorrências |
|---|---|---|
| asaas | 0 | 0 |
| otp | 1 | 2 |
| whatsapp | 3 | 29 |
| webhook | 0 | 0 |
| supabase | 0 | 0 |
| stripe | 0 | 0 |
| pagar.me | 0 | 0 |

## TODOs e FIXMEs no código
Nenhum encontrado

## Últimos 10 commits
- `40a67bd` — 2026-04-24 — copy: descricao do Pao Original atualizada
- `d56ce5f` — 2026-04-24 — fix(cardapio): D.paes (Original, Integral) sem ingredientes/detalhe
- `d40797c` — 2026-04-24 — fix(copy): 'Chega' -> 'Vai chegar' no Welcome (tempo verbal correto)
- `313a521` — 2026-04-24 — fix: data de entrega dinamica (proxima quinta a partir de hoje)
- `97b2cf3` — 2026-04-24 — fix: cestaAtual ciente de tipo de alteracao + sinalizacao de reducao pendente
- `eff4941` — 2026-04-24 — fix: cestaAtual usa baseline e label 'editada só nesta semana'
- `7b16e38` — 2026-04-24 — fix(copy): plural no composicaoToStr + label 'editada so desta semana' reformulado
- `314d75d` — 2026-04-24 — style(copy): modal troca pura opcao C (foco no cliente)
- `67e2544` — 2026-04-24 — style(copy): aplica decisoes editoriais do Hugo
- `bcd6499` — 2026-04-24 — chore(copy): revisao final (brand-voice, humanizer, plural, gramatica)

## Build / Deploy
- **Último build local:** 2026-04-24 11:25
- **vercel.json:** presente

---

## Pendências não-código
_Esta seção é editada manualmente durante sessões de trabalho. Claude Code não sobrescreve daqui pra baixo._

<!-- STATUS_MANUAL_START -->

<!-- STATUS_MANUAL_START -->

## Spec vigente
- **Portal:** v3.0 (mar/2026) + Adendo v3.1 (mar/2026)
- **Próxima consolidação prevista:** v4.0 (pós-testes de usabilidade)
- **Local dos docs:** projeto do Claude (CORA_Portal_Assinante_Especificacao_v3.docx + CORA_Portal_Adendo_v3_1_Redesign.docx)

## Observações sobre este arquivo
- `package.json` com version `0.0.0` — produto é v3.2.7, não há versionamento formal no código. A decidir: adotar semver no package.json ou tratar versão só como conceito de produto.
- Listagem de rotas/componentes pode estar incompleta (top-level apenas). Ajustar prompt na próxima regeneração se for o caso.

## Decisões de produto aguardando Hugo
- [x] Preços unitários dos pães extras na cesta semanal (hoje NULL no schema do backoffice)
- [ ] Swap Original ↔ Integral é cost-neutral? Validar contra CORA_Fichas_Producao_v5.xlsx
- [ ] Como cobranças de extras aparecem no billing do Asaas (linha única? linha separada?)
- [x] Conflito de posicionamento: 3 tiers antigos em posicionamento.md vs. modelo único R$99 + R$15 frete — **resolvido: modelo único mantido**

## Blockers externos (fora do repo)
- [x] Conta Asaas — **criada** (task ClickUp: 86e0rgdhn)
- [ ] Google Workspace hugo@acora.com.br — setup pendente. Fase 7 usa Gmail temporário (`hugorafael01@gmail.com` como `EMAIL_TO`; domínio default do Resend como `EMAIL_FROM`) até Workspace ficar pronto
- [x] Definir Asaas CPF vs CNPJ antes de criar conta (task ClickUp: 86e0rghwq) — **resolvido**

## Gap spec × código (a reconciliar)
- Spec v3.0 cita Stripe/Pagar.me como gateway → produto migrou pra Asaas. Atualizar seção 7.2 na próxima consolidação.
- Bottom nav da spec v3.0 (Home, Demonstrativo, Cardápio, Perfil) substituída na v3.1 (Home, Sua Assinatura, Cardápio, Perfil). Verificar se código reflete v3.1.

## Próximo foco acordado
- **Fase 7 do refactor de onboarding** (backend): Supabase + Resend + endpoint serverless `POST /api/subscriptions`.
- Briefing completo em `docs/CORA_Briefing_Refactor_Onboarding.md`.
- Migration consolidada (subscriptions + coverage_waitlist + coverage_whitelist) já validada nesta sessão — vai virar `supabase/migrations/0001_initial.sql` na Fase 7.
- Substituir stub `postWaitlist` (em `src/utils/api.js`) por fetch real. Adicionar `postSubscription`. Localstorage continua armazenando `subscription_id` retornado pelo POST.
- E-mail transacional via Resend (provedor confirmado). `EMAIL_TO=hugorafael01@gmail.com` enquanto Google Workspace acora.com.br não estiver pronto.
- Pré-requisito de credenciais: Supabase URL + service role key, Resend API key. Hugo providencia antes de começar.

## Última sessão de trabalho
- **Data:** 2026-05-05
- **Tema:** Refactor onboarding Fases 0–6 (UI completa, falta backend)
- **Saída:** branch `refactor/onboarding-fase-0` com 9 commits cobrindo:
  - Fase 0: utils (validators, normalize, firstDelivery, coverage helpers), config (`COVERED_AREAS`, `HUGO_WHATSAPP`), pesos 615g→700g em Original/Integral, campo `sobre`.
  - Fase 1: `ProductCard` ganha `directQtySelector` + alias `product.sobre`.
  - Fase 2: T2 (Sua Assinatura) refeita, T3 eliminada, footer dinâmico, stepper 3→2.
  - Fase 3: `CEPField`, `CoverageBlocker`, stub `postWaitlist`, playground temporário.
  - Fase 4: T1 (Sobre você + Entrega) refeita, integra ViaCEP + cobertura + whitelist + Opção A pra fallback (`coverageUnconfirmed`), validação inline mista, microcopy LGPD, gênero removido.
  - Fase 5: Welcome reformulada (saudação sem flexão, card recap com data calculada, aviso WhatsApp do user, botão "Ir pro app"). Persistência local via `src/utils/subscription.js` (chave `cora_subscription`). `?reset=true` pra QA. Subscription persistida destrava portal sem `?dev=1`.
  - Fase 6: `PendingPaymentBanner` sticky junto com a logo. Bloqueio de extras no Cardápio E na Home (`lockedReason` no `ProductCard`/`NovidadeCard`). `OrderFooter` Confirmar disabled quando pendente. Swap "Personalizar esta semana" não bloqueia. `QtyBtn` local com auto-disable em qty=0.
  - Pendente: branch ainda não mergeada em `main`. Aguardando teste no Preview do Vercel + push da Fase 7.

<!-- STATUS_MANUAL_END -->