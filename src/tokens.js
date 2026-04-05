/* ── Design Tokens da Cora ──
   Fonte única de verdade para cores, fontes e formatação.
   Importado por App.jsx, Onboarding.jsx e PreCadastro.jsx. */

export const B = {
  50:"#EBEEFB", 100:"#C4CDF4", 200:"#8B9BE6", 400:"#5670D8",
  500:"#2E55CD", 600:"#2545A8", 700:"#1D3787", 800:"#172E6E", 900:"#0F1E49",
};

export const W = {
  50:"#FAFAF8", 100:"#F5F4F0", 200:"#E8E6E1", 300:"#D4D1CA",
  400:"#A8A49C", 500:"#7A766E", 600:"#5C5850", 700:"#3D3A34", 800:"#2A2723",
};

export const fd = "'League Gothic',Impact,'Arial Narrow',sans-serif";
export const fb = "'Montagu Slab',Georgia,Palatino,serif";

export const fmt = v => `R$ ${v.toFixed(2).replace(".",",")}`;
