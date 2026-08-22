/**
 * Cardapio da semana de entrega — le do banco, nao mais de um mapa em codigo.
 *
 * Substitui `src/config/menu.js`, que era um mapa fixo por data e prometia a
 * propria morte quando a task 86e2fqk33 entrasse. Mudar o cardapio exigia
 * commit + deploy, e as duas fontes divergiam: desde o PR #79 o servidor valida
 * o preco do extra contra `cardapios`, entao item que o mapa anunciava e o
 * banco nao tinha aparecia na tela e devolvia 400 no "Adicionar a cesta".
 *
 * A fonte agora e a view `cardapio_publico` (backoffice, migration 0035), que
 * projeta `cardapios` + `semanas` + `produtos` por `data_entrega` e e legivel
 * por `anon` e `authenticated`. Quem resolve a data continua sendo
 * `nextEditableThursdayISO` (src/utils/cutoff.js) via `deliveryDate` do App — a
 * MESMA data que o pedido usa, entao o cardapio vira sozinho no corte de terca
 * ao meio-dia. Sem cron, sem deploy, sem alguem lembrar.
 *
 * O que NAO vem do banco: a copy (desc, sobre, ingredientes, subCopy, img,
 * genero) continua no catalogo em codigo do App.jsx, casada por slug. Escopo A
 * da task, decisao explicita. Consequencia pratica: produto novo cadastrado no
 * backoffice so aparece no portal depois que o catalogo em codigo ganhar a
 * entrada dele — o banco manda em QUAIS itens e por QUANTO, nao em como eles
 * sao descritos.
 *
 * Divisao proposital em dois modulos, mesmo padrao de api/_lib/extras-precos.js:
 * ESTE fica puro e testavel sem banco, sem rede e sem React
 * (scripts/test-cardapio-semana.mjs); src/hooks/useCardapioSemana.js isola o
 * I/O. Sem import nenhum aqui de proposito — e o que deixa o teste rodar no
 * node cru, sem o resolver do Vite.
 */
/**
 * Semana sem cardapio cadastrado, erro de rede, ou resposta que nao da pra
 * usar: so os dois paes fixos e nenhum especial. Mesmo comportamento do
 * `MENU_FALLBACK` que o menu.js tinha.
 *
 * Nunca quebra a tela e nunca oferece produto que nao vai ser assado — errar
 * pra menos e o unico erro aceitavel aqui, porque o oposto e vender o que nao
 * sai do forno.
 *
 * `precos` vazio de proposito: sem preco do banco, os dois fixos caem no preco
 * do catalogo em codigo. Congelado porque o retorno e compartilhado entre
 * renders e call-sites — o Map nao da pra congelar de verdade, entao ninguem
 * deve escrever nele (so `.get`).
 */
export const CARDAPIO_FALLBACK = Object.freeze({
  itens: Object.freeze(["original", "integral"]),
  especial: null,
  precos: new Map(),
});

/**
 * Monta o menu a partir das linhas de `cardapio_publico`. PURA.
 *
 * @param {Array<{slug: string, preco_avulso: number|string, destaque: boolean}>|null} linhas
 * @param {unknown} [error] erro do supabase; qualquer coisa truthy cai no fallback
 * @returns {{itens: string[], especial: string|null, precos: Map<string, number>}}
 *   Mesmo shape que o resto do App ja consumia do `menuDaSemana`, mais `precos`.
 */
export function montaCardapio(linhas, error) {
  if (error || !Array.isArray(linhas) || linhas.length === 0) return CARDAPIO_FALLBACK;

  const itens = [];
  const precos = new Map();
  let especial = null;

  for (const linha of linhas) {
    const slug = linha?.slug;
    // `preco_avulso` e numeric no Postgres e chega como string no supabase-js.
    // O descarte de null/""/undefined vem ANTES do Number() porque Number(null)
    // e Number("") sao 0 — ausencia de preco viraria item de graca na vitrine.
    // Zero de verdade ("0") continua passando: e preco, nao ausencia.
    const bruto = linha?.preco_avulso;
    const preco = bruto === null || bruto === undefined || bruto === "" ? NaN : Number(bruto);
    // Item sem preco utilizavel NAO entra na vitrine. O servidor cobra pelo
    // preco do banco (api/_lib/extras-precos.js); anunciar sem saber quanto e
    // exatamente o botao quebrado que esta task veio matar.
    if (!slug || !Number.isFinite(preco)) continue;

    itens.push(slug);
    precos.set(slug, preco);
    // O indice unico parcial da 0035 garante um destaque por semana, entao nao
    // ha desempate a fazer aqui.
    if (linha.destaque) especial = slug;
  }

  if (itens.length === 0) return CARDAPIO_FALLBACK;
  return { itens, especial, precos };
}
