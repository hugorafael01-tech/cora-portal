# CORA — Handoff: dos wireframes pro código
*Documento de continuidade entre conversas. Maio 2026.*

> **Propósito:** garantir que a próxima conversa (sobre implementação em código do backoffice) comece com o contexto certo, sem precisar reler o histórico longo desta sessão. Lê-se como briefing de retomada — auto-contido.

---

## 1. Onde estamos (10/mai/2026)

**Projeto:** Cora — padaria de fermentação natural por assinatura, Niterói/RJ.
**Lançamento previsto:** agosto/2026.
**Equipe:** Hugo (founder, padeiro, dev solo) + Mariane (co-founder, marketing, voz editorial). Sem dev externo no MVP.

**Fase atual:** transição **wireframes → código** do backoffice.

---

## 2. O que já está pronto

### Portal do Assinante (em produção)

- **Versão:** v3.2.7, live em `app.acora.com.br/?dev=1&bypass_cutoff=true`
- **Stack:** Vite + React, deploy Vercel
- **Status:** pré-teste de usabilidade fechado, com feedbacks já consolidados em memory/PK
- **Repo:** `cora-portal` (GitHub)

### Backoffice — MVP de wireframes (5 módulos)

Todos navegáveis, em arquivos HTML standalone:

| # | Módulo | Arquivo | Status |
|---|---|---|---|
| 1 | Semana v4 | `Semana_v4_-_wireframes_v5.html` | ✅ aprovado |
| 2 | Planejamento v2 | `Planejamento_v2_-_wireframes.html` | ✅ aprovado |
| 3 | Produção v4 v5+3 | `Producao_v4_-_wireframes_v5_3.html` | ✅ aprovado |
| 4 | Expedição v1 | `Expedicao_v1_-_wireframes.html` | ✅ aprovado (com inconsistências cosméticas conhecidas) |
| 5 | Receitas v1 | `Receitas_v1_-_wireframes.html` + `receitas-stages.html` | ✅ aprovado |

Total: ~36 wireframes (3-5 estados × 2 plataformas por módulo). Ferramenta usada: Claude Design.

### Documentos consolidados no Project Knowledge

- `posicionamento.md` v3 — posicionamento da marca
- `CORA_Precos_e_Planos_v1.md` — modelo comercial completo
- `CORA_Zoneamento_Entregas_v1.md` — lógica de zonas
- `CORA_Design_System_v1.md` — tokens visuais, anti-padrões
- `CORA_Backoffice_Spec_Consolidada_v2.md` — spec geral do backoffice
- `CORA_Backoffice_Schema_Rodada_*.md` — schemas de dados por módulo
- `CORA_Backoffice_Migration_*.sql` — migrations propostas
- `CORA_Fichas_Producao_v5.xlsx` — fichas de receita (fonte da verdade dos dados)

---

## 3. Decisões fundamentais já tomadas (não re-decidir)

### Modelo comercial v3

- Assinatura única R$ 99 × qtd (1 a 3 pães), só Original e Integral
- Frete R$ 15/mês universal
- 5ª semana cortesia em meses com 5 quintas
- Cardápio avulso: Original R$ 27, Integral R$ 29, Multigrãos R$ 32, Focaccia R$ 22, Brioche R$ 32, Ciabatta R$ 25
- Cutoff terça 12h
- Pausa/cancelamento via WhatsApp (não self-service no MVP)
- Posicionamento: **conveniência, não desconto**

### Operacional/logística

- **Endereço Cora:** Trav. Ari Pinto Lima 41A · Fonseca · Niterói
- **Ponto Rio:** Conde de Irajá 439 · Botafogo (casa Mariane, provisório, deve mudar em meses)
- **Lote único pro Rio** entregue por Hugo após terminar Niterói
- **WhatsApp atual:** 5521999429843 (pessoal Hugo, provisório fase teste)
- **Zoneamento:** 3 zonas concêntricas Niterói (≤3km, 3-7km, 7+km) + 3 zonas Rio (≤2km, 2-5km, 5+km), via raio Haversine + ajuste manual

### Estados de entrega (Expedição)

- 4 estados: programada → pendente → entregue/problema
- Todas transições manuais, 1 clique
- Bulk action por zona (liberar todas, marcar todas como entregues)
- Sem registro persistente de problemas — apenas WhatsApp pré-preenchido pra cliente

### Receitas / Versionamento

- **3 grupos visuais:** Base da Assinatura / Sempre no Cardápio / Rotativas + Em teste / Arquivadas
- 1 versão publicada + 1 rascunho por receita
- Histórico read-only acessível
- 2 formas de trabalhar: top-down (mexer hidratação/peso, sistema recalcula) e bottom-up (entrar ingredientes, sistema calcula totais)
- Catálogo de Estoque referenciado via dropdown (24 insumos, definidos no Excel)
- Política sugerida: nova versão substitui só em semanas que ainda não tiveram corte

### Produção

- Mise en place agrupado por ingrediente (não por receita)
- Levain com calculadora simples 1:2:2 (input: meta + sobra desejada → output: isca/água/farinha)
- Mensagem condicional "Levain parado >3 dias = +1 refresco"
- Focaccia em tabuleiros 60×40 na produção (15 un × 430g = 1/6 tab)
- Forno base/teto independentes em todas receitas
- Etapas em tempo real com regra ≤2h / >2h / nunca atualizada
- 7 etapas no processo (não 15)
- Ficha técnica em side panel desktop / full-screen mobile

### Design System

- Cor brand: Azul Cora #2E55CD
- Fundo: warm-50 (nunca #FFF)
- Texto: warm-600 (nunca #000)
- League Gothic uppercase pra headings
- Montagu Slab pra texto corrente
- Sem gradientes, sem shadows, sem pill buttons
- Mobile-first sempre
- Detalhes em `CORA_Design_System_v1.md`

### Tom de voz da marca

- Founder-led, direto, honesto sobre imperfeição
- Nunca usar travessão (—) em copy de marca
- Sem regra-de-três
- Skill `/cora-brand-voice` ativa pra revisar copy

---

## 4. Pendências `// crítico` (resolver na implementação)

### Backoffice

- **Agrupamento G1/G2/G3** das receitas (definir com `/master-baker`)
- **Timers por etapa** dos 7 passos do processo (valores reais virão das fichas)
- **UI de comparação lado-a-lado** entre versões de receita
- **Validação mínima exata** pra "Salvar como rascunho" (nome + 1 ingrediente?)
- **Política exata ao publicar** nova versão de receita

### Portal (debt técnico, task 86e12vwuz)

- App.jsx monolítico (895 linhas) — quebrar em arquivos
- Centralizar IMG paths em `paes.js`
- Self-host Google Fonts
- CSP/headers de segurança
- Memoização (`useMemo`, `useCallback`, `React.memo`)
- Filename com espaço em `Cora_tile grafismo.svg`

---

## 5. Decisões de produto registradas como tasks futuras

| Task ID | O que é | Quando atacar |
|---|---|---|
| 86e13xxyq | Calculadora de T° água por receita | v5 (depois Receitas + dados) |
| 86e12xqtf | Schema multi-planos de Assinatura | quando houver demanda comercial |
| 86e132kv5 | Validar escala tipográfica backoffice mobile | pós uso real (4-6 semanas) |
| 86e132ftt | Fotos nas observações de produção | após 4-6 semanas operando |
| 86e1adhrt | MARCO MVP wireframes concluído | aguardando Hugo fechar manualmente |

---

## 6. Próximos passos imediatos (a discutir na próxima conversa)

### Decisões pendentes pré-código

**Stack do backoffice:**
- Vite + React + Tailwind (igual Portal — caminho natural)?
- Next.js (SSR/RSC se quiser otimização)?
- Outra?

**Backend:**
- Supabase (Postgres + Auth + Storage tudo em um)?
- Express/Hono custom + Postgres separado?
- Edge Functions Vercel?
- Firebase?

**Auth:**
- Hugo é único operador no MVP, mas precisa de algum login
- Magic link? OAuth (Google)? Email+senha simples?

**Banco de dados:**
- Schema já tem migrations propostas (`CORA_Backoffice_Migration_003_Receitas.sql`, `004_Focaccia_Brioche.sql`)
- Postgres é direção natural se for Supabase

**Hospedagem:**
- Vercel (igual Portal) — `admin.acora.com.br` já reservado
- Subdomain dedicado?

### Por qual módulo começar?

**Análise de dependências:**

```
Receitas (independente)
    ↓
Estoque (independente, fonte dos ingredientes)
    ↓
Planejamento (depende de Receitas)
    ↓ + assinantes do Portal
Semana (consolida)
    ↓
Produção (puxa Semana + Receitas)
    ↓
Expedição (puxa Semana)
```

**Recomendação revisada (pode discutir):**

Começar por **Receitas + Estoque juntos** — fundação dos dados, self-contained, não depende de assinantes reais. Hugo pode cadastrar suas receitas e validar que tudo está coerente antes de implementar os módulos operacionais.

**Estoque ainda não tem wireframe** (marcado "em breve"). Pode ser implementado direto do `CORA_Fichas_Producao_v5.xlsx` aba Insumos sem wireframe (estrutura simples: tabela de insumos com preço, fornecedor, lead time, estoque atual).

### Integração com Portal

- Backoffice precisa **ler** dados de assinantes do Portal:
  - Quem é assinante ativo
  - Composição da Assinatura (1 Original / 2 Integral / etc)
  - Endereço (pra cálculo de zona)
  - Status de pause/cancel
- Cutoff de terça 12h gera **snapshot** que o backoffice consome
- Portal hoje é mock — a real integração depende do backend novo do backoffice

---

## 7. Fontes da verdade

### Memory do projeto

29 entradas cobrindo:
- Modelo comercial v3
- Endereços operacionais
- Zoneamento
- Status do backoffice (5 wireframes prontos)
- Decisões consolidadas de Produção
- Fornecedores confirmados
- Skills usadas
- Tom de voz

### Project Knowledge

Documentos chave (todos disponíveis):
- `posicionamento.md` v3
- `CORA_Precos_e_Planos_v1.md`
- `CORA_Zoneamento_Entregas_v1.md`
- `CORA_Design_System_v1.md`
- `CORA_Backoffice_Spec_Consolidada_v2.md`
- `CORA_Fichas_Producao_v5.xlsx`
- `posicionamento.md` v3
- 5 arquivos de wireframes HTML
- Briefings em `/outputs/` (todos os 8 que viraram base de cada rodada)

### ClickUp

**Listas relevantes:**
- `901712174137` — UI & Protótipo (Mar-Abr) ✓ — wireframes fechados
- `901712612053` — Digital & Portal (Abr-Jul) — Portal + backoffice em curso
- `901712133571` — Infra & Compras
- `901712133577` — Receitas & Produção
- `901712133582` — Marca & Comunicação

**Tasks abertas relevantes pra próxima fase:**
- 86e0rgdmz — Teste de usabilidade do Portal (5+ pessoas)
- 86e0rgdhn — Integrar Asaas ao Portal
- 86e12vwuz — Débito técnico Portal pós-teste
- 86e0xz4eh — MARCO push aberto teste do app
- 86e1adhrt — MARCO MVP wireframes concluído (aguardando Hugo fechar)
- 86e0zj8a1 — Backoffice arquitetura multi-plano

### Skills disponíveis pra usar na próxima conversa

- `/cora-brand-voice` — copy da marca
- `/cora-instagram-content` — posts do Instagram
- `/master-baker` — discussão técnica de panificação
- `/saas-ui-designer` — UI/UX SaaS
- `/humanizer` — remover cara de IA do texto
- `/business-plan` — plano de negócios
- `/canvas-design` — design visual
- `/skill-creator` — criar/editar skills

### Ferramentas de dev disponíveis

- VS Code + Claude Code (primário pra código)
- GitHub → Vercel (auto-deploy do Portal)
- Make.com (webhook → Sheets, validado)
- Asaas (cobrança, pendente integrar)

---

## 8. Como abrir a próxima conversa

**Sugestão de primeiro prompt:**

```
Tô retomando o projeto Cora pra começar a implementar o backoffice em 
código. Já tenho os 5 wireframes do MVP prontos (Semana, Planejamento, 
Produção, Expedição, Receitas).

Antes de codar, preciso decidir:
1. Stack do backoffice (Vite+React+Tailwind, Next.js, etc)
2. Backend (Supabase, Express custom, etc)
3. Auth + banco de dados
4. Por qual módulo começar (minha intuição: Receitas + Estoque)
5. Integração com Portal do Assinante

Tem documento de handoff salvo em CORA_Handoff_Wireframes_para_Codigo.md 
no Project Knowledge com todo o contexto consolidado.

Vamos discutir cada decisão antes de qualquer código. Sem pressa de 
implementar — quero estrutura primeiro.
```

---

## 9. Princípios da nossa colaboração (válidos pra próxima conversa)

- **Direto, sem condescendência.** Questionar premissas antes de executar.
- **Não desenvolver nada antes de confirmar.** Briefing primeiro, código depois.
- **Pensar em alternativas, não pegar primeira ideia.**
- **Brand voice e humanizer revisam textos da marca.**
- **Memory e Project Knowledge são fontes da verdade — manter atualizadas.**
- **ClickUp registra decisões e tasks — atualizar ao final de sessões.**
- **Usar skill `/master-baker` ou `/saas-ui-designer` quando apropriado.**

---

*Documento gerado em 10/mai/2026, encerrando a sessão de wireframes do MVP backoffice. Pronto pra próxima fase: implementação em código.*
