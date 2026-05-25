# Briefing Claude Code — Implementação PreCadastro v1 Polimento (Variante A)

**Tarefa.** Implementar no repo `cora-portal` o redesign da Tela 2 (Form) do PreCadastro, conforme proposta da Variante A do Claude Design.

**Repo:** `cora-portal` · **Arquivo principal:** `src/PreCadastro.jsx` (894 linhas em produção)
**URL alvo:** `app.acora.com.br/interesse`
**Branch sugerida:** `feat/precadastro-polimento-v1`
**Deadline:** push de captura terça **26/05** — implementação domingo/segunda, validação em Vercel Preview, merge segunda à noite ou terça cedo.

---

## 0. Princípios não-negociáveis

1. **Evolve, don't revolutionize.** Tela 1 (Splash) e Tela 3 (Confirm) **não mudam.** Toda lógica de validação, sanitização, honeypot, máscara WhatsApp e webhook continua igual. O que muda é a UI da Tela 2.
2. **Validar em Vercel Preview, não localhost.** Funções da Vercel retornam 404 em localhost. Smoke test só em Preview deployment.
3. **Branch-per-feature → squash merge via GitHub UI.** Após merge, deletar branch local com `git branch -D feat/precadastro-polimento-v1`. Mensagens de commit **ASCII only**.
4. **Tokens locais do repo** (`src/tokens.js` — `B`, `W`, `radii`) — não importar CSS vars do DS hospedado. Valores são equivalentes:
   - `B[500] === var(--brand-500) === #2E55CD`
   - `W[50] === var(--warm-50) === #FAFAF8`
   - `radii.md === var(--radius-md) === 8px`

---

## 1. Arquivos de referência (anexados pelo Hugo na conversa)

Material entregue pelo Claude Design — **referência visual e estrutural**, não código pronto pra copiar. Usar como guia pra reescrever em inline styles + tokens do repo.

| Arquivo | O que tem | Como usar |
|---|---|---|
| `precadastro-shared.jsx` | Array `PRODUCTS` final + componentes `Header`, `Section`, `Field`, `SelectField`, `Checkbox`, `PrimaryCTA`, `CounterChip` + ícones inline | Estrutura JSX a reproduzir |
| `precadastro-shared.css` | Chrome do form (header, eyebrows, inputs, counter chip, optin, LGPD, CTA, breakpoints) | Valores visuais a traduzir pra inline styles |
| `precadastro-form.jsx` | Template completo da Tela 2 (4 seções: Quem é você, Pães, Onde você está, Antes de enviar) | Estrutura final da tela |
| `precadastro-form.css` | Adições (header de seção de pães, dica de limite) | Traduzir |
| `precadastro-variant-a.jsx` | `ProductCardA` + `ProductListA` | Implementar como cards de produto |
| `precadastro-variant-a.css` | Estilo dos cards (foto 16:10, info embaixo, estados) | **Ver bug seção 2** |
| `colors_and_type.css` | DS tokens canônicos | Referência pra equivalência com tokens do repo |
| `DS-PATCH.md` | Regra nova: nomes de produto em Montagu Slab sentence case | Aplicar |
| `README.md` (handoff) | Notas do CD | Ler antes de começar |

---

## 2. PRÉ-REQUISITO — bug a corrigir antes da implementação

O CSS global do DS hospedado aplica `text-transform: uppercase` em todo `h1..h6`:

```css
h1, h2, h3, h4, h5, h6, .heading, .display {
  text-transform: uppercase;
  letter-spacing: 0.02em;
  font-family: var(--font-display);
  ...
}
```

O JSX da Variante A usa `<h3 className="vA-name">` pro nome do produto e a regra `.vA-name` **não anula** o `text-transform`. Resultado no repo: nome aparece em "PÃO ORIGINAL" mesmo com Montagu Slab.

**Correção obrigatória no card de produto:**

```jsx
// nome do produto — sentence case, não uppercase
<h3 style={{
  fontFamily: 'Montagu Slab, Georgia, serif',
  fontWeight: 600,
  fontSize: 18,
  lineHeight: 1.2,
  color: W[800],
  textTransform: 'none',         // ★ anula h1..h6 global
  letterSpacing: 0,              // ★ anula display tracking
  margin: 0,
}}>
  {p.nome}
</h3>
```

Quando o card está selecionado, trocar `color` pra `B[700]`.

---

## 3. Tokens equivalentes — tabela de tradução

CD usa CSS vars. Repo usa objetos JS. Equivalências:

| CD (CSS var) | Repo (`src/tokens.js`) | Valor |
|---|---|---|
| `var(--brand-50)` | `B[50]` | `#EBEEFB` |
| `var(--brand-500)` | `B[500]` | `#2E55CD` |
| `var(--brand-600)` | `B[600]` | `#2545A8` |
| `var(--brand-700)` | `B[700]` | `#1D3787` |
| `var(--warm-50)` | `W[50]` | `#FAFAF8` |
| `var(--warm-100)` | `W[100]` | `#F5F4F0` |
| `var(--warm-200)` | `W[200]` | `#E8E6E1` |
| `var(--warm-300)` | `W[300]` | `#D4D1CA` |
| `var(--warm-400)` | `W[400]` | `#A8A49C` |
| `var(--warm-500)` | `W[500]` | `#7A766E` |
| `var(--warm-600)` | `W[600]` | `#5C5850` |
| `var(--warm-700)` | `W[700]` | `#3D3A34` |
| `var(--warm-800)` | `W[800]` | `#2A2723` |
| `var(--radius-xs)` | `radii.xs` | `4px` |
| `var(--radius-md)` | `radii.md` | `8px` |
| `var(--radius-lg)` | `radii.lg` | `12px` |
| `var(--success-bg)` | (novo) | `#D1FAE5` |
| `var(--success-text)` | (novo) | `#065F46` |

**Importante.** Não criar tokens novos no `src/tokens.js`. O verde do counter chip (`success-bg`/`success-text`) usa apenas no CounterChip, define inline.

---

## 4. Array PRODUCTS — atualizar

Substituir o array atual de produtos no `PreCadastro.jsx` (todos os pesos antigos estão errados, copys desatualizadas) pelo seguinte:

```js
const PRODUCTS = [
  {
    id: "original",
    nome: "Pão Original",
    peso: "700g",
    img: "/images/_original.jpg",
    desc: "Aquele pão que começou a Cora. Versátil, vai do café ao jantar. Blend de farinha italiana com toque de integral brasileira e 24 horas de fermentação.",
  },
  {
    id: "integral",
    nome: "Pão Integral",
    peso: "700g",
    img: "/images/_integral.jpg",
    desc: "Integral leve e macio, daqueles que dá pra comer todo dia. Farinha integral da Fazenda Vargem, azeite extra virgem que traz maciez, gergelim na crosta.",
  },
  {
    id: "focaccia",
    nome: "Focaccia Genovesa",
    peso: "430g",
    img: "/images/_focaccia.jpg",
    desc: "Receita da Ligúria, no norte da Itália. Miolo macio, crosta dourada, azeite extra virgem generoso. Cobertura de alecrim, sal grosso e cebola roxa.",
  },
  {
    id: "multigraos",
    nome: "Multigrãos",
    peso: "615g",
    img: "/images/_multigraos.jpg",
    desc: "Seis grãos torrados e escaldados na massa, crosta de farelo de aveia. Hidratação alta, miolo úmido, sabor que ganha em cada mordida.",
  },
  {
    id: "ciabatta",
    nome: "Ciabatta",
    peso: "533g",
    img: "/images/_ciabatta.jpg",
    desc: "Hidratação alta deixa o miolo cheio de alvéolos. Casca fina e crocante, formato achatado de chinelo, que é o que ciabatta significa em italiano. O pão do sanduíche.",
  },
  {
    id: "brioche",
    nome: "Brioche",
    peso: "256g",
    img: "/images/_brioche.jpg",
    desc: "Massa amanteigada com ovos, mel e raspas de laranja, limão siciliano e baunilha. Macio, levemente adocicado, com perfume cítrico. Pro lanche da escola e o café da manhã sem pressa.",
  },
];
```

**Imagens** já existem em `public/images/`. Não fazer upload. Confirmar nomes via `ls public/images/_*.jpg`.

---

## 5. Estrutura da Tela 2 (de cima pra baixo)

A tela passa a ter **4 seções nomeadas com eyebrows**, em vez de form linear. Cada seção é separada visualmente por uma linha sutil que sai do eyebrow.

### 5.1. Header

- Fundo `W[50]` (warm-50) **contínuo com o body** — não usar `#FFF`
- Borda inferior `1px solid W[200]`
- Logo `cora_logo_com_tag.svg` à esquerda, 30px de altura (mobile), 36px (desktop)
- Padding: 14px 24px (mobile), 18px 40px (desktop)

### 5.2. Body wrapper

- `max-width: 460px` mobile, `720px` desktop
- Padding: `28px 24px 0` mobile, `56px 40px 0` desktop
- Centralizado horizontalmente

### 5.3. Heading principal (h1)

- Texto: **"Conte um pouco sobre você"**
- Renderiza em CAIXA ALTA visualmente via `textTransform: 'uppercase'`
- Font: League Gothic 32px (mobile) / 56px (desktop), line-height 1.05 (mobile) / 1 (desktop)
- Cor: `B[500]`
- `textWrap: 'balance'` se suportado

### 5.4. Sub-heading abaixo do h1

**Remover.** O "Seus dados ficam só com a Cora." que existe hoje sai daqui. A microcopy LGPD logo antes do CTA já cobre privacidade.

### 5.5. Seção "Quem é você"

- Eyebrow: League Gothic uppercase 12px (mobile) / 13px (desktop), `B[500]`, letter-spacing 0.06em, com linha `1px W[200]` saindo do texto até o fim da seção
- Margin-top da seção: 32px mobile / 48px desktop
- Conteúdo: 2 campos em **grid 2 colunas no desktop**, empilhados no mobile
  - **Nome:** label "Como quer ser chamado(a)?" + input placeholder "Seu nome"
  - **WhatsApp:** label "WhatsApp com DDD" + input com máscara `(21) 99999-9999`
- Sanitização e máscara mantêm exatamente como estão hoje

### 5.6. Seção "Pães"

- Eyebrow: "Pães"
- Heading row (flex, space-between):
  - Esquerda: pergunta "Quais te interessam mais? Pode marcar 2." — Montagu Slab 17px (mobile) / 19px (desktop), peso 500, cor `W[800]`
  - Direita: **CounterChip** (ver 5.10)
- Lista de cards de produto (Variante A — ver seção 6)
- Quando atingir limite de 2, exibir abaixo dos cards: *"Pra trocar, desmarque um dos que já estão escolhidos."* — Montagu Slab 12.5px itálico, `W[500]`, margin-top 12px
- Campo "Outra opção que gostaria muito…" — input full-width, mesmo estilo dos outros, margin-top 14px

### 5.7. Seção "Onde você está"

- Eyebrow: "Onde você está"
- Grid 2 colunas no desktop (Cidade + Bairro), empilhados no mobile
  - **Cidade:** select com chevron, placeholder "Selecione"
  - **Bairro:** input texto, placeholder "Ex: Icaraí, Copacabana…"

### 5.8. Seção "Antes de enviar"

- Eyebrow: "Antes de enviar"
- **Optin** — checkbox + label "Quero receber novidades da Cora pelo WhatsApp até as entregas começarem." Desmarcado por default. Mantém comportamento atual.
- **Microcopy LGPD** — manter o texto que está hoje no PreCadastro.jsx: "Seus dados ficam guardados só pra te avisar quando a Cora abrir oficialmente. Pode pedir pra excluir a qualquer momento pelo WhatsApp." Estilo: Montagu Slab 12px, `W[500]`, line-height 1.6, margin-bottom 24px
- **CTA "Tenho interesse"** — botão full-width no mobile, max-width 320px no desktop. Altura 54px mobile / 60px desktop, `B[500]` background, `#FFF` texto, peso 600, font 16px mobile / 17px desktop, hover `B[600]`

### 5.9. Inputs (estados)

- **Default:** background `#FFF`, border `1.5px solid W[300]`, radius 8px, min-height 52px mobile / 56px desktop, padding `0 16px`, font 16px mobile / 17px desktop, cor `W[800]`
- **Focus:** border `B[500]`, ring `0 0 0 3px B[50]`
- **Error:** border `#DC2626` (DC dois mil... `#DC2626`)
- **Placeholder:** cor `W[400]`

### 5.10. CounterChip (componente novo)

```jsx
const CounterChip = ({ n, max = 2 }) => {
  const full = n >= max;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: full ? '#D1FAE5' : B[50],
      color: full ? '#065F46' : B[700],
      fontFamily: 'Montagu Slab, Georgia, serif',
      fontSize: 12.5,
      fontWeight: 600,
      padding: '5px 10px',
      borderRadius: radii.xs,
      lineHeight: 1,
      whiteSpace: 'nowrap',          // ★ não quebra
    }}>
      <span style={{
        fontSize: 10,
        lineHeight: 0,
        color: full ? '#047857' : B[500],
      }} aria-hidden="true">●</span>
      {n} de {max}                   {/* ★ copy curta — não "X de 2 marcados" */}
    </span>
  );
};
```

**Atenção:** a copy é **"X de 2"** (curta), **não** "X de 2 marcados". A versão longa quebra em duas linhas em telas estreitas e o `line-height: 1` faz os números se sobreporem. Correção definida no review do CD.

---

## 6. Card de produto (Variante A)

### 6.1. Estrutura

```jsx
<article
  onClick={() => toggle(p.id)}
  aria-pressed={selected}
  style={{
    background: selected ? B[50] : '#FFF',
    border: `1.5px solid ${selected ? B[500] : W[200]}`,
    borderRadius: radii.lg,
    overflow: 'hidden',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    transition: 'border-color 150ms, background 150ms',
    position: 'relative',
  }}
>
  {/* foto 16:10 com checkbox sobreposto */}
  <div style={{ width: '100%', aspectRatio: '16 / 10', background: W[100], position: 'relative', overflow: 'hidden' }}>
    <img src={p.img} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    <div style={{
      position: 'absolute', top: 12, right: 12,
      background: selected ? 'transparent' : 'rgba(255,255,255,0.95)',
      borderRadius: radii.xs,
      padding: selected ? 0 : 4,
      display: 'flex',
    }} aria-hidden="true">
      <Checkbox checked={selected} size={28} />
    </div>
    {disabled && <div style={{ position: 'absolute', inset: 0, background: 'rgba(250,250,248,0.55)' }} aria-hidden="true" />}
  </div>

  {/* info */}
  <div style={{ padding: '16px 18px 18px' }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
      <h3 style={{
        fontFamily: 'Montagu Slab, Georgia, serif',
        fontWeight: 600,
        fontSize: 18,                 // 20 no desktop
        lineHeight: 1.2,
        color: selected ? B[700] : W[800],
        textTransform: 'none',        // ★ anula h3 global
        letterSpacing: 0,
        margin: 0,
      }}>{p.nome}</h3>
      <span style={{
        fontFamily: 'Montagu Slab, Georgia, serif',
        fontSize: 12, color: W[500], fontWeight: 500,
        whiteSpace: 'nowrap', letterSpacing: '0.02em',
      }}>{p.peso}</span>
    </div>
    <p style={{
      fontFamily: 'Montagu Slab, Georgia, serif',
      fontSize: 14,                   // 15 no desktop
      lineHeight: 1.55,
      color: W[600],
      margin: 0,
      textWrap: 'pretty',
    }}>{p.desc}</p>
  </div>
</article>
```

### 6.2. Lista

- Mobile: lista vertical, gap 16px
- Desktop: grid 2 colunas, gap 18px

### 6.3. Comportamento de seleção

- Clique no card alterna seleção (toggle no array `selectedIds`)
- Quando `selectedIds.length >= 2` e card não está em `selectedIds` → `disabled: true`
- Quando `disabled`, opacity 0.55, cursor default, click não dispara nada, foto recebe veil branco translúcido
- Acessibilidade: `aria-pressed={selected}`, `aria-disabled={disabled}` no `<article>`

---

## 7. Desktop breakpoint

Aplicar via media query inline ou hook. O repo já tem padrão? **Verificar antes** — usar o que já existe (provavelmente `window.matchMedia` ou um hook custom).

**Breakpoint:** ≥768px é desktop.

Ajustes principais já espalhados nas seções acima:
- Body 720px (vs 460px mobile)
- Padding 56px 40px (vs 28px 24px)
- h1 56px (vs 32px), line-height 1 (vs 1.05)
- Pergunta de seção 19px (vs 17px)
- Inputs 56px height, font 17px (vs 52px / 16px)
- Eyebrow 13px (vs 12px)
- CTA height 60px, font 17px, **max-width 320px** (vs full-width)
- Header padding 18px 40px, logo 36px (vs 14px 24px, 30px)
- Margin-top de seção 48px (vs 32px)
- Lista de cards: grid 2 colunas (vs vertical)
- Nome do produto 20px (vs 18px), descrição 15px (vs 14px)
- TwoCol layout: grid `1fr 1fr` gap 20px (vs grid `1fr` gap 16px)

---

## 8. O que NÃO mexer

- **Tela 1 (Splash)** — Grafismo coração + logo + "Tem interesse?" + CTA "Muito!" não mudam em nada
- **Tela 3 (ConfirmScreen)** — PatternBand topo/rodapé, check, "ANOTADO, [NOME]!", body, share CTA não mudam
- **Lógica de validação inline** + scroll smooth pro erro agregado quando submit falha
- **Sanitização anti-XSS:** `.replace(/[<>]/g, "")` no submit — mantém
- **Honeypot anti-bot:** campo `website` oculto via CSS — mantém
- **Máscara WhatsApp:** `formatWhatsApp()` — mantém
- **Endpoint da API:** `POST /api/lead` → Make.com → Google Sheets — mantém payload exato
- **Estados de erro:** cores, copy e comportamento de scroll — mantém
- **Componentes utilitários:** `GrafismoCoracao`, `PatternBand`, `sanitize`, `formatWhatsApp` — não tocar
- **`prefers-reduced-motion`** — respeitar
- **`focus-visible` ring** brand — manter
- **Touch target ≥44px** em qualquer elemento interativo

---

## 9. Critérios de aceitação

A implementação está completa quando:

- [ ] Header sem fundo branco, warm-50 contínuo, borda warm-200
- [ ] H1 "Conte um pouco sobre você" em League Gothic uppercase brand-500
- [ ] Sub-heading "Seus dados ficam só com a Cora." removido
- [ ] 4 seções com eyebrows + linha divisória ("Quem é você", "Pães", "Onde você está", "Antes de enviar")
- [ ] Campos Nome+WhatsApp em 2 colunas no desktop, empilhados no mobile
- [ ] Campos Cidade+Bairro idem
- [ ] Label do campo Nome: "Como quer ser chamado(a)?"
- [ ] 6 produtos com pesos corretos (700/700/430/615/533/256g) e copys novas
- [ ] Card de produto: foto 16:10 em cima, info embaixo, nome em Montagu Slab sentence case (não uppercase), peso à direita do nome, descrição completa
- [ ] Estados do card: default (#FFF), hover (border warm-300), selected (brand-50 + border brand-500 + nome brand-700), disabled (opacity 0.55 + veil branco)
- [ ] Lista em coluna no mobile, grid 2 colunas no desktop
- [ ] CounterChip "X de 2" (copy curta, sem "marcados"), `whiteSpace: nowrap`, vira verde em 2/2
- [ ] Dica "Pra trocar, desmarque um dos que já estão escolhidos." aparece quando atinge 2
- [ ] Pergunta de pães: "Quais te interessam mais? Pode marcar 2."
- [ ] Microcopy LGPD mantém o texto atual, posicionada antes do CTA
- [ ] CTA "Tenho interesse" full-width mobile, max-320px desktop
- [ ] Sanitização, validação, honeypot, máscara WhatsApp e webhook funcionando idênticos ao baseline
- [ ] Splash e Confirm intocados
- [ ] Validado em Vercel Preview (não localhost)
- [ ] Sem em-dashes (`—`) em nenhum texto
- [ ] Sem pill buttons, sem gradientes, sem drop shadows

---

## 10. Fluxo de PR

1. `git checkout -b feat/precadastro-polimento-v1`
2. Implementar mudanças no `src/PreCadastro.jsx` (e arquivos auxiliares se necessário — provavelmente nenhum)
3. Push da branch
4. Vercel gera Preview automaticamente
5. **Smoke test no Preview** (não localhost):
   - Tela 1 → 2 → 3 sem erros
   - Submit válido grava no Sheets (verificar via Make.com)
   - Submit inválido mostra erro agregado com scroll
   - Honeypot bloqueia (preencher manualmente `website` no DevTools)
   - Mobile (iPhone e Android viewport)
   - Desktop ≥768px
6. Abrir PR, squash merge via GitHub UI
7. Deletar branch local: `git branch -D feat/precadastro-polimento-v1`
8. Atualizar `PORTAL_STATUS.md` com commit SHA e descrição da feature

---

## 11. Capturas de tela esperadas no PR (smoke test)

Postar no PR:
- Mobile · seção "Quem é você" com 1 campo focado
- Mobile · seção "Pães" com 1 card selecionado + CounterChip "1 de 2"
- Mobile · seção "Pães" com 2 cards selecionados + 4 cards disabled + dica de troca
- Mobile · CTA + LGPD
- Desktop · tela completa rolada do topo ao CTA
- Estado de erro: campo Nome vazio após submit, com erro agregado visível

---

## 12. Pós-merge

- Hugo atualiza o DS hospedado no Claude Design com o patch do `DS-PATCH.md` (regra: nomes de produto em Montagu Slab sentence case, nunca uppercase)
- Hugo registra na ClickUp lista **Digital & Portal** (`901712612053`) a entrega como concluída

---

*Briefing CC · PreCadastro v1 Polimento · Maio 2026*
