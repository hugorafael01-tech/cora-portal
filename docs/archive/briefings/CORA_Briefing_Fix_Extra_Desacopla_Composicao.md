# Briefing — Fix: adicionar extra na cesta nao pode revalidar a composicao

**Repo:** `cora-portal`
**Task:** 86e1neypw
**Tipo:** desacoplamento extra <-> composicao. Toca cliente E endpoint (decidir o lado abaixo).
**Sessao de origem:** 01/jun/2026

---

## Diagnostico (ja feito — nao re-investigar)

Confirmado lendo o codigo e o banco:

- Endpoint POST /api/weekly-orders valida `compositionSum(composition) === sub.total_paes`
  (igualdade estrita) SEMPRE que o POST carrega `composition` nao-null
  (api/weekly-orders/index.js L95-106).
- Cliente reenvia a `composition` existente em TODO POST, inclusive ao adicionar/remover
  extra: `addExtraToCart` chama `postCurrentOrder(next)` sem nextComposition, e
  `postCurrentOrder` cai em `currentWeeklyOrder?.composition ?? null` (App.jsx ~L2259-2298).
- Resultado: quando a composicao da semana esta dessincronizada do `total_paes` atual
  (ex: cliente editou a assinatura de 2 -> 3 paes; o weekly-order da semana ainda carrega
  a composicao antiga somando 2; total_paes agora 3), QUALQUER POST de extra reenvia essa
  composicao e o servidor reprova com 400 `composition_quantity_mismatch`. O extra fica
  refem de uma validacao que nao tem nada a ver com ele.

Confirmado no banco: subscription b6a0614c com total_paes=3, qty_total=3. O bug reproduz
quando a composicao da semana diverge desse total e o cliente tenta adicionar extra.

## Regra de negocio (do Hugo — pra fixar o comportamento correto)

- Composicao da SEMANA: soma sempre o total da assinatura; o cliente troca QUAIS paes,
  nao QUANTOS. A validacao `soma === total_paes` esta correta PARA quando a composicao
  esta sendo alterada. Isso NAO muda.
- EXTRA e independente da composicao/assinatura. Adicionar extra nao tem limite agora e
  NAO pode ser bloqueado pela composicao. (Futuro, fora deste fix: se o volume TOTAL de
  paes passar de um numero, mostrar um AVISO de que a quantidade extra sera validada por
  demanda. E alerta, nao bloqueio. Nao implementar agora.)
- A edicao da assinatura (tamanho do plano) pode ser feita durante a semana; na semana
  seguinte volta ao padrao. Isso ja e regra existente e esta correta. Nao mexer.

## A correcao: DESACOPLAR extra de composicao

Adicionar/remover extra NAO deve mandar nem revalidar a composicao. Duas pontas; fazer
as duas pra ficar robusto:

### Cliente (App.jsx)
- `addExtraToCart` / `removeExtraFromCart`: ao chamar `postCurrentOrder`, NAO reenviar a
  composicao. O POST de extra deve mexer SO em `extras`.
- Concretamente: o POST de uma operacao de extra nao deve incluir `composition` no corpo
  (ou incluir de um jeito que o servidor entenda "nao estou alterando a composicao").
  Hoje `postCurrentOrder` resolve `composition = nextComposition ?? currentWeeklyOrder?.composition ?? null`.
  Numa operacao de extra, o objetivo e: composicao permanece o que ja esta persistido no
  servidor, sem reenvio/revalidacao. Implementar de forma que operacao de extra mande
  apenas extras.
- CUIDADO pra nao regredir: a operacao de ALTERAR composicao da semana (o "Editar cesta"
  -> trocar tipos) DEVE continuar mandando `composition` e DEVE continuar sendo validada
  (`soma === total_paes`). So a operacao de EXTRA e que para de mandar composicao. Nao
  jogar a crianca fora com a agua: distinguir "operacao de composicao" de "operacao de
  extra".

### Endpoint (api/weekly-orders/index.js)
- A validacao `composition_quantity_mismatch` deve rodar SO quando a composicao esta
  sendo de fato alterada neste request, nao em todo POST que por acaso a carrega.
- Como o POST e um upsert do rascunho, decidir o contrato com o cliente: o jeito mais
  limpo e o cliente NAO enviar `composition` quando a operacao e so de extras (campo
  ausente/undefined -> endpoint preserva a composicao ja gravada, sem revalidar). Enviar
  `composition` apenas quando ela esta sendo alterada -> ai sim valida. Garantir que
  "composition ausente" NAO zere/sobrescreva a composicao ja persistida no weekly-order
  (preservar o valor existente no upsert).
- Isso alinha com a regra: a validacao de igualdade continua existindo e correta, mas so
  e exercida quando a composicao muda.

### Ponto de atencao: a composicao stale (separado, NAO neste fix)
Existe um cenario de fundo: o cliente edita o plano (2->3), e a composicao da semana JA
existente continua somando 2, ficando inconsistente com total_paes=3. Este fix
(desacoplar extra) resolve o bloqueio do extra. Mas a sincronizacao entre
"composicao-da-semana-em-curso" e "novo total do plano" e uma questao propria. Decisao do
Hugo: quando o plano muda, a composicao da semana ACOMPANHA o novo total, preenchida com a
escolha do cliente. ISSO NAO E ESTE FIX — registrar como follow-up separado. Aqui o
escopo e so: extra nao revalida composicao. NAO implementar a auto-sincronizacao da
composicao agora; se for barato sinalizar, o CC sinaliza e PARA.

---

## Escopo

**Mexe:** `src/App.jsx` (addExtraToCart/removeExtraFromCart/postCurrentOrder — parar de
reenviar composition em operacao de extra) e `api/weekly-orders/index.js` (so validar
composition quando ela vem no request; ausencia preserva o existente sem revalidar).

**NAO mexe:** a validacao `soma === total_paes` em si (continua, so deixa de rodar quando
composition nao vem). A operacao de alterar composicao da semana (continua validando). A
regra de tamanho do plano. Schema. A D.4.

---

## Pontos de parada (apos item 8 do template)

9. NAO remover a validacao composition_quantity_mismatch; ela continua valida quando a composicao e alterada. So deixa de rodar em operacao de extra (composition ausente).
10. Operacao de alterar composicao da semana DEVE continuar mandando e validando composition. Distinguir operacao de extra de operacao de composicao.
11. "composition ausente" no POST nao pode zerar/sobrescrever a composicao ja gravada (preservar no upsert).
12. NAO implementar a auto-sincronizacao da composicao-da-semana com o novo total do plano (follow-up separado). So desacoplar o extra.
13. Endpoint deriva identidade como ja faz; nao confiar em dado do cliente pra decidir validacao alem do necessario.

---

## Validacao (preview)

Reproduzir o cenario do bug e provar o fix:
1. Assinatura editada pra 3 paes (total_paes=3), composicao da semana possivelmente
   divergente (somando 2, stale). Adicionar um extra (Focaccia) -> deve passar (200), o
   extra entra, SEM 400.
2. Estado oposto: assinatura em 2, adicionar varios extras -> continua funcionando (nao
   regrediu).
3. Alterar a composicao da semana (trocar tipos, ex 1+1 -> 2+0) com a assinatura em 2 ->
   deve validar e passar (soma 2 == total 2).
4. Alterar a composicao da semana pra um total DIFERENTE do plano (se a UI permitir) ->
   deve continuar sendo barrado com composition_quantity_mismatch (a validacao da
   composicao em si nao foi removida).
5. F5 depois de adicionar extra: extra persiste, composicao da semana persiste (nao foi
   zerada pelo POST de extra sem composition).

Sem SQL novo necessario. CC entrega o que precisar pro Hugo rodar. Branch propria, PR
draft, sem push direto no main (protegido).

---

## Refs

- api/weekly-orders/index.js L47-56 (compositionSum), L81-84 (select total_paes),
  L95-106 (validacao).
- App.jsx ~L2259-2298 (postCurrentOrder, addExtraToCart, removeExtraFromCart).
- Banco confirmado: subscription b6a0614c total_paes=3.
- Regra de negocio do Hugo: composicao da semana = troca tipo nao quantidade; extra
  independente, sem limite (aviso futuro, nao bloqueio); plano editavel na semana,
  reseta na seguinte.
