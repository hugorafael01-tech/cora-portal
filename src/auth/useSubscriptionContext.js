import { useContext } from "react";
import { SubscriptionContext } from "./SubscriptionProvider";

/**
 * Hook de acesso ao SubscriptionContext (Frente D / D.4).
 *
 * Retorna:
 *   - subscription: objeto adaptado (shape das telas) ou null (sem sessao /
 *                   sem assinatura / enquanto carrega ou em erro)
 *   - loading:      true ate auth hidratar + os fetches resolverem
 *   - error:        erro de leitura do DB ou null
 *   - refetch():    invalida e re-le do DB (apos edicao/onboarding)
 *
 * Lanca Error se usado fora de <SubscriptionProvider>.
 */
export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  if (context === null) {
    throw new Error("useSubscriptionContext must be used within <SubscriptionProvider>");
  }
  return context;
}
