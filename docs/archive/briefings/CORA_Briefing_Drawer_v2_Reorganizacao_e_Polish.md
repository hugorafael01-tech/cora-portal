# Briefing Técnico v2 — Drawer "Editar cesta": reorganização + colapso + polish

**Versão:** 2 (delta sobre o briefing v1)
**Data:** 2026-05-16
**Branch:** `feat/drawer-assinatura-qtystepper` (continua a mesma — sem novo PR)
**Task ClickUp:** [86e1d777a](https://app.clickup.com/t/86e1d777a)

---

## 1. Contexto

O PR atual `feat/drawer-assinatura-qtystepper` já implementou o refactor da seção SUA ASSINATURA (QtyStepper por tipo + swap atômico + pill + capacity + link revert + microcopy). Durante validação visual, Hugo identificou 4 ajustes:

1. **Bug crítico:** Confirmar pedido permite cesta inválida (sumAll < totalPaes)
2. Copy "— cheio" no capacity card causa confusão
3. Botão `+` em row esmaecida pouco claro visualmente
4. **Carga visual da Assinatura desproporcional ao uso real** — ~80% dos clientes nunca toca lá dentro do Drawer

O ponto 4 motivou uma nova rodada com o Claude Design. **Wireframe v2 entregue e aprovado:** `docs/Assinatura_no_Drawer_v2_(standalone).html` (commitar no início do trabalho).

Este briefing v2 cobre **todas as mudanças incrementais sobre o estado atual da branch** — não é um restart, é um delta sobre o que já está implementado.

---

## 2. Resumo das mudanças

| # | Mudança | Tipo |
|---|---|---|
| A | Seção SUA ASSINATURA vira **colapsável** (default colapsada) | Estrutural |
| B | Composição compacta dinâmica no header colapsado | Estrutural |
| C | **Auto-expand** quando `composition !== baseline` | Estrutural |
| D | Pill "Trocado só esta semana" visível no header colapsado (sem precisar expandir) | Visual |
| E | **Empty state** quando cesta sem extras | Estrutural |
| F | Total card OCULTO quando empty | Visual |
| G | Botão "Confirmar pedido" → "Sem alterações" disabled quando empty | Funcional |
| H | **Bug crítico:** Confirmar disabled quando `sumAll !== totalPaes` + microcopy | Funcional |
| I | Remover "— cheio" do capacity card, trocar por variação de cor | Visual |
| J | Botão `+` em row esmaecida com cor brand-500 (mais claro) | Visual |
| K | Remover desc descritivo dos pães ("Levain de 12 anos...") | Limpeza |

**Ordem das seções: mantida (Sua Assinatura → Extras desta semana).** Hugo reverteu a inversão proposta anteriormente.

---

## 3. Especificação de cada mudança

### A. Seção SUA ASSINATURA colapsável

**Estrutura nova:**

```jsx
<div className={`sec ${isAssinaturaOpen ? 'is-open' : ''}`}>
  <button
    className="sec-head toggle"
    type="button"
    onClick={toggleAssinatura}
    disabled={isLockedOrConfirmado}
    aria-expanded={isAssinaturaOpen}
  >
    <div className="label-wrap">
      <span className="sec-label">Sua assinatura</span>
      {hasAlteration && (
        <span className="chg-pill">
          <BulletIcon />
          Trocado só esta semana
        </span>
      )}
    </div>
    {!isLockedOrConfirmado && (
      <span className="chevron">
        <ChevronIcon direction={isAssinaturaOpen ? 'up' : 'down'} />
      </span>
    )}
  </button>

  {/* Composição compacta — sempre visível, mesmo colapsada */}
  <p className="sec-compact">{renderCompactComposition()}</p>

  {/* Body — só visível quando open */}
  {isAssinaturaOpen && (
    <div className="sec-body">
      <p className="sec-context">{totalPaes} pães por semana · ajuste só esta semana</p>

      <div className="asn-list">
        {/* Pão Original + Pão Integral com QtyStepper como já está */}
      </div>

      <div className={`capacity ${isCompositionInvalid ? 'is-invalid' : ''}`}>
        {/* Capacity card (sem "— cheio") */}
      </div>

      {isCompositionInvalid && (
        <p className="capacity-warning">
          Sua cesta precisa de {totalPaes} pães. Falta(m) {totalPaes - sumAll}.
        </p>
      )}

      {hasAlteration && (
        <button className="revert-link" onClick={revertToBaseline}>
          <UndoIcon />
          Voltar pro padrão ({renderBaselineComposition()})
        </button>
      )}

      {hasAlteration && (
        <div className="microcopy">
          <InfoIcon />
          <span>
            Vale só pra entrega de {deliveryLabelShort}. Pra mudar sua assinatura permanente,{' '}
            <a onClick={() => { onClose(); onNav('assinatura'); }}>vá em Assinatura</a>.
          </span>
        </div>
      )}
    </div>
  )}
</div>
```

### B. Composição compacta dinâmica

Função `renderCompactComposition()` (similar ao `renderBaselineComposition()` que já existe, mas para `composition` atual em vez de `baseline`):

```js
const renderCompactComposition = () => {
  const parts = [];
  if ((comp.original || 0) > 0) {
    parts.push(`${comp.original}× Original`);
  }
  if ((comp.integral || 0) > 0) {
    parts.push(`${comp.integral}× Integral`);
  }
  // Caso edge: sumAll === 0 (inválido temporário)
  if (parts.length === 0) {
    return 'Cesta vazia';
  }
  return parts.join(' + ');
};
```

**Exemplos:**
- `comp = {original:1, integral:1}` → "1× Original + 1× Integral"
- `comp = {original:2, integral:0}` → "2× Original"
- `comp = {original:0, integral:1}` → "1× Integral"
- `comp = {original:0, integral:0}` → "Cesta vazia" (estado transitório inválido)

**Estilo CSS:**
```css
.sec-compact {
  font-family: var(--font-body); /* Montagu Slab */
  font-size: 14px;
  color: var(--warm-700);
  margin: 6px 0 0 0;
  padding-left: 14px; /* alinha com sec-label */
}
```

### C. Auto-expand quando alterado

State local na seção:

```jsx
const [isAssinaturaOpen, setIsAssinaturaOpen] = useState(false);

// Auto-expand quando composição diverge do baseline
useEffect(() => {
  if (hasAlteration && !isAssinaturaOpen) {
    setIsAssinaturaOpen(true);
  }
}, [hasAlteration]);

const toggleAssinatura = () => {
  setIsAssinaturaOpen(prev => !prev);
};
```

**Regra:**
- Quando `hasAlteration` vira `true`, abre automaticamente
- Quando `hasAlteration` volta a `false` (via revert ou cliques manuais), **NÃO fecha automaticamente** — user pode continuar mexendo se quiser. Só fecha na próxima vez que o Drawer abrir do zero no estado padrão.
- Pós-cutoff/confirmado (`isLockedOrConfirmado === true`): sempre colapsada, sem affordance.

### D. Pill "Trocado só esta semana" no header

Já está implementada na branch. Garantir que renderiza **dentro do `label-wrap`** (entre o label e o chevron), não dentro do body. Visível no estado colapsado.

### E. Empty state quando sem extras

**Detecção:** `(currentWeeklyOrder?.extras?.length || 0) === 0`

**Renderização condicional da seção Extras:**

```jsx
<div className="sec extras is-open">
  <div className="sec-head">
    <span className="sec-label">Extras desta semana</span>
  </div>
  <div className="sec-body">
    {extras.length > 0 ? (
      <>
        <div className="extra-list">
          {/* lista atual com QtyStepper */}
        </div>
        <div className="extras-total">
          {/* total card warm-100 */}
        </div>
      </>
    ) : (
      <div className="extras-empty">
        <div className="left">
          <div className="ttl">Nada adicionado pra esta semana.</div>
          <div className="sub">Confira nossos pães no cardápio. Em breve teremos novidades.</div>
        </div>
        <button
          className="cta"
          type="button"
          onClick={() => { onClose(); onNav('cardapio'); }}
        >
          Ver cardápio
          <ChevronRightIcon />
        </button>
      </div>
    )}
  </div>
</div>
```

**Importante:** Total card só renderiza quando há extras. Quando empty, total fica oculto (sem "R$ 0,00" mudo).

**Estilo do empty state:** wireframe v2 mostra como bloco compacto com texto à esquerda e CTA à direita. Reusar tokens existentes (warm-700 pro título, warm-500 pro sub, brand-500 pro CTA).

### F + G. Total card oculto + botão "Sem alterações"

Já coberto em (E) — o total card só renderiza quando há extras.

**Botão "Confirmar pedido" no footer:**

```js
const hasExtras = (currentWeeklyOrder?.extras?.length || 0) > 0;
const isEmpty = !hasExtras && !hasAlteration;

const confirmBtnDisabled = 
  isLocked ||
  isPendingPayment ||
  isCompositionInvalid ||
  isEmpty;

const confirmBtnLabel = (() => {
  if (isConfirmado && !isLocked) return 'Confirmado'; // estado existente
  if (isEmpty) return 'Sem alterações';
  return 'Confirmar pedido';
})();
```

### H. Bug crítico: Confirmar disabled em composição inválida

Já incluído em (G) via `isCompositionInvalid`. Definição:

```js
const isCompositionInvalid = sumAll !== totalPaes;
```

**E ajustar a regra do `-`:** o bloqueio atual `sumAll <= 1` foi simplista. Correção:

```js
const decrementDisabled = (comp[id] || 0) === 0
  || (totalPaes === 1 && sumAll <= 1); // só pra plano 1 pão
```

Em planos 2-3, decrementar até 0 é permitido (estado inválido temporário). O bloqueio do Confirmar (via H) cuida da validação final.

**Microcopy abaixo do capacity card** quando inválido:

```jsx
{isCompositionInvalid && (
  <p className="capacity-warning">
    Sua cesta precisa de {totalPaes} pães. Falta(m) {totalPaes - sumAll}.
  </p>
)}
```

```css
.capacity-warning {
  font-size: 12px;
  color: var(--warning-text, #92400E);
  margin: 6px 0 0 0;
  padding-left: 14px;
}
```

### I. Remover "— cheio" do capacity card

**De:**
```jsx
<span><span className="n">{sumAll}</span> de {totalPaes} pão(es)
  {isCapacityFull && <span className="full"> — cheio</span>}
</span>
```

**Para:**
```jsx
<span><span className="n">{sumAll}</span> de {totalPaes} pão(es)</span>
```

**Variação de cor por estado:**

```css
.capacity {
  background: var(--warm-100); /* default */
}
.capacity.is-invalid {
  background: var(--warning-bg, #FEF3C7);
  color: var(--warning-text, #92400E);
}
```

Sem variação visual pra `is-full` válido (sumAll === totalPaes com composição válida) — o estado "cheio" não é mais sinalizado verbalmente nem por cor, apenas pelo número `X de X`.

### J. Botão `+` em row esmaecida com cor brand-500

CSS:

```css
.asn-row.is-zero {
  opacity: 0.55;
}

/* Mantém o + da row esmaecida em opacity total + cor brand */
.asn-row.is-zero .qty button[data-step="1"]:not(:disabled) {
  opacity: 1;
  color: var(--brand-500);
}
```

Garante contraste claro mesmo com row esmaecida. Comunica visualmente que o `+` é a ação possível (swap atômico).

### K. Remover desc dos pães

**Remover do JSX da `asn-row`:**

```jsx
<div className="desc">Levain de 12 anos, casca grossa.</div>
<div className="desc">100% trigo integral orgânico.</div>
```

Linha final clean: nome + peso (`Pão Original · 700g`). Quando o copy oficial da task 86e1d14zr for definido, pode entrar como `desc` opcional em PR separado.

---

## 4. CSS adicional / ajustes

### Header da seção colapsável

```css
.sec-head.toggle {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
}
.sec-head.toggle:disabled {
  cursor: default;
}
.sec-head.toggle .chevron {
  display: flex;
  align-items: center;
  color: var(--warm-500);
  transition: transform 200ms ease;
}
.sec.is-open .chevron svg {
  transform: rotate(180deg);
}
```

### Animação de expand/collapse

```css
.sec-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 250ms ease-out;
}
.sec.is-open .sec-body {
  max-height: 1000px; /* alto o suficiente pra qualquer conteúdo */
}
```

(Truque do max-height: simples e funciona. Pode trocar por height auto via libs se quiser, mas pra mobile com conteúdo pequeno isso basta.)

### Divider entre seções

Já está no wireframe v2:

```css
.sec-divider {
  height: 1px;
  background: var(--warm-200);
  margin: 8px 14px;
}
```

---

## 5. Critérios de aceite

- [ ] `npm run build` passa
- [ ] `npm run lint` baseline mantido (18/17/1)
- [ ] `npm run test:cutoff` 6/6
- [ ] Seção Sua Assinatura: header sempre visível, body colapsado por default
- [ ] Composição compacta dinâmica abaixo do header (1× Original + 1× Integral, etc)
- [ ] Click no header toggle expand/collapse
- [ ] Auto-expand quando `composition !== baseline`
- [ ] Pill "Trocado só esta semana" no header (visível mesmo colapsado)
- [ ] Pós-cutoff/confirmado: colapsada, sem affordance de toggle, opacity 0.55
- [ ] Empty state quando sem extras: título + sub + CTA "Ver cardápio"
- [ ] CTA "Ver cardápio" fecha Drawer e navega pra `cardapio`
- [ ] Total card de extras some quando empty
- [ ] Botão direito do footer vira "Sem alterações" disabled quando empty AND não há alteração na assinatura
- [ ] Confirmar pedido disabled quando `sumAll !== totalPaes` + microcopy "Sua cesta precisa de X pães. Falta(m) N."
- [ ] Decrementação até 0 permitida em planos 2-3 (bloqueio só no Confirmar, não no `-`)
- [ ] Plano 1 pão: `-` da única row em qty=1 disabled (`totalPaes === 1 && sumAll <= 1`)
- [ ] Capacity card sem "— cheio"
- [ ] Capacity card vira `is-invalid` (warning bg) quando `sumAll !== totalPaes`
- [ ] Botão `+` em row esmaecida com cor brand-500 (mais claro)
- [ ] Desc descritivo dos pães removido ("Levain de 12 anos..." e "100% trigo integral...")

---

## 6. Smoke test (cobertura completa pós-mudanças)

Com Beatriz (plano 2 pães baseline 1+1):

**1. Estado normal com extras:**
- Drawer abre
- Sua Assinatura colapsada — header + "1× Original + 1× Integral" + chevron `⌄`
- Extras desta semana expandida — lista, total card
- Footer: "Cancelar" + "Confirmar pedido" disabled (sem alteração nem extras novos)

**2. Estado normal SEM extras:**
- Mesma cesta, sem extras adicionados
- Sua Assinatura colapsada — igual
- Extras: empty state com "Nada adicionado pra esta semana." + sub + CTA "Ver cardápio →"
- Total card oculto
- Footer: "Cancelar" + "Sem alterações" disabled

**3. Click "Ver cardápio":** Drawer fecha, navega pra tela Cardápio

**4. Expand Assinatura manualmente** (sem alteração):
- Click no header → expande
- Chevron vira `⌃`
- Rows com QtyStepper, capacity card "2 de 2 pães" (sem "— cheio")
- Sem pill, sem link revert, sem microcopy

**5. Swap atômico:** click `+` Original com cesta em 1+1 → swap atômico → 2+0
- Seção Assinatura JÁ ESTAVA aberta (caso 4) ou auto-expande se estava colapsada
- Pill "Trocado só esta semana" aparece no header
- Composição compacta vira "2× Original"
- Linha Integral esmaecida (`is-zero`), `+` em brand-500
- Link "Voltar pro padrão (1× Original + 1× Integral)"
- Microcopy "Vale só pra entrega de..."
- Footer: "Confirmar pedido" enabled

**6. Composição inválida** (sumAll < totalPaes):
- Click `-` em Original (1+1) → vai pra 0+1 (sumAll=1, totalPaes=2)
- Capacity card vira warning bg
- Microcopy "Sua cesta precisa de 2 pães. Falta 1." abaixo do capacity
- Footer: "Confirmar pedido" disabled
- Click `+` Integral: vai pra 0+2 (sumAll=2, válido)
- Footer enabled

**7. Plano 1 pão (modificar seed temporariamente):**
- Cesta 1+0, totalPaes=1
- Click `+` Integral → swap atômico → 0+1
- Click `-` Integral → bloqueado (sumAll=1 && totalPaes=1)

**8. Pós-confirmado:**
- Confirma pedido
- Reabre Drawer
- Sua Assinatura colapsada, opacity 0.55, sem chevron clicável
- Extras: rows disabled, opacity 0.55
- Footer: "Confirmado ✓" disabled

---

## 7. Notas

- **Cumulativo:** este briefing v2 é INCREMENTAL sobre o que já está implementado na branch. CC não precisa refazer do zero — só adicionar/modificar conforme as 11 mudanças listadas.
- **Wireframe v2 do CD:** commitar no início do trabalho como `docs/Assinatura no Drawer v2 _standalone_.html`.
- **Briefing v1 mantém-se válido** pras decisões anteriores (lógica do swap atômico, comparação de composição, etc).
- **Branch única:** continua `feat/drawer-assinatura-qtystepper`. Sem PR novo.

---

## 8. Referências

- Wireframe v2 (fonte primária visual): `docs/Assinatura no Drawer v2 _standalone_.html`
- Briefing v1: `docs/CORA_Briefing_Drawer_Assinatura_QtyStepper.md`
- Task ClickUp: [86e1d777a](https://app.clickup.com/t/86e1d777a)
- Wireframe v1 da seção (decisões originais da pill, link, microcopy): `docs/Assinatura no Drawer _standalone_.html`
