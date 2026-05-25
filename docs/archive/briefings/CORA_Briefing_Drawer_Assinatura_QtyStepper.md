# Briefing Técnico — Refactor da seção SUA ASSINATURA do Drawer

**Versão:** 1
**Data:** 2026-05-15
**Status:** Pronto pra implementação no Claude Code
**Branch sugerida:** `feat/drawer-assinatura-qtystepper`
**Task ClickUp:** [86e1d777a](https://app.clickup.com/t/86e1d777a)

---

## 1. Contexto

Após o merge da Frente C item 3 (`d8544aa` em main), durante validação visual descobrimos uma inconsistência conceitual na seção SUA ASSINATURA do Drawer "Editar cesta": quando o cliente tem 2-3 pães e troca os tipos entre slots, o sistema marca como alteração (mostra pill "Trocado") mesmo quando a composição final é idêntica à da assinatura.

**Raiz:** UI atual é posicional (slots Pão 1, Pão 2, Pão 3 com radio), mas operacionalmente o que importa é a composição total (quantos de cada tipo).

**Decisão de produto:** substituir slots posicionais por **QtyStepper por tipo de pão**, mesma metáfora dos extras. User ajusta quantidades por tipo, sistema cuida da composição.

**Documentação:**
- Wireframe v1 do Claude Design: `docs/Assinatura_no_Drawer_(standalone).html` (fonte primária visual — commitar antes de começar)
- Discussão UX completa e decisões: task ClickUp [86e1d777a](https://app.clickup.com/t/86e1d777a)

---

## 2. Estado atual no código (a substituir)

**Localização:** `EditarCestaDrawer` (inline em `src/App.jsx`), seção SUA ASSINATURA.

**Hoje:**
- Renderiza N "slots" baseados em `subscription.total_paes` (1, 2 ou 3)
- Cada slot tem 2 radio buttons: Pão Original e Pão Integral
- Cada slot tem label "Pão 1", "Pão 2", "Pão 3"
- `setSlot(slotIdx, tipo)` reconstrói a composição baseada nos slots
- Debounce 300ms + `postCurrentOrder({ composition: novoEstado })`
- Pill "Trocado" inline ao lado do peso do slot quando slot != baseline

**Por que esse modelo gera confusão:**
- Cliente com plano 2 pães (1 Original + 1 Integral) pode trocar Slot 1 → Integral e Slot 2 → Original. Composição final = idêntica ao baseline, mas a UI marca como alteração porque os slots posicionais mudaram

---

## 3. Mudanças por componente

### 3.1 Seção SUA ASSINATURA — nova estrutura

**De:**
```jsx
// Posicional
slots.map((slot, idx) => (
  <div className="slot">
    <label>Pão {idx + 1}</label>
    <RadioGroup>
      <Radio value="original" />
      <Radio value="integral" />
    </RadioGroup>
  </div>
))
```

**Para:**
```jsx
// Por tipo
<div className="sec-label-row">
  <span className="sec-label">Sua assinatura</span>
  {hasAlteration && (
    <span className="chg-pill">
      <BulletIcon /> Trocado só esta semana
    </span>
  )}
</div>
<p className="sec-context">{total_paes} pães por semana · ajuste só esta semana</p>

<div className="asn-list">
  <div className={`asn-row ${qtyOriginal === 0 ? 'is-zero' : ''}`}>
    <div className="left">
      <div className="name">Pão Original <span className="name-meta">· 700g</span></div>
    </div>
    <QtyStepper
      qty={qtyOriginal}
      onIncrement={...}
      onDecrement={...}
      variant="neutral"
      disabled={cutoff || pendingPayment}
    />
  </div>
  <div className={`asn-row ${qtyIntegral === 0 ? 'is-zero' : ''}`}>
    {/* mesmo padrão pra Integral */}
  </div>
</div>

<div className="capacity">
  <span className="lbl">Total da semana</span>
  <span>
    <span className="n">{sumAll}</span> de {total_paes} pães
    {sumAll === total_paes && <span className="full"> — cheio</span>}
  </span>
</div>

{hasAlteration && (
  <button className="revert-link" onClick={revertToBaseline}>
    <UndoIcon /> Voltar pro padrão ({renderBaselineComposition()})
  </button>
)}

{hasAlteration && (
  <div className="microcopy">
    <InfoIcon />
    <span>
      Vale só pra entrega de {deliveryDateFormatted}. Pra mudar sua assinatura permanente,{' '}
      <a onClick={() => navigateTo('assinatura')}>vá em Assinatura</a>.
    </span>
  </div>
)}
```

### 3.2 Lógica de comparação `hasAlteration`

```js
const baseline = subscription.itens; // { original: N, integral: M } da assinatura
const current = currentWeeklyOrder?.composition || baseline;

const hasAlteration = !deepEqual(current, baseline);
// ou comparação simples campo a campo:
// const hasAlteration = current.original !== baseline.original || current.integral !== baseline.integral;
```

**Importante:** `hasAlteration` é calculado por COMPOSIÇÃO (estado final), não por contagem de cliques. Se o user mexe e volta ao baseline, `hasAlteration` vira false e pill some.

### 3.3 Handlers de incremento/decremento

```js
const handleIncrement = (tipo) => {
  const sumAll = (currentComposition.original || 0) + (currentComposition.integral || 0);
  if (sumAll >= total_paes) return; // atingiu o teto

  const newComposition = {
    ...currentComposition,
    [tipo]: (currentComposition[tipo] || 0) + 1
  };
  postCurrentOrderDebounced({ composition: newComposition });
};

const handleDecrement = (tipo) => {
  const sumAll = (currentComposition.original || 0) + (currentComposition.integral || 0);
  if (currentComposition[tipo] <= 0) return; // já em 0
  if (sumAll <= 1) return; // bloqueio do 0 total (cesta sem pão)

  const newComposition = {
    ...currentComposition,
    [tipo]: currentComposition[tipo] - 1
  };

  // Se zerou, mantém a key como 0 (não deleta) — UI precisa renderizar `is-zero`
  postCurrentOrderDebounced({ composition: newComposition });
};
```

**Bloqueios:**
- `+` disabled quando `sumAll === total_paes` (capacity atingido)
- `-` disabled quando `qty === 0` (já em 0)
- `-` da última linha em qty=1 disabled quando `sumAll === 1` (evita estado inválido 0/0)

### 3.4 `revertToBaseline()`

```js
const revertToBaseline = () => {
  // Reposta a composition ao baseline da assinatura
  postCurrentOrderDebounced({ composition: subscription.itens });
};
```

Não pede confirmação modal — é reversível pelo histórico de cliques. Após chamada, `composition === baseline` → `hasAlteration` vira false → pill + microcopy + link somem.

### 3.5 `renderBaselineComposition()`

Texto dinâmico do link "Voltar pro padrão", recomposto pela composição real do cliente:

```js
const renderBaselineComposition = () => {
  const parts = [];
  if (subscription.itens.original > 0) {
    parts.push(`${subscription.itens.original}× Original`);
  }
  if (subscription.itens.integral > 0) {
    parts.push(`${subscription.itens.integral}× Integral`);
  }
  return parts.join(' + ');
};
```

**Exemplos:**
- Plano 1 pão Original: "1× Original"
- Plano 2 pães misto: "1× Original + 1× Integral"
- Plano 3 pães 2+1: "2× Original + 1× Integral"
- Plano 1 pão Integral: "1× Integral"

---

## 4. CSS / Design tokens

Conforme wireframe v1 do CD (referência visual). Pontos críticos:

### 4.1 Pill "Trocado só esta semana"

Aparece SÓ quando `hasAlteration`. Sem pill "No padrão" no estado baseline.

```css
.chg-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: var(--warning-bg, #FEF3C7);
  border: 1px solid var(--warning-border, #FCD34D);
  color: var(--warning-text, #92400E);
  border-radius: 4px;
  font-family: var(--font-display); /* League Gothic */
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
```

### 4.2 `asn-row` (linha do tipo de pão)

```css
.asn-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--warm-200);
}
.asn-row:last-child { border-bottom: none; }
.asn-row.is-zero { opacity: 0.55; }
.asn-row.is-zero .name { color: var(--warm-500); }
```

### 4.3 Capacity card

```css
.capacity {
  margin-top: 14px;
  padding: 10px 14px;
  background: var(--warm-100);
  border-radius: var(--radii-md);
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--warm-700);
}
.capacity .n { font-weight: 600; }

/* Estado "cheio" */
.capacity.is-full {
  background: var(--warning-bg, #FEF3C7);
  color: var(--warning-text, #92400E);
}
.capacity .full {
  font-weight: 600;
}
```

### 4.4 Link "Voltar pro padrão"

```css
.revert-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 6px 0;
  background: transparent;
  border: none;
  font-family: var(--font-display);
  font-size: 11px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--brand-500);
  cursor: pointer;
}
.revert-link:hover { text-decoration: underline; }
```

### 4.5 Microcopy "vale só esta semana"

```css
.microcopy {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 0;
  font-size: 12px;
  color: var(--warm-500);
  line-height: 1.4;
}
.microcopy a {
  color: var(--brand-500);
  text-decoration: underline;
}
```

### 4.6 QtyStepper variant `neutral` (já existe)

Reusa o componente atual. Variant `neutral` é a usada no Drawer (borda `warm-300` sobre fundo `#FFF`). Sem mudança necessária.

---

## 5. Mudanças em outros lugares

### 5.1 Remoção do código antigo

- Remover lógica de `slots` posicionais
- Remover função `setSlot(slotIdx, tipo)` ou equivalente
- Remover labels "Pão 1", "Pão 2", "Pão 3"
- Remover radio groups por slot

### 5.2 Inalterado

- Backend (endpoints `/api/weekly-orders/*`) — não precisa mudar, `composition` continua sendo `{ original: N, integral: M }`
- `postCurrentOrder` handler — recebe a nova composition direto
- Debounce 300ms — mantém igual
- Resto do Drawer (header, extras, total, microcopy do rodapé, 2 botões, animação) — intacto
- Home — não muda
- Cardápio — não muda
- Onboarding — não muda

---

## 6. Estados a cobrir (do wireframe v1)

1. **Plano 1 pão padrão:** qty Original=1, qty Integral=0 (esmaecido). Sem pill, sem microcopy, sem link. Capacity "1 de 1 pão".
2. **Plano 2 pães padrão:** qty Original=1, qty Integral=1. Sem pill. Capacity "2 de 2 pães".
3. **Plano 2 pães alterado:** qty Original=2, qty Integral=0 (esmaecido). Pill "Trocado só esta semana", microcopy contextual, link "Voltar pro padrão (1× Original + 1× Integral)". Capacity "2 de 2 pães".
4. **Plano 3 pães padrão:** qty Original=2, qty Integral=1. Sem pill. Capacity "3 de 3 pães".
5. **Limite atingido:** sumAll === total_paes. Capacity vira `is-full` (warning bg), label "— cheio", botão `+` disabled silencioso.
6. **Pós-cutoff:** opacity 0.55, controles disabled, microcopy "Prazo encerrado..." conforme o resto do Drawer.

---

## 7. Critérios de aceite (Parada)

- [ ] `npm run build` passa
- [ ] `npm run lint` no baseline (18/17/1)
- [ ] `npm run test:cutoff` 6/6
- [ ] Seção SUA ASSINATURA usa QtyStepper por tipo (Original + Integral), variant `neutral`
- [ ] Labels "Pão 1"/"Pão 2"/"Pão 3" e radios removidos
- [ ] Pill "Trocado só esta semana" aparece no `sec-label` quando `composition !== baseline`
- [ ] Pill some quando composition volta a baseline (mesmo via cliques manuais)
- [ ] Link "Voltar pro padrão" aparece quando alterado, com texto dinâmico baseado em `subscription.itens`
- [ ] Click no link reverte composition pro baseline (sem confirmação)
- [ ] Microcopy "Vale só pra entrega de dd/mm. Pra mudar sua assinatura permanente, vá em Assinatura." aparece quando alterado, com link inline navegando pra tela Assinatura
- [ ] Linha qty=0 mantém visível esmaecida (`is-zero`)
- [ ] Capacity card mostra "Total da semana: X de Y pães"
- [ ] Capacity card vira `is-full` (warning bg + "— cheio") quando sumAll === total_paes
- [ ] Botão `+` disabled silencioso quando capacity atingido
- [ ] Botão `-` disabled quando qty === 0
- [ ] Botão `-` da última linha em qty=1 disabled quando sumAll === 1 (bloqueio 0 total)
- [ ] Cutoff: opacity 0.55, controles disabled
- [ ] Pós-confirmado: opacity 0.55, controles disabled (mesmo tratamento de cutoff)
- [ ] Sem regressão na Home, Cardápio, Onboarding

---

## 8. O que NÃO mudar

- Backend (`weekly_orders`, endpoints, schema) — estável
- Home (Card de Cesta, badge no Nav, saudação) — intocada
- Cardápio (ProductCard, NovidadeCard, lista uniforme) — intocado
- Drawer: resto da estrutura (header, extras, total, microcopy do rodapé, 2 botões, animação de remoção) — intocado
- Onboarding e PreCadastro — intocados
- ToastStack — intocado
- Componente `QtyStepper` — reusa como está (variant `neutral`)

---

## 9. Estratégia recomendada de implementação

### Fase única (PR pequeno, escopo isolado)

Diferente da Frente C item 3 que tinha 3 fases, este PR é menor e pode ser feito em 1 fase única:

1. Reescrever a seção SUA ASSINATURA do `EditarCestaDrawer` com a nova estrutura (QtyStepper por tipo + lógica `hasAlteration` + capacity + link revert + microcopy)
2. Remover código antigo de slots posicionais
3. Adicionar handlers `handleIncrement`, `handleDecrement`, `revertToBaseline`, `renderBaselineComposition`
4. Validar build/lint/test
5. Smoke test em Preview com seed da Beatriz (plano 2 pães)
6. Cenários a testar: padrão, alterado real, swap puro (1+1 → 0+2), limite atingido, voltar pro padrão, cutoff

### Estimativa

~1 dia útil. Maior parte do trabalho é JSX + CSS conforme wireframe, lógica é simples.

---

## 10. Referências

- Wireframe v1 do CD (fonte primária visual): `docs/Assinatura_no_Drawer_(standalone).html` — commitar no PR antes de começar
- Task ClickUp: [86e1d777a](https://app.clickup.com/t/86e1d777a)
- Briefing da Frente C item 3 (referência de padrão técnico): `docs/CORA_Briefing_FrenteC_Item3_Cardapio.md`
- Wireframe v2 do Drawer (estado atual da Fase 3): `docs/Cardapio Wireframe v2 _standalone_.html` tela 5
