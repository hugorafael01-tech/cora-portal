# Briefing — Auth do Portal: Magic Link agora, SMS-ready

**Repo:** `cora-portal`
**Status atual:** Alpha destrava pela presença de `cora_subscription` no localStorage (não há login real)
**Objetivo:** Substituir o gate por autenticação Supabase com magic link por e-mail, deixando a arquitetura preparada pra ligar SMS OTP no futuro com flip de flag
**Prazo de referência:** antes do início das entregas Alpha em agosto/2026
**Provedor SMS escolhido (não configurar agora):** Twilio

---

## 1. Decisões já tomadas

1. **Método no Alpha:** magic link por e-mail, único caminho visível na tela de login
2. **Arquitetura SMS-ready:** todos os artefatos de SMS OTP existem no código (componentes, endpoints, schema, fluxo) mas estão atrás de feature flag desligada em produção
3. **Provedor SMS futuro:** Twilio. Não criar conta nem configurar credenciais agora
4. **SMTP de saída:** Resend via `send.acora.com.br` (já configurado no projeto). Magic link deve sair com remetente `oi@acora.com.br`, não com header default do Supabase
5. **Sessão:** 30 dias, refresh automático
6. **Recuperação manual:** procedimento documentado pra Hugo gerar magic link admin em casos extremos (perda de e-mail + WhatsApp)
7. **Sem teaser de SMS na tela de login:** o usuário não vê "em breve, login por celular". Quando ligar, comunica como melhoria

---

## 2. Princípios de design

- **Schema preparado, código exercitado, provedor não contratado.** O fluxo SMS deve rodar em preview com OTP fake (Supabase loga o código no console em dev/preview)
- **Feature flag é o único interruptor.** Trocar de e-mail-only pra híbrido SMS+e-mail é uma variável de ambiente
- **Migrar é proibido.** Nada de "depois a gente refatora pra suportar telefone". O telefone capturado no T1 já entra em `auth.users.phone` em formato E.164 desde o dia 1
- **A Sra. Beatriz consegue sozinha.** Toda a UI testada com a persona em mente: fontes grandes, mensagens claras, recuperação óbvia

---

## 3. Schema e dados

### 3.1. Onde o telefone vive

Hoje o T1 captura `whatsapp` e provavelmente está salvando em `subscriptions.whatsapp` (confirmar antes da implementação).

**Decisão:** o telefone canônico vive em `auth.users.phone` (campo nativo do Supabase) em formato E.164 (`+5521999998888`). A coluna `subscriptions.whatsapp` continua existindo como conveniência de leitura, mas a fonte de verdade é `auth.users.phone`.

**Implicação:** ao criar o usuário no fim do onboarding, o telefone vai pra dois lugares:
1. `auth.users.phone` (via `supabase.auth.admin.updateUserById` ou no momento do `signUp`)
2. `subscriptions.whatsapp` (conveniência)

### 3.2. Validação E.164 no T1

A máscara visual do campo continua sendo BR-friendly (`(21) 99999-8888`). Antes de submeter, o valor é normalizado pra E.164:
- Remove tudo que não é dígito
- Se começa com `55`, mantém
- Se não começa com `55`, adiciona `+55` na frente
- Valida regex `^\+55\d{10,11}$`

Helper sugerido: `src/lib/phone.ts` com `normalizeBRPhone(input: string): string | null`.

### 3.3. Vínculo auth ↔ subscription

A tabela `subscriptions` precisa ter coluna `user_id` (FK pra `auth.users.id`). Se ainda não tem, criar via migration **no repo do Backoffice** (regra de governance). Cada subscription pertence a um usuário Supabase Auth.

Confirmar com o estado atual antes de gerar migration:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'subscriptions';
```

Se `user_id` não existir, briefing complementar pra Backoffice fazer migration 0014 ou similar.

---

## 4. Configuração Supabase Auth

### 4.1. Providers a habilitar

No dashboard Supabase, em Authentication > Providers:

- **Email:** habilitado
  - Confirm email: **off** (magic link já confirma)
  - Secure email change: **on**
  - Magic link: **on**
  - Email OTP: off (usamos só o link)
- **Phone:** habilitado em modo dev/preview
  - SMS provider: nenhum em produção (não ligar Twilio agora)
  - Em ambiente dev/preview: confiar no log do Supabase que mostra o OTP no console (sem provedor real)

### 4.2. SMTP customizado (Resend)

**Decisão de envio (Opção 2):** o e-mail sai tecnicamente do subdomínio `send.acora.com.br` (já validado no Resend), mas o display name é `Cora` e o Reply-To é o alias real do Google Workspace. Pra Sra. Beatriz, na caixa de entrada aparece "De: Cora" — se ela responder, cai direto no inbox do Hugo.

Em Authentication > Email Templates > SMTP Settings:

- Host: `smtp.resend.com`
- Port: `465`
- User: `resend`
- Pass: API key do Resend (variável de ambiente `RESEND_API_KEY`)
- Sender email: `oi@send.acora.com.br`
- Sender name: `Cora`
- Reply-To: `oi@acora.com.br` (configurar via custom header ou via campo dedicado se o Supabase expuser; senão, ajustar no template HTML — ver 4.3)

**Importante:** não tocar em DNS de `acora.com.br` (raiz). A configuração de SPF/DKIM do Google Workspace continua intocada. Só `send.acora.com.br` é usado pra envio transacional, como já está hoje.

### 4.3. Template do e-mail de magic link

Em Authentication > Email Templates > Magic Link, substituir o default. Versão proposta (validar com Hugo antes do deploy):

**Assunto:** `Seu acesso à Cora`

**Corpo (HTML simples, sem branding pesado):**
```
Oi,

Aqui está o link pra entrar na sua conta da Cora:

{{ .ConfirmationURL }}

Ele funciona por 1 hora. Se você não pediu esse link, pode ignorar essa mensagem.

Cora
A padaria do seu tempo
```

Sem assinatura "feita com amor". Sem CTA enfeitado. Sem botão estilizado. Texto direto, link puro.

### 4.4. Redirect URLs permitidos

Em Authentication > URL Configuration:

- `https://app.acora.com.br/auth/callback`
- `https://*-cora-portal.vercel.app/auth/callback` (previews)
- `http://localhost:5173/auth/callback` (dev local)

### 4.5. Sessão e JWT

- JWT expiry: `2592000` (30 dias)
- Refresh token rotation: **on**
- Reuse interval: `10` segundos

---

## 5. Arquitetura de código

### 5.1. Estrutura de arquivos

```
src/
├── auth/
│   ├── AuthProvider.tsx        // contexto Supabase + sessão
│   ├── useAuth.ts              // hook
│   ├── ProtectedRoute.tsx      // gate de rotas autenticadas
│   ├── methods.ts              // feature flag + métodos disponíveis
│   └── adminRecovery.md        // doc de procedimento manual
├── pages/
│   ├── Login.tsx               // tela de login
│   ├── LoginSent.tsx           // tela "link enviado"
│   └── AuthCallback.tsx        // processa callback do magic link
├── components/
│   ├── EmailInput.tsx          // já existe? validar
│   ├── PhoneInput.tsx          // máscara BR + normalização E.164
│   └── OTPInput.tsx            // 6 dígitos, autocomplete one-time-code
└── lib/
    ├── phone.ts                // normalizeBRPhone, formatBRPhone
    └── supabase.ts             // client (já existe)
```

### 5.2. Feature flag

Variável de ambiente: `VITE_AUTH_METHODS`

Valores aceitos:
- `email` (Alpha)
- `sms,email` (futuro, SMS primário com fallback)
- `sms` (cenário improvável de só SMS)

Em `src/auth/methods.ts`:
```typescript
export type AuthMethod = 'email' | 'sms'

export const availableAuthMethods = (): AuthMethod[] => {
  const raw = import.meta.env.VITE_AUTH_METHODS || 'email'
  return raw.split(',').map(s => s.trim()) as AuthMethod[]
}

export const primaryAuthMethod = (): AuthMethod => {
  return availableAuthMethods()[0] || 'email'
}

export const hasFallback = (): boolean => {
  return availableAuthMethods().length > 1
}
```

Em produção Alpha: `VITE_AUTH_METHODS=email`
Em preview/dev: `VITE_AUTH_METHODS=sms,email` (pra exercitar todos os caminhos)

### 5.3. Substituição do gate atual

Hoje o portal usa `cora_subscription` no localStorage como gate. Isso precisa sair.

**Antes:**
```typescript
if (localStorage.getItem('cora_subscription')) {
  // destrava
}
```

**Depois:**
```typescript
const { session, loading } = useAuth()
if (loading) return <Splash />
if (!session) return <Navigate to="/login" />
// destrava
```

O `localStorage` continua sendo usado **só pra cache de dados** (preferências, estado de UI), nunca como gate.

`<ProtectedRoute>` envolve Home, Assinatura, Cardápio, Perfil. Não envolve Onboarding (Onboarding cria a conta).

---

## 6. Fluxos

### 6.1. Cadastro novo (Onboarding)

1. Splash → T1 (nome, WhatsApp, e-mail, CPF, endereço, cobertura)
2. T2 (assinatura selecionada)
3. **Ao confirmar T2:** Portal chama `supabase.auth.signUp({ email, phone: e164Phone, ...metadata })`. Isso cria o usuário no Auth.
4. Imediatamente: `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })` envia o magic link
5. Welcome screen mostra: "Que bom ter você aqui, [nome]. Enviamos um link de acesso pro seu e-mail pra confirmar e entrar."
6. Pessoa clica no link → `/auth/callback` → cria sessão → redireciona pra Home

**Por que magic link no cadastro também:** valida o e-mail real (não dá pra digitar e-mail inventado) e já estabelece o padrão de acesso.

### 6.2. Acesso de novo dispositivo (cenário central)

1. Pessoa abre `app.acora.com.br` em qualquer device
2. `<ProtectedRoute>` vê que não tem sessão → redireciona pra `/login`
3. Tela de login mostra (no Alpha): campo de e-mail + botão "Receber link de acesso"
4. Submete → Portal chama `supabase.auth.signInWithOtp({ email })`
5. Tela `/login-sent` mostra: "Link enviado. Confira seu e-mail."
6. Pessoa abre e-mail no mesmo device ou em outro → clica no link
7. Link abre `app.acora.com.br/auth/callback?token_hash=...&type=magiclink`
8. `AuthCallback.tsx` chama `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })`
9. Sessão criada → redireciona pra `/` (Home)

### 6.3. Recuperação de e-mail desconhecido

Tela de login com e-mail digitado que não existe no `auth.users`:
- Supabase retorna sucesso silencioso por padrão (anti-enumeração). O Portal não revela se o e-mail existe ou não.
- Tela de "link enviado" aparece igual, mas obviamente nenhum e-mail chega
- Após 60 segundos sem ação do usuário, mostrar texto pequeno: "Não recebeu nada? Talvez o e-mail não esteja cadastrado. Fale com a gente." com link pro WhatsApp

### 6.4. Logout

Botão "Sair" no Perfil:
1. `supabase.auth.signOut()`
2. Limpa caches de localStorage relacionados a dados (não auth)
3. Redireciona pra `/login`

### 6.5. Recuperação admin (cenário 3)

Cenário raro: pessoa perdeu acesso ao e-mail e ao número. Manda WhatsApp pro Hugo.

Procedimento (documentar em `src/auth/adminRecovery.md`):
1. Hugo valida identidade na conversa (nome + endereço + dia da última entrega)
2. Hugo entra no dashboard Supabase > Authentication > Users
3. Localiza o usuário pelo e-mail antigo
4. Edita o e-mail pro novo da pessoa
5. Clica em "Send magic link"
6. Avisa no WhatsApp que o link foi pro novo e-mail

Não precisa endpoint custom. Dashboard Supabase cobre.

---

## 7. UI das telas

### 7.1. `/login` — Tela de login (Alpha, e-mail only)

**Estrutura:**
- Logo Cora centralizado no topo (usa `cora_logo_com_tag.svg`)
- Título: `ENTRE NA CORA` (League Gothic, conforme design system)
- Subtítulo curto: "Vamos enviar um link de acesso pro seu e-mail."
- Campo de e-mail (label: "Seu e-mail")
- Botão primário: "Receber link"
- Footer pequeno: "Ainda não tem assinatura? [Conheça a Cora](https://acora.com.br)"

**Em preview/dev (com `VITE_AUTH_METHODS=sms,email`):**
- Primário SMS visível (campo telefone + botão "Receber código")
- Link discreto abaixo: "Prefiro receber por e-mail"
- Ao clicar no link, troca pra modo e-mail

**Estados:**
- Idle: campos editáveis
- Loading (após submit): botão desabilitado, texto "Enviando..."
- Sucesso: redireciona pra `/login-sent`
- Erro (raro): banner abaixo do campo "Algo deu errado. Tenta de novo em alguns segundos."

### 7.2. `/login-sent` — Tela pós-envio

**Estrutura:**
- Ícone de envelope (SVG simples, azul Cora)
- Título: `LINK A CAMINHO` (League Gothic)
- Texto principal: "A gente acabou de enviar um link de acesso pro seu e-mail. Ele chega em até 1 minuto."
- Texto secundário: "Não achou? Olhe em promoções ou spam. O link funciona por 1 hora."
- Botão secundário: "Tentar com outro e-mail" (volta pra `/login`)
- Após 60 segundos: aparece texto pequeno "Continua sem chegar? [Fale com a gente](https://wa.me/...)"

### 7.3. `/auth/callback` — Processamento

Tela transitória, mostra apenas:
- Logo Cora centralizado
- Mensagem: "Entrando..."
- Spinner ou skeleton

Processa o `token_hash` via `supabase.auth.verifyOtp`. Em caso de sucesso, redireciona pra Home. Em caso de erro (link expirado, já usado), redireciona pra `/login?error=expired` e mostra banner.

### 7.4. Banner de erro em `/login`

Quando vier de callback com erro:
- `?error=expired`: "Esse link expirou. Vamos enviar outro?"
- `?error=invalid`: "Esse link já foi usado ou não é válido. Pedir um novo."

Banner discreto acima do campo de e-mail, fundo azul-50 (`#EAF0FF`), texto azul Cora.

---

## 8. Copies — referência completa

Todas as copies abaixo já passaram pelo filtro de brand voice. Hugo pode revisar antes do deploy:

| Local | Copy |
|---|---|
| Título `/login` | `ENTRE NA CORA` |
| Subtítulo `/login` | "Vamos enviar um link de acesso pro seu e-mail." |
| Label campo e-mail | "Seu e-mail" |
| Botão `/login` | "Receber link" |
| Footer `/login` | "Ainda não tem assinatura? Conheça a Cora." |
| Título `/login-sent` | `LINK A CAMINHO` |
| Texto principal `/login-sent` | "A gente acabou de enviar um link de acesso pro seu e-mail. Ele chega em até 1 minuto." |
| Texto secundário `/login-sent` | "Não achou? Olhe em promoções ou spam. O link funciona por 1 hora." |
| Botão `/login-sent` | "Tentar com outro e-mail" |
| Após 60s sem ação | "Continua sem chegar? Fale com a gente." |
| Tela callback | "Entrando..." |
| Erro link expirado | "Esse link expirou. Vamos enviar outro?" |
| Erro link inválido | "Esse link já foi usado ou não é válido. Pedir um novo." |
| Erro genérico | "Algo deu errado. Tenta de novo em alguns segundos." |
| Assunto e-mail | `Seu acesso à Cora` |
| Corpo e-mail | Ver seção 4.3 |

**Modo SMS (preview, futuro):**

| Local | Copy |
|---|---|
| Título `/login` (modo SMS) | `ENTRE NA CORA` |
| Subtítulo modo SMS | "Vamos enviar um código de 6 dígitos pro seu celular." |
| Label campo telefone | "Seu celular" |
| Placeholder | "(21) 99999-8888" |
| Botão modo SMS | "Receber código" |
| Link de fallback | "Prefiro receber por e-mail" |
| Tela de digitar OTP | "Digite o código de 6 dígitos" |
| Apoio OTP | "Enviamos pra +55 21 9****-8888." |
| Reenvio OTP (após 30s) | "Não chegou? Reenviar código." |

---

## 9. Smoke tests (validação em preview antes do merge)

Cada item abaixo deve passar manualmente em deployment de preview Vercel:

### 9.1. Magic link (modo Alpha, `VITE_AUTH_METHODS=email`)

- [ ] Onboarding completo cria usuário em `auth.users` com `email` e `phone` (E.164)
- [ ] Magic link chega no e-mail real, com display name "Cora" e endereço técnico `oi@send.acora.com.br`
- [ ] Responder o e-mail do magic link cai no inbox do Hugo (Reply-To `oi@acora.com.br` funcionando)
- [ ] Clicar no link em outro device cria sessão e leva pra Home
- [ ] Logout limpa sessão e redireciona pra `/login`
- [ ] Limpar localStorage e cookies, abrir o portal: redireciona pra `/login` (não destrava sozinho)
- [ ] E-mail desconhecido em `/login`: mensagem genérica de sucesso (não vaza enumeração)
- [ ] Link expirado: redireciona pra `/login?error=expired` com banner
- [ ] Reutilizar mesmo link: redireciona pra `/login?error=invalid`
- [ ] Sessão persiste por 30 dias (verificar JWT expiry)

### 9.2. SMS OTP (modo preview, `VITE_AUTH_METHODS=sms,email`)

- [ ] Campo telefone com máscara BR funciona
- [ ] Submeter telefone gera OTP no log do Supabase (sem provedor real)
- [ ] Inserir OTP correto cria sessão
- [ ] OTP errado mostra erro
- [ ] OTP expirado (após 1 minuto) pede reenvio
- [ ] Link "Prefiro receber por e-mail" troca o modo da tela
- [ ] Telefone não cadastrado: mensagem genérica

### 9.3. Onboarding ↔ Auth

- [ ] T1 normaliza WhatsApp pra E.164 antes de salvar
- [ ] T1 valida formato; rejeita números brasileiros inválidos
- [ ] Cadastro cria usuário Supabase com `email` E `phone` populados
- [ ] Welcome screen mostra mensagem correta sobre o magic link enviado
- [ ] Reabrir o portal sem clicar no magic link: cai em `/login` (não destrava direto)

### 9.4. Recuperação admin

- [ ] Procedimento documentado em `src/auth/adminRecovery.md` é executável passo a passo
- [ ] Hugo consegue gerar magic link pelo dashboard Supabase em menos de 1 minuto
- [ ] Atualizar e-mail de um usuário e enviar novo magic link funciona

### 9.5. Cross-device

- [ ] Pedir magic link no celular, abrir no desktop: funciona, sessão fica no desktop
- [ ] Pedir magic link no desktop, abrir no celular: funciona, sessão fica no celular
- [ ] Sessão num device não afeta outro

---

## 10. Critérios de aceite

A entrega só é considerada completa quando:

1. Todos os smoke tests da seção 9.1, 9.3, 9.4 e 9.5 passam em preview
2. Smoke tests 9.2 (SMS) passam em preview com `VITE_AUTH_METHODS=sms,email`
3. Produção Alpha está com `VITE_AUTH_METHODS=email` (única)
4. `cora_subscription` no localStorage **não** é mais usado como gate. Pode continuar existindo como cache, mas remover qualquer `if (localStorage.cora_subscription)` que controla acesso
5. `src/auth/adminRecovery.md` existe e está completo
6. `PORTAL_STATUS.md` atualizado com a entrega
7. Variáveis de ambiente documentadas em `.env.example` (sem valores reais)
8. Email template do Supabase configurado conforme seção 4.3
9. SMTP Resend ativo, e-mail chega com display "Cora", remetente técnico `oi@send.acora.com.br`, Reply-To `oi@acora.com.br`
10. Procedimento de "virar a chave do SMS no futuro" documentado em arquivo separado: `docs/CORA_Auth_Ligar_SMS.md`

---

## 11. O que NÃO fazer

- ❌ Implementar SMS de verdade agora (sem provedor configurado)
- ❌ Mostrar campo de telefone na tela de login em produção Alpha
- ❌ Prometer "em breve" na UI
- ❌ Criar tabelas custom de auth (usar Supabase nativo)
- ❌ Salvar token de sessão em localStorage manualmente (Supabase gerencia)
- ❌ Criar schema novo no repo portal (regra de governance: schema mora no Backoffice)
- ❌ Adicionar gateway de pagamento no fluxo de login (Asaas é tema separado)
- ❌ Fazer rate limit custom (Supabase tem default; ajustar no dashboard se necessário)
- ❌ Permitir login sem e-mail confirmado quando habilitar SMS no futuro (decisão fora do escopo deste briefing)
- ❌ Adicionar "Lembrar de mim" / "Manter conectado" (sessão padrão de 30 dias resolve)

---

## 12. Documentação a gerar

Ao final da implementação:

1. `src/auth/adminRecovery.md` — procedimento manual de recuperação
2. `docs/CORA_Auth_Ligar_SMS.md` — checklist pra virar a chave do SMS no futuro:
   - Criar conta Twilio
   - Comprar número de envio
   - Configurar credenciais no Supabase dashboard
   - Mudar `VITE_AUTH_METHODS=sms,email` em Vercel produção
   - Redeploy
   - Smoke test
3. Atualizar `PORTAL_STATUS.md` com:
   - Estado de auth: "Magic link e-mail ativo. SMS dormente."
   - Variáveis de ambiente novas
   - Procedimento de recuperação resumido
4. Atualizar `.env.example` com:
   ```
   VITE_AUTH_METHODS=email
   # Futuro: sms,email
   ```

---

## 13. Ordem de implementação sugerida

Pra Claude Code não fazer tudo numa branch só:

**Frente A — Schema e infra (1 dia)**
- Confirmar/criar `subscriptions.user_id` (migration no Backoffice se necessário)
- Configurar SMTP Resend no Supabase
- Configurar template de e-mail
- Configurar JWT expiry, redirect URLs

**Frente B — Auth core (2-3 dias)**
- `AuthProvider`, `useAuth`, `ProtectedRoute`
- Substituir gate atual de `cora_subscription`
- Página `/login` (modo e-mail only)
- Página `/login-sent`
- Página `/auth/callback`
- Logout no Perfil

**Frente C — Onboarding integration (1-2 dias)**
- Normalização E.164 no T1
- Helper `src/lib/phone.ts`
- Criação de usuário Supabase no fim do onboarding
- Magic link automático pós-cadastro
- Welcome screen com mensagem atualizada

**Frente D — SMS-ready dormant (1-2 dias)**
- Componentes `OTPInput`, `PhoneInput`
- Lógica de feature flag em `methods.ts`
- UI condicional na tela de login
- Smoke tests em preview com flag ligada

**Frente E — Documentação e cleanup (meio dia)**
- `adminRecovery.md`
- `CORA_Auth_Ligar_SMS.md`
- Atualizar `PORTAL_STATUS.md`
- Atualizar `.env.example`

Cada frente vira uma branch. Squash merge via UI.

---

## 14. Pontos de validação com Hugo durante a implementação

Claude Code deve parar e perguntar antes de:

1. Criar migration de `subscriptions.user_id` (precisa confirmar estado atual do schema)
2. Mudar template de e-mail (Hugo aprova copy final)
3. Remover qualquer código existente do gate atual de `cora_subscription`
4. Tocar em `src/Onboarding.jsx` (Hugo aprova diff)
5. Deploy em produção Alpha (sempre via preview primeiro)

---

## 15. Métrica de sucesso pós-implementação

Depois do deploy em produção Alpha, considerar bem-sucedido se:

- 100% dos 50 assinantes Alpha conseguem logar de novo no segundo device sem suporte do Hugo
- Tempo médio "abriu /login até entrou na Home" < 90 segundos (95º percentil)
- 0 casos de "perdi acesso e não consegui recuperar" sem intervenção do Hugo
- 0 reclamações via WhatsApp sobre "não consigo entrar"
- Hugo precisa intervir manualmente (dashboard Supabase) em menos de 2 casos no Alpha inteiro

---

**Próxima ação:** Hugo revisa este briefing, confirma ou ajusta, e então passa pro Claude Code.

**Pontos abertos pra Hugo decidir antes do start:**

1. Confirma a copy do template de e-mail (seção 4.3)?
2. Confirma todas as copies da seção 8?
3. Confirma a ordem de frentes da seção 13?
4. Algum smoke test faltando ou exagerado na seção 9?
5. Quer adicionar algo à lista de "o que NÃO fazer" (seção 11)?
