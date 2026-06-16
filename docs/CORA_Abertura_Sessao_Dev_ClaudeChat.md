# CORA — Abertura de sessão de dev (Claude Chat)

Orientação de ENTRADA do Claude Chat para qualquer conversa de desenvolvimento da Cora (arquitetura, decisão de schema, review de PR, escrita de briefing) nos sistemas portal, backoffice e financeiro futuro.

Não confundir com `CORA_Prompt_Template_ClaudeCode.md`. Aquele é o prompt de SAÍDA, que vai PRA o Claude Code executar. Este é como o Claude Chat se orienta ANTES de pensar.

## Regra zero: verificar antes de afirmar

Você não conhece o estado atual do repo. Antes de afirmar o que está feito, o que falta ou o que é o próximo passo, e antes de propor ou sequenciar qualquer coisa, leia o STATUS/repo e estabeleça a fronteira (feito / em andamento / adiado). Memória e o resumo automático listam coisas JÁ ENTREGUES como "próximas prioridades": trate o roadmap da memória como hipótese a verificar, nunca como plano a executar.

E nunca assumir que não tenho acesso a um repo, ferramenta ou dado. Testar primeiro (clonar o repo, rodar tool_search). Os repos da Cora são clonáveis por leitura, sem auth. Se eu me pegar dizendo "não tenho acesso a X", isso é o gatilho pra tentar acessar X, não pra seguir sem ele.

## Pre-flight obrigatório (rodar, não lembrar)

Antes de qualquer design, decisão de domínio ou briefing:

1. `git clone --depth 1 <repo>` do repo relevante (URLs nos ponteiros abaixo).
2. Ler o status doc na raiz: backoffice -> `BACKOFFICE_STATUS.md`; portal -> `PORTAL_STATUS.md`.
3. `git log origin/main --oneline -15` pra ver o estado real do remoto (não inferir de memória nem de branch local).
4. Abrir e LER o arquivo e a função que a task cita, e o schema relacionado em `cora-backoffice/supabase/migrations/`. Backoffice é o dono do schema.

Só depois disso propor qualquer coisa.

## Hierarquia da verdade em dev (o de cima vence em caso de conflito)

1. Migrations + código do repo
2. Specs e briefings versionados no repo (`Docs/` no backoffice, `docs/` no portal)
3. Planilhas, fichas, memória

Planilha e ficha são APRESENTAÇÃO, não modelo de dados. Nunca inferir estrutura de tabela a partir do layout de uma planilha.

## Anti-padrões nomeados

**"Modelar pela planilha" (13/06/2026).** Numa task de hidratação, montei uma árvore de decisão (Op1/Op2, água de autólise vs escaldar) a partir do layout da planilha de fichas, onde autólise e escaldar são linhas separadas. Assumi que não tinha acesso ao repo e não li o schema. O banco tinha UMA única linha de água (`agua-mineral`) cujo `percentual_baker` já é a hidratação total, sincronizada com `versoes_receita.hidratacao_alvo`. A decisão inteira era sobre um problema inexistente, e o fix real era espelhar o override de levain em ~6 linhas. Gatilho de prevenção: se eu for propor uma decisão de domínio que depende de COMO o dado está estruturado, parar e ler o schema/código antes.

**"Propor o que já está feito" (16/06/2026).** Numa sessão de planejamento, propus repetidamente como "próximo" ou "não construído" coisas que já estavam no ar: Estado C (fatia 1 mergeada, PR #46), E2 Expedição (completa, PR #44), cutover Frente D (D.3/D.4 já criam user+profile+subscription reais no onboarding) e uma tela de reconciliação (já existia no painel Financeiro, com Em dia/Vencidas/Sem status + Órfãos/Vincular). Narrei do roadmap da memória sem checar a fronteira no STATUS, e só verifiquei quando ia escrever o briefing, quando a premissa errada já estava posta e o Hugo já tinha "confirmado" sequências montadas em cima dela. O guarda já existia (memória e este doc), e mesmo assim falhei: o gargalo é aderência, não conteúdo. Gatilho de prevenção: "isso é o próximo" e "isso não está construído" são afirmações que exigem leitura do STATUS ANTES de saírem da boca.

## Confiança

Afirmação sobre estrutura de dados ou estado do repo exige ter lido o código. Se não li, marcar [Chutando] ou ir ler antes de afirmar. Não descrever schema de memória.

## Ponteiros estáveis (não duplicar aqui conteúdo que muda)

- Repos: `github.com/hugorafael01-tech/cora-portal` · `github.com/hugorafael01-tech/cora-backoffice`
- Schema: SÓ em `cora-backoffice/supabase/migrations/`
- Status docs: `BACKOFFICE_STATUS.md` / `PORTAL_STATUS.md` (raiz de cada repo)
- Template de saída pro Claude Code: `Docs/CORA_Prompt_Template_ClaudeCode.md` (espelhado nos dois repos)
- Não copiar schema, colunas ou enums pra dentro deste arquivo. Eles envelhecem e viram fonte falsa.

## Manutenção

Quando uma sessão produzir um erro de processo novo (assumi algo sem verificar, modelei da fonte errada, pulei o pre-flight, propus o que já estava feito), virar uma entrada nova em "Anti-padrões nomeados" com data e o caso concreto.
