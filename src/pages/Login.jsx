import { useState } from "react";
import { B, W, fb, fd, radii } from "../tokens";

/* ══════════════════════════════════════════
   CORA - Login (magic link)
   /login

   Tela 1 do fluxo de entrada sem senha. Usuario digita email,
   submit dispara signInWithMagicLink (wired no commit 2 desta frente)
   e navega pra /login-sent passando o email via location.state.
   ══════════════════════════════════════════ */

/* ── Icones SVG inline. stroke 1.5, viewBox 24x24. ── */
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

/* Spinner CSS-animated. Classe lg-spinner aplica keyframe lg-spin
   (definido no <style> ao final do componente). */
const Spinner = ({ size = 18, color = "currentColor" }) => (
  <svg
    className="lg-spinner"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M12 3 a 9 9 0 0 1 9 9" />
  </svg>
);

/* ── Banner inline (danger / warning). Body recebe ReactNode. ── */
const BANNER_VARIANTS = {
  danger: {
    bg: "#FEE2E2",
    border: "#FCA5A5",
    color: "#991B1B",
    Icon: IconAlert,
  },
  warning: {
    bg: "#FEF3C7",
    border: "#FCD34D",
    color: "#92400E",
    Icon: IconClock,
  },
};

const Banner = ({ kind, body }) => {
  const v = BANNER_VARIANTS[kind] || BANNER_VARIANTS.danger;
  const Icon = v.Icon;
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        width: "100%",
        boxSizing: "border-box",
        padding: "12px 14px",
        marginBottom: 16,
        background: v.bg,
        border: `1px solid ${v.border}`,
        color: v.color,
        borderRadius: radii.md,
        fontFamily: fb,
        fontSize: 13.5,
        lineHeight: 1.5,
      }}
    >
      <span style={{ flexShrink: 0, marginTop: 1, display: "inline-flex" }}>
        <Icon size={18} color={v.color} />
      </span>
      <span style={{ flex: 1 }}>{body}</span>
    </div>
  );
};

/* ── Estilos compartilhados (constantes) ── */
const pageStyle = {
  minHeight: "100dvh",
  background: W[50],
  fontFamily: fb,
};

const bodyStyle = {
  maxWidth: 390,
  margin: "0 auto",
  padding: "40px 24px 0",
};

const h1Style = {
  fontFamily: fd,
  fontSize: 36,
  textTransform: "uppercase",
  letterSpacing: "0.02em",
  color: B[500],
  fontWeight: 400,
  lineHeight: 1.1,
  margin: 0,
};

const subStyle = {
  fontFamily: fb,
  fontSize: 15,
  color: W[700],
  lineHeight: 1.55,
  margin: "10px 0 28px",
};

const labelStyle = {
  display: "block",
  fontFamily: fb,
  fontSize: 13,
  fontWeight: 500,
  color: W[700],
  marginBottom: 6,
  lineHeight: 1.3,
};

const inputStyle = (hasError) => ({
  width: "100%",
  height: 52,
  boxSizing: "border-box",
  borderRadius: radii.md,
  border: `1.5px solid ${hasError ? "#DC2626" : W[300]}`,
  padding: "0 16px",
  fontSize: 16,
  fontFamily: fb,
  color: W[800],
  background: "#FFF",
  outline: "none",
  transition: "border-color 150ms",
});

const inlineErrorStyle = {
  fontFamily: fb,
  fontSize: 13,
  color: "#DC2626",
  marginTop: 6,
  lineHeight: 1.4,
};

const ctaBaseStyle = {
  width: "100%",
  height: 52,
  borderRadius: radii.md,
  border: "none",
  fontFamily: fb,
  fontSize: 16,
  fontWeight: 600,
  color: "#FFF",
  transition: "background 150ms",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const ctaVisualByState = (state) => {
  if (state === "disabled") {
    return { background: W[300], color: W[500], cursor: "not-allowed" };
  }
  if (state === "loading") {
    return { background: B[600], cursor: "wait" };
  }
  return { background: B[500], cursor: "pointer" };
};

/* ══════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (v) => EMAIL_RE.test(v.trim());
const INLINE_ERROR_MSG = "Confira o email. Falta o final, como .com ou .com.br.";

export default function Login() {
  // Email armazenado como digitado (sem trim em tempo real).
  const [email, setEmail] = useState("");
  // touched: primeiro blur marca; controla quando inputError aparece.
  const [touched, setTouched] = useState(false);
  // ctaState: 'disabled' | 'enabled' | 'loading'
  const [ctaState, setCtaState] = useState("disabled");
  const [inputError, setInputError] = useState(null);
  // errorBanner: { kind: 'danger' | 'warning', body: ReactNode } | null
  const [errorBanner, setErrorBanner] = useState(null);

  const onChange = (e) => {
    const v = e.target.value;
    setEmail(v);
    const valid = isValidEmail(v);
    setCtaState(valid ? "enabled" : "disabled");
    // Erro de rede some ao digitar; warning de rate-limit fica ate countdown zerar.
    if (errorBanner?.kind === "danger") setErrorBanner(null);
    // Erro inline so aparece depois do primeiro blur.
    setInputError(touched && !valid && v.length > 0 ? INLINE_ERROR_MSG : null);
  };

  const onBlur = (e) => {
    setTouched(true);
    const valid = isValidEmail(email);
    setInputError(email.length > 0 && !valid ? INLINE_ERROR_MSG : null);
    // Mantem cor do erro se erro persiste, senao volta pra cor padrao.
    e.target.style.borderColor = !valid && email.length > 0 ? "#DC2626" : W[300];
  };

  const onFocus = (e) => {
    e.target.style.borderColor = inputError ? "#DC2626" : B[500];
  };

  const onSubmit = (e) => {
    if (e) e.preventDefault();
    if (ctaState !== "enabled") return;
    // Wiring com signInWithMagicLink vem no proximo commit desta frente.
  };

  return (
    <div style={pageStyle}>
      <div style={bodyStyle}>
        <h1 style={h1Style}>Entrar</h1>
        <p style={subStyle}>Sem senha. Um link no seu email destrava a entrada.</p>

        {errorBanner && <Banner kind={errorBanner.kind} body={errorBanner.body} />}

        <form onSubmit={onSubmit} noValidate>
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="login-email" style={labelStyle}>
              Email
            </label>
            <input
              id="login-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={onChange}
              onBlur={onBlur}
              onFocus={onFocus}
              placeholder="seu@email.com"
              style={inputStyle(!!inputError)}
              aria-invalid={!!inputError}
              aria-describedby={inputError ? "login-email-error" : undefined}
            />
            {inputError && (
              <div id="login-email-error" style={inlineErrorStyle}>
                {inputError}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={ctaState !== "enabled"}
            aria-busy={ctaState === "loading"}
            style={{ ...ctaBaseStyle, ...ctaVisualByState(ctaState) }}
            onMouseOver={(e) => {
              if (ctaState === "enabled") e.currentTarget.style.background = B[600];
            }}
            onMouseOut={(e) => {
              if (ctaState === "enabled") e.currentTarget.style.background = B[500];
            }}
          >
            {ctaState === "loading" ? (
              <>
                <Spinner size={18} color="#FFF" />
                Enviando...
              </>
            ) : (
              "Enviar link"
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: 28,
            fontFamily: fb,
            fontSize: 14,
            color: W[600],
            lineHeight: 1.5,
          }}
        >
          Ainda não conhece?{" "}
          <a
            href="https://acora.com.br"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: B[500], textDecoration: "underline" }}
          >
            Conheça a padaria.
          </a>
        </div>
      </div>

      <style>{`
        @keyframes lg-spin { to { transform: rotate(360deg); } }
        .lg-spinner { animation: lg-spin 700ms linear infinite; transform-origin: 50% 50%; }
        @media (prefers-reduced-motion: reduce) {
          .lg-spinner { animation: none; }
        }
      `}</style>
    </div>
  );
}
