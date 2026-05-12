/**
 * Re-export thin de `src/utils/cutoff.js`.
 *
 * Mantém uma única fonte de verdade pra lógica de cutoff (terça 12h BRT
 * = 15h UTC). O front bate o mesmo arquivo via `src/utils/cutoff.js`,
 * garantindo que validações cliente/servidor não derivam.
 *
 * No backend, sempre passar `deliveryDate` explícito (assinatura primária).
 */
export { isPastCutoff, isThursday } from "../../src/utils/cutoff.js";
