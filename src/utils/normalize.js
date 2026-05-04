/**
 * Normaliza string pra comparação tolerante: lowercase + remove
 * diacríticos (acentos, cedilha, etc.).
 *
 * Ex: "São Francisco" -> "sao francisco"
 *     "Icaraí"        -> "icarai"
 */
export const normalize = (s) =>
  (s ?? '')
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/**
 * Compara duas strings ignorando acentos e caixa.
 */
export const equalsLoose = (a, b) => normalize(a) === normalize(b);
