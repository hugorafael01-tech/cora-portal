/**
 * DevFrenteD - painel de debug TEMPORARIO e GUARDADO da Frente D / D.2.
 *
 * Renderiza o JSON cru de useProfile() e useSubscription() pra smoke test em
 * preview, ja que os hooks ainda nao sao consumidos por nenhuma tela de
 * producao nesta etapa.
 *
 * GUARD (duplo, ver tambem o registro da rota em App.jsx):
 *   1. A rota /dev/frente-d so EXISTE quando DEV_TOOLS_ENABLED (App.jsx):
 *      import.meta.env.DEV (dev local) OU VITE_ENABLE_DEV_TOOLS === 'true'
 *      (ligado so no ambiente Preview da Vercel). Em Production o flag fica
 *      off e DEV e false, entao a rota nem e registrada.
 *   2. Alem do flag, exige ?dev na URL pra renderizar. Sem ?dev -> redirect /.
 *
 * Mantido atras do guard (nao removido) por ser reaproveitavel em D.3/D.4.
 * NUNCA mergear exposto em producao -- ver declaracao no PR.
 */
import { Navigate, useLocation } from "react-router-dom";
import { useProfile } from "../hooks/useProfile";
import { useSubscription } from "../hooks/useSubscription";
import { useAuth } from "../auth/useAuth";

const mono = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12,
  lineHeight: 1.5,
};

function Block({ title, state }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 14, margin: "0 0 8px", ...mono }}>{title}</h2>
      <pre
        style={{
          ...mono,
          background: "#0b1021",
          color: "#d6e2ff",
          padding: 12,
          borderRadius: 8,
          overflowX: "auto",
          margin: 0,
        }}
      >
        {JSON.stringify(state, null, 2)}
      </pre>
    </section>
  );
}

export default function DevFrenteD() {
  const location = useLocation();
  const { user, loading: authLoading, signOut } = useAuth();
  const profileState = useProfile();
  const subscriptionState = useSubscription();

  // Segundo fator do guard: alem do flag (rota so existe sob DEV_TOOLS_ENABLED),
  // exige ?dev. Sem ?dev, nao renderiza o painel.
  const hasDevParam = new URLSearchParams(location.search).has("dev");
  if (!hasDevParam) return <Navigate to="/" replace />;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, ...mono }}>
      <h1 style={{ fontSize: 16, marginTop: 0 }}>Frente D / D.2 - debug (read-only)</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        Painel temporario guardado. Nao existe em producao. Hooks nao consumidos
        por telas reais nesta etapa.
      </p>

      <Block title="auth" state={{ authLoading, userId: user?.id ?? null, email: user?.email ?? null }} />
      <Block title="useProfile()" state={profileState} />
      <Block title="useSubscription()" state={subscriptionState} />

      {user && (
        <button
          type="button"
          onClick={() => { signOut().catch(() => {}); }}
          style={{ ...mono, padding: "8px 14px", cursor: "pointer" }}
        >
          Sair (testar estado deslogado)
        </button>
      )}
    </main>
  );
}
