import { useContext } from "react";
import { AuthContext } from "./AuthProvider";

// Stubs B.1 - module-level pra ter referencia estavel entre renders.
// B.2 substitui por implementacao real via supabase.auth.signInWithOtp e
// supabase.auth.signOut. Assinaturas (args e Promise) ja sao as finais
// pra que consumidores nao precisem mudar quando a versao real chegar.
async function signInWithMagicLink(_email) {
  console.warn("[useAuth] signInWithMagicLink: stub B.1, implementacao real vem na B.2");
}

async function signOut() {
  console.warn("[useAuth] signOut: stub B.1, implementacao real vem na B.2");
}

/**
 * Hook de auth do portal. Le sessao via AuthContext e expoe helpers.
 *
 * Retorna:
 *   - session: Session | null      (objeto Supabase, ou null se deslogado)
 *   - user:    User | null         (atalho pra session?.user)
 *   - loading: boolean             (true ate getSession resolver no mount)
 *   - signInWithMagicLink(email):  stub na B.1, real na B.2
 *   - signOut():                   stub na B.1, real na B.2
 *
 * Lanca Error se usado fora de <AuthProvider>.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return { ...context, signInWithMagicLink, signOut };
}
