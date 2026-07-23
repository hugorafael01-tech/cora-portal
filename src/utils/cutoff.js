/**
 * Prazo de corte: terça 12h BRT (= 15h UTC) da semana anterior à entrega
 * de quinta. Brasil opera sem horário de verão desde 2019 (fuso fixo UTC-3),
 * então toda lógica trabalha em UTC pra evitar bugs de timezone — Vercel
 * Functions também rodam em UTC, garantindo paridade front/back.
 *
 * Fonte de verdade compartilhada: o backend importa daqui via
 * `api/_lib/cutoff.js` (re-export thin).
 *
 * - `isPastCutoff(deliveryDate, now)`: assinatura primária.
 *     deliveryDate = ISO YYYY-MM-DD (uma quinta-feira).
 *     `deliveryDate` é opcional pra preservar callers antigos do front
 *     que perguntam "já passou o corte da próxima cesta editável?".
 *     Quando omitido, calcula internamente a próxima quinta cujo cutoff
 *     ainda não passou.
 * - `isThursday(dateStr)`: true se a data ISO é quinta-feira (UTC).
 */

export function isPastCutoff(deliveryDate, now = new Date()) {
  // DEV ONLY — permite testar fluxos pré-cutoff em qualquer horário.
  // Server-side `window` é undefined, então o bypass não afeta o backend.
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("bypass_cutoff") === "true") {
    return false;
  }
  const dd = deliveryDate || nextEditableThursdayISO(now);
  const delivery = new Date(`${dd}T00:00:00Z`);
  const cutoff = new Date(delivery);
  cutoff.setUTCDate(cutoff.getUTCDate() - 2);
  cutoff.setUTCHours(15, 0, 0, 0); // 12h BRT = 15h UTC
  return now >= cutoff;
}

export function isThursday(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.getUTCDay() === 4;
}

// Piso de lancamento: a primeira entrega real da Cora e 06/08/2026. O Portal
// calcula "proxima quinta editavel" por matematica de data e, antes do
// lancamento, aponta ciclos (ex: 30/07) que nao existem comercialmente. Esta
// constante forca toda derivacao de "proxima entrega" a nunca ser anterior a
// 06/08.
//
// Auto-aposentadoria: depois de 06/08/2026 a quinta calculada e sempre >= o
// piso, entao o max() vira no-op. A constante pode ser removida em qualquer
// limpeza futura, sem pressa e sem efeito colateral.
export const LAUNCH_FIRST_DELIVERY = "2026-08-06";

// Próxima quinta a partir de `now` cujo cutoff (terça 15h UTC) ainda não passou.
// Se hoje é quinta ou já passamos do cutoff dela, pula pra quinta seguinte.
// Exportada pra App usar como `delivery_date` ao criar a primeira cesta da
// semana (quando `currentWeeklyOrder` ainda é null).
export function nextEditableThursdayISO(now = new Date()) {
  const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = t.getUTCDay(); // 0=dom..6=sáb
  const thursday = new Date(t);
  thursday.setUTCDate(thursday.getUTCDate() + ((4 - dow + 7) % 7));
  const cutoff = new Date(thursday);
  cutoff.setUTCDate(cutoff.getUTCDate() - 2);
  cutoff.setUTCHours(15, 0, 0, 0);
  if (now >= cutoff) {
    thursday.setUTCDate(thursday.getUTCDate() + 7);
  }
  const iso = thursday.toISOString().slice(0, 10);
  // Piso de lancamento aplicado na fonte: comparacao lexicografica de ISO
  // (YYYY-MM-DD) equivale a comparacao de data. Pos-06/08 vira no-op.
  return iso < LAUNCH_FIRST_DELIVERY ? LAUNCH_FIRST_DELIVERY : iso;
}

// Data em que uma alteração de assinatura (Frente C item 2) entra em vigor:
// a próxima entrega editável (Cenário A — a entrega após o próximo cutoff válido,
// porque a entrega vigente já está locked).
// Ex: terça 19/05 16h (pós-cutoff de hoje 12h), nextEditable=28/05 → retorna 28/05.
// Ex: seg 18/05 (pré-cutoff de terça 19/05), nextEditable=21/05 → retorna 21/05.
// Alias semântico de `nextEditableThursdayISO` pra clarear a intenção no callsite.
export const nextSubscriptionChangeThursdayISO = nextEditableThursdayISO;
