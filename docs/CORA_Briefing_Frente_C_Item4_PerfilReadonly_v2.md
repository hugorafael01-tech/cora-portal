# Briefing técnico v2 — Frente C item 4
## Tela Perfil read-only + Modal de Recibo (escopo wire-to-real)

**Task ClickUp:** `86e1fu240` (absorve `86e1dwk1v`)
**Branch:** `feat/perfil-readonly-modal-recibo`
**Referência visual:** `docs/Tela Perfil v2.html` (Hugo vai colocar no repo antes da execução)
**Referência CSS:** `docs/Tela Sua Assinatura v4.html` (já no repo) — tokens, cores, tipografia, padrão de modal bottom-sheet

> **v2 desta nota** incorpora as descobertas do CC: a tela hoje é 100% mock, não há tabela `faturas`/`invoices`, `weekly_order_status` não tem valor `'entregue'`, e o GET de `subscriptions` não expõe `valor_paes`/`valor_frete`. Decisões abaixo.

---

## Escopo final (decidido em 20/05/2026)

**Caminho B — wire-to-real parcial.** A tela passa a ler dados reais sempre que possível, com duas exceções pequenas (sub-linha de cobrança paga e footnote de fatura paga do modal) que ficam **omitidas no MVP** até o backoffice criar a tabela `faturas`.

### Fontes de dados (mapeadas)

| Bloco | Fonte | Estado atual |
|---|---|---|
| Header (nome, email) | snapshot do localStorage (`src/utils/subscription.js`) + GET subscription | ✅ pronto |
| Dados Pessoais | snapshot do localStorage | ✅ pronto, falta passar como prop |
| Histórico de pedidos | GET `/api/weekly-orders?history=true` (novo modo) | 🔧 criar |
| Cobrança — decomposição | GET subscription expondo `valor_paes` + `valor_frete` | 🔧 expor colunas |
| Cobrança — sub-linha "Pago" | tabela `faturas` no backoffice | 🚫 omitido no MVP |
| Cobrança — próxima data | derivada client-side como `01/[próximo mês]` | ✅ pronto |
| Modal — itens da semana | payload do histórico (já carrega `composition`, `extras`) | ✅ pronto (depois do modo `?history=true`) |
| Modal — gramatura | catálogo D (700g para pães da assinatura, peso específico para extras) | ✅ pronto |
| Modal — footnote "paga em DD/MM" | tabela `faturas` no backoffice | 🚫 omitido no MVP |

---

## Decisões fechadas

### Tela Perfil
- **100% read-only.** Tudo que altera dados passa pelo WhatsApp.
- **Sai:** chevrons em Dados Pessoais, botão "Atualizar" do Cartão, botão "Sair da conta", entregas pendentes/futuras do Histórico, "(estimado)" do Total, **e a sub-linha "Cobrança de [mês] · R$ X · Pago"** (omitida no MVP até backoffice criar tabela `faturas`).
- **Histórico:** últimos 3 entregues. "Ver todos →" **só aparece** se `entregas.length > 3`.
- **Cobrança:** bloco único com decomposição Assinatura + Extras + Frete = Total + cartão sem botão. **Sem sub-linha "Cobrança de [mês] · Pago"** nesta versão.
- **Pausar/Cancelar:** botão WhatsApp.
- **Microcopy WhatsApp ao fim:** warm-500 12px, **sem `<strong>`**, centralizada, border-top dashed.
- **Sino fora** do topbar. Topbar = só logo, lado direito vazio.

### Modal de Recibo
- Bottom-sheet reutilizando o padrão do modal de confirmação da Sua Assinatura v4 (`src/App.jsx:1566-1631`): overlay `rgba(26,24,21,0.5)`, grab handle 36×4 W[300], `slideUp 300ms`, `borderRadius xl xl 0 0`.
- **Header:** `"Recibo da semana DD/MM"`
- **Submeta:** círculo verde (16px, success-bg + success-border) com check 10×10 **antes** do texto + `"Entregue [dia da semana]"`
- **Seção "Assinatura"** (não "Cesta"): pães do plano com gramatura como meta, sem preço, sem total.
- **Seção "Extras"** (condicional): com preço unitário + total da seção em brand-500 15px weight 700.
- **Footnote — versões finais sem status "Pago":**
  - Semana futura (corrente): `"Cobrança incluída na fatura de DD/MM."`
  - Semana passada com extras: `"Cobrança da fatura de DD/MM."`
  - Semana passada sem extras: `"Sem extras nesta semana."` (sem footnote financeiro)
- **Botão único:** `Fechar` ghost full-width.

### Cenário B2: Frete grátis (programa condomínio ativo)
- Aceito como cenário válido do MVP. Lógica de ativação é manual (SQL periódico).
- **Detecção no front:** quando `valor_frete === 0` (depois que o GET de `subscriptions` expor essa coluna).
- **UI:** `Frete R$ 0,00` em success-text weight 600, com microcopy abaixo do valor em success-text 11px regular: `"frete grátis · programa condomínio"`. Total reflete.
- Sem celebração. Fato seco.

---

## Mudanças de backend necessárias (dentro do repo do portal)

### 1. GET `/api/weekly-orders?history=true`
Novo modo do endpoint existente em `api/weekly-orders/index.js`. Comportamento:

```
GET /api/weekly-orders?history=true&subscription_id=xxx
```

- Retorna `weekly_orders` onde `delivery_date < hoje` e `status = 'confirmado'`
- Ordenado por `delivery_date desc`
- Payload por linha já contém o que o modal precisa: `composition`, `extras` (com `nome`/`qty`/`preco_unit`), `total_extras`, `delivery_date`, `confirmed_at`
- Considera **"entregue"** essa combinação (`delivery_date < hoje && status='confirmado'`). Aresta conhecida e aceita no MVP — vide nota no fim.

### 2. GET `/api/subscriptions/[id]` — expor colunas
Editar `api/subscriptions/[id].js:17`. Adicionar ao SELECT:
- `valor_paes`
- `valor_frete`

Colunas já existem em `subscriptions` (migration 0001). Sem schema novo.

---

## Aresta conhecida — "entregue" derivado

A inferência `delivery_date < hoje && status='confirmado'` tem furo: se uma entrega for cancelada no DB sem mudança de status, ela aparece como "entregue" para o assinante. Aceitável no MVP.

A solução definitiva está num **documento de recomendação separado para o cora-backoffice** (a ser executado em outra sessão): adicionar `'entregue'` ao enum `weekly_order_status` e mecânica para marcar manualmente após expedição. Quando essa migration sair, este endpoint do portal vai passar a filtrar por `status = 'entregue'` direto.

**Não criar essa migration neste repo.** Regra de governança: schema vive no `cora-backoffice`.

---

## Componentes e tokens a reusar (não inventar)

- `Card`, `Btn` (ghost/primary), `SL`, `Badge`, `QtyStepper`, `useModalA11y` (Esc + focus-trap + retorno de foco) — todos em `src/App.jsx`
- `fmt`, `MESES_PT`, `proximaQuinta` (helpers existentes)
- Bottom-sheet do modal de confirmação da Assinatura: `src/App.jsx:1566-1631`
- `.breakdown` + `.bk-row` + `.bk-row.total` (mapear para os estilos inline equivalentes, já que o código real usa inline)

---

## Padrões consolidados (aplicar sem exceção)

- Datas sempre `DD/MM` (nunca `1º/MM` nem "1 de maio")
- "Pão Original" / "Pão Integral" sempre com "Pão", com `N×` antes do número
- **Sem travessão (`—`)**, sem rule of three, sem motivacional, sem emoji (exceto check `✓` no badge)
- `tabular-nums` em colunas de valores
- Branch: `feat/perfil-readonly-modal-recibo`
- Commits ASCII (sem acento)
- Smoke test em **Preview deployment** a cada fase (Vercel Functions retornam 404 em localhost)
- Squash merge no fim via PR

---

## Estados a implementar

### A. Histórico — 3 cenários (todos com dado real do novo endpoint)
| | Composição |
|---|---|
| A1. Idle completo | 3+ entregas listadas (mostra 3 últimas), com ou sem "Ver todos →" condicional |
| A2. Vazio (cliente novo) | Microcopy `"Você ainda não tem entregas."` + `"Sua primeira chega em DD/MM."` em bold |
| A3. Parcial | 1-2 entregas listadas, sem "Ver todos →" |

### B. Cobrança — 2 cenários
| | Decomposição |
|---|---|
| B1. Padrão | Assinatura + Extras (se houver) + Frete = Total |
| B2. Condomínio ativo | Assinatura + Extras (se houver) + Frete R$ 0,00 com microcopy = Total |

> Sub-linha "Cobrança de [mês anterior]" **omitida no MVP**.

### C. Modal de Recibo — 3 variantes
| | Composição |
|---|---|
| C1. Com extras + futura | Seção Assinatura + Seção Extras + footnote `"Cobrança incluída na fatura de DD/MM."` |
| C2. Sem extras + passada | Só Seção Assinatura + footnote `"Sem extras nesta semana."` |
| C3. Com extras + passada | Seção Assinatura + Seção Extras + footnote `"Cobrança da fatura de DD/MM."` |

---

## Fases de implementação

### Fase 1 — Endpoints + tela Perfil read-only
1. Expor `valor_paes` e `valor_frete` no GET de subscriptions
2. Criar modo `?history=true` no GET de weekly-orders
3. Threadar `subscription` como prop para o componente Perfil (App.jsx linha ~2093)
4. Reescrever componente Perfil read-only com 5 blocos (Header, Dados Pessoais com olho no CPF, Histórico A1/A2/A3, Cobrança B1/B2, Pausar/Cancelar)
5. Topbar = só logo
6. Microcopy WhatsApp ao fim sem `<strong>`

**Validação Fase 1 (Preview):** prints de A1×B1, A1×B2, A2×B1, A3×B1.

### Fase 2 — Modal de Recibo
1. Componente `ReciboModal` reusando bottom-sheet existente
2. Click fora fecha, Esc fecha, foco volta pra linha (a11y)
3. Implementar 3 variantes C1, C2, C3
4. Tap em qualquer linha do histórico abre o modal correspondente

**Validação Fase 2 (Preview):** prints das 3 variantes.

### Fase 3 — Smoke final + squash merge

---

## Critérios de aceite

| | Requisito |
|---|---|
| ✓ | Zero edição inline em qualquer campo |
| ✓ | Zero `<strong>` na microcopy final ao fim da tela |
| ✓ | "Ver todos →" oculto quando `entregas.length ≤ 3` |
| ✓ | Sub-linha "Cobrança de [mês] · Pago" **não aparece** |
| ✓ | Modal: label "Assinatura" (nunca "Cesta") |
| ✓ | Modal: footnote nunca afirma "paga em" ou "Pago" |
| ✓ | Modal: gramatura como meta tanto em Assinatura quanto em Extras |
| ✓ | Frete grátis (B2): valor em success-text + microcopy abaixo, sem celebração |
| ✓ | Datas em `DD/MM`, "Pão" sempre prefixando nome do produto |
| ✓ | Sem travessão (`—`) em copy nova |
| ✓ | Histórico lê do endpoint real (não mock) |

---

## Higiene de migrations (parqueada)

Observação do CC: este repo tem `0002_admin_users`, `0003_view_assinatura_itens`, `0004_catalogo`, `0005_receitas`, `0006_seed` untracked que parecem cópias do `cora-backoffice` e colidem com a numeração do portal. **Não tocar nesta tarefa.** Hugo abre task ClickUp separada pra limpar.

---

## Plano antes de codar

Apresentar plano final mostrando:
1. Diff resumido nos 2 endpoints
2. Estrutura do componente Perfil novo + ReciboModal
3. Dúvidas remanescentes (se houver)

**Aguardar aprovação do Hugo antes de executar qualquer fase.**
