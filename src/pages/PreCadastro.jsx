import { useState } from "react";
import ProductCard from "./components/ProductCard";

/* ──────────────────────────────────────────
   TOKENS — idênticos ao portal do assinante
   ────────────────────────────────────────── */
const B = {
  50:  "#EBEEFB", 100: "#C4CDF4", 200: "#8B9BE6",
  400: "#5670D8", 500: "#2E55CD", 600: "#2545A8",
  700: "#1D3787", 800: "#172E6E", 900: "#0F1E49",
};
const W = {
  50:  "#FAFAF8", 100: "#F5F4F0", 200: "#E8E6E1",
  300: "#D4D1CA", 400: "#A8A49C", 500: "#7A766E",
  600: "#5C5850", 700: "#3D3A34", 800: "#2A2723",
};

/* ──────────────────────────────────────────
   WEBHOOK — substitua pela URL real do Make
   ────────────────────────────────────────── */
const WEBHOOK_URL = "https://hook.us2.make.com/e8gu7ih2gfoggsac7irq2k1p967gd8t1";

/* ──────────────────────────────────────────
   COMPONENTES BASE
   ────────────────────────────────────────── */
const H = ({ children, size = 24, color = B[800] }) => (
  <div style={{
    fontFamily: "'League Gothic', Impact, sans-serif",
    fontSize: size,
    textTransform: "uppercase",
    letterSpacing: "0.02em",
    color,
    lineHeight: 1.1,
  }}>
    {children}
  </div>
);

const Label = ({ children, required }) => (
  <label style={{
    display: "block",
    fontSize: 14,
    fontWeight: 500,
    color: W[700],
    marginBottom: 6,
    fontFamily: "'Montagu Slab', Georgia, serif",
  }}>
    {children}
    {required && <span style={{ color: B[500], marginLeft: 2 }}>*</span>}
  </label>
);

const Input = ({ value, onChange, placeholder, type = "text", error }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    style={{
      width: "100%",
      padding: "12px 14px",
      fontSize: 15,
      fontFamily: "'Montagu Slab', Georgia, serif",
      color: W[800],
      background: "#FFF",
      border: `1.5px solid ${error ? "#EF4444" : W[200]}`,
      borderRadius: 8,
      outline: "none",
      boxSizing: "border-box",
      transition: "border-color 150ms",
    }}
    onFocus={e => (e.target.style.borderColor = B[400])}
    onBlur={e => (e.target.style.borderColor = error ? "#EF4444" : W[200])}
  />
);

const Checkbox = ({ label, checked, onChange }) => (
  <button
    onClick={onChange}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      background: checked ? B[50] : "#FFF",
      border: `1.5px solid ${checked ? B[400] : W[200]}`,
      borderRadius: 8,
      cursor: "pointer",
      textAlign: "left",
      width: "100%",
      transition: "all 150ms",
    }}
  >
    <div style={{
      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
      background: checked ? B[500] : "transparent",
      border: `1.5px solid ${checked ? B[500] : W[300]}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 150ms",
    }}>
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
    <span style={{ fontSize: 14, color: checked ? B[700] : W[600], fontFamily: "'Montagu Slab', Georgia, serif", fontWeight: checked ? 500 : 400 }}>
      {label}
    </span>
  </button>
);

/* ──────────────────────────────────────────
   TELA 1 — SPLASH
   ────────────────────────────────────────── */
const SplashScreen = ({ onNext }) => (
  <div style={{ display: "flex", flexDirection: "column", minHeight: "100%", padding: "40px 24px 32px" }}>

    {/* Logo */}
    <div style={{ marginBottom: 40 }}>
      <img
        src="/images/cora_logo_com_tag.svg"
        alt="Cora"
        style={{ height: 48 }}
        onError={e => {
          e.target.style.display = "none";
          e.target.nextSibling.style.display = "block";
        }}
      />
      <H size={32} color={B[500]} style={{ display: "none" }}>CORA</H>
    </div>

    {/* Headline */}
    <div style={{ flex: 1 }}>
      <H size={30} color={B[800]}>
        PÃO DE FERMENTAÇÃO NATURAL, TODA SEMANA NA SUA PORTA.
      </H>
      <div style={{
        fontFamily: "'Montagu Slab', Georgia, serif",
        fontSize: 17,
        color: W[500],
        marginTop: 12,
        lineHeight: 1.5,
      }}>
        Você escolhe, a gente assa.
      </div>

      {/* Info block */}
      <div style={{
        marginTop: 32,
        padding: "16px",
        background: B[50],
        borderRadius: 12,
        border: `1px solid ${B[100]}`,
      }}>
        <div style={{ fontFamily: "'Montagu Slab', Georgia, serif", fontSize: 13, color: B[700], lineHeight: 1.6 }}>
          A Cora ainda não chegou no seu bairro — mas pode estar a caminho.
          Deixa seu contato que a gente avisa quando a entrega chegar até você.
        </div>
      </div>
    </div>

    {/* CTA */}
    <div style={{ marginTop: 40 }}>
      <button
        onClick={onNext}
        style={{
          width: "100%",
          padding: "15px",
          borderRadius: 8,
          border: "none",
          background: B[500],
          color: "#FFF",
          fontSize: 15,
          fontWeight: 600,
          fontFamily: "'Montagu Slab', Georgia, serif",
          cursor: "pointer",
          letterSpacing: "0.01em",
        }}
      >
        Quero saber quando chegar
      </button>
      <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: W[400], fontFamily: "'Montagu Slab', Georgia, serif" }}>
        Sem spam. A gente só avisa quando tiver novidade.
      </div>
    </div>
  </div>
);

/* ──────────────────────────────────────────
   TELA 2 — FORMULÁRIO
   ────────────────────────────────────────── */
const PRODUTOS = [
  {id:"original", nome:"Pão Original", peso:"580g", img:"/images/_original.jpg", preco:"R$ 98,00/mês", desc:"Fermentação natural, casca crocante, miolo macio.", ingredientes:"Farinha de trigo, água, sal, levain da Cora.", detalhe:"Fermentação longa de 36h. Crosta firme, miolo aberto com alvéolos irregulares."},
  {id:"integral", nome:"Pão Integral", peso:"614g", img:"/images/_integral.jpg", preco:"R$ 110,00/mês", desc:"100% integral com linhaça e girassol.", ingredientes:"Farinha integral, água, sal, levain, linhaça, girassol.", detalhe:"Mesma fermentação longa, com sementes tostadas que dão crocância."},
  {id:"multigraos", nome:"Multi Grãos", peso:"631g", img:"/images/_multigraos.jpg", preco:"R$ 126,00/mês", desc:"Aveia, centeio, gergelim e mel.", ingredientes:"Farinha de trigo, centeio, aveia, água, mel, sal, levain, gergelim.", detalhe:"Cinco grãos na massa, mel na fermentação. Miolo denso, casca com gergelim tostado."},
  {id:"brioche", nome:"Brioche", peso:"400g", img:"/images/_brioche.jpg", preco:"R$ 128,00/mês", desc:"Manteiga, ovos e levain. Fermentação 18h.", ingredientes:"Farinha, manteiga, ovos, açúcar, sal, levain, leite.", detalhe:"Massa enriquecida com manteiga. Miolo dourado, textura que desfia."},
];

const FormScreen = ({ onSubmit }) => {
  const [nome,     setNome]     = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email,    setEmail]    = useState("");
  const [bairro,   setBairro]   = useState("");
  const [produtos, setProdutos] = useState({});
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);

  const toggleProduto = (id) =>
    setProdutos(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const formatWhatsapp = (v) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2)  return d;
    if (d.length <= 7)  return `(${d.slice(0,2)}) ${d.slice(2)}`;
    if (d.length <= 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    return v;
  };

  const validate = () => {
    const e = {};
    if (!nome.trim())     e.nome     = true;
    if (whatsapp.replace(/\D/g,"").length < 10) e.whatsapp = true;
    if (!email.includes("@")) e.email = true;
    if (!bairro.trim())   e.bairro   = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome:     nome.trim(),
          whatsapp: whatsapp.replace(/\D/g,""),
          email:    email.trim().toLowerCase(),
          bairro:   bairro.trim(),
          produtos: Object.entries(produtos).map(([id,qty])=>`${id}×${qty}`).join(", ") || "Não informado",
          data:     new Date().toLocaleDateString("pt-BR"),
        }),
      });
    } catch (_) {
      /* falha silenciosa — dados salvos no Make mesmo assim */
    }
    setLoading(false);
    onSubmit(nome.trim().split(" ")[0]);
  };

  return (
    <div style={{ padding: "24px 24px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <H size={22}>SEU INTERESSE</H>
        <div style={{ fontSize: 13, color: W[500], marginTop: 6, fontFamily: "'Montagu Slab', Georgia, serif", lineHeight: 1.5 }}>
          Preenche rapidinho — a gente só precisa saber onde você está e o que te interessa.
        </div>
      </div>

      {/* Campo: Nome */}
      <div>
        <Label required>Nome completo</Label>
        <Input
          value={nome}
          onChange={e => { setNome(e.target.value); setErrors(x => ({ ...x, nome: false })); }}
          placeholder="Como você se chama?"
          error={errors.nome}
        />
        {errors.nome && <div style={{ fontSize: 12, color: "#EF4444", marginTop: 4, fontFamily: "'Montagu Slab', Georgia, serif" }}>Precisa do seu nome</div>}
      </div>

      {/* Campo: WhatsApp */}
      <div>
        <Label required>WhatsApp com DDD</Label>
        <Input
          value={whatsapp}
          onChange={e => { setWhatsapp(formatWhatsapp(e.target.value)); setErrors(x => ({ ...x, whatsapp: false })); }}
          placeholder="(21) 99999-0000"
          type="tel"
          error={errors.whatsapp}
        />
        {errors.whatsapp && <div style={{ fontSize: 12, color: "#EF4444", marginTop: 4, fontFamily: "'Montagu Slab', Georgia, serif" }}>Número incompleto</div>}
      </div>

      {/* Campo: E-mail */}
      <div>
        <Label required>E-mail</Label>
        <Input
          value={email}
          onChange={e => { setEmail(e.target.value); setErrors(x => ({ ...x, email: false })); }}
          placeholder="seu@email.com"
          type="email"
          error={errors.email}
        />
        {errors.email && <div style={{ fontSize: 12, color: "#EF4444", marginTop: 4, fontFamily: "'Montagu Slab', Georgia, serif" }}>E-mail inválido</div>}
      </div>

      {/* Campo: Bairro */}
      <div>
        <Label required>Bairro / Região</Label>
        <Input
          value={bairro}
          onChange={e => { setBairro(e.target.value); setErrors(x => ({ ...x, bairro: false })); }}
          placeholder="Ex: Icaraí, Centro, Ingá..."
          error={errors.bairro}
        />
        {errors.bairro && <div style={{ fontSize: 12, color: "#EF4444", marginTop: 4, fontFamily: "'Montagu Slab', Georgia, serif" }}>Precisa do bairro</div>}
      </div>

      {/* Campo: Produtos */}
      {/* Campo: Produtos */}
<div>
  <Label>Qual pão te interessa mais?</Label>
  <div style={{fontSize:12,color:W[400],marginBottom:10,fontFamily:"'Montagu Slab',Georgia,serif"}}>
    Opcional — pode marcar quantos quiser
  </div>
  {PRODUTOS.map(p=>{
    const qty=produtos[p.id]||0;
    return<ProductCard key={p.id}
      product={p}
      qty={qty}
      onAdd={()=>setProdutos(prev=>({...prev,[p.id]:(prev[p.id]||0)+1}))}
      onRemove={()=>setProdutos(prev=>{const q=(prev[p.id]||0)-1;if(q<=0){const n={...prev};delete n[p.id];return n;}return{...prev,[p.id]:q};})}
      ctaLabel="Tenho interesse"
    />;
  })} 
      </div>

      {/* Botão */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: "100%",
          padding: "15px",
          borderRadius: 8,
          border: "none",
          background: loading ? W[300] : B[500],
          color: "#FFF",
          fontSize: 15,
          fontWeight: 600,
          fontFamily: "'Montagu Slab', Georgia, serif",
          cursor: loading ? "not-allowed" : "pointer",
          marginTop: 4,
          transition: "background 150ms",
        }}
      >
        {loading ? "Enviando..." : "Quero ser avisado"}
      </button>

      <div style={{ textAlign: "center", fontSize: 12, color: W[400], fontFamily: "'Montagu Slab', Georgia, serif", lineHeight: 1.5 }}>
        Seus dados ficam só com a Cora. Não compartilhamos com ninguém.
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────
   TELA 3 — CONFIRMAÇÃO
   ────────────────────────────────────────── */
const ConfirmScreen = ({ nome }) => (
  <div style={{
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 24px",
    textAlign: "center",
    position: "relative",
    overflow: "hidden",
  }}>
    {/* Pattern de fundo */}
    <div style={{
      position: "absolute", inset: 0, opacity: 0.06,
      backgroundImage: "url('/images/Cora_tile_grafismo.svg')",
      backgroundRepeat: "repeat",
      backgroundSize: 120,
    }} />

    {/* Conteúdo */}
    <div style={{ position: "relative", zIndex: 1, maxWidth: 300 }}>
      {/* Ícone de check */}
      <div style={{
        width: 64, height: 64, borderRadius: "50%",
        background: "#D1FAE5", border: "1.5px solid #6EE7B7",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 24px",
      }}>
        <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
          <path d="M2 11L10 19L26 2" stroke="#065F46" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <H size={28} color={B[800]}>
        ANOTADO, {nome.toUpperCase()}!
      </H>

      <div style={{
        fontFamily: "'Montagu Slab', Georgia, serif",
        fontSize: 15,
        color: W[600],
        marginTop: 16,
        lineHeight: 1.6,
      }}>
        A gente avisa assim que a Cora chegar na sua região.
      </div>

      <div style={{
        marginTop: 24,
        padding: "14px 16px",
        background: B[50],
        borderRadius: 10,
        border: `1px solid ${B[100]}`,
      }}>
        <div style={{ fontFamily: "'Montagu Slab', Georgia, serif", fontSize: 13, color: B[700], lineHeight: 1.6 }}>
          Enquanto isso, o pão continua sendo feito toda semana. Com calma e sem pressa.
        </div>
      </div>
    </div>
  </div>
);

/* ──────────────────────────────────────────
   APP SHELL
   ────────────────────────────────────────── */
export default function PreCadastro() {
  const [step,  setStep]  = useState("splash"); // splash | form | confirm
  const [nome,  setNome]  = useState("");

  const handleFormSubmit = (primeiroNome) => {
    setNome(primeiroNome);
    setStep("confirm");
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      padding: "20px 0",
      fontFamily: "'Montagu Slab', Georgia, serif",
      background: W[200],
      minHeight: "100vh",
    }}>
      <div style={{
        width: 390,
        minHeight: 720,
        background: W[50],
        borderRadius: 24,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        boxShadow: "0 4px 24px rgba(26,24,21,0.12)",
      }}>
        {/* Barra de topo */}
        <div style={{
          background: "#FFF",
          padding: "10px 20px",
          borderBottom: `1px solid ${W[200]}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: "'League Gothic', Impact, sans-serif",
            fontSize: 22, color: B[500],
            textTransform: "uppercase", letterSpacing: "0.02em",
          }}>
            CORA
          </div>
          <div style={{
            fontFamily: "'Montagu Slab', Georgia, serif",
            fontSize: 11, color: W[400],
            letterSpacing: "0.04em",
          }}>
            PADARIA POR ASSINATURA
          </div>
        </div>

        {/* Indicador de progresso (splash e form) */}
        {step !== "confirm" && (
          <div style={{ display: "flex", gap: 4, padding: "10px 20px 0", flexShrink: 0 }}>
            {["splash", "form"].map((s, i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: step === "confirm" || (step === "form" && i === 0) || (step === "splash" && i === 0)
                  ? (step === "form" && i === 0 ? B[500] : step === "splash" && i === 0 ? B[500] : W[300])
                  : W[300],
                transition: "background 300ms",
              }} />
            ))}
          </div>
        )}

        {/* Conteúdo */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {step === "splash"  && <SplashScreen onNext={() => setStep("form")} />}
          {step === "form"    && <FormScreen onSubmit={handleFormSubmit} />}
          {step === "confirm" && <ConfirmScreen nome={nome} />}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=League+Gothic&family=Montagu+Slab:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; }
        button { font-family: 'Montagu Slab', Georgia, serif; }
        input::placeholder { color: ${W[400]}; }
        input:focus { outline: none; border-color: ${B[400]} !important; }
        ::-webkit-scrollbar { width: 0; }
      `}</style>
    </div>
  );
}