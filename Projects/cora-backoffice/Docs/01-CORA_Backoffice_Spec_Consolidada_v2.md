# Cora — Backoffice: Decisões e Especificação

*Consolidação das discussões e decisões sobre o sistema de gestão operacional da Cora.*

**Versão:** v2 (abril 2026) — incorpora fluxo de produção detalhado, MVP expandido para 5 módulos, entidade Produto genérica, Expedição minimalista, ficha diagnóstica simplificada (7 passos), histórico simples no MVP.
**Versão anterior:** v1 (março 2026) — 8 módulos mapeados, MVP de 3 (Semana + Produção + Configurações).

> ⚠️ **Pré-requisito de leitura:** consulte primeiro `00-terminologia-oficial.md`. Esse documento define os termos Assinatura, Base, Cesta, Cardápio, Swap, Extra e Cutoff. Sem essa base, a leitura aqui pode confundir a separação entre linguagem técnica (schema) e linguagem do assinante (portal).

---

## Visão geral

O backoffice é o sistema de gestão da operação da Cora. Não é um ERP genérico. É uma ferramenta feita pra um padeiro solo que precisa saber o que produzir, registrar o que produziu, e não esquecer nenhuma entrega.

No início, o operador de todos os módulos é o Hugo. O sistema precisa funcionar pra uma pessoa fazendo tudo, sem exigir handoffs entre perfis.

---

## Arquitetura: 8 módulos mapeados

| # | Módulo | MVP? | Função |
|---|---|---|---|
| 1 | **Semana** | ✅ | Painel consolidado da semana atual: o que produzir, o que falta, pra quem entregar |
| 2 | **Planejamento** | ✅ | Definir o cardápio e extras disponíveis da próxima semana |
| 3 | **Produção** | ✅ | Fichas técnicas, processo do dia, registro previsto vs real |
| 4 | **Expedição** | ✅ | Lista de pedidos por bairro, etiquetas, status de entrega manual |
| 5 | **Receitas** | ✅ | Catálogo de produtos, criar/editar/versionar/arquivar |
| 6 | Estoque | ❌ | Controle de insumos com lead time por fornecedor |
| 7 | Assinantes (CRM) | ❌ | Gestão de assinantes, histórico, churn |
| 8 | Financeiro | ❌ | Integração Asaas, DRE, fluxo de caixa |
| — | Comunicação | ❌ | WhatsApp API, notificações (absorvida em outros módulos) |
| — | Configurações | ❌ | Perfis, parâmetros (absorvida em outros módulos) |

**MVP = Semana + Planejamento + Produção + Expedição + Receitas.** Cinco módulos, não três.

**Por que expandiu:** a spec v1 assumia que cardápio era automático, que entregas rolavam fora do sistema, e que receitas era uso mensal. Na prática: o cardápio da semana seguinte é decisão ativa todo domingo/segunda; entregas precisam de pedidos listados e etiquetas impressas toda quinta; receitas são ajustadas com frequência (testes, versões, troca de farinhas).

---

## Decisão: construir ou planilha?

**Discussão:** Hugo tem acesso ao Claude pra desenvolver. O custo de dev é a assinatura que já paga. Após o lançamento, tempo pra especificar sistema será escasso.

**Decisão:** Construir o backoffice MVP antes de agosto. Os módulos Estoque, CRM e Financeiro ficam como planilha até a operação justificar.

**Racional:** Depois de abrir, Hugo vai estar com as mãos na massa (literalmente). Melhor ter o sistema pronto antes do que tentar especificar com forno ligado.

**Princípio guia:** validação em cima de validação. Quase tudo da operação só vai ser entendido de verdade quando começar a operar. O sistema precisa ser leve o suficiente pra ser ajustado, mas estruturado o suficiente pra não precisar refazer do zero quando as coisas amadurecerem.

---

## Entidade Produto: schema preparado pra empório futuro

A entidade central do sistema **não é "Receita"** — é **"Produto"**, com um atributo `tipo` que distingue fabricação e revenda.

```
Produto
├── id, nome, versão, slug
├── tipo: fabricado | revenda
├── papel: fixa | rotativa | extra | teste | arquivada
├── peso_unitario, preco, unidade (un | kg)
├── descricao_curta (pra portal do assinante)
├── [se fabricado] → Receita (ingredientes, processo, rendimento)
└── [se revenda] → Fornecedor, custo_aquisicao, validade, estoque_minimo
```

**Por que:** um dia o Hugo quer vender manteiga, café, azeite — transformar a Cora em mini-empório. Esses itens não passam pela Produção, não têm ficha técnica, mas precisam aparecer no Portal, na Expedição, no Financeiro.

**No MVP:** só existe `tipo: fabricado`. Nenhuma tela de empório é construída. Mas o schema já distingue, então quando chegar a hora de adicionar revenda, não há rework de banco.

**O que não entra no MVP:**
- Controle de estoque de revenda (lead time, validade, reposição)
- Cálculo de margem diferenciado pra revenda
- Categoria/departamento no Portal do Assinante
- Relatórios de mix fabricado vs revenda

Tudo isso fica pra quando a operação de pão estiver sólida e o empório for uma decisão comercial tomada. O custo de deixar o schema preparado agora é zero; o custo de migrar depois seria alto.

---

## Módulo Semana — spec

### Função
Painel da semana. Responde: "O que preciso fazer esta semana?"

### Elementos principais

**Navegação temporal:** ← semana anterior | semana atual | próxima semana →
- Semanas passadas: read-only (registro histórico)
- Semanas futuras: previsão baseada nos assinantes ativos (estimativa). A **composição** do cardápio é decidida em **Planejamento** (módulo separado).

**Cronograma da semana** (faixa horizontal no topo):
- TER: Levain + Prep + Mise en place
- QUA: Produção (autólise → batimento → dobras → pré-shape → shape)
- QUI: Cocção + Expedição

**Cards de volume (foco principal):**
- Total de pães da semana (número grande)
- Kg de massa total estimado
- Levain necessário (g)
- Insumos (com alerta se insuficiente)

**Tabela de produção:**
- Linhas clicáveis (abre ficha técnica no módulo Produção). Sem botão "ver ficha" separado.
- Colunas: Produto, Pães, Receitas (1×, 2× quando masseira não der conta), Massa total, Levain
- Coluna "Receitas" mantida como futuro-proof. Hoje é sempre 1×; quando a produção crescer e a masseira de 25kg não der conta, pode ser 2× da mesma receita.

**Insumos consolidados:**
- Alertas por lead time do fornecedor: FV leva 15 dias, Le 5 Stagioni 72h. O sistema calcula "estoque para X semanas" e alerta quando o estoque cobre menos que o lead time de reposição.
- Vermelho: estoque zero (crítico, bloqueante). Laranja: insuficiente. Verde: ok.
- Insumos ok ficam colapsados por padrão. Só os com problema aparecem abertos.

**Entregas (preview):**
- Agrupadas por assinante (cesta + extras juntos na mesma linha)
- Status como cor de fundo da linha (sutil): amarelo = pendente, azul = separado, azul escuro = em rota, verde = entregue
- Endereço formato real: "R. Ator Paulo Gustavo, 149 - Bl.3/201"
- Link pra módulo **Expedição** pra ação completa (empacotar, etiquetar, marcar entregue)

**Badges de status automáticos:**
- Produção: Planejada → Em produção → Cocção → Concluída
- Entrega: Pendente → Separado → Em rota → Entregue
- Mudam automaticamente ao registrar dados. Sem clique extra.

### Decisão: filtro por condomínio
Descartado. Condomínio é limitante. O agrupamento é por bairro/região. Proximidade visual (mapa ou lista agrupada) é evolução futura.

### Decisão: assinatura quinzenal
O modelo de dados suporta via `ItemCesta.frequência` (semanal/quinzenal/mensal). Assinante quinzenal aparece em semanas alternadas. Não bloqueia no MVP mas não é prioridade.

### Decisão: venda por kg
Possível no futuro (ex: focaccia por kg). Seria um tipo de produto com unidade = kg em vez de unidade. Schema acomoda via `Produto.unidade`.

---

## Módulo Planejamento — spec

### Função
Definir o cardápio e extras disponíveis da **próxima semana** (ou semanas futuras). É a tela que responde "o que vou oferecer?".

### Fluxo
1. Seleciona semana-alvo (próxima por padrão)
2. Define base da assinatura: Original ou Integral (o assinante escolhe entre essas duas)
3. Seleciona as rotativas disponíveis da semana (ex: Multigrãos + Focaccia + Ciabatta). Máximo 4 no mês.
4. Define extras avulsos disponíveis (ex: Brioche como extra pago)
5. Sistema calcula volume estimado baseado nos assinantes ativos
6. Confirma → cardápio publicado no Portal do Assinante

### Regras
- **Original e Integral são fixos** do modelo flat de R$99. Sempre disponíveis.
- **Rotativas**: até 4 por mês, editável por semana. O sistema sugere baseado no histórico (evita repetir receita nas últimas 2 semanas).
- **Extras avulsos**: produtos `tipo: fabricado` com `papel: extra` ou `papel: teste`. Preço separado, cobrado à parte.
- **Corte de edição:** cardápio fica editável até o corte de terça 12h. Depois disso, congela.

### Promover rotativa a fixa (decisão futura, não MVP)
Quando o Hugo quiser promover uma rotativa (ex: Multigrãos) a fixa:

1. Edita a receita em Receitas, muda `papel: rotativa` → `papel: fixa`
2. Sistema sinaliza: "Essa mudança impacta o modelo de assinatura. Revise o preço e comunique os assinantes."
3. Hugo toma as decisões comerciais fora do sistema (novo preço? novo plano? comunicação?)
4. Portal do Assinante passa a oferecer Multigrãos como opção de troca livre

**No MVP:** o atributo `papel` existe e é editável. Mas o sistema **não automatiza** o recálculo de preço, a comunicação aos assinantes ou a mudança no Portal. Essas decisões são manuais até a operação justificar automação.

**Racional:** promover rotativa a fixa é evento raro (talvez 1-2x por ano). Automatizar custa 2-3 sprints. No MVP, fica como decisão humana.

### Multi-plano no radar (não MVP, mas arquitetura precisa considerar)

Decisão de abril 2026: a Cora muito provavelmente vai evoluir para múltiplos planos de assinatura. Exemplos em discussão:

- **Plano Base R$99** — Original ou Integral + 4 rotativas do mês
- **Plano Premium R$110** — Multigrãos fixo + rotativas (hipótese)
- Pizza entrando como rotativa quando estiver pronta

**Implicação para o schema:** `papel` (base | rotativa | extra | teste) **não pode ser propriedade fixa do Produto**. Precisa ser propriedade da relação **Produto × Plano**. O mesmo pão (ex: Multigrãos) pode ser `rotativa` no Base e `base` no Premium.

**No MVP:** existe apenas um plano (Base R$99). O schema não precisa implementar a tabela de relação ainda, mas **não deve assumir** que `papel` é atributo do Produto. Manter como enum solto no Produto cria dívida técnica que vai ter que ser paga quando o segundo plano entrar.

**Recomendação de modelagem (mesmo no MVP):**
```
Plano (id, nome, preco, ativo)
PlanoProduto (plano_id, produto_id, papel: base | rotativa | extra)
```

Com um único plano cadastrado no MVP, funciona igual. Quando o segundo plano entrar, é só cadastrar registros novos na tabela `PlanoProduto`. Zero refactor.

**Gatilho para ativar multi-plano na UI:** quando o Hugo validar operacionalmente o Base (2-3 meses após lançamento) e decidir introduzir o Premium.

---

## Módulo Produção — spec

### Função
Saber o que produzir no dia. Registrar o que produziu. Comparar com o previsto.

### Fluxo mental do padeiro (fonte da decisão de design)

Documentado em abril 2026 pelo Hugo. Base da "vista blocos".

**TERÇA — Preparo (8h–18h)**
- 8h: chega
- 11h: avalia quantidade de isca restante da semana anterior, avalia pedidos da próxima semana (se tem fermento suficiente), faz pequeno descarte, inicia **primeiro refresco** (1:2:2)
- 15h (≈4h depois): **segundo refresco** (1:2:2), ajustando a quantidade final pra atender a demanda
- 17–18h (≈2–3h depois, quando o levain ganha força): coloca em TF (geladeira)
- Mise en place do dia seguinte
- Encerra

**QUARTA — Produção (8h–17h)**
- 8h: chega, avalia o levain, aguarda em TA se necessário
- **Autólise em batelada**, organizada por grupos (critérios do Alex):
  - Grupo 1 — demandam frio: Focaccia, Sertão, Azeitonas, Queijo
  - Grupo 2 — precisam de mais tempo de fermentação: Pão Nosso, Pão de Serviço, Italiano
  - Grupo 3 — mais simples: Integral, Multigrãos
- Coloca em tabuleiros, estufa
- 40 min depois: **batimento** das massas (mesma ordem da autólise), falsa dobra, deixa em TA
- A cada 30 min: **dobras** (atenção à necessidade de cada massa; algumas precisam de mais dobras que outras)
- Acompanha tempo de fermentação em TA até dobrar de tamanho
- **Divisões** por receita (tamanho da receita), pré-shape
- 30 min de descanso
- **Shape:** só Original vai no banneton; demais no couche
- Coloca em TF
- Checklist final: programar forno pra quinta 7h
- Encerra

**QUINTA — Cocção + Expedição (8h–fim da entrega)**
- 8h: chega; forno já ligado (programação feita na quarta)
- Avalia fermentação de cada receita, inicia **cocção** (avaliação visual do ponto ideal, não timer fixo)
- Depois de assar tudo: **empacotamento e etiquetas** (conferir quantidades e especificações de cada pedido)
- Preparação das rotas de entrega, expedição pros entregadores terceirizados
- Entregador confirma entregas por WhatsApp; Hugo atualiza status manualmente no sistema
- Valida se todas foram entregues
- Encerra

### Decisão fundamental: produção em blocos
O padeiro não trabalha "receita por receita" de forma linear. Trabalha "etapa por etapa em todas as receitas". Autólise de todas as massas do grupo 1 ao mesmo tempo, depois batimento de todas, depois dobras de todas. Isso mudou completamente a interface.

### Agrupamento por grupos — editável por semana
- Cada receita tem atributo `grupo_sugerido` (1, 2 ou 3) baseado nos critérios do Alex
- Na tela de produção, o sistema sugere o agrupamento da semana
- Hugo pode **arrastar receitas entre grupos** ou **reordenar grupos** livremente na semana
- Registro fica no histórico da semana (não muda a ficha técnica)

### Duas vistas

**Vista A — Blocos (etapa por etapa)**
- Mostra a etapa atual com todas as massas do grupo ativo lado a lado em cards
- Cada card: nome da receita, quantidade de pães, instrução do passo, campos previsto/real
- Navegação entre etapas: ← etapa anterior | etapa atual | próxima etapa →
- Barra de progresso do dia: todas as etapas em mini-bar, etapa atual destacada
- Badge automático por card: ativo / aguardando
- **Timer da etapa é do grupo**, não da massa individual (40 min de autólise vale pras 4 massas do grupo 1)
- Uso principal: padeiro no dia a dia, na bancada

**Vista B — Ficha (receita individual)**

Ficha técnica completa de uma receita, dividida em 5 seções:

- **Seção A: Ingredientes** (colapsável). Ingredientes + % baker + gramas base.
- **Seção B: Contexto** (variáveis diagnósticas). Lote da farinha principal (seletor), horas desde último refresco do levain (auto-calculado da terça), T° ambiente máxima do dia, hidratação ajustada (se houver).
- **Seção C: Processo** (tabela previsto/real, passo atual destacado em azul). Template padrão de 7 passos (ver abaixo), com possibilidade de adicionar/remover por receita.
- **Seção D: Cocção** (quinta). Saída do TF, entrada no forno + temperatura, saída do forno.
- **Seção E: Resultado**. Pães produzidos (previsto vs real), peso médio, crescimento/miolo (ok/ajustar), crosta (ok/ajustar), observação livre.

Card swipeable: arrastar lateral ou setas ← → pra trocar entre receitas.

Uso principal: gestor revisando, comparando histórico.

**O padeiro escolhe a vista.** Pode preferir blocos ou ficha. A opção existe pra não forçar um fluxo.

### Ficha diagnóstica: simplificação de 15 → 7 passos

Decisão de abril 2026: a ficha do Alex é didática (separa mistura e autólise como 2 passos, granulariza 4 dobras em 4 linhas, registra temperatura em cada passo). Pra uso operacional + diagnóstico, isso é redundância.

**Template padrão de processo (7 passos):**

| # | Etapa | Horário prev. | Horário real | Variável crítica |
|---|---|---|---|---|
| 1 | Autólise | 8h30 | __h__ | T° água __,_°C *(operacional)* |
| 2 | Batimento | 9h10 | __h__ | **T° massa pós-batimento __,_°C** (máx 23°) |
| 3 | Dobras (3× a 30') | 10h–11h30 | início __h__ / fim __h__ | nº dobras: __ |
| 4 | Fermentação primária | 11h30 | início __h__ / fim __h__ | **duração e T° ambiente** |
| 5 | Divisão + pré-shape | 14h | __h__ | peso médio __g |
| 6 | Shape | 14h30 | __h__ | banneton / couche / tabuleiro / forma |
| 7 | Retardo TF | 15h | __h__ | — |

**Por que esses passos:** cada linha registra uma decisão ou um ponto de verificação, não um evento contínuo. Mistura + autólise viram 1 passo (o fim da autólise = início do batimento). As 4 dobras viram 1 linha com contador. Pré-shape + descanso + shape viram 2 passos (divisão+pré-shape e shape).

**Por que essas variáveis críticas:** T° massa pós-batimento e duração da fermentação primária são os 2 indicadores mais potentes quando algo desvia. Se o pão vier diferente numa semana, comparar essas duas variáveis com o histórico responde a pergunta "foi minha produção ou variação externa?".

**Por que o Contexto (Seção B):** lote da farinha é a causa externa mais comum de inconsistência em pão natural. Sem registrar qual saco de FV foi usado, não há como correlacionar "pão pesado essa semana" com "abri saco novo na terça".

**Liberdade por receita:** o template de 7 passos é padrão. Cada receita pode adicionar passos (ex: Brioche com fermentação mista + manteiga em 3 adições pode precisar de 10 passos) ou remover (ex: focaccia sem retardo TF pode ter só 5). "＋ Adicionar passo" em qualquer posição.

### Histórico e diagnóstico (MVP vs. futuro)

**No MVP:**
- **Histórico simples por receita**: lista cronológica das últimas produções do mesmo produto. Uma linha cada, clicável (abre ficha daquela semana). Sem comparação, sem destaque automático.
- **Exportação CSV** da ficha completa. Hugo abre no Excel/Sheets nos primeiros 2-3 meses e faz comparação manual quando precisar diagnosticar.

**Fora do MVP (v1.1, out/nov 2026):**
- View comparativa lado a lado das últimas N produções
- Destaque automático de variáveis que desviam da média (ex: duração de fermentação 20%+ acima do normal)
- Gráficos de tendência por variável

**Racional do adiamento:** a view comparativa só tem valor a partir de ~4 produções da mesma receita (setembro/outubro 2026). Construir antes de ter dados reais e diagnósticos vividos é quase certeza de reconstruir. Melhor chegar em outubro com 2 meses de dados e desenhar a view certa a partir do uso real. Custo técnico é baixo (~1 dia), mas o custo de timing é alto. Schema + histórico simples + CSV resolvem o período de validação.

### Tabs de dias
Ao invés de só tabs de receitas, a navegação superior da Produção tem tabs de **dias**:
- **Terça** (Levain + Prep + Mise en place)
- **Quarta** (Produção)
- **Quinta** (Cocção + Expedição)

Dentro de cada dia, vem a vista de blocos ou ficha.

**Racional:** o padeiro abre o sistema perguntando "o que é hoje?", não "qual receita?". O dia orienta; a receita vem depois.

### Aba Terça — Levain + Prep
- Ficha do levain: composição (água mineral + Superiore), proporção 1:2:2, cálculo automático por demanda da semana
- Distribuição por receita (20% no Original, 20% no Integral, 40% no Multi Grãos, etc.)
- Sobra esperada = 20% do levain da semana seguinte
- Se parado 3+ dias: sistema adiciona dia de reativação (2 sessões refresco 1:2:2)
- Preparo de sementes (Multi Grãos): torrar + escaldar + hidratar em TA até quarta
- Mise en place: checklist do que separar pra quarta
- **Checklist final da terça:** programar forno da quinta (lembrete, não integração)

### Processo editável
- O template é ponto de partida, não estrutura fixa
- Cada receita pode ter passos adicionados, removidos ou reordenados
- "＋ Adicionar passo" em qualquer posição
- Passos podem incluir TA (temperatura ambiente) ou TF (temperatura fria) como campo
- Algumas receitas têm dobras intercaladas TA/TF, outras não têm fermentação primária
- Editar processo é recurso de inovação

### Notas por passo
- As notas vêm da receita (configuradas em Receitas)
- Exemplo: "Dobra 1 → guardar em TF antes da próxima dobra"
- O padeiro nunca justifica decisões. Se pula uma dobra, o campo fica vazio.
- Passos sem preenchimento ficam em branco. Sem obrigatoriedade de motivo.
- Campo de observações no resultado: opcional, único campo livre.

**Racional:** "Tenho medo de burocratizar o processo." O backoffice é ferramenta, não fiscal.

### Badges automáticos
- Badge muda quando o padeiro registra o primeiro horário/temperatura do dia
- Planejada → Em produção (ao registrar) → Cocção (ao registrar) → Concluída (ao salvar resultado)
- Zero cliques extras. O ato de preencher já é o registro.

### Resultado da produção
- Campos organizados na Seção E da Ficha (ver acima): pães produzidos (previsto vs real), peso médio, crescimento/miolo, crosta, observações livres
- Exportar ficha como PDF (versão impressa) ou CSV (para análise em Excel)
- Ver histórico: lista cronológica das últimas produções da mesma receita, sem comparação automática (essa é v1.1)

---

## Módulo Expedição — spec (MINIMALISTA)

### Função
Semana 1 de operação: empacotar, etiquetar, confirmar entregas. Nada além disso.

### O que é MVP
- **Lista de pedidos do dia**, agrupada por bairro (Icaraí, Fonseca, São Francisco, Centro)
- Cada pedido mostra: assinante, itens (pão + extras), endereço completo, observação (ex: "tocar na portaria 2")
- **Checkbox "Separado"**: marca que o pacote foi montado e conferido
- **Etiquetas imprimíveis** em PDF (formato padrão, uma por pedido, com nome + endereço + itens)
- **Status manual de entrega**: Hugo atualiza "Entregue" ou "Não entregue" baseado no que o entregador confirma via WhatsApp
- Resumo no final do dia: X entregues, Y pendentes

### O que NÃO é MVP
- Roteirização automática
- App pro entregador terceirizado
- Integração com Google Maps
- Cálculo de distâncias
- Tracking em tempo real
- Comunicação automatizada com o assinante ("seu pão saiu pra entrega")

**Racional:** entrega é terceirizada, acompanhamento é via WhatsApp. O sistema precisa dar ao Hugo a informação necessária pra passar ao entregador (lista + etiquetas) e receber de volta o status (manual). Automação vem quando a operação escalar.

### Integração com Semana
- A tabela "Entregas" no módulo Semana é um preview. Clique numa linha ou no link "Ver expedição" leva pro módulo Expedição completo.
- Status atualizado em Expedição reflete automaticamente na Semana.

---

## Módulo Receitas — spec

Promovido de "submenu de Configurações" a módulo próprio no nav.

### Função
Catálogo completo de tudo que a Cora já fez, faz ou pretende fazer. Uso semanal (não mensal).

### Fluxo de status
| Status | Significado | Aparece na produção? | Aparece no Portal? |
|---|---|---|---|
| Rascunho | Montando ingredientes/processo | Não | Não |
| Teste | Pronta pra testar, não vende | Sim, se adicionada manualmente à semana | Não |
| Ativa | Disponível pra assinantes/extras | Sim, se incluída no Planejamento | Sim |
| Arquivada | Não produz mais, mantém histórico | Não (somente leitura) | Não |

### Papel dentro da assinatura
| Papel | Significado |
|---|---|
| fixa | Base da assinatura (hoje: Original, Integral) |
| rotativa | Parte do rodízio mensal de 4 (hoje: Multigrãos, Focaccia, Ciabatta, Brioche) |
| extra | Avulso pago (ex: Brioche como extra) |
| teste | Em validação, não vende ainda |

### Criar receita
- Nome, versão, tipo de produto (fabricado — no MVP sempre), papel inicial
- Grupo sugerido (1, 2 ou 3) pra produção em batelada
- Ingredientes (tabela editável com %, gramas base)
- **Processo: começa com template padrão de 7 passos** (autólise → batimento → dobras → ferm. primária → divisão+pré-shape → shape → retardo TF). Editável: adicionar, remover ou reordenar passos por receita.
- **Variáveis de contexto automáticas** (aplicam a todas as receitas, não precisa configurar na ficha): lote de farinha principal, horas desde refresco do levain, T° ambiente máxima, hidratação ajustada.
- Peso por unidade, rendimento estimado, perda estimada
- Shape: banneton | couche | tabuleiro | forma
- Status inicial: Rascunho

### Edição cria nova versão
- "Editar receita" cria nova versão (v1 → v2). Versão anterior fica read-only.
- Histórico de versões acessível.
- Receita usada em produção fica linkada à versão específica (v1 da semana X, v2 da semana Y).

### Casos de uso reais
- "Quero montar a receita do Brioche, testar 2 vezes, e só depois ativar pra venda."
- "Tirei o pão de azeitonas do cardápio mas quero guardar a ficha."
- "Ajustei a hidratação do Original de 70% pra 72%. Criar v2, manter v1 como histórico."
- "O Integral mudou de 50/50 FV/Mora pra 60/40. Nova versão."

---

## Campos padronizados

| Campo | Formato | Máscara | Exemplo |
|---|---|---|---|
| Temperatura | Numérico + vírgula | XX,X + sufixo °C | 25,5°C |
| Horário | HH:MM → exibe HHhMM | Máscara HH:MM | 10h30 |
| Peso | Numérico + sufixo g | Xg | 580g |
| Observação | Campo livre | Nenhuma | "Massa fermentou rápido" |

**Racional:** Padronizar pra ninguém escrever 25.5 em vez de 25,5 ou 10:00 em vez de 10h00. Só obs é campo livre.

---

## Perfis de acesso

8 perfis mapeados pra quando a equipe crescer:

| Perfil | Acesso | No início |
|---|---|---|
| Dono/Gerente | Tudo | Hugo |
| Padeiro (chefe produção) | Semana (vis.) + Produção + Receitas | Hugo |
| Preparador | Mise en place, checklist ingredientes | Hugo |
| Entregador | Lista de entregas, marcar status | Hugo (manual) |
| Expedição | Separar pedidos, organizar entregas | Hugo |
| Financeiro | Cobranças, DRE, fluxo de caixa | — |
| Atendimento | WhatsApp, assinantes | — |
| Estoquista | Estoque, pedidos de compra | Hugo |
| Marketing | Comunicação, redes | Mariane |

**Decisão:** No MVP, login simples (email + senha, só Hugo). Múltiplos perfis é pós-lançamento.

---

## Integração com o Portal do Assinante

Pontos de contato onde backoffice e portal compartilham dados:

| Backoffice | Portal | Direção |
|---|---|---|
| Receitas ativas (Planejamento) | Opções de cesta e extras | BO → Portal |
| Cardápio da semana (Planejamento) | "Sua cesta desta semana" | BO → Portal |
| Pedido do assinante | Item na lista de produção (Semana) | Portal → BO |
| Endereço do assinante | Linha em Expedição | Portal → BO |
| Status de entrega (Expedição) | Notificação pro assinante | BO → Portal (futuro) |

No MVP, essas integrações são via mesmo banco de dados (monolito). API separada fica pra depois.

---

## Riscos operacionais mapeados

| Risco | Impacto | Mitigação no sistema |
|---|---|---|
| Atraso entrega farinha | Sem produção | Alerta de estoque mínimo com lead time por fornecedor |
| Falta de profissional | Produção atrasada | Status "Indisponível" no perfil, alerta ao dono |
| Levain não ativou | Massa comprometida | Checklist de status do levain antes de produção |
| Forno com problema | Sem cocção | Campo de status do equipamento |
| Pedidos acima da capacidade | Falta de pão | Limite configurável por receita, sistema bloqueia extras |
| Queda de energia | Massa em risco | Registro manual pra pós-mortem |
| Entregador não confirma | Status desatualizado | Hugo atualiza manual via WhatsApp (MVP) |
| Forno não programado na terça | Chega quinta sem forno | Checklist obrigatório no fim da quarta |

---

## Reports / analytics (futuro)

Não é MVP, mas o schema precisa suportar desde o dia 1:
- Volume por produto por semana
- Taxa de extras vs fixos
- Churn por produto (qual produto mais cancelam)
- Frequência de pedidos por assinante
- Performance de rotativos (candidatos a virar fixos)
- Histórico de produção: consistência de peso, perda, temperatura
- **Mix fabricado vs revenda (quando empório existir)**

---

## Mobile

Essencial. O padeiro usa o backoffice no celular, na bancada, com as mãos sujas de farinha.

**Mobile simplificado:**
- Header compacto com badge de status auto
- Toggle blocos/ficha
- Pills horizontais scrolláveis pra troca de receita (swipe)
- Cards empilhados na vista blocos
- Campos de input grandes (dedo gordo de farinha)
- Bottom nav: Semana | Produção | Expedição | Mais ▾
- Sem sidebar (substituída por hamburger menu)

---

## Design system

**Decisão:** não criar segundo design system. O Cora Design System v1 (março 2026) cobre tokens, cor, tipografia, status, motion — vale pra Portal, Backoffice e Financeiro.

**Como evolui:** padrões novos que surgirem no backoffice (tabela densa de produção, badge de etapa, progress bar do dia, timer de grupo) são adicionados ao sistema existente quando forem estabilizados. Nada de sistema paralelo.

---

## Cronograma

| Período | Foco |
|---|---|
| Abril 2026 | Spec v2 consolidada + wireframes dos 5 módulos |
| Maio 2026 | Desenvolvimento MVP (Semana + Planejamento + Produção + Expedição + Receitas) |
| Junho–Julho 2026 | Testes com dados reais (Alpha com 30 subscribers), ajustes |
| Agosto 2026 | Lançamento oficial |

---

## Wireframes

### v3 (março 2026) — Semana + Produção
- `backoffice_wireframe_semana_v3.svg`
- `backoffice_wireframe_producao_v3.svg`

Cobrem os dois primeiros módulos do MVP antigo. Ainda válidos, mas precisam de atualizações:
- **Semana:** nav lateral precisa incluir Planejamento, Expedição e Receitas como itens próprios
- **Produção:** tabs superiores devem ser de **dias** (Terça, Quarta, Quinta), com receitas como segundo nível dentro de cada dia

### A produzir na próxima rodada (v4)
- Planejamento — tela nova
- Expedição — tela nova
- Receitas — tela nova (listagem + detalhe)
- Semana v4 — nav atualizado
- Produção v4 — tabs de dias

---

## Princípios de design

- Warm-50 como fundo (nunca #FFF). Warm-600 como texto (nunca #000).
- Vermelho só pra alerta crítico (estoque zero). Laranja pra atenção. Verde pra ok.
- Sem gradientes, sem shadows, sem pill buttons.
- League Gothic pra headings. Montagu Slab pra body.
- Mobile-first: padeiro na bancada é o caso de uso primário.
- O sistema é ferramenta, não fiscal. Não burocratizar o processo.
- Schema preparado pra futuro (empório, múltiplos dias de produção, multi-perfil), mas telas só do que o MVP exige.

---

## Changelog v1 → v2

**Mudou:**
- MVP de 3 → 5 módulos (adicionou Planejamento, Expedição; promoveu Receitas a módulo próprio)
- Modelo comercial corrigido: R$99 + R$15 frete, Original OU Integral fixo + 4 rotativas no mês (não 3 fixos)
- Terça promovida a dia de produção completo (não só "corte 12h + levain 15h")
- Produção navega por dias (Terça/Quarta/Quinta), receitas como segundo nível
- Entidade central do sistema é "Produto" (fabricado | revenda), não "Receita"
- **Ficha de processo simplificada: 15 → 7 passos.** Mistura+autólise viram 1 passo; as 4 dobras viram 1 linha com contador; pré-shape/descanso/shape viram 2 passos.
- **Ficha ganha foco diagnóstico**, não só registro operacional. Nova Seção B (Contexto) registra lote de farinha, horas desde refresco do levain, T° ambiente máxima.

**Adicionou:**
- Fluxo mental detalhado de terça/quarta/quinta
- Agrupamento editável por semana (grupos 1, 2, 3 do Alex)
- Módulo Expedição minimalista
- Módulo Planejamento da semana seguinte
- Schema preparado pra empório (sem construir telas de empório agora)
- Checklist de programar forno na quarta
- **Histórico simples por receita no MVP** (lista cronológica, sem comparação automática)
- **Exportação CSV da ficha** pra análise manual em Excel/Sheets
- **Variáveis críticas destacadas** na ficha: T° massa pós-batimento, duração da fermentação primária
- **Arquitetura multi-plano no radar**: `papel` vira atributo da relação Plano×Produto, não do Produto. Schema preparado, UI single-plano no MVP. Pizza entrando como rotativa futura.
- **Rotulação "BASE"** (não "FIXA") para Original e Integral — sinaliza que são fundação do plano, não apenas estáticas.

**Manteve:**
- Vistas Blocos vs Ficha em Produção
- Campos padronizados (temperatura, horário, peso, obs)
- Badges automáticos ao registrar dados
- Processo editável por receita (template padrão + liberdade de adicionar passos)
- Design system único (Cora DS v1)

**Adiado para v1.1 (out/nov 2026, após 2 meses de dados reais):**
- View comparativa lado a lado das últimas N produções
- Destaque automático de variáveis que desviam da média
- Gráficos de tendência por variável

**Racional do adiamento:** a view comparativa só tem valor a partir de ~4 produções da mesma receita. Construir antes de ter dados e diagnósticos reais é quase certeza de reconstruir. Chegar em outubro com dados vividos permite desenhar a view certa.

---

*Documento de referência · Backoffice Cora · v2 Abril 2026*
