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

/* Email sem conta cadastrada, com shouldCreateUser: false.
   Verificado contra o Supabase do projeto (30/07/2026): HTTP 422,
   header x-sb-error-code: otp_disabled, body {"error_code":
   "otp_disabled", "msg":"Signups not allowed for otp"}. Checa o code e,
   como rede de seguranca, a mensagem -- `code` so existe no auth-js
   >= 2.44 (projeto em 2.105.4). Nao casa por status 422 sozinho: esse
   status tambem cobre email_provider_disabled, que eh falha real de
   configuracao e precisa aparecer como erro de envio. */
const UNKNOWN_EMAIL_CODE = "otp_disabled";
const UNKNOWN_EMAIL_MESSAGE_RE = /signups not allowed/i;

function isUnknownEmailError(error) {
  if (!error) return false;
  if (error.code === UNKNOWN_EMAIL_CODE) return true;
  return typeof error.message === "string" && UNKNOWN_EMAIL_MESSAGE_RE.test(error.message);
}

/**
 * Dispara magic link de acesso pro email informado.
 *
 * Em sucesso, resolve void (o `data` retornado pelo SDK em
 * signInWithOtp e {user: null, session: null} ate o usuario clicar no
 * link e o /auth/callback rodar verifyOtp). Em erro real do SDK
 * (rede, dashboard offline, rate limit), throw o objeto error original.
 *
 * Email desconhecido NAO eh erro pro caller: o SDK devolve otp_disabled
 * e este helper engole esse caso, resolvendo void. A UI da /login sempre
 * redireciona pra /login-sent sem revelar se o email existe. Mesmo
 * contrato de antes -- o que muda eh que a anti-enumeracao passa a ser
 * garantida aqui, e nao mais pelo sucesso silencioso do Supabase.
 */
async function signInWithMagicLink(email) {
  // shouldCreateUser: false -- login NUNCA cria conta. Quem cadastra eh o
  // POST /api/subscriptions (admin.createUser) no fim do onboarding.
  // Com o default (true), email digitado errado na /login virava usuario
  // novo sem assinatura: a pessoa recebia o link, entrava e caia no
  // /interesse sem ter errado nada visivel.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      shouldCreateUser: false,
    },
  });
  // Email sem conta vira sucesso: a tela seguinte precisa ser identica
  // pros dois casos, senao a enumeracao de assinantes fica trivial.
  // Falha real de envio (rede, 429) continua subindo pro caller.
  if (error && !isUnknownEmailError(error)) throw error;
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
