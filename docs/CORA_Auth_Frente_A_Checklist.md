# Checklist — Auth Frente A: configuração do dashboard Supabase

> **Hugo executa via dashboard Supabase. CC não toca no dashboard.**
> Este documento é a fonte auditável do que precisa ser configurado. Marque cada `[ ]` conforme executa.

**Briefing fonte:** [`docs/CORA_Briefing_Auth_MagicLink_SMS_Ready.md`](./CORA_Briefing_Auth_MagicLink_SMS_Ready.md) — Frente A (§4).

**Atualizações pós-briefing aplicadas** (consolidadas na sessão de 25/05/2026):
- **#3 — Sender na raiz:** o magic link sai de `oi@acora.com.br` (raiz, já verificada no Resend), **não** de `oi@send.acora.com.br` como diz a §4.2 do briefing. Razão: `send.acora.com.br` é só return-path técnico; a raiz já está verificada e enviando em produção. Não mexer em DNS raiz.
- As demais decisões (schema pronto, JWT 30 dias, providers) seguem o briefing e foram reconfirmadas na mesma sessão.

**Projeto Supabase alvo:** `kjzuvmhedicxbuynfqev` (banco compartilhado — preview e produção usam o mesmo projeto).

**Como usar:** marque cada `[ ]` conforme executa. Onde a ordem importa, está indicado.

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

`Authentication > Providers > Email`

- [ ] Email provider: **habilitado**
- [ ] Magic link: **on**
- [ ] Confirm email: **off** _(o magic link já confirma o e-mail)_
- [ ] Secure email change: **on**
- [ ] Email OTP: **off** _(usamos só o link, não o código de 6 dígitos por e-mail)_

---

## Seção 2 — Providers > Phone (dormente)

`Authentication > Providers > Phone`

- [ ] Phone provider: **habilitado** em modo dev/preview
- [ ] SMS provider: **nenhum** — **NÃO ligar Twilio agora**
- [ ] Confirmar que, sem provedor real, o OTP aparece no **log do Supabase** (console)

> Isto deixa o caminho SMS exercitável em preview (Frente D) com `VITE_AUTH_METHODS=sms,email`, sem custo e sem provedor contratado. Em produção Alpha o telefone **não** aparece na tela de login.

---

## Seção 3 — SMTP customizado (Resend)

`Authentication > Email Templates > SMTP Settings` (habilitar "Custom SMTP")

- [ ] Host: `smtp.resend.com`
- [ ] Port: `465`
- [ ] User: `resend`
- [ ] Pass: API key do Resend (mesma de `RESEND_API_KEY`)
- [ ] Sender email: **`oi@acora.com.br`** _(raiz)_
- [ ] Sender name: **`Cora`**

> ⚠️ **OVERRIDE DO BRIEFING.** A §4.2 manda usar `oi@send.acora.com.br` — **ISSO ESTÁ DESATUALIZADO**. Usar a raiz `oi@acora.com.br` (decisão pós-briefing #3).

> 📌 **Reply-To é redundante aqui.** Como o sender já é `oi@acora.com.br` (raiz, cujo MX aponta pro Google Workspace e entrega no inbox do Hugo via alias `oi@`), responder o e-mail cai naturalmente no inbox certo. Não precisa de custom header nem ajuste no template HTML — toda a ginástica de Reply-To da §4.2 deixa de ser necessária com o sender na raiz.

> 🔒 Não tocar em DNS de `acora.com.br` (raiz). SPF/DKIM do Google Workspace continuam intactos.

---

## Seção 4 — Template do magic link

`Authentication > Email Templates > Magic Link` (substituir o default)

Copy **aprovada por Hugo** nesta sessão (não alterar sem nova aprovação):

- [ ] **Assunto:**
```
Seu acesso à Cora
```

- [ ] **Corpo** (HTML simples, texto direto, link puro — sem branding pesado, sem botão estilizado):
```
Oi,

Aqui está o link pra entrar na sua conta da Cora:

{{ .ConfirmationURL }}

Ele funciona por 1 hora. Se você não pediu esse link, pode ignorar essa mensagem.

Cora
A padaria do seu tempo
```

---

## Seção 5 — Redirect URLs

`Authentication > URL Configuration > Redirect URLs`

- [ ] `https://app.acora.com.br/auth/callback` _(produção)_
- [ ] `https://cora-portal-*-hugorafael01-techs-projects.vercel.app/auth/callback` _(todos os previews)_
- [ ] `http://localhost:5173/auth/callback` _(Vite puro · `npm run dev`)_
- [ ] `http://localhost:3000/auth/callback` _(`npx vercel dev`)_

> O wildcard `*` cobre o hash variável de cada deploy de preview. Confirmar que o Supabase aceita o glob (campo "Redirect URLs" suporta `*`).

---

## Seção 6 — Sessão e JWT

`Authentication > Sessions` / `Settings`

- [ ] JWT expiry: `2592000` _(30 dias, em segundos)_
- [ ] Refresh token rotation: **on**
- [ ] Reuse interval: `10` _(segundos)_

---

## Seção 7 — Notas e pendências pra Frente B

- **Refs stale do briefing:** §9.1 e §10.9 ainda citam `oi@send.acora.com.br`. O smoke test correto da Frente B valida **display "Cora" + sender `oi@acora.com.br`**.
- **`VITE_AUTH_METHODS` na Vercel** (não é dashboard Supabase): setar em `Production = email` e, se quiser exercitar SMS em preview, `Preview = sms,email`. Fica pra Frente B; aqui só registrado.
- **Rate limit:** usar o default do Supabase. Ajustar no dashboard só se necessário (§11 do briefing proíbe rate limit custom no código).

---

## Seção 8 — Validação pós-configuração (smoke test via dashboard)

Depois de configurar as seções 1–6, validar o envio real **antes** de considerar a Frente A concluída:

- [ ] Em `Authentication > Users`, criar usuário teste com o **e-mail pessoal do Hugo**
- [ ] Clicar **"Send magic link"** pra esse usuário
- [ ] No inbox, validar:
  - [ ] Sender técnico: `oi@acora.com.br`
  - [ ] Display name: `Cora`
  - [ ] Assunto: `Seu acesso à Cora`
  - [ ] Corpo conforme aprovado, **incluindo a subline `A padaria do seu tempo`**
  - [ ] Reply-To natural: responder o e-mail cai no inbox certo (oi@ → inbox do Hugo)
- [ ] Clicar no link e confirmar que **não** dá erro de "redirect URL não permitida"
  - 404 do app é **esperado** nesta Frente A (ainda não existe a tela `/auth/callback` — ela entra na Frente B). O que importa aqui é o redirect ser aceito, não a tela carregar.
- [ ] **Housekeeping:** deletar o usuário teste após validar

---

## Rodapé — Verificação final (6 pontos críticos)

| # | Ponto | OK? |
|---|---|---|
| 1 | Email provider: magic link **on**, confirm email **off**, Email OTP **off** | [ ] |
| 2 | Phone provider habilitado em modo dev, **sem** Twilio | [ ] |
| 3 | SMTP Resend com sender **`oi@acora.com.br`** + display **`Cora`** | [ ] |
| 4 | Template magic link com assunto e corpo aprovados | [ ] |
| 5 | 4 Redirect URLs cadastradas (prod + preview wildcard + 2 localhost) | [ ] |
| 6 | JWT expiry `2592000`, refresh rotation **on**, reuse `10`s | [ ] |

Com os 6 marcados + Seção 8 validada, a configuração de dashboard da Frente A está completa.
