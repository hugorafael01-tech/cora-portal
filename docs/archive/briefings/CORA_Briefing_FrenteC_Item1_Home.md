# Briefing técnico — Frente C · Item 1: Hierarquia da Home

**Data:** 12/05/2026 (revisão v2)
**Status:** Decisões fechadas. Pronto pra implementação.
**Doc fonte de decisões:** `docs/CORA_FrenteC_HomeHierarquia_Decisoes.md`
**Doc fonte de feedbacks:** `docs/CORA_Telas_Internas_Pendencias.md` item 2.2.1

**Mudanças v2 (12/05 tarde):**
- Cutoff utilitário trabalha em UTC (Vercel roda em UTC). 5 casos de teste obrigatórios.
- Aviso de carrinho abandonado **vai pra Fase 1** via Vercel Cron (era Fase 2). Novos campos no schema, novo endpoint, novo env var.
- Sumário do drawer simplificado: linha única "Total de extras desta semana".
- Copy ajustada: estado vazio da novidade, erro pós-cutoff, formato de data dd/mm, toast pós-adicionar.

---

## 1. Objetivo

Refatorar a Home do portal pra tratar a cesta da semana como um **carrinho persistido com confirmação explícita**. Toda alteração (swap, extras, remoção) é salva no servidor imediatamente como rascunho. Cliente precisa confirmar o pedido antes do cutoff (terça 12h da semana anterior à entrega). Sem confirmação, o rascunho é descartado no cutoff e só a assinatura padrão é entregue.

Mata o sistema atual de `pending` / `confirmed` em React state. Mata o `OrderFooter` e o `ConfirmedFooter`. Migra Cardápio pro mesmo padrão (POST direto no rascunho via modal de detalhes).

---

## 2. Modelo conceitual

**Cesta = carrinho global da semana.** Cada `subscription` tem no máximo um `weekly_order` por `delivery_date`. O pedido existe em dois estados:

- **`rascunho`**: cliente está editando. Toda alteração persiste imediatamente.
- **`confirmado`**: cliente clicou em "Confirmar pedido". Pronto pra produção.

Se cliente edita um pedido `confirmado`, ele volta automaticamente pra `rascunho` e precisa re-confirmar.

**Default:** se não existe `weekly_order` pra uma semana, a cesta segue a assinatura padrão (sem extras, sem swap). Cliente que não interage não precisa fazer nada.

**Cutoff:** terça-feira 12:00 BRT da semana anterior à entrega de quinta. Validado no servidor e no front.

**O que acontece no cutoff:**
- Pedidos `rascunho` não confirmados são descartados (cliente recebe só a assinatura padrão)
- Pedidos `confirmado` vão pra produção
- E-mail/WhatsApp 2h antes e 2h depois do cutoff: **fase 2**, não implementa agora

---

## 3. Backend

### 3.1 Migration `supabase/migrations/0002_weekly_orders.sql`

```sql
-- ============================================================
-- Cora — Migration 0002: weekly_orders (Frente C item 1)
-- ============================================================

CREATE TYPE weekly_order_status AS ENUM ('rascunho', 'confirmado');

CREATE TABLE weekly_orders (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id               UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  delivery_date                 DATE NOT NULL,
  composition                   JSONB,                              -- {original: 1, integral: 1} ou null se segue assinatura
  extras                        JSONB NOT NULL DEFAULT '[]',        -- [{id, nome, qty, preco_unit}]
  total_extras                  NUMERIC(10,2) NOT NULL DEFAULT 0,
  status                        weekly_order_status NOT NULL DEFAULT 'rascunho',
  confirmed_at                  TIMESTAMPTZ,
  first_extra_added_at          TIMESTAMPTZ,                        -- inicia timer de aviso de abandono
  abandonment_warning_sent_at   TIMESTAMPTZ,                        -- marca quando o cron disparou o email
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT weekly_orders_unique_per_week
    UNIQUE (subscription_id, delivery_date),
  CONSTRAINT weekly_orders_delivery_is_thursday
    CHECK (EXTRACT(DOW FROM delivery_date) = 4)
);

CREATE INDEX weekly_orders_subscription_idx ON weekly_orders(subscription_id);
CREATE INDEX weekly_orders_delivery_date_idx ON weekly_orders(delivery_date);
CREATE INDEX weekly_orders_status_idx ON weekly_orders(status);

-- Índice parcial otimizado pra query do cron de abandono
CREATE INDEX weekly_orders_abandonment_pending_idx
  ON weekly_orders(first_extra_added_at, delivery_date)
  WHERE status = 'rascunho'
    AND abandonment_warning_sent_at IS NULL
    AND first_extra_added_at IS NOT NULL;

ALTER TABLE weekly_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny all" ON weekly_orders
  FOR ALL TO public USING (false) WITH CHECK (false);

CREATE TRIGGER weekly_orders_set_updated_at
BEFORE UPDATE ON weekly_orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

**Notas do schema:**

- `composition` é `null` quando segue assinatura. Quando o cliente faz swap, vira `{original: 1, integral: 1}` (mesmo formato de `subscriptions.itens`).
- `extras` é array de objetos com snapshot de preço (`preco_unit`). Garante rastreabilidade mesmo se o preço do produto mudar depois.
- `total_extras` é redundante (poderia ser calculado), mas facilita queries do Backoffice e do financeiro.
- `confirmed_at` é setado no momento da confirmação. Útil pra auditoria e pro futuro disparo de Asaas.
- `first_extra_added_at`: timestamp da primeira adição da semana. Usado pelo cron de abandono. Não reseta em alterações subsequentes (regra: timer único por semana). Reseta pra `NULL` quando `extras` vai pra `[]`.
- `abandonment_warning_sent_at`: marca o momento em que o cron disparou o email. Garante envio único.
- Constraint `delivery_is_thursday` impede pedido com data inválida (defesa em profundidade).
- ON DELETE CASCADE: se subscription for deletada (raro), os pedidos vão junto.
- Índice parcial `abandonment_pending_idx`: otimiza a query do cron (que roda a cada 15min).

### 3.2 Utilitário compartilhado: validação de cutoff

Criar `api/_lib/cutoff.js` (ou equivalente, dependendo da estrutura do `api/` no repo).

**Cuidado crítico com timezone.** Vercel Functions rodam em UTC. Brasil opera sem horário de verão desde 2019, fuso fixo UTC-3 (BRT). Então **terça 12:00 BRT = terça 15:00 UTC**. Toda comparação é feita em UTC pra evitar deriva.

```javascript
// Cutoff: terça-feira 12:00 BRT (= 15:00 UTC).
// Vercel roda em UTC. Toda lógica trabalha em UTC pra evitar bugs de timezone.
// Recebe deliveryDate como ISO YYYY-MM-DD.
export function isPastCutoff(deliveryDate, now = new Date()) {
  const delivery = new Date(`${deliveryDate}T00:00:00Z`);
  const cutoff = new Date(delivery);
  cutoff.setUTCDate(cutoff.getUTCDate() - 2);
  cutoff.setUTCHours(15, 0, 0, 0); // 12h BRT = 15h UTC
  return now >= cutoff;
}

export function isThursday(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.getUTCDay() === 4;
}
```

**Casos de teste obrigatórios** (rodar antes de mergear PR 1):

| Input | Now (UTC) | Esperado |
|---|---|---|
| `delivery_date=2026-05-14` (quinta) | 2026-05-12T14:59:00Z | `false` (terça 11:59 BRT) |
| `delivery_date=2026-05-14` | 2026-05-12T15:00:00Z | `true` (terça 12:00 BRT exato) |
| `delivery_date=2026-05-14` | 2026-05-12T15:01:00Z | `true` (terça 12:01 BRT) |
| `delivery_date=2026-05-14` | 2026-05-13T00:00:00Z | `true` (quarta) |
| `delivery_date=2026-05-21` | 2026-05-12T15:00:00Z | `false` (entrega semana que vem) |

**Front também precisa alinhar.** O arquivo `src/utils/cutoff.js` já existe. Atualizar pra usar a mesma lógica UTC. Garantir que a função tem mesma assinatura nos dois lugares.

**Não usar `date-fns-tz` ou `moment-timezone` no MVP.** Sem dependência extra. `setUTCHours` resolve.

### 3.3 `POST /api/weekly-orders` — upsert do rascunho

**Body:**
```json
{
  "subscription_id": "uuid",
  "delivery_date": "2026-05-14",
  "composition": { "original": 1, "integral": 1 } | null,
  "extras": [
    { "id": "focaccia", "nome": "Focaccia Genovesa", "qty": 1, "preco_unit": 22.00 }
  ]
}
```

**Validações:**

1. `subscription_id` existe e tem `status = 'active'`. Se `pending_payment`, retorna `409 {error: "subscription_not_active"}`.
2. `delivery_date` é quinta-feira. Se não, retorna `400 {error: "delivery_must_be_thursday"}`.
3. `delivery_date` não passou do cutoff. Se passou, retorna `409 {error: "cutoff_passed"}`.
4. Cada extra tem `id`, `qty > 0`, `preco_unit >= 0`. Se inválido, retorna `400 {error: "invalid_extras"}`.
5. Se `composition` informado, soma das quantidades deve ser igual à da assinatura (não permite alterar quantidade total via swap). Se não bater, retorna `400 {error: "composition_quantity_mismatch"}`.

**Lógica:**

- Calcula `total_extras` somando `qty * preco_unit` de cada item.
- UPSERT por `(subscription_id, delivery_date)`:
  - Se não existe: cria com `status = 'rascunho'`.
  - Se existe: atualiza, sempre setando `status = 'rascunho'` e `confirmed_at = NULL`.
- **Regras de `first_extra_added_at`** (controla o timer do cron de abandono):
  - Se o novo `extras` está vazio (`[]`): seta `first_extra_added_at = NULL` e `abandonment_warning_sent_at = NULL` (reseta tudo).
  - Se o novo `extras` não está vazio E o pedido não existia (insert) OU `first_extra_added_at IS NULL`: seta `first_extra_added_at = NOW()`.
  - Se o novo `extras` não está vazio E `first_extra_added_at` já tem valor: **não mexe** (timer não reseta em alterações subsequentes, conforme regra de produto).
- `abandonment_warning_sent_at` nunca é setado por este endpoint (só pelo cron).

**Response 200:**
```json
{
  "id": "uuid",
  "subscription_id": "uuid",
  "delivery_date": "2026-05-14",
  "composition": null,
  "extras": [...],
  "total_extras": 22.00,
  "status": "rascunho",
  "confirmed_at": null,
  "created_at": "...",
  "updated_at": "..."
}
```

### 3.4 `POST /api/weekly-orders/:id/confirmar`

**Body:** vazio (`{}`).

**Validações:**

1. Pedido com `id` existe. Se não, retorna `404 {error: "weekly_order_not_found"}`.
2. Pedido está em `status = 'rascunho'`. Se já está `confirmado`, retorna `409 {error: "already_confirmed"}`.
3. `delivery_date` não passou do cutoff. Se passou, retorna `409 {error: "cutoff_passed"}`.

**Lógica:**

- Atualiza `status = 'confirmado'` e `confirmed_at = NOW()`.

**Response 200:** pedido atualizado (mesmo shape do POST upsert).

### 3.5 `GET /api/weekly-orders?subscription_id=X`

**Query:** `subscription_id` obrigatório.

**Lógica:**

- Retorna pedidos onde `delivery_date >= hoje` (não traz histórico).
- Ordena por `delivery_date ASC`.

**Response 200:**
```json
{
  "weekly_orders": [
    { "id": "...", "delivery_date": "2026-05-14", "status": "rascunho", ... },
    { "id": "...", "delivery_date": "2026-05-21", "status": "rascunho", ... }
  ]
}
```

Se vazio, retorna `{ "weekly_orders": [] }`.

### 3.6 Atualizar `src/utils/api.js`

Adicionar 3 funções:

```javascript
export async function postWeeklyOrder(payload) { /* POST /api/weekly-orders */ }
export async function confirmWeeklyOrder(id) { /* POST /api/weekly-orders/:id/confirmar */ }
export async function getWeeklyOrders(subscriptionId) { /* GET /api/weekly-orders?subscription_id=X */ }
```

Tratamento de erro consistente com o existente: `.status`, `.code`, `.body` no Error.

### 3.7 Cron de aviso de carrinho abandonado

Arquivo: `api/cron/check-abandoned-carts.js`

**Trigger:** Vercel Cron, a cada 15 minutos.

**Configuração em `vercel.json`** (somar ao que já existe, não substituir):

```json
{
  "crons": [
    {
      "path": "/api/cron/check-abandoned-carts",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**Autenticação:** o endpoint verifica `Authorization: Bearer ${CRON_SECRET}` (env var nova). Se não bater ou ausente, retorna `401`. Vercel Cron automaticamente envia esse header se a env var estiver configurada.

**Lógica do endpoint:**

1. SELECT em `weekly_orders` filtrando:
   - `status = 'rascunho'`
   - `first_extra_added_at IS NOT NULL`
   - `first_extra_added_at < NOW() - INTERVAL '2 hours'`
   - `abandonment_warning_sent_at IS NULL`
   - `delivery_date >= CURRENT_DATE`
   - `jsonb_array_length(extras) > 0`
2. Pra cada pedido elegível:
   - Verifica via `isPastCutoff(delivery_date)` se o cutoff ainda não passou. Se passou, **pula** (não envia email pra alguém que perdeu o prazo — esse aviso fica pra fase 2).
   - JOIN com `subscriptions` pra pegar `nome` e `email`.
   - Renderiza o email (subject + body abaixo).
   - Envia via Resend.
   - Em sucesso: `UPDATE weekly_orders SET abandonment_warning_sent_at = NOW() WHERE id = ?`.
   - Em erro de Resend: loga, **não marca** `abandonment_warning_sent_at`. Próximo cron tenta de novo.
3. Response `200` com `{ processed: N, sent: M, failed: K }`.

**Copy do email:**

- **Subject:** `Sua cesta da Cora tá esperando`
- **Body** (plain text; versão HTML pode ser o mesmo texto envolvido em `<p>`):

```
Oi, [nome].

Você adicionou itens à sua cesta dessa semana mas ainda não confirmou.
Confirme até terça, 12h pra entrar na entrega de quinta.

[link pro portal]

Se não confirmar, a entrega segue a assinatura padrão.

Hugo
```

- `[nome]` = primeiro nome do assinante (`subscriptions.nome.split(' ')[0]`).
- `[link pro portal]` = `https://app.acora.com.br/` (ou env var `PORTAL_URL` se preferir parametrizar).

**Edge cases:**

- Cliente confirma antes do cron rodar: pedido vira `confirmado`, não entra no WHERE. ✓
- Cutoff passa antes do cron: filtro pós-SELECT via `isPastCutoff` descarta. ✓
- Resend retorna erro: try/catch, loga, mantém `abandonment_warning_sent_at IS NULL` pra retry no próximo ciclo.
- Múltiplas execuções concorrentes: `UPDATE` atômico + filtro `abandonment_warning_sent_at IS NULL` previne duplicação.
- Cliente esvazia carrinho (extras = []): regra do POST upsert já reseta `first_extra_added_at` e `abandonment_warning_sent_at` pra `NULL`. Próxima adição reinicia o timer. ✓

**Env var nova:** adicionar `CRON_SECRET` no Vercel (gerar string aleatória, anotar no `PORTAL_STATUS.md`).

---

## 4. Frontend — App.jsx

### 4.1 State refactor

**Remover:**

- `pending` (state local de extras não confirmados)
- `confirmed` (state local de extras confirmados)
- `addPending`, `removePending`, `handleConfirm`, `handleCancel`
- Funções helper antigas `addTo`, `removeFrom`, `cntIn`, `totalOf`, `extrasCount` ficam, mas só pra uso UI (lendo do `currentWeeklyOrder`).

**Adicionar:**

```javascript
const [weeklyOrders, setWeeklyOrders] = useState([]);
const [currentWeeklyOrder, setCurrentWeeklyOrder] = useState(null); // derivado: o pedido da próxima quinta
const [loadingWeeklyOrder, setLoadingWeeklyOrder] = useState(false);
```

`currentWeeklyOrder` é derivado de `weeklyOrders` filtrando pelo `delivery_date` da próxima quinta. Se não houver, é `null` (cesta segue assinatura padrão).

### 4.2 Sync inicial

No `useEffect` de boot (logo após `reconcileSubscription`):

```javascript
useEffect(() => {
  if (!subscription?.id || subscription.status !== "active") return;
  getWeeklyOrders(subscription.id)
    .then(({ weekly_orders }) => setWeeklyOrders(weekly_orders || []))
    .catch(console.error);
}, [subscription?.id, subscription?.status]);
```

### 4.3 Helpers de sync

Centralizar a lógica de mutação em handlers passados pra Home/Cardápio/Drawer:

```javascript
const addExtraToCart = async (product) => {
  // 1. Otimistic update local
  // 2. POST /api/weekly-orders com extras atualizados
  // 3. Em sucesso: atualiza weeklyOrders com response
  // 4. Em erro (ex: cutoff_passed): reverte estado, mostra toast de erro
};

const removeExtraFromCart = async (productId) => { /* idem */ };
const updateComposition = async (newComposition) => { /* idem */ };
const confirmCurrentOrder = async () => {
  // POST /api/weekly-orders/:id/confirmar
};
```

**Otimistic UI:** muda o state local antes da resposta do servidor. Se POST falhar, reverte e mostra erro. Reduz percepção de latência.

### 4.4 Remoções

- Remove componente `OrderFooter` da árvore JSX e da definição.
- Remove componente `ConfirmedFooter`.
- Remove `justConfirmed` state.
- Remove conditional confirmed-order card (lógica `confirmed.length > 0`).

---

## 5. Frontend — Home

### 5.1 Saudação contextual (substitui lógica atual)

Remove dependência de `userData?.genero` (campo não existe mais).

```javascript
const nome = userData?.nome ? userData.nome.split(" ")[0] : D.nome;
const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
};
const saudacao = ehPrimeiroAcesso
  ? `Que bom ter você aqui, ${nome}.`
  : `${greet()}, ${nome}.`;
```

Tipografia: League Gothic, 30px, uppercase, `B[500]`. Igual ao H1 atual.

### 5.2 Card da cesta — novo design

**Posição:** logo abaixo da saudação. Primeiro elemento do conteúdo.

**Visual:**

- Fundo: `B[50]` (azul Cora claro)
- Borda: `1px solid B[100]`
- Border-radius: `radii.lg`
- Padding: 24px (mais generoso que cards padrão de 16px)
- **Sem foto.**

**Estrutura:**

```
SUA CESTA DESSA SEMANA              [badge condicional]

[Lista de itens — ver 5.2.1]

Entrega: quinta, 14 de maio

→ Editar carrinho                   (botão secundário, sublinhado ou outline)
```

**Título "SUA CESTA DESSA SEMANA":**
- League Gothic, uppercase, 22px, color `B[700]`, letter-spacing 0.04em
- Margin-bottom: 16px

**Badge condicional (top-right do cabeçalho do card):**
- Cesta sem alterações (segue assinatura): **sem badge**
- Cesta com alterações não confirmadas: badge `"Pedido não confirmado"`, type `warning`
- Cesta confirmada: badge `"Confirmada"`, type `success`

**Microcopy condicional abaixo da lista (acima de "Entrega:"):**
- Sem alterações: nenhum texto extra
- Rascunho com alterações: `"Confirme seu pedido até terça, 12h para esta entrega."` (color `W[600]`, 13px)
- Confirmada: `"Pedido confirmado em [dd/mm]."` (formato curto, dia/mês sem dia da semana. Ex: "Pedido confirmado em 10/05."). Color `W[500]`, 13px.
- Pós-cutoff sem confirmação: `"Prazo encerrado. Esta semana você recebe a cesta da assinatura. Pode editar a próxima."` (color `W[500]`, 13px)

#### 5.2.1 Lista de itens

Lista unificada (assinatura + extras). Item:

```
1× Pão Original          (assinatura)
1× Pão Integral          (assinatura, trocado)
1× Focaccia              R$ 22,00          ×
```

**Item da assinatura sem swap:**
- "1× Pão Original" + sublabel "(assinatura)" em `W[500]`, 12px
- Sem botão de remover

**Item da assinatura com swap:**
- "1× Pão Integral" + sublabel "(assinatura, trocado)" em `W[500]`, 12px
- Sem botão de remover (pra trocar de novo, vai pelo drawer)

**Extra:**
- "1× Focaccia" + preço alinhado à direita
- Botão `×` ao lado do preço (clique remove direto, sem confirmação)

**Tipografia da lista:**
- 14px, `W[800]`, font-weight 500
- Espaçamento vertical entre itens: 8px

**Peso (700g) entre parênteses ao lado do nome:** validar em mobile. Se ficar apertado (linha quebrando feio em viewport 380px), retira o peso da lista e mantém só no modal de detalhes. Implementação: testar com viewport real de 380px e Pão Multigrãos (nome mais longo).

#### 5.2.2 Botão "Editar carrinho"

- Full-width, abaixo da lista
- Outline, color `B[500]`, border `1.5px solid B[500]`
- Texto: `"→ Editar carrinho"`
- Click: abre o drawer `EditarCarrinhoDrawer`
- Disabled se `cutoff = true` E status = 'confirmado' (não dá mais pra editar)

#### 5.2.3 Botão "Confirmar pedido" (condicional)

**Aparece quando:**
- Existe `currentWeeklyOrder` com `status = 'rascunho'` E tem alteração (composition != null OU extras.length > 0)
- E `cutoff = false`

**Visual:**
- Primary, full-width
- Aparece logo acima ou logo abaixo do "Editar carrinho"
- Texto: `"Confirmar pedido"`
- Em loading: `"Confirmando…"`
- Em sucesso: `"Confirmado ✓"` (1.5s), depois volta a sumir (card muda pro estado confirmado)

Click: dispara `confirmCurrentOrder()`. Em sucesso, toast `"Cesta confirmada. Entrega [dd/mm]."`

### 5.3 Novidade hero (NovidadeCard atualizado)

**Estrutura mantida:** foto edge-to-edge no topo, conteúdo abaixo.

**Mudanças:**

1. **Sub-copy emocional** entre nome e CTA. Hard-coded por enquanto via novo campo no objeto do produto:

   ```javascript
   {
     id: "focaccia",
     nome: "Focaccia Genovesa",
     subCopy: "Pra um café da tarde diferente.",  // NOVO
     ...
   }
   ```

   Visual: 14px, `W[600]`, font-weight 400, line-height 1.5, margin 4px 0 12px.

2. **CTA com preço inline:**
   - Texto: `"+ Adicionar à cesta — R$ 22"`
   - Primary, full-width abaixo da sub-copy
   - Click: abre o modal de detalhes do produto (mesmo modal já existente)

3. **Remoção do QtyBtn no card.** Se cliente já adicionou e quer adicionar mais, abre o modal de novo. Não é fluxo comum.

4. **Estado "semana sem destaque":** quando `D.extras.length === 0`, mostra:

   ```
   Conhece o resto da nossa padaria?
   → Ver tudo no Cardápio
   ```

   Visual: card simples com fundo `W[100]`, sem foto, texto centralizado, 14px `W[600]`. Link `B[500]` discreto.

5. **Comportamento quando `pendingPayment = true`:** mantém o atual (CTA disabled, microcopy `LOCK_REASON_PENDING`).

### 5.4 Remoções da Home

- `WeekTimeline` (componente e todas as referências)
- `formatarDataHero` e helpers de data não usados
- Foto do pão principal dentro do card de cesta
- Seção interna de "extras confirmados" no card de cesta (já está unificada na lista)
- Lógica de `confirmed.length > 0` que gerava o card brand-50 separado

### 5.5 Link "Ver tudo no Cardápio"

- Mantém abaixo da novidade
- Texto: `"→ Ver tudo no Cardápio"` (era "Ver cardápio completo ›")
- Visual: 14px, `B[500]`, font-weight 500, padding 8px 0

---

## 6. Frontend — EditarCarrinhoDrawer (novo componente)

Arquivo: `src/components/EditarCarrinhoDrawer.jsx`

**Quando abre:** click em "→ Editar carrinho" no card da cesta.

**Layout:** bottom sheet (mesmo padrão do `Modal` e `swapModal` atuais). Max-height 85vh, scroll interno.

### 6.1 Estrutura

```
[Cabeçalho]
EDITAR CARRINHO                              ✕
Entrega: quinta, 14 de maio
Confirme até terça, 12h.

──────────────────────────────────────────

[Seção 1: Sua assinatura]
SUA ASSINATURA

[Slot 1]
○ Pão Original (700g)        ●
○ Pão Integral (700g)
○ Pão Multigrãos (615g)

[Slot 2, se assinatura tem 2 pães]
○ Pão Original (700g)
○ Pão Integral (700g)        ●
○ Pão Multigrãos (615g)

──────────────────────────────────────────

[Seção 2: Extras desta semana]
EXTRAS DESTA SEMANA

1× Focaccia Genovesa              R$ 22,00     ×
1× Ciabatta                       R$ 25,00     ×

[Se vazio:]
Você ainda não adicionou extras.
→ Ver tudo no Cardápio

──────────────────────────────────────────

[Sumário]
Total de extras desta semana      R$ 47,00

──────────────────────────────────────────

[Botões]
[Cancelar]            [Confirmar pedido]
```

### 6.2 Comportamento

- **Cada interação persiste imediatamente** (POST upsert no servidor com debounce de ~300ms pra evitar spam):
  - Trocar pão em um slot → POST com nova composition
  - Click no `×` de um extra → POST com extras atualizados
- **Sem botão "Salvar".** As alterações já estão salvas.
- **"Cancelar"** apenas fecha o drawer. Não desfaz alterações.
- **"Confirmar pedido"** chama `confirmCurrentOrder()`. Em sucesso, fecha o drawer e mostra toast `"Cesta confirmada. Entrega [dd/mm]."`
- **Pós-cutoff:** todos os controles ficam disabled. Mensagem no cabeçalho muda pra `"Prazo encerrado. Você poderá editar a próxima cesta."`

### 6.3 Composition

A regra de "quantidade total não pode mudar" (P3 do doc: drawer não altera quantidade da assinatura) é validada localmente antes do POST. Cada slot é radio-button (escolher 1 entre N pães). Total de slots = total de pães da assinatura.

### 6.4 Cálculo do sumário

```
Total de extras desta semana = sum(extras[].qty * extras[].preco_unit)
```

Linha única no sumário do drawer: `Total de extras desta semana   R$ X,XX`.

**Não exibir "adicional desta fatura" agora.** A cesta é semanal e zera no cutoff. Acumulado de fatura entra quando a integração com Asaas estiver madura (depende da decisão sobre como extras aparecem na cobrança, pendência registrada no `PORTAL_STATUS.md`).

### 6.5 Confirmação inline

Quando o pedido é confirmado dentro do drawer, antes de fechar, o botão muda visualmente pra `"Confirmado ✓"` por 1.5s. Mesmo padrão do `ActionBtn`. Em seguida o drawer fecha e o toast `Cesta confirmada. Entrega [dd/mm].` aparece.

---

## 7. Frontend — Modal de detalhes

O `Modal` component atual já existe. Mantém o layout. Mudanças:

### 7.1 Botão "Adicionar à cesta"

- Já existe (`actionLabel="Adicionar à cesta"`).
- Mudar `onAction` pra disparar `addExtraToCart(product)` (que faz POST pro rascunho), em vez de apenas adicionar ao state local.

### 7.2 Toast pós-adicionar

Substituir copy. Texto novo:

```
{nomeDoProduto} {adicionada|adicionado} à cesta. Confirme antes de terça, 12h.
```

Note o gênero. Solução: campo `genero` no objeto do produto:

```javascript
{ id: "focaccia", nome: "Focaccia Genovesa", genero: "f", ... }
{ id: "brioche", nome: "Brioche", genero: "m", ... }
```

Exemplos finais:
- `Focaccia adicionada à cesta. Confirme antes de terça, 12h.`
- `Brioche adicionado à cesta. Confirme antes de terça, 12h.`

Posicionamento e estilo: mesmo `Toast` component atual.

### 7.3 Toast pós-confirmar

Quando o cliente confirma o pedido (via Home ou via drawer):

```
Cesta confirmada. Entrega [dd/mm].
```

Data formatada como `dd/mm` (sem dia da semana) a partir de `currentWeeklyOrder.delivery_date`. Exemplo: `Cesta confirmada. Entrega 14/05.`

---

## 8. Frontend — Cardápio (refactor)

### 8.1 Comportamento novo

- Click no `ProductCard` → abre o `Modal` de detalhes (mesmo modal da Home).
- Modal tem o `ActionBtn "Adicionar à cesta"` que dispara `addExtraToCart`.
- **Remove o `QtyBtn` embutido no card** (botões +/- direto no card).
- **Mantém o label `"Pedir"`** no card (consistência de label fica pra item 4.2.2 da Frente C).

### 8.2 Indicação de "já está na cesta"

Se o produto já está no `currentWeeklyOrder.extras`, o ProductCard mostra:

```
✓ 1× na sua cesta
```

(ícone check + qty, em vez do botão "Pedir"). Click ainda abre o modal pra ver detalhes ou adicionar mais.

### 8.3 Remoções no Cardápio

- Remove `cntIn`, `addItem`, `removeItem` que mexem em pending/confirmed.
- Remove `toastC` ("Item removido da cesta") — agora a remoção sempre passa pela Home/drawer.
- Remove `ExtrasWarning` (componente de soft-limit). **Decisão:** discutir em outra sessão se mantém o limite. Por ora, remove. (Anota como pendência.)
- Remove o banner de "confirmados" (`confirmedExtras.length > 0` block).

---

## 9. Copy consolidada

| Contexto | Copy |
|---|---|
| Saudação primeiro acesso | `Que bom ter você aqui, [nome].` |
| Saudação visitas seguintes (manhã) | `Bom dia, [nome].` |
| Saudação visitas seguintes (tarde) | `Boa tarde, [nome].` |
| Saudação visitas seguintes (noite) | `Boa noite, [nome].` |
| Título card cesta | `SUA CESTA DESSA SEMANA` |
| Badge cesta com alterações não confirmadas | `Pedido não confirmado` |
| Badge cesta confirmada | `Confirmada` |
| Microcopy rascunho | `Confirme seu pedido até terça, 12h para esta entrega.` |
| Microcopy confirmada | `Pedido confirmado em [dd/mm].` |
| Microcopy pós-cutoff | `Prazo encerrado. Esta semana você recebe a cesta da assinatura. Pode editar a próxima.` |
| Item assinatura | `[qty]× [nome]   (assinatura)` |
| Item assinatura trocado | `[qty]× [nome]   (assinatura, trocado)` |
| Botão editar carrinho | `→ Editar carrinho` |
| Botão confirmar | `Confirmar pedido` |
| Estado loading confirmar | `Confirmando…` |
| Estado sucesso confirmar | `Confirmado ✓` |
| Toast pós-adicionar (feminino) | `[nome] adicionada à cesta. Confirme antes de terça, 12h.` |
| Toast pós-adicionar (masculino) | `[nome] adicionado à cesta. Confirme antes de terça, 12h.` |
| Toast pós-confirmar | `Cesta confirmada. Entrega [dd/mm].` |
| CTA novidade | `+ Adicionar à cesta — R$ [preço]` |
| Estado novidade vazio | `Conhece o resto da nossa padaria?` |
| Link cardápio | `→ Ver tudo no Cardápio` |
| Cabeçalho drawer | `EDITAR CARRINHO` |
| Sub-cabeçalho drawer | `Entrega: quinta, [data]. Confirme até terça, 12h.` |
| Seção drawer assinatura | `SUA ASSINATURA` |
| Seção drawer extras | `EXTRAS DESTA SEMANA` |
| Drawer extras vazio | `Você ainda não adicionou extras.` |
| Sumário drawer | `Total de extras desta semana   R$ X,XX` |
| Drawer pós-cutoff | `Prazo encerrado. Você poderá editar a próxima cesta.` |
| Erro cutoff_passed | `Prazo encerrado. Esta semana você recebe a cesta da assinatura. Pode editar a próxima.` |
| E-mail abandono (subject) | `Sua cesta da Cora tá esperando` |
| E-mail abandono (corpo) | Ver Seção 3.7 (texto completo) |

**Princípios de tom (já validados):**
- Sem travessões em copy de marca
- Sem rule-of-three
- Frases curtas, factuais
- Sem entusiasmo forçado

---

## 10. Validações e edge cases

### 10.1 Cliente edita pedido já confirmado

- Volta automaticamente pra `rascunho` no servidor (POST upsert seta `status = 'rascunho'`).
- Front mostra badge "Pedido não confirmado" novamente.
- Cliente precisa re-confirmar.

### 10.2 Concorrência multi-aba/multi-device

- POST sempre sobrescreve estado completo. Última escrita vence.
- Cliente abrindo em 2 abas pode causar inconsistência momentânea, mas o GET no próximo boot reconcilia.

### 10.3 Cutoff disparando durante interação

- Se cliente está com o drawer aberto às 11:59 e clica em "Confirmar" às 12:01, o servidor retorna `409 cutoff_passed`.
- Front trata: mostra toast `"Prazo encerrado. Esta semana você recebe a cesta da assinatura."` e fecha o drawer.
- Não é necessário polling do cutoff (raro o suficiente).

### 10.4 Subscription `pending_payment`

- `subscriptionsOpen = true` mas `subscription.status = 'pending_payment'`: cliente vê o portal, mas não pode adicionar extras (já é o comportamento atual via `lockedReason`).
- Drawer fica acessível mas com todos os controles disabled. Microcopy explica.
- POST `/api/weekly-orders` retorna `409 subscription_not_active` se for tentado.

### 10.5 Composition inválida

- Se cliente, via DevTools, manda `composition` com quantidade total diferente da assinatura, servidor rejeita com `400 composition_quantity_mismatch`.

### 10.6 Pedido inexistente ao confirmar

- Se cliente clica "Confirmar" e o pedido foi deletado server-side por algum motivo (raro), retorna `404`. Front: toast `"Erro ao confirmar. Tente novamente."` e refaz o GET.

### 10.7 Loading inicial

- Enquanto `getWeeklyOrders` está carregando, mostra skeleton no card de cesta (não mostra estado errado).
- Skeleton: card com fundo `W[100]`, sem conteúdo, animação shimmer suave.

---

## 11. Critérios de aceite

### 11.1 Backend
- [ ] Migration 0002 aplica sem erro
- [ ] Função utilitária `isPastCutoff` passa nos 5 casos de teste da Seção 3.2
- [ ] POST `/api/weekly-orders` cria pedido novo com `status='rascunho'`
- [ ] POST `/api/weekly-orders` atualiza pedido existente (mesmo `(subscription_id, delivery_date)`) e seta `status='rascunho'`
- [ ] POST `/api/weekly-orders` rejeita com 409 se cutoff passou
- [ ] POST `/api/weekly-orders` rejeita com 409 se subscription não está active
- [ ] POST upsert seta `first_extra_added_at` na primeira adição (de NULL pra timestamp)
- [ ] POST upsert NÃO reseta `first_extra_added_at` em alterações subsequentes com extras não vazios
- [ ] POST upsert reseta `first_extra_added_at` e `abandonment_warning_sent_at` pra NULL quando extras vai pra `[]`
- [ ] POST `/api/weekly-orders/:id/confirmar` muda status pra `confirmado` e seta `confirmed_at`
- [ ] POST confirmar rejeita com 409 se já está confirmado
- [ ] POST confirmar rejeita com 409 se cutoff passou
- [ ] GET retorna apenas pedidos com `delivery_date >= hoje`
- [ ] GET sem `subscription_id` retorna 400
- [ ] Cron `check-abandoned-carts` exige header `Authorization: Bearer ${CRON_SECRET}` (401 sem)
- [ ] Cron dispara email após 2h da primeira adição, em rascunho não confirmado
- [ ] Cron não dispara se cliente já confirmou
- [ ] Cron não dispara se cutoff já passou
- [ ] Cron marca `abandonment_warning_sent_at` em sucesso, deixa NULL em falha (retry)
- [ ] Vercel Cron configurado em `vercel.json` com schedule `*/15 * * * *`
- [ ] Env var `CRON_SECRET` configurada no Vercel

### 11.2 Frontend
- [ ] Boot carrega pedidos da próxima quinta via GET
- [ ] Adicionar extra na Home (via novidade) faz POST e atualiza UI otimisticamente
- [ ] Adicionar extra no Cardápio faz POST e atualiza UI otimisticamente
- [ ] Remover extra (×) na Home faz POST imediato
- [ ] Trocar pão no drawer faz POST com debounce
- [ ] Botão "Confirmar pedido" aparece só quando há alteração não confirmada e cutoff não passou
- [ ] Click em "Confirmar pedido" muda badge pra "Confirmada"
- [ ] Pós-cutoff, controles ficam disabled com microcopy correta
- [ ] `OrderFooter`, `ConfirmedFooter` e conditional confirmed-order card foram removidos
- [ ] `WeekTimeline` foi removido
- [ ] Saudação usa lógica temporal sem gênero
- [ ] Toast pós-adicionar usa nova copy (com flexão por gênero do produto)
- [ ] Toast pós-confirmar mostra data formatada
- [ ] Estado "semana sem destaque" aparece quando `D.extras` vazio
- [ ] Modal de detalhes ainda funciona para Brioche, Focaccia, Ciabatta, Multigrãos, Original, Integral
- [ ] Cardápio: click no card abre o modal
- [ ] Cardápio: produto já na cesta mostra "✓ 1× na sua cesta"

### 11.3 Mobile (viewport 380px)
- [ ] Card da cesta não estoura horizontalmente
- [ ] Lista de itens é legível
- [ ] Peso (700g) cabe na linha do item de assinatura OU foi removido em favor do modal
- [ ] Drawer abre e fecha sem glitch
- [ ] Botões touch-target ≥ 44x44

---

## 12. Pendências e fases futuras

### Fase 2 (não implementar agora)
- Aviso pós-cutoff ("perdeu o prazo"): e-mail/WhatsApp 2h depois do cutoff pra cliente que tinha rascunho não confirmado. O aviso pré-cutoff (2h após primeira adição) **já está na Fase 1** via cron.
- Integração com Asaas pra cobrar extras (pendência registrada em `PORTAL_STATUS.md`)
- Versão HTML rica do e-mail de abandono (Fase 1 entrega plain text + HTML mínimo)

### Outros itens da Frente C (sessões futuras)
- Item 4.2.2: revisitar label do botão "Pedir" no Cardápio (consistência com "Adicionar à cesta")
- Item 4.2.3: visão consolidada da cesta — atendida em parte pelo drawer, validar se ainda falta algo
- Item 2.2.3: dinâmica da entrega (horário, aviso, etc.) — não tratado aqui
- Item 5.2.1: colapsar Perfil em seções expansíveis — frente separada
- Frete grátis em microcopy de outros pontos (Sua Assinatura, e-mails, WhatsApp)

### Pendências menores
- Sub-copy emocional da novidade vira campo do produto no Backoffice quando ele for criado
- Validar peso `(700g)` no item da cesta em mobile real (não simulado). Se ficar apertado, retira da lista e mantém só no modal.
- `ExtrasWarning` (soft-limit de 4+ extras) foi removido. Decidir em sessão futura se mantém algum limite.

### Dependências externas
- Cobertura `coverage_unconfirmed`: não interfere neste item, mantém comportamento atual
- Whitelist (Fase 8): não interfere
- Capacity gate (Frente A): não interfere

---

## 13. Sequência de implementação sugerida

1. **Backend primeiro:**
   - Migration 0002 (com `first_extra_added_at` e `abandonment_warning_sent_at`)
   - Utilitário de cutoff em UTC (testar os 5 casos da Seção 3.2)
   - 3 endpoints principais (POST upsert, POST confirmar, GET)
   - Endpoint cron `check-abandoned-carts` + config `vercel.json` + env `CRON_SECRET`
   - Adições no `src/utils/api.js`
   - Testar via curl/Postman antes de tocar no front. Forçar cenários de abandono manipulando `first_extra_added_at` no banco pra confirmar que o cron dispara o e-mail.

2. **Frontend — refactor estrutural:**
   - Remover `OrderFooter`, `ConfirmedFooter`, conditional confirmed-order card
   - Remover state `pending`/`confirmed`
   - Adicionar state `weeklyOrders` + sync
   - Adicionar handlers `addExtraToCart`, `removeExtraFromCart`, `updateComposition`, `confirmCurrentOrder`

3. **Frontend — Home:**
   - Saudação temporal
   - Card da cesta novo (sem foto, brand-50, lista unificada)
   - Botão "Confirmar pedido" condicional
   - Novidade hero com CTA preço inline

4. **Frontend — Drawer novo:**
   - `EditarCarrinhoDrawer` componente
   - Substituir o `swapModal` atual

5. **Frontend — Modal de detalhes:**
   - Toast novo
   - Integrar com `addExtraToCart`

6. **Frontend — Cardápio:**
   - Click no card → modal
   - Remover QtyBtn embutido
   - Indicação "já está na cesta"

7. **QA:**
   - Smoke test fluxo completo
   - Mobile 380px
   - Pós-cutoff (simular relógio adiantado)
   - Multi-tab

---

*Frente C · Item 1 (Hierarquia da Home) · Briefing técnico · 12/05/2026*
