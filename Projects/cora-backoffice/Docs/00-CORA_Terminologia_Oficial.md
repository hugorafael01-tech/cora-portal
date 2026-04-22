# Cora — Terminologia Oficial

*Glossário autoritativo. Fonte de verdade pra qualquer spec, código ou comunicação da Cora.*

**Criado em:** 20/abr/2026
**Status:** definitivo. Mudanças exigem revisão explícita do Hugo.

---

## Por que este documento existe

Durante a construção do backoffice, a ausência de glossário consolidado gerou confusão entre:
- Linguagem técnica (schema, código)
- Linguagem do assinante (portal)
- Linguagem operacional (Hugo no dia a dia)

Este documento fixa os termos. Qualquer futuro spec, tela ou conversa que contradiga o que está aqui deve ser corrigido — não o contrário.

---

## Termos fundamentais

### Assinatura

**O que é:** o vínculo comercial entre o cliente e a Cora. Representa o compromisso recorrente: "quero receber X pães toda semana".

**Como aparece no portal:** "Minha Assinatura".

**Como o cliente configura:**
- Escolhe **1 a 3 pães** que vai receber toda semana
- Pode **repetir ou misturar** produtos (ex: "2 Originais", "1 Original + 1 Integral", "3 Integrais")
- No MVP, opções disponíveis: Original e Integral
- Pode editar a Assinatura a qualquer momento, dentro dos produtos disponíveis

**O que a Assinatura NÃO é:**
- Não é um "plano" nomeado (cliente não vê "Plano Clássicos" ou "Plano Base")
- Não é o que será entregue numa semana específica (isso é a Cesta)

---

### Base (da Assinatura)

**O que é:** a composição fixa de produtos que o cliente definiu na Assinatura. É a configuração default que se repete toda semana se o cliente não fizer nada.

**Exemplo:**
- Assinatura configurada com 2 pães: "1 Original + 1 Integral"
- **Base = 1 Original + 1 Integral**
- Toda semana, a Cesta começa com essa Base

**Uso:**
- É linguagem interna/técnica, não vocabulário do assinante
- O assinante só interage com o conceito quando configura a Assinatura
- No portal, pode aparecer como "sua cesta padrão" ou similar — nunca como "base"

---

### Cesta (da Semana)

**O que é:** o que será entregue naquela quinta-feira específica.

**Como funciona:**
1. Por padrão, Cesta = Base da Assinatura
2. Cliente pode **modificar a Cesta** com base no Cardápio da semana
3. Até o cutoff (terça 12h), tudo editável. Depois disso, congelada

**Modificações possíveis:**
- **Swap 1:1** entre produtos da Assinatura (trocar Original por Integral, ou vice-versa): sem custo extra
- **Adição de extras** do Cardápio: cobrado separado

**Como aparece no portal:** "Sua cesta desta semana" / "Cesta da semana".

---

### Cardápio

**O que é:** a lista de produtos disponíveis para adição à Cesta numa semana específica.

**Como funciona:**
- Cada semana o Hugo define o Cardápio no backoffice (módulo Planejamento)
- Pode incluir produtos recorrentes (os da Assinatura) e produtos especiais (Focaccia, Brioche, Ciabatta, Multigrãos, etc.)
- Cada produto no Cardápio tem preço avulso

**Como aparece no portal:** "Cardápio" (tela dedicada na navegação principal).

---

### Swap

**O que é:** troca 1:1 entre produtos da Assinatura numa semana específica.

**Regras:**
- **É permitido** trocar 1 Original por 1 Integral (ou vice-versa) na Cesta da semana
- **Custo:** zero — é troca neutra
- Não afeta a configuração da Assinatura (é só naquela semana)
- Só vale para produtos que fazem parte da Assinatura do cliente

**Exemplo:**
- Assinatura: 2 Originais
- Cesta da semana: cliente faz swap e pede 1 Original + 1 Integral
- Custo adicional: R$ 0

---

### Extra

**O que é:** adição à Cesta de produto do Cardápio da semana que **não faz parte** da Assinatura.

**Como funciona:**
- Tem preço avulso definido (coluna `retail_price` em `products`)
- Soma ao valor mensal da assinatura na próxima fatura
- Exemplo: cliente com Assinatura "1 Original" adiciona 1 Focaccia na Cesta da semana = paga R$ 22 a mais na fatura do mês

---

### Cutoff (prazo de edição)

**O que é:** o limite de horário pra editar a Cesta de uma semana.

**Valor atual:** **terça-feira, 12h** (janela de ~48h antes da entrega na quinta).

**Comportamento:**
- Antes do cutoff: Cesta e Assinatura totalmente editáveis
- Depois do cutoff: Cesta congelada. Edições valem a partir da semana seguinte.

---

## Termos de produção e operação

### Receita

**O que é:** ficha técnica de um produto fabricado — ingredientes, proporções, passos.

**Características:**
- Tem versões (v1, v2...) pra rastrear ajustes
- Uma versão está sempre ativa
- Versões antigas ficam arquivadas pra histórico

### Produção

**O que é:** execução de uma receita numa semana específica. Tem ficha diagnóstica, passos registrados, resultado medido.

### Produto

**O que é:** item vendável da Cora. No MVP todos são "fabricados" (produzidos pela Cora). Futuramente pode ter "revenda" (produtos de terceiros no empório).

---

## Termos do backoffice

### Planejamento

**O que é:** módulo do backoffice onde o Hugo define o Cardápio da semana.

### Semana (módulo Semana)

**O que é:** dashboard do backoffice com visão operacional da semana corrente — pedidos, produção, expedição.

### Expedição

**O que é:** módulo do backoffice pra processar as entregas da quinta — lista, etiquetas, status manual.

---

## Valores e preços

### Valor da Assinatura

**Fórmula:** R$ 99 × número de pães na Base

**Exemplos:**
- 1 pão: R$ 99/mês
- 2 pães: R$ 198/mês
- 3 pães: R$ 297/mês

### Frete

**Valor:** R$ 15 fixo/mês, independente do número de pães.

### Cobrança mensal

**Valor da fatura = Valor da Assinatura + Frete + Soma dos Extras do mês**

**Exemplo:**
- Assinatura: 2 pães → R$ 198
- Frete: R$ 15
- Extras no mês: 1 Focaccia (R$ 22) + 1 Brioche (R$ 32) = R$ 54
- **Total da fatura: R$ 267**

### 5ª semana

**Política:** em meses com 5 quintas-feiras de entrega, o 5º pão entregue é cortesia. Cliente paga 4 semanas, recebe 5.

---

## Glossário rápido (tabela de referência)

| Termo | Uso técnico (schema) | Uso no portal | Uso operacional |
|---|---|---|---|
| Assinatura | `subscriptions` | "Minha Assinatura" | "Assinatura do cliente" |
| Base | `subscription_items` | "Sua cesta padrão" | "Base da assinatura" |
| Cesta | `orders` + `order_items` | "Cesta da semana" | "Cesta de [cliente]" |
| Cardápio | `cardapios` (tabela) | "Cardápio" | "Cardápio da semana" |
| Swap | — (aplicação) | "Trocar" | "Swap" |
| Extra | `order_items.role_in_order = extra` | "Adicionar" | "Extra do [cliente]" |
| Cutoff | `weeks.cutoff_at` | "até terça 12h" | "Corte de terça" |

---

## Regras de uso

1. **Nunca misturar linguagens.** O cliente nunca vê "base", "cutoff", "extra" como termos técnicos. Ele vê "cesta padrão", "até terça 12h", "adicionar".
2. **Nunca nomear "plano" no portal do MVP.** Cliente vê "Minha Assinatura", não "Plano Base" ou "Plano Clássicos".
3. **Swap é sempre neutro.** Entre produtos da Assinatura, troca 1:1 não cobra nada.
4. **Extra é sempre adição.** Produto fora da Assinatura entra como linha separada na fatura.
5. **Cutoff é terça 12h.** Não negociar por cliente individual.

---

*Documento de referência · Terminologia Cora · Abril 2026*
