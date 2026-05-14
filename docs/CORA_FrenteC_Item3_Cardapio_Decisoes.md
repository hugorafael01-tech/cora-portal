# Frente C item 3 — Cardápio: decisões de produto

**Data:** 2026-05-13 (continuação em 2026-05-14)
**Origem:** Feedbacks UX de João e Astrid (`docs/CORA_Telas_Internas_Pendencias.md` itens 4.2.1, 4.2.2, 4.2.3)
**Status:** Decisões fechadas. Próximo passo: wireframe via Claude Design, depois briefing técnico.

---

## 4.2.1 — Aviso de cutoff + cobrança em uma linha

**Copy decidida:** `"Extras entram na sua próxima fatura."`

Linha única no topo do Cardápio, abaixo (ou substituindo) o aviso atual de cutoff. Posicionamento exato a decidir no wireframe.

**Implementação operacional do modelo de cobrança:** Hugo manda manualmente, todo mês, o resumo de compras + link de pagamento via WhatsApp — operando como Asaas faria automaticamente. Cliente recebe uma fatura mensal única, sem distinguir cobrança automatizada vs manual.

Quando Asaas integrar pra cobrança avulsa, a copy continua válida. Sem necessidade de atualização.

---

## 4.2.2 — Botão "Quero" não comunica → padrão e-commerce

### Reverter decisão introduzida no PR 2

No PR 2 da Frente C item 1, click no `ProductCard` passou a abrir Modal sobreposto. Decisão não-debatida que quebrou o padrão pré-existente. **A reverter.**

### Novo comportamento

**ProductCard no Cardápio (estado sempre igual):**
- Foto + nome + descrição curta + preço + botão `Adicionar à cesta` (primary, full-width)
- Card visualmente **não muda** ao adicionar — sem mudança de estado, sem trocar pra [- N +]

**Click no botão "Adicionar à cesta":**
- Dispara `addExtraToCart` (POST otimista no servidor)
- Mostra toast com flexão de gênero: `"[Produto] adicionado/adicionada à cesta. Confirme antes de terça, 12h."`
- Feedback ao usuário fica todo no toast — sem alteração do card

**Click na FOTO do produto (ou área principal do card, a decidir no wireframe):**
- Expande o card inline (accordion)
- Mostra ingredientes + sobre este pão dentro do próprio card
- **Não** abre Modal sobreposto

**Modal sobreposto:** sai do fluxo do Cardápio. Pode ser mantido vivo no componente pra outros contextos ou removido — a decidir junto com a implementação.

### Onde fica o controle de quantidade

NÃO fica no ProductCard. Fica:
- **Card de Cesta na Home:** cada linha de extra tem `[- N +]` embutido
- **Drawer "Editar carrinho":** seção EXTRAS DESTA SEMANA tem `[- N +]` por linha

---

## 4.2.3 — Visão consolidada da cesta (Astrid)

**Resolvido automaticamente pela decisão 4.2.2.** O controle `[- N +]` visível no Card de Cesta da Home e no Drawer já consolida tudo num lugar: o user vê o produto no Cardápio, vê a quantidade no Card de Cesta.

### Implicação adicional

O `×` na lista de extras do Card de Cesta da Home **some**. Com `[- N +]` na mesma linha, o `×` vira redundância (decrementar de 1 pra 0 já remove o item da lista).

---

## Impacto em outros componentes

**ProductCard.jsx:**
- Remove props `onCardClick` e `inBasketLabel` (introduzidos no PR 2 a desfazer)
- Recupera lógica de expand inline (accordion) que existia pré-PR 2 — não via `git revert`, mas reescrevendo pra integrar com state `weeklyOrders` atual
- O `directQtySelector` (usado no Onboarding) continua intacto, sem impacto

**App.jsx (Cardápio):**
- Reverte click no card que abre Modal sobreposto
- Handler do botão "Adicionar à cesta" chama `addExtraToCart` direto
- State local pra accordion (qual card está expandido)

**App.jsx (Card de Cesta da Home + Drawer):**
- Remove `×` da lista de extras
- Adiciona controle `[- N +]` em cada linha de extra, chamando `addExtraToCart`/`removeExtraFromCart`

**Modal de detalhes:**
- Branch `qty>0` inerte (registrado como item 7 da task 86e1c2bnj) pode ser limpa nesta refatoração
- Se Modal sair completamente, alguns outros callers podem precisar ajuste

---

## Decisões em aberto pro wireframe

1. **Posição da copy "Extras entram na sua próxima fatura."** — no topo (junto do aviso de cutoff) ou em outro lugar?
2. **Layout do expand inline** — foto continua à esquerda? Accordion ocupa largura toda? Onde fica o botão "Adicionar à cesta" quando expandido?
3. **Multiplicidade de toasts** — se user clicar 3 vezes rápido, 3 toasts em sequência ou agregação visual? (decidir após ver mockup do toast)
4. **Onde fica o controle `[- N +]` na linha do extra** — direita extrema (perto do preço), ou centralizado?

---

## Cronograma

| Etapa | Status |
|---|---|
| Decisões fechadas | ✅ 2026-05-13 |
| Wireframe via Claude Design | Próxima sessão |
| Briefing técnico (review do wireframe + spec) | Sessão de implementação |
| Implementação | Claude Code |
| Validação manual em Preview | Pós-implementação |
| Merge | Pós-validação |

---

## Referências

- Decisões da Frente C item 1: `docs/CORA_FrenteC_HomeHierarquia_Decisoes.md`
- Briefing técnico item 1: `docs/CORA_Briefing_FrenteC_Item1_Home.md`
- Doc fonte dos feedbacks UX: `docs/CORA_Telas_Internas_Pendencias.md`
- Modelo comercial: `CORA_Precos_e_Planos_v1.md`
- Task ClickUp follow-ups item 1: [86e1c2bnj](https://app.clickup.com/t/86e1c2bnj)
- Task ClickUp discussão Drawer: [86e1c2yh3](https://app.clickup.com/t/86e1c2yh3)
