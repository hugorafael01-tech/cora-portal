import { useState } from "react";
import { B, W, fb, fd, radii } from "../tokens";

/* ══════════════════════════════════════════
   CORA - Auth callback (magic link)
   /auth/callback

   Tela final do fluxo de entrada sem senha. O usuario clica no magic
   link e cai aqui. O client supabase esta em flow IMPLICIT com
   detectSessionInUrl=true (defaults; src/lib/supabase.js nao passa
   opcoes), entao o token chega no HASH (#access_token=...) e o SDK
   auto-processa a sessao no load do modulo, disparando SIGNED_IN.

   Por isso este componente NAO chama exchangeCodeForSession (isso seria
   PKCE). Ele apenas:
     - observa a sessao aparecer (via useAuth) e navega pra /
     - ou, em erro, le os params de erro que o SDK deixa no hash
       (#error=...&error_code=...&error_description=...) e mostra a tela
       de erro correspondente.

   Wiring (leitura do hash + navegacao) entra no commit seguinte.
   ══════════════════════════════════════════ */

/* ── Icones SVG inline. stroke 1.5, viewBox 24x24. Duplicados do Login
   (mesma decisao de B.2.2: sem extrair pra util). ── */
const IconAlert = ({ size = 18, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="13" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconClock = ({ size = 18, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

/* ── Variantes de erro. Supabase devolve o MESMO otp_expired pra link
   expirado e pra link ja usado (nao ha sinal client-side pra separar),
   entao colapsamos em 'known'. 'generic' cobre o resto. ── */
const ERROR_VARIANTS = {
  known: {
    Icon: IconClock,
    title: "Link expirado ou já usado",
    body: "Esse link não está mais válido. Pede um novo pra entrar.",
  },
  generic: {
    Icon: IconAlert,
    title: "Algo não deu certo",
    body: "Não conseguimos entrar agora. Tenta de novo em instantes.",
  },
};

/* ── Estilos compartilhados (mesma base do Login). ── */
const pageStyle = {
  minHeight: "100dvh",
  background: W[50],
  fontFamily: fb,
};

const bodyStyle = {
  maxWidth: 390,
  margin: "0 auto",
  padding: "40px 24px 0",
  textAlign: "center",
};

const h1Style = {
  fontFamily: fd,
  fontSize: 36,
  textTransform: "uppercase",
  letterSpacing: "0.02em",
  color: B[500],
  fontWeight: 400,
  lineHeight: 1.05,
  margin: 0,
};

const bodyTextStyle = {
  fontFamily: fb,
  fontSize: 15,
  fontWeight: 400,
  color: W[700],
  lineHeight: 1.55,
  // 16px acima (gap H1-corpo) e 32px abaixo (gap corpo-botao).
  margin: "16px 0 32px",
};

const ctaStyle = {
  width: "100%",
  height: 54,
  borderRadius: radii.md,
  border: "none",
  fontFamily: fb,
  fontSize: 16,
  fontWeight: 600,
  color: "#FFF",
  cursor: "pointer",
  transition: "background 150ms",
};

/* ── Spinner de 32px. Borda transparente com topo brand-500, girando via
   keyframe lg-spin injetado (mesma tecnica do Login). ── */
const Spinner = () => (
  <span
    className="lg-spin-ring"
    aria-hidden="true"
    style={{
      width: 32,
      height: 32,
      borderRadius: "50%",
      border: "3px solid transparent",
      borderTopColor: B[500],
      display: "inline-block",
    }}
  />
);

const LoadingScreen = () => (
  <div
    role="status"
    aria-live="polite"
    style={{
      minHeight: "100dvh",
      background: W[50],
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
    }}
  >
    <Spinner />
    <p style={{ fontFamily: fb, fontWeight: 400, fontSize: 15, color: W[700], margin: 0 }}>
      Entrando...
    </p>
    <style>{`
      @keyframes lg-spin { to { transform: rotate(360deg); } }
      .lg-spin-ring { animation: lg-spin 700ms linear infinite; transform-origin: 50% 50%; }
      @media (prefers-reduced-motion: reduce) {
        .lg-spin-ring { animation: none; }
      }
    `}</style>
  </div>
);

const ErrorScreen = ({ kind, onBack }) => {
  const variant = ERROR_VARIANTS[kind] || ERROR_VARIANTS.generic;
  const Icon = variant.Icon;
  const [hover, setHover] = useState(false);
  return (
    <div style={pageStyle}>
      <div style={bodyStyle}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <Icon size={48} color={B[500]} />
        </div>
        <h1 style={h1Style}>{variant.title}</h1>
        <p style={bodyTextStyle}>{variant.body}</p>
        <button
          type="button"
          onClick={onBack}
          onMouseOver={() => setHover(true)}
          onMouseOut={() => setHover(false)}
          style={{ ...ctaStyle, background: hover ? B[600] : B[500] }}
        >
          Voltar pro login
        </button>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   COMPONENTE PRINCIPAL
   Wiring (hash/sessao) entra no proximo commit; por ora renderiza loading.
   ══════════════════════════════════════════ */
export default function AuthCallback() {
  return <LoadingScreen />;
}
