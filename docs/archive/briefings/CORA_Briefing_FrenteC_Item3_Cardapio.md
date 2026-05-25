# Briefing Técnico — Frente C item 3 (Cardápio + ajustes na Home)

**Versão:** 1
**Data:** 2026-05-14
**Status:** Pronto pra implementação no Claude Code
**Branch sugerida:** `feat/cardapio-refactor`

---

## 1. Contexto

Após a Frente C item 1 (PRs `f18335f` backend + `b88f410` frontend, mergeados em 13/05/2026), validação manual e revisão de UX trouxeram 3 grupos de mudanças que precisam entrar:

1. **Refactor do Cardápio** (Frente C item 3): aviso de cobrança, expand inline no ProductCard, NovidadeCard Hero reintroduzido
2. **Ajustes na Home** (alterações vs PR 2): saudação unificada, `×` → `[- N +]` no Card de Cesta, "Editar cesta", animação de remoção
3. **Tom de voz**: "Carrinho" → "Cesta" em todas as superfícies

**Decisões de produto:** `docs/CORA_FrenteC_Item3_Cardapio_Decisoes.md` (v3, fechadas em 14/05/2026)

**Referência visual:** `Cardapio_Wireframe_v2__standalone_.html` (commitar no `docs/` antes de começar — fonte primária de verdade pro layout, microcopy e comportamento de cada tela)

---

## 2. Estado atual (commit `01eb027`)

**Já implementado e funcionando (não mexer):**
- State `weeklyOrders` + `currentWeeklyOrder` derivado
- Handlers canônicos: `addExtraToCart`, `removeExtraFromCart`, `updateComposition`, `confirmCurrentOrder`
- `useEffect` de GET sync na montagem
- POST otimista com rollback em erro
- Cutoff em UTC, `nextEditableThursdayISO` exportado de `src/utils/cutoff.js`
- Cron de aviso de abandono
- Compat shim `confirmedLegacy` pro Perfil

**A reverter (decisões do PR 2 a desfazer):**
- `ProductCard.jsx`: props `onCardClick` e `inBasketLabel`
- `App.jsx` (Cardápio): click no card que abre Modal sobreposto
- Card de Cesta da Home: `×` na linha de extra
- Saudação "primeiro acesso" ("Que bom ter você aqui, [nome].") — substituir pela saudação temporal unificada

---

## 3. Mudanças por componente

### 3.1 `src/components/ProductCard.jsx`

**Remover props:**
- `onCardClick`
- `inBasketLabel`

**Adicionar comportamento de expand inline:**
- State local: `expanded` (boolean)
- Click em qualquer área da `.row` (foto + info + price-row) alterna `expanded`
- Click no botão "Adicionar à cesta" tem `stopPropagation` — NUNCA expande/colapsa

**Estrutura visual (ver wireframe v2 tela 1 e 2):**
```jsx
<div className={`product-card ${expanded ? 'is-expanded' : ''}`}>
  <div className="row" onClick={() => setExpanded(!expanded)}>
    <div className="photo">{/* foto 88×88 */}</div>
    <div className="info">
      <div className="name">{nome}</div>
      <div className="meta">{peso}</div>
      <div className="desc">{descricaoCurta}</div>
      <div className="price-row">
        <span className="price">R$ {precoFormatado}</span>
        <span className="expand-hint">
          detalhes <ChevronDownIcon />
        </span>
      </div>
    </div>
  </div>

  <div className="cta-zone">
    <button 
      className="add-btn" 
      onClick={(e) => { e.stopPropagation(); onAdd?.(product); }}
    >
      <PlusIcon /> Adicionar à cesta
    </button>
  </div>

  {expanded && (
    <div className="accordion">
      <div className="acc-label">Sobre</div>
      <p className="acc-body">{sobre}</p>
      <div className="acc-label">Ingredientes</div>
      <div className="acc-ingredients">
        {ingredientes.map(i => <span className="ing-chip">{i}</span>)}
      </div>
      <button className="acc-close" onClick={() => setExpanded(false)}>
        <ChevronUpIcon /> Fechar detalhes
      </button>
    </div>
  )}
</div>
```

**Manter intacto:**
- Prop `directQtySelector` (usada no Onboarding e PreCadastro) — sem impacto
- Lógica de `lockedReason` (pending_payment) — sem impacto

**Múltiplos cards podem ficar abertos simultaneamente.** Não implementar lógica de "1-aberto-por-vez".

### 3.2 `src/App.jsx` — Cardápio

**Reverter:**
- Click no card que abre Modal sobreposto (`onCardClick` callback)
- Indicator estático "✓ N× na sua cesta" (`inBasketLabel`)
- Banner verde "× confirmado" no topo (legacy do PR 2)

**Adicionar acima da lista:**
- Linha micro-tipográfica: `"Extras entram na sua próxima fatura."` com mini-ícone de cartão (`warm-500`, 14×14 stroke 1.5), abaixo do aviso de cutoff existente
- NovidadeCard Hero da semana (ver 3.3)

**Lista de ProductCards:**
- Passar prop `onAdd={addExtraToCart}` 
- Sem `onCardClick` (expand é gerenciado pelo próprio ProductCard)
- Sem `inBasketLabel`

**Remover:**
- Helpers velhos do PR 2 anterior se sobraram (Modal sobreposto, `setProdutoSelecionado`, etc — limpar imports e referências)

### 3.3 `src/App.jsx` — NovidadeCard Hero (Home + Cardápio)

Componente reutilizado em 2 lugares (Home abaixo do Card de Cesta, Cardápio antes da lista).

**Estrutura (ver wireframe v2):**
```jsx
<div className="novidade-hero">
  <div className="hero-photo" style={{backgroundImage: `url(${novidade.foto})`}}>
    <span className="tag">Novidade da semana</span>
  </div>
  <div className="body">
    <div className="name">{novidade.nome}</div>
    <div className="meta">{novidade.peso} · estreia desta quinta</div>
    <p className="sub">{novidade.subcopy}</p>
    <button className="add-btn-split" onClick={() => addExtraToCart(novidade)}>
      <span className="label">
        <PlusIcon /> Adicionar à cesta
      </span>
      <span className="price">R$ {novidade.precoFormatado}</span>
    </button>
  </div>
</div>
```

**Sub-copy:** texto emocional curto, definido por produto no mock D (ex: focaccia → "Pra um café da tarde diferente."). Existe campo `desc` ou similar — verificar e usar.

### 3.4 `src/App.jsx` — Card de Cesta da Home

**Saudação:** substituir lógica de "primeiro acesso" + "recorrente" por saudação temporal única:
```js
const hora = new Date().getHours();
const periodo = hora < 12 ? 'bom dia' : hora < 18 ? 'boa tarde' : 'boa noite';
const saudacao = `Oi, ${nome}, ${periodo}!`;
```

Sem flexão de gênero. Sem mensagem especial de boas-vindas. Remove campo `genero` da saudação (mantém genero no catálogo de produtos pra toast).

**Lista de itens do Card de Cesta:**
- Linhas de assinatura (composition): mostrar `"X× Pão Original"` + tag "Assinatura" + `"Incluso"` à direita. Sem controle de quantidade.
- Linhas de extras: mostrar `"X× Nome"` + preço + controle `[- N +]` à direita. Substitui o `×` atual.
- Quando user diminui extra até 0: dispara animação slide-out + fade (200ms) na linha, depois `removeExtraFromCart`

**Total no rodapé do card:**
```
Extras desta semana   R$ X,XX
```

(Só extras. Assinatura não soma porque é coberta pelo plano mensal.)

**Botão "Editar cesta"** (link ghost com ícone):
```jsx
<button className="edit-cesta-link" onClick={() => setDrawerOpen(true)}>
  <EditIcon /> Editar cesta
</button>
```

**Animação de remoção (especificação técnica):**
```css
.cesta-row.removing {
  animation: slideOutFade 200ms ease-out forwards;
}
@keyframes slideOutFade {
  to {
    opacity: 0;
    transform: translateX(40px);
    max-height: 0;
    padding-top: 0;
    padding-bottom: 0;
    margin: 0;
  }
}
```

Lógica:
1. Click no `-` quando qty=1 → adiciona classe `.removing` à row
2. Setar timer de 200ms
3. Após 200ms, dispara `removeExtraFromCart` (que faz POST)

### 3.5 `src/App.jsx` — Drawer "Editar cesta"

**Mudanças de copy:**
- Título: `"Editar carrinho"` → `"Editar cesta"`
- Toast pós-confirmar: `"Carrinho atualizado"` → `"Cesta atualizada"`

**Seção SUA ASSINATURA:**
- Manter radio slots Original/Integral (já está OK)
- Texto à direita de cada slot: `"Incluso"` (em vez do preço)

**Seção EXTRAS DESTA SEMANA:**
- Substituir `×` por controle `[- N +]` por linha (mesmo padrão da Home)
- Animação de remoção idêntica (slide-out + fade quando chega em 0)

**Microcopy do rodapé:**
```
💳 Extras entram na sua próxima fatura. Alterações até terça, 12h.
```

**Botões do rodapé:** mantém Cancelar (ghost, flex:1) + Confirmar pedido (primary, flex:2).

### 3.6 `src/App.jsx` — Nav inferior (badge no Início)

**Adicionar badge visual no item "Início" quando há rascunho:**

```jsx
<button className="nav-item">
  <HomeIcon />
  <span className="lbl">Início</span>
  {currentWeeklyOrder?.status === 'rascunho' && (
    <span 
      className="badge-dot" 
      aria-label="Você tem alterações na cesta"
    />
  )}
</button>
```

**CSS:**
```css
.nav-item { position: relative; }
.badge-dot {
  position: absolute;
  top: 6px; right: 36%; /* aproximado, ajustar ao ícone */
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--brand-500);
}
```

Sem número. Apenas presença/ausência.

---

## 4. Catálogo (mock D) — campos adicionados/confirmados

### `D.extras`, `D.pães`, `D.rotativos` — campo `genero`

Confirmar/adicionar campo `genero: 'm' | 'f'` em cada produto pra flexão correta do toast:

```js
D.extras = [
  { id: 'focaccia', nome: 'Focaccia Genovesa', genero: 'f', /* ... */ },
  { id: 'brioche', nome: 'Brioche', genero: 'm', /* ... */ },
  // ...
];
D.pães = [
  { id: 'original', nome: 'Pão Original', genero: 'm', /* ... */ },
  // ...
];
```

Default `'m'` se faltar (defensivo).

---

## 5. Critérios de aceite

### 5.1 Cardápio

- [ ] Linha "Extras entram na sua próxima fatura." aparece abaixo do aviso de cutoff
- [ ] NovidadeCard Hero aparece antes da lista de ProductCards
- [ ] Click no botão "Adicionar à cesta" do Hero dispara POST + toast com flexão correta
- [ ] ProductCards: click na row alterna expanded/collapsed inline
- [ ] ProductCards: múltiplos podem estar abertos simultaneamente
- [ ] ProductCards: click no botão "Adicionar à cesta" NÃO afeta expand state, dispara POST + toast
- [ ] Banner verde "× confirmado" removido
- [ ] Modal sobreposto não abre mais ao clicar no card
- [ ] `npm run build` passa sem erro

### 5.2 Home

- [ ] Saudação usa formato "Oi, [nome], [bom dia/boa tarde/boa noite]!"
- [ ] Mensagem "Que bom ter você aqui, [nome]." não aparece em nenhum cenário (1º acesso ou recorrente)
- [ ] Card de Cesta tem 4 linhas no cenário misto (2 assinatura "Incluso" + 2 extras com `[- N +]`)
- [ ] Linhas de extras têm controle `[- N +]` em vez de `×`
- [ ] Diminuir extra até 0 dispara animação slide-out + fade (sem toast)
- [ ] Total no rodapé do card mostra "Extras desta semana R$ X,XX" (só extras)
- [ ] Botão "Editar cesta" é link ghost com ícone de pencil
- [ ] NovidadeCard Hero mantido abaixo do Card de Cesta

### 5.3 Drawer "Editar cesta"

- [ ] Título do drawer é "Editar cesta"
- [ ] Slots de assinatura mostram "Incluso" à direita
- [ ] Linhas de extras têm `[- N +]`
- [ ] Animação de remoção igual à da Home
- [ ] Toast pós-confirmar diz "Cesta atualizada" (não "Carrinho atualizado")
- [ ] Microcopy do rodapé: "Extras entram na sua próxima fatura. Alterações até terça, 12h."

### 5.4 Nav inferior

- [ ] Badge `brand-500` aparece no ícone Início quando `currentWeeklyOrder?.status === 'rascunho'`
- [ ] Badge tem `aria-label="Você tem alterações na cesta"`
- [ ] Badge some quando status muda pra `confirmado` ou quando não há `currentWeeklyOrder`

### 5.5 Toasts

- [ ] Stack até 3 toasts simultâneos
- [ ] Flexão de gênero correta: "Focaccia adicionada", "Brioche adicionado", etc
- [ ] Auto-dismiss em 3.5s
- [ ] 4º toast empurra o mais antigo (fadeOut 200ms)

### 5.6 Build / Lint / Test

- [ ] `npm run build` passa
- [ ] `npm run lint` não introduz erros novos além do baseline
- [ ] `npm run test:cutoff` 6/6
- [ ] Sem erros do app no Console em runtime

---

## 6. O que NÃO mudar

- Backend (`weekly_orders`, endpoints, cron) — está estável, não tocar
- Onboarding e PreCadastro (apesar de usarem ProductCard, o `directQtySelector` permanece intacto)
- Splash, CapacityWaitlist
- Banner de pending_payment
- Tela "Sua Assinatura"
- Tela "Perfil" (compat shim `confirmedLegacy` ainda alimenta `totalOf` aqui — manter)
- Cutoff (lógica em UTC, `nextEditableThursdayISO`)
- Modal de detalhes — pode ser removido do código se sobrou só pra essa função (que sai), ou pode ficar inerte se preferir refactor menor

---

## 7. Estratégia recomendada de implementação

### Fase 1 — Cardápio (mais isolado, valida sozinho)
- ProductCard com accordion inline
- App.jsx: linha de cobrança + NovidadeCard Hero no Cardápio
- Remover Modal sobreposto + props `onCardClick`/`inBasketLabel`

**Critério de Parada 1:** Cardápio funciona como esperado, ProductCards expandem, botão Adicionar funciona, toast aparece. F5 mantém estado.

### Fase 2 — Home (Card de Cesta + saudação + Nav)
- Saudação unificada
- Card de Cesta com `[- N +]` + animação de remoção
- Linhas de assinatura "Incluso", linhas mistas separadas
- Botão "Editar cesta" link ghost
- Badge no Nav Início

**Critério de Parada 2:** Home renderiza corretamente, cenário misto funciona, badge aparece/some, animação de remoção fluida.

### Fase 3 — Drawer
- Renomear título e copy interna
- Substituir `×` por `[- N +]` na seção EXTRAS DESTA SEMANA
- Animação de remoção
- Toast "Cesta atualizada"

**Critério de Parada 3:** Drawer completo testado, pronto pra PR.

---

## 8. Pendências fora do escopo

### Resolve neste PR (da task 86e1c2bnj):
- Item 1 — copy de cobrança ✅
- Item 3 — touch-target `×` (removido) ✅
- Item 7 — branch `qty>0` inerte no Modal (Modal sai) ✅
- Item 9 — peso/tamanho inconsistente nos extras no Drawer ✅

### Fica fora (vide task 86e1c2bnj):
- Item 2 — Skeleton no card de cesta
- Item 4 — Extrair Drawer pra arquivo separado
- Item 5 — `cestaSemana` legacy paralelo ao POST
- Item 6 — Rollback silencioso pós-cutoff
- Item 8 — `D.entrega.data` field sem callers

### Discussão estratégica em aberto (task 86e1c2yh3):
- Itens 2 e 3 da discussão Drawer (redundância de microcopy + compromisso forçado) continuam pra sessão dedicada com Mariane

---

## 9. Estrutura de PR sugerida

- **Branch:** `feat/cardapio-refactor`
- **Commits internos** (a serem squashed no merge):
  - `refactor(productcard): expand inline + reverter props PR 2`
  - `feat(cardapio): linha de cobrança + NovidadeCard Hero`
  - `refactor(home): saudação unificada + [- N +] + Editar cesta + badge Nav`
  - `refactor(drawer): cesta vocabulary + [- N +]`
- **Validação manual em Preview** (deploy automático ao push)
- **Squash merge** quando aprovado

---

## 10. Referências

- Doc de decisões: `docs/CORA_FrenteC_Item3_Cardapio_Decisoes.md`
- Wireframe v2 (fonte primária visual): `docs/Cardapio_Wireframe_v2__standalone_.html` (commitar antes de começar)
- Briefing técnico do PR 2 da Frente C item 1: `docs/CORA_Briefing_FrenteC_Item1_Home.md`
- Style guide visual implícito no CSS do wireframe v2 (design tokens já corretos)
