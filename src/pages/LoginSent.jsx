import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { B, W, fb, fd, radii } from "../tokens";
import { useAuth } from "../auth/useAuth";

/* ══════════════════════════════════════════
   CORA - Login Sent (apos disparar magic link)
   /login-sent

   Tela 2 do fluxo de entrada. Recebe email via location.state e
   oferece reenviar (com cooldown automatico de 60s) ou voltar pra /login.
   Sem location.state.email (acesso direto, F5 perdendo state), redireciona
   pra /login. Rate-limit do Supabase reinicia o cooldown com o N retornado
   pela mensagem (ou 60s default); erros genericos so logam (banner de erro
   pro reenvio fica como follow-up, fora do escopo de B.2.2/2.3).
   ══════════════════════════════════════════ */

/* ── Icones SVG inline. stroke 1.5, viewBox 24x24. ── */
const IconCheck = ({ size = 18, color = "currentColor" }) => (
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
    <polyline points="20 6 9 17 4 12" />
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

const IconArrowLeft = ({ size = 16, color = "currentColor" }) => (
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
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

/* Spinner CSS-animated. Mesma classe lg-spinner do Login.jsx (keyframe
   redefinido localmente; CSS dedupe pelo browser nao e problema). */
const Spinner = ({ size = 16, color = "currentColor" }) => (
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

/* ── Banner inline (success / warning). Body recebe ReactNode. ── */
const BANNER_VARIANTS = {
  success: {
    bg: "#D1FAE5",
    border: "#6EE7B7",
    color: "#065F46",
    Icon: IconCheck,
  },
  warning: {
    bg: "#FEF3C7",
    border: "#FCD34D",
    color: "#92400E",
    Icon: IconClock,
  },
};

const Banner = ({ kind, body }) => {
  const v = BANNER_VARIANTS[kind] || BANNER_VARIANTS.success;
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
  textAlign: "center",
};

const coracaoWrap = {
  display: "flex",
  justifyContent: "center",
  marginBottom: 24,
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

const corpoStyle = {
  fontFamily: fb,
  fontSize: 15,
  color: W[700],
  lineHeight: 1.55,
  margin: "14px 0 28px",
};

const emailHighlightStyle = {
  fontFamily: fb,
  fontWeight: 600,
  color: W[800],
  wordBreak: "break-all",
};

/* CTA secundario (stroke azul). Quando em cooldown, vira cinza disabled.
   Spinner aparece quando state === 'loading'. */
const ctaSecondaryBase = {
  width: "100%",
  height: 52,
  borderRadius: radii.md,
  fontFamily: fb,
  fontSize: 16,
  fontWeight: 600,
  background: "transparent",
  transition: "background 150ms, border-color 150ms, color 150ms",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const ctaSecondaryByState = (state) => {
  if (state === "idle") {
    return {
      border: `1.5px solid ${B[500]}`,
      color: B[500],
      cursor: "pointer",
    };
  }
  if (state === "loading") {
    return {
      border: `1.5px solid ${B[600]}`,
      color: B[600],
      cursor: "wait",
    };
  }
  // cooldown
  return {
    border: `1.5px solid ${W[300]}`,
    color: W[500],
    cursor: "not-allowed",
  };
};

const finePrintStyle = {
  fontFamily: fb,
  fontSize: 12.5,
  color: W[500],
  lineHeight: 1.5,
  margin: "20px 0 0",
};

const backRowStyle = {
  display: "flex",
  justifyContent: "center",
  marginTop: 24,
};

const backLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "transparent",
  border: "none",
  padding: "8px 4px",
  fontFamily: fb,
  fontSize: 14,
  color: B[500],
  cursor: "pointer",
  textDecoration: "underline",
  textDecorationColor: B[500],
};

/* ── Helpers de copy ── */
const parseCooldownSeconds = (state) => {
  // state pode ser 'idle' | 'loading' | 'cooldown:N'
  if (typeof state !== "string") return 0;
  const m = state.match(/^cooldown:(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
};

const ctaLabel = (state) => {
  if (state === "loading") {
    return (
      <>
        <Spinner size={16} color={B[600]} />
        Reenviando...
      </>
    );
  }
  const seconds = parseCooldownSeconds(state);
  if (seconds > 0) return `Reenviar em ${seconds}s`;
  return "Reenviar link";
};

/* ── Detecao de rate-limit do Supabase ──
   Duplicado de Login.jsx pra zero acoplamento entre as duas telas. Se uma
   terceira tela precisar destes helpers, extrair pra util compartilhado. */
const RATE_LIMIT_REGEX = /rate.?limit|only request this after/i;
const RATE_LIMIT_DEFAULT_SECONDS = 60;

const isRateLimitError = (err) => {
  if (!err) return false;
  if (err.status === 429) return true;
  if (typeof err.message === "string" && RATE_LIMIT_REGEX.test(err.message)) return true;
  return false;
};

const extractCooldownSeconds = (msg) => {
  if (typeof msg !== "string") return null;
  const m = msg.match(/(\d+)\s*seconds?/i);
  return m ? parseInt(m[1], 10) : null;
};

const INITIAL_COOLDOWN_SECONDS = 60;
const JUST_RESENT_TTL_MS = 4000;

/* ══════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════ */

export default function LoginSent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signInWithMagicLink } = useAuth();

  // Email vem do location.state setado por Login.jsx no submit. Acesso direto
  // a /login-sent ou F5 (que zera o history state) cai no guard de redirect.
  const email = location.state?.email;

  // Cooldown inicia em 60s automaticamente: usuario acabou de receber o
  // primeiro link, faz pouco sentido reenviar imediato (a tela existe pra
  // dar feedback do envio, nao pra disparar reenvios em rajada).
  const [cooldownSeconds, setCooldownSeconds] = useState(INITIAL_COOLDOWN_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  // justResent: controla banner success "Link reenviado" com auto-hide 4s.
  const [justResent, setJustResent] = useState(false);

  // Guard onMount: sem email vindo de location.state, vai pra /login.
  // replace:true pra nao deixar /login-sent no historico (back button do
  // browser nao traz o usuario de volta a uma tela quebrada).
  useEffect(() => {
    if (!email) navigate("/login", { replace: true });
  }, [email, navigate]);

  // Countdown do cooldown. setTimeout em cascata - mesmo padrao do Login.jsx
  // pra coerencia entre as duas telas. Cada tick re-executa o effect com o
  // novo cooldownSeconds; cleanup cancela o timer anterior; ao chegar em 0,
  // effect retorna undefined e o ciclo para.
  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined;
    const id = setTimeout(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(id);
  }, [cooldownSeconds]);

  // Auto-hide do banner success apos 4s. Cleanup cobre tanto unmount quanto
  // novo reenvio (que re-dispara justResent=true antes do 4s anterior expirar).
  useEffect(() => {
    if (!justResent) return undefined;
    const id = setTimeout(() => setJustResent(false), JUST_RESENT_TTL_MS);
    return () => clearTimeout(id);
  }, [justResent]);

  const onClickResend = async () => {
    if (submitting || cooldownSeconds > 0) return;
    setSubmitting(true);
    try {
      await signInWithMagicLink(email);
      // Os 3 setStates batcham num so commit no React 19, evitando flash
      // visual entre loading -> idle -> cooldown.
      setSubmitting(false);
      setCooldownSeconds(INITIAL_COOLDOWN_SECONDS);
      setJustResent(true);
    } catch (err) {
      setSubmitting(false);
      if (isRateLimitError(err)) {
        const n = extractCooldownSeconds(err?.message) ?? RATE_LIMIT_DEFAULT_SECONDS;
        // Sem banner adicional aqui: o proprio cooldown ja comunica que
        // o usuario precisa esperar (briefing 3.2 / decisao item 3).
        setCooldownSeconds(n);
      } else {
        // Banner de erro pro reenvio fica como follow-up explicito.
        // Por ora, log e libera nova tentativa.
        console.error("[LoginSent] resend error:", err);
      }
    }
  };

  const onClickBack = () => {
    navigate("/login", { replace: true });
  };

  // Se nao tem email, esconde a render enquanto navigate dispara (evita
  // flash de tela com email vazio). Order matters: hooks acima, return abaixo.
  if (!email) return null;

  // resendState derivado: alimenta ctaLabel + ctaSecondaryByState helpers.
  const resendState = submitting
    ? "loading"
    : cooldownSeconds > 0
      ? `cooldown:${cooldownSeconds}`
      : "idle";
  const ctaDisabled = submitting || cooldownSeconds > 0;

  return (
    <div style={pageStyle}>
      <div style={bodyStyle}>
        <div style={coracaoWrap}>
          <img
            src="/images/grafismo_coracao.svg"
            alt=""
            aria-hidden="true"
            style={{ width: 44, height: "auto" }}
          />
        </div>

        <h1 style={h1Style}>Link enviado</h1>

        <p style={corpoStyle}>
          Foi pra <span style={emailHighlightStyle}>{email}</span>. Clica e entra direto, de
          qualquer aparelho.
        </p>

        {justResent && (
          <Banner kind="success" body="Link reenviado. Confere a caixa de entrada." />
        )}

        <button
          type="button"
          onClick={onClickResend}
          disabled={ctaDisabled}
          aria-busy={resendState === "loading"}
          aria-disabled={ctaDisabled || undefined}
          style={{ ...ctaSecondaryBase, ...ctaSecondaryByState(resendState) }}
        >
          {ctaLabel(resendState)}
        </button>

        <p style={finePrintStyle}>O link funciona por uma hora. Vale checar o spam.</p>

        <div style={backRowStyle}>
          <button
            type="button"
            onClick={onClickBack}
            style={backLinkStyle}
            aria-label="Voltar para a tela de login"
          >
            <IconArrowLeft size={14} color={B[500]} />
            Email errado? Voltar
          </button>
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
