/**
 * /api/weekly-orders
 *
 * POST  → upsert do rascunho da semana (por subscription + delivery_date).
 *         Sempre seta status='rascunho' e confirmed_at=null. Se o cliente
 *         editar um pedido já confirmado, volta automaticamente pra rascunho.
 *
 * GET   → lista pedidos do assinante com delivery_date >= hoje (não traz
 *         histórico), ordenados por delivery_date ASC.
 *
 * Validações: cutoff (terça 15h UTC), delivery em quinta, subscription
 * active, extras bem-formados, composição com soma == total_paes.
 *
 * Preço de extra NÃO vem do cliente: o `preco_unit` do corpo é ignorado e o
 * valor sai de `cardapios` pela semana da entrega (api/_lib/extras-precos.js).
 * Extra fora do cardápio da semana → 400 `extra_not_in_menu`; semana sem
 * cardápio cadastrado → 400 `week_menu_not_found` (pedido só com composição
 * continua passando).
 *
 * Regras de `first_extra_added_at` (timer do cron de abandono):
 *   - extras vazio        → first_extra_added_at = NULL, abandonment_warning_sent_at = NULL
 *   - primeira adição     → first_extra_added_at = NOW(),  abandonment_warning_sent_at = NULL
 *   - alteração com timer já rodando → preserva ambos (não reseta)
 */
import { supabaseAdmin } from "../../src/lib/supabase-admin.js";
import { isValidUUID } from "../../src/lib/validators.js";
import { isPastCutoff, isThursday } from "../_lib/cutoff.js";
import { fetchPrecosDaSemana, resolveExtrasPrecos, computeTotalExtras } from "../_lib/extras-precos.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Campos retornados na resposta pública. Internos do cron (first_extra_added_at,
// abandonment_warning_sent_at) ficam fora do shape exposto pro front.
const PUBLIC_FIELDS =
  "id, subscription_id, delivery_date, composition, extras, total_extras, status, confirmed_at, created_at, updated_at";

// Valida so a FORMA do extra. O `preco_unit` pode vir no corpo (o front ainda
// manda) mas nao e validado nem usado: quem decide preco e o cardapio da
// semana, resolvido abaixo. Ver api/_lib/extras-precos.js.
function isValidExtras(extras) {
  if (!Array.isArray(extras)) return false;
  return extras.every((e) =>
    e && typeof e === "object" && !Array.isArray(e) &&
    typeof e.id === "string" && e.id.length > 0 &&
    typeof e.nome === "string" && e.nome.length > 0 &&
    Number.isInteger(e.qty) && e.qty > 0
  );
}

// Retorna soma das quantidades, ou NaN se o objeto for inválido.
function compositionSum(composition) {
  if (composition === null || composition === undefined) return null;
  if (typeof composition !== "object" || Array.isArray(composition)) return NaN;
  let s = 0;
  for (const v of Object.values(composition)) {
    if (!Number.isInteger(v) || v < 0) return NaN;
    s += v;
  }
  return s;
}

async function handlePost(req, res) {
  const body = req.body || {};
  const { subscription_id, delivery_date, composition, extras } = body;

  if (!isValidUUID(subscription_id)) {
    return res.status(400).json({ error: "invalid_subscription_id" });
  }
  if (typeof delivery_date !== "string" || !DATE_RE.test(delivery_date)) {
    return res.status(400).json({ error: "invalid_delivery_date" });
  }
  if (!isThursday(delivery_date)) {
    return res.status(400).json({ error: "delivery_must_be_thursday" });
  }
  if (isPastCutoff(delivery_date)) {
    return res.status(409).json({ error: "cutoff_passed" });
  }

  const extrasArr = Array.isArray(extras) ? extras : [];
  if (!isValidExtras(extrasArr)) {
    return res.status(400).json({ error: "invalid_extras" });
  }

  // ─── Carrega subscription pra checar status e total_paes ───
  const { data: sub, error: subErr } = await supabaseAdmin
    .from("subscriptions")
    .select("id, status, total_paes")
    .eq("id", subscription_id)
    .maybeSingle();
  if (subErr) {
    console.error("[weekly-orders POST] subscription read failed", subErr);
    return res.status(500).json({ error: "internal_error" });
  }
  if (!sub) return res.status(404).json({ error: "subscription_not_found" });
  if (sub.status !== "active") {
    return res.status(409).json({ error: "subscription_not_active" });
  }

  // ─── Composition: so valida/grava quando vem no request (task 86e1neypw) ───
  // Operacao de EXTRA nao envia composition (campo ausente) -> preserva a
  // composicao ja gravada, sem revalidar. Desacopla o extra da validacao
  // soma === total_paes (que so faz sentido quando a composicao muda).
  // Operacao de COMPOSICAO envia:
  //   - objeto -> valida soma === total_paes (regra mantida)
  //   - null   -> limpa o swap (volta ao padrao da assinatura), sem validar soma
  const compositionProvided = composition !== undefined;
  let compositionPayload;
  if (compositionProvided && composition !== null) {
    const sum = compositionSum(composition);
    if (Number.isNaN(sum)) {
      return res.status(400).json({ error: "invalid_composition" });
    }
    if (sum !== sub.total_paes) {
      return res.status(400).json({ error: "composition_quantity_mismatch" });
    }
    compositionPayload = composition;
  } else if (compositionProvided) {
    compositionPayload = null;
  }

  // ─── Preco: vem do cardapio da semana, o do corpo e descartado ───
  // Roda depois do cutoff e da subscription (nao adianta consultar cardapio de
  // pedido que ja vai ser rejeitado) e so quando ha extras — pedido so de
  // composicao nao paga round-trip nenhum.
  let extrasPayload = extrasArr;
  if (extrasArr.length > 0) {
    let precos;
    try {
      precos = await fetchPrecosDaSemana(supabaseAdmin, delivery_date);
    } catch (err) {
      console.error("[weekly-orders POST] cardapio read failed", err);
      return res.status(500).json({ error: "internal_error" });
    }
    // Semana sem cardapio cadastrado: nao da pra saber o preco de nada, entao
    // nenhum extra entra. Codigo proprio pra distinguir de "produto errado"
    // quando alguem for depurar a reclamacao de um assinante.
    if (!precos) {
      console.warn("[weekly-orders POST] semana sem cardapio", { delivery_date });
      return res.status(400).json({ error: "week_menu_not_found" });
    }
    const { resolved, missing } = resolveExtrasPrecos(extrasArr, precos);
    if (missing.length > 0) {
      console.warn("[weekly-orders POST] extra fora do cardapio da semana", { delivery_date, missing });
      return res.status(400).json({ error: "extra_not_in_menu" });
    }
    extrasPayload = resolved;
  }

  const totalExtras = computeTotalExtras(extrasPayload);

  // ─── SELECT pré-upsert pra aplicar regras de first_extra_added_at ───
  // (2 round-trips no MVP; otimização desnecessária pro volume previsto)
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from("weekly_orders")
    .select("first_extra_added_at, abandonment_warning_sent_at")
    .eq("subscription_id", subscription_id)
    .eq("delivery_date", delivery_date)
    .maybeSingle();
  if (existingErr) {
    console.error("[weekly-orders POST] existing read failed", existingErr);
    return res.status(500).json({ error: "internal_error" });
  }

  let firstExtraAddedAt;
  let abandonmentWarningSentAt;
  if (extrasArr.length === 0) {
    firstExtraAddedAt = null;
    abandonmentWarningSentAt = null;
  } else if (!existing || !existing.first_extra_added_at) {
    firstExtraAddedAt = new Date().toISOString();
    abandonmentWarningSentAt = null;
  } else {
    firstExtraAddedAt = existing.first_extra_added_at;
    abandonmentWarningSentAt = existing.abandonment_warning_sent_at;
  }

  const upsertPayload = {
    subscription_id,
    delivery_date,
    extras: extrasPayload,
    total_extras: totalExtras,
    status: "rascunho",
    confirmed_at: null,
    first_extra_added_at: firstExtraAddedAt,
    abandonment_warning_sent_at: abandonmentWarningSentAt,
  };
  // composition so entra no payload quando veio no request. Ausente -> fora do
  // SET do ON CONFLICT DO UPDATE -> valor gravado preservado (ponto 11). Em
  // insert de pedido novo sem swap, a coluna fica no default (null = segue a
  // assinatura), que e o correto.
  if (compositionProvided) {
    upsertPayload.composition = compositionPayload;
  }

  const { data: upserted, error: upsertErr } = await supabaseAdmin
    .from("weekly_orders")
    .upsert(upsertPayload, { onConflict: "subscription_id,delivery_date" })
    .select(PUBLIC_FIELDS)
    .single();

  if (upsertErr) {
    console.error("[weekly-orders POST] upsert failed", upsertErr);
    return res.status(500).json({ error: "internal_error" });
  }

  return res.status(200).json(upserted);
}

async function handleGet(req, res) {
  const { subscription_id, history, limit } = req.query || {};
  if (!isValidUUID(subscription_id)) {
    return res.status(400).json({ error: "invalid_subscription_id" });
  }

  // CURRENT_DATE no Postgres é em UTC (banco roda em UTC). À noite no BRT
  // o dia em UTC já avançou, então pode trazer 1 pedido "de hoje à noite"
  // como se fosse de amanhã. Não gera bug funcional (lista cresce em 1
  // item no máximo) e mantém o SQL simples. Detalhe registrado.
  const today = new Date().toISOString().slice(0, 10);

  // history=true → entregas passadas (tela Perfil). No MVP, "entregue" é
  // inferido como delivery_date < hoje && status='confirmado'. Quando o enum
  // weekly_order_status ganhar 'entregue' no cora-backoffice, troca-se o
  // filtro por .eq("status","entregue"). Limit padrão 4 = 3 últimas + 1
  // sentinela pro front decidir o link "Ver todos →" (length > 3).
  if (history === "true") {
    const max = Math.min(Number(limit) || 4, 20);
    const { data, error } = await supabaseAdmin
      .from("weekly_orders")
      .select(PUBLIC_FIELDS)
      .eq("subscription_id", subscription_id)
      .eq("status", "confirmado")
      .lt("delivery_date", today)
      .order("delivery_date", { ascending: false })
      .limit(max);
    if (error) {
      console.error("[weekly-orders GET history] select failed", error);
      return res.status(500).json({ error: "internal_error" });
    }
    return res.status(200).json({ weekly_orders: data || [] });
  }

  const { data, error } = await supabaseAdmin
    .from("weekly_orders")
    .select(PUBLIC_FIELDS)
    .eq("subscription_id", subscription_id)
    .gte("delivery_date", today)
    .order("delivery_date", { ascending: true });
  if (error) {
    console.error("[weekly-orders GET] select failed", error);
    return res.status(500).json({ error: "internal_error" });
  }
  return res.status(200).json({ weekly_orders: data || [] });
}

export default async function handler(req, res) {
  if (req.method === "POST") return handlePost(req, res);
  if (req.method === "GET") return handleGet(req, res);
  return res.status(405).json({ error: "method_not_allowed" });
}
