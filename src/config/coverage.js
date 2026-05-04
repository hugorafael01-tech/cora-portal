/**
 * Bairros atendidos pela Cora.
 *
 * Match case-insensitive e tolerante a acentos — feito por
 * `src/utils/normalize.js`. ViaCEP retorna o bairro com acentos e
 * capitalização padrão, mas normalizar dos dois lados é defensivo.
 *
 * Pra abrir um bairro novo: editar este arquivo e fazer commit/push.
 * Vercel rebuilda. Sem feature flag, painel admin ou DB no MVP.
 */
export const COVERED_AREAS = {
  'Niterói': ['Icaraí', 'Ingá', 'São Francisco'],
  'Rio de Janeiro': ['Botafogo', 'Humaitá', 'Copacabana'],
};
