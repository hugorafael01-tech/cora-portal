import { useState } from "react";

/* ══════════════════════════════════════════
   CORA — Pré-cadastro de Interessados v2
   /interesse
   ══════════════════════════════════════════ */

const WEBHOOK_URL = "https://hook.us2.make.com/e8gu7ih2gfoggsac7irq2k1p967gd8t1";

/* ── Design Tokens ── */
const B = {
  50: "#EBEEFB", 100: "#C4CDF4", 500: "#2E55CD",
  600: "#2545A8", 700: "#1E3A8A", 800: "#172E6E", 900: "#0F1E49",
};
const W = {
  50: "#FAFAF8", 100: "#F5F4F0", 200: "#E8E6E1", 300: "#D4D1CB",
  400: "#A8A49C", 500: "#7A766E", 600: "#5C5850", 700: "#3D3A34", 800: "#2A2723",
};

/* ── Produtos da assinatura (vitrine, sem preço) ── */
const PRODUCTS = [
  {
    id: "original",
    nome: "Pão Original",
    peso: "580g",
    img: "/images/_original.jpg",
    desc: "Blend de farinhas italianas, água, sal e o levain da Cora. Fermentação lenta. Crosta firme, miolo aberto.",
  },
  {
    id: "integral",
    nome: "Pão Integral",
    peso: "580g",
    img: "/images/_integral.jpg",
    desc: "Farinha 100% integral, água, azeite, sal e o levain da Cora. Fermentação lenta. Miolo denso, sabor profundo.",
  },
  {
    id: "multigraos",
    nome: "Multigrãos",
    peso: "631g",
    img: "/images/_multigraos.jpg",
    desc: "Farinha italiana, água, 6 sementes selecionadas e levain da Cora. Crosta crocante, miolo repleto de textura e sabor.",
  },
  {
    id: "brioche",
    nome: "Brioche",
    peso: "400g",
    img: "/images/_brioche.jpg",
    desc: "Farinha italiana, leite integral, manteiga, ovos, mel e o levain da Cora. Massa amanteigada de fermentação natural.",
  },
];

/* ── Grafismo Coração (decorativo) ── */
const GrafismoCoracao = ({ size = 36 }) => (
  <img
    src="/images/grafismo_coracao.svg"
    alt=""
    aria-hidden="true"
    style={{ width: size, height: "auto" }}
  />
);

/* ── Faixa decorativa (tile grafismo_coracao.svg repetido) ── */
const PatternBand = () => (
  <div
    style={{
      width: "100%",
      height: 40,
      overflow: "hidden",
      backgroundImage: "url('/images/grafismo_coracao.svg')",
      backgroundRepeat: "repeat-x",
      backgroundSize: "auto 100%",
      backgroundPosition: "center",
      flexShrink: 0,
    }}
  />
);

/* ── Máscara de WhatsApp ── */
const formatWhatsApp = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

/* ══════════════════════════════════════════
   TELA 1 — SPLASH
   ══════════════════════════════════════════ */
const SplashScreen = ({ onNext }) => (
  <div
    style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "60px 32px 40px",
      background: W[50],
      textAlign: "center",
      gap: 0,
    }}
  >
    {/* Grafismo decorativo topo */}
    <GrafismoCoracao size={36} />

    {/* Logo + tagline */}
    <div style={{ marginTop: 40 }}>
      <img
        src="/images/cora_logo_com_tag.svg"
        alt="Cora — Padaria por assinatura"
        style={{ width: "clamp(180px, 65vw, 260px)", height: "auto" }}
      />
    </div>

    {/* Copy principal */}
    <div style={{ marginTop: 48, maxWidth: 300, padding: "0 8px" }}>
      <p
        style={{
          fontFamily: "'Montagu Slab', Georgia, serif",
          fontSize: "clamp(22px, 6.5vw, 30px)",
          lineHeight: 1.3,
          color: W[400],
          margin: 0,
          fontWeight: 400,
        }}
      >
        Pães de fermentação natural, toda semana na sua casa.
      </p>
      <p
        style={{
          fontFamily: "'Montagu Slab', Georgia, serif",
          fontSize: "clamp(22px, 6.5vw, 30px)",
          lineHeight: 1.3,
          color: W[800],
          margin: 0,
          marginTop: 4,
          fontWeight: 500,
        }}
      >
        Tem interesse?
      </p>
    </div>

    {/* CTA */}
    <button
      onClick={onNext}
      style={{
        marginTop: 48,
        width: 200,
        height: 52,
        borderRadius: 8,
        border: "none",
        background: B[500],
        color: "#FFF",
        fontSize: 16,
        fontWeight: 600,
        fontFamily: "'Montagu Slab', Georgia, serif",
        cursor: "pointer",
        transition: "background 150ms",
      }}
      onMouseOver={(e) => (e.currentTarget.style.background = B[600])}
      onMouseOut={(e) => (e.currentTarget.style.background = B[500])}
    >
      Muito!
    </button>

    {/* Grafismo decorativo rodapé */}
    <div style={{ marginTop: 60 }}>
      <GrafismoCoracao size={36} />
    </div>
  </div>
);

/* ══════════════════════════════════════════
   TELA 2 — FORMULÁRIO
   ══════════════════════════════════════════ */
const FormScreen = ({ onSubmit }) => {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [selectedPaes, setSelectedPaes] = useState([]);
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [optinMailing, setOptinMailing] = useState(false);
  const [outraOpcao, setOutraOpcao] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const MAX_SELECTION = 2;

  const togglePao = (id) => {
    setSelectedPaes((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= MAX_SELECTION) return prev;
      return [...prev, id];
    });
  };

  const validate = () => {
    const e = {};
    if (!nome.trim() || nome.trim().split(/\s+/).length < 2)
      e.nome = "Precisamos do nome e sobrenome.";
    const digits = whatsapp.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11)
      e.whatsapp = "Confira o número com DDD.";
    if (!bairro.trim()) e.bairro = "Informe seu bairro.";
    if (!cidade) e.cidade = "Selecione a cidade.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    const paesNomes = selectedPaes
      .map((id) => PRODUCTS.find((p) => p.id === id)?.nome)
      .filter(Boolean)
      .join(", ");

    const payload = {
      nome: nome.trim(),
      whatsapp: whatsapp.replace(/\D/g, ""),
      bairro: bairro.trim(),
      cidade,
      paes_preferidos: paesNomes || "Nenhum selecionado",
      outra_opcao: outraOpcao.trim() || "",
      optin_mailing: optinMailing ? "Sim" : "Não",
      tipo: "interesse_v2",
      data: new Date().toISOString(),
    };

    try {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // silently continue — dados podem ser recuperados depois
    }

    setLoading(false);
    onSubmit(nome.trim().split(/\s+/)[0]);
  };

  const inputStyle = (field) => ({
    width: "100%",
    height: 48,
    borderRadius: 8,
    border: `1.5px solid ${errors[field] ? "#EF4444" : W[300]}`,
    padding: "0 16px",
    fontSize: 16,
    fontFamily: "'Montagu Slab', Georgia, serif",
    color: W[700],
    background: "#FFF",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 150ms",
  });

  const labelStyle = {
    fontSize: 12,
    fontWeight: 500,
    color: W[600],
    fontFamily: "'Montagu Slab', Georgia, serif",
    marginBottom: 6,
    display: "block",
  };

  const errorStyle = {
    fontSize: 13,
    color: "#DC2626",
    fontFamily: "'Montagu Slab', Georgia, serif",
    marginTop: 4,
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: W[50],
        padding: "0 0 40px",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: `1px solid ${W[200]}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#FFF",
        }}
      >
        <img
          src="/images/cora_logo_com_tag.svg"
          alt="Cora"
          style={{ height: 28 }}
        />
      </div>

      <div style={{ padding: "32px 24px 0", maxWidth: 420, margin: "0 auto" }}>
        {/* Título */}
        <h1
          style={{
            fontFamily: "'League Gothic', Impact, sans-serif",
            fontSize: 24,
            color: B[500],
            textTransform: "uppercase",
            letterSpacing: "0.02em",
            lineHeight: 1.2,
            margin: "0 0 8px",
          }}
        >
          CONTE UM POUCO SOBRE VOCÊ
        </h1>
        <p
          style={{
            fontFamily: "'Montagu Slab', Georgia, serif",
            fontSize: 14,
            color: W[500],
            margin: "0 0 32px",
            lineHeight: 1.5,
          }}
        >
          Seus dados ficam só com a Cora.
        </p>

        {/* Campo: Nome */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Nome completo *</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Como você gostaria de ser chamado(a)?"
            style={inputStyle("nome")}
            onFocus={(e) =>
              (e.target.style.borderColor = errors.nome ? "#EF4444" : B[500])
            }
            onBlur={(e) =>
              (e.target.style.borderColor = errors.nome ? "#EF4444" : W[300])
            }
          />
          {errors.nome && <div style={errorStyle}>{errors.nome}</div>}
        </div>

        {/* Campo: WhatsApp */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>WhatsApp com DDD *</label>
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
            placeholder="(21) 99999-9999"
            style={inputStyle("whatsapp")}
            onFocus={(e) =>
              (e.target.style.borderColor = errors.whatsapp
                ? "#EF4444"
                : B[500])
            }
            onBlur={(e) =>
              (e.target.style.borderColor = errors.whatsapp
                ? "#EF4444"
                : W[300])
            }
          />
          {errors.whatsapp && <div style={errorStyle}>{errors.whatsapp}</div>}
        </div>

        {/* Pães — vitrine */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>
            O que mais te atrai? (até 2 opções)
          </label>
          <div
            style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}
          >
            {PRODUCTS.map((product) => {
              const selected = selectedPaes.includes(product.id);
              const disabled =
                !selected && selectedPaes.length >= MAX_SELECTION;
              return (
                <div
                  key={product.id}
                  onClick={() => !disabled && togglePao(product.id)}
                  style={{
                    display: "flex",
                    gap: 14,
                    padding: 12,
                    borderRadius: 12,
                    border: `1.5px solid ${
                      selected ? B[500] : W[200]
                    }`,
                    background: selected ? B[50] : "#FFF",
                    cursor: disabled ? "default" : "pointer",
                    opacity: disabled ? 0.5 : 1,
                    transition: "all 150ms",
                    alignItems: "flex-start",
                  }}
                >
                  {/* Foto */}
                  <img
                    src={product.img}
                    alt={product.nome}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 8,
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontFamily: "'Montagu Slab', Georgia, serif",
                            fontSize: 16,
                            fontWeight: 600,
                            color: W[800],
                          }}
                        >
                          {product.nome}
                        </div>
                      </div>

                      {/* Checkbox visual */}
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          border: `2px solid ${selected ? B[500] : W[300]}`,
                          background: selected ? B[500] : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: 2,
                          transition: "all 150ms",
                        }}
                      >
                        {selected && (
                          <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                            <path
                              d="M1 5L5 9L13 1"
                              stroke="#FFF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        fontFamily: "'Montagu Slab', Georgia, serif",
                        fontSize: 13,
                        color: W[500],
                        lineHeight: 1.5,
                        marginTop: 6,
                      }}
                    >
                      {product.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Campo aberto: outra opção */}
          <input
            type="text"
            value={outraOpcao}
            onChange={(e) => setOutraOpcao(e.target.value)}
            placeholder="Outra opção que gostaria muito..."
            style={{
              ...inputStyle("_none"),
              marginTop: 12,
              fontSize: 14,
              color: W[600],
            }}
            onFocus={(e) => (e.target.style.borderColor = B[500])}
            onBlur={(e) => (e.target.style.borderColor = W[300])}
          />
        </div>

        {/* Campo: Cidade */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Cidade *</label>
          <select
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            style={{
              ...inputStyle("cidade"),
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23A8A49C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 16px center",
              color: cidade ? W[700] : W[400],
            }}
          >
            <option value="">Selecione</option>
            <option value="Niterói">Niterói</option>
            <option value="Rio de Janeiro">Rio de Janeiro</option>
            <option value="Outra">Outra</option>
          </select>
          {errors.cidade && <div style={errorStyle}>{errors.cidade}</div>}
        </div>

        {/* Campo: Bairro */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Bairro *</label>
          <input
            type="text"
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
            placeholder="Ex: Icaraí, Copacabana..."
            style={inputStyle("bairro")}
            onFocus={(e) =>
              (e.target.style.borderColor = errors.bairro ? "#EF4444" : B[500])
            }
            onBlur={(e) =>
              (e.target.style.borderColor = errors.bairro ? "#EF4444" : W[300])
            }
          />
          {errors.bairro && <div style={errorStyle}>{errors.bairro}</div>}
        </div>

        {/* Optin mailing */}
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            marginBottom: 32,
            cursor: "pointer",
          }}
          onClick={() => setOptinMailing(!optinMailing)}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              border: `2px solid ${optinMailing ? B[500] : W[300]}`,
              background: optinMailing ? B[500] : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: 1,
              transition: "all 150ms",
            }}
          >
            {optinMailing && (
              <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                <path
                  d="M1 4L4.5 7.5L11 1"
                  stroke="#FFF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          <span
            style={{
              fontFamily: "'Montagu Slab', Georgia, serif",
              fontSize: 14,
              color: W[600],
              lineHeight: 1.5,
            }}
          >
            Quero acompanhar o lançamento da Cora e ser avisado quando as entregas começarem.
          </span>
        </div>

        {/* Botão enviar */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 8,
            border: "none",
            background: loading ? B[600] : B[500],
            color: "#FFF",
            fontSize: 16,
            fontWeight: 600,
            fontFamily: "'Montagu Slab', Georgia, serif",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 150ms",
          }}
          onMouseOver={(e) => {
            if (!loading) e.currentTarget.style.background = B[600];
          }}
          onMouseOut={(e) => {
            if (!loading) e.currentTarget.style.background = B[500];
          }}
        >
          {loading ? "Enviando..." : "Quero ser avisado"}
        </button>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   TELA 3 — CONFIRMAÇÃO
   ══════════════════════════════════════════ */
const ConfirmScreen = ({ nome }) => (
  <div
    style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      background: W[50],
    }}
  >
    {/* Pattern band topo */}
    <PatternBand />

    {/* Conteúdo central */}
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        textAlign: "center",
        maxWidth: 420,
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Check circle */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: B[500],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          flexShrink: 0,
        }}
      >
        <svg width="28" height="22" viewBox="0 0 32 24" fill="none">
          <path
            d="M3 12L12 21L29 3"
            stroke="#FFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Heading */}
      <h1
        style={{
          fontFamily: "'League Gothic', Impact, sans-serif",
          fontSize: "clamp(32px, 8.5vw, 42px)",
          color: B[800],
          textTransform: "uppercase",
          letterSpacing: "0.02em",
          lineHeight: 1.2,
          margin: 0,
          wordBreak: "break-word",
        }}
      >
        ANOTADO,
        <br />
        {nome.toUpperCase()}!
      </h1>

      {/* Body */}
      <p
        style={{
          fontFamily: "'Montagu Slab', Georgia, serif",
          fontSize: "clamp(18px, 5vw, 24px)",
          color: W[700],
          lineHeight: 1.4,
          margin: "28px 0 0",
          maxWidth: "100%",
          padding: "0 8px",
        }}
      >
        Quando as entregas começarem, você vai ser das primeiras pessoas a saber.
      </p>

      <p
        style={{
          fontFamily: "'Montagu Slab', Georgia, serif",
          fontSize: "clamp(18px, 5vw, 24px)",
          color: "#2E55CD",
          lineHeight: 1.4,
          margin: "8px 0 0",
          maxWidth: "100%",
          padding: "0 8px",
        }}
      >
        Se curtiu a ideia, aproveita e compartilha com os seus amigos.
      </p>

      {/* Privacy */}
      <p
        style={{
          fontFamily: "'Montagu Slab', Georgia, serif",
          fontSize: 13,
          color: W[400],
          marginTop: 40,
        }}
      >
        Seus dados ficam só com a Cora.
      </p>
    </div>

    {/* Pattern band rodapé */}
    <PatternBand />
  </div>
);

/* ══════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════ */
const PreCadastro = () => {
  const [step, setStep] = useState(0); // 0: splash, 1: form, 2: confirm
  const [firstName, setFirstName] = useState("");

  return (
    <div
      style={{
        fontFamily: "'Montagu Slab', Georgia, serif",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      {step === 0 && <SplashScreen onNext={() => setStep(1)} />}
      {step === 1 && (
        <FormScreen
          onSubmit={(name) => {
            setFirstName(name);
            setStep(2);
          }}
        />
      )}
      {step === 2 && <ConfirmScreen nome={firstName} />}
    </div>
  );
};

export default PreCadastro;