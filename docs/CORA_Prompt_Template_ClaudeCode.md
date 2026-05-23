# Template — Prompt de abertura pra sessões do Claude Code (Cora)

**Uso:** template genérico pra abrir sessões do Claude Code (CC) em qualquer repo da Cora (portal, backoffice, financeiro futuro). Adaptar as seções entre `[colchetes]` pra cada tarefa específica. O resto é fixo e reflete princípios não-negociáveis do projeto.

**Histórico:** versão consolidada após sessões de mai/2026 onde se observou: (1) CC assumindo estado do repo a partir de branches locais sem verificar remoto, (2) CC pedindo DATABASE_URL pra rodar smoke tests.

---

## Template (copiar a partir daqui)

```
Você vai trabalhar no repo `[NOME_DO_REPO]` para [DESCRIÇÃO_CURTA_DA_TAREFA].

## Antes de qualquer linha de código

1. Leia `[ARQUIVO_DE_STATUS]` na raiz do repo. Essa é a fonte da verdade do estado atual.
2. Leia o briefing completo `[NOME_DO_BRIEFING.md]` (anexado a esta sessão). Não pule seções. As decisões já foram tomadas — seu trabalho é executar, não redesenhar.
3. Antes de propor qualquer plano, faça `git fetch origin` e verifique `git log origin/main` para confirmar o estado real do remoto. Não tire conclusões a partir de branches locais sem cruzar com o remoto.
4. Confirme pra mim que leu os dois documentos antes de propor plano de ataque.

## Princípios não-negociáveis da Cora

**Schema é gerenciado APENAS pelo repo `cora-backoffice`.** Se a tarefa exigir mudança de schema, você NÃO cria migration fora do Backoffice e NÃO mexe em estrutura via dashboard Supabase. Me avisa e eu faço no repo correto antes.

**Validar em Vercel Preview, nunca em localhost.** Vercel Functions retornam 404 em localhost. Smoke tests acontecem em deployments de preview, sempre.

**Branch por feature, squash merge via GitHub UI.** Após o merge, deletar branch local com `git branch -D` (uppercase, força).

**Commit messages ASCII-only.** Sem acentos, sem caracteres especiais.

**Nunca peça credenciais de produção.** Isso inclui DATABASE_URL, service_role keys, senhas, tokens com escopo amplo, ou qualquer string que dê acesso direto ao banco/serviço com privilégios além do estritamente necessário. Quando precisar rodar SQL no banco real, entregue as queries prontas em blocos separados pra Hugo executar no SQL Editor do Supabase. Quando precisar testar algo que exigiria credencial elevada, proponha o teste mais leve possível ou aguarde uma frente posterior.

**Anon key pode ter prefixo VITE_**, service role/admin keys nunca. Anon é pública por design (RLS protege). Service role expõe acesso total se vazar no bundle.

**Filtros de decisão técnica da Cora:** eficiência operacional, eficiência financeira, segurança de informação. Qualquer decisão técnica sua passa por esses três crivos. Se algo no briefing parecer comprometer qualquer um deles, pare e me alerte antes de implementar.

## Workflow

Se o briefing dividir a entrega em frentes (A, B, C...): **uma frente por vez, uma branch por frente.** Antes de começar cada frente:
1. Apresente o escopo proposto (o que vai mexer, o que não vai)
2. Aguarde meu OK
3. Implemente
4. Faça smoke test no preview Vercel conforme o briefing
5. Me passe o link de preview e os resultados dos smoke tests
6. Eu valido e dou OK pra abrir o PR
7. Squash merge via UI por mim

Não pule etapas. Não junte frentes.

## Pare e pergunte obrigatoriamente antes de

1. Aplicar qualquer migration de schema
2. Mudar template/copy de comunicação com cliente (e-mail, WhatsApp, push)
3. Remover qualquer código existente que outras partes do sistema possam depender
4. Tocar em arquivos identificados como sensíveis no briefing
5. Deploy em produção (sempre via preview primeiro)
6. Qualquer coisa não coberta pelo briefing — não invente, pergunte
7. Qualquer pedido de credencial além das já presentes em `.env.local.example`

## Padrões de verificação obrigatórios

- **Estado do repo:** `git fetch && git log origin/main --oneline -20` antes de assumir o que está merged
- **Estado do schema:** se for tocar em algo que depende de tabela/coluna, confirme via SQL no SQL Editor que Hugo executa (não rode você mesmo)
- **Estado do deploy:** `vercel ls` ou link do dashboard, não assumir baseado em git
- **Estado do banco:** queries read-only via SQL Editor, com Hugo executando

## Tom

Não termine cada mensagem com "devo começar agora?" ou "quer que eu continue?". Trabalhe em blocos coerentes. Quando precisar de input meu, peça de forma específica e prática.

Se algo no briefing for ambíguo, pergunte. Se algo no briefing parecer contradizer o estado atual do repo, pergunte. Se você identificar um caminho melhor do que o descrito, fale antes de implementar — eu decido.

## Primeira ação

Leia `[ARQUIVO_DE_STATUS]` e o briefing anexo. Faça `git fetch` e cheque `origin/main`. Depois me responda com:

1. Confirmação de que leu os dois documentos
2. Estado atual relevante do repo (o que já existe, branches abertos no remoto, último commit em main)
3. Proposta de escopo pra primeira frente (ou pra a tarefa, se não houver divisão por frente)
4. Lista de perguntas, se tiver

Não comece a codar nada nesta resposta.
```

## Fim do template

---

## Variáveis a substituir antes de usar

| Variável | Exemplo |
|---|---|
| `[NOME_DO_REPO]` | `cora-portal`, `cora-backoffice` |
| `[DESCRIÇÃO_CURTA_DA_TAREFA]` | "implementar autenticação Supabase com magic link, mantendo arquitetura preparada pra SMS OTP futuro" |
| `[ARQUIVO_DE_STATUS]` | `PORTAL_STATUS.md` (no portal), ou equivalente no Backoffice se existir |
| `[NOME_DO_BRIEFING.md]` | nome exato do arquivo de briefing anexado à sessão |

---

## Pontos de parada obrigatórios — adaptar por tarefa

A seção "Pare e pergunte obrigatoriamente antes de" tem itens genéricos. Em briefings específicos, costuma haver itens adicionais (ex: "Tocar em src/Onboarding.jsx"). Sempre revisar o briefing antes de mandar o prompt e adicionar os itens específicos da tarefa logo após o item 7 do template.

---

## Lições aprendidas incorporadas

**Lição 1 (sessão Backoffice, mai/2026):** CC do Backoffice perguntou de onde basear branch novo, assumindo que branch local de migration 0015 ainda não estava merged. Na verdade já estava em main. Causa: não fez `git fetch` antes de tirar conclusões a partir do estado local.
→ Incorporado em "Padrões de verificação obrigatórios" e em "Antes de qualquer linha de código" item 3.

**Lição 2 (sessão Backoffice, mai/2026):** CC pediu DATABASE_URL pra rodar smoke tests de migration via psql CLI. Foi rejeitado em favor de SQL Editor com Hugo executando.
→ Incorporado em "Nunca peça credenciais de produção" e em "Padrões de verificação obrigatórios".

**Lição 3 (sessão Portal, abr/2026):** CC tentou validar Vercel Functions em localhost e bateu em 404.
→ Já estava nas regras anteriores, mantido explícito em "Validar em Vercel Preview, nunca em localhost".

**Lição 4 (sessão Portal, ?):** Tentativa de criar migration de schema dentro do portal, ignorando regra de governance.
→ Mantido explícito em "Schema é gerenciado APENAS pelo repo cora-backoffice".

---

## Atualizar este template quando

- Uma sessão do CC produzir um erro de processo novo (assumiu algo errado, pediu credencial demais, tentou atalho perigoso)
- Surgir nova restrição estrutural no projeto (novo repo, novo serviço, nova regra de governance)
- Convenção de workflow mudar (ex: trocar de squash merge pra merge commit)

Cada atualização vira nova entrada em "Lições aprendidas incorporadas" com data e contexto da sessão que gerou.
