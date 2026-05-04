import { useState, useEffect, useRef, lazy, Suspense } from "react";
// Code splitting: Onboarding e PreCadastro sao pesados e so acessados em fluxos
// especificos. Lazy chunks separados reduzem o bundle inicial do Portal.
const CoraOnboarding = lazy(() => import("./Onboarding"));
const PreCadastro = lazy(() => import("./pages/PreCadastro"));
import ProductCard from "./components/ProductCard";
import { isPastCutoff } from "./utils/cutoff";
import { haptic } from "./utils/haptic";
import { plural } from "./utils/plural";
import { loadSubscription, saveSubscription, clearSubscription } from "./utils/subscription";
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
  pattern:"/images/Cora_tile grafismo.svg",
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
  extras:[{id:"focaccia",nome:"Focaccia Genovesa",peso:"430g",preco:"R$ 22,00",precoNum:22,img:IMG.focaccia,ingredientes:"Farinha, água, azeite extra-virgem, sal, levain, cebola roxa, alecrim fresco.",historia:"A receita veio de Gênova, onde a focaccia é assunto sério. Lá, cada padeiro tem sua versão. A da Cora leva fermentação longa de 24h e azeite generoso. A cebola roxa carameliza no forno e o alecrim perfuma a cozinha inteira."}],
  pães:[
    {id:"original",nome:"Pão Original",peso:"700g",preco:"R$ 27,00",precoNum:27,img:IMG.original,desc:"Pão de toda mesa. Vai com azeite, queijo, bruschetta de tomate ou o que você abrir na cozinha.",sobre:"Blend de farinha branca italiana e integral brasileira. Levain da Cora, água, sal. Hidratação 70%.",qtd:1},
    {id:"integral",nome:"Pão Integral",peso:"700g",preco:"R$ 29,00",precoNum:29,img:IMG.integral,desc:"Sabor de grão inteiro, miolo leve. Torrado pela manhã ou ao lado da salada no almoço.",sobre:"100% integral em blend de farinha brasileira e italiana. Levain da Cora, água, sal, azeite. Hidratação 75%.",qtd:0},
  ],
  rotativos:[
    {id:"multigraos",nome:"Multigrãos",peso:"615g",preco:"R$ 32,00",precoNum:32,img:IMG.multigraos,desc:"Aveia, centeio, gergelim e mel.",ingredientes:"Farinha de trigo, centeio, aveia, água, mel, sal, levain, gergelim.",detalhe:"Cinco grãos na massa, mel na fermentação. Miolo denso, casca com gergelim tostado."},
    {id:"focaccia",nome:"Focaccia Genovesa",peso:"430g",preco:"R$ 22,00",precoNum:22,img:IMG.focaccia,desc:"Azeite generoso, cebola roxa, alecrim.",ingredientes:"Farinha, água, azeite extra-virgem, sal, levain, cebola roxa, alecrim fresco.",detalhe:"Fermentação longa de 24h. Azeite generoso. A cebola roxa carameliza no forno e o alecrim perfuma a cozinha inteira."},
    {id:"ciabatta",nome:"Ciabatta",peso:"533g",preco:"R$ 25,00",precoNum:25,img:IMG.ciabatta,desc:"Crosta fina, miolo aberto e leve.",ingredientes:"Farinha de trigo, água, sal, levain, azeite.",detalhe:"Massa de alta hidratação. Crosta fina e crocante, miolo com alvéolos grandes e textura leve."},
    {id:"brioche",nome:"Brioche",peso:"256g",preco:"R$ 32,00",precoNum:32,img:IMG.brioche,desc:"Manteiga francesa, textura amanteigada.",ingredientes:"Farinha, manteiga, ovos, açúcar, sal, levain, leite.",detalhe:"Massa enriquecida com manteiga. Fermentação 18h. Miolo dourado, textura que desfia."},
  ],
  semana:{pedidosAbertos:false,cardapioProxima:["Pão Original","Pão Integral","Focaccia Genovesa"],entregaProxima:formatarDataEntrega(proximaQuinta(new Date(Date.now()+7*24*60*60*1000)))},
  hist:[
    {sem:"Semana 28/03",itens:"1 Pão Original (700g)",st:"Pendente",extra:null},
    {sem:"Semana 21/03",itens:"1 Pão Original (700g)",st:"Entregue",extra:null},
    {sem:"Semana 14/03",itens:"1 Pão Original (700g)",st:"Entregue",extra:{nome:"Focaccia Genovesa",valor:"R$ 22,00"}},
    {sem:"Semana 07/03",itens:"1 Pão Original (700g)",st:"Entregue",extra:null},
  ],
};
const greet=()=>{const h=new Date().getHours();return h<12?"bom dia":h<18?"boa tarde":"boa noite";};

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
const QtyBtn=({qty,onAdd,onRemove,name})=><div onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}><button aria-label={`Remover ${name}`} onClick={onRemove} className="qb press-scale" style={{width:32,height:32,borderRadius:radii.md,border:`1px solid ${W[300]}`,background:"none",cursor:"pointer",fontSize:18,color:W[600],display:"flex",alignItems:"center",justifyContent:"center"}}>−</button><span style={{fontFamily:fb,fontSize:16,fontWeight:600,color:B[500],width:24,textAlign:"center"}}>{qty}</span><button aria-label={`Adicionar ${name}`} onClick={onAdd} className="qb press-scale" style={{width:32,height:32,borderRadius:radii.md,border:`1px solid ${B[500]}`,background:B[50],cursor:"pointer",fontSize:18,color:B[500],display:"flex",alignItems:"center",justifyContent:"center"}}>+</button></div>;
const Toast=({msg,vis})=>vis?<div role="status" aria-live="polite" style={{position:"fixed",bottom:72,left:16,right:16,maxWidth:358,margin:"0 auto",background:W[800],color:"#FFF",borderRadius:radii.md,padding:"12px 16px",zIndex:60,fontFamily:fb,fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:8,animation:"fadeUp 300ms ease"}}><I d={ic.check} size={16} color="#6EE7B7"/>{msg}</div>:null;
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
const ActionBtn=({children,loadingText,successText,onAction,onComplete,primary,disabled:extDisabled,full,style:es,ariaLabel})=>{const[st,setSt]=useState('idle');const[err,setErr]=useState('');const handle=async()=>{if(st!=='idle')return;setSt('loading');setErr('');try{await onAction();setSt('success');setTimeout(()=>{setSt('idle');onComplete?.();},1500);}catch(e){setErr(e.message||'Erro ao processar. Tente novamente.');setSt('idle');}};const busy=st==='loading'||st==='success';const label=st==='loading'?loadingText:st==='success'?successText:children;const stStyle=st==='success'?{background:'#D1FAE5',color:'#065F46',border:'1px solid #6EE7B7',opacity:1}:{};return<><Btn primary={st!=='success'&&primary} disabled={busy||extDisabled} onClick={handle} full={full} ariaLabel={ariaLabel} style={{...es,...stStyle}}>{label}</Btn>{err&&<div style={{fontFamily:fb,fontSize:13,color:'#9A3412',background:'#FFEDD5',padding:'8px 12px',borderRadius:radii.md,marginTop:6}}>{err}</div>}</>;};

// ─── MODAL ───
const Modal=({product,onClose,onAction,onComplete,actionLabel,hint,qty,onAdd,onRemove,cutoff})=>{
  const dialogRef=useRef(null);
  useModalA11y(dialogRef,!!product,onClose);
  if(!product)return null;
  return<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(26,24,21,0.5)",zIndex:50,animation:"fadeIn 200ms ease"}}/>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Detalhes: ${product.nome}`} style={{position:"fixed",bottom:0,left:0,right:0,maxWidth:390,margin:"0 auto",background:"#FFF",borderRadius:`${radii.xl} ${radii.xl} 0 0`,zIndex:51,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 -4px 24px rgba(26,24,21,0.12)",animation:"slideUp 300ms ease"}}>
      <div style={{position:"relative"}}>
        <ProductImg src={product.img} h={220} alt={product.nome} rounded={false} style={{borderRadius:`${radii.xl} ${radii.xl} 0 0`}}/>
        <button aria-label="Fechar" onClick={onClose} style={{position:"absolute",top:12,right:12,width:36,height:36,borderRadius:radii.full,background:"rgba(255,255,255,0.9)",border:"none",cursor:"pointer",fontSize:18,color:W[600],display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>
      <div style={{padding:20}}>
        <div style={{fontFamily:fd,fontSize:24,textTransform:"uppercase",color:B[500],letterSpacing:"0.02em",lineHeight:1.2}}>{product.nome}</div>
        <div style={{fontFamily:fb,fontSize:14,color:W[500],marginTop:4}}>{product.peso}</div>
        <div style={{fontFamily:fb,fontSize:20,fontWeight:600,color:B[500],marginTop:8}}>{product.preco}</div>
        <div style={{height:1,background:W[200],margin:"16px 0"}}/>
        {product.ingredientes&&<div style={{marginBottom:16}}><div style={{fontFamily:fd,fontSize:13,textTransform:"uppercase",color:W[500],letterSpacing:"0.04em",marginBottom:6}}>Ingredientes</div><div style={{fontFamily:fb,fontSize:14,color:W[600],lineHeight:1.6}}>{product.ingredientes}</div></div>}
        {product.historia&&<div style={{marginBottom:16,fontFamily:fb,fontSize:14,color:W[700],lineHeight:1.7}}>{product.historia}</div>}
        {product.detalhe&&!product.historia&&<div style={{marginBottom:16}}><div style={{fontFamily:fd,fontSize:13,textTransform:"uppercase",color:W[500],letterSpacing:"0.04em",marginBottom:6}}>Sobre este pão</div><div style={{fontFamily:fb,fontSize:14,color:W[700],lineHeight:1.6}}>{product.detalhe}</div></div>}
        <div style={{marginTop:4}}>
          {cutoff?<><Btn primary full disabled ariaLabel={actionLabel}>{actionLabel}</Btn><CutoffMsg/></>:qty>0?<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0"}}><div style={{fontFamily:fb,fontSize:14,color:ST.success.t,fontWeight:500,display:"flex",alignItems:"center",gap:6}}><I d={ic.check} size={16} color={ST.success.t}/>Na sua cesta</div><QtyBtn qty={qty} onAdd={onAdd} onRemove={onRemove} name={product.nome}/></div>:<>{onAction&&<ActionBtn primary full loadingText="Adicionando…" successText="Adicionado ✓" onAction={onAction} onComplete={onComplete} ariaLabel={actionLabel}>{actionLabel}</ActionBtn>}{hint&&<div style={{fontFamily:fb,fontSize:12,color:W[500],textAlign:"center",marginTop:8}}>{hint}</div>}</>}
        </div>
      </div>
    </div>
  </>;
};

const Nav=({active,onNav,badge})=>{const items=[{id:"home",label:"INÍCIO",icon:ic.home},{id:"assinatura",label:"ASSINATURA",icon:ic.wheat},{id:"cardapio",label:"CARDÁPIO",icon:ic.utensils},{id:"perfil",label:"PERFIL",icon:ic.user}];return<div style={{display:"flex",justifyContent:"space-around",alignItems:"center",padding:"8px 0 12px",borderTop:`1px solid ${W[200]}`,background:"#FFF",position:"sticky",bottom:0,zIndex:10,minHeight:56}}>{items.map(it=><button key={it.id} aria-label={`Ir para ${it.label}`} onClick={()=>onNav(it.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,border:"none",background:"none",cursor:"pointer",minWidth:56,minHeight:44,padding:"4px 0",position:"relative"}}><I d={it.icon} size={22} color={active===it.id?B[500]:W[400]}/>{it.id==="cardapio"&&badge>0&&<span style={{position:"absolute",top:0,right:4,width:18,height:18,borderRadius:radii.full,background:B[500],color:"#FFF",fontFamily:fb,fontSize:10,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>{badge}</span>}<span style={{fontFamily:fd,fontSize:11,letterSpacing:"0.02em",textTransform:"uppercase",color:active===it.id?B[500]:W[400]}}>{it.label}</span></button>)}</div>;};

// ─── NOVIDADE CARD (edge-to-edge photo) ───
const NovidadeCard=({extra,qty,onCardClick,onAdd,onRemove,cutoff})=><Card style={{padding:0,overflow:"hidden",cursor:"pointer",marginBottom:16}} onClick={onCardClick} ariaLabel={`Novidade: ${extra.nome}`}>
  <ProductImg src={extra.img} h={200} alt={extra.nome} rounded={false}/>
  <div style={{padding:16}}>
    <SL t="Novidade da semana"/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
      <div style={{flex:1}}><div style={{fontFamily:fb,fontSize:18,fontWeight:600,color:W[800]}}>{extra.nome}</div><div style={{fontFamily:fb,fontSize:14,color:W[600],marginTop:4}}>{extra.preco}</div></div>
      {cutoff?<button disabled className="bp press-scale" style={{padding:"10px 24px",borderRadius:radii.md,border:"none",background:B[500],color:"#FFF",fontFamily:fb,fontSize:14,fontWeight:500,cursor:"default",minHeight:44,flexShrink:0,opacity:0.5}}>Quero</button>:qty===0?<button onClick={e=>{e.stopPropagation();onCardClick();}} className="bp press-scale" style={{padding:"10px 24px",borderRadius:radii.md,border:"none",background:B[500],color:"#FFF",fontFamily:fb,fontSize:14,fontWeight:500,cursor:"pointer",minHeight:44,flexShrink:0}}>Quero</button>:<QtyBtn qty={qty} onAdd={()=>onAdd&&onAdd()} onRemove={()=>onRemove&&onRemove()} name={extra.nome}/>}
    </div>
    {cutoff&&<CutoffMsg/>}
  </div>
</Card>;

// ─── SOFT LIMIT WARNING (4+ extras) ───
const ExtrasWarning=({count})=>{
  if(count<4)return null;
  return<div style={{fontFamily:fb,fontSize:12,color:ST.warning.t,background:ST.warning.bg,padding:"8px 12px",borderRadius:radii.md,marginTop:8,border:`1px solid ${ST.warning.b}`,lineHeight:1.5}}>
    <I d={ic.clock} size={14} color={ST.warning.t} sw={2}/> Você tem {count} {plural(count,"item","itens")} nesta semana. Pedidos acima de 3 itens podem ter prioridade reduzida se atingirmos o limite de produção. Se isso acontecer, avisamos pelo WhatsApp e você não é cobrado.
  </div>;
};

// ─── PERSISTENT ORDER FOOTER (lives in App, visible on all screens) ───
const OrderFooter=({pending,confirmed,onConfirm,onCancel,onNav,cutoff})=>{
  const total=totalOf(pending);
  const pCount=extrasCount(pending);
  if(pCount===0)return null;
  const totalExtrasCount=extrasCount(confirmed)+pCount;
  return<div style={{position:"fixed",bottom:56,left:0,right:0,maxWidth:390,margin:"0 auto",background:"#FFF",borderTop:`1px solid ${W[200]}`,padding:"12px 16px",zIndex:8,animation:"fadeUp 200ms ease"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div onClick={()=>onNav("cardapio")} style={{cursor:"pointer"}}>
        <div style={{fontFamily:fb,fontSize:12,color:W[600],display:"flex",alignItems:"center",gap:4}}>
          <I d={ic.bag} size={14} color={B[500]}/>{pCount} {plural(pCount,"item","itens")} · extras desta semana
        </div>
        <div style={{fontFamily:fb,fontSize:15,fontWeight:600,color:W[800]}}>{fmt(total)}</div>
      </div>
      <div style={{display:"flex",gap:8,flexShrink:0}}><Btn onClick={onCancel}>Cancelar</Btn><ActionBtn primary disabled={cutoff} loadingText="Adicionando…" successText="Adicionado ✓" onAction={()=>simulate()} onComplete={onConfirm}>Confirmar</ActionBtn></div>
    </div>
    {cutoff?<CutoffMsg/>:<div style={{fontFamily:fb,fontSize:11,color:W[500],marginTop:4}}>Além da sua Assinatura. Cobrado na próxima fatura.</div>}
    <ExtrasWarning count={totalExtrasCount}/>
  </div>;
};

const ConfirmedFooter=({vis})=>{
  if(!vis)return null;
  return<div style={{position:"fixed",bottom:56,left:0,right:0,maxWidth:390,margin:"0 auto",background:ST.success.bg,borderTop:`1px solid ${ST.success.b}`,padding:"16px",zIndex:8,textAlign:"center",animation:"fadeUp 300ms ease"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:4}}><I d={ic.check} size={18} color={ST.success.t}/><span style={{fontFamily:fb,fontSize:15,fontWeight:600,color:ST.success.t}}>Cesta confirmada!</span></div>
    <div style={{fontFamily:fb,fontSize:13,color:ST.success.t}}>Sua cesta será entregue na próxima quinta.</div>
  </div>;
};

// ─── HELPERS ───
const cntIn=(list,nome)=>list.filter(p=>p.nome===nome&&p.kind!=="swap").length;
const addTo=(list,product,kind="extra")=>{const pn=kind==="swap"?0:(typeof product.precoNum==="number"?product.precoNum:parseFloat(product.preco.replace("R$ ","").replace(",",".")));return[...list,{nome:product.nome,preco:product.preco,precoNum:pn,kind}];};
const removeFrom=(list,nome)=>{const i=list.findIndex(p=>p.nome===nome&&p.kind!=="swap");if(i===-1)return list;return[...list.slice(0,i),...list.slice(i+1)];};
const totalOf=list=>list.filter(p=>p.kind!=="swap").reduce((s,p)=>s+p.precoNum,0);
const extrasCount=list=>list.filter(p=>p.kind!=="swap").length;

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

// Dias ate a proxima entrega (quinta). Retorna objeto com n de dias e texto sobrio.
// Quinta = 4 (Date.getDay: 0=dom, 1=seg, ..., 4=qui, 5=sex, 6=sab)
const diasAteEntrega=(now=new Date())=>{
  const hoje=now.getDay();
  const dias=(4-hoje+7)%7;
  if(dias===0) return {dias:0,texto:"hoje"};
  if(dias===1) return {dias:1,texto:"amanhã"};
  return {dias,texto:`em ${dias} dias`};
};

// Data formatada estilo hero. Ex: "QUINTA, 23 ABR"
const MESES_CURTOS_PT=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const DIAS_SEMANA_PT=["dom","seg","ter","qua","qui","sex","sáb"];
const formatarDataHero=(dataStr)=>{
  // Aceita string "Quinta, 23 de abril" ou tenta parse.
  // Se nao conseguir parsear, retorna string original em uppercase.
  if(!dataStr) return "";
  return dataStr.toUpperCase();
};

// Timeline da semana. Renderiza 7 circulos Seg-Dom ligados por linha horizontal.
// Estados: passado (preenchido W[300]), hoje (anel B[500]), entrega (preenchido B[500]).
const WeekTimeline=({hoje=new Date().getDay(),diaEntrega=4})=>{
  // Ordem de segunda a domingo na visualizacao: [seg,ter,qua,qui,sex,sab,dom] = indices [1,2,3,4,5,6,0]
  const ordem=[1,2,3,4,5,6,0];
  const labels=["S","T","Q","Q","S","S","D"]; // iniciais curtas
  const width=280;const height=36;const padding=12;
  const step=(width-padding*2)/(ordem.length-1);
  return<svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{display:"block",maxWidth:width,margin:"8px auto 4px"}} aria-hidden="true">
    {/* Linha de base */}
    <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke={W[200]} strokeWidth="1.5"/>
    {ordem.map((d,i)=>{
      const x=padding+i*step;
      const ehHoje=d===hoje;
      const ehEntrega=d===diaEntrega;
      const ehPassado=!ehHoje && ((hoje<diaEntrega) ? (d<hoje||d===0&&hoje!==0) : (d<hoje&&d!==0));
      // Cores
      let fill="#FFF";let stroke=W[300];let rOuter=5;let rInner=0;
      if(ehEntrega){fill=B[500];stroke=B[500];}
      if(ehPassado&&!ehEntrega){fill=W[300];stroke=W[300];}
      if(ehHoje){fill="#FFF";stroke=B[500];rInner=3;}
      return<g key={i}>
        <circle cx={x} cy={height/2} r={rOuter} fill={fill} stroke={stroke} strokeWidth="1.5"/>
        {ehHoje&&<circle cx={x} cy={height/2} r={rInner} fill={B[500]}/>}
        <text x={x} y={height-2} textAnchor="middle" fontSize="10" fontFamily={fb} fill={ehHoje?B[500]:W[500]} fontWeight={ehHoje?"600":"400"}>{labels[i]}</text>
      </g>;
    })}
  </svg>;
};

const Home=({onNav,pending,confirmed,addPending,removePending,updateConfirmed,userData,isFirstVisit,onSeen,cutoff,assinaturaQtds,assinaturaBaseline,cestaSemana,cestaAtual,houveSwap,onSetCestaSemana,ehPrimeiroAcesso,historicoCicloAtual})=>{
  const[modal,setModal]=useState(null);
  const[swapModal,setSwapModal]=useState(false);
  const swapDialogRef=useRef(null);
  useModalA11y(swapDialogRef,swapModal,()=>setSwapModal(false));
  const[rascunhoSlots,setRascunhoSlots]=useState([]); // slots da cesta durante a edicao no modal
  const[toast,setToast]=useState(false);
  const[toastMsg,setToastMsg]=useState("");
  const allItems=[...confirmed,...pending];
  const cntAll=n=>cntIn(allItems,n);
  const handleAddComplete=p=>{addPending(p);setModal(null);};
  const handleQtyChange=(product,delta)=>{
    if(confirmed.length>0){
      if(delta>0) updateConfirmed(addTo(confirmed,product));
      else {
        const next=removeFrom(confirmed,product.nome);
        updateConfirmed(next);
        if(next.length===0){setToastMsg("Item removido da cesta.");setToast(true);setTimeout(()=>setToast(false),5000);}
      }
    } else {
      if(delta>0) addPending(product);
      else removePending(product.nome);
    }
  };
  const confirmedExtras=confirmed.filter(p=>p.kind!=="swap");
  const confirmedTotal=totalOf(confirmed);
  const nome=userData?.nome?userData.nome.split(" ")[0]:D.nome;
  const bemvindo=userData?.genero==="f"?"Bem-vinda":userData?.genero==="m"?"Bem-vindo":"Boas-vindas";
  // Sobrio: ponto final, sem "Oi". Primeiro acesso mantem exclamacao (momento de acolhida).
  const prefix=ehPrimeiroAcesso?`${bemvindo}, ${nome}.`:`${greet().charAt(0).toUpperCase()}${greet().slice(1)}, ${nome}.`;

  // Composicao da Cesta desta semana (multi-pao)
  const cestaSlots=qtdsToSlots(cestaAtual);
  // Slots do modal Personalizar refletem o BASELINE (o que esta sendo cobrado
  // este mes). Alteracoes da Assinatura (reducoes/aumentos) so valem no proximo
  // ciclo, entao nao afetam os slots personalizaveis desta semana.
  const assinaturaSlots=qtdsToSlots(assinaturaBaseline||assinaturaQtds);
  const temSwap=houveSwap;
  const temExtras=confirmedExtras.length>0;
  const cestaLabel=composicaoToStr(cestaAtual)||"Sem pães configurados";
  const assinaturaLabel=composicaoToStr(assinaturaQtds)||"Sem pães configurados";
  const primeiroPaoCesta=D.pães.find(p=>cestaAtual[p.id]>0)||D.pães[0];
  const cestaImg=primeiroPaoCesta?.img||IMG.original;

  const openSwapModal=()=>{
    // Inicializa rascunho com a composicao atual da cesta (ou da assinatura se nao houver customizacao)
    setRascunhoSlots(qtdsToSlots(cestaAtual));
    setSwapModal(true);
  };
  const setSlotProduto=(idx,novoId)=>{
    setRascunhoSlots(prev=>{const n=[...prev];n[idx]=novoId;return n;});
  };
  const handleSwapConfirm=()=>{
    haptic();
    const novoQtds=slotsToQtds(rascunhoSlots);
    // Preenche ids ausentes com 0 para comparacao estavel com assinaturaQtds
    D.pães.forEach(p=>{if(novoQtds[p.id]===undefined)novoQtds[p.id]=0;});
    // Se voltou pro estado da Assinatura, limpa cestaSemana (null)
    // Compara com baseline (o que de fato esta sendo entregue este mes)
    const igual=JSON.stringify(novoQtds)===JSON.stringify(assinaturaBaseline||assinaturaQtds);
    onSetCestaSemana(igual?null:novoQtds);
    setSwapModal(false);
    setToastMsg("Cesta atualizada. Sua Assinatura segue como antes na próxima semana.");
    setToast(true);setTimeout(()=>setToast(false),5000);
  };

  useEffect(()=>{if(!isFirstVisit||!onSeen)return;const t=setTimeout(onSeen,5000);return()=>clearTimeout(t);},[isFirstVisit,onSeen]);

  return<div style={{padding:"24px 16px 16px",paddingBottom:pending.length>0?80:16}}>
    <h1 style={{fontFamily:fd,fontSize:30,textTransform:"uppercase",color:B[500],letterSpacing:"0.02em",margin:"0 0 20px",lineHeight:1.1}}>{prefix}</h1>

    <CutoffBanner cutoff={cutoff}/>

    {/* Card unificado — CESTA DA SEMANA (4 estados: padrão, swap, extra, swap+extra) */}
    <Card style={{marginBottom:16,padding:0,overflow:"hidden",background:"#FFF",border:`1px solid ${temSwap?B[200]:W[200]}`}} ariaLabel={`Cesta da semana: ${D.entrega.dia}`}>
      {/* Cabeçalho com data hero e countdown */}
      <div style={{padding:"20px 20px 12px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:12}}>
          <SL t="Cesta da semana"/>
          {temSwap
            ?<span style={{fontFamily:fb,fontSize:11,fontWeight:500,padding:"3px 8px",borderRadius:radii.xs,background:W[200],color:W[800],whiteSpace:"nowrap"}}>editada só nesta semana</span>
            :temExtras
              ?<Badge label="confirmada" type="info"/>
              :null}
        </div>
        <h2 style={{fontFamily:fd,fontSize:32,textTransform:"uppercase",color:B[500],letterSpacing:"0.02em",lineHeight:1,margin:0}}>{D.entrega.dia}</h2>
        <div style={{fontFamily:fb,fontSize:14,color:W[500],marginTop:4}}>{diasAteEntrega().texto}</div>
        <WeekTimeline/>
      </div>
      {/* Foto do pão principal + composição */}
      <div style={{display:"flex",alignItems:"stretch",borderTop:`1px solid ${W[200]}`}}>
        <img src={cestaImg} alt={primeiroPaoCesta?.nome||"Pão"} style={{width:96,height:96,objectFit:"cover",display:"block",flexShrink:0}}/>
        <div style={{flex:1,padding:"16px 20px",display:"flex",flexDirection:"column",justifyContent:"center",gap:4}}>
          <div style={{fontFamily:fb,fontSize:14,fontWeight:600,color:W[800],lineHeight:1.4}}>
            {cestaLabel}{temExtras&&!temSwap&&<span style={{fontWeight:400,color:W[500]}}> · Assinatura</span>}
          </div>
          {temSwap&&<div style={{fontFamily:fb,fontSize:12,color:W[600],lineHeight:1.4}}>
            Válida só nesta semana. Próxima semana volta ao normal.
          </div>}
          {!temSwap&&!temExtras&&<div style={{fontFamily:fb,fontSize:12,color:W[500]}}>Tudo certo. Essa é sua cesta da Assinatura.</div>}
          {historicoCicloAtual?.tipo==="reducao"&&(()=>{const totalFuturo=Object.values(historicoCicloAtual.atual).reduce((s,q)=>s+q,0);return<div style={{fontFamily:fb,fontSize:12,color:B[600],marginTop:4,lineHeight:1.5}}>A partir de 1º de {proximoMesPt()}, sua Assinatura muda para {totalFuturo} {plural(totalFuturo,"pão","pães")} por semana.</div>;})()}
        </div>
      </div>
      {/* Ação primária do card: Personalizar esta semana */}
      {!cutoff&&<div style={{padding:"12px 20px 16px",borderTop:`1px solid ${W[200]}`}}>
        <button onClick={openSwapModal} className="press-scale" style={{width:"100%",padding:"12px 16px",borderRadius:radii.md,border:`1.5px solid ${B[500]}`,background:"transparent",color:B[500],fontFamily:fb,fontSize:14,fontWeight:500,cursor:"pointer",transition:"all 150ms ease"}} onMouseEnter={e=>e.currentTarget.style.background=B[50]} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Personalizar esta semana</button>
      </div>}
      {/* Extras confirmados + detalhamento swap — seção interna do mesmo card */}
      {(temExtras||temSwap&&confirmedExtras.length>0)&&<div style={{borderTop:`1px solid ${W[200]}`,padding:"12px 16px"}}>
        {temSwap&&<div style={{fontFamily:fb,fontSize:13,color:W[700],padding:"4px 0",marginBottom:confirmedExtras.length>0?4:0}}>{cestaLabel} · editada</div>}
        {!temSwap&&temExtras&&<div style={{fontFamily:fb,fontSize:13,color:W[700],padding:"4px 0",marginBottom:4}}>{cestaLabel} · Assinatura</div>}
        {Object.entries(confirmedExtras.reduce((a,p)=>{a[p.nome]=a[p.nome]||p;return a;},{})).map(([nome,item])=>{const qty=cntIn(confirmedExtras,nome);return<div key={nome} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0"}}><div style={{fontFamily:fb,fontSize:13,color:W[800],flex:1}}>+ {qty>1?`${qty}× `:""}{nome} · {fmt(item.precoNum*qty)}</div><QtyBtn qty={qty} onAdd={()=>updateConfirmed(addTo(confirmed,{nome:item.nome,preco:item.preco,precoNum:item.precoNum},"extra"))} onRemove={()=>updateConfirmed(removeFrom(confirmed,nome))} name={nome}/></div>;})}
        <div style={{height:1,background:W[200],margin:"8px 0"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontFamily:fb,fontSize:14,fontWeight:600,color:B[700]}}>Total de extras: {fmt(confirmedTotal)} na próxima fatura.</div></div><button onClick={()=>onNav("cardapio")} className="lk" style={{fontFamily:fb,fontSize:13,color:B[500],fontWeight:500,cursor:"pointer",background:"none",border:"none",display:"flex",alignItems:"center",gap:4}}><I d={ic.edit} size={14} color={B[500]}/>Editar</button></div>
        {temSwap&&<div style={{fontFamily:fb,fontSize:11,color:W[500],marginTop:6}}>Próxima semana volta ao normal.</div>}
      </div>}
    </Card>

    {/* Novidade hero — edge-to-edge photo */}
    {D.extras.length>0?<NovidadeCard extra={D.extras[0]} qty={cntAll(D.extras[0].nome)} onCardClick={()=>setModal(D.extras[0])} onAdd={()=>handleQtyChange(D.extras[0],1)} onRemove={()=>handleQtyChange(D.extras[0],-1)} cutoff={cutoff}/>:<EmptyState title="Novidades da semana" body="Nenhuma novidade esta semana. Seu pão de sempre está garantido."/>}

    <div onClick={()=>onNav("cardapio")} className="lk" style={{fontFamily:fb,fontSize:14,color:B[500],fontWeight:500,textAlign:"center",padding:"8px 0",cursor:"pointer"}}>Ver cardápio completo ›</div>

    {/* Swap modal */}
    {swapModal&&<>
      <div onClick={()=>setSwapModal(false)} style={{position:"fixed",inset:0,background:"rgba(26,24,21,0.5)",zIndex:50,animation:"fadeIn 200ms ease"}}/>
      <div ref={swapDialogRef} role="dialog" aria-modal="true" aria-label="Personalizar cesta da semana" style={{position:"fixed",bottom:0,left:0,right:0,maxWidth:390,margin:"0 auto",background:"#FFF",borderRadius:`${radii.xl} ${radii.xl} 0 0`,zIndex:51,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 -4px 24px rgba(26,24,21,0.12)",animation:"slideUp 300ms ease",padding:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontFamily:fd,fontSize:20,textTransform:"uppercase",color:B[500]}}>Personalizar cesta da semana</div>
          <button aria-label="Fechar" onClick={()=>setSwapModal(false)} style={{width:36,height:36,borderRadius:radii.full,background:W[100],border:"none",cursor:"pointer",fontSize:18,color:W[600],display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{fontFamily:fb,fontSize:14,color:W[600],marginBottom:20,lineHeight:1.5}}>
          Você pode trocar os pães da sua Assinatura por outros produtos elegíveis. A troca vale só pra esta semana. Sua Assinatura volta ao normal na próxima.
        </div>
        {/* Slots dinamicos: um bloco por pao da Assinatura */}
        {assinaturaSlots.map((produtoPadraoId,idx)=>{
          const produtoAtualId=rascunhoSlots[idx]||produtoPadraoId;
          return<div key={idx} style={{marginBottom:16}}>
            {assinaturaSlots.length>1&&<div style={{fontFamily:fd,fontSize:13,textTransform:"uppercase",color:W[500],letterSpacing:"0.04em",marginBottom:8}}>Pão {idx+1}</div>}
            {D.pães.map(p=>{const sel=produtoAtualId===p.id;return<button key={p.id} onClick={()=>setSlotProduto(idx,p.id)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"12px",marginBottom:8,borderRadius:radii.md,border:`2px solid ${sel?B[500]:W[200]}`,background:sel?B[50]:"#FFF",cursor:"pointer",textAlign:"left"}}>
              <div style={{width:20,height:20,borderRadius:radii.full,border:`2px solid ${sel?B[500]:W[300]}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{sel&&<div style={{width:10,height:10,borderRadius:radii.full,background:B[500]}}/>}</div>
              <ProductThumb src={p.img} w={48} h={40} alt={p.nome}/>
              <div><div style={{fontFamily:fb,fontSize:14,fontWeight:600,color:sel?B[700]:W[700]}}>{p.nome}</div><div style={{fontFamily:fb,fontSize:12,color:W[500]}}>{p.peso}</div></div>
            </button>;})}
          </div>;
        })}
        <div style={{marginTop:8,marginBottom:16}}/>

        <div style={{display:"flex",gap:8}}>
          <Btn onClick={()=>setSwapModal(false)} style={{flex:1}}>Cancelar</Btn>
          <ActionBtn primary loadingText="Salvando…" successText="Salvo ✓" onAction={()=>simulate()} onComplete={handleSwapConfirm} style={{flex:2}}>Confirmar troca</ActionBtn>
        </div>
      </div>
    </>}

    {modal&&<Modal product={modal} onClose={()=>setModal(null)} onAction={()=>simulate()} onComplete={()=>handleAddComplete(modal)} actionLabel="Adicionar à cesta" hint="Cobrado na próxima fatura" qty={cntAll(modal.nome)} onAdd={()=>handleQtyChange(modal,1)} onRemove={()=>handleQtyChange(modal,-1)} cutoff={cutoff}/>}
    <Toast msg={toastMsg} vis={toast}/>
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
const Cardapio=({pending,confirmed,setPending,setConfirmed,hasPending,cutoff})=>{
  const[modal,setModal]=useState(null);
  const[toastC,setToastC]=useState(false);
  const allItems=[...confirmed,...pending];const cntAll=n=>cntIn(allItems,n);
  const addItem=p=>{setPending(prev=>addTo(prev,p,"extra"));};
  const removeItem=n=>{
    const pi=pending.findIndex(p=>p.nome===n&&p.kind!=="swap");
    if(pi!==-1){setPending(prev=>removeFrom(prev,n));return;}
    const ci=confirmed.findIndex(p=>p.nome===n&&p.kind!=="swap");
    if(ci!==-1){
      const next=removeFrom(confirmed,n);
      setConfirmed(next);
      if(extrasCount(next)===0){setToastC(true);setTimeout(()=>setToastC(false),5000);}
    }
  };
  const confirmedExtras=confirmed.filter(p=>p.kind!=="swap");
  const totalExtrasAll=extrasCount(confirmed)+extrasCount(pending);

  return<div style={{padding:"24px 16px 16px",paddingBottom:hasPending?80:16}}>
    <h2 style={{fontFamily:fd,fontSize:26,textTransform:"uppercase",color:B[500],margin:"0 0 4px"}}>Cardápio</h2>
    <div style={{fontFamily:fb,fontSize:13,color:W[500],marginBottom:12}}>Peça itens extras para esta semana</div>
    <DeadlineWarning/>

    {confirmedExtras.length>0&&<div style={{background:ST.success.bg,borderRadius:radii.md,padding:"10px 12px",marginBottom:16,border:`1px solid ${ST.success.b}`,display:"flex",alignItems:"center",gap:8}}><I d={ic.check} size={16} color={ST.success.t}/><span style={{fontFamily:fb,fontSize:13,color:ST.success.t,fontWeight:500}}>{Object.entries(confirmedExtras.reduce((a,p)=>{a[p.nome]=(a[p.nome]||0)+1;return a;},{})).map(([n,q])=>`${q}× ${n}`).join(", ")} · confirmado</span></div>}

    {D.extras.length>0?D.extras.map((ex,i)=><NovidadeCard key={i} extra={ex} qty={cntAll(ex.nome)} onCardClick={()=>setModal(ex)} onAdd={()=>addItem(ex)} onRemove={()=>removeItem(ex.nome)} cutoff={cutoff}/>):<EmptyState title="Novidade da semana" body="Nenhuma novidade esta semana."/>}

    <div style={{height:1,background:W[200],margin:"4px 0 20px"}}/>
    <div style={{fontFamily:fd,fontSize:16,textTransform:"uppercase",color:B[500],letterSpacing:"0.02em",marginBottom:12}}>Nossos pães</div>

    {D.pães.map((p,i)=>{const q=cntAll(p.nome);return<ProductCard key={i}
  product={{...p, preco:`${p.preco}/un`}}
  qty={q}
  onAdd={()=>addItem(p)}
  onRemove={()=>removeItem(p.nome)}
  ctaLabel="Pedir"
  cutoff={cutoff}
  loadingText="Adicionando…"
  successText="Adicionado ✓"
/>;})}

    <ExtrasWarning count={totalExtrasAll}/>

    {modal&&<Modal product={modal} onClose={()=>setModal(null)} onAction={()=>simulate()} onComplete={()=>{addItem(modal);setModal(null);}} actionLabel="Adicionar à cesta" hint="Cobrado na próxima fatura" qty={cntAll(modal.nome)} onAdd={()=>addItem(modal)} onRemove={()=>removeItem(modal.nome)} cutoff={cutoff}/>}
    <Toast msg="Item removido da cesta." vis={toastC}/>
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

const Perfil=({confirmed,hasPending,assinaturaQtds,cestaAtual,houveSwap,historicoCicloAtual,historicoCiclosPassados=[]})=>{
  const[cpf,setCpf]=useState(false);const dados=[["Endereço","Ed. Boa Vista, Bl. A / 502"],["Dia de entrega","Quintas-feiras"],["WhatsApp","(21) 99876-5432"],["E-mail","beatriz@email.com"],["CPF",cpf?"123.456.789-00":"•••.•••.789-00"]];const confirmedExtras=confirmed.filter(p=>p.kind!=="swap");const confirmedTotal=totalOf(confirmed);const qtdTotal=Object.values(assinaturaQtds||{}).reduce((s,q)=>s+q,0);const assinVal=D.assinatura.valorMensal*qtdTotal;const cestaLabelPerfil=composicaoToStr(cestaAtual||assinaturaQtds||{})||"Sem pães configurados";
  return<div style={{padding:"24px 16px 16px",paddingBottom:hasPending?80:16}}>
    <h2 style={{fontFamily:fd,fontSize:26,textTransform:"uppercase",color:B[500],margin:"0 0 20px"}}>Perfil</h2>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><div style={{width:48,height:48,borderRadius:radii.full,background:B[50],display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${B[200]}`,flexShrink:0}}><img src="/images/grafismo_coracao.svg" alt="" aria-hidden="true" style={{width:28,height:28}}/></div><div><div style={{fontFamily:fb,fontSize:16,fontWeight:600,color:W[800]}}>Beatriz Silva</div><div style={{fontFamily:fb,fontSize:12,color:W[500]}}>beatriz@email.com</div></div></div>
    <Card style={{marginBottom:12}}><SL t="Dados pessoais"/>{dados.map(([l,v],i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:i<dados.length-1?`1px solid ${W[100]}`:"none"}}><div><div style={{fontFamily:fb,fontSize:11,color:W[500],marginBottom:2}}>{l}</div><div style={{fontFamily:fb,fontSize:13,color:W[700]}}>{v}</div></div>{l==="CPF"?<button aria-label={cpf?"Ocultar CPF":"Mostrar CPF"} onClick={()=>setCpf(!cpf)} style={{background:"none",border:"none",cursor:"pointer",padding:4,minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center"}}><I d={cpf?ic.eyeOff:ic.eye} size={16} color={W[400]}/></button>:<I d={ic.chev} size={14} color={W[400]}/>}</div>)}</Card>
    <Card style={{marginBottom:12}}><SL t="Histórico de entregas e cobranças"/>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><I d={ic.check} size={14} color={ST.success.t}/><span style={{fontFamily:fb,fontSize:13,fontWeight:500,color:ST.success.t}}>Tudo em dia</span></div>
      {(()=>{const reducaoPendente=historicoCicloAtual?.tipo==="reducao";const totalFuturo=reducaoPendente?Object.values(historicoCicloAtual.atual).reduce((s,q)=>s+q,0):0;return(confirmedExtras.length>0||houveSwap||reducaoPendente)&&<div style={{padding:12,borderRadius:radii.md,background:B[50],border:`1px solid ${B[200]}`,marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontFamily:fb,fontSize:12,color:B[700],fontWeight:500}}>Esta semana</span><Badge label="Confirmado" type="success"/></div>
        <div style={{fontFamily:fb,fontSize:13,color:B[800]}}>{cestaLabelPerfil} · {houveSwap?"editada só nesta semana":"Assinatura"}</div>
        {Object.entries(confirmedExtras.reduce((a,p)=>{a[p.nome]=(a[p.nome]||0)+1;return a;},{})).map(([n,q])=><div key={n} style={{fontFamily:fb,fontSize:12,color:B[500],marginTop:4}}>+ {q}× {n} · {fmt(confirmedExtras.find(p=>p.nome===n).precoNum*q)}</div>)}
        {confirmedTotal>0&&<div style={{fontFamily:fb,fontSize:12,color:B[700],marginTop:4,fontWeight:500}}>Total extras: {fmt(confirmedTotal)}</div>}
        {reducaoPendente&&<div style={{fontFamily:fb,fontSize:12,color:B[600],marginTop:8,paddingTop:8,borderTop:`1px solid ${B[100]}`,lineHeight:1.5}}>A partir de 1º de {proximoMesPt()}, sua Assinatura muda para {totalFuturo} {plural(totalFuturo,"pão","pães")} por semana.</div>}
      </div>;})()}
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
  const[pending,setPending]=useState([]);
  const[confirmed,setConfirmed]=useState([]);
  const[justConfirmed,setJustConfirmed]=useState(false);
  const[userData,setUserData]=useState(initialSubscription?.data||null);
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
  // Init prioriza initialSubscription.assinatura (persistida). Sem ela, usa
  // o default mock de D.pães[].qtd.
  const [assinaturaQtds,setAssinaturaQtds]=useState(()=>buildQtdsFrom(initialSubscription?.assinatura));
  // cestaSemana: null = segue a Assinatura. Objeto {id:qty} = cliente customizou esta semana.
  const [cestaSemana,setCestaSemana]=useState(null);
  // Baseline do ciclo: composicao ja cobrada no inicio do mes corrente.
  // So muda na virada de ciclo (1o do proximo mes, via simularViradaDeMes).
  const [assinaturaBaseline,setAssinaturaBaseline]=useState(()=>buildQtdsFrom(initialSubscription?.assinatura));
  // Historico do ciclo atual: null quando assinaturaQtds === assinaturaBaseline.
  // Objeto unico (nao array) representando a diferenca liquida vs baseline.
  const [historicoCicloAtual,setHistoricoCicloAtual]=useState(null);
  // Ciclos anteriores (fechados). Populado por simularViradaDeMes.
  const [historicoCiclosPassados,setHistoricoCiclosPassados]=useState([]);
  // Primeiro acesso (boas-vindas). Vira false apos navegar pra outra aba.
  const [ehPrimeiroAcesso,setEhPrimeiroAcesso]=useState(true);

  // Sincronizacao com onboarding (substitui a mutacao direta de D)
  useEffect(()=>{
    if(!onboardingConfig?.assinatura) return;
    const next={};D.pães.forEach(p=>{next[p.id]=onboardingConfig.assinatura[p.id]||0;});
    setAssinaturaQtds(next);
    setAssinaturaBaseline(next); // onboarding = novo ciclo, baseline inicia igual
    setHistoricoCicloAtual(null);
    setCestaSemana(null);
    setPending([]);
    setConfirmed([]);
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

  // Derivados
  // Alteracao pendente de Assinatura (reducao valem so no proximo ciclo).
  // Aumento e troca valem imediatamente (cobra proporcional ou sem custo).
  const reducaoPendente=historicoCicloAtual?.tipo==="reducao";
  // Cesta que chega NESTA semana:
  //   - com swap: cestaSemana
  //   - com reducao pendente: baseline (cliente continua recebendo o que ja pagou)
  //   - caso contrario: assinaturaQtds (aumento/troca ja valem)
  const cestaAtual=cestaSemana??(reducaoPendente?assinaturaBaseline:assinaturaQtds);
  // Swap comparado contra o que seria a cesta sem swap (baseline se reducao, senao assinatura)
  const cestaSemSwap=reducaoPendente?assinaturaBaseline:assinaturaQtds;
  const houveSwap=cestaSemana!==null&&JSON.stringify(cestaSemana)!==JSON.stringify(cestaSemSwap);

  const addPending=p=>setPending(prev=>addTo(prev,p,"extra"));
  const removePending=n=>setPending(prev=>removeFrom(prev,n));
  const handleConfirm=()=>{haptic();setConfirmed(prev=>[...prev,...pending]);setPending([]);setJustConfirmed(true);setTimeout(()=>setJustConfirmed(false),4000);};
  const handleCancel=()=>setPending([]);
  const hasPending=extrasCount(pending)>0;
  const cutoff=isPastCutoff();
  const isOnboarding=scr==="onboarding";

  const handleOnboardingComplete=(payload)=>{
    // Retrocompat: payload pode ser só "data" (versao antiga) ou {data, assinatura}
    const data=payload?.data||payload;
    const assinatura=payload?.assinatura;
    // Persiste subscription no localStorage (MVP). Fase 7 substitui por POST + DB.
    const novaSubscription={
      status:"pending_payment",
      data,
      assinatura:assinatura||{},
      createdAt:new Date().toISOString(),
    };
    saveSubscription(novaSubscription);
    setSubscription(novaSubscription);
    setUserData(data);
    if(assinatura&&Object.keys(assinatura).length>0){
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
  // Sem subscription persistida e sem ?dev=1: PreCadastro. Subscription
  // existente destrava o portal direto (funciona como sessao do MVP).
  if (!subscription && !params.get("dev")) return <Suspense fallback={lazyFallback}><PreCadastro /></Suspense>;
  if(isOnboarding) return <Suspense fallback={lazyFallback}><CoraOnboarding onComplete={handleOnboardingComplete}/></Suspense>;

  return<div style={{fontFamily:fb,maxWidth:390,margin:"0 auto",background:W[50],minHeight:"100vh",display:"flex",flexDirection:"column",position:"relative"}}>
    <a href="#main-content" className="skip-link">Pular para o conteúdo</a>
    <div style={{padding:"10px 16px",background:"#FFF",borderBottom:`1px solid ${W[200]}`,position:"sticky",top:0,zIndex:10}}>
      <img src={IMG.logo} alt="Cora" style={{height:28}}/>
    </div>
    <main ref={mainRef} id="main-content" style={{flex:1,overflowY:"auto"}}>
      <div key={scr} className="tab-content">
        {scr==="home"&&<Home onNav={handleNav} pending={pending} confirmed={confirmed} addPending={addPending} removePending={removePending} updateConfirmed={setConfirmed} userData={userData} isFirstVisit={isFirstVisit} onSeen={()=>setIsFirstVisit(false)} cutoff={cutoff} assinaturaQtds={assinaturaQtds} assinaturaBaseline={assinaturaBaseline} cestaSemana={cestaSemana} cestaAtual={cestaAtual} houveSwap={houveSwap} onSetCestaSemana={setCestaSemana} ehPrimeiroAcesso={ehPrimeiroAcesso} historicoCicloAtual={historicoCicloAtual}/>}
        {scr==="assinatura"&&<Assinatura onNav={handleNav} hasPending={hasPending} cutoff={cutoff} assinaturaQtds={assinaturaQtds} assinaturaBaseline={assinaturaBaseline} onSalvar={handleSalvarAssinatura}/>}
        {scr==="cardapio"&&<Cardapio pending={pending} confirmed={confirmed} setPending={setPending} setConfirmed={setConfirmed} hasPending={hasPending} cutoff={cutoff}/>}
        {scr==="perfil"&&<Perfil confirmed={confirmed} hasPending={hasPending} assinaturaQtds={assinaturaQtds} cestaAtual={cestaAtual} houveSwap={houveSwap} historicoCicloAtual={historicoCicloAtual} historicoCiclosPassados={historicoCiclosPassados}/>}
      </div>
    </main>
    {/* RODAPÉ PERSISTENTE — visível em TODAS as telas */}
    <OrderFooter pending={pending} confirmed={confirmed} onConfirm={handleConfirm} onCancel={handleCancel} onNav={handleNav} cutoff={cutoff}/>
    <ConfirmedFooter vis={justConfirmed}/>
    <Nav active={scr} onNav={handleNav} badge={pending.length}/>
    <style>{`
      *{box-sizing:border-box;margin:0;-webkit-tap-highlight-color:transparent}
      body{margin:0;-webkit-text-size-adjust:100%;overscroll-behavior:none}
      img{max-width:100%}
      input,button{font-size:16px}
      @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
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