import { useState } from "react";
import { B, W, fb, fd, radii } from "../tokens";
import { formatWhatsApp, isValidWhatsApp } from "../utils/validators";

/**
 * Card de "fora de cobertura". Dois estados:
 *  - awareness: pergunta se quer ser avisado, captura WhatsApp
 *  - submitted: confirmacao + botao "Tentar outro CEP"
 *
 * Props:
 *  - whatsappFromForm? — pre-popula campo (vem da T1)
 *  - cep, bairro?, cidade?, estado? — vao no payload da waitlist
 *  - onSubmitWaitlist(payload) => Promise<void>
 *  - onTryOtherCEP() => limpa CEP no pai (volta ao default da T1)
 *  - whatsappLink — URL wa.me com mensagem ja codificada
 */
export default function CoverageBlocker({
  whatsappFromForm = "",
  cep,
  bairro = "",
  cidade = "",
  estado = "",
  onSubmitWaitlist,
  onTryOtherCEP,
  whatsappLink,
}) {
  const [phase, setPhase] = useState("awareness");
  const [whatsapp, setWhatsapp] = useState(formatWhatsApp(whatsappFromForm));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [whatsappError, setWhatsappError] = useState(null);

  const handleSubmit = async () => {
    if (submitting) return;
    setWhatsappError(null);
    setSubmitError(null);
    if (!isValidWhatsApp(whatsapp)) {
      setWhatsappError("Confira o número com DDD.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmitWaitlist?.({
        cep,
        bairro,
        cidade,
        estado,
        whatsapp: whatsapp.replace(/\D/g, ""),
      });
      setPhase("submitted");
    } catch (e) {
      setSubmitError(e?.message || "Não conseguimos registrar agora. Tenta de novo.");
    } finally {
      setSubmitting(false);
    }
  };

  const SectionLink = (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${B[100]}` }}>
      <div style={{ fontFamily: fb, fontSize: 13, color: W[700], marginBottom: 4 }}>Tem alguma situação especial?</div>
      <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
        style={{ fontFamily: fb, fontSize: 13, color: B[500], fontWeight: 500, textDecoration: "underline" }}>
        Fala com a gente no WhatsApp ↗
      </a>
    </div>
  );

  return (
    <div style={{ background: B[50], border: `1px solid ${B[100]}`, borderRadius: radii.lg, padding: 16, marginTop: 8 }}>
      {phase === "awareness" ? (
        <>
          <div style={{ fontFamily: fd, fontSize: 18, textTransform: "uppercase", color: B[500], letterSpacing: "0.02em", marginBottom: 8 }}>
            Ainda não entregamos nessa região.
          </div>
          <div style={{ fontFamily: fb, fontSize: 14, color: W[700], lineHeight: 1.5, marginBottom: 14 }}>
            Quer que a gente avise quando entregarmos por aí?
          </div>

          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(21) 99999-0000"
            value={whatsapp}
            onChange={(e) => { setWhatsapp(formatWhatsApp(e.target.value)); if (whatsappError) setWhatsappError(null); }}
            style={{
              width: "100%",
              padding: "12px 14px",
              fontSize: 15,
              fontFamily: fb,
              border: `1.5px solid ${whatsappError ? "#EF4444" : W[200]}`,
              borderRadius: radii.md,
              background: "#FFF",
              color: W[800],
              outline: "none",
              transition: "border-color 200ms",
              marginBottom: whatsappError ? 4 : 12,
            }}
          />
          {whatsappError && <div style={{ fontFamily: fb, fontSize: 12, color: "#DC2626", marginBottom: 12 }}>{whatsappError}</div>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: radii.md,
              border: "none",
              background: submitting ? W[300] : B[500],
              color: "#FFF",
              fontFamily: fb,
              fontSize: 14,
              fontWeight: 600,
              cursor: submitting ? "default" : "pointer",
              transition: "background 200ms",
            }}
          >
            {submitting ? "Enviando…" : "Me avise"}
          </button>
          {submitError && <div role="alert" style={{ fontFamily: fb, fontSize: 12, color: "#DC2626", marginTop: 8 }}>{submitError}</div>}

          {SectionLink}
        </>
      ) : (
        <>
          <div style={{ fontFamily: fd, fontSize: 18, textTransform: "uppercase", color: B[500], letterSpacing: "0.02em", marginBottom: 8 }}>
            Pronto, vamos te avisar.
          </div>
          <div style={{ fontFamily: fb, fontSize: 14, color: W[700], lineHeight: 1.5, marginBottom: 14 }}>
            Quando abrirmos por aí, te chamamos no WhatsApp {whatsapp}.
          </div>

          <button
            onClick={onTryOtherCEP}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: radii.md,
              border: `1.5px solid ${B[500]}`,
              background: "transparent",
              color: B[500],
              fontFamily: fb,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 200ms",
            }}
          >
            Tentar outro CEP
          </button>

          {SectionLink}
        </>
      )}
    </div>
  );
}
