/**
 * /api/subscriptions/[id]
 *
 * GET   — retorna so o que a Home precisa renderizar pra reconciliar status.
 *         NAO retorna CPF, e-mail, WhatsApp, endereco completo.
 * PATCH — altera composicao/total da assinatura (Frente C item 2). Calculos
 *         monetarios e datas de cobranca sao feitos no servidor; o payload so
 *         envia { itens, total_paes } e nao e fonte de verdade pros valores.
 */
import { supabaseAdmin } from "../../src/lib/supabase-admin.js";
import { isValidUUID } from "../../src/lib/validators.js";

const VALOR_POR_PAO = 99;
const FRETE_MENSAL = 15;

// Campos que GET expoe (inclui os 2 de cobranca futura — migration 0014).
const GET_FIELDS =
  "id, status, nome, itens, total_paes, valor_mensal, next_billing_change_date, next_billing_value, created_at";
// Campos que PATCH le/retorna (precisa de itens+total_paes pra idempotencia).
const PATCH_FIELDS =
  "id, status, itens, total_paes, valor_paes, valor_frete, valor_mensal, next_billing_change_date, next_billing_value";

// Soma as quantidades de itens, ignorando valores invalidos/negativos.
const sumItens = (itens) =>
  Object.values(itens || {}).reduce((s, q) => {
    const n = Number(q) || 0;
    return s + (n > 0 ? n : 0);
  }, 0);

// Normaliza pra { id: qty>0 } — base da comparacao de idempotencia.
const normalizeItens = (itens) => {
  const out = {};
  for (const [k, v] of Object.entries(itens || {})) {
    const n = Number(v) || 0;
    if (n > 0) out[k] = n;
  }
  return out;
};

const itensEqual = (a, b) => {
  const na = normalizeItens(a);
  const nb = normalizeItens(b);
  const ka = Object.keys(na);
  if (ka.length !== Object.keys(nb).length) return false;
  return ka.every((k) => na[k] === nb[k]);
};

// Primeiro dia do proximo mes em BRT (UTC-3, Brasil sem horario de verao desde
// 2019). Cenario B: a cobranca nova so vale na proxima fatura (dia 01). Calcula
// em BRT porque a virada de mes acontece 3h antes do UTC.
const firstDayOfNextMonthBRT = (now = new Date()) => {
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const y = brt.getUTCFullYear();
  const m = brt.getUTCMonth(); // 0-11
  const nextMonth = m === 11 ? 0 : m + 1;
  const nextYear = m === 11 ? y + 1 : y;
  return `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-01`;
};

export default async function handler(req, res) {
  const { id } = req.query || {};
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: "invalid_id" });
  }

  if (req.method === "GET") {
    return handleGet(id, res);
  }
  if (req.method === "PATCH") {
    return handlePatch(id, req, res);
  }
  return res.status(405).json({ error: "method_not_allowed" });
}

async function handleGet(id, res) {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select(GET_FIELDS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[subscriptions GET] select error", error);
    return res.status(500).json({ error: "internal_error" });
  }
  if (!data) {
    return res.status(404).json({ error: "not_found" });
  }
  return res.status(200).json(data);
}

async function handlePatch(id, req, res) {
  const { itens } = req.body || {};

  // ─── Composicao obrigatoria e bem-formada ───
  if (!itens || typeof itens !== "object") {
    return res.status(400).json({ error: "missing_itens" });
  }
  // Recomputa total no servidor — nao confia no total_paes do payload.
  const totalPaes = sumItens(itens);
  if (totalPaes < 1 || totalPaes > 3) {
    return res.status(422).json({ error: "invalid_qty" });
  }

  // ─── Le estado atual (status + composicao pra idempotencia) ───
  const { data: current, error: readErr } = await supabaseAdmin
    .from("subscriptions")
    .select(PATCH_FIELDS)
    .eq("id", id)
    .maybeSingle();

  if (readErr) {
    console.error("[subscriptions PATCH] read error", readErr);
    return res.status(500).json({ error: "internal_error" });
  }
  if (!current) {
    return res.status(404).json({ error: "not_found" });
  }
  if (current.status !== "active") {
    return res.status(409).json({ error: "not_active", status: current.status });
  }

  // ─── Idempotencia: composicao identica → no-op, sem mexer em next_billing_* ───
  if (itensEqual(itens, current.itens) && totalPaes === current.total_paes) {
    return res.status(200).json(current);
  }

  // ─── Calculos no servidor ───
  const valorPaes = totalPaes * VALOR_POR_PAO;
  const valorMensal = valorPaes + FRETE_MENSAL;

  const updatePayload = {
    itens: normalizeItens(itens),
    total_paes: totalPaes,
    valor_paes: valorPaes,
    valor_frete: FRETE_MENSAL,
    valor_mensal: valorMensal,
    next_billing_change_date: firstDayOfNextMonthBRT(),
    next_billing_value: valorMensal,
  };

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("subscriptions")
    .update(updatePayload)
    .eq("id", id)
    .select(PATCH_FIELDS)
    .single();

  if (updateErr) {
    console.error("[subscriptions PATCH] update error", updateErr);
    return res.status(500).json({ error: "internal_error" });
  }

  return res.status(200).json(updated);
}
