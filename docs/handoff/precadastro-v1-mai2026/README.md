# Handoff · Variante A (Lista editorial vertical)

Direção escolhida pro polimento do `PreCadastro.jsx` (Tela 2 · `/interesse`).

## Arquivos

| Arquivo | O que tem |
|---|---|
| `precadastro-shared.jsx` | `PRODUCTS` (6 pães com pesos e copys aprovadas) · `Header` · `Section` · `Field` · `SelectField` · `Checkbox` · `PrimaryCTA` · `CounterChip` · ícones inline (Lucide outline). |
| `precadastro-shared.css` | Chrome do form: header sem fundo branco, eyebrows de seção, inputs, contador "X de 2 marcados", optin, LGPD, CTA, breakpoints mobile/desktop. |
| `precadastro-form.jsx` | `PreCadastroForm` — template da Tela 2 (header + dados + pães + entrega + optin + CTA). Recebe `productsSlot` (a lista de cards de produto da variante). |
| `precadastro-form.css` | Adições específicas do template (header de seção de pães, dica de limite). |
| `precadastro-variant-a.jsx` | `ProductCardA` + `ProductListA` — foto 16:9 full-bleed em cima, info embaixo. |
| `precadastro-variant-a.css` | Estilo dos cards: warm border default · brand-500 border + brand-50 fill quando selecionado · opacidade 0.55 + veil 55% sobre a foto quando disabled (já tem 2 marcados). |
| `colors_and_type.css` | DS tokens canônicos (CSS vars). Importar antes dos outros .css. |
| `DS-PATCH.md` | Patch pra colar na DS hospedada (regra nova de nome de produto). |

## Ordem de import no HTML

```html
<link rel="stylesheet" href="colors_and_type.css">
<link rel="stylesheet" href="precadastro-shared.css">
<link rel="stylesheet" href="precadastro-form.css">
<link rel="stylesheet" href="precadastro-variant-a.css">

<script src="react.development.js"></script>
<script src="react-dom.development.js"></script>
<script src="babel.min.js"></script>

<script type="text/babel" src="precadastro-shared.jsx"></script>
<script type="text/babel" src="precadastro-form.jsx"></script>
<script type="text/babel" src="precadastro-variant-a.jsx"></script>
```

## Uso

```jsx
<PreCadastroForm
  variantId="A"
  state={{ selectedIds: ["original"], nome: "Beatriz", ... }}
  productsSlot={<ProductListA selectedIds={["original"]} limit={false} />}
/>
```

## Notas pro Claude Code (quando implementar no `cora-portal`)

- **Tokens.** Estes arquivos usam `var(--brand-500)` etc. do `colors_and_type.css`. O repo usa `B[500]`, `W[300]` etc. do `src/tokens.js`. Traduzir 1:1 — os valores são idênticos (`B[500] === #2E55CD === var(--brand-500)`).
- **Estilo inline vs. classes.** O repo usa inline styles. Estes arquivos usam classes CSS. Tanto faz pra implementação — o que importa é o valor visual.
- **Não mexer** em: lógica de validação · sanitização · honeypot (`website`) · máscara WhatsApp · webhook · estados de erro · `GrafismoCoracao` · `PatternBand` · Splash · ConfirmScreen.
- **Imagens** — referenciar `/images/_original.webp` etc. como no PreCadastro.jsx atual. No protótipo, usei o `raw.githubusercontent.com/cora-site/main/images/_*.jpg`.
- **DS rule nova** (ver `DS-PATCH.md`) — aplicar antes de implementar pra não ter retrabalho.

## Estados validados visualmente

- Card de produto: `default` · `hover` · `selected` · `disabled` (já tem 2 marcados)
- Input: `default` · `focus` (border brand-500 + ring brand-50 3px) · `error` (border #DC2626) · `preenchido`
- Select: `default` · `aberto` · `selecionado`
- CTA: `default` · `hover` (brand-600) · `loading` · `disabled`
- Counter chip: `0–1 de 2 marcados` (brand-50/brand-700) · `2 de 2 marcados` (success-bg/success-text)
- Erro agregado: `danger-bg` + `danger-border` + `danger-text`
