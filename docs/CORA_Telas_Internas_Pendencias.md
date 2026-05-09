# Telas Internas — Feedbacks UX e Pendências

**Versão:** 1.0
**Data:** Maio/2026
**Escopo:** Home, Sua Assinatura, Cardápio, Perfil (telas pós-onboarding)
**Origem:** Feedbacks de 4 UXers (João, Astrid, Nathalia, Thiago) coletados em abril/2026 + decisões da sessão de refactor 05/05/2026.

---

## Como ler este documento

Este é um documento de **transição**. Consolida o que foi decidido e o que ainda está em aberto pras 4 telas internas do portal, depois que o refactor do onboarding (Fases 0-6) fechou em 05/05/2026.

- ✅ **Implementado:** já está no código, em produção (branch `refactor/onboarding-fase-0`).
- ⚠️ **Pendente — decisão tomada:** definimos o que fazer mas não implementamos.
- ❓ **Pendente — em aberto:** feedback recebido, ainda não decidido.

Documentos relacionados:
- `docs/CORA_Briefing_Refactor_Onboarding.md` — briefing do refactor (foco: onboarding)
- `docs/CORA_Briefing_Fase7_Backend.md` — backend (Supabase + Resend + endpoints)
- `CORA_Portal_Adendo_v3_1_Redesign.docx` — redesign v3.1 (pré-feedbacks UXers)

---

## 1. Decisões transversais (afetam todas as 4 telas)

### 1.1 Banner de pagamento pendente ✅ Implementado

- Banner full-width abaixo do header sticky, position sticky com top: 0
- Aparece em **todas as 4 telas** quando `subscription.status === 'pending_payment'`
- Texto fixo: "Recebemos sua assinatura. Em breve enviamos o link de pagamento pelo WhatsApp."
- Estilo: bg-brand-50, border-bottom B[100], texto centrado Montagu Slab 13px B[700]
- Não dismissível
- Some quando status muda pra `active`

### 1.2 Pesos dos pães ✅ Implementado

Apenas Pão Original e Pão Integral migraram de 615g → **700g**. Atualizado em todos os lugares: D.pães, D.entrega, D.assinatura, D.hist (histórico do Perfil).

Multigrãos mantém 615g. Outros SKUs (Focaccia, Brioche, Ciabatta) mantêm pesos próprios.

### 1.3 Saudação sem flexão de gênero ✅ Implementado

Campo de gênero foi removido do cadastro. Welcome usa "Que bom ter você com a gente, [nome]." A Home (no primeiro acesso) deve usar "Olá, [nome]!" — isso já está no código.

### 1.4 Subscription destrava portal sem ?dev=1 ✅ Implementado

A presença de `cora_subscription` no localStorage funciona como credencial de sessão. Pessoa fecha navegador, abre de novo — vai direto pra Home, não pro PreCadastro.

### 1.5 Reset de teste via querystring ✅ Implementado

`?reset=true` limpa localStorage + volta pra PreCadastro. Útil pra testes manuais.

### 1.6 Reconciliação de status com Supabase ⚠️ Pendente — Fase 7

A Home (e demais telas) precisarão chamar `GET /api/subscriptions/{id}` no `useEffect` inicial pra reconciliar status local com servidor. Quando Hugo mudar status pra `active` no Supabase, F5 vai detectar e o banner some.

---

## 2. Home

### 2.1 Implementado ✅

- Banner persistente quando pending_payment
- Bloqueio do NovidadeCard quando pending_payment (Fase 6 estendida — bug encontrado durante testes)
- Pesos atualizados (700g)
- Swap "Personalizar esta semana" **não é bloqueado** quando pending_payment (decisão consciente: swap é dentro da Assinatura, não gera cobrança extra)

### 2.2 Pendências em aberto ❓

#### 2.2.1 Hierarquia da tela (João + Astrid + Nathalia)

Tema importante levantado por 3 dos 4 UXers, ainda **não decidido**:

- **João:** "card de assinatura toma muito espaço. Novidade merece o destaque. Inverter prioridade: novidade em cima, assinatura discreta embaixo. Foto do produto na cesta é redundante (já viu)."
- **Astrid:** implicitamente concorda — disse na T2 do onboarding que falta vender a *ideia* da assinatura.
- **Nathalia:** quer subir o frete grátis (5+ moradores) pra Home como destaque.

**Conflito a resolver:** o que vai primeiro depois da saudação?
- Card de Cesta da Semana (atual)
- NovidadeCard hero (proposta João)
- Frete grátis / convite pra trazer vizinhos (proposta Nathalia)

**Hugo (na sessão original):** "cada um traz um ponto interessante." Sem decisão fechada.

#### 2.2.2 Timeline da entrega confunde (João)

- Hoje: timeline com "letras da semana" pra mostrar próxima entrega
- João: "letras da semana não comunicam"
- Proposta concreta:
  ```
  Próxima entrega: DIA DO MÊS (dia da semana)
  Cesta: produto + quantidade
  Botão: editar
  ```
- Aplicar mesma lógica nas duas telas onde a timeline aparece (Home + Sua Assinatura)

#### 2.2.3 Dinâmica da entrega não está clara (João)

- Faltam infos sobre: horário da entrega, se precisa estar em casa, se a pessoa recebe aviso por WhatsApp antes
- Decisão: onde isso aparece? Microcopy no card de entrega? FAQ? Tooltip?

---

## 3. Sua Assinatura

### 3.1 Implementado ✅

- Banner persistente quando pending_payment
- Pesos atualizados (700g)

### 3.2 Pendências em aberto ❓

#### 3.2.1 Mesma crítica da timeline (João)

Mesmo problema da Home. Aplicar mesma solução.

#### 3.2.2 Frete grátis no lugar errado (João)

- Hoje: oferta de frete grátis (5+ moradores) está dentro da Sua Assinatura
- João: "aqui a pessoa quer gerenciar, não engajar com cupom. Mover pra e-mail marketing"
- Nathalia: queria subir pra Home (oposto)

**Decisão pendente:** mover pra e-mail marketing? Subir pra Home? Manter onde está?

#### 3.2.3 Resto da página (João)

"Tem os elementos certos: histórico, método de pagamento, etc." Sem mudanças necessárias nesta seção da página.

---

## 4. Cardápio

### 4.1 Implementado ✅

- Banner persistente quando pending_payment
- **Bloqueio de extras** (NovidadeCard + ProductCard via prop `lockedReason`) quando pending_payment
- Microcopy fixa: "Disponível após confirmação do primeiro pagamento."
- ProductCard ganhou prop `directQtySelector` (default false; usado só no onboarding)
- Pesos atualizados (700g) — Pão Original e Integral apenas
- Botão "Confirmar" do OrderFooter desabilita quando pending_payment

### 4.2 Pendências em aberto ❓

#### 4.2.1 Aviso de cutoff + cobrança (João)

- Hoje: pode estar em 2 linhas/blocos separados
- João: "uma linha só no topo. 'Adicione sua cesta até [data], cobrança na próxima fatura.'"
- Decisão: combinar avisos em uma linha? Posição (header da tela? abaixo do banner)?

#### 4.2.2 Botão "Quero" não comunica (João)

- Hoje: botão "Quero" abre Modal/card
- João: "não está claro o que acontece. O comportamento é certo, mas o texto não condiz com a ação. Pode ir além e dizer quando será entregue."
- Possíveis labels: "Adicionar à cesta", "Pedir pra esta semana", "Quero pra [dia da entrega]"
- **Atenção:** mudança aqui afeta também o ProductCard. Precisa coordenar com o que já existe no onboarding (lá usa `directQtySelector` e não tem botão "Quero").

#### 4.2.3 Visão consolidada da cesta (Astrid)

- Hoje: extras adicionados aparecem **fora** do módulo "Personalizar Cesta da Semana"
- Astrid: "se eu adicionei uma focaccia ao Cardápio, faz sentido ver a focaccia dentro de Personalizar Cesta também — visão consolidada do que vem na semana"
- Alternativa que ela aceita: sinalizar fora que tem item extra, mas dentro do módulo de edição mostrar tudo junto

#### 4.2.4 Conceito de exclusividade sem usar "Clube"

Hugo disse na sessão: "acho que nunca vou querer chamar de clube. É mais o conceito de exclusividade."

A palavra "Clube" foi descartada como label oficial, mas o **conceito** continua válido. Onde tangibilizar isso? Sugestões pendentes:
- "Esta semana no Cardápio" (sem "Clube")
- "Antecipado pra você" / "Você é a primeira a saber"
- Outras vias

---

## 5. Perfil

### 5.1 Implementado ✅

- Banner persistente quando pending_payment
- Pesos atualizados no histórico (700g)

### 5.2 Pendências em aberto ❓

#### 5.2.1 Tudo exposto de cara (João)

- Hoje: dados pessoais, financeiro, histórico — tudo visível ao mesmo tempo
- João: "não precisa expor tudo logo de cara. Dados pessoais, abre pro lado. Financeiro, abre pro lado. Senão você vai ter um histórico longo. O que o usuário quer ver primeiro?"
- Proposta: colapsar em seções expansíveis (accordion ou navegação interna)
- Decisão: priorização — o que aparece aberto por padrão?

#### 5.2.2 Botão de reset pro localStorage (debug) ⚠️ Pendente

Decisão da sessão: adicionar botão escondido no Perfil pra reset do localStorage durante testes Alpha. Mecanismo: querystring `?reset=true` (já implementado). Falta o botão visível dentro do Perfil — útil pra demonstrações.

Mecanismo proposto: tap múltiplo no logo do Perfil ou seção "Avançado" colapsada. **Não decidido qual abordagem.**

---

## 6. Pendências transversais que ainda não foram alocadas

### 6.1 Modelo de cobrança — fatura mensal (João)

- João questionou cobrança mensal vs semanal. Hugo manteve mensal (decisão fechada).
- Mas João propôs: usar **visão de fatura** pra comunicar custos e descontos do mês com clareza
- Decisão: aplicar quando? Provavelmente afeta tela Sua Assinatura (seção financeiro) e/ou Perfil (histórico)

### 6.2 Login do 2º acesso

Hoje a presença de `cora_subscription` no localStorage destrava o portal. Mas se a pessoa trocar de dispositivo, perde acesso.

Solução futura (fora do refactor atual): OTP por WhatsApp ou magic link via Supabase Auth. **Não decidido.**

### 6.3 Diferenças entre os pães (João — escolha do pão)

- João: "Cardápio precisa explicar pra que serve cada pão. Que corte combina com quê. Hoje a pessoa não sabe o que está comprando."
- Hoje cada produto tem `desc` (descrição/situação) e `sobre` (técnico, accordion). Talvez já cubra isso no onboarding (Pão Original "Vai com azeite, queijo, bruschetta..." — Pão Integral "Torrado pela manhã ou ao lado da salada...").
- Mas no **Cardápio** essa info ainda pode estar enxuta. Validar visualmente quando a Fase 7 fechar.

---

## 7. Próximos passos sugeridos

### Antes de mexer nas telas internas

1. ✅ Fechar Fase 7 (backend) — em andamento
2. Validar end-to-end o onboarding completo com backend real
3. Atualizar `PORTAL_STATUS.md` com estado pós-Fase 7

### Depois disso

A ordem que faz sentido pra atacar as 4 telas internas:

1. **Hierarquia da Home** (item 2.2.1) — decisão estrutural, afeta tudo embaixo
2. **Timeline (Home + Sua Assinatura)** (itens 2.2.2 + 3.2.1) — feedback convergente, solução clara
3. **Cardápio** — labels + visão consolidada (itens 4.2.1, 4.2.2, 4.2.3)
4. **Perfil** — colapsar em seções (item 5.2.1)
5. **Detalhes finos** — frete grátis (3.2.2 + 2.2.x), conceito de exclusividade (4.2.4), dinâmica da entrega (2.2.3)

Cada um vira briefing próprio quando chegar a hora. Padrão aprendido nesta sessão:
- Cruzar feedbacks → decidir prioridades
- Discutir tema por tema com Hugo
- Fechar decisões antes de gerar briefing técnico
- Briefing técnico vira input pro Claude Code

---

## 8. Notas de processo

- Esta sessão (05/05/2026) cobriu Tema 1 (cobrança), Tema 2 (gênero/nome) e o onboarding completo. Os Temas 3, 4 e 5 (telas internas) ficaram em fila.
- Fonte primária dos feedbacks: 4 UXers (João, Astrid, Nathalia, Thiago) testaram em abril/2026.
- João foi o feedback mais detalhado (~50% dos achados). Vale calibrar peso — convergência entre 2-4 pessoas é mais forte que 1 voz, mesmo a mais detalhada.
