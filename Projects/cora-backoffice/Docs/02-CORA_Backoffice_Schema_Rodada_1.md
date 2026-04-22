# Cora Backoffice — Schema do Banco (MVP)

*Especificação do modelo de dados pra implementação do Claude Code.*

**Versão:** v1-validado (abril 2026)
**Base:** spec v2 consolidada do Backoffice
**Fase atual:** Rodada 1 — Mapa de entidades (estrutura validada)
**Próxima:** Rodada 2 — Detalhamento de campos

---

## Histórico de decisões

Essa versão consolida as discussões de abril 2026. Todas as "4 decisões não-óbvias" da versão anterior foram validadas com ajustes:

1. **Cardapio como tabela separada** — validado. Nome mantido (`Cardapio`), não renomeado pra "cesta" porque "cesta" é termo do assinante (portal) e gerou ambiguidade com pedidos individuais.
2. **Assinatura imutável após cancelar** — validado. **Mas a regra "1 assinatura ativa por assinante" foi relaxada** — múltiplas assinaturas ativas permitidas pro mesmo assinante (ex: 2 endereços).
3. **Produto base sem snapshot de versão** — validado. Inclui 3 regras de negócio explícitas.
4. **Grupo de produção** — validado com simplificação: **só `Receita.grupo_sugerido`**, sem `Producao.grupo_real`. Decisão do padeiro na hora, sem registro persistido (reduz preciosismo de sistema).
5. **Lote de farinha** — decidido como **texto livre** em ProducaoContexto, não FK pra Insumo. Prioriza preenchimento sobre estrutura.

---

## Princípios de design

5 decisões que orientam tudo:

1. **Multi-plano ready desde o dia 1.** Mesmo com um único plano ativo no MVP, a estrutura `Plano + PlanoProduto` existe. Zero refactor quando o Premium entrar.

2. **Produto ≠ Receita.** A entidade central é `Produto` (com `tipo: fabricado | revenda`), não `Receita`. `Receita` é uma propriedade opcional de produtos fabricados. Prepara pra empório sem custo no MVP.

3. **Versionamento imutável de receitas.** Cada edição cria nova `VersaoReceita`. Produções ficam linkadas à versão usada, não à receita "atual". Garante rastreabilidade pra diagnóstico.

4. **Semana é entidade, não campo.** `Semana` existe como tabela porque guarda cardápio + produção + pedidos + levain daquela janela temporal. Permite alteração de cardápio pós-corte, registro de cancelamentos, replays históricos.

5. **Contexto diagnóstico separado do processo.** `ProducaoContexto` é tabela própria, não colunas de `Producao`. Permite evoluir campos diagnósticos sem mexer no histórico estrutural.

---

## Mapa geral (4 domínios)

```
┌─ CATÁLOGO ─────────────────────────────────────────────┐
│                                                         │
│   Produto ◄──────── PlanoProduto ────────► Plano       │
│      │  (papel)                                         │
│      │                                                  │
│      ▼ (se tipo=fabricado)                              │
│   Receita ──► VersaoReceita                             │
│                  │                                      │
│                  ├──► Ingrediente (M:N via              │
│                  │     ReceitaIngrediente)              │
│                  │                                      │
│                  └──► PassoReceita (template 7 passos)  │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─ OPERAÇÃO ─────────────────────────────────────────────┐
│                                                         │
│   Semana                                                │
│     │                                                   │
│     ├──► Cardapio ──► Plano, Produto, papel             │
│     │                                                   │
│     ├──► Producao ──► VersaoReceita                     │
│     │      │                                            │
│     │      ├──► ProducaoPasso (horário, temp)           │
│     │      │                                            │
│     │      ├──► ProducaoContexto (diagnóstico)          │
│     │      │                                            │
│     │      └──► ProducaoResultado (peso, qtd, obs)      │
│     │                                                   │
│     └──► LevainRefresco (ter 1º, ter 2º, ida TF)        │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─ COMERCIAL ────────────────────────────────────────────┐
│                                                         │
│   Assinante (dados pessoais)                            │
│     │                                                   │
│     └──► Assinatura (N ativas permitidas) ──► Plano     │
│              │                                          │
│              ├──► produto_base_id (FK → Produto)        │
│              │                                          │
│              └──► endereco_entrega (por assinatura)     │
│                                                         │
│   Pedido (vinculado a Semana + Assinatura)              │
│     │                                                   │
│     ├──► ItemPedido ──► Produto + VersaoReceita         │
│     │                                                   │
│     └──► Entrega (status, endereco_snapshot)            │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─ INSUMOS (mínimo MVP) ─────────────────────────────────┐
│                                                         │
│   Fornecedor                                            │
│     └──► Insumo (estoque, lead_time, mínimo)            │
│                                                         │
│   Nota: lote da farinha em produção fica como           │
│   texto livre em ProducaoContexto (não FK aqui)         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Domínio 1 — Catálogo

Tudo que a Cora **pode** vender ou produzir. Não depende de semana específica.

### Produto
Entidade central do catálogo. Representa qualquer item vendável ou produzível.

- **Tipo:** `fabricado` (tem Receita associada) ou `revenda` (futuro empório)
- **Unidade:** `un` (padrão) ou `kg` (venda por peso, futuro)
- **Peso unitário, preço avulso, slug, descrição**
- **No MVP:** só existem produtos `fabricado`. Empório = schema pronto, UI ausente.

### Plano
Um plano de assinatura (ex: Base R$99).

- **No MVP:** apenas um registro ativo (Base)
- **Futuro:** Premium R$110 adiciona novo registro, zero refactor

### PlanoProduto
Relação entre Plano e Produto — define o **papel** do produto naquele plano.

- **Papel:** `base` (escolha do assinante), `rotativa` (parte do rodízio mensal), `extra` (avulso pago), `teste` (em validação)
- **Restrição mental:** um mesmo produto pode ter papéis diferentes em planos diferentes. Multigrãos pode ser `rotativa` no Base e `base` no Premium.
- **Este é o ponto da arquitetura multi-plano.** Sem essa tabela, o esquema "papel no Produto" quebra na hora de introduzir o segundo plano.

### Receita
Ficha técnica de um produto fabricado. 1:1 com Produto quando tipo=fabricado.

- Ponteiro pra versão ativa (`versao_ativa_id`)
- **Grupo sugerido** (1, 2 ou 3 — critérios do Alex). Decisão do padeiro na hora da produção; não há registro de grupo real (ver Producao).
- **Shape:** banneton | couche | tabuleiro | forma

### VersaoReceita
Versionamento imutável. Cada edição cria nova versão.

- **v1, v2, v3...** — nunca sobrescreve
- **Status por versão:** `rascunho` | `teste` | `ativa` | `arquivada`
- Produção sempre linka pra `versao_receita_id` específica, não pra Receita "atual"
- Permite responder "qual versão eu rodei na semana 14?" meses depois

**Regras de negócio vinculadas (validadas em abril 2026):**

1. **Rascunho não pode ser ativa.** O sistema só permite definir `versao_ativa_id` se `VersaoReceita.status ∈ {teste, ativa}`. Proteção contra rascunho vazar em produção.
2. **Congelamento no corte de terça.** A versão ativa usada numa semana é congelada no momento do corte (terça 12h). Mudanças de versão ativa depois do corte valem apenas pra semana seguinte.
3. **Comunicação ativa em mudança de ingrediente.** Versão nova que altera ingredientes (ex: adição de semente) exige comunicação externa (WhatsApp) pros assinantes impactados. Regra editorial, não automática pelo sistema — mas documentada aqui pra não esquecer.
4. **Mudança grande vira produto novo.** Se o ajuste descaracteriza o produto (ex: Integral com lecitina vira "Integral Plus"), não é uma nova versão — é um Produto novo. Regra editorial pra evitar versionamento infinito de receitas que viraram outra coisa.

### Ingrediente + ReceitaIngrediente
Ingredientes são independentes (FV T1, Superiore, sal, água) e entram em múltiplas receitas.

- ReceitaIngrediente liga versão da receita → ingrediente, com **% baker** e **gramas base**
- **Não confundir com Insumo.** Ingrediente é conceitual ("farinha integral da FV"). Insumo é físico ("saco com 25kg comprado em 14/04").

### PassoReceita
Os 7 passos do template padrão, ou seja lá quantos a receita tiver.

- Ordem sequencial, editável por receita (add/remove)
- Cada passo tem: título, horário esperado (offset do início do dia), nota contextual, variável crítica a registrar

---

## Domínio 2 — Operação

O que efetivamente aconteceu (ou vai acontecer) numa semana específica.

### Semana
Janela temporal de operação (seg a dom, ou ter a ter — a definir).

- Status: `planejamento` | `em_producao` | `expedicao` | `concluida`
- **Por que tabela e não só campo:** guarda o snapshot do cardápio, do levain, das produções, dos pedidos. Permite voltar no tempo.

### Cardapio
O que **está disponível** naquela semana, por plano.

- Linha por combinação Semana + Plano + Produto
- **Papel naquela semana:** `base`, `rotativa`, `extra`. Esse papel **sobrescreve** o papel do PlanoProduto se necessário (raro, mas possível: semana promocional).
- **Corte de edição:** campo `congelado` vira true na terça 12h
- **Regra de leitura:** PlanoProduto é catálogo, Cardapio é snapshot operacional. Nunca ler de Cardapio pra responder "o que o plano oferece?". Sempre de PlanoProduto.

### Producao
Uma receita sendo produzida numa semana específica.

- FK pra `versao_receita_id` (imutabilidade)
- Quantidade prevista e real
- Status automático: `planejada` → `em_producao` → `cocção` → `concluida`
- **Não tem campo `grupo_real`.** Grupo de produção é decisão do padeiro no momento, não registro persistido. Se virar necessário analisar no futuro, adiciona depois.

### ProducaoPasso
Registro operacional: horário previsto vs. real, temperatura, obs por passo.

- Linha por passo do processo da receita naquela produção
- Preenchimento gradual durante o dia

### ProducaoContexto
Registro diagnóstico. Uma linha por Producao.

- **Lote da farinha principal** — **texto livre** (não FK). Hugo escreve "#L24", "FV abril batch 2", "não anotei" ou deixa vazio. Prioriza preenchimento sobre estrutura.
- **Horas desde o refresco do levain** (auto-calculado de LevainRefresco)
- **T° ambiente máxima do dia**
- **Hidratação ajustada** (%, se diferente da receita)

**Por que separar:** os campos críticos de diagnóstico podem evoluir (adicionar umidade, pressão atmosférica, o que seja). Mantê-los em tabela própria isola o schema de Producao do processo de refinamento da ficha.

**Evolução futura (v1.1, out/nov 2026):** quando a view comparativa entrar e houver histórico real, avaliar se `lote_farinha_principal` vira um input híbrido (dropdown alimentado pelo histórico + permite texto novo). Meio-termo entre livre e estruturado.

### ProducaoResultado
Fechamento da produção.

- Pães produzidos (prev vs. real), peso médio, avaliação de miolo/crosta (ok/ajustar), obs livre

### LevainRefresco
Registro operacional do levain. Uma linha por refresco (geralmente 2 por semana, na terça).

- Semana, data/hora, tipo (1º refresco | 2º refresco | ida TF)
- Proporção (1:2:2 padrão), quantidade final em gramas

---

## Domínio 3 — Comercial

Quem compra, o que compra, como recebe.

### Assinante
Dados pessoais do cliente. Permanente — nunca deletado.

- Nome, email, whatsapp, gênero
- **Sem endereço aqui.** Endereço fica em Assinatura (pra permitir múltiplos endereços do mesmo CPF)

### Assinatura
Vínculo ativo com um plano. **Um assinante pode ter múltiplas assinaturas ativas simultaneamente** (ex: uma pra casa, outra pro escritório).

- FK Assinante + Plano
- **Produto base escolhido** (FK → Produto: Original ou Integral — as duas opções da relação PlanoProduto com papel=base)
- **Endereço de entrega** (próprio da assinatura, não do assinante)
- Status: `ativa` | `pausada` | `cancelada`
- Datas de início, pausa, cancelamento

**Regras de negócio:**

1. **Assinatura imutável depois de cancelar.** Reativação = nova Assinatura (registro novo). Preserva histórico pra análise de churn, LTV, coortes.
2. **Múltiplas ativas permitidas.** Removido o constraint "1 ativa por assinante". Permite caso "mesmo CPF, múltiplos endereços".
3. **Unicidade protegida.** Constraint de banco: `UNIQUE (assinante_id, endereco_hash, status=ativa)` — evita duplicata acidental da mesma assinatura.
4. **"Assinante ativo" é query, não campo.** Sempre `COUNT(DISTINCT assinante_id WHERE assinatura.status=ativa)`.
5. **Pausa ≠ Cancelamento.** Pausa muda status da mesma Assinatura (ativa → pausada → ativa). Cancelamento encerra definitivamente.

### Pedido
Agregador do que **uma assinatura** recebe numa semana específica.

- FK Semana + Assinatura (não Assinante — precisa do vínculo específico pra saber endereço, plano, produto base)
- Tipo: `assinatura` (gerado automático a partir da Assinatura ativa) ou `avulso` (compra pontual sem vínculo de assinatura)
- Status: `pendente` | `confirmado` | `cancelado`

### ItemPedido
Linhas do pedido. Pode ter pão base + rotativas + extras.

- FK pra Produto + VersaoReceita (rastreabilidade: "qual versão do Integral eu entreguei pra ela em 3/abr?")
- Quantidade, preço unitário no momento do pedido (snapshot)

### Entrega
1:1 com Pedido. Dados da entrega física.

- Endereço snapshot (congelado no momento da entrega — se a Assinatura mudar de endereço depois, o histórico da entrega fica preservado)
- Status: `pendente` → `separado` → `em_rota` → `entregue` | `nao_entregue`
- Horário de entrega, observação do entregador

---

## Domínio 4 — Insumos (mínimo MVP)

Escopo reduzido: só o suficiente pra alertas de estoque.

### Fornecedor
CCN, Fazenda Vargem, etc.

- Nome, lead time em dias, contato

### Insumo
Um item abstrato vendido pelo fornecedor.

- Nome ("Farinha FV T1"), fornecedor
- Estoque atual em gramas, estoque mínimo
- **Sem lote estruturado.** Hugo atualiza estoque manualmente ao receber nova sacaria; a identificação do lote na produção (pra diagnóstico) fica em `ProducaoContexto.lote_farinha_principal` como texto livre.

**Fora do MVP:**
- Controle granular de consumo (débito automático a cada produção)
- Pedidos de compra estruturados
- Validade de insumos perecíveis
- Lote estruturado

No MVP, o estoque é atualizado manualmente. Alertas olham pra `estoque < minimo` e `estoque < consumo_semanal * lead_time_em_semanas`.

---

## Decisões validadas (histórico pra referência)

Essa seção existe como memória das conversas de abril 2026 que definiram a estrutura. Não é pra reabrir — é pra referência futura.

### 1. Cardapio como tabela separada de PlanoProduto

- **Escolhido:** manter separado.
- **Consequência:** redundância aceitável (geração de cardápio via rotina "copia de PlanoProduto por default"). Semanas especiais, edições promocionais e rastreabilidade histórica funcionam sem hack.
- **Regra de disciplina:** nunca ler de Cardapio pra responder "o que o plano oferece?" — isso vem de PlanoProduto.

### 2. Assinatura imutável após cancelar, múltiplas ativas permitidas

- **Escolhido:** Opção A (registro novo a cada reativação) + remoção do constraint "1 ativa por assinante".
- **Consequência 1:** histórico de churn/LTV/reativação preservado.
- **Consequência 2:** suporta caso "mesmo CPF, múltiplos endereços" sem forçar assinantes distintos.
- **Constraint novo:** `UNIQUE (assinante_id, endereco_hash, status=ativa)` pra evitar duplicata acidental.

### 3. Produto base sem snapshot de versão

- **Escolhido:** Opção A — `Assinatura.produto_base_id` → Produto genérico. Versão resolvida no Pedido.
- **Consequência:** evolução de receita é transparente pros assinantes. O ItemPedido guarda versão exata pra rastreabilidade.
- **Regras vinculadas:** rascunho não pode ser ativa; versão congela no corte de terça; mudanças de ingrediente exigem comunicação ativa; mudança grande vira produto novo (regra editorial).

### 4. Grupo de produção sem `Producao.grupo_real`

- **Escolhido:** apenas `Receita.grupo_sugerido`.
- **Consequência:** menos preciosismo de sistema. Padeiro decide o grupo no dia, sem registrar.
- **Se virar necessário analisar:** adiciona `Producao.grupo_real` (nullable) em migração futura. Nada quebra.

### 5. Lote de farinha como texto livre

- **Escolhido:** `ProducaoContexto.lote_farinha_principal` = TEXT, nullable.
- **Consequência:** aceita qualquer nomenclatura, aceita campo vazio, sem fricção de preenchimento.
- **Trade-off aceito:** análise comparativa precisa de procura textual (LIKE). Agregação estatística fica difícil até o input virar híbrido.
- **Evolução:** quando view comparativa entrar (v1.1), avaliar migração pra input híbrido (dropdown do histórico + texto novo).

---

## Regras de negócio no schema (consolidação)

Lista única de regras que o sistema precisa aplicar ou lembrar. Documentadas aqui pra não se perderem nas tabelas.

### Catálogo
- Receita só pode apontar pra `versao_ativa_id` se `VersaoReceita.status ∈ {teste, ativa}`.
- Mudança de ingrediente em nova versão exige comunicação externa (regra editorial).
- Descaracterização de produto vira novo Produto, não nova versão (regra editorial).

### Operação
- Cardapio tem campo `congelado`. Na terça 12h, ele vira true automaticamente. Depois disso, edições afetam a semana seguinte.
- Versão ativa usada na Producao é congelada no corte de terça.

### Comercial
- `UNIQUE (assinante_id, endereco_hash) WHERE status=ativa` em Assinatura.
- Pedido nasce automaticamente a partir da Assinatura ativa na abertura da Semana.
- Pausa = mudança de status na mesma Assinatura. Cancelamento = estado terminal.
- Entrega congela snapshot de endereço (imutável).

### Diagnóstico
- ProducaoContexto é criado automaticamente quando Producao entra em status `em_producao`.
- Campos nullable por default (Hugo preenche o que conseguir).

---

## Próximas rodadas

**Rodada 2 (detalhamento):**
- Cada entidade com campos, tipos SQL (pensando Postgres), constraints, enums
- Chaves primárias, foreign keys, unique constraints
- Valores default, nullable vs. not null

**Rodada 3 (finalização):**
- Índices (por uso esperado: "produções da semana X", "assinantes ativos", "pedidos pendentes de entrega")
- Migrações futuras documentadas (quando Premium entrar, quando empório entrar, quando view comparativa entrar)
- Seed de dados iniciais (planos, produtos fabricados do MVP, fornecedores padrão)

---

*Documento de referência · Schema Backoffice Cora · Rodada 1 validada · Abril 2026*
