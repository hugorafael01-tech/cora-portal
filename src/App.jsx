import { useState, useEffect, useRef, lazy, Suspense } from "react";
// Code splitting: Onboarding e PreCadastro sao pesados e so acessados em fluxos
// especificos. Lazy chunks separados reduzem o bundle inicial do Portal.
const CoraOnboarding = lazy(() => import("./Onboarding"));
const PreCadastro = lazy(() => import("./pages/PreCadastro"));
const CapacityWaitlist = lazy(() => import("./pages/CapacityWaitlist"));
import ProductCard from "./components/ProductCard";
import PendingPaymentBanner from "./components/PendingPaymentBanner";
import { isPastCutoff, nextEditableThursdayISO } from "./utils/cutoff";
import { haptic } from "./utils/haptic";
import { plural } from "./utils/plural";
import { loadSubscription, saveSubscription, clearSubscription, reconcileSubscription } from "./utils/subscription";
import { getSettings, getWeeklyOrders, postWeeklyOrder, confirmWeeklyOrder } from "./utils/api";
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
  cartao:{band:"Visa",n:"6411",prox:"1º de abril"},
  cob:{mes:"Março",valor:"R$ 99,00",status:"Pago"},
  semanasRestantes:2,
  // `genero` controla a flexão do toast pós-adicionar ("adicionada"/"adicionado").
  // `subCopy` é a sub-copy emocional do hero da Novidade (briefing 5.3).
  // Quando o Backoffice nascer, ambos viram campo do produto no banco.
  extras:[{id:"focaccia",nome:"Focaccia Genovesa",peso:"430g",preco:"R$ 22,00",precoNum:22,genero:"f",subCopy:"Pra um café da tarde diferente.",img:IMG.focaccia,ingredientes:"Farinha, água, azeite extra-virgem, sal, levain, cebola roxa, alecrim fresco.",historia:"A receita veio de Gênova, onde a focaccia é assunto sério. Lá, cada padeiro tem sua versão. A da Cora leva fermentação longa de 24h e azeite generoso. A cebola roxa carameliza no forno e o alecrim perfuma a cozinha inteira."}],
  pães:[
    {id:"original",nome:"Pão Original",peso:"700g",preco:"R$ 27,00",precoNum:27,genero:"m",img:IMG.original,desc:"Pão de toda mesa. Vai com azeite, queijo, bruschetta de tomate ou o que você abrir na cozinha.",sobre:"Blend de farinha branca italiana e integral brasileira. Levain da Cora, água, sal. Hidratação 70%.",ingredientes:"Farinha de trigo, Água, Sal marinho, Levain natural",qtd:1},
    {id:"integral",nome:"Pão Integral",peso:"700g",preco:"R$ 29,00",precoNum:29,genero:"m",img:IMG.integral,desc:"Sabor de grão inteiro, miolo leve. Torrado pela manhã ou ao lado da salada no almoço.",sobre:"100% integral em blend de farinha brasileira e italiana. Levain da Cora, água, sal, azeite. Hidratação 75%.",ingredientes:"Farinha integral, Água, Sal marinho, Levain natural",qtd:0},
  ],
  rotativos:[
    {id:"multigraos",nome:"Multigrãos",peso:"615g",preco:"R$ 32,00",precoNum:32,genero:"m",img:IMG.multigraos,desc:"Aveia, centeio, gergelim e mel.",ingredientes:"Farinha de trigo, centeio, aveia, água, mel, sal, levain, gergelim.",detalhe:"Cinco grãos na massa, mel na fermentação. Miolo denso, casca com gergelim tostado."},
    {id:"focaccia",nome:"Focaccia Genovesa",peso:"430g",preco:"R$ 22,00",precoNum:22,genero:"f",img:IMG.focaccia,desc:"Azeite generoso, cebola roxa, alecrim.",ingredientes:"Farinha, água, azeite extra-virgem, sal, levain, cebola roxa, alecrim fresco.",detalhe:"Fermentação longa de 24h. Azeite generoso. A cebola roxa carameliza no forno e o alecrim perfuma a cozinha inteira."},
    {id:"ciabatta",nome:"Ciabatta",peso:"533g",preco:"R$ 25,00",precoNum:25,genero:"f",img:IMG.ciabatta,desc:"Crosta fina, miolo aberto e leve.",ingredientes:"Farinha de trigo, água, sal, levain, azeite.",detalhe:"Massa de alta hidratação. Crosta fina e crocante, miolo com alvéolos grandes e textura leve."},
    {id:"brioche",nome:"Brioche",peso:"256g",preco:"R$ 32,00",precoNum:32,genero:"m",img:IMG.brioche,desc:"Manteiga francesa, textura amanteigada.",ingredientes:"Farinha, manteiga, ovos, açúcar, sal, levain, leite.",detalhe:"Massa enriquecida com manteiga. Fermentação 18h. Miolo dourado, textura que desfia."},
  ],
  semana:{pedidosAbertos:false,cardapioProxima:["Pão Original","Pão Integral","Focaccia Genovesa"],entregaProxima:formatarDataEntrega(proximaQuinta(new Date(Date.now()+7*24*60*60*1000)))},
  hist:[
    {sem:"Semana 28/03",itens:"1 Pão Original (700g)",st:"Pendente",extra:null},
    {sem:"Semana 21/03",itens:"1 Pão Original (700g)",st:"Entregue",extra:null},
    {sem:"Semana 14/03",itens:"1 Pão Original (700g)",st:"Entregue",extra:{nome:"Focaccia Genovesa",valor:"R$ 22,00"}},
    {sem:"Semana 07/03",itens:"1 Pão Original (700g)",st:"Entregue",extra:null},
  ],
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
const Btn=({children,primary,disabled,onClick,style:es,full,ariaLabel})=>{const[h,setH]=useState(false);return<button aria-label={ariaLabel} disabled={disabled} onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} className="press-scale" style={{padding:"12px 20px",borderRadius:radii.md,border:primary?"none":`1px solid ${h&&!disabled?B[600]:B[500]}`,background:primary?(disabled?W[200]:h?B[600]:B[500]):(h&&!disabled?B[50]:"none"),color:primary?(disabled?W[500]:"#FFF"):B[500],fontFamily:fb,fontSize:14,fontWeight:500,cursor:disabled?"default":"pointer",opacity:disabled?0.5:1,minHeight:44,width:full?"100%":"auto",transition:"all 150ms ease",...es}}>{children}</button>;};
// QtyStepper [- N +] — usado na lista de extras do Card de Cesta da Home
// (variant brand sobre fundo brand-50) e no Drawer (Fase 3, variant neutro).
// SVG inline pros sinais − e + (mantém peso visual consistente, sem confusão
// com fontes do sistema). Borda muda conforme variant.
const QtyStepper=({qty,onIncrement,onDecrement,name,disabled=false,variant="brand"})=>{
  const bColor=variant==="brand"?B[100]:W[300];
  const iconColor=disabled?W[300]:B[500];
  const btnStyle={
    width:32,height:32,padding:0,
    background:"transparent",border:"none",
    cursor:disabled?"not-allowed":"pointer",
    color:iconColor,
    display:"flex",alignItems:"center",justifyContent:"center",
  };
  return (
    <div onClick={e=>e.stopPropagation()} style={{
      display:"inline-flex",alignItems:"center",
      border:`1px solid ${bColor}`,borderRadius:radii.md,
      background:"#FFF",overflow:"hidden",flexShrink:0,
    }}>
      <button type="button" onClick={onDecrement} disabled={disabled} aria-label={`Diminuir ${name}`} style={btnStyle}>
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
      <button type="button" onClick={onIncrement} disabled={disabled} aria-label={`Aumentar ${name}`} style={btnStyle}>
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
const simulate=()=>new Promise(r=>setTimeout(r,600));

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

// ─── HELPERS ───
// `totalOf` ainda é usado pelo Perfil pra somar `confirmedLegacy` (extras
// renderizados em forma 1-por-unidade pelo shim). Quando o Perfil também
// migrar pra leitura direta de `currentWeeklyOrder.total_extras` (futura
// frente do Perfil), esse helper sai junto.
const totalOf=list=>list.filter(p=>p.kind!=="swap").reduce((s,p)=>s+p.precoNum,0);

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
// Helpers para montar slots e converter entre qtdsMap <-> slots array
// slots: array de ids na ordem fixa (derivada da Assinatura). Ex: ["original","original","integral"] para 2 Originais + 1 Integral.
const qtdsToSlots=(qtds)=>{const s=[];Object.entries(qtds).forEach(([id,q])=>{for(let i=0;i<q;i++)s.push(id);});return s;};
const slotsToQtds=(slots)=>slots.reduce((a,id)=>{a[id]=(a[id]||0)+1;return a;},{});

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
  onNav,
  onConfirmedToast,
})=>{
  const dialogRef=useRef(null);
  useModalA11y(dialogRef,true,onClose);
  const baselineQtds=assinaturaBaseline||assinaturaQtds;
  // Slots locais — radio selection sincroniza com updateComposition via debounce
  const[slots,setSlots]=useState(()=>qtdsToSlots(cestaAtual||baselineQtds));
  const compDebounceRef=useRef(null);

  const isLocked=cutoff||pendingPayment;
  const isConfirmado=currentWeeklyOrder?.status==="confirmado";

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

  const triggerCompositionSave=(nextSlots)=>{
    if(compDebounceRef.current) clearTimeout(compDebounceRef.current);
    compDebounceRef.current=setTimeout(()=>{
      const novoQtds=slotsToQtds(nextSlots);
      D.pães.forEach(p=>{if(novoQtds[p.id]===undefined) novoQtds[p.id]=0;});
      const igual=JSON.stringify(novoQtds)===JSON.stringify(baselineQtds);
      // Atualiza cestaSemana local (legacy compat) + POSTa composition
      onSetCestaSemana(igual?null:novoQtds);
      updateComposition(igual?null:novoQtds);
    },300);
  };

  const setSlot=(idx,novoId)=>{
    if(isLocked) return;
    setSlots(prev=>{
      const next=[...prev]; next[idx]=novoId;
      triggerCompositionSave(next);
      return next;
    });
  };

  const totalExtras=currentExtras.reduce((s,e)=>s+e.qty*Number(e.preco_unit),0);
  const assinaturaSlotsBase=qtdsToSlots(baselineQtds);

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

        {/* Seção: Sua assinatura */}
        <div style={{fontFamily:fd,fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:W[500],margin:"0 0 8px"}}>Sua assinatura</div>
        {assinaturaSlotsBase.map((produtoPadraoId,idx)=>{
          const produtoAtualId=slots[idx]||produtoPadraoId;
          return<div key={idx} style={{marginBottom:8}}>
            {assinaturaSlotsBase.length>1&&<div style={{fontFamily:fd,fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:W[500],marginBottom:6}}>Pão {idx+1}</div>}
            {D.pães.map(p=>{
              const sel=produtoAtualId===p.id;
              const isSwapped=sel&&p.id!==produtoPadraoId;
              return<button key={p.id} onClick={()=>setSlot(idx,p.id)} disabled={isLocked} style={{
                display:"flex",alignItems:"center",gap:10,width:"100%",
                padding:"12px 14px",marginBottom:8,
                borderRadius:radii.md,
                border:`1.5px solid ${sel?B[500]:W[200]}`,
                background:sel?B[50]:"#FFF",
                cursor:isLocked?"default":"pointer",textAlign:"left",
                opacity:isLocked?0.55:1,
                transition:"border-color 150ms ease, background 150ms ease",
              }}>
                <div style={{width:18,height:18,borderRadius:radii.full,border:`1.5px solid ${sel?B[500]:W[300]}`,position:"relative",flexShrink:0}}>
                  {sel&&<div style={{position:"absolute",inset:3,background:B[500],borderRadius:radii.full}}/>}
                </div>
                <div style={{flex:1,fontFamily:fb,fontSize:14,fontWeight:500,color:sel?B[700]:W[800]}}>
                  {p.nome} <span style={{fontWeight:400,fontSize:12,color:W[500]}}>· {p.peso}</span>
                  {isSwapped&&<span style={{
                    display:"inline-block",marginLeft:6,fontFamily:fd,fontSize:11,
                    textTransform:"uppercase",letterSpacing:"0.06em",color:B[600],
                    background:"#FFF",border:`1px solid ${B[100]}`,
                    padding:"1px 5px",borderRadius:radii.xs,verticalAlign:"1px",fontWeight:500,
                  }}>Trocado</span>}
                </div>
                <div style={{fontFamily:fb,fontSize:12,color:W[500],flexShrink:0}}>Incluso</div>
              </button>;
            })}
          </div>;
        })}

        {/* Seção: Extras desta semana */}
        <div style={{fontFamily:fd,fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:W[500],margin:"18px 0 8px"}}>Extras desta semana</div>
        {currentExtras.length===0
          ?<div style={{fontFamily:fb,fontSize:14,color:W[600],lineHeight:1.6,marginBottom:10}}>
              Você ainda não adicionou extras.<br/>
              <button onClick={()=>{onClose();onNav&&onNav("cardapio");}} className="lk" style={{fontFamily:fb,fontSize:14,color:B[500],fontWeight:500,background:"none",border:"none",cursor:"pointer",padding:0,marginTop:6}}>→ Ver tudo no Cardápio</button>
            </div>
          :currentExtras.map((e,idx)=>{
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
        }

        {/* Total — card warm-100 destacado */}
        <div style={{
          display:"flex",justifyContent:"space-between",alignItems:"baseline",
          marginTop:10,padding:"12px 14px",
          background:W[100],borderRadius:radii.md,
        }}>
          <span style={{fontFamily:fb,fontSize:13,color:W[700]}}>Total de extras desta semana</span>
          <span style={{fontFamily:fb,fontSize:18,fontWeight:700,color:B[500],fontVariantNumeric:"tabular-nums"}}>{fmt(totalExtras)}</span>
        </div>

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
        <Btn onClick={onClose} style={{flex:1}}>Cancelar</Btn>
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
            <ActionBtn primary
              disabled={isLocked}
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
              ariaLabel="Confirmar pedido"
            >Confirmar pedido</ActionBtn>
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

    {/* Novidade hero — clique no CTA adiciona direto (sem modal de detalhes) */}
    {D.extras.length>0
      ?<NovidadeCard extra={D.extras[0]} onAdd={()=>handleNovidadeAdd(D.extras[0])} cutoff={cutoff} lockedReason={pendingPayment?LOCK_REASON_PENDING:undefined}/>
      :<div style={{background:W[100],border:`1px solid ${W[200]}`,borderRadius:radii.lg,padding:"24px 20px",textAlign:"center",marginBottom:16}}>
        <div style={{fontFamily:fb,fontSize:14,color:W[600],lineHeight:1.5,marginBottom:8}}>Conhece o resto da nossa padaria?</div>
        <button onClick={()=>onNav("cardapio")} className="lk" style={{fontFamily:fb,fontSize:14,color:B[500],fontWeight:500,background:"none",border:"none",cursor:"pointer",padding:0}}>→ Ver tudo no Cardápio</button>
      </div>
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
      onNav={onNav}
      onConfirmedToast={()=>showToast(`Cesta confirmada. Entrega ${deliveryLabelShort}.`)}
    />}

    <ToastStack toasts={toasts}/>
  </div>;
};

// ═══ ASSINATURA ═══
// Helper pra montar a string "N Nome (peso) + N Nome (peso)" a partir de qtds map
// Pluraliza nome do pao em portugues: "Pão Original" -> "Pães Originais", "Pão Integral" -> "Pães Integrais"
const pluralizarPao=(n,nome)=>n===1?nome:nome.replace(/\bPão\b/,"Pães").replace(/\bOriginal\b/,"Originais").replace(/\bIntegral\b/,"Integrais");

const composicaoToStr=(qtdsMap)=>Object.entries(qtdsMap).filter(([,q])=>q>0).map(([id,q])=>{const p=D.pães.find(x=>x.id===id);return p?`${q} ${pluralizarPao(q,p.nome)} (${p.peso})`:"";}).filter(Boolean).join(" + ");

// Helper para nome do proximo mes em portugues
const MESES_PT=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const proximoMesPt=()=>MESES_PT[(new Date().getMonth()+1)%12];
const mesAtualPt=()=>MESES_PT[new Date().getMonth()];

const Assinatura=({onNav,hasPending,cutoff,assinaturaQtds,assinaturaBaseline,onSalvar})=>{
  const[editing,setEditing]=useState(false);
  // Rascunho local SO durante a edicao. Ao salvar, chama onSalvar(rascunho). Ao cancelar, descarta.
  const[rascunho,setRascunho]=useState(assinaturaQtds);
  const[confirmModal,setConfirmModal]=useState(false);
  const confirmDialogRef=useRef(null);
  useModalA11y(confirmDialogRef,confirmModal,()=>setConfirmModal(false));
  const[saved,setSaved]=useState(false);const[showCalc,setShowCalc]=useState(false);
  const[addrSt,setAddrSt]=useState('idle');const[cardSt,setCardSt]=useState('idle');

  // Sincroniza rascunho quando fecha edicao ou assinatura muda externamente
  useEffect(()=>{setRascunho(assinaturaQtds);},[assinaturaQtds,editing]);

  const total=Object.values(rascunho).reduce((s,q)=>s+q,0);
  const baseline=assinaturaBaseline||assinaturaQtds;
  const totalBaseline=Object.values(baseline).reduce((s,q)=>s+q,0);
  const mensal=D.assinatura.valorMensal*total;
  const mensalBaseline=D.assinatura.valorMensal*totalBaseline;
  const changed=JSON.stringify(rascunho)!==JSON.stringify(assinaturaQtds);

  // === Detecção de tipo VS BASELINE (não vs estado anterior) ===
  // Volta ao baseline: rascunho === baseline (mesmo que diferente do estado atual)
  const estaVoltandoAoBaseline=JSON.stringify(rascunho)===JSON.stringify(baseline);
  const ehAumentoVsBaseline=total>totalBaseline;
  const ehReducaoVsBaseline=total<totalBaseline;
  const ehTrocaVsBaseline=total===totalBaseline&&!estaVoltandoAoBaseline;

  // Proporcional: SEMPRE calculado vs baseline, nao vs estado anterior.
  // So aumentos geram cobranca. Reducao/troca/volta ao baseline = 0.
  const diffVsBaseline=mensal-mensalBaseline;
  const propVsBaseline=ehAumentoVsBaseline?Math.abs(diffVsBaseline/4*D.semanasRestantes):0;

  // Limites: min 1 pao (nao pode zerar a Assinatura), max 3 paes/semana.
  const upd=(id,d)=>setRascunho(prev=>{const v=(prev[id]||0)+d;const t=total+d;if(v<0||t>3||t<1)return prev;return{...prev,[id]:v};});
  const handleSaveClick=()=>setConfirmModal(true);
  const handleConfirmAlteracao=()=>{
    const tipo=ehAumentoVsBaseline?"aumento":(ehReducaoVsBaseline?"reducao":"troca");
    onSalvar(rascunho,{tipo,valorProporcional:propVsBaseline,proximoCicloValor:mensal});
    setConfirmModal(false);
    setEditing(false);setSaved(true);setTimeout(()=>setSaved(false),5000);
  };

  const itensStr=composicaoToStr(assinaturaQtds)||"Sem pães configurados";
  const totalAtual=Object.values(assinaturaQtds).reduce((s,q)=>s+q,0);
  const valorMensalAtual=D.assinatura.valorMensal*totalAtual;
  const primeiroPao=D.pães.find(p=>assinaturaQtds[p.id]>0)||D.pães[0];

  return<div style={{padding:"24px 16px 16px",paddingBottom:hasPending?80:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{fontFamily:fd,fontSize:26,textTransform:"uppercase",color:B[500],margin:0}}>Sua Assinatura</h2><Badge label="Ativa"/></div>
    <div style={{background:B[50],borderRadius:radii.lg,padding:16,marginBottom:16,fontFamily:fb,fontSize:14,color:B[800],lineHeight:1.6}}>Toda semana, pão fresco na sua porta. O valor da Assinatura é fixo. Em meses com 5 semanas, o pão extra é por nossa conta.</div>
    <Card style={{marginBottom:12}}><SL t="Minha Assinatura"/>
      <div style={{display:"flex",gap:12,alignItems:"center"}}><ProductThumb src={primeiroPao.img} w={56} h={48} alt={primeiroPao.nome}/><div style={{flex:1}}><div style={{fontFamily:fb,fontSize:13,color:W[600]}}>{itensStr} / semana</div><div style={{fontFamily:fb,fontSize:15,fontWeight:600,color:B[500],marginTop:4}}><AnimatedNumber value={valorMensalAtual}/>/mês</div></div></div>
      {!editing&&<><Btn full disabled={cutoff} onClick={()=>setEditing(true)} style={{marginTop:12}}>Alterar minha Assinatura</Btn>{cutoff&&<CutoffMsg/>}</>}
      {editing&&<div style={{marginTop:16,borderTop:`1px solid ${W[200]}`,paddingTop:16}}>
        <DeadlineWarning/>
        <div style={{fontFamily:fb,fontSize:12,color:W[500],marginBottom:12}}>Limite: 3 pães/semana ({total}/3)</div>
        {D.pães.map((p,i)=>{const q=rascunho[p.id]||0;const minusDisabled=q===0||total<=1;const plusDisabled=total>=3;return<div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:i<D.pães.length-1?`1px solid ${W[100]}`:"none"}}>
          <ProductThumb src={p.img} w={48} h={40} alt={p.nome}/>
          <div style={{flex:1}}><div style={{fontFamily:fb,fontSize:14,fontWeight:600,color:W[800]}}>{p.nome} <span style={{fontWeight:400,fontSize:12,color:W[500]}}>({p.peso})</span></div></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}><button onClick={()=>upd(p.id,-1)} disabled={minusDisabled} className="qb" style={{width:32,height:32,borderRadius:radii.md,border:`1px solid ${minusDisabled?W[200]:W[300]}`,background:"none",cursor:minusDisabled?"default":"pointer",fontSize:18,color:minusDisabled?W[300]:W[600],display:"flex",alignItems:"center",justifyContent:"center",opacity:minusDisabled?0.4:1}}>−</button><span style={{fontFamily:fb,fontSize:16,fontWeight:600,color:q>0?B[500]:W[400],width:24,textAlign:"center"}}>{q}</span><button onClick={()=>upd(p.id,1)} disabled={plusDisabled} className="qb" style={{width:32,height:32,borderRadius:radii.md,border:`1px solid ${plusDisabled?W[200]:B[500]}`,background:plusDisabled?"none":B[50],cursor:plusDisabled?"default":"pointer",fontSize:18,color:plusDisabled?W[300]:B[500],display:"flex",alignItems:"center",justifyContent:"center",opacity:plusDisabled?0.4:1}}>+</button></div>
        </div>;})}
        <div style={{fontFamily:fb,fontSize:15,fontWeight:600,color:W[800],textAlign:"right",padding:"12px 0 4px"}}>Novo valor mensal: <span style={{color:B[500]}}><AnimatedNumber value={mensal}/></span></div>
        {changed&&<><div style={{fontFamily:fb,fontSize:12,color:W[500],textAlign:"right",marginBottom:4}}>Baseline do mês: {fmt(mensalBaseline)} → Novo: {fmt(mensal)}</div>
          {/* Volta ao baseline: mensagem informativa, sem ajuste */}
          {estaVoltandoAoBaseline&&<div style={{background:W[100],borderRadius:radii.md,padding:"10px 12px",marginBottom:12,border:`1px solid ${W[200]}`,fontFamily:fb,fontSize:13,color:W[700],lineHeight:1.5}}>Você voltou à sua Assinatura original deste mês. Nenhuma cobrança ou crédito adicional.</div>}
          {/* Aumento vs baseline: proporcional calculado sobre baseline */}
          {ehAumentoVsBaseline&&<div onClick={()=>setShowCalc(!showCalc)} style={{background:B[50],borderRadius:radii.md,padding:"10px 12px",marginBottom:12,cursor:"pointer",border:`1px solid ${B[100]}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontFamily:fb,fontSize:13,color:B[700]}}>Ajuste neste mês: <span style={{fontWeight:600}}>+{fmt(propVsBaseline)}</span></div><I d={ic.chevDown} size={16} color={B[400]}/></div>{showCalc&&<div style={{marginTop:8,fontFamily:fb,fontSize:12,color:B[600],lineHeight:1.6,animation:"fadeUp 200ms ease"}}>Faltam {D.semanasRestantes} {plural(D.semanasRestantes,"semana","semanas")} neste mês.<br/>Diferença semanal vs baseline: +{fmt(Math.abs(diffVsBaseline/4))}/semana<br/>Cobrado proporcionalmente na próxima fatura: +{fmt(propVsBaseline)}</div>}</div>}
          {/* Reducao vs baseline: vale no proximo ciclo */}
          {ehReducaoVsBaseline&&<div style={{background:W[100],borderRadius:radii.md,padding:"10px 12px",marginBottom:12,border:`1px solid ${W[200]}`,fontFamily:fb,fontSize:13,color:W[700],lineHeight:1.5}}>Até o fim de {mesAtualPt()}, você continua recebendo {totalBaseline} {plural(totalBaseline,"pão","pães")} por semana. Sua nova Assinatura começa em 1º de {proximoMesPt()}.</div>}
        </>}
        <div style={{display:"flex",gap:8}}><Btn onClick={()=>{setEditing(false);setRascunho(assinaturaQtds);setShowCalc(false);}} style={{flex:1}}>Cancelar</Btn><Btn primary disabled={!changed} onClick={handleSaveClick} style={{flex:2}}>{changed?"Salvar":"Faça uma alteração"}</Btn></div>
      </div>}
    </Card>

    {/* Modal de confirmacao */}
    {confirmModal&&<>
      <div onClick={()=>setConfirmModal(false)} style={{position:"fixed",inset:0,background:"rgba(26,24,21,0.5)",zIndex:50,animation:"fadeIn 200ms ease"}}/>
      <div ref={confirmDialogRef} role="dialog" aria-modal="true" aria-label="Confirmar alteração da Assinatura" style={{position:"fixed",bottom:0,left:0,right:0,maxWidth:390,margin:"0 auto",background:"#FFF",borderRadius:`${radii.xl} ${radii.xl} 0 0`,zIndex:51,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 -4px 24px rgba(26,24,21,0.12)",animation:"slideUp 300ms ease",padding:20}}>
        <div style={{fontFamily:fd,fontSize:20,textTransform:"uppercase",color:B[500],marginBottom:16}}>Confirmar alteração da Assinatura</div>

        <div style={{fontFamily:fb,fontSize:13,color:W[500],marginBottom:4}}>Baseline do mês:</div>
        <div style={{fontFamily:fb,fontSize:14,color:W[800],marginBottom:10}}>{composicaoToStr(baseline)||"Sem pães"} · {fmt(mensalBaseline)}/mês</div>
        <div style={{fontFamily:fb,fontSize:13,color:W[500],marginBottom:4}}>Nova Assinatura:</div>
        <div style={{fontFamily:fb,fontSize:14,fontWeight:600,color:B[700],marginBottom:16}}>{composicaoToStr(rascunho)||"Sem pães"} · {fmt(mensal)}/mês</div>

        <div style={{height:1,background:W[200],marginBottom:16}}/>

        {/* Mensagens por tipo vs BASELINE */}
        {estaVoltandoAoBaseline&&<div style={{fontFamily:fb,fontSize:13,color:W[700],lineHeight:1.5,marginBottom:20}}>Você voltou à sua Assinatura original deste mês. Nenhuma cobrança ou crédito adicional.</div>}
        {ehAumentoVsBaseline&&<div style={{fontFamily:fb,fontSize:13,color:W[700],lineHeight:1.5,marginBottom:20}}>Você será cobrado <strong>+{fmt(propVsBaseline)}</strong> neste mês (pelos dias restantes). Sua próxima fatura completa de {fmt(mensal)} será em 1º de {proximoMesPt()}.</div>}
        {ehReducaoVsBaseline&&<div style={{fontFamily:fb,fontSize:13,color:W[700],lineHeight:1.5,marginBottom:20}}>Até o fim de {mesAtualPt()}, você continua recebendo {totalBaseline} {plural(totalBaseline,"pão","pães")} por semana. Sua nova Assinatura começa em 1º de {proximoMesPt()}: {total} {plural(total,"pão","pães")} por semana.</div>}
        {ehTrocaVsBaseline&&<div style={{fontFamily:fb,fontSize:13,color:W[700],lineHeight:1.5,marginBottom:20}}>Você trocou quais pães recebe. O valor mensal não muda.</div>}

        <div style={{display:"flex",gap:8}}>
          <Btn onClick={()=>setConfirmModal(false)} style={{flex:1}}>Voltar</Btn>
          <ActionBtn primary loadingText="Salvando…" successText="Atualizada ✓" onAction={()=>simulate()} onComplete={handleConfirmAlteracao} style={{flex:2}}>Confirmar alteração</ActionBtn>
        </div>
      </div>
    </>}

    <Toast msg="Assinatura atualizada!" vis={saved}/>
    <Card style={{marginBottom:12}}><SL t="Entrega"/><div style={{fontFamily:fb,fontSize:16,fontWeight:600,color:W[800],marginBottom:4}}>Entregas às {D.ent.dia.toLowerCase()}</div><div style={{fontFamily:fb,fontSize:13,color:W[600]}}>{D.ent.cond}, {D.ent.bloco}</div><div style={{fontFamily:fb,fontSize:13,color:W[500],marginBottom:8}}>Frete: {D.ent.frete}</div><div style={{fontFamily:fb,fontSize:12,color:B[700],background:B[50],padding:"8px 12px",borderRadius:radii.md,marginBottom:8,display:"flex",gap:8,alignItems:"flex-start"}}><I d={ic.users} size={16} color={B[500]}/><span>Traga 5 moradores do seu prédio e tenha entrega gratuita.</span></div><div onClick={async()=>{if(addrSt!=='idle')return;setAddrSt('loading');await simulate();setAddrSt('success');setTimeout(()=>setAddrSt('idle'),1500);}} className="lk" style={{fontFamily:fb,fontSize:13,color:addrSt==='success'?'#065F46':B[500],fontWeight:500,cursor:addrSt!=='idle'?'default':'pointer',background:addrSt==='success'?'#D1FAE5':'none',padding:addrSt==='success'?'4px 8px':0,borderRadius:radii.md,display:'inline-block',transition:'all 150ms ease',opacity:addrSt==='loading'?0.5:1}}>{addrSt==='loading'?'Salvando…':addrSt==='success'?'Salvo ✓':'Editar endereço ›'}</div></Card>
    <Card style={{marginBottom:12}}><SL t="Cobrança"/><div style={{fontFamily:fb,fontSize:16,fontWeight:600,color:W[800],marginBottom:4}}>Mensal no cartão</div><div style={{fontFamily:fb,fontSize:13,color:W[600]}}>{D.cartao.band} ••••{D.cartao.n}</div><div style={{fontFamily:fb,fontSize:13,color:W[500],marginBottom:8}}>Próxima: {D.cartao.prox}</div><div onClick={async()=>{if(cardSt!=='idle')return;setCardSt('loading');await simulate();setCardSt('success');setTimeout(()=>setCardSt('idle'),1500);}} className="lk" style={{fontFamily:fb,fontSize:13,color:cardSt==='success'?'#065F46':B[500],fontWeight:500,cursor:cardSt!=='idle'?'default':'pointer',background:cardSt==='success'?'#D1FAE5':'none',padding:cardSt==='success'?'4px 8px':0,borderRadius:radii.md,display:'inline-block',transition:'all 150ms ease',opacity:cardSt==='loading'?0.5:1}}>{cardSt==='loading'?'Validando…':cardSt==='success'?'Atualizado ✓':'Atualizar cartão ›'}</div></Card>
    <Card onClick={()=>onNav("perfil")} style={{marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} ariaLabel="Ver histórico"><div style={{display:"flex",alignItems:"center",gap:12}}><I d={ic.file} size={20} color={B[500]}/><div><div style={{fontFamily:fb,fontSize:14,fontWeight:500,color:W[700]}}>Histórico de entregas e cobranças</div><div style={{fontFamily:fb,fontSize:12,color:W[500]}}>{D.cob.mes} · {D.cob.valor} · {D.cob.status}</div></div></div><I d={ic.chev} size={16} color={W[400]}/></Card>
  </div>;
};

// ═══ CARDÁPIO ═══
// Refactor Frente C item 3 (wireframe v2):
//  - Linha micro-tipográfica "Extras entram na sua próxima fatura."
//  - NovidadeCard Hero (D.extras[0]) antes da lista
//  - Lista unificada de 6 produtos na ordem do wireframe (Original → Integral →
//    Focaccia → Multigrãos → Brioche → Ciabatta), buscando primeiro em D.pães,
//    fallback em D.rotativos pra cobrir os 4 do catálogo rotativo
//  - ProductCard expande inline (sem modal sobreposto)
//  - Click no botão "Adicionar à cesta" dispara POST + toast (stack até 3)
const CARDAPIO_PRODUCT_ORDER=["original","integral","focaccia","multigraos","brioche","ciabatta"];
const Cardapio=({addExtraToCart,cutoff,pendingPayment})=>{
  const{toasts,push:pushToast}=useToastStack();
  const lockedReason=pendingPayment?LOCK_REASON_PENDING:undefined;

  // Lista unificada na ordem curada do wireframe. Resolve cada id contra
  // D.pães e D.rotativos (Pão Original/Integral em pães; demais em rotativos).
  const cardapioProducts=CARDAPIO_PRODUCT_ORDER
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
// Helper: gera copy humana de uma entrada de historico de ciclo.
// Retorna string conforme o tipo (aumento / reducao / troca).
const copyEntradaCiclo=(entrada)=>{
  if(!entrada) return "";
  const {tipo,baseline,atual}=entrada;
  const totalA=Object.values(atual).reduce((s,q)=>s+q,0);
  if(tipo==="aumento"){
    // Calcula quais paes foram adicionados (positivos no delta)
    const add=[];D.pães.forEach(p=>{const d=(atual[p.id]||0)-(baseline[p.id]||0);if(d>0)add.push(`${d} ${pluralizarPao(d,p.nome)}`);});
    return add.length?`Você adicionou ${add.join(" e ")} à sua Assinatura.`:`Você aumentou sua Assinatura para ${totalA} ${plural(totalA,"pão","pães")} por semana.`;
  }
  if(tipo==="reducao"){
    return `Você reduziu sua Assinatura para ${totalA} ${plural(totalA,"pão","pães")} por semana.`;
  }
  // troca: quantidade igual, composicao diferente
  const removido=[];const adicionado=[];
  D.pães.forEach(p=>{const d=(atual[p.id]||0)-(baseline[p.id]||0);if(d>0)adicionado.push(`${d} ${pluralizarPao(d,p.nome)}`);else if(d<0)removido.push(`${-d} ${pluralizarPao(-d,p.nome)}`);});
  if(removido.length&&adicionado.length) return `Você trocou ${removido.join(" e ")} por ${adicionado.join(" e ")} na sua Assinatura.`;
  return `Você ajustou a composição da sua Assinatura.`;
};

const Perfil=({confirmed,hasPending,assinaturaQtds,historicoCicloAtual,historicoCiclosPassados=[]})=>{
  const[cpf,setCpf]=useState(false);const dados=[["Endereço","Ed. Boa Vista, Bl. A / 502"],["Dia de entrega","Quintas-feiras"],["WhatsApp","(21) 99876-5432"],["E-mail","beatriz@email.com"],["CPF",cpf?"123.456.789-00":"•••.•••.789-00"]];const confirmedTotal=totalOf(confirmed);const qtdTotal=Object.values(assinaturaQtds||{}).reduce((s,q)=>s+q,0);const assinVal=D.assinatura.valorMensal*qtdTotal;
  return<div style={{padding:"24px 16px 16px",paddingBottom:hasPending?80:16}}>
    <h2 style={{fontFamily:fd,fontSize:26,textTransform:"uppercase",color:B[500],margin:"0 0 20px"}}>Perfil</h2>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><div style={{width:48,height:48,borderRadius:radii.full,background:B[50],display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${B[200]}`,flexShrink:0}}><img src="/images/grafismo_coracao.svg" alt="" aria-hidden="true" style={{width:28,height:28}}/></div><div><div style={{fontFamily:fb,fontSize:16,fontWeight:600,color:W[800]}}>Beatriz Silva</div><div style={{fontFamily:fb,fontSize:12,color:W[500]}}>beatriz@email.com</div></div></div>
    <Card style={{marginBottom:12}}><SL t="Dados pessoais"/>{dados.map(([l,v],i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:i<dados.length-1?`1px solid ${W[100]}`:"none"}}><div><div style={{fontFamily:fb,fontSize:11,color:W[500],marginBottom:2}}>{l}</div><div style={{fontFamily:fb,fontSize:13,color:W[700]}}>{v}</div></div>{l==="CPF"?<button aria-label={cpf?"Ocultar CPF":"Mostrar CPF"} onClick={()=>setCpf(!cpf)} style={{background:"none",border:"none",cursor:"pointer",padding:4,minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center"}}><I d={cpf?ic.eyeOff:ic.eye} size={16} color={W[400]}/></button>:<I d={ic.chev} size={14} color={W[400]}/>}</div>)}</Card>
    <Card style={{marginBottom:12}}><SL t="Histórico de entregas e cobranças"/>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><I d={ic.check} size={14} color={ST.success.t}/><span style={{fontFamily:fb,fontSize:13,fontWeight:500,color:ST.success.t}}>Tudo em dia</span></div>
      {/* Card "Esta semana" (brand-50) removido no PR 2 Fase 1.
          A visão detalhada da cesta migra pro EditarCarrinhoDrawer na Fase 2. */}
      {/* Ajuste do ciclo atual (uma unica entrada, ou null) */}
      {[...(historicoCicloAtual?[historicoCicloAtual]:[]),...historicoCiclosPassados].map((alt,i)=>{
        const d=new Date(alt.data);
        const dataStr=`${d.getDate()} de ${MESES_PT[d.getMonth()]}`;
        return<div key={`ajuste-${i}`} style={{padding:12,borderRadius:radii.md,background:"#FFF",border:`1px solid ${W[200]}`,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{fontFamily:fb,fontSize:12,color:W[500],fontWeight:500}}>{dataStr}</span>
            <span style={{fontFamily:fb,fontSize:11,fontWeight:500,padding:"3px 8px",borderRadius:radii.xs,background:W[200],color:W[800]}}>Ajuste</span>
          </div>
          <div style={{fontFamily:fb,fontSize:13,color:W[800],lineHeight:1.5}}>{copyEntradaCiclo(alt)}</div>
          {alt.tipo==="aumento"&&alt.valorProporcional>0&&<div style={{fontFamily:fb,fontSize:12,color:B[600],marginTop:4}}>Cobrança extra neste mês: +{fmt(alt.valorProporcional)}</div>}
          {alt.tipo==="reducao"&&<div style={{fontFamily:fb,fontSize:12,color:W[500],marginTop:4}}>Vale a partir de 1º de {proximoMesPt()}.</div>}
        </div>;
      })}
      {D.hist.map((h,i)=><div key={i} style={{padding:"12px 0",borderBottom:i<D.hist.length-1?`1px solid ${W[100]}`:"none"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontFamily:fb,fontSize:12,color:W[500]}}>{h.sem}</span><Badge label={h.st} type={h.st==="Entregue"?"success":"info"}/></div><div style={{fontFamily:fb,fontSize:13,color:W[700],marginTop:4}}>{h.itens}</div>{h.extra&&<div style={{fontFamily:fb,fontSize:12,color:B[500],marginTop:4}}>+ {h.extra.nome} · {h.extra.valor}</div>}</div>)}
      <div style={{marginTop:12,padding:12,borderRadius:radii.md,background:W[50],border:`1px solid ${W[200]}`}}><div style={{fontFamily:fb,fontSize:12,color:W[500],marginBottom:4}}>Cobrança do mês</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontFamily:fb,fontSize:14,fontWeight:600,color:W[800]}}>{D.cob.mes} · {D.cob.valor}</span><Badge label="Pago"/></div></div>
      <div style={{marginTop:8,padding:12,borderRadius:radii.md,background:B[50],border:`1px solid ${B[100]}`}}><div style={{fontFamily:fb,fontSize:12,color:B[700],marginBottom:4}}>Próxima fatura (abril)</div><div style={{fontFamily:fb,fontSize:13,color:B[800],lineHeight:1.6}}>Assinatura: {fmt(assinVal)}<br/>+ Extras: {fmt(confirmedTotal||22)}<br/>+ Frete: R$ 15,00<br/><span style={{fontWeight:600}}>= {fmt(assinVal+15+(confirmedTotal||22))} (estimado)</span></div></div>
    </Card>
    <Card style={{marginBottom:12}}><SL t="Cartão"/><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontFamily:fb,fontSize:14,fontWeight:500,color:W[800]}}>{D.cartao.band} ••••{D.cartao.n}</div><div style={{fontFamily:fb,fontSize:12,color:W[500],marginTop:4}}>Próxima: {D.cartao.prox}</div></div><ActionBtn loadingText="Validando…" successText="Atualizado ✓" onAction={()=>simulate()} style={{padding:"8px 16px",fontSize:12}}>Atualizar</ActionBtn></div></Card>
    {/* Pausar ou Cancelar — separador visual e secao formal com link WhatsApp */}
    <div style={{borderTop:`1px solid ${W[200]}`,marginTop:24,paddingTop:24,marginBottom:12}}>
      <div style={{fontFamily:fd,fontSize:20,textTransform:"uppercase",color:B[500],letterSpacing:"0.02em",marginBottom:8}}>Pausar ou Cancelar</div>
      <div style={{fontFamily:fb,fontSize:14,color:W[600],lineHeight:1.6,marginBottom:16}}>Se precisar pausar por um tempo ou cancelar sua Assinatura, fale com a gente pelo WhatsApp. Sem taxa, a qualquer momento.</div>
      <a href="https://wa.me/5521999429843?text=Oi%2C%20gostaria%20de%20pausar%2Fcancelar%20minha%20Assinatura" target="_blank" rel="noopener noreferrer" className="press-scale" style={{display:"block",width:"100%",padding:"12px 16px",borderRadius:radii.md,border:`1.5px solid ${B[500]}`,background:"transparent",color:B[500],fontFamily:fb,fontSize:14,fontWeight:500,textAlign:"center",textDecoration:"none",transition:"all 150ms ease",minHeight:44,lineHeight:"20px"}} onMouseEnter={e=>e.currentTarget.style.background=B[50]} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Falar com a Cora no WhatsApp</a>
    </div>
    <button className="bl" style={{width:"100%",padding:"12px 0",borderRadius:radii.md,background:"none",color:W[500],border:`1px solid ${W[300]}`,fontFamily:fb,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,minHeight:44}}><I d={ic.logout} size={16} color={W[500]}/>Sair da conta</button>
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
  // Ciclos anteriores (fechados). Populado por simularViradaDeMes.
  const [historicoCiclosPassados,setHistoricoCiclosPassados]=useState([]);
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

  // Utilitario mock: simula virada de ciclo. Move historicoCicloAtual pra passados
  // e atualiza baseline = estado atual. Nao exposto na UI no MVP; util para testes.
  const simularViradaDeMes=()=>{
    if(historicoCicloAtual){
      setHistoricoCiclosPassados(prev=>[historicoCicloAtual,...prev]);
    }
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

  // ─── Compat shim residual ────────────────────────────────────────────────
  // Home e Cardapio foram migrados pra `currentExtras` direto (PR 2 Fase 2).
  // O Perfil ainda lê extras no shape antigo (1-por-unidade) pra somar
  // `confirmedTotal` no card "Próxima fatura". Sai quando o Perfil for refeito.
  const confirmedLegacy = currentExtras.flatMap(e =>
    Array.from({ length: e.qty }, () => ({
      nome: e.nome,
      preco: `R$ ${Number(e.preco_unit).toFixed(2).replace(".", ",")}`,
      precoNum: Number(e.preco_unit),
      kind: "extra",
    }))
  );
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

  // Salvar alteracao da Assinatura. meta traz o tipo ja classificado pelo componente
  // contra o BASELINE (nao contra o estado anterior).
  const handleSalvarAssinatura=(novosQtds,meta)=>{
    haptic();
    setAssinaturaQtds(novosQtds);
    setCestaSemana(null); // volta a seguir a Assinatura
    // Se voltou ao baseline, limpa historico do ciclo atual (vai e volta = nada aconteceu)
    if(JSON.stringify(novosQtds)===JSON.stringify(assinaturaBaseline)){
      setHistoricoCicloAtual(null);
      return;
    }
    // Senao, grava/atualiza entrada UNICA do ciclo com diferenca liquida vs baseline
    if(meta){
      setHistoricoCicloAtual({
        data:new Date().toISOString(),
        tipo:meta.tipo, // "aumento" | "reducao" | "troca"
        baseline:{...assinaturaBaseline},
        atual:{...novosQtds},
        valorProporcional:meta.valorProporcional||0,
        proximoCicloValor:meta.proximoCicloValor||0,
      });
    }
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
        {scr==="assinatura"&&<Assinatura onNav={handleNav} hasPending={false} cutoff={cutoff} assinaturaQtds={assinaturaQtds} assinaturaBaseline={assinaturaBaseline} onSalvar={handleSalvarAssinatura}/>}
        {scr==="cardapio"&&<Cardapio addExtraToCart={addExtraToCart} cutoff={cutoff} pendingPayment={pendingPayment}/>}
        {scr==="perfil"&&<Perfil confirmed={confirmedLegacy} hasPending={false} assinaturaQtds={assinaturaQtds} historicoCicloAtual={historicoCicloAtual} historicoCiclosPassados={historicoCiclosPassados}/>}
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