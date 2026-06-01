/**
 * useSubscriptionView - leitura combinada (subscription + profile + email da
 * sessao) ja no SHAPE QUE AS TELAS ESPERAM (Frente D / D.4).
 *
 * Compoe os hooks read-only da D.2 (useSubscription + useProfile, ambos via
 * client anon com a RLS select_own) e a aciona com o email da sessao Supabase.
 * NAO cria endpoint nem client novo. Faz so a TRADUCAO de shape:
 *   - qty_original/qty_integral  -> itens: { original, integral }
 *   - colunas de endereco planas -> endereco: { cep, rua, ... }
 *   - email                      -> session.user.email (autoritativo do login)
 *
 * NAO inclui as colunas legadas de cobranca (valor_*, next_billing_*): o Perfil
 * busca essas via GET /api/subscriptions/[id] (service_role), e a Assinatura
 * recalcula valor localmente. Manter o subset minimo evita estender o select
 * da D.2 em colunas marcadas pra drop na contract.
 *
 * Contrato: { subscription, loading, error }
 *   - subscription: objeto adaptado (telas) ou null (sem sessao / sem assinatura
 *                   / enquanto carrega ou em erro). O consumidor decide pela
 *                   ordem loading -> error -> subscription.
 *   - loading: subLoading || profileLoading.
 *   - error:   primeiro erro nao-nulo (subscription tem precedencia).
 *
 * reloadKey: repassado aos dois hooks; muda -> refetch (ver SubscriptionProvider).
 */
import { useSubscription } from "./useSubscription";
import { useProfile } from "./useProfile";
import { useAuth } from "../auth/useAuth";

// Traduz as 3 fontes pro shape das telas. Retorna null quando nao ha linha de
// subscription (logado sem assinatura) -- e o sinal que o gate usa pra /interesse.
function adapt(subscription, profile, email) {
  if (!subscription) return null;
  return {
    id: subscription.id,
    status: subscription.status,
    // profiles: pode faltar em linha legada sem profile semeado -> null (telas
    // ja tratam com fallback "—" / saudacao sem nome). Nunca quebra.
    nome: profile?.nome ?? null,
    whatsapp: profile?.whatsapp ?? null,
    cpf: profile?.cpf ?? null,
    // email autoritativo vem da sessao, nao da coluna legada subscriptions.email.
    email: email ?? null,
    endereco: {
      cep: subscription.cep ?? null,
      rua: subscription.rua ?? null,
      numero: subscription.numero ?? null,
      complemento: subscription.complemento ?? null,
      bairro: subscription.bairro ?? null,
      cidade: subscription.cidade ?? null,
      estado: subscription.estado ?? null,
    },
    // localStorage guardava itens={original,integral}; o DB tem qty_*. Traduz.
    itens: {
      original: subscription.qty_original ?? 0,
      integral: subscription.qty_integral ?? 0,
    },
  };
}

export function useSubscriptionView(reloadKey = 0) {
  const { user } = useAuth();
  const { subscription, loading: subLoading, error: subError } = useSubscription(reloadKey);
  const { profile, loading: profileLoading, error: profileError } = useProfile(reloadKey);

  const loading = subLoading || profileLoading;
  const error = subError || profileError || null;
  // So adapta com dado estavel: enquanto carrega ou em erro, subscription = null
  // (o consumidor distingue os 3 estados pelos flags loading/error).
  const adapted = !loading && !error ? adapt(subscription, profile, user?.email ?? null) : null;

  return { subscription: adapted, loading, error };
}
