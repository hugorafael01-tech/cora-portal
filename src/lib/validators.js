/**
 * Validators server-side. Funcoes puras, sem dependencias externas.
 *
 * Reusa logica ja existente em src/utils/validators.js (CPF/email/whatsapp/CEP).
 * Adiciona:
 *   - canonicalizeDigits(str): so digitos
 *   - isValidUUID(id): regex de UUID v4
 *
 * Tanto endpoints (api/) quanto front podem importar daqui sem risco —
 * sao funcoes puras sem side effects.
 */
export {
  isValidCPF,
  isValidEmail,
  isValidWhatsApp,
  isValidCEP,
} from "../utils/validators.js";

export const canonicalizeDigits = (str) => (str ?? "").toString().replace(/\D/g, "");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isValidUUID = (id) => typeof id === "string" && UUID_RE.test(id);
