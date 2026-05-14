# Frente C item 3 — Cardápio: decisões de produto

**Versão:** 3 (final, pós-validação do wireframe v2)
**Data de fechamento:** 2026-05-14
**Origem:** Feedbacks UX de João e Astrid (`docs/CORA_Telas_Internas_Pendencias.md` itens 4.2.1, 4.2.2, 4.2.3)
**Wireframe de referência:** `Cardapio_Wireframe_v2__standalone_.html` (Claude Design, 2026-05-14)
**Status:** Decisões fechadas. Pronto pra briefing técnico → Claude Code.

---

## Decisões dos 3 itens originais da Frente C item 3

### 4.2.1 — Aviso de cutoff + cobrança em uma linha ✅

**Copy:** `"Extras entram na sua próxima fatura."`

**Posição:** linha micro-tipográfica logo abaixo do aviso de cutoff existente. Não é banner — é lembrete inline, baixa fricção visual, com mini-ícone de cartão (`warm-500`).

**Operação:** Hugo manda manualmente o resumo de compras + link de pagamento via WhatsApp todo mês, operando como Asaas faria automaticamente. Cliente recebe fatura mensal única consolidada. Quando Asaas integrar pra cobrança avulsa, copy continua válida.

### 4.2.2 — ProductCard: padrão e-commerce + expand inline ✅

**Reverter a decisão do PR 2** que fez click no ProductCard abrir Modal sobreposto. Voltar ao padrão pré-PR 2.

**ProductCard no Cardápio:**
- Foto 88×88 à esquerda + nome + meta (peso/tamanho) + descrição curta + preço
- Affordance "detalhes ⌄" na linha do preço (League Gothic 10px, `warm-400`)
- Botão `Adicionar à cesta` primary full-width (`brand-500`), sempre presente, nunca muda estado
- **Click na área da row (foto + info):** expande o card inline (accordion abaixo do botão) mostrando Sobre + Ingredientes
- **Click no botão "Adicionar à cesta":** `stopPropagation`, dispara `addExtraToCart`, mostra toast (sem afetar expand state)
- **Múltiplos cards abertos simultaneamente permitidos** (padrão fechado, sem limite de 1-aberto-por-vez)

**Modal sobreposto:** sai do fluxo. Componente pode ser limpo do código.

### 4.2.3 — Visão consolidada da cesta ✅

Resolvido pela combinação de:
- Lista unificada do Card de Cesta da Home (já estava no PR 2)
- Controle `[- N +]` substituindo o `×` (decisão nova)
- Linhas de assinatura mostrando "Incluso" à direita (separação clara entre assinatura e extras)

---

## Decisões transversais consolidadas (afetam mais que o Cardápio)

### A. Tom de voz: "Carrinho" → "Cesta"

Padronização em **todos os textos visíveis** ao usuário:

| Localização | Antes | Depois |
|---|---|---|
| Botão na Home (abaixo do Card de Cesta) | "→ Editar carrinho" | "Editar cesta" (com ícone de edit) |
| Título do Drawer | "Editar carrinho" | "Editar cesta" |
| Toast pós-confirmar do Drawer | "Carrinho atualizado" | "Cesta atualizada" |
| Qualquer outra ocorrência em copy | "carrinho" | "cesta" |

Variáveis internas, nomes de função e comentários no código podem manter "carrinho" sem afetar UX. Renomear `EditarCarrinhoDrawer` → `EditarCestaDrawer` é opcional (sem urgência).

### B. Saudação na Home: unificada

PR 2 atual tem 2 versões (1º acesso + recorrente). **Substituir por uma única forma temporal:**

```
"Oi, [nome], bom dia!"   (manhã)
"Oi, [nome], boa tarde!" (tarde)
"Oi, [nome], boa noite!" (noite)
```

Sem flexão de gênero. Sem mensagem especial de boas-vindas. Remove a lógica de "primeiro acesso" e a frase `"Que bom ter você aqui, [nome]."`.

### C. Linha de extra: `×` → `[- N +]` + animação de remoção

**No Card de Cesta da Home e no Drawer "Editar cesta" (seção EXTRAS DESTA SEMANA):**
- Substituir o `×` pelo controle `[- N +]`
- Variante visual: sobre fundo `brand-50` (Home), borda `brand-100`, ícones em `brand-500`; sobre fundo `warm-100` (Drawer), variante neutra com borda `warm-200`
- Mesmo padrão visual do `directQtySelector` do Onboarding

**Animação de remoção** quando o controle chega em 0:
- Linha desliza pra fora (slide-out horizontal ou vertical, 200ms ease-out) + fade (`opacity 1 → 0`)
- **Sem texto, sem toast** — feedback puramente visual
- Padrão moderno (swipe-to-delete iOS, undo Apple Mail)

### D. Linhas de assinatura: "Incluso" em vez de preço

**Card de Cesta da Home e Drawer (seção SUA ASSINATURA):**
- `1× Pão Original  ·  Assinatura  ·  Incluso`
- `1× Pão Integral  ·  Assinatura  ·  Incluso`

Reforça que essas linhas não consomem saldo (são fixas pelo plano). Sem controle `[- N +]` — quantidade da assinatura não é editável por aqui (só no fluxo de mudança de plano, fora do escopo).

### E. Linhas mistas: Pão Original/Integral como extra

Cenário: cliente tem 1× Pão Original na assinatura E adiciona +1 via Cardápio.

**Tratamento (linhas separadas):**
```
1× Pão Original  ·  Assinatura  ·  Incluso
1× Pão Integral  ·  Assinatura  ·  Incluso
1× Pão Original  ·  R$ 27,00  ·  [- 1 +]
1× Focaccia Genovesa  ·  R$ 22,00  ·  [- 1 +]
```

Linha da assinatura permanece intocada com "Incluso". Nova linha do extra aparece abaixo, com preço e controle. Mais honesto e simples que agregar.

Total no rodapé do card mostra **só extras** (assinatura já está coberta pelo plano mensal):
```
Extras desta semana   R$ 49,00
```

### F. NovidadeCard Hero em ambas as telas

Mantido como está no PR 2 (Home) E reintroduzido no Cardápio antes da lista de ProductCards.

Estrutura do Hero:
- Foto grande do pão da semana
- Tag "Novidade da semana" sobreposta
- Nome + meta (peso, "estreia desta quinta")
- Sub-copy emocional
- CTA full-width: `+ Adicionar à cesta` (lado esquerdo) + preço tabular (lado direito), tudo dentro do mesmo botão `brand-500`

### G. Badge no Nav: alteração pendente na Home

Quando o pedido da semana está em status `rascunho` (tem alteração não confirmada), o ícone **INÍCIO** do Nav inferior mostra um badge visual indicador.

**Visual:**
- Badge circular pequeno (8-10px), `brand-500` sólido, canto superior direito do ícone
- Sem número (apenas presença/ausência) — flag, não contador
- `aria-label="Você tem alterações na cesta"`

**Aparece quando:** `currentWeeklyOrder?.status === 'rascunho'`
**Some quando:** `currentWeeklyOrder?.status === 'confirmado'` ou `!currentWeeklyOrder`

### H. Toasts: stack até 3 com flexão de gênero

Quando user adiciona vários extras em sequência, toasts empilham até 3:
- Mais recente no topo, 100% opacity
- Anteriores recuam (opacity 85% → 65%, scale 97% → 94%)
- 4º empurra o mais antigo pra fora (fadeOut 200ms)
- Cada toast tem timer próprio (3.5s)

Flexão de gênero por produto:
- Masculino: "Pão Original adicionad**o** à cesta", "Brioche adicionad**o**", "Multigrãos adicionad**o**"
- Feminino: "Focaccia adicionad**a**", "Ciabatta Rústica adicionad**a**"

Campo `genero: 'm' | 'f'` no catálogo (D.extras, D.pães, D.rotativos). Default `'m'` se faltar dado.

### I. Botão "Editar cesta" na Home: estilo ghost com ícone

No wireframe v2, o botão de edição passou de outline azul (PR 2) para link ghost com ícone de pencil (`edit-cesta-link`), discreto. Decisão: **manter o tratamento ghost com ícone**, mais leve no contexto da Home (que já tem o CTA grande "Confirmar pedido" acima).

### J. Removidos do PR 2 (regressão consciente)

- ProductCard: props `onCardClick` e `inBasketLabel`
- App.jsx: comportamento de click no card que abre Modal sobreposto
- Card de Cesta da Home: `×` na linha de extra
- Saudação "primeiro acesso" ("Que bom ter você aqui, [nome].")

### K. NÃO implementar (decisões explícitas de exclusão)

- Footer sticky no Cardápio com "Editar cesta" + subtotal — descartado
- Texto "Em meses com 5 semanas, o pão extra é por nossa conta." — comunicação fica em outras superfícies, não no app
- Toast "Removido da cesta" — substituído por animação visual silenciosa
- Indicador "✓ N× na sua cesta" no ProductCard — substituído pelo controle `[- N +]` na cesta
- Linha de data hero acima da saudação (apareceu no wireframe v1, descartada em v2)

---

## Pendências fora do escopo deste item

### Da task 86e1c2bnj (polish/dívida técnica) que **este PR resolve**:
- Item 1 — copy de cobrança ✅
- Item 3 — touch-target do `×` (sublimite 28×28) ✅ (`×` removido)
- Item 7 — branch `qty>0` inerte no Modal ✅ (Modal sai)
- Item 9 — peso/tamanho inconsistente nos extras no Drawer ✅ (consolidado no wireframe)

### Da task 86e1c2bnj que **fica pra futuras frentes**:
- Item 2 — Skeleton no card de cesta enquanto GET carrega
- Item 4 — `EditarCarrinhoDrawer` inline em App.jsx (extrair pra arquivo separado)
- Item 5 — `cestaSemana` legacy paralelo ao POST
- Item 6 — Rollback silencioso em add pós-cutoff
- Item 8 — `D.entrega.data` field sem callers

### Da task 86e1c2yh3 (discussão Drawer):
- Esta refatoração **endereça parcialmente** item 1 (confusão "assinatura" vs "esta semana") via copy "Incluso" e separação de linhas
- Itens 2 e 3 (redundância de microcopy + compromisso forçado ao explorar) **continuam pra sessão dedicada** com Mariane

---

## Cronograma

| Etapa | Status |
|---|---|
| Decisões fechadas (sessão 1, 13/05) | ✅ |
| Wireframe v1 via Claude Design | ✅ |
| Revisão e iteração para v2 (sessão 2, 14/05) | ✅ |
| Wireframe v2 validado | ✅ |
| Briefing técnico | Próxima etapa |
| Implementação | Claude Code |
| Validação manual em Preview | Pós-implementação |
| Merge | Pós-validação |

---

## Referências

- Wireframe v2: `Cardapio_Wireframe_v2__standalone_.html`
- Decisões da Frente C item 1: `docs/CORA_FrenteC_HomeHierarquia_Decisoes.md`
- Briefing técnico item 1: `docs/CORA_Briefing_FrenteC_Item1_Home.md`
- Doc fonte dos feedbacks UX: `docs/CORA_Telas_Internas_Pendencias.md`
- Modelo comercial: `CORA_Precos_e_Planos_v1.md`
- Task ClickUp follow-ups item 1: [86e1c2bnj](https://app.clickup.com/t/86e1c2bnj)
- Task ClickUp discussão Drawer: [86e1c2yh3](https://app.clickup.com/t/86e1c2yh3)
