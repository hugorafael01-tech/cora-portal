import { useState, useRef, useEffect } from "react";
import { B, W, radii } from "../tokens";
import { haptic } from "../utils/haptic";

/* ══════════════════════════════════════════
   CORA — Pré-cadastro de Interessados v2
   /interesse
   ══════════════════════════════════════════ */

const LEAD_API = "/api/lead";

/* ── Produtos da assinatura (vitrine, sem preço) ── */
const PRODUCTS = [
  {
    id: "original",
    nome: "Pão Original",
    peso: "700g",
    img: "/images/_original.webp",
    desc: "Aquele pão que começou a Cora. Versátil, vai do café ao jantar. Blend de farinha italiana com toque de integral brasileira e 24 horas de fermentação.",
  },
  {
    id: "integral",
    nome: "Pão Integral",
    peso: "700g",
    img: "/images/_integral.webp",
    desc: "Integral leve e macio, daqueles que dá pra comer todo dia. Farinha integral da Fazenda Vargem, azeite extra virgem que traz maciez, gergelim na crosta.",
  },
  {
    id: "focaccia",
    nome: "Focaccia Genovesa",
    peso: "430g",
    img: "/images/_focaccia.webp",
    desc: "Receita da Ligúria, no norte da Itália. Miolo macio, crosta dourada, azeite extra virgem generoso. Cobertura de alecrim, sal grosso e cebola roxa.",
  },
  {
    id: "multigraos",
    nome: "Multigrãos",
    peso: "615g",
    img: "/images/_multigraos.webp",
    desc: "Seis grãos torrados e escaldados na massa, crosta de farelo de aveia. Hidratação alta, miolo úmido, sabor que ganha em cada mordida.",
  },
  {
    id: "ciabatta",
    nome: "Ciabatta",
    peso: "533g",
    img: "/images/_ciabatta.webp",
    desc: "Hidratação alta deixa o miolo cheio de alvéolos. Casca fina e crocante, formato achatado de chinelo, que é o que ciabatta significa em italiano. O pão do sanduíche.",
  },
  {
    id: "brioche",
    nome: "Brioche",
    peso: "256g",
    img: "/images/_brioche.webp",
    desc: "Massa amanteigada com ovos, mel e raspas de laranja, limão siciliano e baunilha. Macio, levemente adocicado, com perfume cítrico. Pro lanche da escola e o café da manhã sem pressa.",
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

/* ── Sanitização (remove tags HTML) ── */
const sanitize = (str) => str.replace(/[<>]/g, "");

/* ── Máscara de WhatsApp ── */
const formatWhatsApp = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

/* ── Breakpoint desktop (>=768px) ── */
const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
};

/* ── Checkbox custom (card de produto + optin) ── */
const Checkbox = ({ checked, size = 22 }) => (
  <span
    style={{
      width: size,
      height: size,
      borderRadius: radii.xs,
      border: `1.5px solid ${checked ? B[500] : W[300]}`,
      background: checked ? B[500] : "#FFF",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      boxSizing: "border-box",
      transition: "all 150ms",
    }}
  >
    {checked && (
      <svg
        width={Math.round(size * 0.55)}
        height={Math.round(size * 0.55)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#FFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    )}
  </span>
);

/* ── Counter chip (contador "X de 2", verde ao atingir o limite) ── */
const CounterChip = ({ n, max = 2 }) => {
  const full = n >= max;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: full ? "#D1FAE5" : B[50],
        color: full ? "#065F46" : B[700],
        fontFamily: "'Montagu Slab', Georgia, serif",
        fontSize: 12.5,
        fontWeight: 600,
        padding: "5px 10px",
        borderRadius: radii.xs,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          fontSize: 10,
          lineHeight: 0,
          color: full ? "#047857" : B[500],
        }}
        aria-hidden="true"
      >
        ●
      </span>
      {n} de {max}
    </span>
  );
};

/* ── Seção (eyebrow League Gothic + linha divisória) ── */
const Section = ({ eyebrow, desktop, top, children }) => (
  <section style={{ marginTop: top }}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        margin: "0 0 14px",
      }}
    >
      <span
        style={{
          fontFamily: "'League Gothic', Impact, sans-serif",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontSize: desktop ? 13 : 12,
          color: B[500],
          lineHeight: 1,
          fontWeight: 400,
        }}
      >
        {eyebrow}
      </span>
      <span
        style={{ flex: 1, height: 1, background: W[200] }}
        aria-hidden="true"
      />
    </div>
    {children}
  </section>
);

/* ── Card de produto (Variante A — foto 16:10 em cima, info embaixo) ── */
const PaoCard = ({ p, selected, disabled, desktop, onToggle }) => {
  const handleKey = (e) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle(p.id);
    }
  };
  return (
    <article
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={selected}
      aria-disabled={disabled}
      aria-label={p.nome}
      onClick={() => !disabled && onToggle(p.id)}
      onKeyDown={handleKey}
      onMouseOver={(e) => {
        if (!disabled && !selected) e.currentTarget.style.borderColor = W[300];
      }}
      onMouseOut={(e) => {
        if (!disabled && !selected) e.currentTarget.style.borderColor = W[200];
      }}
      style={{
        background: selected ? B[50] : "#FFF",
        border: `1.5px solid ${selected ? B[500] : W[200]}`,
        borderRadius: radii.lg,
        overflow: "hidden",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.55 : 1,
        transition: "border-color 150ms, background 150ms",
        position: "relative",
      }}
    >
      {/* Foto 16:10 com checkbox sobreposto */}
      <div
        style={{
          width: "100%",
          aspectRatio: "16 / 10",
          background: W[100],
          position: "relative",
          overflow: "hidden",
        }}
      >
        <img
          src={p.img}
          alt=""
          loading="lazy"
          decoding="async"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: selected ? "transparent" : "rgba(255,255,255,0.95)",
            borderRadius: radii.xs,
            padding: selected ? 0 : 4,
            display: "flex",
          }}
          aria-hidden="true"
        >
          <Checkbox checked={selected} size={28} />
        </div>
        {disabled && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(250,250,248,0.55)",
            }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Info — peso fica no array PRODUCTS pra uso em outras telas, mas nao renderiza aqui */}
      <div style={{ padding: "16px 18px 18px" }}>
        <h3
          style={{
            fontFamily: "'Montagu Slab', Georgia, serif",
            fontWeight: 600,
            fontSize: desktop ? 20 : 18,
            lineHeight: 1.2,
            color: selected ? B[700] : W[800],
            textTransform: "none",
            letterSpacing: 0,
            margin: "0 0 8px",
          }}
        >
          {p.nome}
        </h3>
        <p
          style={{
            fontFamily: "'Montagu Slab', Georgia, serif",
            fontSize: desktop ? 15 : 14,
            lineHeight: 1.55,
            color: W[600],
            margin: 0,
            textWrap: "pretty",
          }}
        >
          {p.desc}
        </p>
      </div>
    </article>
  );
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
          color: W[500],
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
      onClick={() => { haptic(); onNext(); }}
      style={{
        marginTop: 48,
        width: 200,
        height: 52,
        borderRadius: radii.md,
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
  const desktop = useIsDesktop();
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [selectedPaes, setSelectedPaes] = useState([]);
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [optinMailing, setOptinMailing] = useState(false);
  const [outraOpcao, setOutraOpcao] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [website, setWebsite] = useState("");
  const formErrorRef = useRef(null);
  const formTopRef = useRef(null);

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
    if (nome.trim().length < 2)
      e.nome = "Conta pra gente como prefere ser chamado(a).";
    const digits = whatsapp.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11)
      e.whatsapp = "Confira o número com DDD.";
    if (!bairro.trim()) e.bairro = "Informe seu bairro.";
    if (!cidade) e.cidade = "Selecione a cidade.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (website) return;
    if (formErrorRef.current) formErrorRef.current.style.display = 'none';
    if (!validate()) {
      setTimeout(() => {
        if (formErrorRef.current) formErrorRef.current.style.display = 'block';
        // scroll smooth pro topo do form pra usuario ver os campos com erro (restricao secao 8)
        if (formTopRef.current) formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return;
    }
    setLoading(true);
    setSubmitError("");

    const paesNomes = selectedPaes
      .map((id) => PRODUCTS.find((p) => p.id === id)?.nome)
      .filter(Boolean)
      .join(", ");

    const payload = {
      nome: sanitize(nome.trim()),
      whatsapp: whatsapp.replace(/\D/g, ""),
      bairro: sanitize(bairro.trim()),
      cidade,
      paes_preferidos: paesNomes || "Nenhum selecionado",
      outra_opcao: sanitize(outraOpcao.trim()) || "",
      optin_mailing: optinMailing ? "Sim" : "Não",
      tipo: "interesse_v2",
      data: new Date().toISOString(),
    };

    try {
      const res = await fetch(LEAD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("status " + res.status);
    } catch {
      setLoading(false);
      setSubmitError("Não conseguimos enviar seus dados. Verifique sua conexão e tente novamente.");
      return;
    }

    setLoading(false);
    haptic();
    onSubmit(nome.trim().split(/\s+/)[0]);
  };

  const inputStyle = (field) => ({
    width: "100%",
    height: desktop ? 56 : 52,
    borderRadius: radii.md,
    border: `1.5px solid ${errors[field] ? "#DC2626" : W[300]}`,
    padding: "0 16px",
    fontSize: desktop ? 17 : 16,
    fontFamily: "'Montagu Slab', Georgia, serif",
    color: W[800],
    background: "#FFF",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 150ms",
  });

  const labelStyle = {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: W[700],
    fontFamily: "'Montagu Slab', Georgia, serif",
    margin: "0 0 6px",
    lineHeight: 1.3,
  };

  const errorStyle = {
    fontSize: 13,
    color: "#DC2626",
    fontFamily: "'Montagu Slab', Georgia, serif",
    marginTop: 4,
  };

  const clearFormError = () => {
    if (formErrorRef.current) formErrorRef.current.style.display = 'none';
  };

  const twoCol = {
    display: "grid",
    gridTemplateColumns: desktop ? "1fr 1fr" : "1fr",
    gap: desktop ? 20 : 16,
  };

  const secTop = desktop ? 48 : 32;

  return (
    <div
      ref={formTopRef}
      style={{
        minHeight: "100dvh",
        background: W[50],
        padding: "0 0 40px",
      }}
    >
      {/* Header — warm-50 contínuo com o body, borda sutil */}
      <div
        style={{
          padding: desktop ? "18px 40px" : "14px 24px",
          borderBottom: `1px solid ${W[200]}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: W[50],
        }}
      >
        <img
          src="/images/cora_logo_com_tag.svg"
          alt="Cora"
          style={{ height: desktop ? 36 : 30, width: "auto" }}
        />
      </div>

      <div
        style={{
          padding: desktop ? "56px 40px 0" : "28px 24px 0",
          maxWidth: desktop ? 720 : 460,
          margin: "0 auto",
        }}
      >
        {/* Título */}
        <h1
          style={{
            fontFamily: "'League Gothic', Impact, sans-serif",
            fontSize: desktop ? 44 : 32,
            fontWeight: 400,
            color: B[500],
            textTransform: "uppercase",
            letterSpacing: "0.02em",
            lineHeight: desktop ? 1 : 1.05,
            margin: 0,
            textWrap: "balance",
          }}
        >
          Conte um pouco sobre você
        </h1>

        {/* ─── Seção: Quem é você ─── */}
        <Section eyebrow="Quem é você" desktop={desktop} top={desktop ? 48 : 28}>
          <div style={twoCol}>
            {/* Nome */}
            <div>
              <label style={labelStyle}>Como quer ser chamado(a)?</label>
              <input
                id="field-nome"
                type="text"
                value={nome}
                onChange={(e) => { setNome(e.target.value); clearFormError(); }}
                placeholder="Seu nome"
                style={inputStyle("nome")}
                onFocus={(e) =>
                  (e.target.style.borderColor = errors.nome ? "#DC2626" : B[500])
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = errors.nome ? "#DC2626" : W[300])
                }
              />
              {errors.nome && <div style={errorStyle}>{errors.nome}</div>}
            </div>

            {/* WhatsApp */}
            <div>
              <label style={labelStyle}>WhatsApp com DDD</label>
              <input
                id="field-whatsapp"
                type="tel"
                value={whatsapp}
                onChange={(e) => { setWhatsapp(formatWhatsApp(e.target.value)); clearFormError(); }}
                placeholder="(21) 99999-9999"
                style={inputStyle("whatsapp")}
                onFocus={(e) =>
                  (e.target.style.borderColor = errors.whatsapp ? "#DC2626" : B[500])
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = errors.whatsapp ? "#DC2626" : W[300])
                }
              />
              {errors.whatsapp && <div style={errorStyle}>{errors.whatsapp}</div>}
            </div>
          </div>

          {/* Honeypot anti-bot */}
          <div style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              type="text"
              id="website"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
        </Section>

        {/* ─── Seção: Pães ─── */}
        <Section eyebrow="Pães" desktop={desktop} top={secTop}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              margin: "0 0 14px",
            }}
          >
            <p
              style={{
                fontFamily: "'Montagu Slab', Georgia, serif",
                fontSize: desktop ? 19 : 17,
                lineHeight: 1.4,
                color: W[800],
                fontWeight: 500,
                margin: 0,
              }}
            >
              Quais te interessam mais? Pode marcar 2.
            </p>
            <CounterChip n={selectedPaes.length} max={MAX_SELECTION} />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: desktop ? "1fr 1fr" : "1fr",
              gap: desktop ? 18 : 16,
            }}
          >
            {PRODUCTS.map((product) => {
              const selected = selectedPaes.includes(product.id);
              const disabled = !selected && selectedPaes.length >= MAX_SELECTION;
              return (
                <PaoCard
                  key={product.id}
                  p={product}
                  selected={selected}
                  disabled={disabled}
                  desktop={desktop}
                  onToggle={togglePao}
                />
              );
            })}
          </div>

          {selectedPaes.length >= MAX_SELECTION && (
            <p
              style={{
                fontFamily: "'Montagu Slab', Georgia, serif",
                fontSize: 12.5,
                fontStyle: "italic",
                color: W[500],
                lineHeight: 1.5,
                margin: "12px 0 0",
              }}
            >
              Pra trocar, desmarque um dos que já estão escolhidos.
            </p>
          )}

          {/* Campo aberto: outra opção */}
          <input
            type="text"
            value={outraOpcao}
            onChange={(e) => setOutraOpcao(e.target.value)}
            placeholder="Outra opção que gostaria muito…"
            style={{ ...inputStyle("_none"), marginTop: 14 }}
            onFocus={(e) => (e.target.style.borderColor = B[500])}
            onBlur={(e) => (e.target.style.borderColor = W[300])}
          />
        </Section>

        {/* ─── Seção: Onde você está ─── */}
        <Section eyebrow="Onde você está" desktop={desktop} top={secTop}>
          <div style={twoCol}>
            {/* Cidade */}
            <div>
              <label style={labelStyle}>Cidade</label>
              <select
                id="field-cidade"
                value={cidade}
                onChange={(e) => { setCidade(e.target.value); clearFormError(); }}
                style={{
                  ...inputStyle("cidade"),
                  appearance: "none",
                  WebkitAppearance: "none",
                  paddingRight: 44,
                  cursor: "pointer",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23A8A49C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 16px center",
                  color: cidade ? W[800] : W[400],
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = errors.cidade ? "#DC2626" : B[500])
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = errors.cidade ? "#DC2626" : W[300])
                }
              >
                <option value="">Selecione</option>
                <option value="Niterói">Niterói</option>
                <option value="Rio de Janeiro">Rio de Janeiro</option>
                <option value="Outra">Outra</option>
              </select>
              {errors.cidade && <div style={errorStyle}>{errors.cidade}</div>}
            </div>

            {/* Bairro */}
            <div>
              <label style={labelStyle}>Bairro</label>
              <input
                id="field-bairro"
                type="text"
                value={bairro}
                onChange={(e) => { setBairro(e.target.value); clearFormError(); }}
                placeholder="Ex: Icaraí, Copacabana…"
                style={inputStyle("bairro")}
                onFocus={(e) =>
                  (e.target.style.borderColor = errors.bairro ? "#DC2626" : B[500])
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = errors.bairro ? "#DC2626" : W[300])
                }
              />
              {errors.bairro && <div style={errorStyle}>{errors.bairro}</div>}
            </div>
          </div>
        </Section>

        {/* ─── Seção: Antes de enviar ─── */}
        <Section eyebrow="Antes de enviar" desktop={desktop} top={secTop}>
          {/* Optin mailing */}
          <div
            role="checkbox"
            aria-checked={optinMailing}
            tabIndex={0}
            onClick={() => setOptinMailing(!optinMailing)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOptinMailing(!optinMailing);
              }
            }}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              margin: "4px 0 14px",
              cursor: "pointer",
            }}
          >
            <Checkbox checked={optinMailing} size={22} />
            <span
              style={{
                fontFamily: "'Montagu Slab', Georgia, serif",
                fontSize: 14,
                color: W[700],
                lineHeight: 1.5,
              }}
            >
              Quero receber novidades da Cora pelo WhatsApp até as entregas começarem.
            </span>
          </div>

          {/* Microcopy LGPD */}
          <p
            style={{
              fontFamily: "'Montagu Slab', Georgia, serif",
              fontSize: 12,
              color: W[500],
              lineHeight: 1.6,
              margin: "0 0 24px",
            }}
          >
            Seus dados ficam guardados só pra te avisar quando a Cora abrir oficialmente. Pode pedir pra excluir a qualquer momento pelo WhatsApp.
          </p>

          {submitError && <div style={{padding:"12px 16px",borderRadius:radii.md,background:"#FFEDD5",color:"#9A3412",fontFamily:"'Montagu Slab', Georgia, serif",fontSize:14,marginBottom:16,lineHeight:1.5}}>{submitError}</div>}

          <div
            ref={formErrorRef}
            style={{
              display: "none",
              padding: "12px 16px",
              borderRadius: radii.md,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#991B1B",
              fontFamily: "'Montagu Slab', Georgia, serif",
              fontSize: 14,
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            Preencha os campos obrigatórios acima.
          </div>

          {/* Botão enviar */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              display: "block",
              width: "100%",
              maxWidth: desktop ? 320 : "100%",
              margin: desktop ? "0 auto" : 0,
              height: desktop ? 60 : 54,
              borderRadius: radii.md,
              border: "none",
              background: loading ? B[600] : B[500],
              color: "#FFF",
              fontSize: desktop ? 17 : 16,
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
            {loading ? "Enviando..." : "Tenho interesse"}
          </button>
        </Section>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   TELA 3 — CONFIRMAÇÃO
   ══════════════════════════════════════════ */
const shareCora = () => {
  haptic();
  const url = typeof window !== "undefined" ? `${window.location.origin}/interesse` : "";
  const texto = `Conheci a Cora, padaria por assinatura de Niterói. Achei que você também pode gostar: ${url}`;
  if (typeof navigator !== "undefined" && navigator.share) {
    navigator.share({ title: "Cora", text: texto, url }).catch(() => {});
  } else if (typeof window !== "undefined") {
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
  }
};

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
          borderRadius: radii.full,
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
          fontWeight: 400,
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
        Quando as entregas começarem, você é das primeiras a saber.
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
        Se gostou da ideia, compartilhe com quem também pode gostar.
      </p>

      {/* Share CTA */}
      <button
        onClick={shareCora}
        style={{
          marginTop: 24,
          padding: "12px 24px",
          borderRadius: radii.md,
          border: `1.5px solid ${B[500]}`,
          background: "transparent",
          color: B[500],
          fontFamily: "'Montagu Slab', Georgia, serif",
          fontSize: 15,
          fontWeight: 500,
          cursor: "pointer",
          transition: "all 150ms ease",
          minHeight: 48,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = B[50])}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        aria-label="Compartilhar a Cora"
      >
        Compartilhar
      </button>

      {/* Privacy */}
      <p
        style={{
          fontFamily: "'Montagu Slab', Georgia, serif",
          fontSize: 13,
          color: W[500],
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
      <style>{`
        button:focus-visible,a:focus-visible,[role="button"]:focus-visible,[tabindex]:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:none!important;box-shadow:0 0 0 3px ${B[50]},0 0 0 5px ${B[500]}!important}
        @media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important;scroll-behavior:auto!important}}
      `}</style>
    </div>
  );
};

export default PreCadastro;
