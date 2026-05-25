import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
// Code splitting: Onboarding e PreCadastro sao pesados e so acessados em fluxos
// especificos. Lazy chunks separados reduzem o bundle inicial do Portal.
const CoraOnboarding = lazy(() => import("./Onboarding"));
const PreCadastro = lazy(() => import("./pages/PreCadastro"));
const CapacityWaitlist = lazy(() => import("./pages/CapacityWaitlist"));
import ProductCard from "./components/ProductCard";
import PendingPaymentBanner from "./components/PendingPaymentBanner";
import { isPastCutoff, nextEditableThursdayISO, nextSubscriptionChangeThursdayISO } from "./utils/cutoff";
import { haptic } from "./utils/haptic";
import { loadSubscription, saveSubscription, clearSubscription, reconcileSubscription } from "./utils/subscription";
import { getSettings, getSubscription, getWeeklyOrders, postWeeklyOrder, confirmWeeklyOrder, patchSubscription } from "./utils/api";
import { HUGO_WHATSAPP } from "./config/contact";
import { MENU_SEMANA } from "./config/menu";
import { B, W, fd, fb, fmt, radii } from "./tokens";

// `?reset=true`: limpa subscription persistida e remove o param da URL.
// Top-level (fora do componente) pra rodar antes de qualquer init de state.
// Util pra QA durante teste de usabilidade.
if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("reset") === "true") {
  clearSubscription();
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("reset");
    window.history.replaceState(null, "", url.toString());
  } catch { /* noop */ }
}

/* CORA — Portal do Assinante — v3.2.7
   + Onboarding com splash, gênero, fotos reais, pattern
   + Saudação "Boas-vindas" no primeiro acesso
   + Nav oculta durante onboarding */

const ST={success:{bg:"#D1FAE5",t:"#065F46",b:"#6EE7B7"},warning:{bg:"#FEF3C7",t:"#92400E",b:"#FCD34D"},info:{bg:"#DBEAFE",t:"#1E40AF",b:"#93C5FD"}};

const IMG={
  logo:"/images/cora_logo_com_tag.svg",
  original:"/images/_original.webp",
  integral:"/images/_integral.webp",
  multigraos:"/images/_multigraos.webp",
  brioche:"/images/_brioche.webp",
  focaccia:"/images/_focaccia.webp",
  ciabatta:"/images/_ciabatta.webp",
  pattern:"/images/Cora_tile_grafismo.svg",
};

// Calcula a proxima quinta-feira a partir de hoje.
// Se hoje e quinta, retorna hoje (entrega em curso). Em qualquer outro dia,
// retorna a proxima quinta seguinte.
const _DIAS_SEMANA_FULL_PT=["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
const _MESES_FULL_PT=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const proximaQuinta=(now=new Date())=>{
  const d=new Date(now);
  const diasAte=(4-d.getDay()+7)%7;
  d.setDate(d.getDate()+diasAte);
  return d;
};
const formatarDataEntrega=(d)=>`${_DIAS_SEMANA_FULL_PT[d.getDay()]}, ${d.getDate()} de ${_MESES_FULL_PT[d.getMonth()]}`;

const D={
  nome:"Beatriz",
  entrega:{dia:formatarDataEntrega(proximaQuinta()),produto:"1 Pão Original (700g)"},
  assinatura:{itens:"1 Pão Original (700g) / semana",valorMensal:99,qtdPaes:1},
  ent:{dia:"Quintas",cond:"Ed. Boa Vista",bloco:"Bl. A / 502",frete:"R$ 15/mês"},
  cob:{mes:"Março",valor:"R$ 99,00",status:"Pago"},
  semanasRestantes:2,
  // `genero` controla a flexão do toast pós-adicionar ("adicionada"/"adicionado").
  // `subCopy` é a sub-copy emocional do hero da Novidade (briefing 5.3).
  // Quando o Backoffice nascer, ambos viram campo do produto no banco.
  extras:[{id:"focaccia",nome:"Focaccia Genovesa",peso:"430g",preco:"R$ 22,00",precoNum:22,genero:"f",subCopy:"Pra um café da tarde diferente.",img:IMG.focaccia,desc:"Joia da Ligúria. Macia por dentro, dourada por fora. Cobertura de azeite, alecrim e cebola roxa.",sobre:"Joia da culinária da Ligúria, no norte da Itália. A versão autêntica genovesa tem espessura fina, cerca de 2 cm, miolo extremamente macio e crosta dourada e levemente crocante. O segredo está na generosidade do azeite extra virgem e na salmoura que preenche os buraquinhos característicos. A tradição leva alecrim e sal grosso. Na Cora entra também um pouco de cebola roxa. É um pão meio pizza, leve, com cobertura que dá vontade de comer o tabuleiro inteiro. Sai do forno no tabuleiro e vai vendida em pedaços.",ingredientes:"Farinha de trigo italiana, água mineral, azeite extra virgem, levain Cora, sal marinho, alecrim e cebola roxa"}],
  pães:[
    {id:"original",nome:"Pão Original",peso:"700g",preco:"R$ 27,00",precoNum:27,genero:"m",img:IMG.original,desc:"O pão do dia a dia. Vai com manteiga no café e com azeite no jantar.",sobre:"Foi com esse pão que tudo começou. Hugo repetiu a receita por anos até chegar num resultado que dava orgulho, e foi nesse processo que a paixão pela panificação se formou. Blend de farinha italiana com um toque de integral brasileira pra ganhar sabor. 24 horas de fermentação, 72% de hidratação.",ingredientes:"Farinha de trigo italiana, água mineral, levain Cora, farinha integral brasileira e sal marinho",subCopy:"O pão que começou tudo.",qtd:1},
    {id:"integral",nome:"Pão Integral",peso:"700g",preco:"R$ 29,00",precoNum:29,genero:"m",img:IMG.integral,desc:"A versão integral do Original. Leve, macia, com gergelim na crosta.",sobre:"A versão integral tinha que ser tão versátil quanto o Original. Leve, macia, longe daqueles integrais que parecem tijolo. O processo exige mais cuidado, e o resultado vale. Farinha 100% integral da Fazenda Vargem, um toque de azeite extra virgem que traz maciez, gergelim na crosta. A receita veio quase toda de um curso, com ajustes pra ficar com a cara da Cora. Fermentação com o levain Cora, 77% de hidratação.",ingredientes:"Farinha integral Fazenda Vargem, água mineral, levain Cora, azeite extra virgem, sal marinho e gergelim",subCopy:"Integral leve, todo dia.",qtd:0},
  ],
  rotativos:[
    {id:"multigraos",nome:"Multigrãos",peso:"615g",preco:"R$ 32,00",precoNum:32,genero:"m",img:IMG.multigraos,desc:"Seis grãos torrados e escaldados no miolo. Crosta de farelo de aveia. O pão das ocasiões.",sobre:"Receita aprendida com Alex Duarte, do ISPA. Seis grãos diferentes no miolo, crosta de farelo de aveia. O processo de torrar e escaldar os grãos antes de incorporar traz um perfume e uma profundidade de sabor que vale cada mordida. É o pão mais indulgente da Cora, pra uma celebração que pode ser do dia a dia ou de algo especial. Com 110% de hidratação, exige mais atenção do padeiro. Qualquer deslize compromete o resultado.",ingredientes:"Blend de farinhas, água mineral, gergelim branco sem casca, gergelim preto, quinoa, linhaça dourada, semente de girassol, semente de abóbora, farelo de aveia, levain Cora e sal marinho",subCopy:"Quando o pão é a celebração."},
    {id:"focaccia",nome:"Focaccia Genovesa",peso:"430g",preco:"R$ 22,00",precoNum:22,genero:"f",img:IMG.focaccia,desc:"Joia da Ligúria. Macia por dentro, dourada por fora. Cobertura de azeite, alecrim e cebola roxa.",sobre:"Joia da culinária da Ligúria, no norte da Itália. A versão autêntica genovesa tem espessura fina, cerca de 2 cm, miolo extremamente macio e crosta dourada e levemente crocante. O segredo está na generosidade do azeite extra virgem e na salmoura que preenche os buraquinhos característicos. A tradição leva alecrim e sal grosso. Na Cora entra também um pouco de cebola roxa. É um pão meio pizza, leve, com cobertura que dá vontade de comer o tabuleiro inteiro. Sai do forno no tabuleiro e vai vendida em pedaços.",ingredientes:"Farinha de trigo italiana, água mineral, azeite extra virgem, levain Cora, sal marinho, alecrim e cebola roxa",subCopy:"Pra um café da tarde diferente."},
    {id:"ciabatta",nome:"Ciabatta",peso:"533g",preco:"R$ 25,00",precoNum:25,genero:"f",img:IMG.ciabatta,desc:"Miolo cheio de alvéolos, casca fina e crocante. O pão do sanduíche ou da refeição.",sobre:"Ciabatta significa chinelo em italiano, pelo formato achatado e largo. É invenção recente: foi criada em 1982 por Arnaldo Cavallari, em Adria, perto de Veneza. Ele queria um pão italiano que competisse com a baguete francesa nos sanduíches. O segredo das bolhas grandes está na hidratação alta. A massa fica úmida e difícil de manipular, exige técnica e paciência. Blend de farinha italiana com 10% de farinha integral e um fio de azeite. Miolo leve e elástico, casca fina e crocante, com camada generosa de farinha por fora.",ingredientes:"Blend de farinha italiana e farinha integral, água mineral, levain Cora, sal marinho e azeite extra virgem",subCopy:"Casca crocante, miolo aerado."},
    {id:"brioche",nome:"Brioche",peso:"256g",preco:"R$ 32,00",precoNum:32,genero:"m",img:IMG.brioche,desc:"Macio, levemente adocicado, com perfume cítrico. Cabe na lancheira da escola e no café da manhã sem pressa.",sobre:"Brioche que junta a tradição francesa com técnica italiana. Blend de farinha italiana com um toque de semola, ovos, manteiga, leite e mel. Açúcar aromatizado com raspas de laranja, limão siciliano e baunilha. Pão leve, com leve doçura e perfume cítrico. Fermentação lenta, 100% levain Cora. Exige atenção constante na temperatura pra não perder o ponto da massa. Hugo desenhou pensando nas crianças, num lanche fácil de mastigar pra escola. Adulto também não resiste.",ingredientes:"Blend de farinha italiana e semola, ovos, manteiga, levain Cora, leite, açúcar, mel, sal marinho, raspas de laranja, raspas de limão siciliano e baunilha",subCopy:"O lanche fácil."},
  ],
  semana:{pedidosAbertos:false,cardapioProxima:["Pão Original","Pão Integral","Focaccia Genovesa"],entregaProxima:formatarDataEntrega(proximaQuinta(new Date(Date.now()+7*24*60*60*1000)))},
};

const I=({d,size=20,color=W[400],sw=1.5})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const ic={
  home:<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  wheat:<><path d="M2 22L16 8"/><path d="M3.47 12.53L5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94z"/><path d="M7.47 8.53L9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94z"/><path d="M11.47 4.53L13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94z"/></>,
  utensils:<><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></>,
  user:<><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  clock:<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  check:<><polyline points="20 6 9 17 4 12"/></>,
  chev:<><polyline points="9 18 15 12 9 6"/></>,
  chevDown:<><polyline points="6 9 12 15 18 9"/></>,
  users:<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  file:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  msg:<><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></>,
  eye:<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
  eyeOff:<><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></>,
  logout:<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  cal:<><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  edit:<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
  bag:<><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></>,
};

// ─── IMAGE COMPONENTS (edge-to-edge support) ───
const ProductImg=({src,h=120,alt="",rounded=true,style:es})=><img src={src} alt={alt} loading="lazy" decoding="async" style={{width:"100%",height:h,objectFit:"cover",display:"block",borderRadius:rounded?radii.lg:0,...es}}/>;
const ProductThumb=({src,w=56,h=48,alt="",style:es})=><img src={src} alt={alt} loading="lazy" decoding="async" style={{width:w,height:h,borderRadius:radii.md,objectFit:"cover",flexShrink:0,display:"block",...es}}/>;

// ─── SHARED COMPONENTS ───
const Card=({children,style,onClick,ariaLabel})=>{const[h,setH]=useState(false);return<div role={onClick?"button":undefined} aria-label={ariaLabel} onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:W[100],border:`1px solid ${h&&onClick?W[300]:W[200]}`,borderRadius:radii.lg,padding:16,transition:"border-color 150ms ease",...style}}>{children}</div>;};
const SL=({t})=><div style={{fontFamily:fd,fontSize:15,textTransform:"uppercase",color:W[500],letterSpacing:"0.04em",marginBottom:8,lineHeight:1}}>{t}</div>;
const Badge=({label,type="success"})=>{const s=ST[type]||ST.success;return<span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,fontWeight:500,fontFamily:fb,padding:"4px 10px",borderRadius:radii.xs,background:s.bg,color:s.t,border:`1px solid ${s.b}`}}><span style={{fontSize:8}}>●</span>{label}</span>;};
// `ghost`: button transparente (warm-600 → warm-100 on hover, sem border). Compartilhado por
// Drawer "Editar cesta" Cancelar e Assinatura editável Cancelar (wireframe v4).
const Btn=({children,primary,ghost,disabled,onClick,style:es,full,ariaLabel})=>{
  const[h,setH]=useState(false);
  const visual = ghost ? {
    border:"none",
    background:!disabled&&h?W[100]:"transparent",
    color:disabled?W[400]:(!disabled&&h?W[700]:W[600]),
  } : {
    border:primary?"none":`1px solid ${h&&!disabled?B[600]:B[500]}`,
    background:primary?(disabled?W[200]:h?B[600]:B[500]):(h&&!disabled?B[50]:"none"),
    color:primary?(disabled?W[500]:"#FFF"):B[500],
  };
  return <button aria-label={ariaLabel} disabled={disabled} onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} className="press-scale" style={{
    padding:"12px 20px",borderRadius:radii.md,
    ...visual,
    fontFamily:fb,fontSize:14,fontWeight:500,
    cursor:disabled?(ghost?"not-allowed":"default"):"pointer",
    opacity:disabled&&!ghost?0.5:1,
    minHeight:44,width:full?"100%":"auto",
    transition:"all 150ms ease",...es
  }}>{children}</button>;
};
// QtyStepper [- N +] — usado na lista de extras do Card de Cesta da Home
// (variant brand sobre fundo brand-50) e no Drawer (Fase 3, variant neutro).
// SVG inline pros sinais − e + (mantém peso visual consistente, sem confusão
// com fontes do sistema). Borda muda conforme variant.
const QtyStepper=({qty,onIncrement,onDecrement,name,disabled=false,variant="brand",incrementDisabled,decrementDisabled})=>{
  const bColor=variant==="brand"?B[100]:W[300];
  const decDis=decrementDisabled!==undefined?decrementDisabled:disabled;
  const incDis=incrementDisabled!==undefined?incrementDisabled:disabled;
  const mkBtn=(dis)=>({
    width:32,height:32,padding:0,
    background:"transparent",border:"none",
    cursor:dis?"not-allowed":"pointer",
    color:dis?W[300]:B[500],
    display:"flex",alignItems:"center",justifyContent:"center",
  });
  return (
    <div onClick={e=>e.stopPropagation()} style={{
      display:"inline-flex",alignItems:"center",
      border:`1px solid ${bColor}`,borderRadius:radii.md,
      background:"#FFF",overflow:"hidden",flexShrink:0,
    }}>
      <button type="button" onClick={onDecrement} disabled={decDis} aria-label={`Diminuir ${name}`} style={mkBtn(decDis)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <span style={{
        minWidth:28,textAlign:"center",lineHeight:"32px",
        fontFamily:fb,fontWeight:600,fontSize:14,color:W[800],
        borderLeft:`1px solid ${bColor}`,borderRight:`1px solid ${bColor}`,
        fontVariantNumeric:"tabular-nums",
      }}>{qty}</span>
      <button type="button" onClick={onIncrement} disabled={incDis} aria-label={`Aumentar ${name}`} style={mkBtn(incDis)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  );
};
// Toast simples (1 mensagem com timer próprio). Mantido pra compat de chamadas
// que ainda passam `msg`/`vis` (toasts de polish em outras telas).
const Toast=({msg,vis})=>vis?<div role="status" aria-live="polite" style={{position:"fixed",bottom:72,left:16,right:16,maxWidth:358,margin:"0 auto",background:W[800],color:"#FFF",borderRadius:radii.md,padding:"12px 16px",zIndex:60,fontFamily:fb,fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:8,animation:"fadeUp 300ms ease"}}><I d={ic.check} size={16} color="#6EE7B7"/>{msg}</div>:null;

// ToastStack — pilha de até 3 toasts simultâneos (briefing 5.5).
// Mais recente no topo a 100% opacity; anteriores recuam (85% / 65%, scale
// 0.97 / 0.94). 4º toast empurra o mais antigo (auto-remove na hora). Cada
// toast tem timer próprio de 3.5s.
//
// API: `useToastStack()` retorna `{ toasts, push }`. `push(message)` adiciona
// um toast novo no topo. Renderizar `<ToastStack toasts={toasts}/>` perto do
// rodapé da tela (acima do Nav).
const TOAST_TTL_MS = 3500;
const TOAST_STACK_MAX = 3;
let __toastSeq = 0;
const useToastStack = () => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});
  useEffect(() => () => {
    // cleanup: limpa todos os timers pendentes
    Object.values(timersRef.current).forEach(clearTimeout);
    timersRef.current = {};
  }, []);
  const dismiss = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  };
  const push = (message) => {
    const id = ++__toastSeq;
    setToasts((prev) => {
      const next = [...prev, { id, message }];
      // Se passou do limite, dropa o mais antigo (e cancela o timer dele).
      while (next.length > TOAST_STACK_MAX) {
        const stale = next.shift();
        if (timersRef.current[stale.id]) {
          clearTimeout(timersRef.current[stale.id]);
          delete timersRef.current[stale.id];
        }
      }
      return next;
    });
    timersRef.current[id] = setTimeout(() => dismiss(id), TOAST_TTL_MS);
  };
  return { toasts, push };
};

// Toast stack — wireframe v2 tela 6 (CSS copiado quase verbatim).
//
// Container `.toast-stack`: flex column + gap:8px → separação real entre
// toasts (sem position:absolute em cada item). Toasts são filhos naturais
// do flex, na ordem do DOM (mais antigo primeiro, mais novo por último).
// Resultado visual: mais novo fica embaixo a 100% opacity; anteriores
// "sobem" no topo com classes `stacked-1` / `stacked-2`.
const TOAST_ACCENT = "#10B981";
const TOAST_SUCCESS_BORDER = "#6EE7B7";
const ToastStack = ({ toasts }) => {
  if (!toasts?.length) return null;
  // Ordena do mais antigo (topo) ao mais novo (fundo) — DOM order.
  const last = toasts.length - 1;
  return (
    <div className="toast-stack" aria-live="polite" style={{
      position:"fixed", left:16, right:16, bottom:72,
      maxWidth:358, margin:"0 auto",
      display:"flex", flexDirection:"column", gap:8, alignItems:"stretch",
      zIndex:60, pointerEvents:"none",
    }}>
      {toasts.map((t, i) => {
        // Conta a partir do mais novo (último do array). 0 = novo, 1 = anterior, 2 = mais antigo.
        const fromNewest = last - i;
        // Visual stacked-1 / stacked-2 conforme wireframe v2 tela 6.
        const opacity = fromNewest === 0 ? 1 : fromNewest === 1 ? 0.85 : 0.65;
        const scale = fromNewest === 0 ? 1 : fromNewest === 1 ? 0.97 : 0.94;
        const translateY = fromNewest === 0 ? 0 : fromNewest === 1 ? 2 : 4;
        return (
          <div key={t.id} role="status" style={{
            background: "#FFFFFF",
            border: `1px solid ${TOAST_SUCCESS_BORDER}`,
            borderLeft: `3px solid ${TOAST_ACCENT}`,
            borderRadius: radii.md,
            padding: "12px 14px",
            display: "flex", alignItems: "flex-start", gap: 10,
            fontFamily: fb, fontSize: 13, color: W[800], lineHeight: 1.4,
            opacity,
            transform: `scale(${scale}) translateY(${translateY}px)`,
            transition: "opacity 200ms ease, transform 200ms ease",
            // fadeUp dedicado só pro toast mais novo (entrada do topo).
            animation: fromNewest === 0 ? "toastFadeUp 280ms ease-out" : undefined,
            boxShadow: "0 4px 12px rgba(26,24,21,0.10)",
          }}>
            <span aria-hidden="true" style={{
              width: 18, height: 18, borderRadius: "50%",
              background: TOAST_ACCENT, color: "#FFFFFF", flexShrink: 0,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              marginTop: 1,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </span>
            <span style={{ flex: 1 }}>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
};
const DeadlineWarning=()=><div style={{fontFamily:fb,fontSize:12,color:ST.warning.t,background:ST.warning.bg,padding:"8px 12px",borderRadius:radii.md,marginBottom:20,display:"inline-flex",alignItems:"center",gap:8,border:`1px solid ${ST.warning.b}`}}><I d={ic.clock} size={14} color={ST.warning.t}/>Pedidos até terça, 12h, para entrega na quinta</div>;
const CutoffMsg=()=><div style={{fontFamily:fb,fontSize:13,color:"#7A766E",marginTop:6}}>Prazo encerrado. Alterações valem a partir da próxima semana.</div>;
const CutoffBanner=({cutoff})=>{
  if(!cutoff)return null;
  const aberta=D.semana.pedidosAbertos;
  if(aberta){
    return<div style={{background:W[50],border:`1px solid ${W[200]}`,borderRadius:radii.md,padding:12,marginBottom:16,fontFamily:fb,fontSize:13,color:W[700],lineHeight:1.5}}>
      <I d={ic.cal} size={14} color={W[500]}/> Pedidos da próxima semana já estão abertos.
    </div>;
  }
  return<div style={{background:W[50],border:`1px solid ${W[200]}`,borderRadius:radii.md,padding:12,marginBottom:16,fontFamily:fb,fontSize:13,color:W[700],lineHeight:1.5}}>
    <I d={ic.clock} size={14} color={W[500]}/> Pedidos desta semana fechados. Os pedidos da próxima semana abrirão em breve.
  </div>;
};

// Microcopy unica para bloqueio de extras enquanto subscription
// esta com status pending_payment. Compartilhada por Home, Cardapio
// e OrderFooter pra manter o tom consistente.
const LOCK_REASON_PENDING="Disponível após confirmação do primeiro pagamento.";
const ActionBtn=({children,loadingText,successText,onAction,onComplete,primary,disabled:extDisabled,full,style:es,ariaLabel})=>{const[st,setSt]=useState('idle');const[err,setErr]=useState('');const handle=async()=>{if(st!=='idle')return;setSt('loading');setErr('');try{await onAction();setSt('success');setTimeout(()=>{setSt('idle');onComplete?.();},1500);}catch(e){setErr(e.message||'Erro ao processar. Tente novamente.');setSt('idle');}};const busy=st==='loading'||st==='success';const label=st==='loading'?loadingText:st==='success'?successText:children;const stStyle=st==='success'?{background:'#D1FAE5',color:'#065F46',border:'1px solid #6EE7B7',opacity:1}:{};return<><Btn primary={st!=='success'&&primary} disabled={busy||extDisabled} onClick={handle} full={full} ariaLabel={ariaLabel} style={{...es,...stStyle}}>{label}</Btn>{err&&<div style={{fontFamily:fb,fontSize:13,color:'#9A3412',background:'#FFEDD5',padding:'8px 12px',borderRadius:radii.md,marginTop:6}}>{err}</div>}</>;};

// O Modal de detalhes do produto saiu na Frente C item 3 (wireframe v2).
// ProductCard agora expande inline; NovidadeCard adiciona direto sem modal.
// QtyBtn local também sai junto (era usado pelo branch qty>0 do Modal).
// Nav inferior. `inicioBadge` true mostra um dot brand-500 no canto superior
// direito do ícone Início — indica `currentWeeklyOrder?.status === 'rascunho'`
// (briefing 3.6 / wireframe v2 tela 1, 4, 6).
const Nav=({active,onNav,inicioBadge=false})=>{
  const items=[{id:"home",label:"INÍCIO",icon:ic.home},{id:"assinatura",label:"ASSINATURA",icon:ic.wheat},{id:"cardapio",label:"CARDÁPIO",icon:ic.utensils},{id:"perfil",label:"PERFIL",icon:ic.user}];
  return<div style={{display:"flex",justifyContent:"space-around",alignItems:"center",padding:"8px 0 12px",borderTop:`1px solid ${W[200]}`,background:"#FFF",position:"sticky",bottom:0,zIndex:10,minHeight:56}}>
    {items.map(it=>(
      <button key={it.id} aria-label={`Ir para ${it.label}`} onClick={()=>onNav(it.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,border:"none",background:"none",cursor:"pointer",minWidth:56,minHeight:44,padding:"4px 0",position:"relative"}}>
        <span style={{position:"relative",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
          <I d={it.icon} size={22} color={active===it.id?B[500]:W[400]}/>
          {it.id==="home"&&inicioBadge&&<span aria-label="Você tem alterações na cesta" style={{
            position:"absolute",top:-2,right:-4,
            width:9,height:9,borderRadius:"50%",
            background:B[500],boxShadow:"0 0 0 2px #FFF",
          }}/>}
        </span>
        <span style={{fontFamily:fd,fontSize:11,letterSpacing:"0.02em",textTransform:"uppercase",color:active===it.id?B[500]:W[400]}}>{it.label}</span>
      </button>
    ))}
  </div>;
};

// ─── NOVIDADE HERO ───
// Wireframe v2 (Frente C item 3): foto grande edge-to-edge com tag "Novidade
// da semana" sobreposta no canto superior esquerdo, body com nome + meta
// ("{peso}") + sub-copy emocional + CTA split (label
// + preço tabular dentro do mesmo botão). Click no CTA adiciona direto ao
// carrinho — não abre modal.
const NovidadeCard=({extra,onAdd,cutoff,lockedReason})=>{
  const isLocked=!!lockedReason;
  const disabled=cutoff||isLocked;
  const precoLabel=(extra.preco||"").replace(/,00$/,"");
  return<div style={{
    background:"#FFF",
    border:`1px solid ${W[200]}`,
    borderRadius:radii.lg,
    overflow:"hidden",
    marginBottom:16,
  }} aria-label={`Novidade: ${extra.nome}`}>
    {/* Foto edge-to-edge com tag overlay */}
    <div style={{position:"relative"}}>
      <ProductImg src={extra.img} h={200} alt={extra.nome} rounded={false}/>
      <span style={{
        position:"absolute",top:12,left:12,
        fontFamily:fd,fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",
        color:B[700],background:"rgba(255,255,255,0.92)",
        padding:"5px 10px",borderRadius:radii.xs,fontWeight:600,
      }}>Novidade da semana</span>
    </div>
    {/* Body */}
    <div style={{padding:16}}>
      <div style={{fontFamily:fb,fontSize:18,fontWeight:600,color:W[800],lineHeight:1.3}}>{extra.nome}</div>
      <div style={{fontFamily:fb,fontSize:13,color:W[500],marginTop:2}}>{extra.peso}</div>
      {extra.subCopy&&<div style={{fontFamily:fb,fontSize:14,color:W[600],fontWeight:400,lineHeight:1.5,marginTop:10}}>{extra.subCopy}</div>}
      <button
        onClick={(e)=>{e.stopPropagation();if(!disabled) onAdd&&onAdd();}}
        disabled={disabled}
        className={disabled?"":"press-scale"}
        style={{
          marginTop:14,
          width:"100%",
          display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,
          padding:"12px 16px",
          borderRadius:radii.md,border:"none",
          background:B[500],color:"#FFF",
          fontFamily:fb,fontSize:14,fontWeight:500,
          cursor:disabled?"default":"pointer",
          opacity:disabled?0.5:1,
          minHeight:44,
        }}
      >
        <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:18,lineHeight:1}} aria-hidden="true">+</span>
          Adicionar à cesta
        </span>
        <span style={{fontVariantNumeric:"tabular-nums",fontWeight:500}}>{precoLabel}</span>
      </button>
      {cutoff&&<CutoffMsg/>}
      {isLocked&&!cutoff&&<div style={{fontFamily:fb,fontSize:12,color:W[500],marginTop:6,lineHeight:1.4}}>{lockedReason}</div>}
    </div>
  </div>;
};

// ─── WEEKLY ORDERS — helpers de nível de módulo ───
// Substitui (ou insere) um pedido no array por `delivery_date`,
// mantendo ordem ASC. Imutável.
const mergeOrder = (orders, order) => {
  const i = orders.findIndex(o => o.delivery_date === order.delivery_date);
  if (i === -1) {
    return [...orders, order].sort((a, b) => a.delivery_date.localeCompare(b.delivery_date));
  }
  const next = [...orders];
  next[i] = order;
  return next;
};

// Empty state com grafismo da marca. Para casos de "Nenhuma novidade" e afins.
const EmptyState=({title,body})=><div style={{background:W[100],border:`1px solid ${W[200]}`,borderRadius:radii.lg,padding:"32px 20px",textAlign:"center",marginBottom:16}}>
  <div style={{width:56,height:56,borderRadius:radii.full,background:"#FFF",border:`1px solid ${W[200]}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
    <img src="/images/grafismo_coracao.svg" alt="" aria-hidden="true" style={{width:32,height:32,opacity:0.6}}/>
  </div>
  {title&&<div style={{fontFamily:fd,fontSize:15,textTransform:"uppercase",color:W[600],letterSpacing:"0.04em",marginBottom:8}}>{title}</div>}
  {body&&<div style={{fontFamily:fb,fontSize:14,color:W[600],lineHeight:1.6,maxWidth:280,margin:"0 auto"}}>{body}</div>}
</div>;

// Hook de focus trap + ESC pra modais. `active` liga/desliga. `onClose` dispara no ESC.
const useModalA11y=(ref,active,onClose)=>{
  useEffect(()=>{
    if(!active||!ref.current) return;
    const el=ref.current;
    const selectors='button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const focusables=()=>Array.from(el.querySelectorAll(selectors)).filter(n=>n.offsetParent!==null);
    // Foca primeiro elemento apos abrir
    const prev=document.activeElement;
    setTimeout(()=>{const list=focusables();list[0]?.focus();},10);
    const onKey=(e)=>{
      if(e.key==='Escape'){e.stopPropagation();onClose&&onClose();return;}
      if(e.key!=='Tab') return;
      const list=focusables();
      if(list.length===0) return;
      const first=list[0],last=list[list.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',onKey);
    return()=>{document.removeEventListener('keydown',onKey);prev&&prev.focus&&prev.focus();};
  },[active,ref,onClose]);
};

// Animated number: interpola entre valor anterior e atual em 400ms (easeOutCubic).
// Respeita prefers-reduced-motion (usa o valor final direto).
const AnimatedNumber=({value,duration=400,format=fmt})=>{
  const[display,setDisplay]=useState(value);
  const prevRef=useRef(value);
  useEffect(()=>{
    const reduced=typeof window!=="undefined"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(reduced){setDisplay(value);prevRef.current=value;return;}
    const start=prevRef.current;const end=value;
    if(start===end) return;
    const t0=performance.now();let raf;
    const tick=(t)=>{
      const p=Math.min(1,(t-t0)/duration);
      const ease=1-Math.pow(1-p,3);
      setDisplay(start+(end-start)*ease);
      if(p<1) raf=requestAnimationFrame(tick);
      else prevRef.current=end;
    };
    raf=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(raf);
  },[value,duration]);
  return<>{format(display)}</>;
};

// ═══ HOME ═══
// `WeekTimeline`, `diasAteEntrega`, `formatarDataHero` (e seus arrays
// auxiliares MESES_CURTOS_PT / DIAS_SEMANA_PT) foram removidos no PR 2 Fase 2.
// O novo card da Cesta (briefing 5.2) não usa timeline visual nem "em X dias";
// a entrega é mostrada como "Entrega: quinta, 14 de maio."

// ─── EDITAR CARRINHO DRAWER (substitui o swapModal antigo) ───
// Bottom sheet com radio slots da assinatura + lista de extras + sumário + Confirmar.
// Trocar pão dispara updateComposition com debounce de 300ms (briefing 6.2).
// Remover extra dispara removeExtraFromCart imediato.
// Pós-cutoff: controles disabled.
const EditarCestaDrawer=({
  onClose,
  currentWeeklyOrder,
  currentExtras,
  assinaturaQtds,
  assinaturaBaseline,
  cestaAtual,
  onSetCestaSemana,
  updateComposition,
  removeExtraFromCart,
  addExtraToCart,
  confirmCurrentOrder,
  cutoff,
  pendingPayment,
  deliveryLabelFull,
  deliveryLabelShort,
  onNav,
  onConfirmedToast,
})=>{
  const dialogRef=useRef(null);
  useModalA11y(dialogRef,true,onClose);
  const baselineQtds=assinaturaBaseline||assinaturaQtds;
  const normalizeComp=(src)=>{const r={};D.pães.forEach(p=>{r[p.id]=(src&&src[p.id])||0;});return r;};
  const baselineNorm=normalizeComp(baselineQtds);
  const totalPaes=Object.values(baselineNorm).reduce((s,q)=>s+q,0);
  const[comp,setComp]=useState(()=>normalizeComp(cestaAtual||baselineQtds));
  const compDebounceRef=useRef(null);

  const isLocked=cutoff||pendingPayment;
  const isConfirmado=currentWeeklyOrder?.status==="confirmado";
  // Edição da composição fica liberada até o cutoff real (terça 12h), mesmo
  // com o pedido já confirmado — confirmar não congela a cesta. Antes isso
  // usava `isLocked||isConfirmado` e o CTA "Trocar pães" sumia pós-confirmação
  // (só voltava ao adicionar um extra, que reabria o pedido como rascunho).

  // Animação de remoção idêntica à Home (reusa keyframe slideOutFade 450ms).
  const[removing,setRemoving]=useState(()=>new Set());
  const removingTimersRef=useRef({});
  useEffect(()=>()=>{
    Object.values(removingTimersRef.current).forEach(clearTimeout);
    removingTimersRef.current={};
    if(compDebounceRef.current) clearTimeout(compDebounceRef.current);
  },[]);
  const handleExtraDecrement=(extra)=>{
    if(extra.qty>1){removeExtraFromCart(extra.id);return;}
    if(removing.has(extra.id)) return;
    setRemoving(prev=>{const next=new Set(prev);next.add(extra.id);return next;});
    removingTimersRef.current[extra.id]=setTimeout(()=>{
      removeExtraFromCart(extra.id);
      setRemoving(prev=>{const next=new Set(prev);next.delete(extra.id);return next;});
      delete removingTimersRef.current[extra.id];
    },450);
  };

  const triggerCompositionSave=(nextComp)=>{
    if(compDebounceRef.current) clearTimeout(compDebounceRef.current);
    compDebounceRef.current=setTimeout(()=>{
      const igual=D.pães.every(p=>(nextComp[p.id]||0)===(baselineNorm[p.id]||0));
      onSetCestaSemana(igual?null:nextComp);
      updateComposition(igual?null:nextComp);
    },300);
  };

  const applyComp=(nextComp)=>{
    setComp(nextComp);
    triggerCompositionSave(nextComp);
    // Auto-expand quando composição diverge do baseline (briefing v2 §C).
    // Disparo unidirecional: só abre, nunca fecha — preserva expansão após user reverter.
    if(!isLocked){
      const nextAlt=D.pães.some(p=>(nextComp[p.id]||0)!==(baselineNorm[p.id]||0));
      if(nextAlt) setIsAssinaturaOpen(true);
    }
  };

  // Swap atômico: capacity full + clique em + na row B com row A > 0 → A--, B++.
  // Evita deadlock no plano 1 pão e dá UX de 1 clique pra trocar tipos.
  const handleIncrement=(id)=>{
    if(isLocked) return;
    const sumAll=D.pães.reduce((s,p)=>s+(comp[p.id]||0),0);
    if(sumAll<totalPaes){applyComp({...comp,[id]:(comp[id]||0)+1});return;}
    const otherId=D.pães.find(p=>p.id!==id)?.id;
    if(otherId&&(comp[otherId]||0)>0){
      applyComp({...comp,[id]:(comp[id]||0)+1,[otherId]:comp[otherId]-1});
    }
  };

  const handleDecrement=(id)=>{
    if(isLocked) return;
    if((comp[id]||0)<=0) return;
    const sumAll=D.pães.reduce((s,p)=>s+(comp[p.id]||0),0);
    // Plano 1 pão: bloqueio do 0 total (cesta sem pão). Planos 2+: permite estado
    // inválido temporário (Confirmar fica disabled via isCompositionInvalid).
    if(totalPaes===1&&sumAll<=1) return;
    applyComp({...comp,[id]:comp[id]-1});
  };

  const revertToBaseline=()=>{
    if(isLocked) return;
    applyComp({...baselineNorm});
  };

  // Sem "Pão " prefixo: "1× Original + 1× Integral"
  const renderBaselineComposition=()=>D.pães
    .filter(p=>(baselineNorm[p.id]||0)>0)
    .map(p=>`${baselineNorm[p.id]}× ${p.nome.replace(/^Pão\s+/,"")}`)
    .join(" + ");

  const renderCompactComposition=()=>{
    const parts=D.pães.filter(p=>(comp[p.id]||0)>0).map(p=>`${comp[p.id]}× ${p.nome.replace(/^Pão\s+/,"")}`);
    return parts.length===0?"Cesta vazia":parts.join(" + ");
  };

  // Microcopy do CTA "Trocar pães" (Variante C, ponto 7): nomes derivados do
  // plano em vez de hardcoded — "Você pode trocar Original por Integral, sem
  // custo extra." Comunica que a troca 1:1 dentro do plano não tem custo.
  const _tiposPlano=D.pães.map(p=>p.nome.replace(/^Pão\s+/,""));
  const trocaHint=_tiposPlano.length>=2
    ?`Você pode trocar ${_tiposPlano[0]} por ${_tiposPlano[1]}, sem custo extra.`
    :"Você pode trocar os pães da semana, sem custo extra.";

  const sumAll=D.pães.reduce((s,p)=>s+(comp[p.id]||0),0);
  const hasAlteration=D.pães.some(p=>(comp[p.id]||0)!==(baselineNorm[p.id]||0));
  const isCompositionInvalid=sumAll!==totalPaes;
  const faltam=Math.max(0,totalPaes-sumAll);

  // Lazy initializer: abre no mount se composição inicial já diverge do baseline
  // (cesta customizada persistida) e não está locked. Mudanças subsequentes
  // disparam via applyComp. Estado locked é tratado em render via effectiveOpen.
  const[isAssinaturaOpen,setIsAssinaturaOpen]=useState(()=>{
    if(isLocked) return false;
    const initial=normalizeComp(cestaAtual||baselineQtds);
    return D.pães.some(p=>(initial[p.id]||0)!==(baselineNorm[p.id]||0));
  });
  const effectiveOpen=!isLocked&&isAssinaturaOpen;

  const totalExtras=currentExtras.reduce((s,e)=>s+e.qty*Number(e.preco_unit),0);
  const hasExtras=currentExtras.length>0;
  const isEmpty=!hasExtras&&!hasAlteration;

  // Sub-header copy (1 linha): contexto da entrega + cutoff.
  const headerSub=pendingPayment
    ? "Disponível após confirmação do primeiro pagamento."
    : cutoff
      ? "Prazo encerrado. Você poderá editar a próxima cesta."
      : `Entrega ${deliveryLabelFull} · pedidos até terça, 12h`;

  // Estados do botão Confirmar pedido (sempre visível no rodapé):
  //   - cutoff/pendingPayment → disabled (estado bloqueante)
  //   - status === 'confirmado' && !cutoff → "Confirmado ✓" disabled (success)
  //   - demais → "Confirmar pedido" enabled; POST só se rascunho, senão no-op
  const showConfirmadoState=isConfirmado&&!cutoff&&!pendingPayment;

  return<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(26,24,21,0.5)",zIndex:50,animation:"fadeIn 200ms ease"}}/>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Editar cesta da semana" style={{
      position:"fixed",bottom:0,left:0,right:0,maxWidth:390,margin:"0 auto",
      background:"#FFF",borderRadius:`${radii.xl} ${radii.xl} 0 0`,
      zIndex:51,maxHeight:"92vh",
      boxShadow:"0 -4px 24px rgba(26,24,21,0.12)",animation:"slideUp 300ms ease",
      display:"flex",flexDirection:"column",
    }}>
      {/* Grab handle decorativo (sinaliza bottom sheet) */}
      <div aria-hidden="true" style={{width:36,height:4,background:W[300],borderRadius:radii.full,margin:"8px auto 6px",flexShrink:0}}/>

      {/* HEAD — título + sub + fechar */}
      <div style={{padding:"6px 18px 12px",borderBottom:`1px solid ${W[200]}`,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
        <div style={{flex:1,minWidth:0}}>
          <h3 style={{fontFamily:fd,fontSize:20,textTransform:"uppercase",color:B[500],letterSpacing:"0.02em",margin:0,lineHeight:1.1}}>Editar cesta</h3>
          <div style={{fontFamily:fb,fontSize:12,color:isLocked?W[500]:W[500],marginTop:4,lineHeight:1.5}}>{headerSub}</div>
        </div>
        <button aria-label="Fechar" onClick={onClose} style={{width:36,height:36,borderRadius:radii.full,background:W[100],border:"none",cursor:"pointer",fontSize:18,color:W[600],display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
      </div>

      {/* BODY — scrollável */}
      <div style={{padding:"14px 18px",overflowY:"auto",flex:1}}>

        {/* Seção: Sua assinatura — colapsável. Default fechada; auto-expand quando alterado.
            Locked (pós-cutoff/pending): força fechada e remove o CTA de edição.
            Confirmado pré-cutoff segue editável (confirmar não congela a cesta). */}
        <div style={{opacity:isLocked?0.55:1}}>
          {/* Header estático (Variante C, ponto 7): label + composição compacta são
              leitura inerte. O convite pra abrir virou CTA ghost explícito abaixo —
              o chevron solto da v2 não comunicava clicabilidade (feedback tester). */}
          <div style={{padding:"4px 0"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span style={{fontFamily:fd,fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:W[500],lineHeight:1}}>Sua assinatura</span>
              {hasAlteration&&<span style={{
                display:"inline-flex",alignItems:"center",gap:4,
                padding:"3px 8px",borderRadius:radii.xs,
                background:ST.warning.bg,border:`1px solid ${ST.warning.b}`,color:ST.warning.t,
                fontFamily:fd,fontSize:10,letterSpacing:"0.06em",textTransform:"uppercase",lineHeight:1,
              }}>
                <span style={{fontSize:6}}>●</span>Trocado só esta semana
              </span>}
            </div>
            <div style={{fontFamily:fb,fontSize:14,color:W[700],lineHeight:1.3,marginTop:6}}>
              {renderCompactComposition()}
            </div>
          </div>
          {/* CTA ghost explícito + microcopy de benefício. Toggla a edição.
              Suprimido só quando locked (pós-cutoff/pending). */}
          {!isLocked&&<>
            <button
              type="button"
              onClick={()=>setIsAssinaturaOpen(prev=>!prev)}
              aria-expanded={effectiveOpen}
              aria-controls="assinatura-body"
              style={{
                marginTop:10,width:"100%",minHeight:40,
                display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,
                padding:"10px 12px",borderRadius:radii.md,
                background:"transparent",border:`1.5px solid ${B[500]}`,
                fontFamily:fb,fontSize:13.5,fontWeight:500,color:B[500],cursor:"pointer",
              }}>
              {/* Label espelha o estado: aberto (cesta editada abre expandida) vira
                  ação de fechar — antes ficava "Trocar pães…" com a seção já aberta. */}
              <span>{effectiveOpen?"Fechar troca de pães":"Trocar pães desta semana"}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{flexShrink:0,transform:effectiveOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform 200ms ease"}}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {/* Hint é convite pra abrir — some quando já está aberto (a seção tem a própria microcopy). */}
            {!effectiveOpen&&<div style={{fontFamily:fb,fontSize:11,color:W[500],lineHeight:1.45,margin:"6px 2px 0"}}>
              {trocaHint}
            </div>}
          </>}
          <div id="assinatura-body" style={{
            maxHeight:effectiveOpen?1000:0,
            overflow:"hidden",
            transition:"max-height 250ms ease-out",
          }}>
            <div style={{fontFamily:fb,fontSize:12,color:W[500],margin:"10px 0 10px"}}>
              {totalPaes} {totalPaes===1?"pão":"pães"} por semana · ajuste só esta semana
            </div>
            <div>
              {D.pães.map((p,i)=>{
                const qty=comp[p.id]||0;
                const otherId=D.pães.find(x=>x.id!==p.id)?.id;
                const isZero=qty===0;
                const decDis=isLocked||qty===0||(totalPaes===1&&sumAll<=1);
                const incDis=isLocked||(sumAll>=totalPaes&&(comp[otherId]||0)===0);
                return <div key={p.id} style={{
                  display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,
                  padding:"12px 0",
                  borderBottom:i<D.pães.length-1?`1px solid ${W[200]}`:"none",
                }}>
                  {/* opacity SÓ no name container: stepper íntegro permite que o `+` brand
                      em row esmaecida fique visualmente claro (signal do swap atômico). */}
                  <div style={{flex:1,minWidth:0,fontFamily:fb,fontSize:14,fontWeight:500,color:isZero?W[500]:W[800],opacity:isLocked?1:(isZero?0.55:1)}}>
                    {p.nome} <span style={{fontWeight:400,fontSize:12,color:W[500]}}>· {p.peso}</span>
                  </div>
                  <QtyStepper
                    qty={qty}
                    name={p.nome}
                    variant="neutral"
                    incrementDisabled={incDis}
                    decrementDisabled={decDis}
                    onIncrement={()=>handleIncrement(p.id)}
                    onDecrement={()=>handleDecrement(p.id)}
                  />
                </div>;
              })}
            </div>
            <div style={{
              marginTop:10,padding:"10px 14px",borderRadius:radii.md,
              background:isCompositionInvalid?ST.warning.bg:W[100],
              color:isCompositionInvalid?ST.warning.t:W[700],
              display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,
              fontFamily:fb,fontSize:13,
            }}>
              <span>Total da semana</span>
              <span style={{fontVariantNumeric:"tabular-nums"}}>
                <span style={{fontWeight:600}}>{sumAll}</span> de {totalPaes} {totalPaes===1?"pão":"pães"}
              </span>
            </div>
            {isCompositionInvalid&&<div style={{
              fontFamily:fb,fontSize:12,color:ST.warning.t,
              margin:"6px 0 0",lineHeight:1.4,
            }}>
              Sua cesta é composta por {totalPaes} {totalPaes===1?"pão":"pães"}, {faltam>1?`faltam ${faltam}`:`falta ${faltam}`}.
            </div>}
            {hasAlteration&&!isLocked&&<button onClick={revertToBaseline} style={{
              display:"inline-flex",alignItems:"center",gap:6,
              marginTop:10,padding:"6px 0",
              background:"transparent",border:"none",cursor:"pointer",
              fontFamily:fd,fontSize:11,letterSpacing:"0.05em",textTransform:"uppercase",
              color:B[500],
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
              Voltar pro padrão ({renderBaselineComposition()})
            </button>}
            {hasAlteration&&!isLocked&&<div style={{
              display:"flex",alignItems:"flex-start",gap:6,
              marginTop:10,padding:"8px 0",
              fontFamily:fb,fontSize:12,color:W[500],lineHeight:1.4,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={W[400]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}} aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <span>
                Vale só pra entrega de {deliveryLabelShort}. Pra mudar sua assinatura permanente,{" "}
                <button onClick={()=>{onClose();onNav&&onNav("assinatura");}} className="lk" style={{background:"none",border:"none",padding:0,fontFamily:fb,fontSize:12,color:B[500],textDecoration:"underline",cursor:"pointer"}}>vá em Assinatura</button>.
              </span>
            </div>}
          </div>
        </div>

        {/* Divisor visual entre seções (briefing v2 §4) */}
        <div aria-hidden="true" style={{height:1,background:W[200],margin:"18px 0 0"}}/>

        {/* Seção: Extras desta semana */}
        <div style={{fontFamily:fd,fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:W[500],margin:"14px 0 8px"}}>Extras desta semana</div>
        {hasExtras
          ?currentExtras.map((e,idx)=>{
              const isRemoving=removing.has(e.id);
              const isLastExtra=idx===currentExtras.length-1;
              return (
                <div key={e.id} className={isRemoving?"cesta-row-removing":undefined} style={{
                  display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,
                  padding:"12px 0",
                  borderBottom:isLastExtra?"none":`1px solid ${W[200]}`,
                }}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:fb,fontWeight:600,fontSize:14,color:W[800],lineHeight:1.3}}>{e.nome}</div>
                    <div style={{fontFamily:fb,fontSize:12,color:W[500],marginTop:2,fontVariantNumeric:"tabular-nums"}}>{fmt(Number(e.preco_unit))} · un.</div>
                  </div>
                  <QtyStepper
                    qty={e.qty}
                    name={e.nome}
                    variant="neutral"
                    disabled={isLocked||isRemoving}
                    onIncrement={()=>addExtraToCart({id:e.id,nome:e.nome,precoNum:Number(e.preco_unit)})}
                    onDecrement={()=>handleExtraDecrement(e)}
                  />
                </div>
              );
            })
          :<div style={{
              display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,
              padding:"14px",background:W[100],borderRadius:radii.md,marginBottom:4,
            }}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:fb,fontSize:14,fontWeight:600,color:W[700],lineHeight:1.3}}>Nada adicionado pra esta semana.</div>
                <div style={{fontFamily:fb,fontSize:12,color:W[500],marginTop:4,lineHeight:1.4}}>Confira nossos pães no cardápio. Em breve teremos novidades.</div>
              </div>
              <button
                type="button"
                onClick={()=>{onClose();onNav&&onNav("cardapio");}}
                style={{
                  display:"inline-flex",alignItems:"center",gap:4,flexShrink:0,
                  padding:"8px 12px",borderRadius:radii.md,
                  background:"transparent",border:`1px solid ${B[100]}`,
                  fontFamily:fb,fontSize:13,fontWeight:500,color:B[500],
                  cursor:"pointer",
                }}>
                Ver cardápio
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
        }

        {/* Total — só renderiza com extras presentes (briefing v2 §F) */}
        {hasExtras&&<div style={{
          display:"flex",justifyContent:"space-between",alignItems:"baseline",
          marginTop:10,padding:"12px 14px",
          background:W[100],borderRadius:radii.md,
        }}>
          <span style={{fontFamily:fb,fontSize:13,color:W[700]}}>Total de extras desta semana</span>
          <span style={{fontFamily:fb,fontSize:18,fontWeight:700,color:B[500],fontVariantNumeric:"tabular-nums"}}>{fmt(totalExtras)}</span>
        </div>}

        {/* Microcopy rodapé: lembrete de cobrança + cutoff (briefing 3.6) */}
        <div style={{
          display:"flex",alignItems:"flex-start",gap:6,marginTop:14,
          fontFamily:fb,fontSize:12,color:W[500],lineHeight:1.5,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={W[400]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}} aria-hidden="true">
            <rect x="2" y="5" width="20" height="14" rx="2"/>
            <line x1="2" y1="10" x2="22" y2="10"/>
          </svg>
          <span>Extras entram na sua próxima fatura. Alterações até terça, 12h.</span>
        </div>
      </div>

      {/* FOOT — 2 botões SEMPRE visíveis */}
      <div style={{
        padding:"12px 18px 18px",borderTop:`1px solid ${W[200]}`,
        display:"flex",gap:10,flexShrink:0,background:"#FFF",
      }}>
        <Btn ghost onClick={onClose} style={{flex:1}}>Cancelar</Btn>
        {showConfirmadoState
          ?(
            // Estado success: refinement do Hugo. Ação já feita, sem ambiguidade.
            <button disabled aria-label="Pedido confirmado" style={{
              flex:2,padding:"13px",borderRadius:radii.md,
              background:"#D1FAE5",color:"#065F46",
              border:"1px solid #6EE7B7",
              fontFamily:fb,fontSize:14,fontWeight:500,
              cursor:"default",minHeight:44,
              display:"flex",alignItems:"center",justifyContent:"center",gap:8,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Confirmado
            </button>
          )
          :(
            // Disabled quando bloqueado, composição inválida (sumAll≠totalPaes) ou empty
            // (sem extras E sem alteração na assinatura). Label vira "Sem alterações"
            // só no empty — composição inválida mantém "Confirmar pedido" pra preservar
            // o reconhecimento da ação, microcopy invalid já comunica o porquê.
            <ActionBtn primary
              disabled={isLocked||isCompositionInvalid||isEmpty}
              loadingText="Confirmando…"
              successText="Confirmado ✓"
              onAction={async()=>{
                // Promove rascunho → confirmado. Sem rascunho/já confirmado: no-op silencioso.
                if(currentWeeklyOrder?.status==="rascunho") await confirmCurrentOrder();
              }}
              onComplete={()=>{
                // Toast só quando houve POST (status era rascunho na hora do click).
                if(currentWeeklyOrder?.status==="rascunho") onConfirmedToast&&onConfirmedToast();
                onClose();
              }}
              style={{flex:2}}
              ariaLabel={isEmpty?"Sem alterações":"Confirmar pedido"}
            >{isEmpty?"Sem alterações":"Confirmar pedido"}</ActionBtn>
          )
        }
      </div>
    </div>
  </>;
};

// ─── HOME ───
// Redesign Frente C item 1 (briefing 5):
//  - Saudação temporal (sem flexão por gênero)
//  - Card da cesta com fundo brand-50, lista unificada (assinatura + extras),
//    badge/microcopy condicional, botão "Editar carrinho" e "Confirmar pedido"
//  - Novidade hero com sub-copy emocional e CTA "+ Adicionar à cesta — R$ X"
//  - Estado "semana sem destaque" quando D.extras vazio
const Home=({onNav,userData,isFirstVisit,onSeen,cutoff,assinaturaQtds,assinaturaBaseline,cestaAtual,onSetCestaSemana,pendingPayment,currentWeeklyOrder,currentExtras,addExtraToCart,removeExtraFromCart,updateComposition,confirmCurrentOrder})=>{
  const[drawerOpen,setDrawerOpen]=useState(false);
  const{toasts,push:pushToast}=useToastStack();
  // `showToast` mantém a assinatura legacy pros callers existentes (ActionBtn
  // do Confirmar, Drawer onConfirmedToast) — internamente vai pro stack.
  const showToast=(msg)=>pushToast(msg);

  const nome=userData?.nome?userData.nome.split(" ")[0]:D.nome;
  // Saudação unificada (briefing Frente C item 3, seção 3.4): sempre temporal,
  // sem flexão de gênero, sem distinção de "primeiro acesso".
  const _hora=new Date().getHours();
  const _periodo=_hora<12?"bom dia":_hora<18?"boa tarde":"boa noite";
  const saudacao=`Oi, ${nome}, ${_periodo}!`;

  // ─── Estado da cesta ───────────────────────────────────────────────
  const hasComposition=currentWeeklyOrder?.composition!=null;
  const hasExtras=currentExtras.length>0;
  const hasAlteration=hasComposition||hasExtras;
  const isRascunho=currentWeeklyOrder?.status==="rascunho";
  const isConfirmado=currentWeeklyOrder?.status==="confirmado";

  // ─── Formatação de datas ───────────────────────────────────────────
  const deliveryDate=currentWeeklyOrder?.delivery_date||nextEditableThursdayISO();
  // Parse com noon UTC pra evitar deriva BRT (UTC-3 ainda cai no mesmo dia)
  const deliveryDateObj=new Date(`${deliveryDate}T12:00:00Z`);
  const deliveryLabelFull=formatarDataEntrega(deliveryDateObj);
  const fmtDdMm=(dt)=>`${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}`;
  const deliveryLabelShort=fmtDdMm(deliveryDateObj);

  // ─── Lista de assinatura ───────────────────────────────────────────
  // 1 entry por pão da composição atual (com swap se houver).
  // Linhas de extras vêm direto de currentExtras (1 entry por id, qty agregada).
  const baselineQtds=assinaturaBaseline||assinaturaQtds;
  const assinaturaItems=Object.entries(cestaAtual||{}).filter(([,q])=>q>0).map(([id,q])=>{
    const pao=D.pães.find(p=>p.id===id);
    if(!pao) return null;
    const baselineQty=baselineQtds?.[id]||0;
    const wasSwapped=hasComposition&&baselineQty!==q;
    return{id,nome:pao.nome,qty:q,tag:wasSwapped?"Trocado":"Assinatura"};
  }).filter(Boolean);

  // ─── Microcopy condicional (Fase 2): só Confirmado + Cutoff ────────
  // Briefing: Badge "Pedido não confirmado" + microcopy de rascunho saem
  // (informação migra pro badge do Nav). Mantém pós-confirmação e pós-cutoff.
  let microcopy=null;
  if(cutoff&&!isConfirmado){
    microcopy={text:"Prazo encerrado. Esta semana você recebe a cesta da assinatura. Pode editar a próxima.",color:W[500]};
  } else if(isConfirmado&&currentWeeklyOrder?.confirmed_at){
    microcopy={text:`Pedido confirmado em ${fmtDdMm(new Date(currentWeeklyOrder.confirmed_at))}.`,color:W[500]};
  }

  // Total dos extras (assinatura é "Incluso", não soma).
  const totalExtras=currentExtras.reduce((s,e)=>s+e.qty*Number(e.preco_unit),0);
  const showConfirmar=isRascunho&&hasAlteration&&!cutoff;
  const editarDisabled=cutoff&&isConfirmado;

  // ─── Animação de remoção de extra ──────────────────────────────────
  // Quando user clica `-` em qty=1: marca o id em `removing`, aguarda 200ms
  // de animação CSS, e dispara removeExtraFromCart. Pra qty>1 decrementa
  // direto sem animação.
  const[removing,setRemoving]=useState(()=>new Set());
  const removingTimersRef=useRef({});
  useEffect(()=>()=>{
    Object.values(removingTimersRef.current).forEach(clearTimeout);
    removingTimersRef.current={};
  },[]);
  const handleExtraDecrement=(extra)=>{
    if(extra.qty>1){removeExtraFromCart(extra.id);return;}
    // qty===1 → anima e remove depois.
    if(removing.has(extra.id)) return;
    setRemoving(prev=>{const next=new Set(prev);next.add(extra.id);return next;});
    removingTimersRef.current[extra.id]=setTimeout(()=>{
      removeExtraFromCart(extra.id);
      // Cleanup do Set no próprio callback do timer (evita setState-in-effect).
      setRemoving(prev=>{const next=new Set(prev);next.delete(extra.id);return next;});
      delete removingTimersRef.current[extra.id];
    },450);
  };

  useEffect(()=>{if(!isFirstVisit||!onSeen)return;const t=setTimeout(onSeen,5000);return()=>clearTimeout(t);},[isFirstVisit,onSeen]);

  // Handler do CTA do NovidadeCard: POST + toast com flexão.
  const handleNovidadeAdd=async(produto)=>{
    try{await addExtraToCart(produto);}
    catch(err){console.error("[Home] addExtraToCart failed",err); return;}
    const verb=(produto.genero||"m")==="f"?"adicionada":"adicionado";
    pushToast(`${produto.nome} ${verb} à cesta.`);
  };

  return<div style={{padding:"24px 16px 16px"}}>
    {/* Saudação temporal unificada (wireframe v2 tela 4: page-title 26px,
        margin-top 4px, League Gothic uppercase). */}
    <h1 style={{fontFamily:fd,fontSize:26,textTransform:"uppercase",color:B[500],letterSpacing:"0.02em",margin:"4px 0 16px",lineHeight:1.05}}>{saudacao}</h1>

    <CutoffBanner cutoff={cutoff}/>

    {/* Card da Cesta — fundo brand-50, lista com separadores dashed,
        linhas de assinatura "Incluso" + extras com [- N +] (wireframe v2 tela 4). */}
    <Card style={{marginBottom:16,padding:20,background:B[50],border:`1px solid ${B[100]}`,borderRadius:radii.lg}} ariaLabel={`Cesta da semana: ${deliveryLabelFull}`}>
      {/* Cabeçalho: label pequeno + título da entrega */}
      <div style={{fontFamily:fd,fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:B[600],marginBottom:4}}>Sua cesta desta semana</div>
      <div style={{fontFamily:fb,fontSize:16,fontWeight:600,color:B[800],lineHeight:1.3,marginBottom:10}}>Entrega {deliveryLabelFull}</div>

      {/* Lista — assinatura primeiro, extras depois. Rows separadas por dashed
          border, exceto a última (evita fio duplo com o sólido do total: a
          hierarquia visual é tracejado = itens da lista, sólido = transição
          lista → resumo). */}
      <div style={{display:"flex",flexDirection:"column"}}>
        {assinaturaItems.map((item,idx)=>{
          // Borda some na última row da seção SE não houver extras depois.
          const isLastGlobal=idx===assinaturaItems.length-1&&currentExtras.length===0;
          return (
            <div key={`a-${item.id}-${item.tag}`} style={{
              display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,
              padding:"10px 0",borderBottom:isLastGlobal?"none":`1px dashed ${B[100]}`,
              fontFamily:fb,fontSize:14,color:B[800],lineHeight:1.4,
            }}>
              <div style={{flex:1}}>
                {item.qty}× {item.nome}{" "}
                <span style={{
                  display:"inline-block",marginLeft:4,fontFamily:fd,fontSize:11,
                  textTransform:"uppercase",letterSpacing:"0.06em",color:B[600],
                  background:"#FFF",border:`1px solid ${B[100]}`,
                  padding:"1px 5px",borderRadius:radii.xs,verticalAlign:"1px",
                }}>{item.tag}</span>
              </div>
              <div style={{fontFamily:fb,fontWeight:600,fontSize:14,color:B[700],fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>Incluso</div>
            </div>
          );
        })}
        {currentExtras.map((e,idx)=>{
          const isLastGlobal=idx===currentExtras.length-1;
          const isRemoving=removing.has(e.id);
          return (
            <div key={`e-${e.id}`} className={isRemoving?"cesta-row-removing":undefined} style={{
              display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,
              padding:"10px 0",borderBottom:isLastGlobal?"none":`1px dashed ${B[100]}`,
              fontFamily:fb,fontSize:14,color:B[800],lineHeight:1.4,
            }}>
              <div style={{flex:1}}>{e.qty}× {e.nome}</div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontFamily:fb,fontWeight:600,fontSize:14,color:B[700],fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>{fmt(Number(e.preco_unit)*e.qty)}</span>
                {!cutoff&&!isConfirmado&&<QtyStepper
                  qty={e.qty}
                  name={e.nome}
                  variant="brand"
                  disabled={isRemoving}
                  onIncrement={()=>addExtraToCart({id:e.id,nome:e.nome,precoNum:Number(e.preco_unit)})}
                  onDecrement={()=>handleExtraDecrement(e)}
                />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total — só extras (assinatura é "Incluso", coberta pelo plano). */}
      <div style={{
        display:"flex",justifyContent:"space-between",alignItems:"baseline",
        padding:"12px 0 0",marginTop:6,borderTop:`1px solid ${B[100]}`,
      }}>
        <span style={{fontFamily:fb,fontSize:12,color:B[700]}}>Extras desta semana</span>
        <span style={{fontFamily:fb,fontSize:18,fontWeight:700,color:B[500],fontVariantNumeric:"tabular-nums"}}>{fmt(totalExtras)}</span>
      </div>

      {/* Microcopy condicional: só pós-confirmação e pós-cutoff. */}
      {microcopy&&<div style={{fontFamily:fb,fontSize:13,color:microcopy.color,marginTop:8,lineHeight:1.5}}>{microcopy.text}</div>}

      {/* Confirmar pedido (mantido entre total e Editar cesta). */}
      {showConfirmar&&<ActionBtn primary full
        loadingText="Confirmando…"
        successText="Confirmado ✓"
        onAction={async()=>{await confirmCurrentOrder();}}
        onComplete={()=>showToast(`Cesta confirmada. Entrega ${deliveryLabelShort}.`)}
        ariaLabel="Confirmar pedido"
        style={{marginTop:12}}
      >Confirmar pedido</ActionBtn>}

      {/* Editar cesta — link ghost dashed com ícone pencil (wireframe v2 tela 4). */}
      <button onClick={()=>setDrawerOpen(true)} disabled={editarDisabled} className="press-scale" style={{
        display:"flex",alignItems:"center",justifyContent:"center",gap:6,
        width:"100%",marginTop:10,padding:"8px 12px",
        background:"transparent",border:`1px dashed ${B[100]}`,borderRadius:radii.md,
        fontFamily:fd,fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",
        color:B[500],cursor:editarDisabled?"default":"pointer",
        opacity:editarDisabled?0.4:1,transition:"all 150ms ease",minHeight:40,
      }} onMouseEnter={e=>{if(!editarDisabled){e.currentTarget.style.background="#FFF";e.currentTarget.style.borderStyle="solid";}}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderStyle="dashed";}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        Editar cesta
      </button>
    </Card>

    {/* Novidade hero — clique no CTA adiciona direto (sem modal de detalhes).
        Empty state reusa <EmptyState> (mesmo card do Cardápio): sem CTA embutido
        pra evitar duplicação com o link "→ Ver tudo no Cardápio" abaixo. */}
    {D.extras.length>0
      ?<NovidadeCard extra={D.extras[0]} onAdd={()=>handleNovidadeAdd(D.extras[0])} cutoff={cutoff} lockedReason={pendingPayment?LOCK_REASON_PENDING:undefined}/>
      :<EmptyState title="Novidade da semana" body="Nenhuma novidade esta semana."/>
    }

    <div onClick={()=>onNav("cardapio")} className="lk" style={{fontFamily:fb,fontSize:14,color:B[500],fontWeight:500,textAlign:"center",padding:"8px 0",cursor:"pointer"}}>→ Ver tudo no Cardápio</div>

    {/* Drawer */}
    {drawerOpen&&<EditarCestaDrawer
      onClose={()=>setDrawerOpen(false)}
      currentWeeklyOrder={currentWeeklyOrder}
      currentExtras={currentExtras}
      assinaturaQtds={assinaturaQtds}
      assinaturaBaseline={assinaturaBaseline}
      cestaAtual={cestaAtual}
      onSetCestaSemana={onSetCestaSemana}
      updateComposition={updateComposition}
      removeExtraFromCart={removeExtraFromCart}
      addExtraToCart={addExtraToCart}
      confirmCurrentOrder={confirmCurrentOrder}
      cutoff={cutoff}
      pendingPayment={pendingPayment}
      deliveryLabelFull={deliveryLabelFull}
      deliveryLabelShort={deliveryLabelShort}
      onNav={onNav}
      onConfirmedToast={()=>showToast(`Cesta confirmada. Entrega ${deliveryLabelShort}.`)}
    />}

    <ToastStack toasts={toasts}/>
  </div>;
};

// ═══ ASSINATURA ═══
// Frente C item 2 (Fase 2 + 3) — wireframe v4.
// • Fase 2: tela idle reorganizada (Plano atual + Convite + read-only blocks + microcopy WA)
// • Fase 3: edição inline (card vira "Alterar plano" com QtyStepper + ev-block + footer)
// O modal de confirmação + POST com AbortController vem na Fase 4.
const Assinatura=({hasPending,cutoff,subscription,assinaturaQtds,onAlterado})=>{
  const[editing,setEditing]=useState(false);
  // Rascunho local durante a edição (composição em construção). Cancel descarta.
  // Reset feito explicitamente nos handlers (abrir/cancelar) — evita useEffect+setState.
  const[rascunho,setRascunho]=useState(()=>({...assinaturaQtds}));

  // Fase 4: modal de confirmação + POST com AbortController + toasts.
  const[confirmModal,setConfirmModal]=useState(false);
  const[saving,setSaving]=useState(false);
  const[saveError,setSaveError]=useState(null);
  const[successMsg,setSuccessMsg]=useState(null);
  const abortControllerRef=useRef(null);
  const confirmDialogRef=useRef(null);
  useModalA11y(confirmDialogRef,confirmModal,()=>{if(!saving) setConfirmModal(false);});
  // Cleanup: aborta POST pendente em unmount (evita setState após dismount).
  useEffect(()=>()=>{abortControllerRef.current?.abort();},[]);
  // Auto-dismiss dos toasts.
  useEffect(()=>{
    if(!successMsg) return;
    const t=setTimeout(()=>setSuccessMsg(null),4000);
    return()=>clearTimeout(t);
  },[successMsg]);
  useEffect(()=>{
    if(!saveError) return;
    const t=setTimeout(()=>setSaveError(null),4000);
    return()=>clearTimeout(t);
  },[saveError]);

  // ===== Estado vigente (baseline) =====
  const total_paes=Object.values(assinaturaQtds||{}).reduce((s,q)=>s+q,0);
  const valor_paes=total_paes*99;
  const valor_frete=15;
  const valor_mensal=valor_paes+valor_frete;

  // "1× Pão Original + 1× Pão Integral" (sem peso, com × separador). Mantém nome completo.
  const planCompList=D.pães.filter(p=>(assinaturaQtds?.[p.id]||0)>0).map(p=>`${assinaturaQtds[p.id]}× ${p.nome}`).join(" + ")||"Sem pães";

  // Formato do summary do modal: "2 pães · 2× Pão Original + 1× Pão Integral".
  // Padrão da marca: sempre N× antes do nome do produto.
  const fmtPlanFull=(qtds)=>{
    const t=D.pães.reduce((s,p)=>s+(qtds?.[p.id]||0),0);
    const parts=D.pães.filter(p=>(qtds?.[p.id]||0)>0).map(p=>`${qtds[p.id]}× ${p.nome}`);
    return `${t} ${t===1?"pão":"pães"} · ${parts.join(" + ")}`;
  };

  // ===== Estado do rascunho (Fase 3) =====
  const sumAll=D.pães.reduce((s,p)=>s+(rascunho?.[p.id]||0),0);
  const rascunhoValorPaes=sumAll*99;
  const rascunhoValorMensal=rascunhoValorPaes+valor_frete;
  const hasAlteration=D.pães.some(p=>(rascunho?.[p.id]||0)!==(assinaturaQtds?.[p.id]||0));
  const isCompositionInvalid=sumAll===0;
  const canSave=hasAlteration&&!isCompositionInvalid;
  // Cenário A: nova composição vale a partir da próxima entrega editável.
  // Cobrança nova começa no primeiro dia do próximo mês (mês alinhado).
  const fmtDdMm=(d)=>`${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
  const proxDelivery=new Date(`${nextSubscriptionChangeThursdayISO()}T12:00:00Z`);
  const proxDeliveryDdMm=fmtDdMm(proxDelivery);
  const today=new Date();
  const proximoDia1=new Date(today.getFullYear(),today.getMonth()+1,1);
  const proximaFaturaDdMm=fmtDdMm(proximoDia1);
  const ehSwap=hasAlteration&&!isCompositionInvalid&&sumAll===total_paes;
  const ehMudancaTotal=hasAlteration&&!isCompositionInvalid&&sumAll!==total_paes;

  // ===== State derivado pós-mudança (Fase 5) =====
  // has_pending_change: há alteração agendada cuja cobrança nova ainda não entrou.
  // Gate pela data de cobrança (next_billing_change_date > today). Quando a data
  // passa (Hugo gera o link novo no Asaas e limpa os campos, ou só a data passa),
  // a microcopy some sozinha.
  const pendingChangeDeliveryISO=subscription?.next_composition_delivery;
  const hasPendingChange=!!subscription?.next_billing_change_date
    &&subscription?.next_billing_value!=null
    &&new Date(`${subscription.next_billing_change_date}T00:00:00Z`)>today;
  const pendingChangeDeliveryDdMm=pendingChangeDeliveryISO?fmtDdMm(new Date(`${pendingChangeDeliveryISO}T12:00:00Z`)):null;

  // ===== Handlers do rascunho =====
  // Swap atômico SÓ no cap absoluto (sumAll===3) — diferente do Drawer porque
  // aqui total_paes é variável (cliente pode mudar de plano 1↔2↔3). Em estados
  // intermediários (sumAll<3) o + incrementa direto pra permitir aumento natural
  // de plano. Tradeoff: plano 1 → trocar tipo exige 2 cliques (+ outro, - antigo).
  const handleIncrement=(id)=>{
    const otherId=D.pães.find(p=>p.id!==id)?.id;
    const otherQty=rascunho?.[otherId]||0;
    if(sumAll===3&&otherQty>0){
      setRascunho(prev=>({...prev,[id]:(prev?.[id]||0)+1,[otherId]:prev[otherId]-1}));
      return;
    }
    if(sumAll>=3) return; // cap absoluto sem swap possível
    setRascunho(prev=>({...prev,[id]:(prev?.[id]||0)+1}));
  };
  const handleDecrement=(id)=>{
    const qty=rascunho?.[id]||0;
    if(qty<=0) return;
    // Safety net pra plano 1 pão: não pode zerar (sem como recuperar via decrement).
    if(total_paes===1&&sumAll<=1) return;
    setRascunho(prev=>({...prev,[id]:prev[id]-1}));
  };
  const handleCancelEdit=()=>{setRascunho({...assinaturaQtds});setEditing(false);};
  const handleSalvar=()=>setConfirmModal(true);

  const handleConfirmarMudanca=async()=>{
    setSaving(true);setSaveError(null);
    abortControllerRef.current=new AbortController();
    try{
      // PATCH real — backend recalcula valores e datas; só enviamos a composição.
      const backendUpdated=await patchSubscription(
        subscription.id,
        {itens:{...rascunho},total_paes:sumAll},
        abortControllerRef.current.signal,
      );
      // Merge: preserva o snapshot local (endereço, nome, cpf… que o backend não
      // retorna), sobrescreve com os campos autoritativos do backend, e injeta o
      // snapshot client-side da entrega em vigor (microcopy estável — não vem do
      // backend, não recalcula ao vivo pra não "andar" após o cutoff).
      const updated={
        ...subscription,
        ...backendUpdated,
        next_composition_delivery:nextSubscriptionChangeThursdayISO(),
      };
      setSaving(false);
      setConfirmModal(false);
      setEditing(false);
      setSuccessMsg(`Mudança confirmada. Vale a partir da entrega de ${proxDeliveryDdMm}.`);
      onAlterado?.(updated);
    }catch(err){
      setSaving(false);
      if(err?.name==="AbortError"){
        // Cancel durante PATCH: fecha modal, volta pro edit com rascunho preservado.
        setConfirmModal(false);
        return;
      }
      setSaveError("Não conseguimos salvar agora. Tente de novo.");
    }
  };

  const handleCancelarModal=()=>{
    if(saving){abortControllerRef.current?.abort();return;}
    setConfirmModal(false);
  };

  // ===== Endereço (subscription real, fallback pro placeholder do wireframe) =====
  const end=subscription?.endereco;
  const enderecoLine1=end?`${end.rua}, ${end.numero}${end.complemento?", "+end.complemento:""}`:"Rua Otávio Carneiro, 123, apt 401";
  const enderecoLine2=end?`${end.bairro}, ${end.cidade} · ${end.estado} · ${end.cep}`:"Icaraí, Niterói · RJ · 24230-191";

  return<div style={{padding:"18px 16px 12px",paddingBottom:hasPending?80:12}}>
    {/* Card "Plano atual" — idle ou editing inline (Fase 3). Wireframe v4 removeu
        o state-title "Sua Assinatura + Ativa": Nav já marca a seção, o card "Plano
        atual" já comunica o estado. */}
    <Card style={{marginBottom:12,...(editing?{background:"#FFF",border:`1.5px solid ${B[500]}`}:{})}}>
      {!editing&&<>
        <div style={{fontFamily:fd,fontSize:13,textTransform:"uppercase",letterSpacing:"0.06em",color:W[500],margin:"0 0 10px"}}>Plano atual</div>
        <div style={{fontFamily:fb,fontWeight:700,fontSize:20,color:W[800],lineHeight:1.2,margin:"0 0 4px"}}>
          {total_paes} {total_paes===1?"pão":"pães"} por semana
        </div>
        {/* Ajuste 1 do briefing: .plan-delivery clonado do .plan-comp (sem ::before, mesma tipografia) */}
        <div style={{fontFamily:fb,fontSize:14,color:W[600],lineHeight:1.5,margin:0}}>{planCompList}</div>
        <div style={{fontFamily:fb,fontSize:14,color:W[600],lineHeight:1.5,margin:"0 0 14px"}}>Entregas toda quinta</div>

        {/* Breakdown Pães + Frete = Total */}
        <div style={{display:"flex",flexDirection:"column",gap:6,padding:"12px 0 0",borderTop:`1px solid ${W[200]}`,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
            <span style={{fontFamily:fd,fontSize:13,textTransform:"uppercase",letterSpacing:"0.06em",color:W[500]}}>Pães</span>
            <span style={{fontFamily:fb,fontSize:14,color:W[700],fontVariantNumeric:"tabular-nums"}}>{fmt(valor_paes)}/mês</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
            <span style={{fontFamily:fd,fontSize:13,textTransform:"uppercase",letterSpacing:"0.06em",color:W[500]}}>Frete</span>
            <span style={{fontFamily:fb,fontSize:14,color:W[700],fontVariantNumeric:"tabular-nums"}}>{fmt(valor_frete)}/mês</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",paddingTop:8,borderTop:`1px solid ${W[200]}`,marginTop:2}}>
            <span style={{fontFamily:fd,fontSize:13,textTransform:"uppercase",letterSpacing:"0.06em",color:W[700]}}>Total</span>
            <span style={{fontFamily:fb,fontWeight:700,fontSize:16,color:B[500],fontVariantNumeric:"tabular-nums"}}>{fmt(valor_mensal)}/mês</span>
          </div>
          {/* State derivado: alteração agendada — vale a partir da entrega de DD/MM (some quando a data de cobrança passa) */}
          {hasPendingChange&&pendingChangeDeliveryDdMm&&<div style={{
            fontFamily:fb,fontSize:11,color:W[500],
            margin:"4px 0 0",paddingTop:4,
            borderTop:`1px dashed ${W[200]}`,
            textAlign:"right",
          }}>
            Vale a partir da entrega de {pendingChangeDeliveryDdMm}
          </div>}
        </div>

        <button type="button" onClick={()=>{setRascunho({...assinaturaQtds});setEditing(true);}} disabled={cutoff} style={{
          width:"100%",padding:13,minHeight:44,
          background:"transparent",
          color:cutoff?W[400]:B[500],
          border:`1.5px solid ${cutoff?W[200]:B[500]}`,
          borderRadius:radii.md,
          cursor:cutoff?"not-allowed":"pointer",
          fontFamily:fb,fontSize:14,fontWeight:600,
          display:"flex",alignItems:"center",justifyContent:"center",gap:8,
          transition:"background 150ms ease",
        }} onMouseEnter={e=>{if(!cutoff) e.currentTarget.style.background=B[50];}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
          <I d={ic.edit} size={16} color={cutoff?W[400]:B[500]}/>
          Alterar minha Assinatura
        </button>
        {cutoff&&<CutoffMsg/>}
      </>}

      {editing&&<>
        <div style={{fontFamily:fd,fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:B[500],margin:"0 0 10px"}}>Alterar plano</div>
        <div style={{fontFamily:fb,fontSize:14,color:W[700],lineHeight:1.45,margin:"0 0 10px"}}>Quantos pães por semana?</div>

        {/* asn-list: 1 row por tipo de pão. QtyStepper reusado do Drawer. */}
        <div style={{display:"flex",flexDirection:"column",marginBottom:10}}>
          {D.pães.map((p,i)=>{
            const qty=rascunho?.[p.id]||0;
            const otherId=D.pães.find(x=>x.id!==p.id)?.id;
            const otherQty=rascunho?.[otherId]||0;
            const isZero=qty===0;
            const isRowAltered=qty!==(assinaturaQtds?.[p.id]||0);
            // + disabled só quando nem swap nem increment é possível (cap absoluto + outra row em 0).
            const incDis=sumAll>=3&&otherQty===0;
            const decDis=qty===0||(total_paes===1&&sumAll<=1);
            return <div key={p.id} style={{
              display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,
              padding:"12px 0",
              borderBottom:i<D.pães.length-1?`1px solid ${W[200]}`:"none",
            }}>
              {/* Opacity SÓ no name container (stepper íntegro mantém + brand-500 vívido
                  quando swap atômico está habilitado em row esmaecida). */}
              <div style={{flex:1,minWidth:0,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",opacity:isZero?0.55:1}}>
                <span style={{fontFamily:fb,fontWeight:600,fontSize:15,color:isZero?W[500]:W[800],lineHeight:1.3}}>
                  {p.nome} <span style={{fontWeight:400,fontSize:13,color:W[500]}}>· {p.peso}</span>
                </span>
                {isRowAltered&&<span style={{
                  display:"inline-flex",alignItems:"center",gap:4,
                  padding:"2px 6px",borderRadius:radii.xs,lineHeight:1.4,
                  background:W[100],color:ST.warning.t,
                  fontFamily:fd,fontSize:10,textTransform:"uppercase",letterSpacing:"0.06em",
                }}>
                  <span style={{fontSize:6}}>●</span>Alterado
                </span>}
              </div>
              <QtyStepper
                qty={qty}
                name={p.nome}
                variant="neutral"
                incrementDisabled={incDis}
                decrementDisabled={decDis}
                onIncrement={()=>handleIncrement(p.id)}
                onDecrement={()=>handleDecrement(p.id)}
              />
            </div>;
          })}
        </div>

        {/* total-week */}
        <div style={{
          display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,
          padding:"10px 12px",marginBottom:12,
          background:W[100],borderRadius:radii.md,
          fontFamily:fb,fontSize:13,color:W[700],
        }}>
          <span style={{fontFamily:fd,fontSize:10,textTransform:"uppercase",letterSpacing:"0.06em",color:W[500]}}>Total da semana</span>
          <span style={{fontFamily:fb,fontWeight:600,color:W[800]}}>
            <span style={{fontSize:15,fontVariantNumeric:"tabular-nums"}}>{sumAll}</span> {sumAll===1?"pão":"pães"}
          </span>
        </div>

        {/* ev-block: 3 colunas (label | Atual | Após). Total "Após" em warm-700 se igual ao Atual; brand-500 se diferente. */}
        <div style={{
          display:"grid",gridTemplateColumns:"auto 1fr 1fr",gap:"6px 10px",
          padding:12,marginBottom:10,
          background:W[50],border:`1px solid ${W[200]}`,borderRadius:radii.md,
          fontFamily:fb,
        }}>
          <span/>
          <span style={{fontFamily:fd,fontSize:10,textTransform:"uppercase",letterSpacing:"0.06em",color:W[500],textAlign:"right"}}>Atual</span>
          <span style={{fontFamily:fd,fontSize:10,textTransform:"uppercase",letterSpacing:"0.06em",color:B[500],textAlign:"right"}}>Após mudança</span>
          <span style={{fontSize:13,color:W[600],alignSelf:"center"}}>Pães</span>
          <span style={{fontSize:13,color:W[700],textAlign:"right",fontVariantNumeric:"tabular-nums",alignSelf:"center"}}>{fmt(valor_paes)}</span>
          <span style={{fontSize:13,color:W[700],textAlign:"right",fontVariantNumeric:"tabular-nums",alignSelf:"center"}}>{fmt(rascunhoValorPaes)}</span>
          <span style={{fontSize:13,color:W[600],alignSelf:"center"}}>Frete</span>
          <span style={{fontSize:13,color:W[700],textAlign:"right",fontVariantNumeric:"tabular-nums",alignSelf:"center"}}>{fmt(valor_frete)}</span>
          <span style={{fontSize:13,color:W[700],textAlign:"right",fontVariantNumeric:"tabular-nums",alignSelf:"center"}}>{fmt(valor_frete)}</span>
          <span style={{gridColumn:"1 / -1",height:1,background:W[200],margin:"4px 0 2px"}}/>
          <span style={{fontSize:14,fontWeight:600,color:W[700],alignSelf:"center"}}>Total</span>
          <span style={{fontSize:15,fontWeight:700,color:W[700],textAlign:"right",fontVariantNumeric:"tabular-nums",alignSelf:"center"}}>{fmt(valor_mensal)}/mês</span>
          <span style={{fontSize:15,fontWeight:700,color:rascunhoValorMensal===valor_mensal?W[700]:B[500],textAlign:"right",fontVariantNumeric:"tabular-nums",alignSelf:"center"}}>{fmt(rascunhoValorMensal)}/mês</span>
        </div>

        {/* micro-context: copy dependente do tipo da alteração */}
        {(ehSwap||ehMudancaTotal)&&<div style={{
          display:"flex",alignItems:"flex-start",gap:8,
          marginBottom:14,padding:"0 2px",
          fontFamily:fb,fontSize:12,color:W[600],lineHeight:1.5,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={W[500]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:2}} aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>
            Vale a partir da entrega de {proxDeliveryDdMm}.{" "}
            {ehSwap?"O valor mensal continua o mesmo.":`A cobrança nova começa em ${proximaFaturaDdMm}.`}
          </span>
        </div>}

        {/* erro sumAll===0 */}
        {isCompositionInvalid&&<div style={{
          fontFamily:fb,fontSize:12,color:ST.warning.t,
          margin:"-4px 0 12px",padding:"0 2px",lineHeight:1.4,
        }}>
          Sua Assinatura precisa de pelo menos 1 pão por semana.
        </div>}

        {/* edit-foot: Cancelar (ghost) + Salvar alterações (primary, label preservado quando disabled) */}
        <div style={{display:"flex",gap:10}}>
          <Btn ghost onClick={handleCancelEdit} style={{flex:1}}>Cancelar</Btn>
          <Btn primary disabled={!canSave} onClick={handleSalvar} style={{flex:1}}>Salvar alterações</Btn>
        </div>
      </>}
    </Card>

    {/* Endereço read-only — sai na Frente C item 4 (Perfil) */}
    <div style={{background:W[100],borderRadius:radii.lg,padding:"12px 14px",marginBottom:10}}>
      <div style={{fontFamily:fd,fontSize:10,textTransform:"uppercase",letterSpacing:"0.06em",color:W[500],margin:"0 0 6px"}}>Endereço</div>
      <div style={{fontFamily:fb,fontWeight:500,color:W[700],fontSize:13,lineHeight:1.5}}>
        {enderecoLine1}<br/>{enderecoLine2}
      </div>
    </div>

    {/* Cobrança read-only — sai na Frente C item 4 (Perfil). Linha "Cartão"
        removida (pré-Evandro): sem fonte de dado real de cartão não exibimos
        mock — mesma lógica do Perfil (PR #8). Alteração de cartão segue via
        WhatsApp (microcopy abaixo). "Próxima fatura" usa dado real e fica. */}
    <div style={{background:W[100],borderRadius:radii.lg,padding:"12px 14px",marginBottom:10}}>
      <div style={{fontFamily:fd,fontSize:10,textTransform:"uppercase",letterSpacing:"0.06em",color:W[500],margin:"0 0 6px"}}>Cobrança</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",fontFamily:fb,fontSize:13,color:W[700]}}>
        <span style={{color:W[500],fontSize:12}}>Próxima fatura</span>
        <span style={{fontWeight:500,fontVariantNumeric:"tabular-nums"}}>{fmt(valor_mensal)} · {proximaFaturaDdMm}</span>
      </div>
    </div>

    {/* Histórico de pedidos vive no Perfil (Frente C item 4) com dado real
        (entregas API). Bloco mockado (D.hist) removido daqui — evitava mostrar
        histórico fake na Assinatura quando o real está zerado. */}

    {/* Microcopy WhatsApp pra alterações ainda não suportadas no app */}
    <div style={{
      margin:"14px 4px 16px",padding:"14px 0 0",
      borderTop:`1px dashed ${W[300]}`,
      fontFamily:fb,fontSize:12,color:W[500],lineHeight:1.55,
    }}>
      Pra mudar endereço, forma de pagamento ou pausar a assinatura, fale com a gente pelo{" "}
      <a href="https://wa.me/5521999429843?text=Oi%2C%20gostaria%20de%20alterar%20minha%20Assinatura" target="_blank" rel="noopener noreferrer" style={{color:B[500],textDecoration:"none",fontWeight:600,display:"inline-flex",alignItems:"center",gap:4}}>
        WhatsApp
        <I d={ic.chev} size={11} color={B[500]}/>
      </a>.
    </div>

    {/* Toast de sucesso (topo, verde) — auto-dismiss 4s */}
    {successMsg&&<div role="status" aria-live="polite" style={{
      position:"fixed",top:16,left:16,right:16,maxWidth:358,margin:"0 auto",zIndex:60,
      display:"flex",alignItems:"flex-start",gap:10,
      padding:"12px 14px",borderRadius:radii.md,
      background:ST.success.bg,border:`1px solid ${ST.success.b}`,color:ST.success.t,
      fontFamily:fb,fontSize:13,lineHeight:1.45,
      boxShadow:"0 4px 16px rgba(26,24,21,0.12)",animation:"fadeIn 200ms ease",
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}} aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
      <span>{successMsg}</span>
    </div>}

    {/* Toast de erro (topo, warning) — auto-dismiss 4s */}
    {saveError&&<div role="status" aria-live="polite" style={{
      position:"fixed",top:16,left:16,right:16,maxWidth:358,margin:"0 auto",zIndex:60,
      display:"flex",alignItems:"flex-start",gap:10,
      padding:"12px 14px",borderRadius:radii.md,
      background:ST.warning.bg,border:`1px solid ${ST.warning.b}`,color:ST.warning.t,
      fontFamily:fb,fontSize:13,lineHeight:1.45,
      boxShadow:"0 4px 16px rgba(26,24,21,0.12)",animation:"fadeIn 200ms ease",
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}} aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>{saveError}</span>
    </div>}

    {/* Modal de confirmação (bottom-sheet) */}
    {confirmModal&&<>
      <div onClick={handleCancelarModal} style={{position:"fixed",inset:0,background:"rgba(26,24,21,0.5)",zIndex:50,animation:"fadeIn 200ms ease"}}/>
      <div ref={confirmDialogRef} role="dialog" aria-modal="true" aria-label="Confirmar nova assinatura" style={{
        position:"fixed",bottom:0,left:0,right:0,maxWidth:390,margin:"0 auto",
        background:"#FFF",borderRadius:`${radii.xl} ${radii.xl} 0 0`,
        zIndex:51,maxHeight:"90vh",overflowY:"auto",
        boxShadow:"0 -4px 24px rgba(26,24,21,0.12)",animation:"slideUp 300ms ease",
        padding:"0 0 18px",
      }}>
        <div aria-hidden="true" style={{width:36,height:4,background:W[300],borderRadius:radii.full,margin:"8px auto"}}/>
        <h3 style={{fontFamily:fd,fontSize:20,textTransform:"uppercase",color:B[500],letterSpacing:"0.02em",margin:"6px 18px 4px",lineHeight:1.1}}>Confirmar nova assinatura</h3>
        <div style={{padding:"0 18px",fontFamily:fb,fontSize:14,color:W[700],lineHeight:1.55}}>
          <p style={{margin:"0 0 10px"}}>Você está mudando o seu plano. Confira antes de confirmar.</p>

          <div style={{margin:"10px 0 12px",padding:12,background:W[50],border:`1px solid ${W[200]}`,borderRadius:radii.md,display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10}}>
              <span style={{fontFamily:fd,fontSize:10,textTransform:"uppercase",letterSpacing:"0.06em",color:W[500],flexShrink:0}}>Plano atual</span>
              <span style={{fontWeight:600,color:W[800],textAlign:"right"}}>{fmtPlanFull(assinaturaQtds)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10}}>
              <span style={{fontFamily:fd,fontSize:10,textTransform:"uppercase",letterSpacing:"0.06em",color:W[500],flexShrink:0}}>Plano novo</span>
              <span style={{fontWeight:600,color:B[500],textAlign:"right"}}>{fmtPlanFull(rascunho)}</span>
            </div>
            <div style={{height:1,background:W[200],margin:"2px 0"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10}}>
              <span style={{fontFamily:fd,fontSize:10,textTransform:"uppercase",letterSpacing:"0.06em",color:W[500],flexShrink:0}}>Vale a partir de</span>
              <span style={{fontWeight:600,color:W[800],textAlign:"right",fontVariantNumeric:"tabular-nums"}}>Entrega de {proxDeliveryDdMm}</span>
            </div>
            {ehSwap
              ?<div style={{fontFamily:fb,fontSize:13,color:W[600],lineHeight:1.5}}>O valor mensal continua o mesmo.</div>
              :<div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10}}>
                <span style={{fontFamily:fd,fontSize:10,textTransform:"uppercase",letterSpacing:"0.06em",color:W[500],flexShrink:0}}>Próxima cobrança</span>
                <span style={{fontWeight:600,color:B[500],textAlign:"right",fontVariantNumeric:"tabular-nums"}}>
                  {fmt(rascunhoValorMensal)}/mês em {proximaFaturaDdMm}
                  <span style={{display:"block",fontFamily:fb,fontWeight:400,fontSize:11,color:W[500],marginTop:2}}>{fmt(rascunhoValorPaes)} (pães) + {fmt(valor_frete)} (frete)</span>
                </span>
              </div>
            }
          </div>
        </div>

        <div style={{display:"flex",gap:10,padding:"14px 18px 0"}}>
          <Btn ghost onClick={handleCancelarModal} style={{flex:1}}>Cancelar</Btn>
          <button
            type="button"
            onClick={handleConfirmarMudanca}
            disabled={saving}
            aria-busy={saving}
            style={{
              flex:1,padding:13,minHeight:44,borderRadius:radii.md,border:"none",
              background:B[500],color:"#FFF",
              fontFamily:fb,fontSize:14,fontWeight:600,
              cursor:saving?"wait":"pointer",opacity:saving?0.7:1,
              display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,
            }}>
            {saving&&<span role="status" aria-label="Salvando alteração" style={{
              width:14,height:14,borderRadius:"50%",flexShrink:0,
              border:"2px solid rgba(255,255,255,0.35)",borderTopColor:"#FFF",
              animation:"spin 0.8s linear infinite",
            }}/>}
            {saving?"Salvando…":"Confirmar mudança"}
          </button>
        </div>
      </div>
    </>}
  </div>;
};

// ═══ CARDÁPIO ═══
// Refactor Frente C item 3 (wireframe v2):
//  - Linha micro-tipográfica "Extras entram na sua próxima fatura."
//  - NovidadeCard Hero (D.extras[0]) antes da lista
//  - Lista de produtos na ordem curada do wireframe (Original → Integral →
//    Focaccia → Multigrãos → Brioche → Ciabatta), buscando primeiro em D.pães,
//    fallback em D.rotativos pra cobrir o catálogo rotativo
//  - ProductCard expande inline (sem modal sobreposto)
//  - Click no botão "Adicionar à cesta" dispara POST + toast (stack até 3)
//  - Solução tática pré-Evandro: a lista é filtrada por MENU_SEMANA
//    (src/config/menu.js) pra mostrar só os pães da semana corrente
const CARDAPIO_PRODUCT_ORDER=["original","integral","focaccia","multigraos","brioche","ciabatta"];
const Cardapio=({addExtraToCart,cutoff,pendingPayment})=>{
  const{toasts,push:pushToast}=useToastStack();
  const lockedReason=pendingPayment?LOCK_REASON_PENDING:undefined;

  // Lista da semana na ordem curada do wireframe. Filtra por MENU_SEMANA
  // (hardcode tático — só os pães da semana corrente). A Focaccia também é o
  // Novidade Hero, mas continua na lista de propósito: só o card menor expande
  // com a descrição completa do produto. Resolve cada id contra D.pães e
  // D.rotativos (Original/Integral em pães; demais em rotativos).
  const cardapioProducts=CARDAPIO_PRODUCT_ORDER
    .filter(id=>MENU_SEMANA.includes(id))
    .map(id=>D.pães.find(p=>p.id===id)||D.rotativos.find(p=>p.id===id))
    .filter(Boolean);

  const handleAdd=async(product)=>{
    try{await addExtraToCart(product);}
    catch(err){
      console.error("[Cardapio] addExtraToCart failed",err);
      return;
    }
    const verb=(product.genero||"m")==="f"?"adicionada":"adicionado";
    pushToast(`${product.nome} ${verb} à cesta.`);
  };

  const novidade=D.extras[0];

  return<div style={{padding:"24px 16px 16px"}}>
    <h2 style={{fontFamily:fd,fontSize:26,textTransform:"uppercase",color:B[500],margin:"0 0 4px"}}>Cardápio</h2>
    <div style={{fontFamily:fb,fontSize:13,color:W[500],marginBottom:12}}>Peça itens extras para esta semana</div>
    <DeadlineWarning/>

    {/* Aviso de cobrança — micro-tipográfico, abaixo do cutoff (briefing 3.2). */}
    <div style={{display:"inline-flex",alignItems:"center",gap:6,fontFamily:fb,fontSize:13,color:W[500],marginBottom:16}}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={W[500]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="6" width="18" height="13" rx="2"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      Extras entram na sua próxima fatura.
    </div>

    {/* Novidade Hero — apenas o primeiro extra, em destaque visual */}
    {novidade
      ?<NovidadeCard extra={novidade} onAdd={()=>handleAdd(novidade)} cutoff={cutoff} lockedReason={lockedReason}/>
      :<EmptyState title="Novidade da semana" body="Nenhuma novidade esta semana."/>
    }

    {/* Lista unificada: flui direto do Hero, sem header categórico (briefing
        wireframe v2 tela 3 — "Nossos pães" cria categorização falsa porque a
        lista mistura pães fixos e extras rotativos). */}
    {cardapioProducts.map(p=>(
      <ProductCard key={p.id}
        product={{...p,preco:`${p.preco}/un`}}
        ctaLabel="Adicionar à cesta"
        cutoff={cutoff}
        lockedReason={lockedReason}
        onAdd={()=>handleAdd(p)}
      />
    ))}

    <ToastStack toasts={toasts}/>
  </div>;
};

// ═══ PERFIL ═══
// Frente C item 4 — tela 100% read-only. Toda alteração de dados passa pelo
// WhatsApp. Dados pessoais vêm do snapshot local; histórico (entregas) e a
// decomposição da Cobrança vêm de dados reais (GET subscription expondo
// valor_paes/valor_frete + GET weekly-orders?history=true). O modal de recibo
// entra na Fase 2 (as linhas do histórico já são botões prontos pra abrir).

// Parse de Date ou string ISO "YYYY-MM-DD" como data LOCAL (new Date("2026-05-21")
// seria UTC meia-noite e poderia voltar 1 dia no fuso BRT).
const parseISO=(v)=>{
  if(v instanceof Date) return v;
  if(typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)){const[y,m,d]=v.split("-").map(Number);return new Date(y,m-1,d);}
  return new Date(v);
};
// DD/MM a partir de Date ou string ISO.
const ddmm=(v)=>{const d=parseISO(v);return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;};
// Primeiro dia do próximo mês, formato "01/MM". A fatura recorrente alinha no
// dia 01 (modelo Cenário A — migration 0014), então a próxima cobrança é sempre
// o dia 1 do mês seguinte. Não há data genérica de cobrança no schema.
const proximaFaturaDDMM=(now=new Date())=>{
  const prox=new Date(now.getFullYear(),now.getMonth()+1,1);
  return `01/${String(prox.getMonth()+1).padStart(2,"0")}`;
};
// Resolve nome/peso de um produto pelo id (catálogo D: pães + rotativos + extras).
const produtoInfo=(id)=>D.pães.find(p=>p.id===id)||D.rotativos.find(p=>p.id===id)||D.extras.find(p=>p.id===id)||null;
// CPF mascarado: "123.456.789-00" -> "•••.•••.789-00".
const maskCpf=(c)=>c?c.replace(/^\d{3}\.\d{3}/,"•••.•••"):"";
// Linhas "N× Nome" de uma composição {id:qty>0}, nome do catálogo (com "Pão").
const composicaoLinhas=(comp)=>Object.entries(comp||{})
  .filter(([,q])=>Number(q)>0)
  .map(([id,q])=>`${q}× ${produtoInfo(id)?.nome||id}`);

// ─── MODAL DE RECIBO (bottom-sheet) ───
// Mesma anatomia do modal de confirmação da Sua Assinatura v4 (overlay +
// sheet com grab handle + slideUp). useModalA11y: Esc fecha + focus-trap +
// foco volta pra linha que abriu (onClose estável via useCallback no Perfil).
// Aberto a partir de uma linha do Histórico → o pedido é sempre passado, mas
// o footnote cobre as 3 variantes (C1 futura fica dormante aqui).
const ReciboModal=({order,subscriptionItens,onClose})=>{
  const dialogRef=useRef(null);
  useModalA11y(dialogRef,true,onClose);

  const comp=order.composition||subscriptionItens||{};
  const assinaturaItens=Object.entries(comp)
    .filter(([,q])=>Number(q)>0)
    .map(([id,q])=>{const p=produtoInfo(id);return{nome:p?.nome||id,peso:p?.peso||"",qty:q};});
  const extras=Array.isArray(order.extras)?order.extras:[];
  const temExtras=extras.length>0;
  const totalExtras=Number(order.total_extras||0);

  // Footnote sem afirmar pagamento (sub-linha "Pago" omitida em toda a tela).
  // Data da fatura = dia 01 do mês seguinte à entrega (modelo dia-01).
  const hojeISO=new Date().toISOString().slice(0,10);
  const futura=String(order.delivery_date)>=hojeISO;
  const faturaDDMM=proximaFaturaDDMM(parseISO(order.delivery_date));
  const footnote=temExtras
    ?(futura?`Cobrança incluída na fatura de ${faturaDDMM}.`:`Cobrança da fatura de ${faturaDDMM}.`)
    :"Sem extras nesta semana.";

  const meta={fontFamily:fb,fontSize:11,fontWeight:400,color:W[500],marginLeft:6};
  return<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(26,24,21,0.5)",zIndex:50,animation:"fadeIn 200ms ease"}}/>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Recibo da semana ${ddmm(order.delivery_date)}`} style={{
      position:"fixed",bottom:0,left:0,right:0,maxWidth:390,margin:"0 auto",
      background:"#FFF",borderRadius:`${radii.xl} ${radii.xl} 0 0`,
      zIndex:51,maxHeight:"90vh",overflowY:"auto",
      boxShadow:"0 -4px 24px rgba(26,24,21,0.12)",animation:"slideUp 300ms ease",
      padding:"0 0 18px",
    }}>
      <div aria-hidden="true" style={{width:36,height:4,background:W[300],borderRadius:radii.full,margin:"8px auto"}}/>
      <h3 style={{fontFamily:fd,fontSize:20,textTransform:"uppercase",color:B[500],letterSpacing:"0.02em",margin:"6px 18px 4px",lineHeight:1.1}}>Recibo da semana {ddmm(order.delivery_date)}</h3>
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"0 18px 4px"}}>
        <span aria-hidden="true" style={{width:16,height:16,borderRadius:radii.full,background:ST.success.bg,border:`1px solid ${ST.success.b}`,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={ST.success.t} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </span>
        <span style={{fontFamily:fb,fontSize:13,color:W[600]}}>Entregue quinta-feira</span>
      </div>

      <div style={{padding:"10px 18px 0"}}>
        {/* Seção Assinatura — gramatura como meta, sem preço, sem total */}
        <div style={{padding:"10px 12px",background:W[50],border:`1px solid ${W[200]}`,borderRadius:radii.md}}>
          <div style={{fontFamily:fd,fontSize:13,textTransform:"uppercase",letterSpacing:"0.06em",color:W[500],marginBottom:6}}>Assinatura</div>
          <ul style={{margin:0,padding:0,listStyle:"none"}}>
            {assinaturaItens.map((l,i)=><li key={i} style={{padding:"6px 0",borderTop:i>0?`1px solid ${W[200]}`:"none",fontFamily:fb,fontSize:14,color:W[800]}}>{l.qty}× {l.nome}{l.peso&&<span style={meta}>{l.peso}</span>}</li>)}
          </ul>
        </div>

        {/* Seção Extras — condicional, com preço e total da seção */}
        {temExtras&&<div style={{padding:"10px 12px",background:W[50],border:`1px solid ${W[200]}`,borderRadius:radii.md,marginTop:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
            <span style={{fontFamily:fd,fontSize:13,textTransform:"uppercase",letterSpacing:"0.06em",color:W[500]}}>Extras</span>
            <span style={{fontFamily:fb,fontSize:15,fontWeight:700,color:B[500],fontVariantNumeric:"tabular-nums"}}>{fmt(totalExtras)}</span>
          </div>
          <ul style={{margin:0,padding:0,listStyle:"none"}}>
            {extras.map((e,i)=>{const peso=produtoInfo(e.id)?.peso||"";return<li key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10,padding:"6px 0",borderTop:i>0?`1px solid ${W[200]}`:"none"}}>
              <span style={{fontFamily:fb,fontSize:14,color:W[800],minWidth:0}}>{e.qty>1?`${e.qty}× `:""}{e.nome}{peso&&<span style={meta}>{peso}</span>}</span>
              <span style={{fontFamily:fb,fontSize:14,color:W[700],fontVariantNumeric:"tabular-nums",flexShrink:0}}>{fmt(Number(e.preco_unit)*e.qty)}</span>
            </li>;})}
          </ul>
        </div>}
      </div>

      <p style={{fontFamily:fb,fontSize:12,color:B[700],background:B[50],border:`1px solid ${B[100]}`,borderRadius:radii.md,padding:"10px 12px",margin:"12px 18px 0",lineHeight:1.5}}>{footnote}</p>

      <div style={{padding:"14px 18px 0"}}>
        <Btn ghost full onClick={onClose}>Fechar</Btn>
      </div>
    </div>
  </>;
};

const Perfil=({subscription,weeklyOrders=[],pendingPayment=false})=>{
  const[cpfVisivel,setCpfVisivel]=useState(false);
  // billing = GET subscription (valor_paes/valor_frete/next_billing_*).
  // entregas: null = carregando, [] = sem entregas, [...] = histórico real.
  const[billing,setBilling]=useState(null);
  const[entregas,setEntregas]=useState(null);
  // recibo = pedido que abriu o modal (null = fechado). onClose estável pra
  // useModalA11y não re-capturar o foco e devolver certinho pra linha.
  const[recibo,setRecibo]=useState(null);
  const fecharRecibo=useCallback(()=>setRecibo(null),[]);
  const subId=subscription?.id;
  const endereco=subscription?.endereco||{};
  const subItens=subscription?.itens||{};

  useEffect(()=>{
    if(!subId) return;
    let cancelado=false;
    getSubscription(subId)
      .then(d=>{if(!cancelado&&d) setBilling(d);})
      .catch(err=>{if(!cancelado) console.error("[Perfil] getSubscription falhou",err);});
    getWeeklyOrders(subId,{history:true})
      .then(({weekly_orders})=>{if(!cancelado) setEntregas(weekly_orders||[]);})
      .catch(err=>{if(!cancelado){console.error("[Perfil] getWeeklyOrders history falhou",err);setEntregas([]);}});
    return()=>{cancelado=true;};
  },[subId]);

  // ─── Decomposição da próxima fatura ───
  // Extras = soma de total_extras dos pedidos CONFIRMADOS com entrega no mês
  // corrente (é o que entra na fatura do dia 01 do mês seguinte). Combina o
  // histórico (semanas passadas do mês) com os pedidos futuros do mês.
  const agora=new Date();
  const extrasDoMes=[...(entregas||[]),...weeklyOrders]
    .filter(o=>{
      if(o.status!=="confirmado") return false;
      const[y,m]=String(o.delivery_date).split("-").map(Number);
      return y===agora.getFullYear()&&(m-1)===agora.getMonth();
    })
    .reduce((s,o)=>s+Number(o.total_extras||0),0);
  const assinaturaVal=billing?Number(billing.valor_paes):null;
  const freteVal=billing?Number(billing.valor_frete):null;
  const totalVal=billing?assinaturaVal+extrasDoMes+freteVal:null;
  const mudancaPendente=billing?.next_billing_change_date||null;

  const endStr=[endereco.rua,endereco.numero].filter(Boolean).join(", ")+(endereco.complemento?` / ${endereco.complemento}`:"");
  const dados=[
    ["Endereço",endStr||"—"],
    ["Dia de entrega","Quintas-feiras"],
    ["WhatsApp",subscription?.whatsapp||"—"],
    ["E-mail",subscription?.email||"—"],
    ["CPF",cpfVisivel?(subscription?.cpf||"—"):(maskCpf(subscription?.cpf)||"—")],
  ];

  // Sem subId (ex.: dev skip), nada a buscar: cai no estado vazio em vez de
  // "Carregando…" perpétuo. Com subId, null = ainda buscando.
  const carregandoHist=!!subId&&entregas===null;
  const carregandoCobranca=!!subId&&!billing;
  const entregasView=entregas||[];

  return<div style={{padding:"24px 16px 16px",paddingBottom:pendingPayment?80:16}}>
    <h2 style={{fontFamily:fd,fontSize:26,textTransform:"uppercase",color:B[500],margin:"0 0 20px"}}>Perfil</h2>

    {/* Header de perfil */}
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
      <div style={{width:48,height:48,borderRadius:radii.full,background:B[50],display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${B[200]}`,flexShrink:0}}><img src="/images/grafismo_coracao.svg" alt="" aria-hidden="true" style={{width:28,height:28}}/></div>
      <div style={{minWidth:0}}>
        <div style={{fontFamily:fb,fontSize:16,fontWeight:600,color:W[800]}}>{subscription?.nome||"—"}</div>
        <div style={{fontFamily:fb,fontSize:12,color:W[500],overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{subscription?.email||""}</div>
      </div>
    </div>

    {/* Dados pessoais — read-only, sem chevrons */}
    <Card style={{marginBottom:12}}><SL t="Dados pessoais"/>
      {dados.map(([l,v],i)=><div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:i<dados.length-1?`1px solid ${W[100]}`:"none",gap:12}}>
        <div style={{minWidth:0}}>
          <div style={{fontFamily:fb,fontSize:11,color:W[500],marginBottom:2}}>{l}</div>
          <div style={{fontFamily:fb,fontSize:13,color:W[700],...(l==="CPF"?{fontVariantNumeric:"tabular-nums"}:{})}}>{v}</div>
        </div>
        {l==="CPF"&&<button aria-label={cpfVisivel?"Ocultar CPF":"Mostrar CPF"} onClick={()=>setCpfVisivel(s=>!s)} style={{background:"none",border:"none",cursor:"pointer",padding:4,minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I d={cpfVisivel?ic.eyeOff:ic.eye} size={16} color={W[400]}/></button>}
      </div>)}
    </Card>

    {/* Histórico de pedidos */}
    <Card style={{marginBottom:12}}><SL t="Histórico de pedidos"/>
      {carregandoHist
        ?<div style={{fontFamily:fb,fontSize:13,color:W[400],padding:"12px 0"}}>Carregando…</div>
        :entregasView.length===0
          ?<p style={{fontFamily:fb,fontSize:13,color:W[600],lineHeight:1.6,margin:"4px 0"}}>Você ainda não tem entregas.<br/><strong style={{color:W[800],fontWeight:600}}>Sua primeira chega em {ddmm(proximaQuinta())}.</strong></p>
          :<>
            {entregasView.slice(0,3).map((o,i,arr)=>{
              const linhas=composicaoLinhas(o.composition||subItens);
              const extras=Array.isArray(o.extras)?o.extras:[];
              const extraLabel=extras.length===1
                ?`+ ${extras[0].nome} · ${fmt(Number(extras[0].preco_unit)*extras[0].qty)}`
                :extras.length>1?`+ ${extras.length} extras · ${fmt(Number(o.total_extras||0))}`:null;
              return<button key={o.id} type="button" onClick={()=>setRecibo(o)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",textAlign:"left",background:"none",border:"none",cursor:"pointer",padding:"12px 0",borderBottom:i<Math.min(arr.length,3)-1?`1px solid ${W[100]}`:"none"}}>
                <span style={{fontFamily:fb,fontSize:12,color:W[500],fontVariantNumeric:"tabular-nums",flexShrink:0,minWidth:42}}>{ddmm(o.delivery_date)}</span>
                <span style={{flex:1,minWidth:0}}>
                  {linhas.map((t,j)=><span key={j} style={{display:"block",fontFamily:fb,fontSize:13,fontWeight:500,color:W[800],lineHeight:1.4}}>{t}</span>)}
                  {extraLabel&&<span style={{display:"block",fontFamily:fb,fontSize:12,color:B[500],marginTop:2}}>{extraLabel}</span>}
                </span>
                <span style={{display:"inline-flex",alignItems:"center",gap:4,fontFamily:fb,fontSize:12,fontWeight:500,color:ST.success.t,flexShrink:0}}><I d={ic.check} size={12} color={ST.success.t} sw={3}/>Entregue</span>
                <I d={ic.chev} size={16} color={W[400]}/>
              </button>;
            })}
            {entregasView.length>3&&<div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
              <button type="button" onClick={()=>{/* Fase futura: ver histórico completo */}} style={{background:"none",border:"none",cursor:"pointer",fontFamily:fd,fontSize:11,letterSpacing:"0.04em",textTransform:"uppercase",color:B[500],padding:4}}>Ver todos →</button>
            </div>}
          </>
      }
    </Card>

    {/* Cobrança — decomposição da próxima fatura */}
    <Card style={{marginBottom:12}}><SL t="Cobrança"/>
      {!billing
        ?(carregandoCobranca?<div style={{fontFamily:fb,fontSize:13,color:W[400],padding:"12px 0"}}>Carregando…</div>:null)
        :<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10}}>
            <span style={{fontFamily:fd,fontSize:13,textTransform:"uppercase",letterSpacing:"0.06em",color:W[500]}}>Próxima fatura</span>
            <span style={{fontFamily:fb,fontSize:13,fontWeight:600,color:W[800],fontVariantNumeric:"tabular-nums"}}>{proximaFaturaDDMM()}</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
              <span style={{fontFamily:fd,fontSize:13,textTransform:"uppercase",letterSpacing:"0.06em",color:W[500]}}>Assinatura</span>
              <span style={{fontFamily:fb,fontSize:13,color:W[700],fontVariantNumeric:"tabular-nums"}}>{fmt(assinaturaVal)}</span>
            </div>
            {extrasDoMes>0&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
              <span style={{fontFamily:fd,fontSize:13,textTransform:"uppercase",letterSpacing:"0.06em",color:W[500]}}>Extras</span>
              <span style={{fontFamily:fb,fontSize:13,color:W[700],fontVariantNumeric:"tabular-nums"}}>{fmt(extrasDoMes)}</span>
            </div>}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
              <span style={{fontFamily:fd,fontSize:13,textTransform:"uppercase",letterSpacing:"0.06em",color:W[500]}}>Frete</span>
              <span style={{fontFamily:fb,fontSize:13,color:W[700],fontVariantNumeric:"tabular-nums"}}>{fmt(freteVal)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",paddingTop:8,borderTop:`1px solid ${W[200]}`,marginTop:2}}>
              <span style={{fontFamily:fd,fontSize:13,textTransform:"uppercase",letterSpacing:"0.06em",color:W[700]}}>Total</span>
              <span style={{fontFamily:fb,fontSize:16,fontWeight:700,color:B[500],fontVariantNumeric:"tabular-nums"}}>{fmt(totalVal)}</span>
            </div>
          </div>
          {mudancaPendente&&billing.next_billing_value!=null&&<div style={{fontFamily:fb,fontSize:12,color:W[500],marginTop:10,lineHeight:1.5}}>Novo valor {fmt(Number(billing.next_billing_value))}/mês a partir de {ddmm(mudancaPendente)}.</div>}
        </>
      }
    </Card>

    {/* Pausar ou cancelar */}
    <div style={{borderTop:`1px solid ${W[200]}`,marginTop:24,paddingTop:24,marginBottom:12}}>
      <div style={{fontFamily:fd,fontSize:20,textTransform:"uppercase",color:B[500],letterSpacing:"0.02em",marginBottom:8}}>Pausar ou cancelar</div>
      <div style={{fontFamily:fb,fontSize:14,color:W[600],lineHeight:1.6,marginBottom:16}}>Se precisar pausar por um tempo ou cancelar sua assinatura, fale com a gente pelo WhatsApp. Sem taxa, a qualquer momento.</div>
      <a href={`https://wa.me/${HUGO_WHATSAPP}?text=${encodeURIComponent("Oi, gostaria de pausar ou cancelar minha assinatura.")}`} target="_blank" rel="noopener noreferrer" className="press-scale" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",padding:"12px 16px",borderRadius:radii.md,border:"none",background:B[500],color:"#FFF",fontFamily:fb,fontSize:14,fontWeight:600,textDecoration:"none",minHeight:44,lineHeight:"20px"}}><I d={ic.msg} size={18} color="#FFF"/>Falar com a Cora no WhatsApp</a>
    </div>

    {/* Microcopy final — sem <strong> */}
    <p style={{fontFamily:fb,fontSize:12,color:W[500],textAlign:"center",lineHeight:1.6,borderTop:`1px dashed ${W[300]}`,paddingTop:16,margin:"4px 4px 0"}}>Pra atualizar seus dados, mudar endereço, pausar ou cancelar, fale com a gente pelo WhatsApp.</p>

    {recibo&&<ReciboModal order={recibo} subscriptionItens={subItens} onClose={fecharRecibo}/>}
  </div>;
};

// ═══ APP (rodapé persistente aqui) ═══
export default function CoraPortal(){
  // Subscription persistida (MVP via localStorage; Fase 7 troca por DB).
  // Se existir, pula onboarding e vai direto pra Home.
  const initialSubscription = loadSubscription();
  const skipOnboarding = window.location.search.includes("skip=true") || !!initialSubscription;
  const [scr, setScr] = useState(skipOnboarding ? "home" : "onboarding");
  const [subscription, setSubscription] = useState(initialSubscription);
  const mainRef=useRef(null);
  // Reset scroll ao trocar de aba. Cobre os dois casos porque o root usa
  // minHeight:100vh (nao height) — o scroll acaba caindo na window quando
  // o conteudo passa do viewport, e no <main> quando ha overflow interno.
  useEffect(()=>{mainRef.current?.scrollTo({top:0});window.scrollTo({top:0});},[scr]);
  // === Carrinho persistido no servidor (Frente C item 1, PR 2) ===
  // weeklyOrders vem do GET /api/weekly-orders e é mantido sincronizado por
  // cada handler de carrinho. Primeiro item = pedido da próxima entrega.
  const[weeklyOrders,setWeeklyOrders]=useState([]);
  // Shape novo (Fase 7): subscription eh flat — nome/whatsapp/email/cpf
  // ficam no topo, endereco aninhado em endereco, itens em itens.
  const[userData,setUserData]=useState(initialSubscription||null);
  const[isFirstVisit,setIsFirstVisit]=useState(true);
  const[onboardingConfig,setOnboardingConfig]=useState(null);

  // Helper: monta {id:qty} para todos os paes definidos em D, herdando
  // de uma fonte (assinatura da subscription persistida) ou caindo no mock.
  const buildQtdsFrom=(source)=>{
    const init={};
    D.pães.forEach(p=>{init[p.id]=(source&&typeof source[p.id]==="number")?source[p.id]:(p.qtd||0);});
    return init;
  };

  // === REFACTOR: State da Assinatura agora vive aqui (fonte unica de verdade) ===
  // Init prioriza initialSubscription.itens (persistida). Sem ela, usa
  // o default mock de D.pães[].qtd.
  const [assinaturaQtds,setAssinaturaQtds]=useState(()=>buildQtdsFrom(initialSubscription?.itens));
  // cestaSemana: null = segue a Assinatura. Objeto {id:qty} = cliente customizou esta semana.
  const [cestaSemana,setCestaSemana]=useState(null);
  // Baseline do ciclo: composicao ja cobrada no inicio do mes corrente.
  // So muda na virada de ciclo (1o do proximo mes, via simularViradaDeMes).
  const [assinaturaBaseline,setAssinaturaBaseline]=useState(()=>buildQtdsFrom(initialSubscription?.itens));
  // Historico do ciclo atual: null quando assinaturaQtds === assinaturaBaseline.
  // Objeto unico (nao array) representando a diferenca liquida vs baseline.
  const [historicoCicloAtual,setHistoricoCicloAtual]=useState(null);
  // Primeiro acesso (boas-vindas). Vira false apos navegar pra outra aba.
  const [ehPrimeiroAcesso,setEhPrimeiroAcesso]=useState(true);

  // ─── Capacity gate ───
  // null enquanto carrega, true/false depois do fetch. Fallback otimista:
  // se /api/settings falhar, segue como true (nao bloqueia o portal).
  const [subscriptionsOpen, setSubscriptionsOpen] = useState(true);
  // 'splash' = chegou via Splash modo fechado (entrada direta).
  // 'closed-during-flow' = bateu o 409 a meio do onboarding (race C6).
  // O reason controla o banner persistente na CapacityWaitlist (Frente A — ajustes).
  const [waitlistReason, setWaitlistReason] = useState("splash");
  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((s) => { if (!cancelled) setSubscriptionsOpen(!!s.subscriptions_open); })
      .catch(() => { /* fallback ja eh true */ });
    return () => { cancelled = true; };
  }, []);

  // Sincroniza pedidos da semana. Só busca em subscription active.
  // Quando o status muda pra não-active, cleanup zera o array (evita
  // dados stale aparecerem se Hugo flipar status manualmente).
  useEffect(() => {
    if (!subscription?.id || subscription.status !== "active") return;
    let cancelled = false;
    getWeeklyOrders(subscription.id)
      .then(({ weekly_orders }) => { if (!cancelled) setWeeklyOrders(weekly_orders || []); })
      .catch((err) => { if (!cancelled) console.error("[App] getWeeklyOrders failed", err); });
    return () => { cancelled = true; setWeeklyOrders([]); };
  }, [subscription?.id, subscription?.status]);

  const goToCapacityWaitlist = (reason = "splash") => {
    setWaitlistReason(reason);
    setScr("lista-espera");
  };

  // Sincronizacao com onboarding (substitui a mutacao direta de D)
  useEffect(()=>{
    if(!onboardingConfig?.assinatura) return;
    const next={};D.pães.forEach(p=>{next[p.id]=onboardingConfig.assinatura[p.id]||0;});
    setAssinaturaQtds(next);
    setAssinaturaBaseline(next); // onboarding = novo ciclo, baseline inicia igual
    setHistoricoCicloAtual(null);
    setCestaSemana(null);
    setWeeklyOrders([]); // novo ciclo: zera carrinho local (GET sync recarrega quando active)
    setEhPrimeiroAcesso(true); // boas-vindas ao voltar do onboarding
  },[onboardingConfig]);

  // Utilitario mock: simula virada de ciclo. Fecha o ciclo atual e atualiza
  // baseline = estado atual. Nao exposto na UI no MVP; util para testes.
  const simularViradaDeMes=()=>{
    setHistoricoCicloAtual(null);
    setAssinaturaBaseline({...assinaturaQtds});
  };
  // Expor no window em dev para facilitar teste (nao afeta producao)
  useEffect(()=>{
    if(typeof window!=="undefined") window.__coraSimularViradaDeMes=simularViradaDeMes;
  },[historicoCicloAtual,assinaturaQtds]);

  // Ao navegar pra outra aba (Assinatura/Cardapio/Perfil), desativa primeiro acesso
  const handleNav=(tela)=>{
    if(tela!=="home") setEhPrimeiroAcesso(false);
    setScr(tela);
  };

  // Status de pagamento da subscription. Apenas pending_payment dispara
  // banner + bloqueio de extras (active/paused/cancelled = sem efeito).
  const pendingPayment=subscription?.status==="pending_payment";

  // Reconcilia status com servidor 1x ao montar. Quando Hugo muda status
  // pra active no Supabase, F5 detecta e atualiza local + UI sem acao.
  useEffect(()=>{
    let cancelled=false;
    reconcileSubscription().then((updated)=>{
      if(cancelled) return;
      if(updated){
        setSubscription(updated);
      } else if(!loadSubscription()){
        // Subscription foi deletada no servidor (404 limpou local). Limpa state.
        setSubscription(null);
      }
    }).catch(()=>{ /* reconcile ja loga; degrade gracioso */ });
    return ()=>{cancelled=true;};
  },[]);

  // Derivados
  // Alteracao pendente de Assinatura (reducao valem so no proximo ciclo).
  // Aumento e troca valem imediatamente (cobra proporcional ou sem custo).
  const reducaoPendente=historicoCicloAtual?.tipo==="reducao";
  // Cesta que chega NESTA semana:
  //   - com swap: cestaSemana
  //   - com reducao pendente: baseline (cliente continua recebendo o que ja pagou)
  //   - caso contrario: assinaturaQtds (aumento/troca ja valem)
  const cestaAtual=cestaSemana??(reducaoPendente?assinaturaBaseline:assinaturaQtds);

  // ─── Carrinho persistido: pedido atual, cutoff por delivery_date ───
  const currentWeeklyOrder = weeklyOrders[0] || null;
  const currentExtras = currentWeeklyOrder?.extras || [];
  const cutoff = isPastCutoff(currentWeeklyOrder?.delivery_date);

  // POST upsert canônico. Optimistic update local antes da resposta;
  // em erro, reverte snapshot e loga (toast/feedback visual entra na Fase 2).
  const postCurrentOrder = async (nextExtras, nextComposition) => {
    if (!subscription?.id || subscription.status !== "active") return;
    const delivery_date = currentWeeklyOrder?.delivery_date || nextEditableThursdayISO();
    const composition = nextComposition !== undefined
      ? nextComposition
      : (currentWeeklyOrder?.composition ?? null);
    const snapshot = weeklyOrders;
    const optimistic = {
      ...(currentWeeklyOrder || {
        subscription_id: subscription.id,
        status: "rascunho",
        confirmed_at: null,
      }),
      delivery_date,
      composition,
      extras: nextExtras,
      total_extras: nextExtras.reduce((s, e) => s + e.qty * Number(e.preco_unit), 0),
    };
    setWeeklyOrders(prev => mergeOrder(prev, optimistic));
    try {
      const saved = await postWeeklyOrder({
        subscription_id: subscription.id,
        delivery_date,
        composition,
        extras: nextExtras,
      });
      setWeeklyOrders(prev => mergeOrder(prev, saved));
    } catch (err) {
      console.error("[App] postWeeklyOrder failed", err);
      setWeeklyOrders(snapshot);
    }
  };

  const addExtraToCart = (product) => {
    const next = currentExtras.map(e => ({ ...e }));
    const existing = next.find(e => e.id === product.id);
    if (existing) existing.qty += 1;
    else next.push({ id: product.id, nome: product.nome, qty: 1, preco_unit: Number(product.precoNum) });
    return postCurrentOrder(next);
  };

  const removeExtraFromCart = (productId) => {
    const next = [];
    for (const e of currentExtras) {
      if (e.id !== productId) { next.push({ ...e }); continue; }
      if (e.qty > 1) next.push({ ...e, qty: e.qty - 1 });
      // qty === 1: dropa o item (não inclui no array)
    }
    return postCurrentOrder(next);
  };

  // updateComposition é chamado pelo EditarCarrinhoDrawer (slot radio com debounce);
  // confirmCurrentOrder é o "Confirmar pedido" da Home e do Drawer.
  const updateComposition = (newComposition) => postCurrentOrder(currentExtras, newComposition);
  const confirmCurrentOrder = async () => {
    if (!currentWeeklyOrder?.id) return;
    try {
      const saved = await confirmWeeklyOrder(currentWeeklyOrder.id);
      setWeeklyOrders(prev => {
        // Defensivo: se saved.id não bate com nenhum order local (cenário
        // inesperado de stale state ou race), substitui pelo saved direto
        // pra garantir que o estado reflita a confirmação.
        if (!prev.some(o => o.id === saved.id)) {
          console.warn("[App] confirmCurrentOrder: saved.id sem match local — forçando substituição por delivery_date", { savedId: saved.id, prevIds: prev.map(o => o.id) });
          return mergeOrder(prev, saved);
        }
        return prev.map(o => (o.id === saved.id ? saved : o));
      });
    } catch (err) {
      console.error("[App] confirmCurrentOrder failed", err);
    }
  };

  const isOnboarding=scr==="onboarding";

  const handleOnboardingComplete=(payload)=>{
    // POST do POST /api/subscriptions ja rodou no clique "Confirmar" da T2.
    // Aqui so persiste o resultado + payload no localStorage e navega pra Home.
    const data=payload?.data||{};
    const assinatura=payload?.assinatura||{};
    const coverage_unconfirmed=!!payload?.coverage_unconfirmed;
    const subscription_id=payload?.subscription_id;
    const status=payload?.status;

    if(!subscription_id){
      // Caso defensivo: sem id, nao faz sentido criar subscription local.
      // Loga e segue pra Home (onboarding ja foi).
      console.warn("[App] onboarding sem subscription_id, abortando persist");
      setScr("home");
      return;
    }

    const novaSubscription={
      id: subscription_id,
      status,
      nome: data.nome,
      whatsapp: data.whatsapp,
      email: data.email,
      cpf: data.cpf,
      endereco:{
        cep: data.cep,
        rua: data.rua,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        cidade: data.cidade,
        estado: data.estado,
      },
      itens: assinatura,
      coverage_unconfirmed,
      createdAt: new Date().toISOString(),
    };
    saveSubscription(novaSubscription);
    setSubscription(novaSubscription);
    setUserData(novaSubscription);
    if(Object.keys(assinatura).length>0){
      setOnboardingConfig({data,assinatura});
    }
    setScr("home");
  };

  // Aplica alteração da Assinatura (Frente C item 2, Cenário A — mês alinhado).
  // `updated` vem do POST (ou stub) com a subscription completa atualizada
  // (itens, total_paes, valor_paes, valor_mensal, next_billing_change_date,
  // next_billing_value). Sync local: state + localStorage. Alteração permanente,
  // baseline = nova composição (sem ciclo histórico).
  const handleAlterarAssinatura=(updated)=>{
    haptic();
    setSubscription(updated);
    setAssinaturaQtds(updated.itens);
    setAssinaturaBaseline(updated.itens);
    setCestaSemana(null);
    saveSubscription(updated);
  };

const params = new URLSearchParams(window.location.search);
  // Fallback minimo enquanto chunks lazy carregam. Usa grafismo da marca.
  const lazyFallback=<div style={{position:"fixed",inset:0,background:W[50],display:"flex",alignItems:"center",justifyContent:"center"}}><img src="/images/grafismo_coracao.svg" alt="Cora" style={{width:48,height:48,opacity:0.6}}/></div>;
  if (window.location.pathname === "/interesse") return <Suspense fallback={lazyFallback}><PreCadastro /></Suspense>;
  // Rota capacity waitlist (manual: setScr("lista-espera"))
  // Banner persistente na propria pagina substitui o toast antigo de redirect.
  if (scr === "lista-espera") return (
    <Suspense fallback={lazyFallback}>
      <CapacityWaitlist reason={waitlistReason}/>
    </Suspense>
  );
  // Sem subscription persistida e sem ?dev=1: PreCadastro. Subscription
  // existente destrava o portal direto (funciona como sessao do MVP).
  if (!subscription && !params.get("dev")) return <Suspense fallback={lazyFallback}><PreCadastro /></Suspense>;
  if(isOnboarding) return <Suspense fallback={lazyFallback}><CoraOnboarding onComplete={handleOnboardingComplete} subscriptionsOpen={subscriptionsOpen} onGoToCapacityWaitlist={goToCapacityWaitlist}/></Suspense>;

  return<div style={{fontFamily:fb,maxWidth:390,margin:"0 auto",background:W[50],minHeight:"100vh",display:"flex",flexDirection:"column",position:"relative"}}>
    <a href="#main-content" className="skip-link">Pular para o conteúdo</a>
    {/* Bloco sticky: logo + banner pendente. Banner integrado ao
        sticky pra nao sair do viewport quando a Home faz scroll inicial. */}
    <div style={{position:"sticky",top:0,zIndex:10}}>
      <div style={{padding:"10px 16px",background:"#FFF",borderBottom:`1px solid ${W[200]}`}}>
        <img src={IMG.logo} alt="Cora" style={{height:28}}/>
      </div>
      <PendingPaymentBanner pendingPayment={pendingPayment}/>
    </div>
    <main ref={mainRef} id="main-content" style={{flex:1,overflowY:"auto"}}>
      <div key={scr} className="tab-content">
        {scr==="home"&&<Home onNav={handleNav} userData={userData} isFirstVisit={isFirstVisit} onSeen={()=>setIsFirstVisit(false)} cutoff={cutoff} assinaturaQtds={assinaturaQtds} assinaturaBaseline={assinaturaBaseline} cestaAtual={cestaAtual} onSetCestaSemana={setCestaSemana} ehPrimeiroAcesso={ehPrimeiroAcesso} pendingPayment={pendingPayment} currentWeeklyOrder={currentWeeklyOrder} currentExtras={currentExtras} addExtraToCart={addExtraToCart} removeExtraFromCart={removeExtraFromCart} updateComposition={updateComposition} confirmCurrentOrder={confirmCurrentOrder}/>}
        {scr==="assinatura"&&<Assinatura hasPending={false} cutoff={cutoff} subscription={subscription} assinaturaQtds={assinaturaQtds} onAlterado={handleAlterarAssinatura}/>}
        {scr==="cardapio"&&<Cardapio addExtraToCart={addExtraToCart} cutoff={cutoff} pendingPayment={pendingPayment}/>}
        {scr==="perfil"&&<Perfil subscription={subscription} weeklyOrders={weeklyOrders} pendingPayment={pendingPayment}/>}
      </div>
    </main>
    {/* Footers fixos (OrderFooter/ConfirmedFooter) removidos no PR 2 Fase 1.
        Confirmação do pedido vai pro botão "Confirmar pedido" no card da Home
        e no EditarCarrinhoDrawer (Fase 2). */}
    <Nav active={scr} onNav={handleNav} inicioBadge={
      currentWeeklyOrder?.status==="rascunho" &&
      ((currentWeeklyOrder?.extras?.length||0)>0 || currentWeeklyOrder?.composition!=null)
    }/>
    <style>{`
      *{box-sizing:border-box;margin:0;-webkit-tap-highlight-color:transparent}
      body{margin:0;-webkit-text-size-adjust:100%;overscroll-behavior:none}
      img{max-width:100%}
      input,button{font-size:16px}
      @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
      @keyframes spin{to{transform:rotate(360deg)}}
      /* Toast: fadeUp dedicado (280ms ease-out) — translateY 8px → 0 + fade */
      @keyframes toastFadeUp{from{opacity:0;transform:translateY(8px) scale(1)}to{opacity:1;transform:translateY(0) scale(1)}}
      /* Remoção de linha do Card de Cesta + Drawer: slide-out horizontal + fade + colapso vertical (450ms ease-out — abaixo disso o user não acompanha a transição). */
      @keyframes slideOutFade{to{opacity:0;transform:translateX(40px);max-height:0;padding-top:0;padding-bottom:0;margin-top:0;margin-bottom:0;border-bottom-width:0}}
      .cesta-row-removing{animation:slideOutFade 450ms ease-out forwards;overflow:hidden}
      .bp:hover{background:${B[600]}!important}
      .bw:hover{background:#1FAF54!important}
      .bl:hover{background:${W[100]}!important}
      .lk:hover{text-decoration:underline}
      .qb:hover:not(:disabled){background:${W[100]}!important}
      /* Page transitions cross-dissolve entre abas */
      .tab-content{animation:tabIn 220ms ease-out}
      @keyframes tabIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      /* Press scale nos CTAs e botoes interativos */
      .press-scale{transition:transform 120ms ease-out,background 150ms ease-out}
      .press-scale:active:not(:disabled){transform:scale(0.97)}
      /* Focus visible universal: botoes, links, e elementos com role=button ou tabindex */
      button:focus-visible,
      a:focus-visible,
      [role="button"]:focus-visible,
      [role="dialog"]:focus-visible,
      [tabindex]:focus-visible,
      input:focus-visible,
      select:focus-visible,
      textarea:focus-visible{outline:none;box-shadow:0 0 0 3px ${B[50]},0 0 0 5px ${B[500]}}
      /* Skip link a11y */
      .skip-link{position:absolute;top:-40px;left:0;background:${B[500]};color:#FFF;padding:8px 16px;z-index:100;text-decoration:none;font-family:${fb};font-size:14px;border-radius:0 0 8px 0}
      .skip-link:focus{top:0}
      /* Reduced motion: respeita preferencia do sistema */
      @media (prefers-reduced-motion: reduce){
        *,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important;scroll-behavior:auto!important}
      }
    `}</style>
  </div>;
}