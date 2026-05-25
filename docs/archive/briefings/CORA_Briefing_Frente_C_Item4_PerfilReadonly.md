# Briefing técnico — Frente C item 4
## Tela Perfil read-only + Modal de Recibo

**Task ClickUp:** `86e1fu240` (absorve `86e1dwk1v` — recibo detalhado)
**Branch sugerida:** `feat/perfil-readonly-modal-recibo`
**Referência visual:** `Tela_Perfil_v2.html` (wireframe v2 aprovado em 20/05/2026)
**Referência CSS:** `docs/Tela Sua Assinatura v4.html` no repo `cora-portal` — fonte primária de tokens, cores, tipografia, modal bottom-sheet

---

## Contexto

Redesign da tela Perfil. Passa a ser **100% read-only no MVP**. Toda edição de dados, atualização de cartão, pausa e cancelamento passam pelo WhatsApp. Tap em uma linha do histórico abre **modal de recibo** (bottom-sheet) com detalhamento da semana.

Implementação **mais simples que Frente C item 2** porque é read-only + 1 modal. Sem refactor de state, sem PATCH endpoint novo, sem AbortController.

---

## Decisões fechadas (não rediscutir)

### Tela Perfil
- **100% read-only** no MVP. Tudo passa pelo WhatsApp.
- **Sai:** chevrons em Dados Pessoais, botão "Atualizar" do Cartão, botão "Sair da conta", entregas pendentes/futuras do Histórico, "(estimado)" do Total.
- **Histórico:** últimos 3 entregues. "Ver todos →" **só aparece** se `entregas.length > 3` (some pra cliente com ≤ 3 entregas).
- **Cobrança:** bloco único com decomposição Assinatura + Extras + Frete = Total. Sub-linha "Cobrança de [mês anterior] · R$ X · Pago" mantida. Cartão sem botão.
- **Pausar/Cancelar:** botão WhatsApp.
- **Microcopy WhatsApp ao fim** — sem `<strong>`, warm-500 12px, centralizada, border-top dashed.
- **Sino fora** do topbar (decisão `86e1ew4d0`, pós-Alpha). Topbar = só logo, lado direito vazio.

### Modal de Recibo (bottom-sheet)
- Mesmo padrão do modal de confirmação da Sua Assinatura v4.
- **Header:** `"Recibo da semana DD/MM"` + submeta `"Entregue [dia da semana]"` precedida por **círculo verde com check** (success-bg + success-border, 16px circle, check 10×10) — variante decidida em 20/05.
- **Seção "Assinatura"** (não "Cesta"): pães do plano, **com gramatura** (`700g` para Original/Integral) como meta, sem preço, sem total.
- **Seção "Extras"** (condicional): com preço unitário + total da seção em brand-500 15px weight 700.
- **Footnote** (microcopy brand-50 + border brand-100):
  - Com extras + fatura futura: `"Cobrança incluída na fatura de DD/MM."`
  - Com extras + fatura paga: `"Cobrança paga em DD/MM."`
  - Sem extras + fatura paga: `"Sem extras nesta semana. Cobrança paga em DD/MM."`
- **Botão único:** `Fechar` ghost full-width.

### Cenário B2: Frete grátis (programa condomínio ativo)
- Aceito como cenário válido do MVP. Lógica de ativação é manual (SQL periódico do Hugo agrupando por endereço, frete grátis aplicado quando ≥ 5 assinantes no mesmo prédio).
- **UI:** `Frete R$ 0,00` em success-text weight 600, com microcopy abaixo do valor em success-text 11px regular: `"frete grátis · programa condomínio"`. Total reflete (R$ 235 → R$ 220).
- Sem celebração (`"Parabéns! 🎉"`). Fato seco.

---

## Estados a implementar

### A. Histórico — 3 cenários
| | Composição |
|---|---|
| A1. Idle completo | 3 entregas listadas, **sem** "Ver todos →" |
| A2. Vazio (cliente novo) | Microcopy `"Você ainda não tem entregas."` + `"Sua primeira chega em DD/MM."` em bold |
| A3. Parcial | 1-2 entregas listadas, **sem** "Ver todos →" |

> Quando `entregas.length > 3` (não desenhado, mas decisão pronta): mostrar `.history-foot` com link "Ver todos →" em League Gothic 11px brand-500. Click no MVP pode ser no-op silencioso ou abrir sheet "em construção" — decisão de próxima sprint.

### B. Cobrança — 2 cenários
| | Decomposição |
|---|---|
| B1. Padrão | Assinatura + Extras (se houver) + Frete = Total |
| B2. Condomínio ativo | Assinatura + Extras (se houver) + **Frete R$ 0,00 com microcopy** = Total |

> Sub-linha "Cobrança de [mês anterior]" só aparece se houver fatura anterior paga (não aparece para cliente novo).

### C. Modal de Recibo — 2 variantes desenhadas + 1 derivada
| | Composição |
|---|---|
| C1. Com extras + futura | Seção Assinatura (sem preço) + Seção Extras (com preço) + footnote "Cobrança incluída na fatura de DD/MM" |
| C2. Sem extras + paga | Só Seção Assinatura + footnote "Sem extras nesta semana. Cobrança paga em DD/MM." |
| C3. Com extras + paga (derivada) | Seção Assinatura + Seção Extras + footnote "Cobrança paga em DD/MM." |

---

## Componentes e tokens a reusar

Do `Tela Sua Assinatura v4.html` em produção:
- `.btn-ghost` (warm-600, sem borda, hover warm-100)
- `.btn-primary` (brand-500 azul Cora)
- `.card` (warm-100 bg, radius-lg)
- Modal bottom-sheet (grab handle 36×4 warm-300, radius topo, click fora fecha)
- `.breakdown` + `.bk-row` (mesmo padrão de decomposição visual do card "Plano atual")
- Tipografia: League Gothic para labels uppercase, Montagu Slab para nomes de produto (Pão Original / Pão Integral / Focaccia Genovesa etc.), body padrão para o resto
- `tabular-nums` em colunas de valores

**Não inventar componente novo.** Se um elemento já existe no v4, reusa.

---

## Padrões consolidados (aplicar sem exceção)

- Datas sempre `DD/MM` (nunca `1º/MM` nem "1 de maio")
- "Pão Original" / "Pão Integral" sempre com "Pão", com `N×` antes do número
- **Sem travessão (—)**, sem rule of three, sem motivacional, sem emoji (exceto `✓` no badge Entregue)
- Modal: bottom-sheet com grab handle, mesma anatomia do modal de confirmação
- Cards: `.card` (warm-100) — para Histórico/Cobrança/Dados Pessoais. Profile-header usa warm-100 com radius-lg também
- `tabular-nums` em qualquer coluna de valor

---

## Perguntas técnicas para o CC investigar antes de codar

1. **Schema da fatura/cobrança:** existe hoje uma forma de saber se uma fatura passada está paga? Coluna em `subscriptions`? Tabela `invoices`? Como Hugo atualiza isso manualmente (Asaas → painel? SQL direto?)? Confirmar antes de criar UI órfã.
2. **Endpoint do histórico:** já existe? Retorna entregas com status (entregue/pendente/cancelado)? Precisa filtrar `where status = 'entregue'` para essa tela?
3. **Endpoint de detalhe do pedido (para o modal):** os dados de itens + extras + status da fatura já vêm no payload do histórico, ou precisa fetch separado quando o modal abre? Decidir pela opção mais simples — preferir prefetch se o payload já carrega; senão, fetch on-demand com loading state mínimo.
4. **Flag de programa condomínio ativo:** como o frontend sabe que o frete vai ser R$ 0,00? Existe coluna em `subscriptions`? View calculada? Ou o valor de frete já vem resolvido do backend e o frontend só compara `frete === 0`? Confirmar.
5. **Próxima data de cobrança:** `next_billing_change_date` foi adicionado na migration `0014`. Verificar se é a fonte certa para preencher "Próxima fatura · DD/MM" do bloco Cobrança.

> Sem chutar nenhum desses pontos. Se alguma resposta exigir mudança de schema, **redirecionar para o repo `cora-backoffice`** (regra de governança).

---

## Fases de implementação

### Fase 1 — Limpeza + tela Perfil read-only
- Remover: chevrons em Dados Pessoais, botão Atualizar Cartão, botão Sair da conta, entregas futuras/pendentes do Histórico, "(estimado)" no Total
- Implementar 5 blocos read-only: Header, Dados Pessoais (com olho no CPF), Histórico, Cobrança (com decomposição), Pausar/Cancelar
- Implementar 3 estados de Histórico (A1, A2, A3)
- Implementar 2 cenários de Cobrança (B1, B2)
- Topbar = só logo, sem sino
- Microcopy WhatsApp final (sem `<strong>`)

**Validação Fase 1:** smoke em Preview com prints dos cenários:
- A1 × B1 (cliente padrão)
- A1 × B2 (cliente em condomínio ativo)
- A2 × B1 (cliente novo)
- A3 × B1 (cliente parcial)

### Fase 2 — Modal de Recibo (bottom-sheet)
- Componente Modal seguindo padrão do modal de confirmação da Sua Assinatura v4
- Click fora fecha, Esc fecha, arrastar pra baixo fecha (gesture nativo)
- Foco volta pra linha do histórico que abriu o modal (a11y)
- Implementar 3 variantes (C1, C2, C3)
- Tap em qualquer linha do histórico abre o modal correspondente
- Gramatura como meta abaixo do nome do produto (`700g` para pães da assinatura, peso específico para extras)

**Validação Fase 2:** smoke em Preview com prints das 3 variantes do modal.

### Fase 3 — Smoke test final + squash merge
- Revisão dos 4 cenários da Fase 1 + 3 variantes do modal
- Conferência de copy contra `Tela_Perfil_v2.html`
- Squash merge em `main` via PR

---

## Critérios de aceite

| | Requisito |
|---|---|
| ✓ | 100% das interações que alteram dados → botão WhatsApp ou microcopy final |
| ✓ | Zero edição inline em qualquer campo da tela Perfil |
| ✓ | Zero `<strong>` na microcopy final ao fim da tela |
| ✓ | "Ver todos →" oculto quando `entregas.length ≤ 3` |
| ✓ | Modal: label "Assinatura" (nunca "Cesta") |
| ✓ | Modal: gramatura como meta tanto em Assinatura quanto em Extras |
| ✓ | Frete grátis (B2): valor em success-text weight 600, microcopy abaixo em success-text 11px regular |
| ✓ | Sem celebração (`"Parabéns! 🎉"`) em qualquer estado |
| ✓ | Datas em `DD/MM`, "Pão" sempre prefixando nome do produto |
| ✓ | Sem travessão (`—`) em copy nova |

---

## Estimativa

~2-3 dias úteis a partir da Fase 1 iniciada.

---

## Plano antes de codar

Apresenta o plano de execução respondendo às **5 perguntas técnicas** acima, mostrando:
1. O que já existe (arquivos, componentes, endpoints, colunas de schema relevantes)
2. O que precisa criar
3. Qual fase começar
4. Dúvidas remanescentes (se houver — preferível ser explícito do que assumir)

**Aguardar aprovação do Hugo antes de executar qualquer fase.**
