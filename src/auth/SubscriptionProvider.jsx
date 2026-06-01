/**
 * SubscriptionProvider - contexto da assinatura do usuario logado (Frente D / D.4).
 *
 * Segura UMA instancia de useSubscriptionView (leitura combinada subscription +
 * profile + email da sessao, ja no shape das telas) e a compartilha entre o gate
 * (ProtectedRoute) e o app (CoraPortal + telas). Fonte unica: "gate liberou" <=>
 * "dado pronto", entao nenhuma tela monta com subscription ainda indefinido.
 *
 * Dono do reloadKey: expoe refetch() pra invalidar a leitura apos uma edicao de
 * composicao (endpoint server-side) ou apos o onboarding gravar no DB. O cliente
 * RELE do DB em vez de confiar no payload da escrita -- fonte unica de verdade.
 *
 * Substitui o antigo snapshot localStorage (cora_subscription / loadSubscription /
 * reconcileSubscription). Sem sessao, useSubscriptionView devolve subscription
 * null sem disparar fetch.
 *
 * SubscriptionContext default eh null; useSubscriptionContext (arquivo separado)
 * checa esse null pra erro claro fora do Provider. Montado em main.jsx dentro do
 * AuthProvider (depende de useAuth pra sessao/email).
 */
import { createContext, useState, useCallback } from "react";
import { useSubscriptionView } from "../hooks/useSubscriptionView";

export const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  // reloadKey: bump via refetch() re-roda os fetches da D.2 (dep array dos hooks).
  const [reloadKey, setReloadKey] = useState(0);
  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  const { subscription, loading, error } = useSubscriptionView(reloadKey);

  const value = { subscription, loading, error, refetch };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}
