/**
 * Validadores e máscaras para os campos do onboarding.
 *
 * Sem dependências externas — pattern coerente com `formatWhatsApp`
 * que já existia no projeto. Cada `format*` retorna a string mascarada
 * truncada ao tamanho máximo. Cada `isValid*` retorna boolean.
 */

// ─── WhatsApp ────────────────────────────────────────────────
// (XX) 9XXXX-XXXX  — 10 ou 11 dígitos
export const formatWhatsApp = (value) => {
  const d = (value ?? '').toString().replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

export const isValidWhatsApp = (value) => {
  const d = (value ?? '').toString().replace(/\D/g, '');
  return d.length === 10 || d.length === 11;
};

// ─── CEP ─────────────────────────────────────────────────────
// 00000-000  — 8 dígitos
export const formatCEP = (value) => {
  const d = (value ?? '').toString().replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

export const isValidCEP = (value) => {
  const d = (value ?? '').toString().replace(/\D/g, '');
  return d.length === 8;
};

// ─── CPF ─────────────────────────────────────────────────────
// 000.000.000-00  — 11 dígitos + algoritmo dos 2 verificadores
export const formatCPF = (value) => {
  const d = (value ?? '').toString().replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

// Algoritmo oficial dos 2 dígitos verificadores. Rejeita CPFs com
// todos os dígitos iguais (ex: 000.000.000-00, 111.111.111-11).
export const isValidCPF = (value) => {
  const d = (value ?? '').toString().replace(/\D/g, '');
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  const digits = d.split('').map(Number);
  const calc = (sliceLen) => {
    let sum = 0;
    for (let i = 0; i < sliceLen; i++) sum += digits[i] * (sliceLen + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === digits[9] && calc(10) === digits[10];
};

// ─── E-mail ──────────────────────────────────────────────────
// Validação prática: tem @, tem ponto no domínio, sem espaço.
// Não tenta cobrir RFC 5322 inteira — checagem real fica pro
// servidor de e-mail (rebote = e-mail inválido).
export const isValidEmail = (value) => {
  const v = (value ?? '').toString().trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
};

// ─── Nome ────────────────────────────────────────────────────
// Mínimo 2 caracteres, sem dígitos. Aceita acentos e cedilha.
export const isValidNome = (value) => {
  const v = (value ?? '').toString().trim();
  return v.length >= 2 && !/\d/.test(v);
};

// ─── Número (endereço) ───────────────────────────────────────
// Aceita alfanumérico (ex: "123A", "S/N").
export const isValidNumero = (value) => {
  const v = (value ?? '').toString().trim();
  return v.length > 0;
};
