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
 * Cidades liberadas por inteiro (decisao pre-Alpha): qualquer endereco
 * nessas cidades passa, mesmo fora dos bairros de COVERED_AREAS / dos raios.
 * Risco aceito por Hugo — o link ?dev=1 e controlado e a base sera zerada
 * antes do Alpha real. Match tolerante a acento/caixa (Niteroi vs Niterói).
 */
const WHITELIST_CITIES = [
  { cidade: 'Rio de Janeiro', estado: 'RJ' },
  { cidade: 'Niterói', estado: 'RJ' },
];

/**
 * Whitelist de override de cobertura. CRUD via endpoint chega na
 * Fase 8 (admin.acora.com.br). Por enquanto, lista local vazia —
 * comportamento equivalente a "sem overrides".
 *
 * Match por qualquer um dos campos: CPF, e-mail, CEP. Comparacoes:
 *  - CPF/CEP: so digitos
 *  - email: lowercase
 */
const WHITELIST_HARDCODED = [
  // exemplo: { cpf: "00000000000", email: "vip@cora.com", cep: "01310100", note: "..." }
];

const onlyDigits = (s) => (s || "").replace(/\D/g, "");

/**
 * Override de cobertura. Retorna true se o endereco esta numa cidade
 * liberada inteira (WHITELIST_CITIES) OU se algum dado (CPF/e-mail/CEP)
 * casa com WHITELIST_HARDCODED.
 */
export const estaNaWhitelist = ({ cpf, email, cep, cidade, estado } = {}) => {
  // Cidade inteira liberada — comparacao tolerante a acento/caixa via equalsLoose.
  const naCidade = WHITELIST_CITIES.some(
    (w) => equalsLoose(w.cidade, cidade) && equalsLoose(w.estado, estado)
  );
  if (naCidade) return true;

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
