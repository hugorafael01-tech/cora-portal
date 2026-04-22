# Briefing Claude Code — Atualização do Onboarding.jsx (v3)

*Consolidação das decisões do portal + alinhamento com PreCadastro.jsx. Abril 2026.*

**Repositório:** `cora-portal`
**Arquivo afetado principal:** `src/Onboarding.jsx`
**Arquivo de referência:** `src/PreCadastro.jsx` (já em produção)
**Branch sugerida:** `ajustes/onboarding-alinhamento`
**Escopo:** alinhamento visual e de dados com o que foi decidido no Portal e o que já está em produção no PreCadastro. Sem mudanças estruturais no fluxo. Mantém os 3 passos (Splash → Form → Welcome).

---

## Contexto

O `Onboarding.jsx` precisa ser alinhado a:

1. Decisões de produto do Portal (pesos, preços, terminologia, elegibilidade pra Assinatura)
2. Padrões visuais e de segurança do `PreCadastro.jsx` (splash, máscara, sanitização, honeypot, erros inline)
3. Copy mais evocativa (descrições do PreCadastro)
4. Padronização visual (fundo dos cards)

Este briefing consolida tudo em 11 blocos.

---

## Princípio norteador

**O Onboarding é só pra configurar a Assinatura.** Swap, Extras e Cardápio semanal são do Portal depois que o cliente assina. No Onboarding, cliente escolhe entre Original e Integral. Ponto.

---

## Bloco 1 — Array de produtos corrigido

### Estado atual

```javascript
const CESTAS = [
  {id:"original",   nome:"Pão Original",  peso:"580g", avulso:25, mensal:98,  ...},
  {id:"integral",   nome:"Pão Integral",  peso:"614g", avulso:28, mensal:110, ...},
  {id:"multigraos", nome:"Multi Grãos",   peso:"631g", avulso:32, mensal:126, ...},
  {id:"brioche",    nome:"Brioche",       peso:"400g", avulso:34, mensal:128, ...},
];
```

### Estado correto

**Renomear `CESTAS` pra `ASSINATURA_OPCOES`.** Manter só Original e Integral. Descrições idênticas às do `PreCadastro.jsx`.

```javascript
const ASSINATURA_OPCOES = [
  {
    id: "original",
    nome: "Pão Original",
    peso: "615g",
    avulso: 27,
    img: IMG.original,
    desc: "Mix de farinhas italiana e brasileira, água, sal e o levain da Cora. Fermentação lenta, crosta firme e miolo aberto.",
    ingredientes: "Farinha Superiore, farinha FV integral, água, sal, levain da Cora."
  },
  {
    id: "integral",
    nome: "Pão Integral",
    peso: "615g",
    avulso: 29,
    img: IMG.integral,
    desc: "100% integral, com um blend de farinhas brasileira e italiana que traz mais complexidade ao sabor. Azeite na massa, fermentação lenta e miolo que fica macio por dias.",
    ingredientes: "Farinha FV integral, farinha Mora, água, sal, levain, azeite, farelo de trigo."
  },
];
```

**O que mudou:**
- Renomeação `CESTAS` → `ASSINATURA_OPCOES`
- Pesos: 580→615, 614→615
- Preços avulsos: 25→27, 28→29
- Campo `mensal` **removido**
- Multigrãos e Brioche **removidos**
- Descrições substituídas pelas do PreCadastro

### Imagens não usadas

`IMG.multigraos` e `IMG.brioche` podem ser removidas do objeto `IMG`.

### Sobre o accordion do ProductCard

O componente `ProductCard` tem accordion que expande "Ingredientes" e "Sobre este pão". **Comportamento mantido igual ao Cardápio do Portal:** accordion aparece quando há conteúdo (ingredientes/historia), fica oculto quando os campos estão vazios.

No Onboarding, como `ASSINATURA_OPCOES` tem `ingredientes` mas não tem `historia`, o accordion mostra **só ingredientes**. Mesmo comportamento atual do Cardápio quando um produto só tem um dos dois campos.

---

## Bloco 2 — Preço flat da Assinatura

### Estado atual

No `Step2`:

```javascript
const totalMensal = Object.entries(cesta).reduce((s, [id, qty]) => {
  const c = CESTAS.find(x => x.id === id);
  return s + (c ? c.mensal * qty : 0);
}, 0);
```

Usa `c.mensal` (R$ 98, R$ 110, etc.). **Errado.**

### Estado correto

Preço da Assinatura = R$ 99 × quantidade total, independente do produto.

```javascript
const VALOR_POR_PAO = 99;
const FRETE_MENSAL = 15;

const totalPaes = Object.values(assinatura).reduce((s, q) => s + q, 0);
const totalMensal = VALOR_POR_PAO * totalPaes;
```

### Exemplos de validação

| Configuração | Valor mensal |
|---|---|
| 1 Original | R$ 99 |
| 1 Integral | R$ 99 |
| 1 Original + 1 Integral | R$ 198 |
| 2 Originais | R$ 198 |
| 3 Integrais | R$ 297 |

### Remover preço dos cards no Step 2

No `ProductCard`, passar `preco: undefined` — dentro da Assinatura, cada pão vale o mesmo. O resumo embaixo já mostra o cálculo correto.

```javascript
product={{...c, preco: undefined}}
```

### Resumo do Step 2

```
Pão Original × 2/semana     R$ 198,00
Pão Integral × 1/semana     R$ 99,00
Frete mensal                 R$ 15,00
─────────────────────────────────────
Total mensal                R$ 312,00
```

Cada linha usa `VALOR_POR_PAO × qty`.

---

## Bloco 3 — Splash redesenhado (seguir padrão do PreCadastro)

### Estado atual

Splash simples: logo pequeno, copy curto, botão "Quero me cadastrar".

### Estado correto

**Replicar a estrutura visual do PreCadastro.jsx** (SplashScreen). Diferença: o copy precisa refletir o contexto do Onboarding (cliente já disse "quero assinar", está entrando pra cadastrar).

### Estrutura visual (copiar do PreCadastro)

```jsx
<div style={{
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "60px 32px 40px",
  background: W[50],
  textAlign: "center",
  gap: 0,
}}>
  {/* Grafismo coração topo */}
  <GrafismoCoracao size={36} />

  {/* Logo com tagline (versão grande) */}
  <div style={{ marginTop: 40 }}>
    <img
      src="/images/cora_logo_com_tag.svg"
      alt="Cora — Padaria por assinatura"
      style={{ width: "clamp(180px, 65vw, 260px)", height: "auto" }}
    />
  </div>

  {/* Copy em 2 tons */}
  <div style={{ marginTop: 48, maxWidth: 300, padding: "0 8px" }}>
    <p style={{
      fontFamily: "'Montagu Slab', Georgia, serif",
      fontSize: "clamp(22px, 6.5vw, 30px)",
      lineHeight: 1.3,
      color: W[400],
      margin: 0,
      fontWeight: 400,
    }}>
      Feliz em te receber.
    </p>
    <p style={{
      fontFamily: "'Montagu Slab', Georgia, serif",
      fontSize: "clamp(22px, 6.5vw, 30px)",
      lineHeight: 1.3,
      color: W[800],
      margin: 0,
      marginTop: 4,
      fontWeight: 500,
    }}>
      Vamos montar sua Assinatura?
    </p>
  </div>

  {/* CTA */}
  <button onClick={onStart} style={{...}}>Vamos</button>

  {/* Grafismo coração rodapé */}
  <div style={{ marginTop: 60 }}>
    <GrafismoCoracao size={36} />
  </div>
</div>
```

### Componente GrafismoCoracao

Se não existe ainda no Onboarding.jsx, criar no topo do arquivo (copiar idêntico ao do PreCadastro):

```jsx
const GrafismoCoracao = ({ size = 36 }) => (
  <img
    src="/images/grafismo_coracao.svg"
    alt=""
    aria-hidden="true"
    style={{ width: size, height: "auto" }}
  />
);
```

### Copy definitivo

- **Linha 1 (warm-400):** "Feliz em te receber."
- **Linha 2 (warm-800):** "Vamos montar sua Assinatura?"
- **Botão:** "Vamos"

---

## Bloco 4 — Copy do Step 2

### Estado atual

```
MONTE SUA CESTA
Escolha seus pães e quantos quer por semana. Pode trocar a qualquer momento.
```

### Estado correto

```
MONTE SUA ASSINATURA
Escolha entre 1 e 3 pães pra receber toda semana, na sua porta. Você pode alterar quando quiser.
```

**Ajuste quando cliente tem 3 pães:**

```
Você escolheu 3 pães, o máximo por semana.
```

---

## Bloco 5 — Terminologia (substituições globais)

Varrer o arquivo e substituir:

| Antes | Depois |
|---|---|
| "Monte sua cesta" | "Monte sua Assinatura" |
| "Sua cesta" (título de seção) | "Sua Assinatura" |
| variável `cesta` | `assinatura` |
| `cestaDaURL` | `assinaturaDaURL` |
| `setCesta` | `setAssinatura` |
| query param `?cesta=` | `?produto=` |
| "Multi Grãos" | "Multigrãos" |
| "Alterações na cesta até terça, 12h" | "Alterações na Assinatura até terça, 12h" |

**Query param:** se o `App.jsx` também lê `?cesta=`, alinhar pra `?produto=` (ou manter retrocompatibilidade).

---

## Bloco 6 — Em-dashes

Varrer o arquivo procurando `—`. Substituir por vírgula, ponto ou reescrever.

---

## Bloco 7 — Limite de 3 pães

```javascript
const LIMITE_PAES = 3;
const totalPaes = Object.values(assinatura).reduce((s, q) => s + q, 0);

const setQty = (id, q) => {
  const outros = Object.entries(assinatura)
    .filter(([k]) => k !== id)
    .reduce((s, [, qtd]) => s + qtd, 0);
  
  if (outros + q > LIMITE_PAES) return;
  
  const next = {...assinatura};
  if (q <= 0) delete next[id]; else next[id] = q;
  setAssinatura(next);
};
```

Botão `+` desabilitado quando `totalPaes >= LIMITE_PAES`. Mensagem informativa aparece.

---

## Bloco 8 — Padronização visual dos cards

### Problema identificado

Hoje o Onboarding tem cards com fundos inconsistentes:
- Cards de produto no Step 2: fundo `#FFF` (branco)
- Box de resumo no Step 2: fundo `W[100]` (warm-100, mais escuro que o fundo)
- Cards de revisão no Step 3: varia

O PreCadastro já aplicou regra clara. Seguir a mesma no Onboarding.

### Regra de fundo dos containers

| Tipo | Fundo | Quando |
|---|---|---|
| Card interativo (produto, input) | `#FFF` | Estado default |
| Card selecionado | `B[50]` | Quando `qty > 0` ou elemento ativo |
| Contêiner de resumo/informação | `W[100]` | Boxes agregadores (totais, revisão) |
| Background geral da página | `W[50]` | Shell do onboarding |

### Aplicação específica

**Step 2 — Cards de produto:**
- Default: `background: "#FFF"`, borda `W[200]`
- Quando `qty > 0`: `background: B[50]`, borda `B[500]`
- (Mesmo padrão de seleção do PreCadastro)

**Step 2 — Box de resumo (totais):**
- Mantém `background: W[100]` (contêiner informativo, não interativo)

**Step 3 — Cards de revisão:**
- `background: "#FFF"` pros cards que listam dados
- `background: B[50]` só pro box de destaque "Entrega toda quinta-feira"

**Welcome — Box de produtos a receber:**
- `background: "#FFF"` com borda `W[200]` (listagem de produtos, não interativa mas é informação principal)

---

## Bloco 9 — Validações e segurança (reaproveitar do PreCadastro.jsx)

### 9.1 Máscara de WhatsApp

Copiar `formatWhatsApp` do `PreCadastro.jsx` e aplicar no input do Step1.

### 9.2 Sanitização anti-XSS

```javascript
const sanitize = (str) => str.replace(/[<>]/g, "");
```

Aplicar nos inputs de texto livre (nome, endereço, complemento) no submit.

### 9.3 Honeypot anti-bot

Campo `website` oculto via CSS. Se preenchido, submit silenciosamente bloqueado.

```javascript
const [website, setWebsite] = useState("");

const handleSubmit = () => {
  if (website) return; // bot
  // ... resto da lógica
};
```

JSX do campo honeypot (copiar do PreCadastro):

```jsx
<div style={{position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden"}} aria-hidden="true">
  <label htmlFor="website">Website</label>
  <input
    type="text"
    id="website"
    name="website"
    value={website}
    onChange={(e) => setWebsite(e.target.value)}
    tabIndex={-1}
    autoComplete="off"
  />
</div>
```

### 9.4 Mensagens de erro inline

Validação no blur + no clique de "Continuar". Campos com erro ganham borda vermelha + mensagem.

**Regras:**
- **Nome:** pelo menos 2 palavras → "Precisamos do nome e sobrenome."
- **WhatsApp:** 10 ou 11 dígitos → "Confira o número com DDD."
- **E-mail:** regex básica válida → "E-mail inválido."
- **Endereço:** não vazio → "Informe seu endereço."
- **Gênero:** selecionado → "Escolha uma opção de tratamento."

Padrão visual (copiar do PreCadastro):

```javascript
const errorStyle = {
  fontSize: 13,
  color: "#DC2626",
  fontFamily: "'Montagu Slab', Georgia, serif",
  marginTop: 4,
};
```

Botão "Continuar" mantém lógica atual (desabilitado até tudo preenchido). Erros inline são complemento.

---

## Bloco 10 — Welcome: remover pattern, atualizar copy, padronizar cards

### Remover pattern de fundo

Deixar `background: W[50]` chapado. Remover o div com pattern:

```jsx
// REMOVER:
<div style={{position:"absolute",inset:0,opacity:0.06,backgroundImage:`url(${IMG.pattern})`,...}}/>
```

### Atualizar copy

**Introdução:**
```
Sua Assinatura está ativa.
Sua primeira entrega será na próxima quinta-feira.
```

**Composição (substituir "Você vai receber"):**
```
Você vai receber toda quinta
1× Pão Original (615g)
1× Pão Integral (615g)
Na sua porta.
```

### Padronizar card de composição

Hoje: `background: W[100]` com listagem vertical e imagens grandes.

Manter estrutura, mas ajustar fundo pra `#FFF` com borda `W[200]` (segue regra do Bloco 8).

### Botão final

```
Acompanhe sua Assinatura
```

### Manter

- Saudação por gênero (Bem-vinda/Bem-vindo/Boas-vindas)
- Check circle no topo
- Aviso azul sobre WhatsApp

---

## Bloco 11 — Step 3 (revisão)

### Labels

Trocar "Sua cesta" → "Sua Assinatura" em qualquer seção ou header.

### Nota sobre entrega

ANTES:
```
Alterações na cesta até terça, 12h.
```

DEPOIS:
```
Alterações na Assinatura até terça, 12h.
```

### Padronizar cards

Cards de dados pessoais e revisão da Assinatura: `background: "#FFF"` com borda `W[200]`. Box de destaque "Entrega toda quinta-feira": mantém `background: B[50]`.

---

## Validação pós-execução

### Cenários pra testar

**O1 — Splash redesenhado:**
- Grafismo coração topo e rodapé
- Logo grande centralizado
- Copy em 2 tons: "Feliz em te receber." (warm-400) / "Vamos montar sua Assinatura?" (warm-800)
- Botão "Vamos"
- Clique leva pro Step 1

**O2 — Step 1 com validações:**
- Nome com 1 palavra + blur: "Precisamos do nome e sobrenome."
- WhatsApp aplica máscara automática
- Blur em e-mail inválido: "E-mail inválido."
- Endereço vazio + blur: "Informe seu endereço."
- Tudo correto: erros somem, botão "Continuar" habilita

**O3 — Step 2 visual consistente:**
- 2 cards: Pão Original (615g) e Pão Integral (615g)
- **Sem Multigrãos, sem Brioche**
- Cards não mostram preço
- Descrições iguais ao PreCadastro
- Accordion expande mostrando ingredientes (mesmo comportamento do Cardápio no Portal)
- Fundo dos cards: `#FFF` default, `B[50]` quando `qty > 0`
- Box de resumo: fundo `W[100]`

**O4 — Cálculo correto:**
- 1 Original: Total R$ 114 (99 + 15)
- 1 Original + 1 Integral: Total R$ 213 (198 + 15)
- 3 pães: Total R$ 312 (297 + 15)

**O5 — Limite de 3 pães:**
- Com 3 pães, botão `+` desabilitado
- Mensagem "Você escolheu 3 pães, o máximo por semana."

**O6 — Step 3:**
- Box "Sua Assinatura" (não "Sua cesta")
- Composição correta listada
- "Alterações na Assinatura até terça, 12h"
- Cards fundo `#FFF`, box de entrega `B[50]`

**O7 — Welcome sem pattern:**
- Fundo chapado warm-50
- Saudação correta por gênero
- Lista: "Você vai receber toda quinta" + itens + "Na sua porta."
- Botão "Acompanhe sua Assinatura"
- Card de composição com fundo `#FFF`

**O8 — Query param:**
- `?produto=integral` pré-seleciona 1 Integral
- `?produto=original` pré-seleciona 1 Original

**O9 — Honeypot:**
- Campo `website` oculto no código
- Proteção silenciosa

**O10 — Sanitização:**
- Nome com `<script>` não quebra nada, remove `<` e `>`

---

## O que NÃO mudar

- Fluxo de 3 passos (Splash → 3 Steps → Welcome)
- Componentes visuais base (Progress, Field, Btn, H, Label, Input, QtyBtn)
- Design System (cores, tipografia, espaçamento)
- Lógica de gênero e saudação personalizada
- Mock de CPF e cartão (continuam placeholders)
- ProductCard: comportamento do accordion mantido. No Cardápio do Portal continua funcionando com ingredientes + história; no Onboarding só aparecem ingredientes (porque os dados não têm `historia`)

---

## Prompt pra colar no Claude Code

```
No cora-portal, aplicar correções no src/Onboarding.jsx conforme 
CORA_Briefing_Atualizacao_Onboarding.md (salvo em docs/).

Arquivo de referência: src/PreCadastro.jsx — reaproveitar funções 
formatWhatsApp, sanitize, GrafismoCoracao, estrutura do SplashScreen, 
padrão de honeypot e mensagens de erro inline.

Criar branch ajustes/onboarding-alinhamento a partir da main atualizada.

11 blocos de ajustes:
1. CESTAS vira ASSINATURA_OPCOES (só Original e Integral, 615g, 
   R$ 27/29, descrições do PreCadastro, sem campo mensal)
2. Preço flat R$ 99 × qtd
3. Splash redesenhado com estrutura do PreCadastro (grafismo coração, 
   logo grande, copy em 2 tons: "Feliz em te receber." / "Vamos montar 
   sua Assinatura?", botão "Vamos")
4. Copy Step 2: "MONTE SUA ASSINATURA / Escolha entre 1 e 3 pães pra 
   receber toda semana, na sua porta. Você pode alterar quando quiser."
5. Terminologia cesta → Assinatura em todo o arquivo
6. Em-dashes: varrer e substituir
7. Limite de 3 pães com mensagem
8. Padronização visual dos cards (regra: #FFF interativos, B[50] selecionados, 
   W[100] contêineres de resumo, W[50] fundo da página)
9. Validações (máscara WhatsApp, sanitização, honeypot, erros inline)
10. Welcome: remover pattern, copy atualizada, botão "Acompanhe sua 
    Assinatura", cards #FFF
11. Step 3: labels cesta → Assinatura, padronização de cards

Se o App.jsx principal usa ?cesta=, alinhar pra ?produto= (ou suportar 
ambos).

ProductCard: NÃO alterar o componente. No Onboarding o accordion aparece 
quando ingredientes tem conteúdo (mesmo comportamento do Cardápio no 
Portal).

Validar pelos 10 cenários (O1-O10). Rodar npm run dev e me avisar.
```

---

## Observação final

Storytelling mais rico (história de cada pão, voz do padeiro, expansível em 2 níveis) fica como próximo passo de marca. Não bloqueia MVP.

Quando as histórias estiverem escritas, adicionar campo `historia` em `ASSINATURA_OPCOES`. O accordion do ProductCard vai automaticamente exibir "Sobre este pão" porque o componente já suporta essa lógica no Cardápio do Portal.

---

*Briefing v3 · Atualização Onboarding · Abril 2026*
