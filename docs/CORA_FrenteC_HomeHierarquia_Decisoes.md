# Frente C — Item 1: Hierarquia da Home (DECISÕES)

**Versão:** v1
**Data:** 11/05/2026 (sessão noite)
**Status:** Decisões fechadas. Pendente: virar briefing técnico em sessão futura.
**Doc fonte:** `docs/CORA_Telas_Internas_Pendencias.md` item 2.2.1

---

## 1. Resumo da decisão

A Home passa a ser o **coração transacional** do portal. A cesta vira **carrinho ativo** (não info passiva). A novidade vira **gatilho** (não decoração). O Cardápio se torna catálogo de consulta secundária.

**Hierarquia final em 2 zonas:**

```
┌─────────────────────────────────────────────┐
│ [Banner sticky — só se pending_payment]    │  Mantém comportamento atual
├─────────────────────────────────────────────┤
│                                             │
│  Saudação contextual                       │  Ver Seção 4
│                                             │
│  ┌─────────────────────────────────────┐   │  ZONA 1 — A CESTA
│  │  SUA CESTA DESSA SEMANA             │   │  • Card com fundo brand-50
│  │                                     │   │  • League Gothic UPPER no título
│  │  1× Pão Original   (assinatura)    │   │  • Padding generoso
│  │  1× Focaccia       R$ 22       ×   │   │  • Sem foto
│  │                                     │   │  • Lista com:
│  │  Entrega: quinta, 14/05            │   │    - assinatura (sem botão remover)
│  │  → Editar carrinho                 │   │    - extras (× direto, sem confirm)
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │  ZONA 2 — NOVIDADE
│  │                                     │   │
│  │  [foto grande hero]                 │   │  • Card hero
│  │                                     │   │  • Foto edge-to-edge
│  │  Brioche essa semana                │   │  • Título + sub-copy emocional
│  │  Pra um café da tarde diferente.    │   │  • CTA "Adicionar à cesta"
│  │                                     │   │    com preço inline
│  │  [ + Adicionar à cesta — R$ 32 ]    │   │  • Inclusão pede CONFIRMAÇÃO
│  │                                     │   │    (padrão existente — confirmar
│  └─────────────────────────────────────┘   │    mecanismo no briefing técnico)
│                                             │
│  → Ver tudo no Cardápio                    │  Link discreto
│                                             │
└─────────────────────────────────────────────┘
```

---

## 2. Análise por feedback (recap)

| UXer | Crítica | Decisão |
|---|---|---|
| **João** | Inverter cesta ↔ novidade. Foto da cesta é redundante. | Parcialmente aplicado: foto removida, novidade hero. **Hierarquia mantida** (cesta primeiro) — alinhamento com JTBD da Beatriz. |
| **Astrid** | Falta vender ideia da assinatura. | **Descartado.** Feedback se aplica à T2 do onboarding, não à Home interna. Registrar como pendência da revisão do onboarding. |
| **Nathalia** | Subir frete grátis pra Home. | **Descartado da Home.** Decisão de Hugo: tirar da Home, levar pra microcopy em outros pontos (Sua Assinatura, e-mails, WhatsApp). |

---

## 3. Modelo mental: cesta = carrinho de compras pré-preenchido

A Beatriz **já tem** a assinatura. A cesta da semana **já vem** com o pão da assinatura. Ela pode **adicionar extras** que serão cobrados na próxima fatura.

**Fluxo emocional:**

1. Entra → vê cesta OK → 5 segundos de tranquilidade
2. Vê foto da focaccia → "vem visita sábado, vai bem"
3. Toca em "Adicionar à cesta" → confirma → cesta atualiza
4. Toast: *"Focaccia adicionada. Vai pra sua próxima fatura."*
5. Sai satisfeita

**Implicação estrutural:**
- Cardápio deixa de ser destino paralelo → vira catálogo completo de consulta
- Conditional confirmed-order card (brand-50) **desaparece como elemento separado** — vira o estado normal da cesta com extras
- Adicionar extras pela Home (não só pelo Cardápio) — pode exigir endpoint novo no backend

---

## 4. Decisões fechadas (8 pontos)

### P1 — Visual da cesta
**Decisão (a):** card com fundo `brand-50`, sem foto, com tipografia trabalhada e padding generoso. League Gothic UPPER no título "SUA CESTA DESSA SEMANA" pra carregar peso visual sem foto.

### P2 — Estado "primeira visita" pós-onboarding
**Decisão (c):** **não existe assinante sem pão na cesta.** A cesta sempre vem preenchida (pelo menos com o pão da assinatura). Saudação muda contextualmente:
- **Primeiro acesso pós-onboarding:** "Que bom ter você aqui, [nome]"
- **Visitas seguintes:** "Bom dia, [nome] / Boa tarde, [nome] / Boa noite, [nome]"

> ⚠️ **Atualiza memórias:** anteriormente registrado como "Olá, [nome]!" em visitas seguintes. **Nova decisão: saudação temporal.**

### P3 — "Editar cesta" leva pra onde
**Decisão (c):** **drawer/modal sobreposto** (não nova rota). É edição de carrinho com todas as regras de negócio já discutidas (swap Original ↔ Integral, quantidades, etc.).

### P4 — CTA da novidade
**Decisão (a):** **"Adicionar à cesta"** com preço inline no botão.

### P5 — Frete grátis: banner ou card
**Decisão (c — nova opção):** **remover da Home.** Tratar como microcopy em outros pontos do produto (Sua Assinatura, e-mails, mensagens de WhatsApp). Pendência registrada pra próximo touchpoint.

### P6 — Remoção de extra
**Decisão (a):** **remove direto no clique ×.** Aceita o risco de acidente.

> **Importante:** a **inclusão de extras** (via novidade ou Cardápio) **pede confirmação** — segue padrão de confirmação já existente no portal. Mecanismo a confirmar no briefing técnico (modal? slide-in? overlay?).

### P7 — Copy do toast pós-adicionar
**Decisão (b):** **"Focaccia adicionada. Vai pra sua próxima fatura."** (substitui o nome do produto dinamicamente)

### P8 — Semana sem novidade
**Decisão (b):** **elemento genérico** ("Esta semana sem destaque" + link pro Cardápio).

> Hugo: "espero que isso nunca aconteça." Ok como fallback defensivo.

---

## 5. Pendências técnicas (pro briefing técnico futuro)

| # | Item | Observação |
|---|---|---|
| 1 | Endpoint pra adicionar extra à cesta via Home | Verificar se existe. Provavelmente parcial. |
| 2 | Endpoint pra remover extra | DELETE equivalente. Confirmar. |
| 3 | Padrão de confirmação de inclusão existente | Hugo mencionou "como já havíamos feito" — preciso ler o código pra confirmar qual padrão é (modal? overlay?). |
| 4 | Sync da cesta entre localStorage e servidor | Quando atualiza? Em cada ação? |
| 5 | Refactor: Conditional confirmed-order card (brand-50) | Desaparece como elemento separado. Lógica vira parte do estado da cesta. |
| 6 | Cobrança de extras no Asaas | Pendência já registrada no PORTAL_STATUS. **Não bloqueia o front.** |
| 7 | Comportamento do botão "Adicionar" quando pending_payment | Desabilitado? Com tooltip? |

---

## 6. Risco e mitigação visual

**Risco principal:** desbalanceamento visual cesta vs novidade. Sem foto, a cesta é "menos" visualmente que a novidade hero. O olho vai pra novidade.

**Mitigação:**
- Cesta com fundo `brand-50` (azul claro Cora) — peso visual sem foto
- Título "SUA CESTA DESSA SEMANA" em League Gothic UPPER carrega autoridade
- Padding generoso, tipografia clara
- Aceitar que o desbalanceamento é **intencional** — queremos engajamento via novidade. A cesta tem que ser **clara e funcional**, não dominante visualmente.

---

## 7. O que sai dessa sessão pra próxima

**Documentado:**
- ✅ Modelo mental (cesta = carrinho pré-preenchido)
- ✅ Hierarquia (2 zonas + link cardápio)
- ✅ 8 decisões de produto
- ✅ Análise crítica aplicada
- ✅ Pendências técnicas levantadas

**Próxima sessão (briefing técnico):**
1. Ler código atual da Home e do conditional confirmed-order card
2. Verificar/criar endpoints de add/remove extra
3. Identificar o padrão de confirmação de inclusão existente
4. Gerar `CORA_Briefing_FrenteC_Item1_Home.md` no formato dos anteriores
5. Mandar pro Claude Code
6. Validar em Preview
7. Deploy

**Pendências de outras frentes que apareceram:**
- Astrid sobre T2 do onboarding (vender a ideia da assinatura) → revisão do onboarding em sessão futura
- Frete grátis em microcopy → próximo touchpoint quando trabalhar Sua Assinatura, e-mails, WhatsApp

---

## 8. Atualizações pra outras frentes (Frente C)

Como o Cardápio deixa de competir e vira catálogo, os itens 4.2.2 (labels do botão "Quero") e 4.2.3 (visão consolidada da cesta) **precisam ser revisitados** sob essa nova lente. Especificamente:

- Item 4.2.2: o botão no Cardápio também deve ser "Adicionar à cesta" (consistência com a Home)
- Item 4.2.3: a visão consolidada da cesta vai morar dentro do drawer "Editar carrinho" (que abre da Home)

Esses dois itens ainda precisam de discussão própria, mas a direção fica mais clara.

---

*Frente C · Item 1 (Hierarquia da Home) · Decisões · 11/05/2026*
