/* ── Design Tokens da Cora ──
   Fonte única de verdade para cores, fontes, escala tipográfica e spacing.
   Importado por App.jsx, Onboarding.jsx e PreCadastro.jsx. */

// ─── CORES ───
// Brand azul Cora (B) e neutros warm (W).
export const B = {
  50:"#EBEEFB", 100:"#C4CDF4", 200:"#8B9BE6", 400:"#5670D8",
  500:"#2E55CD", 600:"#2545A8", 700:"#1D3787", 800:"#172E6E", 900:"#0F1E49",
};

export const W = {
  50:"#FAFAF8", 100:"#F5F4F0", 200:"#E8E6E1", 300:"#D4D1CA",
  400:"#A8A49C", 500:"#7A766E", 600:"#5C5850", 700:"#3D3A34", 800:"#2A2723",
};

// ─── SEMÂNTICOS ───
// Sinalização de estado do card da Cesta. Calibrados para o fundo B[50] do
// card — por isso NÃO reaproveitam o `ST` de App.jsx, que é calibrado pra
// fundo branco/warm e segue valendo nos call-sites dele.
//
// O badge de confirmado usa Azul Cora, não verde: verde não existe na paleta
// da marca e entraria só pra dizer "ok". O fundo branco sobre o card B[50] já
// dá o contraste.
export const sem = {
  warning: { bg:"#FBF3E4", border:"#E6D5AE", text:"#7A5B18" }, // rascunho
  brand:   { bg:"#FFFFFF", border:B[200],    text:B[600]    }, // confirmado
  neutral: { bg:W[100],    border:W[300],    text:W[600]    }, // pós-corte
};

// ─── VALOR FINANCEIRO ───
// O azul passa a significar "será cobrado". Valor condicional sai dele.
//
// Auditoria pendente (fora do escopo do briefing de ago/26): `conditional`
// vale pra qualquer superfície que mostre número antes do commit — Drawer
// "Editar cesta", rodapé persistente, checkout de extras.
export const value = {
  committed:   { color:B[500], fontWeight:700, fontSize:18 }, // vai ser cobrado
  conditional: { color:W[700], fontWeight:600, fontSize:16 }, // prévia
};

// ─── TIPOGRAFIA ───
// Famílias:
//   fd — display (headings, caps). League Gothic.
//   fb — body (texto corrido). Montagu Slab.
export const fd = "'League Gothic',Impact,'Arial Narrow',sans-serif";
export const fb = "'Montagu Slab',Georgia,Palatino,serif";

// Escala tipográfica modular (1.250 · major third).
// Propósito definido por token, não por número. Usar `ts.body` em vez de `fontSize: 14`.
export const ts = {
  caption: 12,  // labels, metadados, captions
  body:    14,  // corpo padrão
  bodyLg:  16,  // corpo grande, inputs, botões
  h3:      20,  // títulos de cards
  h2:      24,  // títulos de seção
  h1:      32,  // títulos de tela
  hero:    40,  // hero moments (data de entrega, boas-vindas)
};

// ─── SPACING ───
// Grid 8px estrito. `sp4` é reservado para ícones e sub-elementos dentro de componentes.
// Em layouts e paddings de card, usar s8+.
export const sp = {
  s4:  4,
  s8:  8,
  s16: 16,
  s24: 24,
  s32: 32,
  s48: 48,
  s64: 64,
};

// ─── ALTITUDE (hierarquia visual sem sombras) ───
// Cora não usa drop-shadow. Níveis são expressos por fundo + borda.
//   n0 = página (warm-50)
//   n1 = card padrão (warm-100, border warm-200)
//   n2 = card interativo / foco (#FFF, border warm-200)
//   n3 = modal / overlay (#FFF sobre overlay 50% rgba)
export const altitude = {
  n0: { bg: W[50],  border: "transparent" },
  n1: { bg: W[100], border: W[200] },
  n2: { bg: "#FFF", border: W[200] },
  n3: { bg: "#FFF", border: W[200] }, // usado em modais; overlay aplicado por fora
};

// ─── RAIOS ───
// Escala oficial Cora. Único `--radius-full` aceito é em círculos genuínos
// (✕ de modal, badge numérico, avatar). Nunca pill em botões.
export const radii = {
  xs:   '4px',   // badges, checkboxes, pílulas pequenas
  md:   '8px',   // botões, inputs, sub-blocos dentro de cards
  lg:   '12px',  // cards
  xl:   '16px',  // modais, bottom-sheets (apenas cantos superiores)
  full: '9999px',// círculos genuínos
};

// ─── MOTION ───
// Durações padrão. Componentes devem respeitar `prefers-reduced-motion`.
export const motion = {
  fast:   "150ms",
  normal: "200ms",
  slow:   "300ms",
  ease:   "ease",
};

// ─── UTILITÁRIO ───
export const fmt = v => `R$ ${v.toFixed(2).replace(".",",")}`;

/* ─── DARK MODE (pendente) ───
   Inline styles em React não respondem a `prefers-color-scheme` nativamente.
   Implementação requer um dos caminhos:
   1) Migrar estilos para CSS modules/vanilla-extract (permite media queries nativas)
   2) Adicionar state global `theme` e trocar tokens via Context (W/B viram W.light/W.dark)
   3) Usar CSS custom properties no :root e trocar via `[data-theme='dark']`
   Recomendação: opção 3 (menor refactor, melhor performance). Planejar em fase dedicada. */

