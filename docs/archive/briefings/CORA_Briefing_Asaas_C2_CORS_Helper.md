# Briefing — Asaas Perna 3 / C2 (parte 1): helper de CORS no cora-portal

**Repo:** `cora-portal`
**Task:** 86e1pwnhv (C2). Esta e a PARTE 1 (fix de CORS no portal). A parte 2 (UI/acao de
vincular no backoffice) so comeca DEPOIS desta funcionar.
**Tipo:** infra de API (helper de CORS) + aplicacao no endpoint /api/asaas/vincular.
**Sessao de origem:** 03/jun/2026

---

## Problema (confirmado pelo CC em 03/jun)

O backoffice (admin.acora.com.br) precisa chamar POST /api/asaas/vincular (app.acora.com.br)
do navegador. Sao dominios diferentes -> cross-origin. Hoje o endpoint:
- `OPTIONS /api/asaas/vincular` -> 405 (nao trata o preflight), sem headers CORS.
- `POST` -> 401 sem `Access-Control-Allow-Origin`.

Resultado: o navegador bloqueia a chamada do backoffice antes da resposta chegar. Por curl
funciona (curl nao aplica CORS); pelo navegador, nao.

## Entendimento de CORS (pra implementar certo, nao por tentativa)

Duas coisas distintas a resolver:

1. **Preflight OPTIONS.** Antes de um POST cross-origin que carrega header `Authorization`, o
   navegador manda automaticamente um `OPTIONS` perguntando se o servidor aceita aquele metodo
   e aqueles headers daquela origem. O endpoint precisa responder o OPTIONS com:
   - status 204 (no content)
   - `Access-Control-Allow-Origin: https://admin.acora.com.br`
   - `Access-Control-Allow-Methods: POST, OPTIONS`
   - `Access-Control-Allow-Headers: Authorization, Content-Type`
   - (opcional) `Access-Control-Max-Age` pra cachear o preflight e reduzir repeticao.

2. **Resposta do POST real.** A resposta do POST (200/4xx) tambem precisa carregar
   `Access-Control-Allow-Origin: https://admin.acora.com.br`, senao o navegador nao deixa o
   backoffice LER a resposta (mesmo que o POST tenha executado). Ou seja: TODAS as respostas do
   endpoint (sucesso e erro) precisam do header de origem.

## SEGURANCA (inegociavel)

- `Access-Control-Allow-Origin` deve ser o dominio ESPECIFICO `https://admin.acora.com.br`.
  NUNCA `*`. Motivos: (a) o endpoint e autenticado (manda Bearer JWT); o navegador nem permite
  wildcard com credenciais; (b) wildcard deixaria qualquer site na internet chamar o endpoint.
- Como o helper sera reutilizavel e pode haver mais de uma origem valida no futuro (ex: uma URL
  de preview do backoffice, ou um dominio novo), o helper deve trabalhar com uma ALLOWLIST de
  origens (lista fixa no codigo), e refletir no header APENAS a origem do request SE ela estiver
  na allowlist. Nunca refletir origem arbitraria (refletir o Origin sem checar = na pratica um
  wildcard disfarcado, furo de seguranca). Hoje a allowlist tem so https://admin.acora.com.br;
  estruturar pra adicionar mais sem reescrever.

## TAREFA 0 (investigacao, antes de codar)

Verificar no cora-portal:
1. Ja existe uma pasta de utilitarios compartilhados de API? (ex: `api/_lib/`, `src/lib/`,
   onde vive o supabase-admin.js). Onde colocar o helper pra ser importavel por qualquer
   endpoint em `api/`.
2. Como os endpoints existentes setam headers de resposta hoje (res.setHeader? res.status().
   json()?). O helper tem que encaixar no mesmo estilo (Vercel Functions, req/res do Node).
3. Confirmar se ha OUTROS endpoints que o backoffice ja chama ou vai chamar em breve (pra saber
   se o helper deve ja ser aplicado em mais de um lugar agora, ou so no /vincular). No minimo,
   aplicar no /vincular nesta tarefa.

CC mostra o achado (onde vai o helper, como aplica) antes de escrever.

## Escopo

### 1. Helper de CORS reutilizavel
Uma funcao utilitaria (ex: `applyCors(req, res)` ou `withCors(handler)`) que:
- Tem a allowlist de origens (hoje: `["https://admin.acora.com.br"]`).
- Le o `Origin` do request; se estiver na allowlist, seta `Access-Control-Allow-Origin` com
  ESSA origem (echo seguro, so de origem permitida), mais os headers de Methods/Headers.
- Trata o preflight: se `req.method === "OPTIONS"`, responde 204 com os headers e encerra
  (retorna um sinal pro handler saber que ja respondeu, ou o wrapper cuida disso).
- E aplicavel a qualquer endpoint: ou como funcao chamada no inicio do handler, ou como wrapper
  `export default withCors(handler)`. CC escolhe o padrao mais limpo pro repo, desde que seja
  reutilizavel e nao copie-cole headers em cada endpoint.
- NAO afrouxa nada alem do necessario: so os metodos/headers que o backoffice usa (POST,
  OPTIONS / Authorization, Content-Type).

### 2. Aplicar no /api/asaas/vincular
- O endpoint passa a tratar OPTIONS (via helper) e a incluir o header de origem em TODAS as
  respostas (200, 401, 403, 404, 409, 400, 500). Como o helper seta o header cedo (antes do
  dispatch), todas as respostas herdam.
- NAO mudar a logica de autenticacao/autorizacao/validacao que ja foi revisada e validada
  (Peca A). So adicionar a camada de CORS por cima. O 401/403/etc continuam iguais, so passam a
  carregar o header de origem.

## Pontos de parada obrigatorios (apos item 8 do template)

9. Tarefa 0 primeiro: onde vive o helper, como os endpoints setam header hoje, e se aplica em
   mais de um endpoint agora. Mostrar antes de codar.
10. Allowlist de origens; NUNCA wildcard `*`; NUNCA refletir origem fora da allowlist. So
    https://admin.acora.com.br por ora.
11. So liberar os metodos/headers necessarios (POST, OPTIONS / Authorization, Content-Type).
    Nao abrir mais que isso.
12. NAO alterar a logica ja validada do /vincular (auth, admin check, validacao, 409, etc). So
    adicionar CORS por cima. Todas as respostas (incl. erros) carregam o header de origem.
13. Preflight OPTIONS -> 204 com os headers, encerra sem cair na logica do POST.
14. Esta tarefa e SO o CORS no portal. NAO construir a UI/acao de vincular no backoffice (parte
    2, outro repo, depois).

## Validacao

Reproduzir o que o CC ja testou (que deu o bloqueio) e provar que agora passa:
1. `OPTIONS /api/asaas/vincular` com Origin https://admin.acora.com.br -> 204 com
   Access-Control-Allow-Origin: https://admin.acora.com.br + Allow-Methods/Headers.
   (curl -i -X OPTIONS ... -H "Origin: https://admin.acora.com.br")
2. `POST` valido (com Bearer admin) e Origin do backoffice -> resposta carrega o header de
   origem. (pode reusar um dos casos da validacao da Peca A; so conferir o header CORS na
   resposta, alem do 200/erro esperado.)
3. `OPTIONS`/`POST` com uma Origin NAO permitida (ex https://exemplo.com) -> NAO recebe o
   Access-Control-Allow-Origin daquela origem (a allowlist nao reflete origem estranha).
4. Confirmar que a logica do endpoint nao regrediu: um caso 401 (token invalido) e um 200
   (vinculo, com cleanup) continuam funcionando como na Peca A, agora com o header CORS junto.

CC entrega os comandos. Lembrar: o /vincular escreve em subscriptions; se exercitar o 200 na
validacao, usar a Hugo Dev e restaurar (asaas_customer_id = null) depois. Banco compartilhado.

Branch propria, PR draft, sem push direto no main (protegido).

---

## Refs

- Endpoint alvo: api/asaas/vincular/index.js (Peca A, ja no ar e validado — NAO mexer na
  logica, so CORS por cima).
- Padrao de Function: api/subscriptions/index.js. supabase-admin.js em src/lib/ (referencia de
  onde utilitarios vivem hoje).
- Origem a permitir: https://admin.acora.com.br (backoffice). app.acora.com.br e o proprio
  portal (mesma origem, nao precisa de CORS pra chamadas internas do portal).
- Parte 2 (NAO aqui): UI/acao de vincular no cora-backoffice (modal de busca + POST com Bearer
  + tratamento 200/409/404/400/401), task 86e1pwnhv.
