/* ══════════════════════════════════════════════════════════════
   CORA · PreCadastro polimento — dados compartilhados
   ══════════════════════════════════════════════════════════════ */

const REPO = "https://raw.githubusercontent.com/hugorafael01-tech/cora-site/main/images";

/* Produtos derivados do catálogo do Portal (App.jsx 60–82).
   Copys aprovadas no briefing (seção 3.6). NÃO editar. */
const PRODUCTS = [
  {
    id: "original",
    nome: "Pão Original",
    peso: "700g",
    tag: "Fixo · assinatura",
    img: `${REPO}/_original.jpg`,
    desc: "Aquele pão que começou a Cora. Versátil, vai do café ao jantar. Blend de farinha italiana com toque de integral brasileira e 24 horas de fermentação.",
  },
  {
    id: "integral",
    nome: "Pão Integral",
    peso: "700g",
    tag: "Fixo · assinatura",
    img: `${REPO}/_integral.jpg`,
    desc: "Integral leve e macio, daqueles que dá pra comer todo dia. Farinha integral da Fazenda Vargem, azeite extra virgem que traz maciez, gergelim na crosta.",
  },
  {
    id: "focaccia",
    nome: "Focaccia Genovesa",
    peso: "430g",
    tag: "Rotativo · especial",
    img: `${REPO}/_focaccia.jpg`,
    desc: "Receita da Ligúria, no norte da Itália. Miolo macio, crosta dourada, azeite extra virgem generoso. Cobertura de alecrim, sal grosso e cebola roxa.",
  },
  {
    id: "multigraos",
    nome: "Multigrãos",
    peso: "615g",
    tag: "Rotativo",
    img: `${REPO}/_multigraos.jpg`,
    desc: "Seis grãos torrados e escaldados na massa, crosta de farelo de aveia. Hidratação alta, miolo úmido, sabor que ganha em cada mordida.",
  },
  {
    id: "ciabatta",
    nome: "Ciabatta",
    peso: "533g",
    tag: "Rotativo",
    img: `${REPO}/_ciabatta.jpg`,
    desc: "Hidratação alta deixa o miolo cheio de alvéolos. Casca fina e crocante, formato achatado de chinelo, que é o que ciabatta significa em italiano. O pão do sanduíche.",
  },
  {
    id: "brioche",
    nome: "Brioche",
    peso: "256g",
    tag: "Rotativo",
    img: `${REPO}/_brioche.jpg`,
    desc: "Massa amanteigada com ovos, mel e raspas de laranja, limão siciliano e baunilha. Macio, levemente adocicado, com perfume cítrico. Pro lanche da escola e o café da manhã sem pressa.",
  },
];

/* ── Ícones inline (Lucide outline, stroke 1.5) ───────────── */
const I = {
  check: (s = 14, c = "#FFF") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  chevDown: (s = 16, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  chevRight: (s = 16, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  ),
  chevLeft: (s = 16, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  ),
  x: (s = 14, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  wheat: (s = 18, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 22 16 8" />
      <path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94" />
      <path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94" />
      <path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94" />
      <path d="M20 2v1.5a3.5 3.5 0 0 1-1.025 2.475L18 7M22 6h-1.5a3.5 3.5 0 0 1-2.475-1.025L17 4" />
    </svg>
  ),
  info: (s = 14, c = "currentColor") => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
};

/* ── Header (warm-50, borda sutil, sem fundo branco) ─────── */
const Header = () => (
  <div className="pc-header">
    <img src="assets/cora_logo_com_tag.svg" alt="Cora — Padaria por assinatura" />
  </div>
);

/* ── Seção (eyebrow + título de seção + body) ─────────────  */
const Section = ({ eyebrow, children, top = 32 }) => (
  <section className="pc-section" style={{ marginTop: top }}>
    {eyebrow && <div className="pc-eyebrow">{eyebrow}</div>}
    {children}
  </section>
);

/* ── Campo (label + input) com estados ─────────────────────  */
const Field = ({ label, value, placeholder, focused, error, type = "text", hint }) => (
  <div className="pc-field">
    <label className="pc-label">{label}</label>
    <div className={"pc-input" + (focused ? " is-focused" : "") + (error ? " is-error" : "") + (value ? " has-value" : "")}>
      {value ? <span className="pc-input-value">{value}</span> : <span className="pc-input-ph">{placeholder}</span>}
    </div>
    {error && <div className="pc-input-err">{error}</div>}
    {hint && !error && <div className="pc-input-hint">{hint}</div>}
  </div>
);

const SelectField = ({ label, value, placeholder, open }) => (
  <div className="pc-field">
    <label className="pc-label">{label}</label>
    <div className={"pc-input pc-select" + (open ? " is-focused" : "") + (value ? " has-value" : "")}>
      {value ? <span className="pc-input-value">{value}</span> : <span className="pc-input-ph">{placeholder}</span>}
      <span className="pc-select-chev">{I.chevDown(16, "var(--warm-400)")}</span>
    </div>
  </div>
);

/* ── Checkbox custom ──────────────────────────────────────── */
const Checkbox = ({ checked, size = 22 }) => (
  <span className={"pc-cbox" + (checked ? " is-on" : "")} style={{ width: size, height: size }}>
    {checked && I.check(Math.round(size * 0.55))}
  </span>
);

/* ── CTA primário ─────────────────────────────────────────── */
const PrimaryCTA = ({ children, full = true }) => (
  <button className={"pc-cta" + (full ? " is-full" : "")}>{children}</button>
);

/* ── Counter chip (contador X de 2) ───────────────────────  */
const CounterChip = ({ n, max = 2, full = false }) => (
  <span className={"pc-counter" + (full ? " is-full" : "")}>
    <span className="pc-counter-dot" aria-hidden="true">●</span>
    {n} de {max} {n === 1 ? "marcado" : "marcados"}
  </span>
);

Object.assign(window, {
  PRODUCTS, I, Header, Section, Field, SelectField, Checkbox, PrimaryCTA, CounterChip,
});
