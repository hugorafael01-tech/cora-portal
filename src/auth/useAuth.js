import { useContext } from "react";
import { AuthContext } from "./AuthProvider";
import { supabase } from "../lib/supabase";

// Helpers em escopo de modulo: referencia estavel entre renders, sem
// precisar de useCallback no consumidor.
//
// Contrato: throw em erro, resolve void em sucesso. Alinhado com o
// padrao das funcoes em src/utils/api.js (postSubscription, etc.) e
// com o try/catch idiomatico ja usado em Onboarding.jsx. Nao vazam o
// shape { data, error } do SDK Supabase pros callers.

/**
 * Dispara magic link de acesso pro email informado.
 *
 * Em sucesso, resolve void (o `data` retornado pelo SDK em
 * signInWithOtp e {user: null, session: null} ate o usuario clicar no
 * link e o /auth/callback rodar verifyOtp). Em erro real do SDK
 * (rede, dashboard offline, etc), throw o objeto error original.
 *
 * Por design do Supabase, email desconhecido NAO eh erro: o SDK
 * resolve com sucesso silencioso (anti-enumeracao). A UI da /login
 * sempre redireciona pra /login-sent sem revelar se o email existe.
 */
async function signInWithMagicLink(email) {
  // shouldCreateUser fica em default (true) ate Frente C implementar signUp
  // explicito no T2 do PreCadastro. Anti-enumeracao ja eh fornecida pelo
  // Supabase (silent-success pra email desconhecido). Endurecer pra false
  // quando signUp explicito existir.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
}

/**
 * Verifica o codigo numerico (OTP) que chega no MESMO email do magic
 * link (o template inclui {{ .Token }} alem do link). Em sucesso o SDK
 * grava a sessao e dispara SIGNED_IN -- efeito identico ao clique no
 * link -- e resolve void. Em erro (codigo invalido/expirado, rede),
 * throw o objeto error original do SDK.
 *
 * O caller passa o token ja sanitizado (so digitos); aqui nao ha
 * validacao de formato.
 */
async function verifyEmailOtp(email, token) {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error) throw error;
}

/**
 * Encerra a sessao do usuario corrente.
 *
 * Em sucesso, resolve void. Em erro real do SDK, throw.
 *
 * Cleanup de localStorage relacionado a dados do app (subscription
 * cache, etc.) eh responsabilidade do caller (B.2.5 - botao "Sair"
 * no Perfil). Este helper so encerra a sessao Supabase.
 */
async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Hook de auth do portal. Le sessao via AuthContext e expoe helpers.
 *
 * Retorna:
 *   - session: Session | null      (objeto Supabase, ou null se deslogado)
 *   - user:    User | null         (atalho pra session?.user)
 *   - loading: boolean             (true ate getSession resolver no mount)
 *   - signInWithMagicLink(email):  dispara magic link; throw em erro,
 *                                  resolve void em sucesso (inclui o
 *                                  caso de email desconhecido)
 *   - verifyEmailOtp(email, token): valida o codigo do email (mesma
 *                                  sessao do link); throw em erro,
 *                                  resolve void em sucesso
 *   - signOut():                   encerra sessao; throw em erro,
 *                                  resolve void em sucesso
 *
 * Lanca Error se usado fora de <AuthProvider>.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return { ...context, signInWithMagicLink, verifyEmailOtp, signOut };
}
