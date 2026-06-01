/**
 * Constantes de contato. Centralizam o numero do Hugo pra nao espalhar
 * literais. Migracao do PreCadastro e do Perfil de "Pausar ou Cancelar"
 * fica como pendencia separada (fora do escopo da Fase 4).
 */

export const HUGO_WHATSAPP = "5521971059962";

/**
 * Link wa.me com mensagem pre-preenchida pra "situacao especial" quando
 * o CEP cai fora de cobertura.
 */
export const buildHugoCoverageLink = (bairro) => {
  const msg = `Oi, vi que vocês ainda não entregam no ${bairro || "meu bairro"} mas queria falar sobre uma situação especial.`;
  return `https://wa.me/${HUGO_WHATSAPP}?text=${encodeURIComponent(msg)}`;
};

/**
 * Link wa.me generico de contato com o Hugo, com mensagem pre-preenchida
 * opcional. Usado fora do caso de cobertura (ex: CPF ja cadastrado no
 * onboarding, que o magic link sozinho nao resolve).
 */
export const buildHugoContactLink = (msg) =>
  `https://wa.me/${HUGO_WHATSAPP}?text=${encodeURIComponent(
    msg || "Oi, preciso de ajuda com meu cadastro na Cora."
  )}`;
