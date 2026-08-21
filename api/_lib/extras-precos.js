/**
 * Preco de extra: a fonte de verdade e o banco, nunca o corpo do request.
 *
 * Ate 21/08/2026 o POST /api/weekly-orders somava o `preco_unit` que o cliente
 * mandava. Duas linhas no DevTools compravam um brioche por R$ 0,01. Aqui o
 * servidor busca o preco em `cardapios` (o mesmo que o backoffice cadastra) e
 * descarta o que veio no corpo.
 *
 * Divisao proposital em duas funcoes: `fetchPrecosDaSemana` isola o I/O e
 * `resolveExtrasPrecos` fica pura, testavel sem banco (scripts/test-extras-precos.mjs).
 *
 * O `id` do extra no front e o `slug` do produto (`focaccia`, `multigraos`...),
 * e e por ele que casamos. O mapa cobre `tipo` base E rotativo: Original e
 * Integral tambem sao vendidos avulsos na tela Cardapio, e filtrar por rotativo
 * quebraria o pao extra.
 *
 * Quando a task 86e2fqk33 (catalogo por semana) entrar, o front passa a ler
 * daqui tambem — mas a validacao do servidor continua sendo a que vale.
 */

/**
 * Precos do cardapio da semana da entrega.
 *
 * @returns {Promise<Map<string, number>|null>} Map slug -> preco, ou null
 *   quando a semana nao tem cardapio cadastrado (nao existe em `semanas`, ou
 *   existe sem nenhuma linha em `cardapios`). O caller decide o que fazer com
 *   o null — hoje: rejeitar extras, deixar passar pedido so com composicao.
 * @throws erro do supabase (o caller loga e devolve 500)
 */
export async function fetchPrecosDaSemana(supabaseAdmin, deliveryDate) {
  // `semanas.data_entrega` NAO tem UNIQUE (conferido em 21/08/2026). Os dados
  // estao limpos, mas .maybeSingle() lancaria se um dia duplicasse — entao
  // ordena e pega a mais recente em vez de quebrar o pedido do assinante.
  const { data: semanas, error: semanaErr } = await supabaseAdmin
    .from("semanas")
    .select("id, created_at")
    .eq("data_entrega", deliveryDate)
    .order("created_at", { ascending: false });
  if (semanaErr) throw semanaErr;
  if (!semanas || semanas.length === 0) return null;
  if (semanas.length > 1) {
    console.warn("[extras-precos] mais de uma semana com a mesma data_entrega", {
      deliveryDate, ids: semanas.map((s) => s.id),
    });
  }

  const { data: linhas, error: cardapioErr } = await supabaseAdmin
    .from("cardapios")
    .select("produto_id, preco_avulso")
    .eq("semana_id", semanas[0].id);
  if (cardapioErr) throw cardapioErr;
  if (!linhas || linhas.length === 0) return null;

  // Busca os slugs num segundo round-trip em vez de embed do PostgREST: o
  // volume e de ~5 linhas por semana e o SELECT explicito nao depende de como
  // a FK esta nomeada. Mesmo trade-off ja aceito no resto deste endpoint.
  const { data: produtos, error: produtoErr } = await supabaseAdmin
    .from("produtos")
    .select("id, slug")
    .in("id", linhas.map((l) => l.produto_id));
  if (produtoErr) throw produtoErr;

  const slugPorId = new Map((produtos || []).map((p) => [p.id, p.slug]));
  const precos = new Map();
  for (const linha of linhas) {
    const slug = slugPorId.get(linha.produto_id);
    // `preco_avulso` e numeric no Postgres e chega como string no supabase-js.
    const preco = Number(linha.preco_avulso);
    if (!slug || !Number.isFinite(preco)) continue;
    precos.set(slug, preco);
  }
  return precos.size > 0 ? precos : null;
}

/**
 * Troca o preco de cada extra pelo do cardapio e separa os que nao pertencem
 * a semana.
 *
 * NAO rejeita por divergencia de preco: a pessoa pode estar com uma aba aberta
 * de antes de uma mudanca no backoffice. Usa o preco do banco e segue.
 *
 * O `nome` continua vindo do cliente de proposito — o banco tem outra grafia
 * ("Pao Multigraos", "Ciabatta Rustica") e sobrescrever mudaria o texto do
 * e-mail de cesta abandonada, que le `extras[].nome`.
 *
 * @returns {{resolved: Array, missing: string[]}} `missing` = ids fora do
 *   cardapio da semana; nao vazio => o caller rejeita o pedido inteiro.
 */
export function resolveExtrasPrecos(extras, precoMap) {
  const resolved = [];
  const missing = [];
  for (const extra of extras) {
    const preco = precoMap?.get(extra.id);
    if (preco === undefined) {
      missing.push(extra.id);
      continue;
    }
    // Reconstroi o objeto com os 4 campos do contrato em vez de espalhar o
    // recebido: mesmo shape gravado de sempre, sem chave estranha entrando no
    // jsonb junto.
    resolved.push({ id: extra.id, nome: extra.nome, qty: extra.qty, preco_unit: preco });
  }
  return { resolved, missing };
}

/**
 * Total dos extras, arredondado a 2 casas. Soma float crua acumulava dust
 * (0.1+0.2) num campo que vira dinheiro na fatura.
 */
export function computeTotalExtras(extras) {
  const total = extras.reduce((sum, e) => sum + e.qty * e.preco_unit, 0);
  return Math.round(total * 100) / 100;
}
