# Patch · DS hospedada — Regra nova de nome de produto

Mai/2026. Decidido no review do PreCadastro v1 polimento.

## O que muda

Antes: nomes de produto em cards variavam de tratamento (League Gothic uppercase no Portal, Montagu Slab 600 no PreCadastro v0, etc.).

Agora: regra única em todo lugar.

## Patch — colar em `README.md` da DS, seção `VISUAL FOUNDATIONS > Tipografia`

Inserir como subseção nova, antes de "Espaçamento e layout":

---

### Nomes de produto

Tratamento único em **qualquer card de produto** — Portal, PreCadastro, Backoffice, landing pública.

- **Família:** Montagu Slab (`var(--font-body)`)
- **Peso:** 600
- **Capitalização:** sentence case (como o nome aparece no catálogo). **NUNCA** caixa alta, mesmo em cards onde outros títulos são League Gothic.
- **Cor default:** `var(--warm-800)` (#2A2723)
- **Cor quando selecionado / hover ativo:** `var(--brand-700)` (#1D3787)
- **Tamanho:** escala com o card. Default 16–18px em mobile · 18–20px em desktop. Hierarquia interna ao card decide.

**Razão.** League Gothic uppercase compete com o título do card e desvaloriza nomes próprios dos produtos ("Focaccia Genovesa", "Ciabatta"). Montagu Slab 600 em sentence case respeita os nomes e mantém a hierarquia editorial: League Gothic fica reservada pra títulos de tela e eyebrows de seção, Montagu Slab manda em qualquer corpo, label e nome próprio.

**Exemplo:**
```css
.product-card .name {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 18px;
  color: var(--warm-800);
}
.product-card.is-selected .name { color: var(--brand-700); }
```

**Anti-padrões a evitar:**
- ❌ `text-transform: uppercase` em nome de produto
- ❌ `font-family: var(--font-display)` em nome de produto
- ❌ `color: var(--brand-500)` em nome de produto (brand-500 fica no eyebrow da seção, no contador, no CTA — não nos nomes)

---

## Onde isso já foi aplicado

- `precadastro-variant-a.css` (este handoff) — `.vA-name`
- `precadastro-variant-c.css` (no design canvas v1 polimento) — `.vC-name`
- Variante B já estava conforme (`.vB-name` já era Montagu Slab 600 warm-800).

## Onde precisa propagar (próxima passagem pela DS hospedada)

- `ui_kits/portal/` — checar nomes de produto em ProductCard, OrderFooter, Cardápio
- `ui_kits/backoffice/` — listagem de produtos e fornadas
- `ui_kits/landing/index.html` — `.bread-card .meta .n` usa League Gothic uppercase brand-500. **Refatorar.**
- Componente compartilhado `ProductCard.jsx` no repo `cora-portal/src/components/`

## Checklist pra Hugo

- [ ] Editar `README.md` da DS hospedada com a subseção acima
- [ ] Atualizar `ui_kits/landing/index.html` (bread-card .n)
- [ ] Atualizar `ui_kits/portal/` (ProductCard)
- [ ] Adicionar à seção "Anti-padrões" do README: "Nome de produto em League Gothic ou caixa alta · Nome de produto em brand-500"
