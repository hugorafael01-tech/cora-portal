# Cora Backoffice — Spec Módulo Receitas

*Spec detalhada pra servir de brief no Claude Design. Abril 2026.*

**Objetivo do documento:** permitir que o Claude Design gere wireframes e protótipos do módulo Receitas em 1-2 iterações, sem precisar inventar decisões que já estão tomadas em outras specs.

**Referências obrigatórias que o Claude Design deve ler antes de gerar:**
- `CORA_Design_System_v1.md` — tokens, cor, tipografia, anti-padrões
- `CORA_Backoffice_Spec_Consolidada_v2.md` — decisões de produto do backoffice
- `CORA_Backoffice_Schema_Rodada_2.md` — entidades e campos (Produto, Receita, VersaoReceita, etc.)
- Skill `cora-brand-voice` — tom da copy da interface

---

## 1. Contexto

Receitas é o módulo onde o Hugo gerencia o **catálogo técnico** da Cora. É uso semanal (não mensal como inicialmente imaginado na v1 da spec) porque o Hugo ajusta receitas com frequência:

- Testa uma farinha nova → cria versão nova do Integral
- Entra um extra sazonal → registra receita nova como `teste`
- Descaracteriza uma receita → arquiva versão antiga, cria produto novo

É o coração do catálogo: toda produção da semana referencia uma `VersaoReceita`. Se a receita for mal organizada aqui, todo o resto (Semana, Planejamento, Produção) herda o problema.

**Quem usa:** só o Hugo no MVP. Perfis múltiplos vêm pós-lançamento.

**Quando usa:** semanalmente, em dois momentos:
- Segunda/terça, quando planeja a semana e quer rever/ajustar uma receita antes de produzir
- Quarta à noite ou quinta depois da cocção, quando registra observações ou identifica ajuste necessário

---

## 2. Casos de uso reais

Cinco cenários que a interface precisa suportar sem fricção:

**Caso 1 — Criar receita nova do zero**
> "Quero começar a desenvolver o Brioche de cacau. Vou montar ingredientes, processo, testar 2-3 vezes antes de ativar."

Fluxo: clica "Nova receita" → preenche nome, tipo, elegibilidade pra Assinatura, grupo sugerido, shape → adiciona ingredientes com % baker → adiciona passos do processo → salva como `rascunho`.

**Caso 2 — Ajustar proporção de uma receita existente**
> "O Integral estava em 60% FV / 40% Mora. Vou testar 70/30 essa semana."

Fluxo: abre Integral → clica "Editar" → sistema cria v2 em `rascunho` → ajusta baker % dos ingredientes → adiciona nota na versão ("teste 70/30") → salva → ativa pra próxima semana.

**Caso 3 — Arquivar receita que saiu do catálogo**
> "Tirei o pão de azeitonas do cardápio. Mas quero guardar a ficha."

Fluxo: abre Pão de Azeitonas → clica "Arquivar" → confirma → receita fica read-only, não aparece no Planejamento, mas fica acessível via filtro "Arquivada".

**Caso 4 — Comparar receita com versão anterior**
> "O Original v2 ficou diferente da v1. Quero ver o que mudou."

Fluxo: abre Original v2 → clica "Ver versões anteriores" → sistema lista v1 → Hugo abre v1 em visualização read-only → alterna entre v1 e v2 pra comparar ingredientes.

**Caso 5 — Adicionar passo customizado numa receita específica**
> "A Focaccia vai ganhar um passo novo: 'estica no tabuleiro' entre fermentação primária e dimples."

Fluxo: abre Focaccia v1 (status `rascunho` ou edita nova versão) → seção Processo → "+ Adicionar passo" entre passos existentes → preenche título, offset, variável crítica, nota contextual → salva.

---

## 3. Estrutura do módulo

Duas telas:

- **3.1 — Listagem de Receitas** (tela de entrada do módulo)
- **3.2 — Detalhe/Edição de Receita** (abre ao clicar numa receita ou em "Nova receita")

---

## 3.1 Tela — Listagem de Receitas

### Função
Mostrar todas as receitas do catálogo. Permitir filtro por status/elegibilidade. Destaque pras ativas. Ação primária: criar nova.

### Estrutura visual

**Header da tela (fixo no topo):**
- Título em League Gothic: "RECEITAS"
- Contador: "7 ativas · 3 em teste · 12 arquivadas" (em Montagu caption)
- Botão primário brand-500: "+ Nova receita" (canto direito)

**Barra de filtros (abaixo do header):**
- Filtro por **Status**: Todas | Rascunho | Teste | Ativa | Arquivada. Default: "Ativa" (foco em operação)
- Filtro por **Elegibilidade**: Todas | Apenas elegíveis pra Assinatura | Apenas Cardápio
- Campo de busca livre por nome (Montagu, borda warm-200)

**Lista de receitas (corpo principal):**

No desktop, tabela densa. No mobile, cards empilhados.

Colunas (desktop) / informações por card (mobile):
- Nome do produto (Montagu 500, destaque)
- Badge de Status: cor do DS (ativa = brand-500 fundo brand-50; rascunho = warm; teste = info; arquivada = neutro)
- Badge de Elegibilidade: "Assinatura" (se eligible_for_subscription = true) ou "Cardápio" (se false)
- Versão ativa: "v2" (Montagu caption)
- Grupo sugerido: "Grupo 2" (Montagu caption)
- Shape: "banneton" (Montagu caption)
- Última produção: "Semana 14 · 18/abr" (Montagu caption)
- Ação: chevron › (link pro detalhe)

Linhas clicáveis (abrem detalhe). Zero botões de ação rápida na listagem — a ação vem na tela de detalhe.

**Estados vazios:**
- Sem receitas no filtro aplicado: "Nenhuma receita corresponde aos filtros. Limpar filtros" (warm-500, call pra ação)
- Banco vazio (primeira vez): "Comece criando sua primeira receita." + botão "+ Nova receita" centralizado

### Interações
- Clicar numa linha/card → abre detalhe (3.2)
- Clicar em "+ Nova receita" → abre detalhe em modo criação
- Aplicar filtro → atualiza lista sem reload da página
- Busca livre → debounce 300ms, filtra client-side

### Responsividade
- Desktop (≥1024px): tabela de 7 colunas, filtros horizontais no topo
- Tablet (768-1023px): tabela com colunas menos importantes (último uso, shape) colapsadas em tooltip
- Mobile (<768px): cards verticais empilhados, filtros em dropdown/bottom-sheet

---

## 3.2 Tela — Detalhe/Edição de Receita

### Função
Visualizar e editar uma receita completa. Suporta 4 modos conforme o status:

| Status | Metadados | Ingredientes | Processo |
|---|---|---|---|
| Rascunho | Editável | Editável | Editável |
| Teste | Editável | Editável | Editável |
| Ativa | Editável parcial (ver regras) | Read-only (criar v2 pra editar) | Read-only |
| Arquivada | Read-only | Read-only | Read-only |

### Estrutura visual

**Breadcrumb (topo):**
- Receitas › Nome do produto (com versão: "Integral · v2")

**Header da receita:**
- Nome em League Gothic grande (heading-1)
- Linha de metadados em Montagu: "v2 · ATIVA · ASSINATURA · 615g · Grupo 3 · Banneton"
- Badges de status e elegibilidade
- Ações (canto direito):
  - "Editar" (cria v3 automaticamente se status=ativa)
  - "Duplicar" (cria receita nova a partir dessa)
  - Menu kebab: Arquivar | Ver versões anteriores | Exportar CSV

**Tabs de seção (abaixo do header):**
Organização horizontal, navegação sem reload:
1. Geral (informações gerais da receita)
2. Ingredientes
3. Processo
4. Histórico de produções (v1.1 — mostrar mensagem "Disponível após primeiras produções" no MVP)

### Tab: Geral

Campos em duas colunas no desktop, uma coluna no mobile:

- **Produto vinculado:** dropdown → Produto existente OU botão "+ Criar novo produto"
- **Nome da receita:** texto (default = nome do produto)
- **Tipo:** read-only "fabricado" (revenda é pós-MVP)
- **Elegível para Assinatura:** toggle on/off — se on, produto pode entrar na Base da Assinatura; se off, só fica disponível como Extra no Cardápio
- **Grupo sugerido:** 1 / 2 / 3 (radio com legenda: "Grupo 1 demanda frio · Grupo 2 fermentação longa · Grupo 3 simples")
- **Shape:** dropdown → banneton / couche / tabuleiro / forma
- **Peso unitário (g):** numérico com sufixo "g"
- **Rendimento (un por receita):** numérico
- **Perda de cocção estimada (%):** numérico com sufixo "%"
- **Notas:** textarea livre

Rodapé com botão "Salvar alterações" (brand-500) e "Cancelar" (outline).

### Tab: Ingredientes

Tabela editável. Colunas:

- **Ordem** (drag handle à esquerda pra reordenar)
- **Ingrediente** (dropdown populado de `ingredients` + botão "+ Novo ingrediente" se não existir)
- **% baker** (numérico, 2 decimais, sufixo "%")
- **Gramas base (g)** (numérico, 2 decimais, sufixo "g")
- **Ação** (ícone trash pra remover)

**Rodapé da tabela:**
- Botão "+ Adicionar ingrediente" (abaixo da última linha)
- Resumo agregado:
  - Farinha total: X g (base de cálculo)
  - Hidratação total: Y % (água / farinha)
  - Massa base calculada: Z g (soma de tudo)

**Regra da farinha:** o sistema identifica automaticamente quais ingredientes são "farinha" (pela categoria do ingrediente ou pelo slug com prefixo `farinha-`). Farinha total serve de base pro cálculo de % baker nos outros ingredientes.

### Tab: Processo

Lista vertical de passos (cards ou linhas), cada um editável.

Cada passo tem:
- **Drag handle** pra reordenar
- **Número do passo** (auto-incrementado)
- **Título** (texto, ex: "Autólise")
- **Offset de tempo** (ex: "30 minutes" — input com máscara H:MM ou padrão legível)
- **Duração esperada** (idem offset)
- **Variável crítica** (texto livre, ex: "T° massa pós-batimento (máx 23°)")
- **Nota contextual** (textarea, ex: "Adiciona levain, sal e H2O2. Falsa dobra no fim.")
- **Ação** (kebab menu: duplicar passo, remover)

Botão "+ Adicionar passo" (abaixo da lista, também disponível entre passos pra inserir no meio).

**Template 7 passos:** ao criar receita nova, sugerir os 7 passos padrão pré-preenchidos. Hugo edita ou remove o que não serve.

### Tab: Histórico de produções

**No MVP:**
- Empty state ou mensagem: "Nenhuma produção registrada ainda. Assim que essa receita for produzida, o histórico aparecerá aqui."
- Listagem simples quando houver dados: Data da produção · Semana · Unidades produzidas · Peso médio · Link pra ficha completa (na Produção)

**Fora do MVP:** comparação lado a lado, gráficos de tendência, destaque de variáveis anômalas (isso é v1.1, outubro 2026).

---

## 4. Regras de negócio que a UI aplica

**Rascunho → Teste:** quando Hugo clica em "Colocar em teste", o sistema valida:
- Tem pelo menos 1 ingrediente
- Tem pelo menos 1 passo
- Tem nome, peso unitário, rendimento
Se passar, muda status.

**Teste → Ativa:** o sistema pergunta: "Tornar v2 a versão ativa? Isso substitui v1 a partir da próxima semana (após o corte de terça 12h)." Confirmação dupla.

**Editar receita ativa:** clicar em "Editar" numa receita `ativa` NÃO altera a versão atual. O sistema:
1. Cria nova versão (v3 a partir da v2 ativa)
2. Copia ingredientes e passos da v2
3. Status inicial = `rascunho`
4. Avisa no topo: "Você está editando a v3. A v2 continua ativa. Pra ativar a v3, clique em 'Tornar ativa' quando estiver pronta."

**Arquivar receita ativa:** avisa "Essa receita tem 12 assinantes ativos usando como base. Arquivar vai impedir novas produções mas mantém o histórico. Confirme."

---

## 5. Padrões visuais

**Design system:** aplicar Cora DS v1 rigorosamente. Nada inventado.

**Tipografia:**
- Títulos de tela: League Gothic heading-1 (30px), uppercase
- Seção/tab: League Gothic heading-3 (20px), uppercase
- Corpo, labels, valores: Montagu Slab body (16px) ou body-sm (14px)
- Para mobile: aplicar escala ampliada do Backoffice (body 18px, body-sm 16px, caption 14px) — referência na task 86e0zpc7h

**Cores de status (badges):**
- Rascunho: `neutral` (warm-200 bg, warm-700 text)
- Teste: `info` (brand-50 bg, brand-700 text)
- Ativa: `success` (D1FAE5 bg, 065F46 text)
- Arquivada: `neutral` escuro (warm-300 bg, warm-800 text)

**Cores de elegibilidade:**
- Assinatura: brand-500 bg / white text (forte) — produto pode entrar na Base
- Cardápio: warm-200 bg / warm-800 text — produto fica disponível só como Extra avulso

**Formatação de números:**
- Gramas: `Xg` (ex: "580g")
- Porcentagem: `X%` ou `X,X%` (ex: "75,5%")
- Temperatura: `X°C` ou `XX,X°C` (ex: "25,5°C")
- Sempre vírgula decimal, nunca ponto

**Elementos específicos:**
- Drag handles: ícone lucide `grip-vertical` em warm-400
- Kebab menu: lucide `more-vertical` em warm-500
- Não usar sombras (design system proíbe)
- Botões com radius-md (8px), nunca pill

---

## 6. Tom de copy

Aplicar skill `cora-brand-voice`. Exemplos:

**Bons:**
- "Nova receita" (não "Criar Receita")
- "Versão em teste. Ainda não vende."
- "Essa receita não é produzida há 8 semanas. Arquivar?"
- "Ingredientes e processo dessa versão estão congelados. Pra ajustar, crie uma nova versão."
- "A v3 está ativa desde a semana 15."

**Ruins (evitar):**
- "Criação realizada com sucesso" (jargão)
- "Deseja prosseguir?" (formal demais)
- "Atenção! Ação irreversível!" (punitivo)
- "Receita arquivada" (frio, sem contexto)

---

## 7. O que NÃO vai no MVP

Escopo explicitamente fora:

- Importação em lote (CSV, xlsx) — Hugo cadastra manualmente
- Comparação lado a lado de versões — visualização isolada basta
- Gráficos e análises — tudo textual
- Cálculo automático de custo da receita — usa a ficha xlsx v5 pra isso
- Fotos por receita — só texto no MVP
- Compartilhamento externo da receita
- Comentários/discussão interna (sistema solo)
- Aprovação multi-step (não tem outra pessoa aprovando)
- Export PDF com layout bonito — só export CSV dos dados crus

**Importante:** essas ausências NÃO são "pra depois". São "só se virar necessidade real depois da operação rodar".

---

## 8. Dependências e pendências

**Dependências de outras specs:**
- Schema Rodada 2 (tabelas e campos)
- Cora DS v1 (visual)
- Spec Consolidada v2 (regras de produto)

**Pendências que impactam esta tela:**
- Status real da receita Focaccia: 1/9 ou 1/6 do tabuleiro — task `86e0zqzeb`. Até resolver, fica como 1/6 no schema.
- Preços avulsos dos 6 produtos — task `86e0zj8ab`. Não afeta UI de Receitas diretamente, mas pode eventualmente entrar como campo exibido.

**Decisões que o Claude Design NÃO deve tomar sozinho:**
- Adicionar fotos nos cards/detalhes (fora de escopo MVP)
- Inventar campos que não estão em schema
- Criar estados visuais novos fora do DS
- Mudar a estrutura de 4 tabs no detalhe (geral, ingredientes, processo, histórico)

---

## 9. Ordem de entrega sugerida pro Claude Design

Quando for pro Claude Design, pedir na seguinte ordem pra otimizar créditos:

**Iteração 1:** tela de Listagem (3.1) — desktop + mobile em uma geração. Validar estrutura, filtros, tipografia.

**Iteração 2:** tela de Detalhe, modo visualização de receita Ativa. Foca em tabs, header, tab Geral. Valida navegação.

**Iteração 3:** mesma tela de Detalhe, mas modo de edição (Rascunho). Tabs de Ingredientes e Processo com campos editáveis. Valida interações de edição.

**Iteração 4:** estados especiais — empty states, confirmações de ativar versão, diálogos de arquivar receita em uso.

Se seguir essa ordem, 4 iterações cobrem o módulo inteiro. Sem essa ordem, pode estourar 6-7 iterações fácil.

---

*Documento de referência · Spec Módulo Receitas · Backoffice Cora · Abril 2026*
