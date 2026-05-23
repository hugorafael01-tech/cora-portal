# Atualização do portal pós-decisões financeiras (abr/2026)

Decisões tomadas em sessão dedicada de Bloco A + B + C (modelo de negócio, preço, investimento).
Documento completo: `CORA_Decisoes_Financeiras_v1.md`. Planilha: `CORA_FINANCE_v2.xlsx`.

Este documento lista apenas o que impacta o portal.

---

## Impactos estruturais (precisam de implementação)

### 1. Pesos atualizados — Original e Integral

- **Original:** 615g → **700g**
- **Integral:** 615g → **700g**

Onde aparece peso no app: Cardápio (cards de produto), onboarding (Tela 2 de seleção da cesta), Perfil. Atualizar todas as referências.

CMV interno (não exposto ao cliente, só pra Backoffice/Finance):
- Original: R$ 5,53/un
- Integral: R$ 6,38/un

### 2. Cálculo de "valor mensal estimado" — fórmula simplificada

Decidido modelo linear: **R$ 99 × qtd de pães + R$ 15 frete** (frete universal).

A spec do Adendo v3.1 sugeria cálculo variável com soma de itens. Substituir pela fórmula linear simples.

**Onde aplica:**
- Card "Sua Assinatura" (Tela Assinatura) — mostra `R$ 99 × N pães + R$ 15 = R$ X/mês`
- Preview de delta ao editar quantidade na Cesta — mostra novo total já no formato `R$ X/mês`

### 3. Diferenciar visualmente aumento vs redução

Hoje a spec não diferencia. Precisa.

**Aumento de assinatura** (imediato proporcional):
> "Essa mudança vale a partir desta semana. Valor proporcional ajustado na próxima fatura."

**Redução de assinatura** (próximo ciclo):
> "Essa redução vale a partir de [data do próximo ciclo]."

Pode ser tooltip, pode ser texto fixo abaixo do botão de confirmação. Importante o cliente entender o efeito antes de confirmar.

### 4. Lista de espera (gatilho 40 subs)

**Funcionalidade nova.** Não existe no portal hoje.

Quando subs ativos = 40, novo cadastro vai pra fila em vez de virar cliente direto:

- Tela de captura: nome + email + telefone + condomínio (se houver)
- Confirmação: "Você está na posição N. Avisaremos por WhatsApp quando abrirmos vagas."
- Mecanismo de saída: quando expansão Fase 1 acontecer (gatilho de 60 confirmados na lista), Hugo manda push e converte em ondas

Isso é fluxo separado do cadastro normal. Pode reaproveitar componentes do pré-cadastro `/interesse`, mas com lógica diferente: lista de espera é qualificada (já passou por considerar o produto), não é interesse aberto.

---

## Ajustes de posicionamento e copy (mais leves, mas importantes)

### 5. "Clube" como conceito ativo

Especiais NÃO são "produtos extras à venda". São **acesso de assinante a curadoria semanal**.

Reescrever copy do Cardápio:

| Antes (genérico) | Depois (Clube) |
|---|---|
| "Cardápio" | "Esta semana no Clube" / "O que tem no Clube esta semana" |
| "Adicione à sua cesta" | "Garanta na sua cesta" |
| "Brioche — R$ 32" | "Brioche · preço de assinante R$ 32" (ou equivalente que diga "você é da casa") |
| "Produto extra" | "Especial da semana" |

A regra: comunicar **privilégio de assinante**, não venda. Cliente não está comprando — está acessando.

### 6. Escassez real visível no card

Cada especial precisa mostrar disponibilidade em tempo real:

> "8 de 12 disponíveis"

Quando esgota:
> "Esgotado · entrar na fila do próximo lote"

Isso é elemento de UI novo no card de produto, mas leve de implementar (campo `unidades_disponiveis` + `unidades_totais` por especial da semana). Backoffice precisa permitir Hugo cadastrar o teto da semana.

### 7. Eliminar qualquer menção a "avulso" ou "compra fora da assinatura"

**Princípio:** no portal, **só existe assinatura.** A única forma de comprar pão Cora é assinando.

Verificar e remover do app qualquer copy tipo:
- "Comprar avulso"
- "Preço avulso"
- "Compra única"

Os preços avulsos definidos (R$ 30 Original, R$ 32 Integral, R$ 32 Multigrãos, R$ 22 Focaccia, R$ 32 Brioche, R$ 25 Ciabatta) são **referência operacional interna** — usados nos extras da cesta de assinante, comunicados como "preço de assinante" ou simplesmente "R$ X" sem qualificação.

---

## O que NÃO muda

Sem impacto estrutural ou de copy:
- Estrutura de telas (Home / Assinatura / Cardápio / Perfil)
- Onboarding em 3 telas + welcome
- Cutoff terça 12h
- Frete R$ 15 fixo (universal — gratuidade em condomínio descartada em 22/mai/2026)
- Máquina de estados da assinatura
- Lógica de pausa
- Modelo de cobrança via Asaas

---

## Prioridade sugerida

**Alta — antes do lançamento ago/26:**
- (1) Pesos atualizados
- (2) Fórmula linear de valor mensal
- (3) Diferenciação visual aumento vs redução
- (5) Copy do Clube no Cardápio
- (7) Eliminar "avulso"

**Média — pode entrar até out/26 (gatilho da lista):**
- (4) Lista de espera
- (6) Escassez visível nos cards (depende do Backoffice ter campo de teto)

---

*Anotação para integração no PORTAL_STATUS.md · 30/04/2026*
