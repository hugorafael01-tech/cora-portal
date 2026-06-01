# Briefing — Frente D / D.3: onboarding grava auth user + profile + subscription

**Repo:** `cora-portal`
**Task ancora:** 86e1mba7c (Frente D — Subscription no DB)
**Sub-etapa:** D.3 (onboarding escreve no DB). D.1 (schema) e D.2 (hooks de leitura) ja mergeadas.
**Correlata obrigatoria:** correcao de seguranca no `cora-backoffice` (task 86e1mcyuz) — ver briefing separado. Recomendado aplicar a migration de revoke ANTES de D.3 ir pra producao.
**Sessao de origem:** 30/mai/2026

---

## Contexto

O onboarding atual (`src/Onboarding.jsx`, v5) coleta os dados e, no Confirmar da T2,
chama `postSubscription(...)` (em `src/utils/api.js`), que grava a assinatura no
**shape antigo** de `subscriptions` (nome/whatsapp/email/cpf/endereco/`itens`),
provavelmente via `/api/subscriptions` server-side. Hoje **NAO** cria usuario de
auth, **NAO** cria `profile`, e **NAO** grava as colunas novas (`qty_*`,
`zona_entrega`, `user_id`).

A D.3 troca o final do fluxo: no Confirmar, em vez de so gravar a assinatura velha,
o backend cria **usuario de auth + profile + subscription (shape novo + double-write
das colunas legadas)**, tudo ligado pelo `user_id`.

Antes de codar, ler:
- `src/Onboarding.jsx` (fluxo, estado `data` e `assinatura`, `handleNext` da T2).
- `src/utils/api.js` (`postSubscription`, `postWaitlist`).
- O endpoint atual de subscription em `/api/` (confirmar shape gravado, uso de
  service_role, tratamento do capacity gate / 409).
- `src/utils/coverage.js` (logica de zona/cobertura, pra derivar `zona_entrega`).
- `PORTAL_STATUS.md`.

---

## O problema central (galinha-e-ovo) e a decisao

`profile.user_id` e `subscription.user_id` sao FK pra `auth.users`. E
`profile.user_id` e a **PK** (NOT NULL), entao NAO da pra criar profile sem um
usuario de auth existindo antes. O portal e magic-link (sem senha), entao ninguem
se cadastra com senha.

**Decisao (tomada, nao redesenhar):** criar o usuario de auth no servidor, no
endpoint do Confirmar, via `supabase.auth.admin.createUser` com service_role,
`email_confirm: true`, sem senha. O magic-link login funciona depois porque o
usuario ja existe. NAO usar fluxo de signup client-side, NAO pedir verificacao de
email no meio do onboarding.

---

## Ordem de execucao no endpoint (critico)

Pra nao deixar usuario de auth orfao quando houver colisao:

1. **Pre-checar disponibilidade ANTES de criar qualquer coisa:**
   - email ja existe em `auth.users`? (lookup via admin API ou query)
   - cpf ja existe em `profiles`? (`profiles.cpf` e UNIQUE)
   - Se qualquer um existe, retornar erro especifico (ver "Tratamento de duplicado")
     e **nao criar nada**.
2. Criar o usuario de auth (`admin.createUser`, email_confirm true).
3. Inserir `profile` (user_id, nome, whatsapp, cpf).
4. Inserir `subscription` (shape novo + double-write legado).
5. Se 3 ou 4 falharem, fazer cleanup (deletar o que foi criado, incluindo o auth
   user) pra nao deixar orfao. Logar o erro.

Idempotencia: um retry (mesmo email/cpf) cai no pre-check do passo 1 e nao
duplica. A protecao de clique-duplo na UI (`submitting`) ja existe e permanece.

---

## Double-write da subscription (aprendido na D.2)

Enquanto a migration de cleanup (86e1mc0ta) nao rodar, `subscriptions` ainda tem as
colunas legadas como NOT NULL e a constraint `subscriptions_valor_mensal_check`
(`valor_mensal = valor_paes + valor_frete`). Entao o insert grava os dois conjuntos:

**Colunas novas:** `user_id`, `status`, `qty_total`, `qty_original`, `qty_integral`,
`zona_entrega`.

**Colunas legadas (NOT NULL):** `nome`, `whatsapp`, `email`, `cpf`, `cep`, `rua`,
`numero`, `complemento`, `bairro`, `cidade`, `estado`, `itens` (jsonb),
`total_paes`, `valor_paes`, `valor_frete`, `valor_mensal`.

Com a regra: `valor_paes = total_paes * 99`, `valor_frete = 15`,
`valor_mensal = valor_paes + valor_frete`. (Conferir os valores em
`Onboarding.jsx`: `VALOR_POR_PAO=99`, `FRETE_MENSAL=15`.)

`qty_total` = soma das quantidades; `qty_original`/`qty_integral` = por tipo (so
esses dois tipos sao elegiveis na assinatura). `total_paes` legado = `qty_total`.

---

## Outras decisoes (tomadas)

- **`zona_entrega`:** derivar uma zona sugerida do endereco (bairro/cidade) pela
  logica de `coverage.js`/zoneamento, e gravar (text, revisavel pelo Hugo depois).
  Nao deixar null. Se a logica de zona ainda nao expoe um "nome de zona", usar o
  melhor proxy disponivel e marcar como sugestao; nao inventar enum.
- **`status`:** `pending_payment` (default). Pagamento e manual (Asaas fase 1, link
  via WhatsApp), fora do escopo da D.3.
- **`asaas_customer_id` / `asaas_subscription_id`:** null. D.3 NAO coleta nem grava
  nenhum dado de pagamento.
- **`coverage_unconfirmed`:** continua vindo do fluxo atual (ViaCEP fallback).
- **Capacity gate:** manter o tratamento atual (`subscriptionsOpen`, 409
  `subscriptions_closed` -> waitlist). Nao regredir isso.

---

## Tratamento de duplicado (UX, definido com o Hugo)

O endpoint retorna codigos distintos; a UI mostra mensagens distintas:

- **Email ja existe** (`email_exists`): "Esse email ja tem conta, e so entrar."
  + acao de ir pro `/login`. A pessoa se recupera sozinha via magic link.
- **Email novo, CPF ja existe** (`cpf_exists`): "Ja existe um cadastro com esse CPF."
  + caminho de contato via WhatsApp (usar `buildHugoCoverageLink` de
  `config/contact` ou o link de contato equivalente). A pessoa pode nao lembrar o
  email usado, entao o magic link nao resolve sozinho; o contato com o Hugo resolve
  na mao (volume pequeno no Alpha).

Mensagens passam pela skill de tom de voz da Cora antes de fechar (sem travessao,
sem rule-of-three).

---

## Escopo (o que mexe / o que NAO mexe)

**Mexe (portal):**
- Endpoint server-side do Confirmar (estender o `/api/subscriptions` existente ou
  criar `/api/onboarding` que orquestra createUser + profile + subscription). Decidir
  com base no que o endpoint atual ja faz; preferir estender se couber limpo.
- `src/utils/api.js`: ajustar `postSubscription` (ou nova funcao) pro novo contrato
  e pros novos codigos de erro.
- `src/Onboarding.jsx`: tratar os novos codigos de erro (`email_exists`,
  `cpf_exists`) com as mensagens/acoes acima. O resto do fluxo (T1/T2/Welcome)
  permanece.

**NAO mexe:**
- **Schema.** D.3 nao cria migration. Schema e exclusivo do `cora-backoffice`. Se
  faltar algo no schema, PARAR e avisar o Hugo.
- ProtectedRoute / gate / `cora_subscription` (isso e D.4).
- Pagamento. Nenhum dado de cartao/pagamento e coletado ou gravado.
- Os hooks da D.2 (so leitura; serao usados na validacao).

---

## Variavel de ambiente

`admin.createUser` exige a service_role key no ambiente da Function
(`SUPABASE_SERVICE_ROLE_KEY` ou equivalente ja usado pelo endpoint atual). Confirmar
que ja existe; se nao, PARAR e avisar. NUNCA usar prefixo VITE_ pra service_role.

---

## Pontos de parada obrigatorios (adicionais aos do template, seguem apos o item 8)

9. Nao criar migration nem alterar schema. Schema e do cora-backoffice. Faltou algo? Para e avisa.
10. Nao coletar nem gravar nenhum dado de pagamento. status pending_payment, asaas_* null.
11. Pre-checar email E cpf antes de criar; nunca deixar usuario de auth orfao.
12. Nao tocar em ProtectedRoute/gate/cora_subscription.
13. Service_role so no servidor, nunca em var VITE_.
14. Mensagens de erro ao usuario passam pela skill de tom de voz da Cora.

---

## Validacao (preview Vercel)

1. Onboarding completo com email E cpf NOVOS -> confirmar no SQL Editor (Hugo roda)
   que foram criados: 1 auth user, 1 profile, 1 subscription com `user_id` setado,
   `status` pending_payment, `qty_*` corretos, `zona_entrega` preenchida, e as
   colunas legadas consistentes (valor_mensal = valor_paes + valor_frete).
2. Reaproveitar o painel D.2 (`/dev/frente-d?dev=1`) logando como o novo usuario
   (magic link) pra ver useProfile/useSubscription lendo o que o onboarding gravou
   (integracao D.2 <-> D.3).
3. Onboarding com email JA existente -> mensagem "ja tem conta" + ida pro /login,
   nada criado no banco.
4. Onboarding com email novo mas CPF ja existente -> mensagem de CPF + contato
   WhatsApp, nada criado no banco (nenhum auth user orfao).
5. Capacity gate: continua redirecionando pra waitlist quando fechado / no 409.

Queries de verificacao e de limpeza dos usuarios/linhas de teste: CC entrega
prontas pro Hugo rodar no SQL Editor (CC nao roda). Incluir o DELETE de teste
(auth user + profile + subscription) pra nao sujar a base.

---

## Refs

- `src/Onboarding.jsx`, `src/utils/api.js`, endpoint `/api/` de subscription.
- `src/utils/coverage.js` (zona_entrega).
- Migration 0018 (D.1) — colunas novas + RLS.
- D.2 (hooks) — usados na validacao.
- 86e1mcyuz — correcao de seguranca (briefing separado, backoffice), aplicar antes de prod.
- 86e1mc0ta — cleanup/contract (dropa as legadas depois).
- Constraint aprendida na D.2: subscriptions_valor_mensal_check = valor_paes + valor_frete.
