# Briefing Claude Code — Refinamento da Cesta da Semana

*Ajustes conceituais pós-execução do briefing anterior (CORA_Briefing_Ajustes_App.md). Abril 2026.*

**Repositório:** `cora-portal`
**Branch sugerida:** `ajustes/cesta-unificada` (a partir da branch atual, já com terminologia e swap aplicados)
**Escopo:** 4 ajustes focados. Sem mudanças estruturais novas. Todo o trabalho é reorganização de UI e copy.

---

## Contexto

O primeiro briefing aplicou terminologia e implementou Swap com sucesso. Na validação, identificamos que a **Cesta da Semana ainda não aparece com o destaque conceitual necessário**:

- Após fazer Swap, só aparece um badge pequeno no card — o cliente pode não perceber que alterou
- O card "Seu Pedido desta Semana" e "Sua Cesta desta Semana" são dois conceitos separados hoje, mas deveriam ser um só
- Cardápio mostra "Este pão já faz parte da sua cesta" — fica errado quando houve Swap
- Modal de personalização ainda tem "Slot 1" (termo técnico em inglês) e "Personalizar cesta desta semana" como header

**Princípio conceitual a aplicar:**
- **Assinatura** = compromisso permanente (tela Assinatura, não muda)
- **Cesta da Semana** = o que vai chegar NESTA quinta (reflete Assinatura + swap + extras)
- **Cardápio** = produtos disponíveis pra adicionar à Cesta (sem referência à Assinatura)

---

## Ajuste 1 — Unificar cards da Home em "Cesta da Semana"

### Estado atual

Hoje a Home tem dois cards separados:
1. **"Sua Cesta desta Semana"** — mostra sempre, só a Assinatura
2. **"Seu Pedido desta Semana"** — aparece quando há extras confirmados (`confirmed.length > 0`)

### Novo comportamento

Um card único chamado **"CESTA DA SEMANA"**, sempre visível, que muda de conteúdo conforme o estado. Elimina a confusão entre "cesta" e "pedido".

### Os 4 estados do card

**Decisão visual global:** o card da Cesta da Semana usa **fundo branco fixo (#FFFFFF)** em todos os 4 estados. Motivo: cria hierarquia visual clara (a página tem fundo warm-50, os outros cards da Home usam warm-100, a Cesta usa #FFF e ganha destaque como protagonista da tela). Mudanças de estado refletem via badges e conteúdo, nunca via cor de fundo.

**Implementação:** no componente `Card` ou estilizado localmente, forçar `background: "#FFF"` no card da Cesta da Semana. Manter borda warm-200 (ou brand-200 no estado com swap, se fizer sentido visual) pra marcar o container sem depender de fundo colorido.

**Estado 1 — Cesta padrão (sem swap, sem extras):**

```
CESTA DA SEMANA
[foto do pão da Assinatura] 
  Quinta, 23 de abril
  1 Pão Original (615g)

Tudo certo. Essa é sua cesta da Assinatura.
```

Visual: foto edge-to-edge esquerda (como hoje), cabeçalho "CESTA DA SEMANA" em League Gothic caption, linha informativa em warm-600.

**Estado 2 — Com Swap (troca só desta semana):**

```
CESTA DA SEMANA        [editada só desta semana]
[foto do produto trocado]
  Quinta, 23 de abril
  1 Pão Integral (615g)

Você trocou o Pão Original por Integral esta semana.
Próxima semana volta ao normal.
```

Visual: badge "editada só desta semana" em warm-200 bg / warm-800 text no canto superior direito. Texto de contexto em warm-600.

**Estado 3 — Com Extra (adição do Cardápio, sem swap):**

```
CESTA DA SEMANA        [confirmada]
[foto do pão da Assinatura]
  Quinta, 23 de abril
  1 Pão Original (615g) · assinatura
+ 1 Focaccia Genovesa · R$ 22,00   [− 1 +]

Total de extras: R$ 22,00 na próxima fatura.
```

Visual: badge "confirmada" em brand-50/brand-700 (só o badge, não o fundo do card). Linha de extra destacada com "+" antes. Controles `QtyBtn` inline ao lado de cada extra. Total em brand-700 semibold.

**Estado 4 — Swap + Extra:**

```
CESTA DA SEMANA        [editada só desta semana]
[foto do produto trocado]
  Quinta, 23 de abril
  1 Pão Integral (615g) · trocado pelo Original
+ 1 Focaccia Genovesa · R$ 22,00   [− 1 +]

Total de extras: R$ 22,00 na próxima fatura.
```

Visual: mantém fundo branco. Badge "editada só desta semana" prevalece sobre "confirmada" (se houver swap, a edição é o estado dominante). Controles `QtyBtn` inline nos extras.

### Ações no card

Mantém o link "Personalizar" no canto superior direito do card. Em qualquer estado, o cliente pode tocar pra editar o swap.

**Controles inline para extras:** nos estados 3 e 4 (com extras), cada linha de extra tem o mesmo `QtyBtn` que já existe no app (botões "−" e "+") pra ajustar quantidade ou remover sem sair do card. Pra adicionar extras novos, o link "Ver cardápio completo ›" que já existe embaixo do card resolve.

### Implementação

Remover o card separado "Seu pedido desta semana" do componente `Home`. Consolidar toda a lógica de exibição num único card "Cesta da Semana" que calcula seu conteúdo baseado em:

```javascript
const temSwap = /* detectar se houve swap */;
const temExtras = confirmed.length > 0;

// Estado 1: !temSwap && !temExtras
// Estado 2: temSwap && !temExtras
// Estado 3: !temSwap && temExtras
// Estado 4: temSwap && temExtras
```

---

## Ajuste 2 — Modal de personalização da Cesta

### Estado atual

Header do modal: "Personalizar cesta desta semana"
Label dos itens: "Slot 1", "Slot 2", "Slot 3"

### Problemas

- "Slot" é jargão técnico em inglês, inconsistente com o tom brasileiro-humano da Cora
- Título pode ser mais simples, alinhado com a terminologia oficial

### Proposta

**Header do modal:**
```
PERSONALIZAR CESTA DA SEMANA
```
(Sem "desta" — fica mais direto e consistente com o card "Cesta da Semana")

**Labels dos itens:**
- Se 1 pão na Assinatura: remover label. Mostrar só o produto direto.
- Se 2 ou 3 pães: usar "Pão 1", "Pão 2", "Pão 3" em vez de "Slot 1", "Slot 2", "Slot 3"

**Texto auxiliar:**
```
PERSONALIZAR CESTA DA SEMANA

Você pode trocar os pães da sua Assinatura por outros produtos elegíveis. 
A troca vale só pra esta semana. Sua Assinatura volta ao normal na próxima.

Pão 1:
  ● Pão Original (615g)   [selecionado]
  ○ Pão Integral (615g)

[Confirmar troca]   [Cancelar]
```

Se só tem 1 pão na Assinatura, omitir o label "Pão 1:" — fica redundante.

---

## Ajuste 3 — Cardápio: remover referência à Assinatura

### Estado atual

No card do Pão Original no Cardápio, aparece a mensagem:
> "Este pão já faz parte da sua cesta"

### Problemas

1. "Cesta" está sendo usada errado aqui — o pão está na Assinatura, não necessariamente na Cesta da Semana (se houve Swap, ele não está)
2. Mostrar a configuração da Assinatura dentro do Cardápio adiciona ruído sem valor
3. O cliente sabe o que tem na Assinatura — não precisa ser lembrado aqui

### Proposta

**Remover a mensagem por completo.** O card do Pão Original no Cardápio fica igual aos outros:

```
Pão Original (615g)
Fermentação natural, casca crocante, miolo macio.
R$ 27,00/un
[Pedir]
```

Se o cliente pedir este pão, vai como Extra pago (comportamento correto, igual a qualquer outro produto).

### Implementação

No componente `Cardapio` (ou no componente `ProductCard` se for lá), remover a prop/lógica que exibe a mensagem "Este pão já faz parte da sua cesta". Eliminar a prop `basketIds` se ela só servir pra isso.

---

## Ajuste 4 — Consistência de terminologia em copy

Varrer o código e trocar:

| Antes | Depois |
|---|---|
| "Seu pedido desta semana" | "Cesta da Semana" |
| "Sua cesta desta semana" (como cabeçalho) | "Cesta da Semana" |
| "Pedido confirmado!" (toast) | "Cesta confirmada!" |
| "Seus extras serão entregues na próxima quinta." | "Sua cesta será entregue na próxima quinta." |
| "parte da assinatura" (no detalhamento) | "assinatura" (versão curta é mais limpa) |

**No Perfil (histórico):**
- "Esta semana" → manter
- "1× Pão Integral (parte da assinatura)" → **"1× Pão Integral · assinatura"** (ou "trocado pelo Original" se houve swap)

---

## Validação pós-execução

Testar estes 6 cenários no app rodando:

**Cenário 1 — Cesta padrão:**
- Home mostra "CESTA DA SEMANA" com "Tudo certo. Essa é sua cesta da Assinatura."

**Cenário 2 — Após Swap:**
- Home atualiza. Card agora mostra "editada só desta semana", foto muda pra produto trocado, texto explica o swap.
- Modal de personalização tem título "PERSONALIZAR CESTA DA SEMANA" (sem "desta")
- Sem "Slot 1" no modal. Se 1 pão só, direto sem label.

**Cenário 3 — Adicionar Extra sem Swap:**
- Cardápio: card do Original não mostra "Este pão já faz parte da sua cesta"
- Confirma. Home mostra estado 3: Assinatura + extra listados, total de extras claro.

**Cenário 4 — Swap + Extra:**
- Home mostra estado 4: produto trocado + extra, ambos claros.

**Cenário 5 — Home com múltiplos pães na Assinatura:**
- Se a Assinatura tem 2 pães, o card "Cesta da Semana" lista os 2
- Se houver Swap em 1 dos 2, mostra qual foi trocado e qual continua

**Cenário 6 — Toast de confirmação:**
- Ao confirmar extras, toast "Cesta confirmada!" (não "Pedido confirmado!")

---

## O que NÃO mudar

- Estrutura geral do `App.jsx` e componentes
- Tela Assinatura (separada, não é afetada por esses ajustes)
- Tela Perfil fora dos ajustes de copy no histórico
- Fluxo de cutoff
- Limite de 3 pães na Assinatura
- Mensagem de cuidado a partir do 4º extra no Cardápio

---

## Prompt sugerido pro Claude Code

```
No cora-portal, branch atual (pós primeiro briefing de ajustes), aplicar os 
refinamentos da Cesta da Semana conforme CORA_Briefing_Refinamento_Cesta.md.

Criar branch ajustes/cesta-unificada a partir da atual.

4 ajustes:
1. Unificar cards "Sua Cesta desta Semana" e "Seu Pedido desta Semana" em um único 
   "CESTA DA SEMANA" com 4 estados (padrão / swap / extra / swap+extra).
2. Modal de personalização: título "PERSONALIZAR CESTA DA SEMANA" (sem "desta"), 
   remover "Slot 1" em inglês, usar "Pão 1" em português, omitir label se só 1 pão.
3. Cardápio: remover mensagem "Este pão já faz parte da sua cesta" do Pão Original.
4. Varrer copy e trocar "pedido" por "cesta" em todos os lugares visíveis.

Atenção: mudança conceitual importante. Não é mais "Assinatura + Pedido separado". 
Tudo é "Cesta da Semana" que engloba o que vai chegar (Assinatura + Swap + Extras).

Validar pelos 6 cenários no briefing. Rodar npm run dev e me avisar.
```

---

*Briefing · Refinamento Cesta da Semana · Abril 2026*
