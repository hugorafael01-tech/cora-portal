/**
 * useSubscription - leitura read-only da assinatura do usuario logado
 * (Frente D / D.2).
 *
 * Le a tabela `subscriptions` direto do client supabase (browser, anon key)
 * usando a sessao JWT do usuario. A RLS `subscriptions_select_own`
 * (auth.uid() = user_id) garante que cada usuario so enxerga a propria linha;
 * o `.eq('user_id', userId)` e redundante com a policy, mantido explicito.
 *
 * Le o SHAPE NOVO (qty_*, zona_entrega, asaas_*, endereco, timestamps). Ignora
 * de proposito as colunas legadas (itens, total_paes, valor_*), que serao
 * dropadas na migration de contract. Modelo de assinatura unica: no maximo uma
 * linha por usuario -> .maybeSingle().
 *
 * NAO cria endpoint server-side nem segundo client (reusa src/lib/supabase.js).
 * NAO escreve nada. NAO e consumido por telas de producao nesta etapa -- so
 * pelo painel de debug guardado (ver src/pages/DevFrenteD.jsx).
 *
 * Contrato: { subscription, loading, error }
 *   - subscription: objeto da linha ou null (sem sessao, ou usuario sem
 *                   assinatura). Linhas legadas tem user_id NULL, entao a RLS
 *                   nao as retorna ate o backfill (D.3/D.4).
 *   - loading: boolean (true ate auth hidratar + query resolver).
 *   - error:   objeto de erro do Supabase ou null. Nunca silenciado.
 *              Inclui o caso de .maybeSingle() achar >1 linha (dado
 *              inconsistente no modelo unico): propagado, nao mascarado.
 *
 * Os casos "auth hidratando" e "sem sessao" sao DERIVADOS, nao setState sincrono
 * no effect -- o effect so dispara o fetch e escreve estado dentro do callback
 * async (evita cascading renders / lint react-hooks/set-state-in-effect).
 */
import { useState, useEffect } from "react";
import { useAuth } from "../auth/useAuth";
import { supabase } from "../lib/supabase";

// Colunas do shape novo. Legadas (itens, total_paes, valor_*) ficam de fora
// de proposito -- serao dropadas na contract (task 86e1mc0ta).
const SUBSCRIPTION_COLUMNS =
  "id,status,qty_total,qty_original,qty_integral,zona_entrega," +
  "cep,rua,numero,complemento,bairro,cidade,estado," +
  "asaas_customer_id,asaas_subscription_id," +
  "created_at,updated_at,activated_at,paused_at,cancelled_at";

export function useSubscription() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  // Resultado do ultimo fetch + de qual userId ele e (ver useProfile).
  const [result, setResult] = useState({ data: null, error: null, forUserId: null });

  useEffect(() => {
    // Nada a buscar: auth ainda hidratando, ou sem sessao. Sem setState aqui.
    if (authLoading || !userId) return;

    // Flag de ignore: evita setState apos unmount ou troca de usuario.
    let ignore = false;

    supabase
      .from("subscriptions")
      .select(SUBSCRIPTION_COLUMNS)
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        // error inclui o caso de >1 linha do maybeSingle (dado inconsistente).
        if (ignore) return;
        setResult({ data: error ? null : (data ?? null), error: error ?? null, forUserId: userId });
      })
      .catch((err) => {
        if (ignore) return;
        const wrapped = err instanceof Error ? err : new Error(String(err));
        setResult({ data: null, error: wrapped, forUserId: userId });
      });

    return () => {
      ignore = true;
    };
  }, [userId, authLoading]);

  const current = result.forUserId === userId;
  const loading = authLoading || (!!userId && !current);
  const subscription = userId && current ? result.data : null;
  const error = userId && current ? result.error : null;

  return { subscription, loading, error };
}
