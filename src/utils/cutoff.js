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

// Próxima quinta a partir de `now` cujo cutoff (terça 15h UTC) ainda não passou.
// Se hoje é quinta ou já passamos do cutoff dela, pula pra quinta seguinte.
function nextEditableThursdayISO(now) {
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
  return thursday.toISOString().slice(0, 10);
}
