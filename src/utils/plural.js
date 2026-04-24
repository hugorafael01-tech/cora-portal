/**
 * Retorna singular ou plural conforme quantidade.
 * Cobertura apenas de substantivos. Não trata concordância verbal/adjetival.
 *
 * @param {number} n - quantidade
 * @param {string} sing - forma singular (ex: "pão")
 * @param {string} plu - forma plural (ex: "pães")
 * @returns {string}
 */
export const plural = (n, sing, plu) => (n === 1 ? sing : plu);
