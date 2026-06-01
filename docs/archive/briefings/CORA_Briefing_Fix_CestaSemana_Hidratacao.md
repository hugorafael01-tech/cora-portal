# Briefing — Fix: composicao da cesta da semana nao persiste no F5

**Repo:** `cora-portal`
**Task:** 86e1na332
**Tipo:** bug de cliente (hidratacao de estado). NAO toca backend, NAO toca schema.
**Sessao de origem:** 01/jun/2026

---

## Diagnostico (ja feito — nao re-investigar)

Confirmado por SQL: o `weekly_orders` GRAVA a composicao trocada da semana. A linha do
pedido da semana tem `composition = {"integral":0,"original":2}` (a troca feita pelo
usuario), e `updated_at` posterior ao `created_at`. Os `extras` tambem persistem.

O bug NAO esta no endpoint nem no banco. Esta na HIDRATACAO no cliente: no reload, o
app carrega o `currentWeeklyOrder` (com `composition` correta), le os `extras` dele
(por isso extras sobrevivem ao F5), mas NUNCA usa o `currentWeeklyOrder.composition`
pra semear o estado `cestaSemana`. Resultado: `cestaSemana` fica `null` e a tela cai no
padrao da assinatura.

Cadeia no App.jsx (CoraPortal):
- L2119: `const [cestaSemana,setCestaSemana]=useState(null);` — nasce null, sempre.
- L2223: `const currentWeeklyOrder = weeklyOrders[0] || null;` — existe, tem composition.
- L2220: `const cestaAtual = cestaSemana ?? (reducaoPendente?assinaturaBaseline:assinaturaQtds);`
  — com cestaSemana null, sempre cai no padrao da assinatura.

Compare com o que a D.4 fez certo: `assinaturaQtds` e semeado do servidor quando a
subscription chega. O `cestaSemana` nao tem o seed equivalente a partir do weekly-order.

---

## Correcao

Semear `cestaSemana` a partir de `currentWeeklyOrder.composition` na HIDRATACAO (quando
os weekly-orders chegam do GET), se houver composition nao-nula. Um `useEffect` que
observa o `currentWeeklyOrder` (ou o `weeklyOrders`) e faz o seed.

Esqueleto (ajustar ao estilo do arquivo):

```js
// Hidrata cestaSemana a partir da composicao persistida do pedido da semana.
// So no carregamento do weekly-order; nao atropela edicao em andamento nem o
// null deliberado pos-acao.
useEffect(() => {
  const comp = currentWeeklyOrder?.composition;
  if (comp && Object.keys(comp).length > 0) {
    setCestaSemana(buildQtdsFrom(comp)); // traducao composition -> {id:qty} sobre D.paes
  }
}, [currentWeeklyOrder?.id]); // dep no id do pedido, nao no objeto inteiro
```

### Cuidados obrigatorios (pra nao criar bug novo)

1. **Nao atropelar edicao em andamento nem o null deliberado.** Ha pontos que fazem
   `setCestaSemana(null)` de proposito (L2182, L2344) pra significar "voltou pro padrao"
   apos confirmar/alterar. O seed NAO pode re-disparar e desfazer essas acoes. Por isso
   a dependencia do effect deve ser o **id do weekly-order** (`currentWeeklyOrder?.id`),
   nao o objeto inteiro nem `cestaSemana`. O seed roda quando o PEDIDO carrega/muda de
   id (hidratacao), nao a cada render nem apos toda mutacao local. Se necessario, um
   ref/guard pra rodar so uma vez por id de pedido.

2. **Traducao generica, nao hardcoded em original/integral.** O `composition` vem como
   `{original, integral}` (formato do weekly-order). O `cestaSemana` e `{id:qty}` sobre
   os ids de `D.paes`. Hoje so existem `original` e `integral`, MAS o modelo vai ganhar
   mais tipos de pao na assinatura. Entao a traducao tem que ser generica sobre
   `D.paes` (reusar `buildQtdsFrom`, que ja itera D.paes e cai em 0 pra chave ausente),
   nao um mapeamento fixo dos dois tipos. Nao introduzir codigo que quebre quando entrar
   um terceiro pao.

3. **Consistencia com a normalizacao de zeros.** Lembrar do ajuste da D.4: o backend
   normaliza composicao dropando zeros, e `buildQtdsFrom` preenche a chave ausente com
   0. Garantir que um pao com qty 0 no composition vire 0 (nao o mock). `buildQtdsFrom`
   ja faz isso; so confirmar que e ele o usado aqui, com 0-default e nao o `p.qtd` mock.

4. **Confirmado vs rascunho.** Conferir se o seed deve valer tanto pra `rascunho` quanto
   pra `confirmado`. Se o pedido confirmado tambem deve refletir a composicao trocada na
   UI (provavel que sim), o seed cobre ambos. Se houver razao pra so rascunho, CC sinaliza.

---

## Escopo

**Mexe:** so `src/App.jsx` (o seed de `cestaSemana` na hidratacao). Possivelmente nada
mais.

**NAO mexe:** backend/endpoints (weekly-orders ja grava certo), schema, a logica de
`cestaAtual`/`assinaturaQtds`/`assinaturaBaseline` da D.4 (nao regredir), os
`setCestaSemana(null)` deliberados.

---

## Pontos de parada (apos item 8 do template)

9. Nao tocar backend nem schema. O weekly-order ja grava a composition; o bug e so de leitura no cliente.
10. Traducao composition->cestaSemana generica sobre D.paes, nunca hardcoded em original/integral.
11. O seed nao pode atropelar edicao em andamento nem o null deliberado pos-acao (dep no id do pedido).
12. Nao regredir o estado da assinatura recorrente (D.4): assinaturaQtds/baseline/cestaAtual continuam como estao.

---

## Validacao (preview)

1. Editar a composicao da cesta de UMA semana (ex: 2 originais, 0 integral), confirmar.
2. **F5.** A composicao trocada PERSISTE na tela (o "Trocado so esta semana" reaparece
   com 2x Original), nao volta pro padrao da assinatura. (Esse e o bug; e o teste.)
3. Os extras continuam persistindo (nao regrediu).
4. A assinatura recorrente (tela Assinatura) continua intacta e independente da troca da
   semana (a troca da semana NAO altera a assinatura recorrente).
5. Confirmar/voltar-pro-padrao: apos "voltar pro padrao" ou confirmar, o
   `setCestaSemana(null)` deliberado continua funcionando (a tela volta ao padrao quando
   deve), o seed nao reverte isso no mesmo ciclo.

Sem necessidade de SQL novo (o dado ja esta no banco). CC trabalha em branch propria,
PR draft, sem push direto no main (protegido).

---

## Refs

- App.jsx: L2119 (cestaSemana init), L2220 (cestaAtual), L2223 (currentWeeklyOrder),
  L2182/L2344 (setCestaSemana(null) deliberados), buildQtdsFrom (helper de traducao).
- weekly_orders.composition: confirmado com dado real {"integral":0,"original":2}.
- D.4: padrao de seed de estado do servidor no mount (espelhar a abordagem).
