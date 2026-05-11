import { useState } from "react";
import { B, W, fb, radii } from "../tokens";
import CEPField from "../components/CEPField";
import {
  formatWhatsApp,
  isValidWhatsApp,
  isValidEmail,
  isValidCEP,
  isValidNome,
} from "../utils/validators";
import { postCapacityWaitlist } from "../utils/api";

const ERROR_COPY = {
  nome: "Precisamos do seu nome.",
  email: "Email inválido.",
  whatsapp: "Confira o número com DDD.",
  cep: "CEP inválido.",
};

const Header = () => (
  <div style={{ marginBottom: 24 }}>
    <div style={{ fontFamily: fb, fontSize: 16, color: W[800], lineHeight: 1.5 }}>
      Estamos ampliando a produção.
      <br />
      Vamos te avisar por email assim que abrir uma vaga.
    </div>
  </div>
);

const RedirectBanner = () => (
  <div
    role="status"
    style={{
      background: B[50],
      border: `1px solid ${B[100]}`,
      borderRadius: radii.md,
      padding: "14px 16px",
      marginBottom: 20,
      fontFamily: fb,
      fontSize: 14,
      color: B[900],
      lineHeight: 1.5,
    }}
  >
    As vagas dessa rodada acabaram de fechar. Deixa seu contato pra próxima.
  </div>
);

const Label = ({ children }) => (
  <div
    style={{
      fontFamily: fb,
      fontSize: 14,
      fontWeight: 500,
      color: W[700],
      marginBottom: 6,
    }}
  >
    {children}
  </div>
);

const TextInput = ({ value, onChange, placeholder, type = "text", inputMode, autoComplete, error }) => (
  <input
    type={type}
    inputMode={inputMode}
    autoComplete={autoComplete}
    placeholder={placeholder}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      width: "100%",
      padding: "12px 14px",
      fontSize: 15,
      fontFamily: fb,
      border: `1.5px solid ${error ? "#EF4444" : W[200]}`,
      borderRadius: radii.md,
      background: "#FFF",
      color: W[800],
      outline: "none",
      transition: "border-color 200ms",
    }}
    onFocus={(e) => {
      e.target.style.borderColor = error ? "#EF4444" : B[400];
    }}
    onBlur={(e) => {
      e.target.style.borderColor = error ? "#EF4444" : W[200];
    }}
  />
);

const Field = ({ label, children, error }) => (
  <div style={{ marginBottom: 16 }}>
    <Label>{label}</Label>
    {children}
    {error && (
      <div
        style={{
          fontFamily: fb,
          fontSize: 12,
          color: "#DC2626",
          marginTop: 4,
          lineHeight: 1.4,
        }}
      >
        {error}
      </div>
    )}
  </div>
);

const ConfirmationView = () => (
  <div
    style={{
      background: B[50],
      border: `1px solid ${B[100]}`,
      borderRadius: radii.lg,
      padding: 20,
    }}
  >
    <div
      style={{
        fontFamily: fb,
        fontSize: 16,
        color: W[800],
        lineHeight: 1.6,
        marginBottom: 14,
        fontWeight: 500,
      }}
    >
      Recebemos seu contato.
    </div>
    <div
      style={{
        fontFamily: fb,
        fontSize: 15,
        color: W[700],
        lineHeight: 1.6,
        marginBottom: 14,
      }}
    >
      Enquanto isso, acompanha a gente no Instagram{" "}
      <a
        href="https://instagram.com/cora.padaria"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: B[500], textDecoration: "underline" }}
      >
        @cora.padaria
      </a>
      .
    </div>
    <div style={{ fontFamily: fb, fontSize: 15, color: W[700], lineHeight: 1.6 }}>
      Valeu pela paciência.
    </div>
  </div>
);

export default function CapacityWaitlist({ reason = "splash" }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cep, setCep] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const e = {};
    if (!isValidNome(nome)) e.nome = ERROR_COPY.nome;
    if (!isValidEmail(email)) e.email = ERROR_COPY.email;
    if (!isValidWhatsApp(whatsapp)) e.whatsapp = ERROR_COPY.whatsapp;
    if (!isValidCEP(cep)) e.cep = ERROR_COPY.cep;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await postCapacityWaitlist({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        whatsapp: whatsapp.replace(/\D/g, ""),
        cep: cep.replace(/\D/g, ""),
      });
      setSubmitted(true);
    } catch (err) {
      // Erros 400 com fields chegam aqui via err.body.fields.
      // Mapeia pra erros inline. Outros erros viram banner geral.
      const fields = err?.body?.fields;
      if (fields && typeof fields === "object") {
        const mapped = {};
        Object.keys(fields).forEach((k) => {
          mapped[k] = ERROR_COPY[k] || "Campo inválido.";
        });
        setErrors(mapped);
      } else {
        setSubmitError("Não conseguimos registrar agora. Tenta de novo.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 390,
        margin: "0 auto",
        minHeight: "100vh",
        background: W[50],
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          background: "#FFF",
          borderBottom: `1px solid ${W[200]}`,
          flexShrink: 0,
        }}
      >
        <img src="/images/cora_logo_com_tag.svg" alt="Cora" style={{ height: 28 }} />
      </div>

      <div style={{ flex: 1, padding: 24 }}>
        {!submitted && reason === "closed-during-flow" && <RedirectBanner />}

        <Header />

        {submitted ? (
          <ConfirmationView />
        ) : (
          <>
            <Field label="Seu nome" error={errors.nome}>
              <TextInput
                value={nome}
                onChange={(v) => {
                  setNome(v);
                  if (errors.nome) setErrors((p) => ({ ...p, nome: undefined }));
                }}
                placeholder="ex: Beatriz"
                autoComplete="name"
                error={errors.nome}
              />
            </Field>

            <Field label="Email" error={errors.email}>
              <TextInput
                value={email}
                onChange={(v) => {
                  setEmail(v);
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                }}
                placeholder="seu@email.com"
                type="email"
                inputMode="email"
                autoComplete="email"
                error={errors.email}
              />
            </Field>

            <Field label="WhatsApp" error={errors.whatsapp}>
              <TextInput
                value={whatsapp}
                onChange={(v) => {
                  setWhatsapp(formatWhatsApp(v));
                  if (errors.whatsapp) setErrors((p) => ({ ...p, whatsapp: undefined }));
                }}
                placeholder="(21) 99999-9999"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                error={errors.whatsapp}
              />
            </Field>

            <Field label="CEP da entrega" error={errors.cep}>
              <CEPField
                value={cep}
                onChange={(v) => {
                  setCep(v);
                  if (errors.cep) setErrors((p) => ({ ...p, cep: undefined }));
                }}
              />
            </Field>

            {submitError && (
              <div
                role="alert"
                style={{
                  fontFamily: fb,
                  fontSize: 13,
                  color: "#9A3412",
                  background: "#FFEDD5",
                  border: "1px solid #FED7AA",
                  borderRadius: radii.md,
                  padding: "10px 12px",
                  marginBottom: 12,
                  lineHeight: 1.5,
                }}
              >
                {submitError}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: radii.md,
                border: "none",
                background: submitting ? W[300] : B[500],
                color: "#FFF",
                fontFamily: fb,
                fontSize: 15,
                fontWeight: 600,
                cursor: submitting ? "default" : "pointer",
                transition: "background 200ms",
                marginTop: 8,
              }}
              onMouseOver={(e) => {
                if (!submitting) e.currentTarget.style.background = B[600];
              }}
              onMouseOut={(e) => {
                if (!submitting) e.currentTarget.style.background = B[500];
              }}
            >
              {submitting ? "Enviando…" : "Pronto"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
