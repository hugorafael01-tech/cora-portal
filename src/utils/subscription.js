/**
 * Persistencia local da Assinatura no MVP.
 *
 * Fonte de verdade no MVP: localStorage. Quando a Fase 7 entrar com
 * Supabase + Vercel Functions, a fonte de verdade vira o DB e este
 * arquivo guarda apenas o subscription_id retornado pelo POST.
 * A interface (load/save/clear) eh estavel — callers nao mudam.
 *
 * Payload atual:
 *   { status, data, assinatura, createdAt }
 *
 * status: 'pending_payment' | 'active' | 'paused' | 'cancelled'
 */
const KEY = "cora_subscription";

export const loadSubscription = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveSubscription = (payload) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* quota excedida ou private mode — ignora */
  }
};

export const clearSubscription = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
};
