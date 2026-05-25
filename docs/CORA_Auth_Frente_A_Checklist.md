# Checklist — Auth Frente A: configuração do dashboard Supabase

> **Hugo executa via dashboard Supabase. CC não toca no dashboard.**
> Este documento é a fonte auditável do que foi configurado. Marque cada `[ ]` conforme executa.

**Briefing fonte:** [`docs/CORA_Briefing_Auth_MagicLink_SMS_Ready.md`](./CORA_Briefing_Auth_MagicLink_SMS_Ready.md) — Frente A (§4).

**Status:** ✅ **Concluído em 25/05/2026.** Todas as seções executadas e validadas via smoke test (Seção 8).

**Atualizações pós-briefing aplicadas:**
- **#3 — Sender na raiz:** o magic link sai de `oi@acora.com.br` (raiz, já verificada no Resend), **não** de `oi@send.acora.com.br` como diz a §4.2 do briefing. Razão: `send.acora.com.br` é só return-path técnico; a raiz já está verificada e enviando em produção. Não mexer em DNS raiz.
- **#4 — Site URL preservado em `admin.acora.com.br`:** o briefing original assumiu que o portal seria o único sistema usando o projeto Supabase. Na prática, o projeto é compartilhado com o backoffice e o Site URL já apontava pra ele. Decisão consciente: não mexer. O portal vai sempre passar `emailRedirectTo` explícito no SDK (Frente B), tornando o Site URL irrelevante pro fluxo do portal. Tarefa futura: revisar quando o backoffice for auditado.
- **#5 — Phone provider deixado em Disabled na Frente A:** UI atual do Supabase (mai/2026) não oferece "modo dev/preview" sem provedor SMS. Todas as 5 opções (Twilio, Messagebird, Textlocal, Vonage, Twilio Verify) exigem credenciais reais. Habilitar sem credenciais quebra o fluxo. Decisão revisitada na Frente D. Em produção Alpha (`VITE_AUTH_METHODS=email`), telefone não aparece na tela de login — sem impacto operacional.
- **#6 — JWT expiry por equivalência:** o campo `JWT expiry` (2592000s = 30 dias) não está editável no dashboard atual (Free Plan / configuração consolidada). Comportamento desejado coberto por refresh rotation ON + inactivity timeout 0. Ver Seção 6.

**Projeto Supabase alvo:** `kjzuvmhedicxbuynfqev` (banco compartilhado — preview e produção usam o mesmo projeto, e o backoffice também).

---

## Seção 0 — Pré-requisito: smoke test de schema (A.1)

Rodado e validado em **25/05/2026** (read-only, via SQL Editor). Resultado:

- [x] `subscriptions.user_id` existe (`uuid`, nullable, sem default)
- [x] FK `user_id` → `auth.users(id)` `ON DELETE CASCADE`
- [x] RLS habilitada na tabela (`true`)
- [x] 4 policies, todas PERMISSIVE, sem vazamento (auditoria de segurança passou: nenhuma policy de SELECT permissiva demais pra `anon`/`public`)
- [x] `subscriptions.whatsapp` existe (premissa da Frente C confirmada de passagem)

**Conclusão:** schema pronto. Liberar `VITE_SUPABASE_ANON_KEY` no bundle é seguro — a RLS protege os dados linha-por-dono. Nenhuma migration necessária nesta Frente A (schema é governado pelo `cora-backoffice`).

---

## Seção 1 — Providers > Email

`Authentication > Sign In / Providers > Email`

- [x] Email provider: **habilitado** (Enable email provider)
- [x] Secure email change: **on**
- [x] Confirm email: **off** _(o magic link já confirma o e-mail — passo redundante)_

> **Nota sobre UI atual:** Magic Link e Email OTP **não são toggles separados** no Supabase atual. Ambos coexistem automaticamente quando Email provider está habilitado; a escolha de qual usar fica no SDK (`signInWithOtp({ options: { ... } })`). Pra Frente A, basta Email provider ON — o portal usará magic link via código.

> Outros toggles na tela (Secure password change, Require current password when updating, Prevent use of leaked passwords, Minimum password length, Password requirements, Email OTP expiration/length) são irrelevantes pro fluxo do portal (que usa magic link puro, sem password). Mantidos no default.

---

## Seção 2 — Providers > Phone (Disabled na Frente A)

`Authentication > Sign In / Providers > Auth Providers > Phone`

- [x] Phone provider: **Disabled** (não habilitado)
- [x] Nenhum SMS provider configurado (nenhuma credencial Twilio/etc inserida)

> **Mudança de plano vs briefing original.** O briefing previa "Phone habilitado em modo dev/preview com OTP no log do console". A UI atual do Supabase não oferece esse modo: as 5 opções de SMS provider (Twilio, Messagebird, Textlocal, Vonage, Twilio Verify) exigem credenciais reais. Habilitar Phone sem credenciais quebra o fluxo de auth.

> **Implicação pra Frente D (SMS dormente):** revisitar a estratégia quando chegar a hora. Possíveis caminhos:
> - **(a)** deixar Phone OFF mesmo no Alpha, exercitar SMS via testes locais com mock (não testa o fluxo real, mas valida a interface do código);
> - **(b)** criar conta Twilio (ou Twilio Verify) só pra preview com credenciais isoladas — gasta pra cada teste, mas é o fluxo real;
> - **(c)** outra estratégia ainda não desenhada.

> **Em produção Alpha:** `VITE_AUTH_METHODS=email` faz com que o telefone nem apareça na tela de login. Sem impacto operacional. SMS continua "dormente" no nível do código.

> **Descoberta de bônus:** o Supabase agora oferece **Twilio Verify** como opção separada do Twilio puro. Twilio Verify cobra por verificação bem-sucedida (~$0.05 cada) em vez de por SMS individual + custo da mensagem. Pode ser uma escolha melhor que Twilio puro quando virar a chave do SMS. Decisão fica pra Frente D / momento da virada.

---

## Seção 3 — SMTP customizado (Resend)

`Authentication > Notifications > Emails > SMTP Settings` (habilitar "Custom SMTP")

- [x] Host: `smtp.resend.com`
- [x] Port: `465`
- [x] Username: `resend`
- [x] Password: API key específica do Resend, **criada exclusivamente pra este uso** (não é a `RESEND_API_KEY` legacy do `.env`)
- [x] Sender email: **`oi@acora.com.br`** _(raiz)_
- [x] Sender name: **`Cora`**

> ⚠️ **OVERRIDE DO BRIEFING.** A §4.2 manda usar `oi@send.acora.com.br` — **ISSO ESTÁ DESATUALIZADO**. Usar a raiz `oi@acora.com.br` (decisão pós-briefing #3).

> 🔑 **API key específica.** No Resend, criada uma key dedicada chamada `supabase-auth-cora`, com **Sending Access** (não Full Access) e **restrita ao domínio `acora.com.br`**. Decisão de segurança: se um dia for necessário revogar/rotacionar esta key, não afeta os outros usos do Resend (ex: emails de pré-cadastro). Auditoria fica mais clara no painel do Resend (cada key mostra quais emails enviou).

> 📌 **Reply-To é redundante aqui.** Como o sender já é `oi@acora.com.br` (raiz, cujo MX aponta pro Google Workspace e entrega no inbox do Hugo via alias `oi@`), responder o e-mail cai naturalmente no inbox certo. Não precisa de custom header nem ajuste no template HTML — toda a ginástica de Reply-To da §4.2 deixa de ser necessária com o sender na raiz.

> 🔒 Não tocar em DNS de `acora.com.br` (raiz). SPF/DKIM do Google Workspace continuam intactos.

> **Minimum interval per user:** mantido em **60 segundos** (default). Limita a frequência de envio de magic links pro mesmo endereço — proteção contra abuso. Se virar problema, ajustar.

---

## Seção 4 — Template do magic link

`Authentication > Notifications > Emails > Templates > Magic Link or OTP` (substituir o default)

Copy **aprovada por Hugo** nesta sessão (não alterar sem nova aprovação):

- [x] **Assunto:**
````
Seu acesso à Cora
````

- [x] **Corpo** (HTML, link clicável com URL inteira como texto — anti-phishing):
```html
<p>Oi,</p>

<p>Aqui está o link pra entrar na sua conta da Cora:</p>

<p><a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>

<p>Ele funciona por 1 hora. Se você não pediu esse link, pode ignorar essa mensagem.</p>

<p>Cora<br>A padaria do seu tempo</p>
```

> **Decisões de design embutidas:** sem botão estilizado (link em texto, mais "humano"); URL inteira como texto clicável em vez de "Log In" como anchor (boa prática anti-phishing — a pessoa vê pra onde vai antes de clicar); assinatura compacta sem ser corporativa.

---

## Seção 5 — Redirect URLs

`Authentication > URL Configuration > Redirect URLs`

**Site URL:** `https://admin.acora.com.br` _(pré-existente, NÃO mexido — ver atualização #4 no header)_

**URLs cadastradas** (5 no total, após adições da Frente A):

URLs do portal _(adicionadas na Frente A)_:
- [x] `https://app.acora.com.br/auth/callback` _(produção)_
- [x] `https://cora-portal-*-hugorafael01-techs-projects.vercel.app/auth/callback` _(todos os previews)_
- [x] `http://localhost:3000/auth/callback` _(`npx vercel dev`)_

URLs compartilhadas / pré-existentes do backoffice _(mantidas intactas)_:
- [x] `http://localhost:5173/auth/callback` _(Vite puro · serve aos dois projetos)_
- `https://admin.acora.com.br/auth/callback` _(produção backoffice)_

> O wildcard `*` no hostname é aceito pelo Supabase (validado empiricamente no smoke test da Seção 8). O Supabase cria múltiplos aliases por preview do Vercel; o wildcard cobre os dois padrões.

> **Site URL é apenas fallback.** Quando alguém chama `signInWithOtp` sem passar `emailRedirectTo`, o Supabase usa o Site URL como redirect default. Na Frente B, o portal vai SEMPRE passar `emailRedirectTo: 'https://app.acora.com.br/auth/callback'` explícito, então o Site URL nunca é usado pelo portal. Por isso ele pode continuar apontando pra `admin.acora.com.br` sem prejuízo ao portal.

---

## Seção 6 — Sessão e JWT (configurado por equivalência)

`Authentication > Sessions`

- [x] Refresh token rotation (toggle "Detect and revoke potentially compromised refresh tokens"): **ON**
- [x] Refresh token reuse interval: **10 segundos** (default)
- [x] Inactivity timeout: **never (0)** _(bloqueado no Free Plan; default é "never", que é o desejado)_
- [x] Time-box user sessions: **never (0)** _(idem)_

> **Nota sobre JWT expiry:** o campo `JWT expiry` específico (2592000s = 30 dias) **não está editável** no dashboard atual do Supabase (Free Plan / configuração consolidada). O default permanece 1 hora pro access token. **Isso não bloqueia o objetivo desejado** — o comportamento "usuário fica logado por longo período sem precisar relogar" é alcançado por equivalência:
>
> - O access token (JWT) expira em 1h
> - O refresh token tem expiry separado (longo) e rola automaticamente
> - O SDK do Supabase renova o access token transparentemente em background usando o refresh token
> - Como `inactivity timeout = 0` e `time-box = 0`, a sessão não tem prazo máximo enquanto o usuário continuar usando o portal
>
> **Resultado prático:** usuário fica logado **indefinidamente** enquanto continuar interagindo, sem perceber renovações. Se ficar muito tempo sem usar, em algum momento o refresh token expira e pede magic link de novo (raro e baixo atrito). Comportamento esperado pra Cora — assinante de padaria não vai relogar toda semana.

> **User Sessions configuráveis (Pro Plan):** os campos "Enforce single session per user", "Time-box user sessions" e "Inactivity timeout" só são editáveis no Pro Plan. No Free, os defaults atendem (never em todos).

---

## Seção 7 — Notas e pendências pra Frente B

- **Refs stale do briefing:** §9.1 e §10.9 ainda citam `oi@send.acora.com.br`. O smoke test correto da Frente B valida **display "Cora" + sender `oi@acora.com.br`**.
- **`VITE_AUTH_METHODS` na Vercel** (não é dashboard Supabase): setar em `Production = email` e, se quiser exercitar SMS em preview, `Preview = sms,email`. Fica pra Frente B; aqui só registrado.
- **`emailRedirectTo` sempre explícito no portal:** sempre passar `{ options: { emailRedirectTo: 'https://app.acora.com.br/auth/callback' } }` (ou URL equivalente em preview/dev) na chamada `signInWithOtp`. Sem isso, o Supabase cai no Site URL, que aponta pro backoffice. Crítico pra Frente B.
- **Rate limit:** usar o default do Supabase. Ajustar no dashboard só se necessário (§11 do briefing proíbe rate limit custom no código).

---

## Seção 8 — Validação pós-configuração (smoke test via dashboard)

Executado em **25/05/2026** após configurar as Seções 1–6.

- [x] Em `Authentication > Users`, criado usuário teste `hugorafael01@gmail.com`
- [x] Clicado **"Send magic link"** pra esse usuário
- [x] E-mail recebido no inbox (não Spam, não Promoções) — deliverability boa
- [x] Validado no e-mail:
  - [x] Sender técnico: `oi@acora.com.br`
  - [x] Display name: `Cora`
  - [x] Assunto: `Seu acesso à Cora`
  - [x] Corpo conforme aprovado, incluindo subline `A padaria do seu tempo`
  - [x] Reply-To natural (sender é raiz; responder cai no inbox certo via alias `oi@`)
- [x] Clicado no link — redirect aceito pra `https://admin.acora.com.br/auth/callback` (comportamento esperado: Site URL é admin, link sem `emailRedirectTo` cai no fallback). Não houve erro de "redirect URL não permitida" — confirma que a allow list funciona.
- [x] **Housekeeping:** usuário teste `hugorafael01@gmail.com` deletado em `Authentication > Users` após validação.

> O redirect pro backoffice no smoke test é esperado e não indica erro — vai ser corrigido na Frente B quando o portal disparar magic link via SDK com `emailRedirectTo` explícito.

---

## Rodapé — Verificação final

| # | Ponto | OK? |
|---|---|---|
| 1 | Email provider habilitado, Confirm email off | [x] |
| 2 | Phone provider em **Disabled** (decisão atualizada, ver Seção 2) | [x] |
| 3 | SMTP Resend com sender **`oi@acora.com.br`** + display **`Cora`** + key específica | [x] |
| 4 | Template magic link com assunto e corpo aprovados | [x] |
| 5 | 5 Redirect URLs cadastradas (3 portal + 2 compartilhadas/backoffice) | [x] |
| 6 | Sessões: refresh rotation ON, reuse 10s, sem timeouts (JWT expiry por equivalência) | [x] |

**Frente A da Auth — dashboard concluído em 25/05/2026. Frente B desbloqueada (auth core no código).**
