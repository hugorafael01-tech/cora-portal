/**
 * Persistencia local da Assinatura.
 *
 * Fonte de verdade: o DB Supabase. localStorage guarda o id + um snapshot
 * do payload pra UI funcionar offline (banner, recap, etc.) sem GET a cada
 * render. `reconcileSubscription()` puxa o status do servidor no mount da
 * Home e atualiza o snapshot local quando o status mudou.
 *
 * Shape:
 *   {
 *     id:           string (UUID retornado pelo POST),
 *     status:       'pending_payment' | 'active' | 'paused' | 'cancelled',
 *     nome:         string,
 *     whatsapp:     string,           // formatado
 *     email:        string,
 *     cpf:          string,           // formatado
 *     endereco:     { cep, rua, numero, complemento, bairro, cidade, estado },
 *     itens:        { original: number, integral: number },
 *     coverage_unconfirmed: bool,
 *     createdAt:    ISO string
 *   }
 */
import { getSubscription } from "./api.js";

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

/**
 * Reconcilia o snapshot local com o servidor:
 * - sem id local: nao faz nada, retorna null
 * - servidor 404 (subscription deletada): limpa local, retorna null
 * - status mudou: atualiza local mantendo snapshot, retorna o novo
 * - status igual: retorna o local
 * - erro de rede: degrade gracioso, retorna o local
 */
export async function reconcileSubscription() {
  const local = loadSubscription();
  if (!local?.id) return null;
  try {
    const remote = await getSubscription(local.id);
    if (!remote) {
      clearSubscription();
      return null;
    }
    if (remote.status !== local.status) {
      const updated = { ...local, status: remote.status };
      saveSubscription(updated);
      return updated;
    }
    return local;
  } catch (err) {
    console.warn("[reconcile] failed, using local snapshot", err);
    return local;
  }
}
