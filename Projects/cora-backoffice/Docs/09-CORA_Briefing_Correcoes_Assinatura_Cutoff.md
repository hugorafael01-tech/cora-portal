# Briefing Claude Code — Correções Assinatura + Cutoff + Status da Semana

*Bugs identificados em teste pós-merge do refinamento da Cesta. Abril 2026, terça 21/04.*

**Repositório:** `cora-portal`
**Branch sugerida:** `correcoes/assinatura-e-cutoff` (a partir da main atualizada)
**Escopo:** 3 correções pontuais. Sem mudanças estruturais. Todo o trabalho é lógica de cálculo, adição de estado no mock e novo componente de banner.

---

## Contexto

Após a execução do briefing de refinamento da Cesta, 3 bugs foram identificados em teste:

1. Tela Assinatura calcula valor usando preço avulso (R$ 27/R$ 29 dos pães) em vez de R$ 99 flat × quantidade
2. Pós-cutoff, Home não informa ao cliente por que o sistema está inativo
3. Cliente fica sem saber quando os pedidos da próxima semana abrirão

Todos os 3 bugs tocam a lógica de "o que está disponível esta semana" — daí agrupar num briefing só.

---

## Correção 1 — Valor da Assinatura

### Problema atual

Na tela Assinatura, editando composição: cliente muda de 1 Original (R$ 99/mês) pra 1 Integral. Sistema mostra "R$ 116/mês". Cálculo atual usa `qtds[i] * D.pães[i].precoNum * 4` (preço avulso × 4 semanas).

### Regra correta

```
Valor da Assinatura = R$ 99 × quantidade de pães (qtdPaes)
```

Independente do produto escolhido. Swap Original ↔ Integral é neutro. Diferença de custo não afeta o cliente.

### Exemplos

| Configuração | Valor |
|---|---|
| 1 pão (qualquer combinação) | R$ 99 |
| 2 pães (qualquer combinação) | R$ 198 |
| 3 pães (qualquer combinação) | R$ 297 |

### Implementação

No componente `Assinatura`, substituir a lógica de cálculo:

```javascript
// ANTES (usa preço avulso de cada pão)
const mensal = D.pães.reduce((s, p, i) => s + qtds[i] * p.precoNum * 4, 0);

// DEPOIS (flat × quantidade)
const totalPaes = qtds.reduce((s, q) => s + q, 0);
const mensal = 99 * totalPaes;
```

**Observação:** A constante 99 vem de `D.assinatura.valorMensal` (já existe no mock). Usar essa referência em vez de hardcode.

### Removendo preço avulso da tela Assinatura

Hoje cada linha de pão na edição mostra "R$ 27,00/un", "R$ 29,00/un", etc. Isso **não deve aparecer** na tela Assinatura — preço por unidade é conceito de Cardápio, não de Assinatura.

Remover a linha de preço abaixo do nome do pão na lista de edição. Manter só: nome, peso, controles de quantidade.

**Antes:**
```
[foto] Pão Original (615g)
       R$ 27,00/un              ← remover
                                 [− 0 +]
```

**Depois:**
```
[foto] Pão Original (615g)      [− 0 +]
```

### Textos que dependem do cálculo

Garantir que todos esses refletem R$ 99 × quantidade:

- "Novo valor mensal: **R$ 198,00**" (quando cliente escolhe 2 pães)
- "Antes: R$ 99,00 → Depois: R$ 198,00"
- "Ajuste neste mês: +R$ 99,00" (se passou de 1 pra 2 pães com 2 semanas restantes: diferença semanal de R$ 99/4 = R$ 24,75 × 2 = R$ 49,50)

**Revisar a lógica da cobrança proporcional** no componente `Assinatura` (variável `prop`): o cálculo atual `(mensal - orig) / 4 * semanasRestantes` continua válido, mas `mensal` e `orig` precisam usar a nova fórmula.

---

## Correção 2 — Banner de status da Home

### Problema atual

Pós-cutoff (terça 12h já passou), botões "Personalizar" e "Pedir" ficam desabilitados silenciosamente. Cliente não entende por quê.

### Proposta

Banner no topo da Home, abaixo do header, antes do card da Cesta. Dois estados:

**Estado A — Pedidos da semana atual fechados, próxima não aberta ainda:**

```
⏸ Pedidos desta semana fechados.
Os pedidos da próxima semana abrirão em breve.
```

**Estado B — Pedidos da próxima semana abertos:**

```
📅 Pedidos da próxima semana já estão abertos.
Cardápio: Pão Original, Pão Integral e Focaccia Genovesa (novidade da semana).
```

Visual: card warm-50 com borda warm-200, texto warm-700, padding 12px. Ícone opcional lucide-react.

### Lógica de decisão

```javascript
const cutoff = isPastCutoff();              // boolean — cutoff já passou?
const proximaSemanaAberta = D.semana.pedidosAbertos;  // flag no mock

if (cutoff && !proximaSemanaAberta) {
  // Estado A
} else if (cutoff && proximaSemanaAberta) {
  // Estado B — mostrar banner "próxima semana aberta"
  // IMPORTANTE: botões de edição da Home continuam desabilitados
  // (a edição da próxima semana só acontece quando o sistema de semanas
  // futuras for implementado — fora do escopo deste briefing)
}
// Se cutoff não passou: sem banner.
```

**Importante:** mesmo no estado B, botões de "Personalizar" da Cesta **continuam desabilitados**. O banner é informativo, não habilita edição. A edição da próxima semana virá num briefing futuro (não faz parte deste escopo).

---

## Correção 3 — Mock D.semana

### Adição no objeto D

No topo do `App.jsx`, adicionar ao objeto `D`:

```javascript
D.semana = {
  pedidosAbertos: false,  // Hugo alterna manualmente até backoffice existir
  cardapioProxima: [
    "Pão Original",
    "Pão Integral",
    "Focaccia Genovesa"
  ],
  entregaProxima: "Quinta, 30 de abril"
};
```

**Significado:**
- `pedidosAbertos`: alternância manual. `false` por padrão. Hugo muda pra `true` no código quando quiser simular "publiquei o Cardápio no backoffice".
- `cardapioProxima`: array de strings dos produtos que vão aparecer no Cardápio da próxima semana. Usado no banner estado B. Inclui base (Original, Integral) + novidade (varia entre Focaccia, Ciabatta, Brioche, Multigrãos).
- `entregaProxima`: data da próxima entrega (informativa).

### Uso no banner

No estado B, o texto é gerado dinamicamente:

```javascript
const produtos = D.semana.cardapioProxima.join(", ").replace(/, ([^,]+)$/, " e $1");
// "Pão Original, Pão Integral e Focaccia Genovesa"

const texto = `Pedidos da próxima semana já estão abertos.
Cardápio: ${produtos} (novidade da semana).`;
```

**Detalhe:** só a novidade (último item do array) deve ter o sufixo "(novidade da semana)". Os pães fixos não.

---

## Validação

### Cenário V1 — Valor da Assinatura correto

- Estado: cliente tem 1 Original (R$ 99)
- Ação: vai em Assinatura, "Alterar minha assinatura", muda pra 1 Integral
- **Esperado:** "Novo valor mensal: R$ 99,00" (mesmo valor, apenas troca de produto)
- Ação 2: adiciona +1 Original (total 2 pães)
- **Esperado:** "Novo valor mensal: R$ 198,00"
- Ação 3: muda pra 3 Integrais
- **Esperado:** "Novo valor mensal: R$ 297,00"

### Cenário V2 — Sem preço avulso na tela Assinatura

- Abre Assinatura → clica em "Alterar minha assinatura"
- **Esperado:** lista de pães mostra só nome e peso. Sem "R$ 27,00/un", "R$ 29,00/un", etc.

### Cenário V3 — Banner estado A (pós-cutoff, próxima fechada)

- Simula pós-cutoff (ou ajusta hora do sistema pra depois de terça 12h)
- Mantém `D.semana.pedidosAbertos = false`
- **Esperado na Home:** banner warm-50 no topo dizendo "Pedidos desta semana fechados. Os pedidos da próxima semana abrirão em breve."
- Botões "Personalizar" e "Pedir" desabilitados (comportamento existente mantido)

### Cenário V4 — Banner estado B (pós-cutoff, próxima aberta)

- Pós-cutoff
- Muda `D.semana.pedidosAbertos = true` no mock
- **Esperado na Home:** banner warm-50 com texto "Pedidos da próxima semana já estão abertos. Cardápio: Pão Original, Pão Integral e Focaccia Genovesa (novidade da semana)."
- Botões continuam desabilitados (edição da próxima semana é feature futura)

### Cenário V5 — Antes do cutoff (sem banner)

- Antes de terça 12h (cutoff não passou)
- **Esperado:** nenhum banner aparece. Home comporta-se normalmente.

---

## O que NÃO mudar

- Nenhum componente além de `Assinatura` e da parte superior da `Home` (onde vai o banner)
- Lógica de Swap (refinamento anterior já aplicado)
- Lógica de Extras no Cardápio
- Fluxo de cutoff em si (`isPastCutoff()` já corrigido em task separada 86e10nbez)
- Tela Cardápio, tela Perfil
- Cobrança mensal agregada

---

## Prompt pra colar no Claude Code

```
No cora-portal, aplicar correções conforme CORA_Briefing_Correcoes_Assinatura_Cutoff.md
(salvo em docs/ antes de executar).

Criar branch correcoes/assinatura-e-cutoff a partir da main atualizada.

3 correções:

1. Valor da Assinatura = R$ 99 × qtdPaes (flat, independente do produto).
   Remover cálculo atual que usa precoNum de cada pão. Remover também 
   "R$ X/un" da lista de edição da Assinatura.

2. Banner de status na Home com 2 estados (pré-cutoff = sem banner, 
   pós-cutoff com próxima semana fechada ou aberta = banner informativo).

3. Adicionar D.semana no mock com pedidosAbertos, cardapioProxima, 
   entregaProxima.

Validar pelos 5 cenários do briefing. Rodar npm run dev e me avisar.
```

---

## Observação sobre preço da Assinatura

A decisão de usar R$ 99 × qtdPaes independente do produto é provisória do MVP. A discussão sobre cobrar diferença por produto (Original vs Integral custo diferente) foi registrada como ponto em aberto na task 86e1007cv (Unit Economics), pra conversa dedicada.

---

*Briefing · Correções Assinatura + Cutoff + Status · Abril 2026*
