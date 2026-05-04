import { COVERED_AREAS } from "../config/coverage";
import { equalsLoose } from "./normalize";

/**
 * Verifica se a combinacao bairro/cidade esta na lista de bairros
 * atendidos. Match case-insensitive e tolerante a acentos via
 * `equalsLoose`.
 */
export const estaCoberto = (bairro, cidade) => {
  if (!bairro || !cidade) return false;
  const cidadeKey = Object.keys(COVERED_AREAS).find((k) => equalsLoose(k, cidade));
  if (!cidadeKey) return false;
  return COVERED_AREAS[cidadeKey].some((b) => equalsLoose(b, bairro));
};

/**
 * Whitelist de override de cobertura. CRUD via SQL no Supabase chega na
 * Fase 7. Por enquanto, lista local vazia — comportamento equivalente a
 * "sem overrides".
 *
 * Match por qualquer um dos campos: CPF, e-mail, CEP. Comparacoes:
 *  - CPF/CEP: so digitos
 *  - email: lowercase
 */
const WHITELIST_HARDCODED = [
  // exemplo: { cpf: "00000000000", email: "vip@cora.com", cep: "01310100", note: "..." }
];

const onlyDigits = (s) => (s || "").replace(/\D/g, "");

export const estaNaWhitelist = ({ cpf, email, cep } = {}) => {
  const cpfDigits = onlyDigits(cpf);
  const cepDigits = onlyDigits(cep);
  const emailLower = (email || "").toLowerCase().trim();

  return WHITELIST_HARDCODED.some((w) => {
    if (w.cpf && cpfDigits && w.cpf === cpfDigits) return true;
    if (w.email && emailLower && w.email.toLowerCase() === emailLower) return true;
    if (w.cep && cepDigits && w.cep === cepDigits) return true;
    return false;
  });
};
