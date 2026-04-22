# Briefing Claude Code — Ajustes Pontuais no App.jsx (cora-portal)

*Ajustes consolidados de terminologia, dados e UX no portal do assinante. Abril 2026.*

**Repositório:** `cora-portal` (já existe)
**Branch sugerida:** `ajustes/terminologia-e-swap`
**Stack:** Vite + React, design system Cora v1 (já aplicado)
**Escopo:** sem componentes novos, sem mudanças estruturais. Substituições de texto, atualização de dados mockados, e uma adição funcional (Swap na Cesta da Semana via card da Home).

---

## Antes de começar

**Deletar protótipo descartado:**

```bash
cd cora-portal
git checkout main
rm src/pages/SubscriptionConfig.tsx
git branch -D prototype/subscription-config
git push origin --delete prototype/subscription-config
```

E remover do `App.jsx`:

```javascript
// REMOVER essas duas linhas
import SubscriptionConfig from "./pages/SubscriptionConfig";
if (window.location.pathname === "/prototipo/assinatura") return <SubscriptionConfig />;
```

---

## Bloco 1 — Atualização de dados mockados

Atualizar o objeto `D` no início do `App.jsx`:

### 1.1 Renomear `D.cesta` → `D.assinatura`

A "cesta" do objeto era na verdade a configuração da Assinatura. Renomear pra eliminar ambiguidade.

```javascript
// ANTES
D.cesta = {nome:"Assinatura Cora", itens:"1 Pão Original (580g) / semana", valor:"R$ 98,00/mês"}

// DEPOIS
D.assinatura = {
  itens: "1 Pão Original (615g) / semana",
  valorMensal: 99,    // valor por pão; o componente calcula × total de pães
  qtdPaes: 1,         // quantidade de pães na Base
}
```

Atualizar todas as referências a `D.cesta` no código pra `D.assinatura`. O valor exibido vira `R$ ${D.assinatura.valorMensal * D.assinatura.qtdPaes},00/mês`.

### 1.2 Atualizar pesos e preços em `D.pães`

```javascript
D.pães = [
  {id:"original",   nome:"Pão Original",  peso:"615g", preco:"R$ 27,00", precoNum:27, ...},
  {id:"integral",   nome:"Pão Integral",  peso:"615g", preco:"R$ 29,00", precoNum:29, ...},
  // remover Multi Grãos e Brioche daqui — viram rotativos (ver bloco 3)
]
```

**Importante:** `D.pães` agora só tem os 2 produtos elegíveis pra Assinatura (Original e Integral). Outros pães vêm via Cardápio como rotativos.

### 1.3 Atualizar `D.extras`

A Focaccia continua, mas com peso e preço corretos:

```javascript
D.extras = [
  {
    id: "focaccia",
    nome: "Focaccia Genovesa",
    peso: "430g",       // antes 400g
    preco: "R$ 22,00",  // mantém
    precoNum: 22,
    img: IMG.focaccia,
    ingredientes: "Farinha, água, azeite extra-virgem, sal, levain, cebola roxa, alecrim fresco.",
    historia: "..."
  }
]
```

### 1.4 Atualizar `D.entrega.produto`

```javascript
D.entrega = {
  dia: "Quinta, 23 de abril",
  produto: "1 Pão Original (615g)"   // antes 580g
}
```

### 1.5 Atualizar `D.cob` (cobrança)

```javascript
D.cob = {mes:"Março", valor:"R$ 99,00", status:"Pago"}   // antes 98
```

---

## Bloco 2 — Ajustes terminológicos (textos visíveis)

### 2.1 Componente `Assinatura`

**Título do card:** "MINHA CESTA" → **"MINHA ASSINATURA"**

**Estrutura interna do card** (substituir o que mostra hoje):

```
MINHA ASSINATURA
1 Pão Original (615g) / semana
R$ 99,00/mês
[Alterar minha assinatura]
```

Onde:
- "1 Pão Original (615g) / semana" → vem de `D.assinatura.itens` (atualiza dinamicamente quando cliente edita)
- "R$ 99,00/mês" → calculado: `R$ ${valorMensal * qtdPaes},00/mês`
- Botão: "Alterar minha cesta" → **"Alterar minha assinatura"**

### 2.2 Renomear "Multi Grãos" → "Multigrãos"

Termo único definido em ficha. Trocar em todos os lugares (D.pães, D.hist, descrições).

### 2.3 Texto do componente `Assinatura` no topo

Hoje: "Toda semana você recebe pão fresco na porta da sua casa. O valor da assinatura é fixo — e em meses com 5 semanas, o pão extra é por nossa conta."

**Atenção crítica:** o texto contém um em-dash (—) que viola a regra de marca da Cora. Substituir:

> "Toda semana você recebe pão fresco na porta da sua casa. O valor da assinatura é fixo. Em meses com 5 semanas, o pão extra é por nossa conta."

### 2.4 Card "Novidade da Semana" no Cardápio

**Remover** o texto "— Só assinantes" na linha do preço. É redundante (todo mundo no portal é assinante).

```
ANTES: "R$ 22,00 — Só assinantes"
DEPOIS: "R$ 22,00"
```

---

## Bloco 3 — Mudança de lógica no Cardápio

Hoje o componente `Cardapio` lista todos os pães em `D.pães` (Original, Integral, Multi Grãos, Brioche).

**Nova lógica:**
- **Cardápio mostra apenas:** Novidade da Semana + 2 pães da Assinatura (Original e Integral)
- "Novidade da Semana" rotaciona entre 4 produtos: Multigrãos, Focaccia Genovesa, Ciabatta, Brioche
- Hugo define no backoffice qual é a Novidade. No mock, ela vem de `D.extras[0]`

**Adicionar lista nova `D.rotativos`** (banco de produtos que podem aparecer como Novidade):

```javascript
D.rotativos = [
  {id:"multigraos", nome:"Multigrãos",     peso:"615g", preco:"R$ 32,00", precoNum:32, img:IMG.multigraos, desc:"...", ingredientes:"..."},
  {id:"focaccia",   nome:"Focaccia Genovesa", peso:"430g", preco:"R$ 22,00", precoNum:22, img:IMG.focaccia, desc:"...", ingredientes:"..."},
  {id:"ciabatta",   nome:"Ciabatta",       peso:"533g", preco:"R$ 25,00", precoNum:25, img:IMG.ciabatta, desc:"...", ingredientes:"..."},
  {id:"brioche",    nome:"Brioche",        peso:"256g", preco:"R$ 32,00", precoNum:32, img:IMG.brioche, desc:"...", ingredientes:"..."},
]
```

**Imagens necessárias:**
- `IMG.ciabatta` precisa ser adicionada no objeto IMG. A imagem `_ciabatta.jpg` já existe em `/public/images/` (foi gerada para o pre-cadastro). Reutilizar.

**No componente `Cardapio`:**
- Remover loop sobre `D.pães`
- Renderizar: 1 card de Novidade da Semana (vem de `D.extras[0]`) + 2 cards dos pães da Assinatura (Original e Integral)
- Manter o behavior de adicionar Extra ao tocar em "Pedir" (cobrança avulsa)

**Critério importante:** os 2 pães da Assinatura (Original e Integral) aparecem no Cardápio com botão "Pedir" — clicar adiciona como **Extra pago**, mesmo sendo o mesmo produto da Assinatura. Isso é por design: quem entra no Cardápio está adicionando, não trocando.

Diferenciar visualmente: card do pão que já está na Assinatura mostra label discreto:
```
Pão Original (615g)
Este pão já faz parte da sua cesta
R$ 27,00/un
[Pedir]
```

(Já existe uma variação parecida no código atual, manter a copy.)

---

## Bloco 4 — Implementar Swap na Cesta da Semana (Home)

Esta é a única adição funcional do briefing. Nada de tela nova — só uma interação no card que já existe.

### 4.1 Card "Sua Cesta desta Semana" na Home

Hoje o card é meramente informativo:
```
SUA CESTA DESTA SEMANA
Quinta, 23 de abril
1 Pão Original (615g)
```

Adicionar **link "Personalizar"** no canto superior direito:

```
SUA CESTA DESTA SEMANA          [Personalizar ›]
Quinta, 23 de abril
1 Pão Original (615g)
```

### 4.2 Tocar em "Personalizar" → expande/abre modal

**Recomendação técnica:** modal bottom-sheet (mesmo padrão do Modal de produto que já existe no app). Reutilizar componente `Modal`.

Conteúdo do modal:

```
PERSONALIZAR CESTA DESTA SEMANA
─────────────────────────────────────
Sua Assinatura tem 1 pão. Você pode trocar por outro produto da Cora elegível pra Assinatura.

Slot 1: 
  ○ Pão Original (615g)   [selecionado]
  ○ Pão Integral (615g)

Aplicar só nesta semana. Sua Assinatura volta ao normal na próxima.

[Confirmar troca]   [Cancelar]
```

Quando cliente confirma:
- Estado da Cesta da semana atualiza pra refletir a nova composição
- Card da Home muda pra mostrar o que foi trocado
- Toast: "Cesta atualizada. Sua Assinatura segue como antes na próxima semana."

### 4.3 Estado visual após Swap

Card da Home com badge discreto:

```
SUA CESTA DESTA SEMANA          [editado · só desta semana]
Quinta, 23 de abril
1 Pão Integral (615g)           ← trocado, foi feito Swap

A próxima semana volta ao normal: 1 Pão Original.
```

### 4.4 Lógica do Swap (sem custo)

**Importante:** Swap é **neutro de custo**. Trocar 1 Original por 1 Integral nesta semana não cobra os R$ 2 de diferença.

No estado da Cesta (atualmente o array `confirmed`), itens precisam de tipo:

```javascript
// ANTES (sem distinção)
confirmed = [{nome:"Pão Integral", preco:"R$ 29,00", precoNum:29}]

// DEPOIS (com tipo)
cesta = {
  base: [{produto:"pao-integral", swap_de:"pao-original"}],   // swap, custo 0
  extras: [{produto:"focaccia", precoNum:22}]                  // extra, cobrança
}
```

**Para o MVP**, simplificar: criar campo `kind` no item:

```javascript
cesta = [
  {nome:"Pão Integral", precoNum:0, kind:"swap"},      // veio da Assinatura via swap
  {nome:"Focaccia",     precoNum:22, kind:"extra"}     // adicionado do Cardápio
]
```

**Cálculo do total de extras** ignora `kind:"swap"`:
```javascript
const totalExtras = cesta.filter(i => i.kind === "extra").reduce((s,i) => s + i.precoNum, 0);
```

### 4.6 Limite de Extras no Cardápio (mudança de regra)

**Contexto:** hoje o portal limita o cliente a 3 produtos no Cardápio (em linha com o limite de 3 pães da Assinatura). Esse bloqueio rígido é confuso pro cliente — não fica claro por que ele não pode comprar mais.

**Nova regra (versão 1, este briefing):**
- **Sem bloqueio rígido** de quantidade no Cardápio. Cliente pode adicionar quantos extras quiser.
- A partir do **4º item** somado, exibir mensagem informativa (não bloqueante):

```
⚠ Você tem 4 itens nesta semana.

Pedidos acima de 3 itens podem ter prioridade reduzida caso 
atinjamos o limite de produção da semana. Se isso acontecer, 
te avisaremos pelo WhatsApp e você não será cobrado.
```

- Mensagem aparece como caption discreto no rodapé do Cardápio (logo acima do botão "Confirmar"), e também dentro do `OrderFooter` quando ele exibir o resumo.
- Cliente continua adicionando livremente. Sem bloqueio nem limite máximo.

**Atenção:** o limite de 3 pães na **Assinatura** (Base) **continua válido**. Esse limite só some no Cardápio (Extras pontuais).

**Por que essa diferença:**
- Assinatura é compromisso de produção semanal × 4 semanas/mês. Aumentar reformula a operação.
- Extras são pontuais. Hugo decide manualmente se aceita case by case (rotina de segunda de manhã).

**Quem decide se aceita o pedido extra:** decisão fora do escopo deste briefing. No MVP, Hugo verifica manualmente os extras na segunda de manhã e ajusta produção. No futuro, sistema pode automatizar.

### 4.5 Caso limite: Swap + Extra do mesmo produto

Cenário: cliente fez Swap pra Pão Integral. Depois entra no Cardápio e adiciona "+1 Pão Integral".

**Comportamento:** Cesta fica com 2 Pães Integrais:
- 1× Pão Integral (Swap, R$ 0)
- 1× Pão Integral (Extra, R$ 29)

Visualmente no resumo da Cesta (Home + Perfil):
```
Sua Cesta desta semana:
  • 1 Pão Integral (parte da assinatura)
  • 1 Pão Integral (extra · R$ 29)
```

---

## Bloco 5 — Refletir Cesta editada em outras telas

A Cesta personalizada via Swap precisa aparecer corretamente em:

### 5.1 Home

Card "Sua Cesta desta Semana": mostra a nova composição.

### 5.2 Perfil (histórico de cobranças)

Linha "Esta semana" precisa diferenciar swap de extra:
```
Esta semana                                     [Confirmado]
1 Pão Integral (615g) — assinatura via swap
+ 1 Focaccia Genovesa — R$ 22,00 (extra)
Total extras: R$ 22,00
```

### 5.3 Próxima fatura (Perfil)

Estimativa de fatura ignora swap (R$ 0) e soma só extras:
```
Assinatura: R$ 99,00
+ Extras: R$ 22,00
+ Frete: R$ 15,00
= R$ 136,00 (estimado)
```

---

## Bloco 6 — Validação e teste local

Após rodar `npm run dev`, validar manualmente:

**Cenário 1 — Estado inicial limpo:**
- Home mostra "Sua Cesta desta Semana: 1 Pão Original (615g)"
- Assinatura mostra "Minha Assinatura: 1 Pão Original (615g) / semana, R$ 99,00/mês"
- Cardápio mostra: 1 Novidade (Focaccia) + 2 pães da Assinatura (Original + Integral)

**Cenário 2 — Swap:**
- Toca "Personalizar" no card da Home
- Troca Original → Integral
- Confirma
- Home atualiza pra "1 Pão Integral (615g)" com badge "editado · só desta semana"
- Vai pra Assinatura: ainda mostra Original (não foi alterado)

**Cenário 3 — Extra:**
- Vai pro Cardápio
- Adiciona Focaccia
- Resumo aparece no rodapé: "1 item — extras desta semana — R$ 22"
- Confirma
- Home agora mostra a Cesta com Original + Focaccia

**Cenário 4 — Swap + Extra do mesmo produto:**
- Faz Swap Original → Integral
- Vai pro Cardápio, adiciona +1 Pão Integral
- Resumo: Cesta com 2 Integrais (1 swap + 1 extra)
- Próxima fatura estimada: Assinatura + R$ 29 do extra + frete

**Cenário 5 — Edição pós-cutoff:**
- Verifica `isPastCutoff()` — se true, todos os botões de personalização (Swap, Adicionar Extra) ficam desabilitados
- Mensagens de cutoff aparecem nos lugares certos

---

## Bloco 7 — O que NÃO mudar

Pra evitar refator desnecessário:

- Estrutura geral do `App.jsx` — manter
- Componentes existentes (`Card`, `Btn`, `Modal`, `Toast`, `OrderFooter`, etc.) — manter
- Sistema de design (cores, tipografia) — manter
- Fluxo de cobrança proporcional dentro do mês na Assinatura — manter
- Limite de 3 pães na Assinatura — manter
- Onboarding, PreCadastro — não tocar
- Skill `cora-brand-voice` deve guiar copy — manter
- Hardcode "Beatriz" como assinante mock — manter

---

## Bloco 8 — Prompt sugerido pro Claude Code

Quando abrir o Claude Code, copiar e colar:

```
No repositório cora-portal, fazer ajustes pontuais no App.jsx conforme o briefing 
em docs/briefing-ajustes-app.md (vou salvar antes de você começar).

Antes de tudo:
1. Deletar src/pages/SubscriptionConfig.tsx
2. Deletar branch local e remota prototype/subscription-config
3. Remover do App.jsx as 2 linhas que importam e roteiam para SubscriptionConfig

Depois, criar branch ajustes/terminologia-e-swap e aplicar TODOS os blocos do 
briefing em ordem (1 a 5). Bloco 6 é validação manual minha. Bloco 7 lista o 
que NÃO mexer.

Atenção especial ao Bloco 4 (implementar Swap) — é a única mudança funcional. 
Os demais blocos são substituições de texto e atualização de dados mockados.

Rodar npm run dev quando terminar e me avisar. Se alguma decisão de design 
não estiver clara no briefing, perguntar antes de decidir.
```

---

## Resumo das mudanças

| Bloco | Tipo | Esforço estimado |
|---|---|---|
| 1 — Dados mockados | Substituição de valores | 15 min |
| 2 — Terminologia | Substituição de strings | 10 min |
| 3 — Lógica do Cardápio | Refator pequeno | 30 min |
| 4 — Swap na Cesta + Limite de Extras | Funcionalidade nova | 60-90 min |
| 5 — Refletir Cesta editada | Ajustes em Home/Perfil | 30 min |
| **Total** | | **~2.5h** |

---

*Briefing · Ajustes Pontuais App.jsx · Abril 2026*
