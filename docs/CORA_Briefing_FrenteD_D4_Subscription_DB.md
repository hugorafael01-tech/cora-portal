# Briefing — Frente D / D.4: subscription migra do localStorage pro DB (Opcao A)

**Repo:** `cora-portal`
**Task ancora:** 86e1mba7c (Frente D — Subscription no DB)
**Sub-etapa:** D.4. D.1 (schema 0018), D.2 (hooks leitura), D.3 (onboarding escreve no DB) e a correcao de seguranca (revoke, 0019) ja estao no ar.
**Sessao de origem:** 01/jun/2026

---

## Decisao tomada (Opcao A — nao redesenhar)

A D.4 migra a subscription do localStorage pro DB de ponta a ponta: leitura
(gate + estado do app + telas) E escrita (edicao de composicao). NAO e so trocar
a fonte do ProtectedRoute. O `cora_subscription` deixa de ser fonte de verdade.

Por que "Opcao A" (tudo junto, nao so leitura): se a leitura migrasse pro DB mas a
edicao continuasse escrevendo so no localStorage, depois de editar a tela releria do
DB (que nao mudou, porque o cliente nao escreve direto no DB por causa do revoke
0019) e a edicao "sumiria" no reload. Leitura e escrita estao acopladas, entao migram
juntas.

Unica coisa que fica pra um passo posterior trivial: apagar o arquivo
`src/utils/subscription.js` e a ultima referencia morta. A D.4 pode deixar o arquivo
existir sem ser usado, ou apagar no fim se ficar limpo. Decidir no fim, nao e o foco.

Antes de codar, ler:
- `src/App.jsx` (estado `subscription`, handlers, roteamento). Pontos-chave abaixo.
- `src/auth/ProtectedRoute.jsx` (o gate atual).
- `src/auth/AuthProvider.jsx` (sessao + loading).
- `src/hooks/useSubscription.js` e `src/hooks/useProfile.js` (D.2 — leitura do DB).
- `src/utils/subscription.js` (o que vai ser substituido: load/save/clear/reconcile).
- `src/utils/api.js` (`getSubscription`, e onde entra o novo endpoint de edicao).
- `PORTAL_STATUS.md`.

---

## PRIMEIRA TAREFA (ponto de parada — antes de qualquer codigo)

**Mapear, campo a campo, o que cada tela consome do objeto `subscription` hoje.** O
snapshot do localStorage e rico e vem de DUAS tabelas:
- `profiles`: nome, whatsapp, cpf.
- `subscriptions`: status, qty_original/qty_integral (-> `itens`), endereco legado
  (cep/rua/numero/complemento/bairro/cidade/estado), email legado, coverage_unconfirmed.

O `useSubscription` da D.2 leu so um subset (id, status, qty_*, zona_entrega,
endereco...). As telas Home/Assinatura/Perfil e o Layout consomem mais que isso (ex:
saudacao usa nome; Perfil usa endereco/cpf; Assinatura usa itens).

CC deve varrer `Home`, `Assinatura`, `Perfil` e `Layout` (em App.jsx) e listar quais
campos de `subscription` (e `userData`, que tambem sai de loadSubscription) cada uma
le. Entregar esse mapa ANTES de codar. Sem ele, a migracao quebra a saudacao ou o
Perfil em producao.

---

## Estado atual no App.jsx (referencia)

- L23: importa `loadSubscription, saveSubscription, clearSubscription, reconcileSubscription`.
- L33: `clearSubscription()` no `?reset=true` (QA).
- L2093: `const initialSubscription = loadSubscription();` -> init do estado.
- L2094: `const [subscription, setSubscription] = useState(initialSubscription);`
- L2104: `const [userData,setUserData] = useState(initialSubscription||null);`
- L2114: `assinaturaQtds` init de `initialSubscription?.itens`.
- L2204: `reconcileSubscription()` no mount (sincroniza status via GET por id).
- L2339: `saveSubscription(novaSubscription)` no `handleOnboardingComplete`.
- L2359: `saveSubscription(updated)` no `handleAlterarAssinatura` (edicao).
- L1825: `localStorage.removeItem("cora_subscription")` no logout (Perfil.handleSignOut).
- Telas recebem `subscription` como prop (L2387 Assinatura, L2389 Perfil; Home usa userData/derivados).

---

## Escopo D.4

### 1. Fonte de leitura combinada (subscription + profile do DB)
Criar a leitura que devolve o objeto no SHAPE QUE AS TELAS JA ESPERAM (um adaptador),
pra nao reescrever as telas. Combina `useSubscription` + `useProfile` (D.2),
estendendo o select se faltar campo do mapa da primeira tarefa. Decidir entre estender
os hooks da D.2 ou criar um `useSubscriptionView` que compoe os dois. O objeto de saida
deve ter os campos que o mapa apontou (nome, whatsapp, cpf, endereco, email, status,
itens={original,integral}, coverage_unconfirmed, id).

Observacao de shape: `itens` no localStorage e `{original, integral}`. No DB e
`qty_original`/`qty_integral`. O adaptador faz a traducao.

### 2. ProtectedRoute le do DB, com loading e erro tratados
- Espera a sessao (ja faz: `if(loading) return null`).
- Sem sessao: `/login` (preserva `state.from`, como hoje).
- Com sessao: le a subscription do DB. **Enquanto carrega, NAO redireciona** (return
  null / loader) — senao pisca `/interesse` ou tranca assinante real durante o fetch.
- Carregou e tem subscription -> `<Outlet/>`.
- Carregou e NAO tem subscription -> `/interesse` (mantem destino pre-Alpha; nao trocar
  pra /onboarding agora).
- **Erro de leitura do DB NAO vira `/interesse`.** Um blip de rede nao pode bouncar
  assinante real pra waitlist. Mostrar estado de erro/retry (ou manter no lugar e
  tentar de novo), nunca redirecionar por erro.
- O `?dev=1 -> /onboarding`: o fluxo dev hoje manda dev-sem-assinatura pro onboarding.
  Com o gate lendo do DB, avaliar se ainda faz sentido. Manter o comportamento dev
  atual se for barato; se atrapalhar, CC propoe e PARA pra alinhar. Nao remover sem avisar.

### 3. Estado do App vem do DB
- `subscription` (e `userData`) param de inicializar de `loadSubscription()`. Passam a
  vir do hook de leitura combinada.
- `assinaturaQtds` init a partir do `itens` vindo do DB.
- Remove o `reconcileSubscription()` do mount (L2204): o hook ja e a reconciliacao
  continua (le do DB). O bloco do useEffect sai.
- As telas continuam recebendo `subscription` com a mesma forma de antes (graças ao
  adaptador). Idealmente nenhuma tela muda.
- Atencao ao loading: o App nao pode renderizar as telas com `subscription` ainda
  indefinido de um jeito que quebre. Como o gate (ProtectedRoute) ja segura ate
  carregar, as telas so montam com dado pronto — mas conferir que nao ha leitura de
  `subscription.x` antes do gate liberar.

### 4. Endpoint de edicao (escrita no DB via service_role)
A alteracao de composicao (`handleAlterarAssinatura`, L2359) passa a gravar no DB por
um endpoint server-side. **Cliente NAO escreve direto (revoke 0019).**
- Estender o `/api/subscriptions` (ou um `PATCH`/sub-rota) que recebe a nova composicao
  (qty_original/qty_integral) da subscription do usuario logado e atualiza no DB via
  service_role.
- **Recorte (decisao tomada): o endpoint SO persiste a composicao.** Recalcula
  `total_paes`, `qty_total`, `valor_paes` (= total_paes * 99), mantem `valor_frete`=15,
  `valor_mensal` = valor_paes + valor_frete (respeitar a constraint
  `subscriptions_valor_mensal_check` que pegou na D.2/D.3) e o double-write das colunas
  legadas (`itens` jsonb legado + os qty_* novos).
- **NAO** implementar agora a regra de "quando a mudanca vale" (reducao so no proximo
  ciclo vs aumento/troca imediato) nem cobranca proporcional. Isso e fase 2/financeiro
  (Asaas). A composicao muda no DB; o efeito em cobranca fica pra depois.
- Identidade: o endpoint atualiza a subscription do usuario AUTENTICADO (deriva o
  user_id da sessao no servidor; nao confia em id vindo do cliente pra escolher QUEM
  editar). Valida que a subscription pertence ao usuario.
- Depois de gravar, o cliente RELE do DB (invalida/refetch do hook) em vez de confiar
  no payload — fonte unica de verdade. `handleAlterarAssinatura` para de chamar
  `saveSubscription`; passa a chamar o endpoint e disparar o refetch.

### 5. Limpeza do localStorage
- `handleOnboardingComplete` (L2339): para de chamar `saveSubscription`. O onboarding
  ja gravou no DB (D.3); o estado vem do refetch do hook. Conferir que a navegacao pra
  Home apresenta o dado novo (pode exigir refetch apos o POST do onboarding).
- Logout (L1825): o `removeItem("cora_subscription")` vira desnecessario (nao ha mais
  snapshot). Pode remover a linha. `signOut` do Supabase + onAuthStateChange ja limpam
  a sessao; o hook passa a devolver null sem sessao.
- `?reset=true` (L33): o `clearSubscription()` perde sentido. Avaliar remover o bloco
  ou apontar pra um reset relevante (ex: signOut). CC propoe.
- `src/utils/subscription.js`: depois que nada mais importar dele, remover o arquivo
  (ou deixar so se algo legitimo restar). Conferir com grep que nao sobra import.

---

## Pontos de parada obrigatorios (apos o item 8 do template)

9. Mapa de campos por tela ANTES de codar (primeira tarefa). Entregar e esperar.
10. Nao criar/alterar schema. E do cora-backoffice. Faltou coluna? Para e avisa.
11. Endpoint de edicao SO persiste composicao. Sem regra de cobranca/proporcional.
12. Cliente nunca escreve direto em subscriptions (revoke). Edicao so via endpoint service_role.
13. Gate: nao redirecionar enquanto carrega; erro de leitura nao vira /interesse.
14. Endpoint deriva user_id da sessao no servidor; nao confia em id do cliente pra escolher quem editar.
15. Service_role so no servidor, nunca em VITE_.
16. Fluxo dev (?dev -> /onboarding): nao remover sem alinhar.

---

## Validacao (preview Vercel) — 3 estados + edicao

Usuarios: `hugo+dev@acora.com.br` (tem subscription active no DB, seed da D.2). Criar
um sem-assinatura logando outro email pelo magic link.

1. **Deslogado**: raiz -> `/login`. Sem flash estranho.
2. **Logado sem assinatura**: -> `/interesse`. Confirmar que NAO pisca a Home nem
   trava (o gate espera o fetch antes de decidir).
3. **Logado com assinatura** (hugo+dev): entra na Home. Saudacao com nome, Perfil com
   endereco/cpf, Assinatura com a composicao — todos vindos do DB (conferir contra o
   mapa de campos da primeira tarefa: nada quebrado/vazio).
4. **Edicao**: altera a composicao na Assinatura, salva. Confirmar via SQL (Hugo roda)
   que `subscriptions` mudou (qty_*, total_paes, valor_paes, valor_mensal coerentes,
   valor_ok), e que apos F5 a mudanca PERSISTE (le do DB, nao some). Esse e o teste que
   prova a Opcao A: editar e sobreviver ao reload.
5. **Erro de leitura**: (se viavel simular) confirmar que um erro de fetch nao joga
   assinante real pra /interesse.

CC entrega as queries de verificacao + limpeza pro Hugo rodar no SQL Editor (CC nao
roda). Lembrar que o gate `subscriptions_open` esta FECHADO em prod; pro teste de
onboarding no preview pode ser necessario reabrir temporariamente (Hugo decide).

---

## Refs

- D.1 (0018): colunas qty_*/zona/user_id, profiles, RLS select_own.
- D.2: useSubscription/useProfile (leitura por user_id), painel /dev/frente-d.
- D.3: onboarding cria auth+profile+subscription; double-write; constraint valor_mensal.
- 0019 (revoke): cliente nao escreve em subscriptions/profiles; so service_role.
- App.jsx linhas citadas (2093/2204/2339/2359/1825/33).
- Recorte confirmado por Hugo: endpoint de edicao so persiste composicao; regra de
  cobranca/proporcional fica pra fase 2 (Asaas/financeiro).
