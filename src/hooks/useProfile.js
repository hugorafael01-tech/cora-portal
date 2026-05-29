/**
 * useProfile - leitura read-only do profile do usuario logado (Frente D / D.2).
 *
 * Le a tabela `profiles` direto do client supabase (browser, anon key) usando a
 * sessao JWT do usuario. A RLS `profiles_select_own` (user_id = auth.uid())
 * garante que cada usuario so enxerga a propria linha; o `.eq('user_id', userId)`
 * e redundante com a policy, mantido explicito por clareza.
 *
 * NAO cria endpoint server-side nem segundo client (reusa src/lib/supabase.js).
 * NAO escreve nada. NAO e consumido por telas de producao nesta etapa -- so pelo
 * painel de debug guardado (ver src/pages/DevFrenteD.jsx).
 *
 * Contrato: { profile, loading, error }
 *   - profile: objeto da linha (user_id, nome, whatsapp, cpf) ou null
 *              (sem sessao, ou usuario sem profile semeado).
 *   - loading: boolean (true ate auth hidratar + query resolver).
 *   - error:   objeto de erro do Supabase ou null. Nunca silenciado.
 *
 * Os casos "auth hidratando" e "sem sessao" sao DERIVADOS, nao setState sincrono
 * no effect -- o effect so dispara o fetch e escreve estado dentro do callback
 * async (evita cascading renders / lint react-hooks/set-state-in-effect).
 */
import { useState, useEffect } from "react";
import { useAuth } from "../auth/useAuth";
import { supabase } from "../lib/supabase";

export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  // Resultado do ultimo fetch + de qual userId ele e. `forUserId` deixa a
  // derivacao saber se o resultado em maos ja corresponde ao usuario atual.
  const [result, setResult] = useState({ data: null, error: null, forUserId: null });

  useEffect(() => {
    // Nada a buscar: auth ainda hidratando, ou sem sessao. Sem setState aqui.
    if (authLoading || !userId) return;

    // Flag de ignore: mesmo padrao do AuthProvider. Evita setState apos unmount
    // ou apos troca de usuario (a query antiga nao sobrescreve a nova).
    let ignore = false;

    supabase
      .from("profiles")
      .select("user_id,nome,whatsapp,cpf")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (ignore) return;
        setResult({ data: error ? null : (data ?? null), error: error ?? null, forUserId: userId });
      })
      .catch((err) => {
        // Defesa contra rejeicao inesperada do SDK (o caminho normal resolve
        // com { data, error }, mas nao engole um throw fora do contrato).
        if (ignore) return;
        const wrapped = err instanceof Error ? err : new Error(String(err));
        setResult({ data: null, error: wrapped, forUserId: userId });
      });

    return () => {
      ignore = true;
    };
  }, [userId, authLoading]);

  // `current`: o resultado em maos so vale se for do usuario atual. Enquanto
  // o fetch do usuario corrente nao chega, tratamos como carregando.
  const current = result.forUserId === userId;
  const loading = authLoading || (!!userId && !current);
  const profile = userId && current ? result.data : null;
  const error = userId && current ? result.error : null;

  return { profile, loading, error };
}
