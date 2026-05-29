import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { loadSubscription } from "../utils/subscription";

/* ==========================================
   CORA - ProtectedRoute
   Gate das rotas autenticadas (Home, Assinatura, Cardapio, Perfil).

   Substitui o antigo RequireSubscription (gate so por localStorage). Agora
   considera a sessao real do Supabase (via useAuth) E a assinatura
   persistida, preservando o fluxo dev (?dev=1 -> /onboarding) durante a
   transicao pre-Alpha.

   Layout-route: retorna <Outlet/>, e o Layout (shell autenticado) fica
   aninhado abaixo deste gate em App.jsx.
   ========================================== */
export default function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  // Aguarda o AuthProvider terminar de hidratar a sessao do Supabase. Evita
  // um flash de /login antes de getSession resolver no mount.
  if (loading) return null;

  // Fonte de verdade do gate: a chave cora_subscription guarda o payload
  // (objeto JSON) da assinatura, nao a string "true" -- por isso
  // loadSubscription() (parse + null-safe), nao getItem(...) === "true".
  const hasSubscription = !!loadSubscription();
  const dev = !!new URLSearchParams(window.location.search).get("dev");

  if (!hasSubscription) {
    // Modo dev sem assinatura: onboarding fake (fluxo de teste preservado).
    if (dev) return <Navigate to="/onboarding" replace />;
    // Logado mas sem assinatura: funil pre-Alpha.
    if (session) return <Navigate to="/interesse" replace />;
    // Sem sessao e sem assinatura: precisa logar. Deep link preservado em
    // state.from (o Login persiste em localStorage por sobreviver a saida do
    // browser pra abrir o email).
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Tem assinatura (com ou sem sessao): entra. <Outlet/> renderiza o Layout
  // aninhado e, dentro dele, a pagina da rota.
  return <Outlet />;
}
