# Frente A — Ajustes pós-testes

**Versão:** v1
**Data:** 11/05/2026
**Task ClickUp:** [86e1a8q50](https://app.clickup.com/t/86e1a8q50)
**Branch sugerida:** continuar em `feat/capacity-gate`
**Estimativa:** 1h
**Briefing original:** `docs/CORA_Briefing_FrenteA_CapacityGate.md`

---

## 1. Contexto

A Frente A foi implementada na sessão anterior. Cenários C1, C2, C3, C4, C6 e C7 rodados em Preview (URL `cora-portal-7i5k1hl0l...`). Tudo funcionou tecnicamente.

Duas pendências surgiram nos testes:

1. **Copy precisa ser revisada.** A versão entregue está correta funcionalmente mas seca e com repetição da palavra "lista". Tom mais quente e fluido foi alinhado com Hugo.
2. **UX do redirect pós-fechamento (C6) é frágil.** Quando o usuário tem a página aberta na T2 e o gate fecha, ele clica Confirmar, recebe 409, vê um toast curto e é redirecionado pra tela de lista de espera. O toast desaparece em segundos. Se o usuário se distrair, fica na tela "Pra próxima rodada" sem entender por que chegou ali.

Este briefing endereça os dois pontos.

---

## 2. Mudanças de copy

> Regras de brand voice mantidas: sem travessão, sem rule of three, sem AI vocab. Tom founder-led, honesto sobre o ritmo de produção, sem prometer prazo.

### 2.1 Splash em modo fechado

**Substituir** a copy atual por:

```
As vagas dessa rodada já foram preenchidas.
Estamos ampliando a produção aos poucos.
Deixa seu contato e te avisamos quando abrir mais vagas.
```

**Botão:** `Quero entrar`

### 2.2 Tela de captura da lista de espera — header

**Substituir** o cabeçalho atual por:

```
Estamos ampliando a produção.
Vamos te avisar por email assim que abrir uma vaga.
```

(Sem título separado em destaque. Esse texto é o header inteiro.)

### 2.3 Tela de captura — CTA do form

`Pronto`

### 2.4 Tela de confirmação (pós-submit)

```
Recebemos seu contato.

Assim que uma vaga abrir te avisamos por email, ok?

Enquanto isso, acompanha a gente no Instagram @cora.padaria.

Valeu pela paciência.
```

### 2.5 Email de confirmação (Resend)

**Subject:** `Recebemos seu contato`

**Body (texto + HTML simples):**

```
Oi, [nome].

Recebemos seu contato. Assim que uma vaga abrir te avisamos por email, ok?

Enquanto isso, acompanha a gente no Instagram @cora.padaria.

Valeu pela paciência.

Hugo
Padeiro apaixonado
```

### 2.6 Mensagens de erro do form (sem mudança)

Mantém as do briefing original:
- Nome inválido: `Precisamos do seu nome.`
- Email inválido: `Email inválido.`
- WhatsApp inválido: `Confira o número com DDD.`
- CEP inválido: `CEP inválido.`

---

## 3. Fix UX do C6 — Banner persistente

### 3.1 Problema

No fluxo C6 (race condition), quando o usuário recebe 409 `subscriptions_closed` e é redirecionado pra tela de lista de espera, o toast atual ("As vagas fecharam enquanto você navegava…") dura poucos segundos. Se o usuário não estava olhando ou se distrai, perde o contexto e acha que clicou errado.

### 3.2 Solução

Adicionar um **banner persistente no topo da tela de lista de espera**, exibido apenas quando o usuário chegou ali via redirect (não via Splash modo fechado). O banner não some sozinho — só desaparece quando o usuário envia o form e vai pra tela de confirmação.

**Copy do banner:**

```
As vagas dessa rodada acabaram de fechar. Deixa seu contato pra próxima.
```

**Visual:** padrão visual de aviso suave do design system (fundo `brand-50` ou equivalente, texto em `brand-900`, padding generoso, sem ícone necessário). Não pode parecer erro (não usar vermelho/laranja).

### 3.3 Mecânica

**App.jsx:**
- Hoje o redirect pra `/lista-espera` acontece via setState `route = 'lista-espera'`
- Adicionar segundo state: `waitlistReason` com valores possíveis `'splash' | 'closed-during-flow'`
- Quando POST subscriptions retorna 409 → seta `waitlistReason = 'closed-during-flow'` antes de mudar a rota
- Quando o usuário chega via Splash modo fechado → seta `waitlistReason = 'splash'`
- Passar `waitlistReason` como prop pra `CapacityWaitlist`

**CapacityWaitlist.jsx:**
- Recebe prop `reason: 'splash' | 'closed-during-flow'`
- No render do form (estado `submitted === false`), se `reason === 'closed-during-flow'`, renderiza o banner no topo
- Quando `submitted === true` (tela de confirmação), banner não aparece (já cumpriu propósito)

### 3.4 Toast atual

Pode ser **removido**. O banner persistente cumpre a função. Toast curto + banner é redundante.

Se o Claude Code preferir manter o toast como reforço imediato, pode manter. Mas remover é mais limpo.

---

## 4. Cenários de validação

Re-rodar dois cenários no Preview que será gerado após as mudanças:

### C3-bis — Confirma copy nova no fluxo direto (Splash → lista)

- Fecha o gate via SQL
- Acessa `/?dev=1&reset=true`
- Confere copy do Splash bate com Seção 2.1
- Clica CTA → confere copy do header da captura bate com Seção 2.2
- Preenche → submit → confere copy da confirmação bate com Seção 2.4
- Confere email recebido bate com Seção 2.5

### C6-bis — Confirma banner aparece no redirect

- Reabre o gate
- Acessa portal limpo, vai até T2 sem confirmar
- Fecha o gate via SQL
- Clica Confirmar
- **Confere:** redirect pra lista de espera + **banner persistente no topo** com copy da Seção 3.2
- Banner não desaparece sozinho
- Submete o form → vai pra tela de confirmação → banner sumiu

---

## 5. O que NÃO mudar

- Schema do banco (`app_settings`, `capacity_waitlist`) — está correto
- Endpoints `/api/settings`, `/api/capacity-waitlist`, ajuste no `/api/subscriptions` — estão corretos
- Validações de payload (Seção 7.7 do briefing original) — copy de erro inalterada
- Fluxo de idempotência por email — testado e funcional
- Comportamento de envio do email best-effort — testado e funcional
- Mecânica do gate (flip via SQL Editor) — inalterado

---

## 6. Issue pré-existente registrada (fora desta frente)

Durante os testes, foi observado erro `POST http://localhost:5173/api/lead 404 (Not Found)` no `PreCadastro.jsx:256`. Esse erro **é pré-existente** (anterior à Frente A) e ocorre no ambiente local porque o endpoint `/api/lead` provavelmente apontava pro webhook Make.com em produção e não tem implementação local.

**Não fazer nada nesta sessão.** Apenas registrado pra futuro:
- Criar endpoint stub local OU
- Apontar diretamente pro webhook Make.com OU
- Documentar que PreCadastro só funciona em deploy

Sugestão: virar task ClickUp separada na lista Digital & Portal (901712612053) quando Hugo decidir a abordagem.

---

## 7. Documentação a atualizar

1. **`PORTAL_STATUS.md`**: adicionar nova entrada em "Última sessão de trabalho" com resumo dos ajustes.
2. **Task ClickUp 86e1a8q50**: comentar com resumo da sessão completa (Frente A original + ajustes), fechar.

---

## 8. Prompt pra colar no Claude Code

```
No cora-portal, aplicar ajustes da Frente A conforme
docs/CORA_Briefing_FrenteA_Ajustes.md.

Branch: continuar em feat/capacity-gate.

Ler o briefing completo antes de tocar em qualquer arquivo. Em
particular as Seções 2 (copy), 3 (banner C6) e 4 (cenários de
validação).

Mudanças por arquivo:

1. Splash (componente que renderiza o estado fechado): substituir
   copy pela da Seção 2.1.

2. src/pages/CapacityWaitlist.jsx:
   - Substituir header pela copy da Seção 2.2
   - CTA do form pra "Pronto" (Seção 2.3)
   - Tela de confirmação com copy da Seção 2.4
   - Adicionar prop "reason" com valores 'splash' | 'closed-during-flow'
   - Renderizar banner no topo (Seção 3.2) APENAS quando reason ===
     'closed-during-flow' E submitted === false. Banner some
     naturalmente quando submitted vira true.

3. App.jsx:
   - Adicionar state waitlistReason
   - Quando POST subscriptions retorna 409 com error
     'subscriptions_closed': setar waitlistReason='closed-during-flow'
     antes do redirect
   - Quando vem do Splash modo fechado: setar waitlistReason='splash'
   - Passar como prop pra CapacityWaitlist
   - Toast atual de "As vagas fecharam enquanto você navegava…" pode
     ser removido (banner persistente substitui)

4. api/capacity-waitlist.js: atualizar template do email Resend
   conforme Seção 2.5 (subject + body).

Usar EXATAMENTE as strings de copy fornecidas. Sem travessão. Sem
reescrever pra "soar mais educado". O tom está calibrado pela skill
brand voice da Cora.

Banner visual: padrão de aviso suave do design system. Fundo brand-50
ou equivalente, texto em brand-900, padding generoso. SEM cor de erro
(vermelho/laranja). SEM ícone obrigatório.

Validar pelos cenários C3-bis e C6-bis da Seção 4 após deploy de
preview.

Ao final, atualizar PORTAL_STATUS.md conforme Seção 7 e me avisar
quando terminar.
```

---

## 9. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Claude Code "humaniza demais" a copy nova e adiciona AI vocab | Briefing diz explicitamente "usar EXATAMENTE as strings" |
| Banner visual destoa do resto do app | Usar tokens do design system (brand-50, brand-900) — não inventar cor nova |
| Refactor desnecessário em App.jsx tocando em código não relacionado | Briefing diz "continuar em feat/capacity-gate" e mudanças são aditivas (novo state, não muda lógica existente) |

---

*Briefing · Frente A · Ajustes · 11/05/2026 · Task ClickUp 86e1a8q50*
