# Briefing — Refactor do Onboarding

**Versão:** 1.1
**Data:** Maio/2026
**Escopo:** Apenas o fluxo de onboarding do portal do assinante (`src/Onboarding.jsx`) + estado novo na Home (banner de pagamento pendente).

---

## 1. Contexto

O onboarding atual (`src/Onboarding.jsx` v3.2.7) tem 3 telas (dados+gênero → cesta → revisão) seguidas de uma Welcome com saudação flexionada por gênero. Após teste com 4 UXers (João, Astrid, Nathalia, Thiago) em abril/2026, foram identificados achados convergentes que motivam um refactor parcial.

**Decisões estruturais que orientam este refactor:**

1. **Não coletar dados de cartão no portal.** A cobrança da assinatura é feita pela Asaas via link de pagamento enviado pelo WhatsApp. O portal coleta apenas os dados necessários pra gerar a cobrança Asaas (CPF, nome, e-mail, WhatsApp). Isso elimina obrigações de PCI-DSS e simplifica o onboarding.

2. **O envio do link de pagamento é manual no MVP.** Hugo recebe um e-mail quando uma nova assinatura é criada, acessa a Asaas, gera a cobrança e envia o link pelo WhatsApp. Pode demorar minutos a horas.

3. **Onboarding passa de 3 telas pra 2 telas + Welcome.** A T3 antiga (revisão/pagamento) é eliminada. A Welcome assume o papel de confirmação visual + comunicação do próximo passo.

4. **Gênero sai do cadastro.** Saudações são reformuladas com fórmulas sem flexão.

---

## 2. O que muda em alto nível

- **T1 unificada (Sobre você + Entrega):** ganha CPF, ganha CEP autocomplete via ViaCEP, ganha validação de cobertura (Haversine + whitelist), perde campo de gênero, perde "nome completo".
- **T2 (Sua Assinatura):** perde botão "Quero" intermediário (seletor `(−)0(+)` direto desde o início), ganha total com frete no footer.
- **T3 (Revisão/Pagamento):** **eliminada.**
- **Welcome:** copy reformulada ("Recebemos sua assinatura"), card recap, aviso de link de pagamento via WhatsApp, botão "Ir pro app".
- **Home:** ganha estado "aguardando pagamento" — banner persistente no topo + bloqueio de adição de extras no Cardápio.
- **Notificação por e-mail:** dispara pra `hugo@acora.com.br` quando uma nova assinatura entra.

---

## 3. Estrutura final do fluxo

```
Splash (mantida)
  ↓
T1 — Sobre você (1/2)
  ↓ [Continuar]
T2 — Sua assinatura (2/2)
  ↓ [Confirmar assinatura]
Welcome (status: pending_payment)
  ↓ [Ir pro app]
Home (com banner de aguardando pagamento)
```

**Stepper:** progresso visual mostra `1/2` e `2/2`. Welcome não é numerada (é confirmação, não passo).

**Splash:** mantida como está. Não escopo deste briefing.

---

## 4. T1 — Sobre você

### 4.1 Estrutura visual

```
[ logo cora ]                        1/2 · sobre você
[●○]  (progresso)

Pra começar, conta pra gente quem é você e onde quer receber.

SOBRE VOCÊ
─────────────────────────────────
Como quer ser chamado(a)?
[ ex: Beatriz                     ]

WhatsApp
Para confirmações de entrega e novidades.
[ (21) 99999-9999                 ]

E-mail
Para login e comprovantes.
[ seu@email.com                   ]

CPF
Para gerar sua cobrança.
[ 000.000.000-00                  ]

ENTREGA
─────────────────────────────────
CEP
A gente preenche o resto pra você.
[ 00000-000                       ]

Rua
[ Preenchido pelo CEP             ]  (read-only após CEP válido)

Bairro
[ Preenchido pelo CEP             ]  (read-only após CEP válido)
Cidade · Estado                       (microcopy abaixo do bairro)

Número
[ 123                             ]

Complemento (opcional)
apto, bloco, casa, fundos...
[ apto 502, bloco A               ]

[ Continuar ]   (rodapé fixo, desabilitado até obrigatórios completos)
```

### 4.2 Campos e validações

| Campo | Tipo | Obrigatório | Validação | Máscara |
|---|---|---|---|---|
| Como quer ser chamado(a)? | texto | sim | mínimo 2 caracteres, sem números | — |
| WhatsApp | tel | sim | formato (XX) 9XXXX-XXXX | aplicar |
| E-mail | email | sim | formato válido + DNS opcional | — |
| CPF | texto | sim | algoritmo CPF válido | 000.000.000-00 |
| CEP | texto | sim | 8 dígitos numéricos | 00000-000 |
| Rua | texto | sim (auto) | preenchido por ViaCEP, read-only | — |
| Bairro | texto | sim (auto) | preenchido por ViaCEP, read-only | — |
| Número | texto | sim | numérico ou alfanumérico (ex: 123A) | — |
| Complemento | texto | não | livre | — |

**Validação inline em tempo real** (Thiago): erros aparecem conforme o usuário digita ou ao perder foco do campo. Não esperar clique no botão pra mostrar erro.

**Botão "Continuar":** desabilitado até todos os obrigatórios estarem preenchidos e válidos. Habilitado vira `bg-brand-500`. Estado desabilitado vira `bg-brand-200` com cursor `not-allowed`.

### 4.3 Lógica do CEP

**Serviço:** [ViaCEP](https://viacep.com.br/) — gratuito, API REST simples.

**Trigger:** ao completar 8 dígitos no campo CEP (com ou sem máscara).

**Sequência:**
1. Mostra spinner discreto no campo CEP
2. Chama `https://viacep.com.br/ws/{cep}/json/`
3. Se retorno OK e CEP existe: preenche rua, bairro, cidade·estado (microcopy)
4. Se retorno `{"erro": true}`: mostra erro inline "Não encontramos esse CEP. Confere os números?"
5. Se retorno OK e CEP existe: chama validação de cobertura (próximo bloco)

### 4.4 Validação de cobertura (lista de bairros + whitelist)

**Modelo MVP: validação por lista de bairros atendidos.** Sem cálculo de distância. Match direto entre o `bairro` retornado pelo ViaCEP e a lista de bairros configurada.

**Bairros atendidos (MVP):**

```js
const COVERED_AREAS = {
  'Niterói': ['Icaraí', 'Ingá', 'São Francisco'],
  'Rio de Janeiro': ['Botafogo', 'Humaitá', 'Copacabana']
};
```

**Match case-insensitive e tolerante a acentos.** Normalizar antes de comparar (lowercase + remover diacríticos via `normalize('NFD').replace(/[\u0300-\u036f]/g, '')`). ViaCEP retorna o bairro com acentos e capitalização padrão, mas é seguro normalizar dos dois lados.

**Sequência:**
1. ViaCEP retorna `bairro` e `localidade` (cidade)
2. Normaliza ambos (lowercase + sem diacríticos)
3. Verifica se `localidade` está em `COVERED_AREAS` (chave)
4. Verifica se `bairro` está no array de bairros dessa cidade
5. Se ambos OK → cobertura OK, segue fluxo
6. Se falhar match mas CPF, e-mail OU CEP estão na whitelist → cobertura OK (override)
7. Senão → mostra card de fora de cobertura

**Whitelist (tabela `coverage_whitelist`):**

Override de cobertura pra casos estratégicos (ex: cliente importante no Flamengo). Match por **qualquer um** dos campos: CPF, e-mail ou CEP. Basta um match pra liberar cobertura.

```sql
CREATE TABLE coverage_whitelist (
  id UUID PRIMARY KEY,
  cpf TEXT,
  email TEXT,
  cep TEXT,
  note TEXT,            -- ex: "Cliente estratégico Flamengo"
  created_at TIMESTAMP DEFAULT NOW()
);
```

CRUD via SQL direto no MVP. Backoffice futuro permitirá interface visual.

**Configuração da lista de bairros:**

A lista `COVERED_AREAS` deve ficar em arquivo de configuração (não hardcoded em componente), pra Hugo poder editar e fazer redeploy sem mexer em lógica. Sugestão de localização: `src/config/coverage.js` exportando o objeto.

Quando Hugo abrir um bairro novo, edita esse arquivo e faz commit/push. Vercel rebuilda. Sem necessidade de feature flag, painel admin ou banco de dados pra essa configuração no MVP.

### 4.5 Card de fora de cobertura

**Quando aparece:** após o CEP retornar válido mas fora de cobertura E não estar na whitelist.

**Estado 1 — Antes de avisar:**

```
─── card brand-50 ───────────────────
Ainda não entregamos nessa região.

Quer que a gente avise quando entregarmos por aí?

[ (21) 98765-4321                  ]   (pré-preenchido com WhatsApp da T1)

[ Me avise ]   (botão brand-500)

──────────────────────────────────
Tem alguma situação especial?
Fala com a gente no WhatsApp ↗
─────────────────────────────────
```

**Comportamento:**
- Campos abaixo do CEP (rua, bairro, número, complemento) **não aparecem** enquanto CEP está fora de cobertura
- Botão "Continuar" do rodapé **não aparece** (footer some)
- Link "Fala com a gente no WhatsApp" abre `wa.me/5521999428943?text=Oi,%20vi%20que%20vocês%20ainda%20não%20entregam%20no%20[bairro]%20mas%20queria%20falar%20sobre%20uma%20situação%20especial.`

**Estado 2 — Depois de avisar (clicou em "Me avise"):**

```
─── card brand-50 ───────────────────
Pronto, vamos te avisar.

Quando abrirmos por aí, te chamamos no WhatsApp (21) 98765-4321.

[ Tentar outro CEP ]   (botão outline brand-500)

──────────────────────────────────
Tem alguma situação especial?
Fala com a gente no WhatsApp ↗
─────────────────────────────────
```

**Comportamento:**
- Salva registro em `coverage_waitlist` (cpf, nome, whatsapp, email, cep, created_at)
- Botão "Tentar outro CEP" limpa o campo CEP e volta ao estado default da T1
- Link WhatsApp continua disponível

### 4.6 Notificação ao Hugo

**Não dispara nada na T1.** Notificação só sai após confirmação na T2.

---

## 5. T2 — Sua assinatura

### 5.1 Estrutura visual

```
[ logo cora ]                        2/2 · sua assinatura
[●●]  (progresso)

SUA ASSINATURA  (League Gothic, 30px, brand-500)

Toda quinta, pão fresco na sua porta. Escolha entre 1 e 3 pães e altere quando quiser.

─── card produto (warm-50, neutro) ──
[ foto ]  Pão Original  700g
          Pão de toda mesa. Vai com azeite, queijo, bruschetta de tomate ou o que você abrir na cozinha.
          [ Sobre este pão ⌄ ]
                                  [ − ] 0 [ + ]
─────────────────────────────────────

─── card produto (brand-50 quando qty>0, brand-500 border) ──
[ foto ]  Pão Integral  700g
          Sabor de grão inteiro, miolo leve. Torrado pela manhã ou ao lado da salada no almoço.
          [ Sobre este pão ⌄ ]
                                  [ − ] 1 [ + ]
─────────────────────────────────────

[ rodapé ]
1 pão por semana
R$ 99/mês · Frete R$ 15
Total R$ 114/mês                  [ Continuar ]
```

### 5.2 Cards de produto

**Estados visuais:**

- **Neutro (qty = 0):** `bg-warm-50`, border `warm-200`
- **Selecionado (qty > 0):** `bg-brand-50`, border `brand-500` (1.5px)

**Seletor de quantidade:**

- Sempre visível desde o início (sem botão "Quero" intermediário)
- Estado inicial: `(−) 0 (+)` com botão `−` desabilitado (opacity 0.35, cursor not-allowed)
- Ao clicar `+`: incrementa, card muda pra estado selecionado, `−` habilita
- Ao clicar `−` com qty=1: decrementa pra 0, card volta ao estado neutro, `−` desabilita

**Limite global:** soma das quantidades de todos os cards não pode exceder 3.

- Se total = 3: botões `+` de todos os cards (inclusive os com qty=0) ficam desabilitados
- Mostrar tooltip discreto ou microcopy ao tentar exceder: "Máximo 3 pães por semana."

### 5.3 Footer dinâmico

**Estrutura (lado esquerdo):**
- Linha 1: `{N} pão(ães) por semana` — singular se 1, plural se 2+
- Linha 2: `R$ {N×99}/mês · Frete R$ 15` — secundário, warm-600
- Linha 3 (negrito): `Total R$ {N×99+15}/mês` — brand-700

**Botão "Continuar":**
- Desabilitado quando total = 0 pães
- Habilitado quando total ≥ 1 pão

### 5.4 Produtos disponíveis na T2

Apenas **Pão Original** e **Pão Integral**. Outros produtos (Multigrãos, Focaccia, Brioche, Ciabatta) **não aparecem** na T2 — ficam no Cardápio (extras), fora do escopo deste briefing.

**Dados dos produtos:**

```js
const onboardingProducts = [
  {
    id: 'original',
    nome: 'Pão Original',
    peso: '700g',
    img: '/images/_original.jpg',
    desc: 'Pão de toda mesa. Vai com azeite, queijo, bruschetta de tomate ou o que você abrir na cozinha.',
    sobre: 'Blend de farinha branca italiana e integral brasileira. Levain da Cora, água, sal. Hidratação 70%.',
    preco_assinatura: 99
  },
  {
    id: 'integral',
    nome: 'Pão Integral',
    peso: '700g',
    img: '/images/_integral.jpg',
    desc: 'Sabor de grão inteiro, miolo leve. Torrado pela manhã ou ao lado da salada no almoço.',
    sobre: '100% integral em blend de farinha brasileira e italiana. Levain da Cora, água, sal, azeite. Hidratação 75%.',
    preco_assinatura: 99
  }
];
```

**Schema:** dois campos textuais distintos.
- `desc` → texto curto exibido no card (descrição/situação de uso)
- `sobre` → texto técnico exibido no accordion "Sobre este pão"

**Accordion "Sobre este pão":**

Cada card de produto tem um accordion expansível com label fixo "Sobre este pão." Ao clicar, expande mostrando o conteúdo de `sobre` (composição, hidratação, etc.). Comportamento consistente com o ProductCard usado no Cardápio (que já tem essa lógica via clique na foto).

**Importante:** o ProductCard hoje aciona o accordion via clique na foto. Manter esse comportamento na T2 do onboarding também.

### 5.5 Componente compartilhado

`ProductCard` em `src/components/ProductCard.jsx` continua sendo o componente base, mas precisa ganhar suporte ao modo "seletor direto sem botão Quero". Adicionar prop `directQtySelector: boolean`. Default `false` (mantém comportamento atual no Cardápio). Onboarding passa `true`.

**Atenção:** tipografia do nome do produto continua **Montagu Slab** (não League Gothic). Regra firme do design system.

### 5.6 Botão "Continuar" da T2

**Texto:** "Continuar"
**Ação:** valida estado, salva no contexto/state global do onboarding e navega pra Welcome.

**Importante:** este botão **não é "Confirmar assinatura"** — a confirmação acontece após a Welcome. Mas, na prática, no MVP a confirmação efetiva (criação do registro `pending_subscription` no banco + dispara e-mail pro Hugo) acontece **ao chegar na Welcome**, não no clique deste botão.

Sequência ao clicar "Continuar":
1. Cria registro `pending_subscription` no banco com todos os dados (T1 + T2)
2. Dispara e-mail pro `hugo@acora.com.br` (assíncrono, não bloqueia)
3. Navega pra Welcome com os dados

Se a criação do registro falhar: mostra erro genérico "Algo deu errado, tenta de novo em alguns segundos." e mantém na T2.

---

## 6. Welcome (status: pending_payment)

### 6.1 Estrutura visual

```
[ logo cora ]                        (sem stepper)

         ⓿  (check em círculo brand-50, ícone azul)

QUE BOM TER VOCÊ COM A GENTE, BEATRIZ.   (League Gothic, brand-500, 26px)

Recebemos sua assinatura.            (Montagu, 15px, warm-900)
Toda quinta, a gente se vê.

─── card recap (white border warm-200) ───
SUA ASSINATURA                       (header bg-warm-50)
[ foto ]  1× Pão Original (700g)
          Total R$ 114/mês · Frete incluído
─── divider ─────────────────────────
Primeira entrega          Quinta, 7 de maio
─────────────────────────────────────

─── card brand-50 ───────────────────
Em breve, você recebe no WhatsApp (21) 98765-4321 a sua proposta e o link pra fazer o primeiro pagamento.
─────────────────────────────────────

[ Ir pro app ]   (botão brand-500, rodapé)
```

### 6.2 Lógica da data da primeira entrega

**Regra:** primeira entrega = próxima quinta-feira **após** a data de corte vigente.

**Data de corte:** terça-feira 12h da semana de entrega.

**Casos:**
- Pessoa assina segunda 10h → corte é na próxima terça → primeira entrega é a quinta dessa mesma semana
- Pessoa assina terça 11h → ainda dentro do corte → primeira entrega é a quinta dessa semana
- Pessoa assina terça 13h → fora do corte → primeira entrega é a quinta da semana seguinte
- Pessoa assina quinta, sexta, sábado, domingo → primeira entrega é a quinta da semana seguinte

**Exibição:** "Quinta, 7 de maio" — formato `[Dia da semana], [DD] de [mês]`. Sem ano.

**Importante:** essa lógica de corte **não considera ainda** se o pagamento já foi feito. No MVP, mostramos a data calculada a partir do timestamp da assinatura. Se o pagamento atrasar e a entrega for perdida, Hugo gerencia manualmente via WhatsApp.

### 6.3 Recap de produtos

**Quando 1 produto:** mostrar "1× Pão Original" ou "1× Pão Integral".
**Quando 2+ produtos diferentes:** mostrar "1× Pão Original + 1× Pão Integral" (separados por +).
**Quando 2 ou 3 do mesmo:** "2× Pão Original".

**Foto:** se um único tipo, usa a foto desse tipo. Se misto, usa a foto do primeiro produto da composição (ou foto genérica).

### 6.4 Botão "Ir pro app"

**Texto:** "Ir pro app"
**Ação:** navega pra `/` (Home) com flag `isFirstAccess: true` no estado.

---

## 7. Home — estado "aguardando pagamento"

**Escopo neste briefing:** apenas o **banner persistente** no topo da Home + bloqueio de adição de extras no Cardápio. **Não mexer** na arquitetura geral da Home (cards, hierarquia, etc.) — isso é tema separado.

### 7.1 Banner persistente

**Quando aparece:** assinatura está em status `pending_payment` (ainda não houve confirmação de pagamento Asaas).

**Estrutura:**

```
─── banner brand-50, full-width, top ───
Recebemos sua assinatura. Em breve enviamos o link de pagamento pelo WhatsApp.
─────────────────────────────────────────
```

**Comportamento:**
- Persistente: aparece em **todas as 4 telas** (Home, Assinatura, Cardápio, Perfil) até que status mude pra `active`
- Não é dismissível
- Texto centralizado, tipografia Montagu, 13-14px
- Fundo `bg-brand-50`, texto `text-brand-700`
- Sem ícones decorativos

### 7.2 Bloqueio de extras no Cardápio

**Quando ativa:** assinatura está em status `pending_payment`.

**Comportamento:**
- Cards de produtos extras no Cardápio mostram normalmente
- **Botão "Quero" / seletor de quantidade fica desabilitado**
- Microcopy abaixo de cada card desabilitado: "Disponível após confirmação do primeiro pagamento."
- Ao tentar interagir: nada acontece (desabilitado de fato, sem alert)

**Quando libera:** ao status virar `active`, todos os cards voltam ao comportamento normal.

---

## 8. Notificação por e-mail pro Hugo

### 8.1 Trigger

Sempre que um registro `pending_subscription` é criado no banco (passo 5.6 acima).

### 8.2 Destinatário

`hugo@acora.com.br`

### 8.3 Conteúdo

**Assunto:** `[Cora] Nova assinatura — {nome do assinante}`

**Corpo (texto plano):**

```
Nova assinatura recebida.

Assinante: {nome}
WhatsApp: {whatsapp}
E-mail: {email}
CPF: {cpf}

Endereço:
{rua}, {numero}
{complemento, se houver}
{bairro} — {cidade}/{estado}
{cep}

Assinatura:
{N pão(ães) por semana}
{detalhamento dos produtos}
Total mensal: R$ {valor}

Status: aguardando criação de cobrança no Asaas.

Acessar Asaas: https://www.asaas.com/

---
Esta mensagem foi gerada automaticamente pelo portal Cora.
```

### 8.4 Implementação

Provedor a ser proposto pelo Claude Code antes de implementar (ver seção 11). Configurar em variáveis de ambiente, padrão genérico:

```
EMAIL_PROVIDER={a definir}
EMAIL_API_KEY=...
EMAIL_FROM=portal@acora.com.br
EMAIL_TO=hugo@acora.com.br
```

**Erro silencioso:** se o e-mail falhar, **não bloquear o fluxo do usuário**. Logar erro pra debug e seguir com a Welcome normalmente. Hugo descobrirá pela ausência de e-mail e pode consultar o banco direto.

---

## 9. Estados e schema de dados

### 9.1 Tabela `subscriptions`

Adicionar (ou criar se ainda não existir) coluna `status` com enum:

- `pending_payment` — assinatura criada, aguardando primeira cobrança Asaas confirmada
- `active` — pagamento confirmado, assinatura ativa
- `paused` — assinatura pausada (gerenciada via WhatsApp por enquanto)
- `cancelled` — cancelada

**Default ao criar:** `pending_payment`.

### 9.2 Tabela `coverage_waitlist` (nova)

```sql
CREATE TABLE coverage_waitlist (
  id UUID PRIMARY KEY,
  cpf TEXT,
  nome TEXT,
  whatsapp TEXT NOT NULL,
  email TEXT,
  cep TEXT NOT NULL,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 9.3 Tabela `coverage_whitelist` (nova)

```sql
CREATE TABLE coverage_whitelist (
  id UUID PRIMARY KEY,
  cpf TEXT,
  email TEXT,
  cep TEXT,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

CRUD via SQL direto no MVP. Backoffice futuro.

---

## 10. Componentes novos / alterados

### Novos
- `CEPField.jsx` — input de CEP com máscara, debounce, integração ViaCEP, estados de loading/erro
- `CoverageBlocker.jsx` — card de fora de cobertura (estados antes/depois de avisar)
- `PendingPaymentBanner.jsx` — banner persistente da Home

### Alterados
- `Onboarding.jsx` — refactor completo da estrutura de telas
- `ProductCard.jsx` — adicionar prop `directQtySelector`
- `App.jsx` ou layout principal — montar banner de pendente em todas as telas quando status = `pending_payment`
- Cardápio — adicionar lógica de bloqueio de extras quando status = `pending_payment`

### Removidos
- Campo de gênero e lógica de saudação flexionada
- Botão "Quero" intermediário no contexto do onboarding (no Cardápio continua existindo)
- T3 do onboarding (revisão/pagamento)

---

## 11. Bibliotecas e serviços externos

| Item | Uso | Custo |
|---|---|---|
| ViaCEP | autocomplete CEP | gratuito |
| E-mail transacional | notificação pra Hugo ao criar assinatura | a definir (Claude Code propõe opções) |

**E-mail transacional:** Claude Code deve propor 2-3 alternativas (ex: Resend, SendGrid, Postmark, Mailgun) com prós/contras antes de implementar. Critérios: facilidade de setup, plano gratuito decente, qualidade de deliverability, suporte a domínio próprio (acora.com.br). Hugo decide qual contratar.

**Não usar:** serviços de geocoding ou cálculo de distância. A validação de cobertura é por lista de bairros (ver seção 4.4), não por raio Haversine.

**Recomendação:** começar com Nominatim. Se rate-limit incomodar, migrar pra Google Geocoding (US$5 por mil requests, 200 grátis/dia).

---

## 12. Pendências fora de escopo

- **Termos de uso e Política de Privacidade** — texto + página dedicada. Hugo + Mariane redigem.
- **Geração de proposta/pré-fatura em PDF/imagem** — Hugo gera manualmente nos primeiros assinantes (Canva ou similar). Automatização posterior.
- **Integração Asaas direta no portal** — Phase 2 futura. Quando estabilizado, T2 dispara criação automática da subscription Asaas e envio do link de pagamento.
- **Backoffice de gestão da whitelist e waitlist** — admin.acora.com.br futuro.
- **Login do 2º acesso (após primeiro pagamento)** — OTP por WhatsApp ou magic link. Decisão pendente.
- **Estado da Home, hierarquia, novidade vs assinatura** — tema 3 da revisão dos feedbacks UX.

---

## 13. O que NÃO mexer

- Splash (mantém como está)
- Home além do banner (não mexer em hierarquia, cards, etc.)
- Tela Assinatura (não mexer)
- Tela Cardápio além do bloqueio condicional (não mexer em layout, copy, etc.)
- Tela Perfil (não mexer)
- Pré-cadastro `/interesse` (não mexer)
- Componente `ProductCard.jsx` em outros contextos além do que está descrito aqui

---

## 14. Critérios de aceitação

Considerar o refactor completo quando:

1. Onboarding tem 2 telas + Welcome, sem T3
2. T1 inclui CPF e CEP autocomplete funcionando
3. Validação de cobertura por lista de bairros bloqueia CEP fora de zona com card de waitlist
4. Whitelist por CPF, e-mail ou CEP libera cobertura quando configurada
5. T2 não tem mais botão "Quero" intermediário, tem total com frete no footer
6. Welcome mostra recap, data da primeira entrega calculada e aviso de WhatsApp
7. Botão "Ir pro app" leva pra Home
8. Home, Assinatura, Cardápio e Perfil mostram banner persistente quando status = `pending_payment`
9. Cardápio bloqueia adição de extras quando status = `pending_payment`
10. E-mail transacional dispara pra `hugo@acora.com.br` ao criar assinatura
11. `PORTAL_STATUS.md` atualizado com a nova versão
12. Nenhum dado de cartão é coletado em ponto algum do portal
13. Campo de gênero foi removido de todo o onboarding
14. Saudação no Welcome usa "Que bom ter você com a gente, [nome]" sem flexão
15. Pesos dos pães atualizados de 615g pra 700g

---

## 15. Anexos

### 15.1 Copy completa por tela

**T1 — Sobre você**
- Stepper: `1/2 · sobre você`
- Intro: `Pra começar, conta pra gente quem é você e onde quer receber.`
- Section title 1: `SOBRE VOCÊ`
- Label nome: `Como quer ser chamado(a)?`
- Placeholder nome: `ex: Beatriz`
- Label WhatsApp: `WhatsApp`
- Helper WhatsApp: `Para confirmações de entrega e novidades.`
- Placeholder WhatsApp: `(21) 99999-9999`
- Label e-mail: `E-mail`
- Helper e-mail: `Para login e comprovantes.`
- Placeholder e-mail: `seu@email.com`
- Label CPF: `CPF`
- Helper CPF: `Para gerar sua cobrança.`
- Placeholder CPF: `000.000.000-00`
- Section title 2: `ENTREGA`
- Label CEP: `CEP`
- Helper CEP: `A gente preenche o resto pra você.`
- Placeholder CEP: `00000-000`
- Label rua: `Rua`
- Label bairro: `Bairro`
- Label número: `Número`
- Placeholder número: `123`
- Label complemento: `Complemento (opcional)`
- Helper complemento: `apto, bloco, casa, fundos...`
- Placeholder complemento: `apto 502, bloco A`
- Botão: `Continuar`

**Card fora de cobertura — Estado 1:**
- Título: `Ainda não entregamos nessa região.`
- Texto: `Quer que a gente avise quando entregarmos por aí?`
- Placeholder campo: pré-preenchido com WhatsApp
- Botão primário: `Me avise`
- Link inferior: `Tem alguma situação especial? Fala com a gente no WhatsApp`

**Card fora de cobertura — Estado 2:**
- Título: `Pronto, vamos te avisar.`
- Texto: `Quando abrirmos por aí, te chamamos no WhatsApp [número].`
- Botão secundário (outline): `Tentar outro CEP`
- Link inferior: igual ao Estado 1

**T2 — Sua assinatura**
- Stepper: `2/2 · sua assinatura`
- Título: `SUA ASSINATURA`
- Subtítulo: `Toda quinta, pão fresco na sua porta. Escolha entre 1 e 3 pães e altere quando quiser.`
- Footer linha 1 (singular): `1 pão por semana`
- Footer linha 1 (plural): `{N} pães por semana`
- Footer linha 2: `R$ {N×99}/mês · Frete R$ 15`
- Footer linha 3: `Total R$ {N×99+15}/mês`
- Botão: `Continuar`
- Microcopy ao tentar exceder 3: `Máximo 3 pães por semana.`

**Welcome**
- Saudação: `QUE BOM TER VOCÊ COM A GENTE, {nome}.`
- Body: `Recebemos sua assinatura.\nToda quinta, a gente se vê.`
- Card header: `SUA ASSINATURA`
- Card produto: `{N}× {produto} ({peso})`
- Card detalhe: `Total R$ {valor}/mês · Frete incluído`
- Card divider label: `Primeira entrega`
- Card divider data: `{Dia da semana}, {DD} de {mês}`
- Aviso WhatsApp: `Em breve, você recebe no WhatsApp {número} a sua proposta e o link pra fazer o primeiro pagamento.`
- Botão: `Ir pro app`

**Banner pendente (Home + 4 telas)**
- Texto: `Recebemos sua assinatura. Em breve enviamos o link de pagamento pelo WhatsApp.`

**Cardápio bloqueado (extras desabilitados)**
- Microcopy por card: `Disponível após confirmação do primeiro pagamento.`

### 15.2 Tom de voz — princípios aplicados

- Não usar travessão (—) em copy de marca
- Não usar emojis ou ícones decorativos
- Não usar tríplices ("trocar, pausar, cancelar" é exceção justificada — três ações de gestão)
- Manter "a gente" em vez de "nós"
- Saudações sem flexão de gênero
- Textos curtos, diretos, sem retórica vazia
- Tipografia: League Gothic só para títulos/section headers; Montagu Slab para nomes de produtos e corpo de texto

### 15.3 Validações futuras para o Hugo

Após este refactor entrar em produção, testar:

1. Fluxo completo com CEP de cobertura (ex: Icaraí, Niterói)
2. Fluxo com CEP fora de cobertura (ex: Centro de São Paulo) — confirmar captura na waitlist
3. Fluxo com CEP fora de cobertura mas CPF na whitelist — confirmar override
4. Fluxo com 1, 2, 3 pães na T2 — confirmar cálculo de total
5. Recebimento do e-mail transacional
6. Banner persistente em todas as 4 telas
7. Bloqueio de extras no Cardápio
8. Cálculo correto da data da primeira entrega em cada janela de corte
