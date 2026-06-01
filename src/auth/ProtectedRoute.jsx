import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useSubscriptionContext } from "./useSubscriptionContext";
import { B, W } from "../tokens";

/* ==========================================
   CORA - ProtectedRoute
   Gate das rotas autenticadas (Home, Assinatura, Cardapio, Perfil).

   Frente D / D.4: a fonte de verdade do gate passou do snapshot localStorage
   (cora_subscription) pra leitura do DB via SubscriptionProvider. Considera a
   sessao real do Supabase (useAuth) E a assinatura persistida (DB), preservando
   o fluxo dev (?dev=1 -> /onboarding).

   Ordem dos estados (importa):
     1. auth hidratando        -> loader (sem decidir)
     2. assinatura carregando  -> loader (NAO redireciona; senao pisca /interesse
                                  ou tranca assinante real durante o fetch)
     3. erro de leitura do DB  -> retry (NUNCA /interesse; blip de rede nao pode
                                  bouncar assinante pra waitlist)
     4. tem assinatura         -> <Outlet/>
     5. sem assinatura         -> dev? /onboarding : sessao? /interesse : /login

   Layout-route: retorna <Outlet/>, e o Layout (shell autenticado) fica
   aninhado abaixo deste gate em App.jsx.
   ========================================== */

// Loader minimo (grafismo da marca), espelha o lazyFallback do App. Evita o
// flash de blank/login enquanto auth + leitura do DB resolvem.
function GateLoader() {
  return (
    <div style={{ position: "fixed", inset: 0, background: W[50], display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img src="/images/grafismo_coracao.svg" alt="Cora" style={{ width: 48, height: 48, opacity: 0.6 }} />
    </div>
  );
}

export default function ProtectedRoute() {
  const { session, loading: authLoading } = useAuth();
  const { subscription, loading: subLoading, error, refetch } = useSubscriptionContext();
  const location = useLocation();

  // 1. Aguarda o AuthProvider hidratar a sessao (evita flash de /login).
  if (authLoading) return <GateLoader />;

  const dev = !!new URLSearchParams(window.location.search).get("dev");

  // Sem sessao: a leitura do DB nem dispara (sem JWT). Decide direto.
  if (!session) {
    // Modo dev sem assinatura: onboarding fake (fluxo de teste preservado).
    if (dev) return <Navigate to="/onboarding" replace />;
    // Sem sessao e sem assinatura: precisa logar. Deep link preservado em
    // state.from (o Login persiste em localStorage por sobreviver a saida do
    // browser pra abrir o email).
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // 2. Com sessao: enquanto le a assinatura do DB, NAO redireciona.
  if (subLoading) return <GateLoader />;

  // 3. Erro de leitura: nao vira /interesse. Mostra retry (mantem assinante
  // real no lugar; um erro de fetch nao pode jogar pra waitlist).
  if (error) {
    return (
      <div style={{ position: "fixed", inset: 0, background: W[50], display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
        <img src="/images/grafismo_coracao.svg" alt="" aria-hidden="true" style={{ width: 40, height: 40, opacity: 0.5 }} />
        <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 15, color: W[600], maxWidth: 300 }}>
          Nao conseguimos carregar seus dados agora. Verifique sua conexao e tente de novo.
        </div>
        <button
          onClick={refetch}
          style={{ fontFamily: "system-ui, sans-serif", fontSize: 14, fontWeight: 600, color: "#fff", background: B[500], border: "none", borderRadius: 999, padding: "10px 24px", cursor: "pointer" }}
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  // 4. Carregou e tem assinatura: entra. <Outlet/> renderiza o Layout aninhado.
  if (subscription) return <Outlet />;

  // 5. Carregou e NAO tem assinatura.
  // Modo dev: onboarding fake (fluxo de teste preservado, ponto 16 do briefing).
  if (dev) return <Navigate to="/onboarding" replace />;
  // Logado sem assinatura: funil pre-Alpha (mantem destino; nao /onboarding).
  return <Navigate to="/interesse" replace />;
}
