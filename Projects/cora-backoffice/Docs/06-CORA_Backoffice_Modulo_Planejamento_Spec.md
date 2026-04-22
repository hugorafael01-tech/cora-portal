# Cora Backoffice — Spec Módulo Planejamento

*Spec detalhada pra servir de brief no Claude Design. Abril 2026.*

**Objetivo do documento:** permitir que o Claude Design gere wireframes e protótipos do módulo Planejamento em 1-2 iterações, sem precisar inventar decisões já tomadas.

**Referências obrigatórias que o Claude Design deve ler antes de gerar:**
- `CORA_Design_System_v1.md` — tokens, cor, tipografia, anti-padrões
- `CORA_Backoffice_Spec_Consolidada_v2.md` — decisões de produto do backoffice
- `CORA_Backoffice_Schema_Rodada_2.md` — entidades `weeks`, `cardapios`, `plan_products`
- Skill `cora-brand-voice` — tom da copy da interface

---

## 1. Contexto

Planejamento é onde o Hugo define o **cardápio da próxima semana** (ou de semanas futuras). É a tela que responde "o que vou oferecer?".

**Quando é usado:**
- Domingo ou segunda-feira, quando o Hugo pensa a semana seguinte
- Eventualmente segunda à tarde pra ajustes de última hora
- **Corte de edição: terça 12h.** Depois disso, cardápio congela automaticamente e não pode mais ser editado para aquela semana

**Quem usa:** só o Hugo no MVP.

**O que não é:**
- Não é onde o Hugo define **receitas** — isso é no módulo Receitas
- Não é onde o Hugo acompanha a **produção** — isso é no módulo Produção
- Não é onde o Hugo vê **pedidos individuais** — isso é na Semana ou na Expedição
- É só a decisão "esta semana, ofereço estas opções"

---

## 2. Casos de uso reais

**Caso 1 — Planejar semana seguinte (fluxo padrão, domingo/segunda)**
> "Semana 15. Quero oferecer Multigrãos e Focaccia como rotativas. Brioche e Ciabatta ficam fora essa semana."

Fluxo: abre Planejamento → seletor de semana vai pra semana +1 → base (Original + Integral) aparece fixa → toggle Multigrãos e Focaccia como incluídos, Brioche e Ciabatta como não incluídos → confirma.

**Caso 2 — Verificar sugestão do sistema**
> "O sistema sugere Ciabatta essa semana porque não rolou nas últimas 2. Faz sentido — vou incluir."

Fluxo: na lista de rotativas, produto com selo "Sugerido" em destaque → Hugo toggle pra incluir.

**Caso 3 — Ajustar cardápio antes do corte**
> "Terça de manhã, ainda dá pra trocar. Vou tirar Focaccia porque vi que Azeite Luglio vai atrasar. Coloco Brioche no lugar."

Fluxo: abre Planejamento da semana atual (ainda em status `planejamento`) → desmarca Focaccia → marca Brioche → confirma.

**Caso 4 — Ver cardápio congelado pós-corte**
> "Quarta-feira. Já tá rodando. Só quero conferir o que vai sair."

Fluxo: abre Planejamento → cardápio em read-only, sem toggles → cada produto aparece com a info "X assinantes vão receber".

**Caso 5 — Voltar no tempo pra ver semana passada**
> "Qual era o cardápio da semana 14? Tenho impressão que não incluí Brioche — queria ver."

Fluxo: seletor temporal ← volta até semana 14 → visualização read-only do que foi oferecido.

---

## 3. Estrutura do módulo

**Apenas 1 tela**, com variações conforme o status da semana:

- **Modo edição:** semana com status `planejamento` (antes do cutoff de terça 12h)
- **Modo visualização:** semana com status `em_producao`, `expedicao` ou `concluida` (cardápio congelado)
- **Modo previsão:** semanas futuras além da próxima (editável mas com menos dados de volume)

---

## 3.1 Tela — Planejamento da Semana

### Estrutura visual

**Header da tela (topo, fixo):**
- Título em League Gothic: "PLANEJAMENTO"
- Navegação temporal: `← anterior | [SEMANA XX · DD-DD MMM YYYY] | próxima →`
- Indicador de status da semana: badge colorido ao lado da data
  - `Planejamento` → neutro (warm)
  - `Em produção` → amarelo/atenção (já passou do corte)
  - `Expedição` / `Concluída` → neutro escuro (histórico)

**Cabeçalho de contexto (abaixo do header):**
Faixa com infos-chave:
- Entrega prevista: "Quinta, 23 de abril"
- Corte de edição: "Terça, 21 abr · 12h" com badge dinâmico:
  - Se falta mais de 24h: neutro "faltam 2 dias"
  - Se falta menos de 24h: atenção (amarelo) "faltam 8h"
  - Se já passou: success "cardápio congelado"
- Assinantes ativos na semana: "42 assinantes"

**Seção 1 — Produtos da Assinatura (sempre disponíveis)**

Card destacado com fundo brand-50 e título em League Gothic: "PRODUTOS DA ASSINATURA".

Dois produtos lado a lado (ou empilhados no mobile):
- **Pão Original** (615g) · "18 assinantes escolheram"
- **Pão Integral** (615g) · "24 assinantes escolheram"

Explicação sutil em caption: "Produtos que fazem parte da Assinatura dos clientes. Sempre disponíveis, não editável aqui."

Clique num card → abre Receita em modo visualização.

**Seção 2 — Cardápio da semana (editável no modo edição)**

Título em League Gothic: "CARDÁPIO DESTA SEMANA".
Caption: "Produtos que os assinantes podem adicionar à Cesta desta semana."

Lista simples (sem agrupamento por categoria no MVP) com todas as receitas ativas que podem ser oferecidas no Cardápio. Cada card mostra:
- Nome do produto (Montagu 500)
- Peso (Montagu caption): "615g"
- Preço avulso: "R$ 32"
- Selo "Sugerido" se o produto não foi oferecido nas últimas 2 semanas
- Toggle "Incluir no Cardápio" (switch ou checkbox grande, acessível no mobile)

Info dinâmica abaixo da lista:
- Contador: "4 produtos no Cardápio desta semana"
- Sem limite rígido. Alerta suave se passar de 6: "Cardápio extenso pode diluir o apelo das novidades. Decisão sua."

**Nota sobre agrupamento por categoria:** deixar pra quando houver múltiplos planos de Assinatura. No MVP, lista plana basta.

**Seção 3 — Volume estimado (read-only)**

Card com fundo warm-100, título "VOLUME ESTIMADO".

4 números grandes em League Gothic:
- **42 cestas** (total da semana)
- **X pães** (soma das Bases previstas)
- **Y kg de massa** (estimativa pro planejamento de produção)
- **Z g de levain** (estimativa pro refresco de terça)

Caption embaixo: "Estimativa baseada nos assinantes ativos. Confirmação final no corte de terça 12h."

**Seção 4 — Ação (rodapé fixo no modo edição)**

- Botão primário brand-500: "Publicar Cardápio" (desabilitado se não houve mudança)
- Link secundário: "Ver como aparece no Portal" (abre preview do que o assinante verá)

No modo visualização (pós-corte):
- Rodapé some
- Mensagem sutil no topo: "Cardápio congelado em terça 12h. Pra mudanças, próxima semana."

### Interações

- **Toggle produto no Cardápio:** atualização imediata no contador. Não persiste até "Publicar Cardápio".
- **Navegação temporal:** atualiza toda a tela sem reload.
- **Clicar num produto:** abre Receita em modo visualização (só leitura da versão ativa).
- **Clicar "Publicar Cardápio":** persiste no banco, atualiza Portal do Assinante, mostra confirmação em toast.
- **Clicar "Ver como aparece no Portal":** preview modal ou nova aba com snapshot visual do Portal.

### Validações e alertas

- **Tentativa de editar semana congelada:** toggles desabilitados, tooltip "Semana já em produção. Edições valem pra semana seguinte."
- **Publicar sem mudanças:** botão "Publicar" desabilitado.
- **Feedback ao publicar:** toast "Cardápio publicado. Assinantes já veem no Portal."
- **Cardápio extenso (mais de 6 produtos):** alerta suave "Cardápio extenso pode diluir o apelo das novidades. Decisão sua."

### Responsividade

- **Desktop (≥1024px):** seções em colunas quando couber, produtos em grid 2-3 colunas
- **Tablet (768-1023px):** seções empilhadas, grid 2 colunas
- **Mobile (<768px):** tudo empilhado, cards em coluna única com toggles grandes

---

## 4. Regras de negócio que a UI aplica

**Corte de terça 12h:** a aplicação precisa verificar, ao carregar a tela, se `cutoff_at` da semana já passou. Se sim, muda pra modo visualização automaticamente.

**Atualização do contador de assinantes:** é snapshot no carregamento. Não atualiza em real-time. Se o Hugo deixar a tela aberta por horas, o número pode estar desatualizado — não é crítico.

**Produtos da Assinatura sempre disponíveis:** Original e Integral são sempre exibidos no Cardápio (clientes que têm esses produtos na Base recebem automaticamente). UI não oferece toggle pra desativá-los no Planejamento. Se algum dia mudar (ex: Hugo descontinuar Integral), é via módulo Receitas (arquivando a receita), não via Planejamento.

**Sem limite rígido de produtos no Cardápio:** Hugo decide quantos produtos oferecer por semana. Alerta suave se passar de 6, sem bloqueio.

**Sugestão de produto:** algoritmo simples. Um produto é "sugerido" se:
- Tem `status: ativa`
- Não foi oferecido nas últimas 2 semanas (incluindo a atual)
- Sistema destaca com selo "Sugerido" mas não força inclusão

**Publicação:** ao confirmar, os `cardapios` da semana são persistidos. Tabela carrega por default os produtos publicados na última semana. Salvar atualiza ou cria registros conforme as escolhas.

---

## 5. Padrões visuais

**Design system:** aplicar Cora DS v1 rigorosamente.

**Tipografia:**
- Título da tela e seções: League Gothic (uppercase)
- Nomes de produto: Montagu 500 (destaque)
- Captions, contadores: Montagu caption (warm-500)
- Números grandes (volume estimado): League Gothic display, brand-700

**Cores por estado:**
- Produto incluído no cardápio: fundo brand-50, borda brand-200, toggle ativo brand-500
- Produto não incluído: fundo warm-100, borda warm-200, toggle off
- Produto congelado (pós-corte): fundo warm-50, toggle ausente, caption "X assinantes vão receber"
- Selo "Sugerido": badge amarelo suave (atenção) sem ser urgente

**Toggle:**
- Padrão: switch horizontal (on/off) de 44px altura mobile — touch target seguro
- Cor ligado: brand-500
- Cor desligado: warm-300

**Elementos específicos:**
- Navegação temporal: botões com ícones `chevron-left` e `chevron-right` da Lucide, fundo warm-100 hover warm-200
- Badge de status da semana: arredondado, caption, com ponto colorido antes do texto
- Contador de assinantes: ícone `users` da Lucide + número

---

## 6. Tom de copy

Aplicar skill `cora-brand-voice`.

**Bons:**
- "42 assinantes ativos nesta semana"
- "Cardápio congelado terça 12h"
- "Essa rotativa não rodou nas últimas 2 semanas"
- "Você escolhe quais ficam disponíveis esta semana"
- "Cardápio publicado. Assinantes já veem no Portal."

**Ruins:**
- "Cardápio salvo com sucesso" (jargão)
- "Ação bloqueada. Semana já em produção." (punitivo)
- "Atenção! Limite atingido!" (dramático)
- "Confirme sua seleção" (formal demais)

---

## 7. O que NÃO vai no MVP

- **Planejamento em lote** (definir várias semanas de uma vez) — uma por vez basta
- **Preview automático do Portal com dados reais** — mostra só um mockup visual do que vai aparecer, não conectado em tempo real
- **Análise de mix histórico** ("Multigrãos tem demanda alta, ofereça mais") — sem dados suficientes pra isso
- **Sugestões inteligentes além da regra simples** (últimas 2 semanas) — IA não entra no MVP
- **Comunicação automática aos assinantes** ("Esta semana teremos X e Y!") — WhatsApp broadcast é manual
- **Exportação do cardápio** em PDF/imagem pra compartilhar

---

## 8. Dependências e pendências

**Dependências:**
- Schema Rodada 2 (`weeks`, `cardapios`, `plan_products`, `products`)
- Módulo Receitas pronto (pra abrir produto ao clicar)
- Módulo Semana integrado (navegação temporal compartilhada)
- Portal do Assinante atualizado pra refletir o cardápio publicado

**Pendências externas que não bloqueiam a tela:**
- Task 86e0zqzeb (focaccia 1/6) — não afeta UI de Planejamento
- Task 86e0zj8ab (preços avulsos) — não afeta UI de Planejamento

**Decisões que o Claude Design NÃO deve tomar sozinho:**
- Adicionar seleção de base (Original / Integral) como editável
- Inventar sistema de "aprovação" do cardápio (não tem)
- Criar limite mensal diferente de 4 rotativas
- Adicionar campos de preço na tela (preço vem do Produto, não do cardápio semanal)
- Adicionar comunicação automática aos assinantes

---

## 9. Ordem de entrega sugerida pro Claude Design

**Iteração 1:** tela principal em modo edição — desktop + mobile. Estrutura geral com base, rotativas, extras, volume, ações.

**Iteração 2:** estados condicionais:
- Modo visualização (pós-corte, cardápio congelado)
- Alerta de "4 rotativas atingidas"
- Selo "Sugerido" em ação

**Iteração 3:** navegação temporal funcional (cruzando entre semana atual, próxima, passada) + modal de preview do Portal.

3 iterações cobrem o módulo. Planejamento é mais simples que Receitas.

---

*Documento de referência · Spec Módulo Planejamento · Backoffice Cora · Abril 2026*
