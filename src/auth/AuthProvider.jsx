/**
 * AuthProvider - contexto de sessao Supabase pro portal.
 *
 * Prove { session, user, loading } via React Context. Hidrata a sessao
 * inicial via supabase.auth.getSession() e se inscreve em
 * supabase.auth.onAuthStateChange pra refletir SIGNED_IN, SIGNED_OUT,
 * TOKEN_REFRESHED e USER_UPDATED sem distincao especial.
 *
 * AuthContext default eh null. useAuth (B.1.3) checa esse null pra lancar
 * erro claro quando consumido fora deste Provider.
 *
 * Sem helpers de auth aqui (signInWithMagicLink, signOut). Esses ficam
 * em src/auth/useAuth.js (stubs na B.1, implementacao real na B.2).
 */
import { createContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Hidrata sessao inicial (storage local do SDK).
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          // Erro raro (storage corrompido, etc). Trata como deslogado
          // pra nao travar o app em loading.
          console.error("[AuthProvider] getSession error:", error);
          setSession(null);
        } else {
          setSession(data.session ?? null);
        }
        setLoading(false);
      })
      .catch((err) => {
        // Defesa contra mudanca futura no contrato do SDK (ex: rejeicao
        // da Promise em vez de error no resolve).
        if (!mounted) return;
        console.error("[AuthProvider] getSession unexpected error:", err);
        setSession(null);
        setLoading(false);
      });

    // Escuta mudancas de auth state. Callback unificado cobre todos os
    // eventos (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED, etc).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
