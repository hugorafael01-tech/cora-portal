import { useState, useEffect } from "react";
import CoraOnboarding from "./Onboarding";
import PreCadastro from "./pages/PreCadastro";
import ProductCard from "./components/ProductCard";
import { isPastCutoff } from "./utils/cutoff";
import { B, W, fd, fb, fmt } from "./tokens";

/* CORA — Portal do Assinante — v3.2.7
   + Onboarding com splash, gênero, fotos reais, pattern
   + Saudação "Boas-vindas" no primeiro acesso
   + Nav oculta durante onboarding */

const ST={success:{bg:"#D1FAE5",t:"#065F46",b:"#6EE7B7"},warning:{bg:"#FEF3C7",t:"#92400E",b:"#FCD34D"},info:{bg:"#DBEAFE",t:"#1E40AF",b:"#93C5FD"}};

const IMG={
  logo:"/images/cora_logo_com_tag.svg",
  original:"/images/_original.jpg",
  integral:"/images/_integral.jpg",
  multigraos:"/images/_multigraos.jpg",
  brioche:"/images/_brioche.jpg",
  focaccia:"/images/_focaccia.jpg",
  ciabatta:"/images/_ciabatta.jpg",
  pattern:"/images/Cora_tile grafismo.svg",
};

const D={
  nome:"Beatriz",
  entrega:{dia:"Quinta, 23 de abril",produto:"1 Pão Original (615g)"},
  assinatura:{itens:"1 Pão Original (615g) / semana",valorMensal:99,qtdPaes:1},
  ent:{dia:"Quintas",cond:"Ed. Boa Vista",bloco:"Bl. A / 502",frete:"R$ 15/mês"},
  cartao:{band:"Visa",n:"6411",prox:"1º de abril"},
  cob:{mes:"Março",valor:"R$ 99,00",status:"Pago"},
  semanasRestantes:2,
  extras:[{id:"focaccia",nome:"Focaccia Genovesa",peso:"430g",preco:"R$ 22,00",precoNum:22,img:IMG.focaccia,ingredientes:"Farinha, água, azeite extra-virgem, sal, levain, cebola roxa, alecrim fresco.",historia:"A receita veio de Gênova, onde a focaccia é assunto sério. Lá, cada padeiro tem sua versão. A da Cora leva fermentação longa de 24h e azeite generoso. A cebola roxa carameliza no forno e o alecrim perfuma a cozinha inteira."}],
  pães:[
    {id:"original",nome:"Pão Original",peso:"615g",preco:"R$ 27,00",precoNum:27,img:IMG.original,desc:"Fermentação natural, casca crocante, miolo macio.",ingredientes:"Farinha de trigo, água, sal, levain da Cora.",detalhe:"Fermentação longa de 36h. Apenas 4 ingredientes. Crosta firme, miolo aberto com alvéolos irregulares.",qtd:1},
    {id:"integral",nome:"Pão Integral",peso:"615g",preco:"R$ 29,00",precoNum:29,img:IMG.integral,desc:"100% integral, sementes de linhaça e girassol.",ingredientes:"Farinha integral, água, sal, levain, linhaça, girassol.",detalhe:"100% farinha integral. Mesma fermentação longa, com sementes tostadas que dão crocância.",qtd:0},
  ],
  rotativos:[
    {id:"multigraos",nome:"Multigrãos",peso:"615g",preco:"R$ 32,00",precoNum:32,img:IMG.multigraos,desc:"Aveia, centeio, gergelim e mel.",ingredientes:"Farinha de trigo, centeio, aveia, água, mel, sal, levain, gergelim.",detalhe:"Cinco grãos na massa, mel na fermentação. Miolo denso, casca com gergelim tostado."},
    {id:"focaccia",nome:"Focaccia Genovesa",peso:"430g",preco:"R$ 22,00",precoNum:22,img:IMG.focaccia,desc:"Azeite generoso, cebola roxa, alecrim.",ingredientes:"Farinha, água, azeite extra-virgem, sal, levain, cebola roxa, alecrim fresco.",detalhe:"Fermentação longa de 24h. Azeite generoso. A cebola roxa carameliza no forno e o alecrim perfuma a cozinha inteira."},
    {id:"ciabatta",nome:"Ciabatta",peso:"533g",preco:"R$ 25,00",precoNum:25,img:IMG.ciabatta,desc:"Crosta fina, miolo aberto e leve.",ingredientes:"Farinha de trigo, água, sal, levain, azeite.",detalhe:"Massa de alta hidratação. Crosta fina e crocante, miolo com alvéolos grandes e textura leve."},
    {id:"brioche",nome:"Brioche",peso:"256g",preco:"R$ 32,00",precoNum:32,img:IMG.brioche,desc:"Manteiga francesa, textura amanteigada.",ingredientes:"Farinha, manteiga, ovos, açúcar, sal, levain, leite.",detalhe:"Massa enriquecida com manteiga. Fermentação 18h. Miolo dourado, textura que desfia."},
  ],
  semana:{pedidosAbertos:false,cardapioProxima:["Pão Original","Pão Integral","Focaccia Genovesa"],entregaProxima:"Quinta, 30 de abril"},
  hist:[
    {sem:"Semana 28/03",itens:"1 Pão Original (615g)",st:"Pendente",extra:null},
    {sem:"Semana 21/03",itens:"1 Pão Original (615g)",st:"Entregue",extra:null},
    {sem:"Semana 14/03",itens:"1 Pão Original (615g)",st:"Entregue",extra:{nome:"Focaccia Genovesa",valor:"R$ 22,00"}},
    {sem:"Semana 07/03",itens:"1 Pão Original (615g)",st:"Entregue",extra:null},
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
const ProductImg=({src,h=120,alt="",rounded=true,style:es})=><img src={src} alt={alt} style={{width:"100%",height:h,objectFit:"cover",display:"block",borderRadius:rounded?12:0,...es}}/>;
const ProductThumb=({src,w=56,h=48,alt="",style:es})=><img src={src} alt={alt} style={{width:w,height:h,borderRadius:8,objectFit:"cover",flexShrink:0,display:"block",...es}}/>;

// ─── SHARED COMPONENTS ───
const Card=({children,style,onClick,ariaLabel})=>{const[h,setH]=useState(false);return<div role={onClick?"button":undefined} aria-label={ariaLabel} onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:W[100],border:`1px solid ${h&&onClick?W[300]:W[200]}`,borderRadius:12,padding:16,transition:"border-color 150ms ease",...style}}>{children}</div>;};
const SL=({t})=><div style={{fontFamily:fd,fontSize:15,textTransform:"uppercase",color:W[500],letterSpacing:"0.04em",marginBottom:8,lineHeight:1}}>{t}</div>;
const Badge=({label,type="success"})=>{const s=ST[type]||ST.success;return<span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,fontWeight:500,fontFamily:fb,padding:"4px 10px",borderRadius:4,background:s.bg,color:s.t,border:`1px solid ${s.b}`}}><span style={{fontSize:8}}>●</span>{label}</span>;};
const Btn=({children,primary,disabled,onClick,style:es,full,ariaLabel})=>{const[h,setH]=useState(false);return<button aria-label={ariaLabel} disabled={disabled} onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{padding:"12px 20px",borderRadius:8,border:primary?"none":`1px solid ${h&&!disabled?B[600]:B[500]}`,background:primary?(disabled?W[200]:h?B[600]:B[500]):(h&&!disabled?B[50]:"none"),color:primary?(disabled?W[500]:"#FFF"):B[500],fontFamily:fb,fontSize:14,fontWeight:500,cursor:disabled?"default":"pointer",opacity:disabled?0.5:1,minHeight:44,width:full?"100%":"auto",transition:"all 150ms ease",...es}}>{children}</button>;};
const QtyBtn=({qty,onAdd,onRemove,name})=><div onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}><button aria-label={`Remover ${name}`} onClick={onRemove} className="qb" style={{width:32,height:32,borderRadius:8,border:`1px solid ${W[300]}`,background:"none",cursor:"pointer",fontSize:18,color:W[600],display:"flex",alignItems:"center",justifyContent:"center"}}>−</button><span style={{fontFamily:fb,fontSize:16,fontWeight:600,color:B[500],width:24,textAlign:"center"}}>{qty}</span><button aria-label={`Adicionar ${name}`} onClick={onAdd} className="qb" style={{width:32,height:32,borderRadius:8,border:`1px solid ${B[500]}`,background:B[50],cursor:"pointer",fontSize:18,color:B[500],display:"flex",alignItems:"center",justifyContent:"center"}}>+</button></div>;
const Toast=({msg,vis})=>vis?<div role="status" aria-live="polite" style={{position:"fixed",bottom:72,left:16,right:16,maxWidth:358,margin:"0 auto",background:W[800],color:"#FFF",borderRadius:8,padding:"12px 16px",zIndex:60,fontFamily:fb,fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:8,animation:"fadeUp 300ms ease"}}><I d={ic.check} size={16} color="#6EE7B7"/>{msg}</div>:null;
const DeadlineWarning=()=><div style={{fontFamily:fb,fontSize:12,color:ST.warning.t,background:ST.warning.bg,padding:"8px 12px",borderRadius:8,marginBottom:20,display:"inline-flex",alignItems:"center",gap:8,border:`1px solid ${ST.warning.b}`}}><I d={ic.clock} size={14} color={ST.warning.t}/>Pedidos até terça, 12h, para entrega na quinta</div>;
const CutoffMsg=()=><div style={{fontFamily:fb,fontSize:13,color:"#7A766E",marginTop:6}}>Prazo encerrado. Alterações valem a partir da próxima semana.</div>;
const CutoffBanner=({cutoff})=>{
  if(!cutoff)return null;
  const aberta=D.semana.pedidosAbertos;
  if(aberta){
    return<div style={{background:W[50],border:`1px solid ${W[200]}`,borderRadius:8,padding:12,marginBottom:16,fontFamily:fb,fontSize:13,color:W[700],lineHeight:1.5}}>
      <I d={ic.cal} size={14} color={W[500]}/> Pedidos da próxima semana já estão abertos.
    </div>;
  }
  return<div style={{background:W[50],border:`1px solid ${W[200]}`,borderRadius:8,padding:12,marginBottom:16,fontFamily:fb,fontSize:13,color:W[700],lineHeight:1.5}}>
    <I d={ic.clock} size={14} color={W[500]}/> Pedidos desta semana fechados. Os pedidos da próxima semana abrirão em breve.
  </div>;
};
const simulate=()=>new Promise(r=>setTimeout(r,600));
const ActionBtn=({children,loadingText,successText,onAction,onComplete,primary,disabled:extDisabled,full,style:es,ariaLabel})=>{const[st,setSt]=useState('idle');const[err,setErr]=useState('');const handle=async()=>{if(st!=='idle')return;setSt('loading');setErr('');try{await onAction();setSt('success');setTimeout(()=>{setSt('idle');onComplete?.();},1500);}catch(e){setErr(e.message||'Erro ao processar. Tente novamente.');setSt('idle');}};const busy=st==='loading'||st==='success';const label=st==='loading'?loadingText:st==='success'?successText:children;const stStyle=st==='success'?{background:'#D1FAE5',color:'#065F46',border:'1px solid #6EE7B7',opacity:1}:{};return<><Btn primary={st!=='success'&&primary} disabled={busy||extDisabled} onClick={handle} full={full} ariaLabel={ariaLabel} style={{...es,...stStyle}}>{label}</Btn>{err&&<div style={{fontFamily:fb,fontSize:13,color:'#9A3412',background:'#FFEDD5',padding:'8px 12px',borderRadius:8,marginTop:6}}>{err}</div>}</>;};

// ─── MODAL ───
const Modal=({product,onClose,onAction,onComplete,actionLabel,hint,qty,onAdd,onRemove,cutoff})=>{
  if(!product)return null;
  return<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(26,24,21,0.5)",zIndex:50,animation:"fadeIn 200ms ease"}}/>
    <div role="dialog" aria-label={`Detalhes: ${product.nome}`} style={{position:"fixed",bottom:0,left:0,right:0,maxWidth:390,margin:"0 auto",background:"#FFF",borderRadius:"16px 16px 0 0",zIndex:51,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 -4px 24px rgba(26,24,21,0.12)",animation:"slideUp 300ms ease"}}>
      <div style={{position:"relative"}}>
        <ProductImg src={product.img} h={220} alt={product.nome} rounded={false} style={{borderRadius:"16px 16px 0 0"}}/>
        <button aria-label="Fechar" onClick={onClose} style={{position:"absolute",top:12,right:12,width:36,height:36,borderRadius:9999,background:"rgba(255,255,255,0.9)",border:"none",cursor:"pointer",fontSize:18,color:W[600],display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>
      <div style={{padding:20}}>
        <div style={{fontFamily:fd,fontSize:24,textTransform:"uppercase",color:B[800],letterSpacing:"0.02em",lineHeight:1.2}}>{product.nome}</div>
        <div style={{fontFamily:fb,fontSize:14,color:W[500],marginTop:4}}>{product.peso}</div>
        <div style={{fontFamily:fb,fontSize:20,fontWeight:600,color:B[500],marginTop:8}}>{product.preco}</div>
        <div style={{height:1,background:W[200],margin:"16px 0"}}/>
        {product.ingredientes&&<div style={{marginBottom:16}}><div style={{fontFamily:fd,fontSize:13,textTransform:"uppercase",color:W[400],letterSpacing:"0.04em",marginBottom:6}}>Ingredientes</div><div style={{fontFamily:fb,fontSize:14,color:W[600],lineHeight:1.6}}>{product.ingredientes}</div></div>}
        {product.historia&&<div style={{marginBottom:16,fontFamily:fb,fontSize:14,color:W[700],lineHeight:1.7}}>{product.historia}</div>}
        {product.detalhe&&!product.historia&&<div style={{marginBottom:16}}><div style={{fontFamily:fd,fontSize:13,textTransform:"uppercase",color:W[400],letterSpacing:"0.04em",marginBottom:6}}>Sobre este pão</div><div style={{fontFamily:fb,fontSize:14,color:W[700],lineHeight:1.6}}>{product.detalhe}</div></div>}
        <div style={{marginTop:4}}>
          {cutoff?<><Btn primary full disabled ariaLabel={actionLabel}>{actionLabel}</Btn><CutoffMsg/></>:qty>0?<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0"}}><div style={{fontFamily:fb,fontSize:14,color:ST.success.t,fontWeight:500,display:"flex",alignItems:"center",gap:6}}><I d={ic.check} size={16} color={ST.success.t}/>Na sua cesta</div><QtyBtn qty={qty} onAdd={onAdd} onRemove={onRemove} name={product.nome}/></div>:<>{onAction&&<ActionBtn primary full loadingText="Adicionando…" successText="Adicionado ✓" onAction={onAction} onComplete={onComplete} ariaLabel={actionLabel}>{actionLabel}</ActionBtn>}{hint&&<div style={{fontFamily:fb,fontSize:12,color:W[500],textAlign:"center",marginTop:8}}>{hint}</div>}</>}
        </div>
      </div>
    </div>
  </>;
};

const Nav=({active,onNav,badge})=>{const items=[{id:"home",label:"INÍCIO",icon:ic.home},{id:"assinatura",label:"ASSINATURA",icon:ic.wheat},{id:"cardapio",label:"CARDÁPIO",icon:ic.utensils},{id:"perfil",label:"PERFIL",icon:ic.user}];return<div style={{display:"flex",justifyContent:"space-around",alignItems:"center",padding:"8px 0 12px",borderTop:`1px solid ${W[200]}`,background:"#FFF",position:"sticky",bottom:0,zIndex:10,minHeight:56}}>{items.map(it=><button key={it.id} aria-label={`Ir para ${it.label}`} onClick={()=>onNav(it.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,border:"none",background:"none",cursor:"pointer",minWidth:56,minHeight:44,padding:"4px 0",position:"relative"}}><I d={it.icon} size={22} color={active===it.id?B[500]:W[400]}/>{it.id==="cardapio"&&badge>0&&<span style={{position:"absolute",top:0,right:4,width:18,height:18,borderRadius:9999,background:B[500],color:"#FFF",fontFamily:fb,fontSize:10,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>{badge}</span>}<span style={{fontFamily:fd,fontSize:11,letterSpacing:"0.02em",textTransform:"uppercase",color:active===it.id?B[500]:W[400]}}>{it.label}</span></button>)}</div>;};

// ─── NOVIDADE CARD (edge-to-edge photo) ───
const NovidadeCard=({extra,qty,onCardClick,onAdd,onRemove,cutoff})=><Card style={{padding:0,overflow:"hidden",cursor:"pointer",marginBottom:16}} onClick={onCardClick} ariaLabel={`Novidade: ${extra.nome}`}>
  <ProductImg src={extra.img} h={200} alt={extra.nome} rounded={false}/>
  <div style={{padding:16}}>
    <SL t="Novidade da semana"/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
      <div style={{flex:1}}><div style={{fontFamily:fb,fontSize:18,fontWeight:600,color:W[800]}}>{extra.nome}</div><div style={{fontFamily:fb,fontSize:14,color:W[600],marginTop:4}}>{extra.preco}</div></div>
      {cutoff?<button disabled className="bp" style={{padding:"10px 24px",borderRadius:8,border:"none",background:B[500],color:"#FFF",fontFamily:fb,fontSize:14,fontWeight:500,cursor:"default",minHeight:44,flexShrink:0,opacity:0.5}}>Quero</button>:qty===0?<button onClick={e=>{e.stopPropagation();onCardClick();}} className="bp" style={{padding:"10px 24px",borderRadius:8,border:"none",background:B[500],color:"#FFF",fontFamily:fb,fontSize:14,fontWeight:500,cursor:"pointer",minHeight:44,flexShrink:0}}>Quero</button>:<QtyBtn qty={qty} onAdd={()=>onAdd&&onAdd()} onRemove={()=>onRemove&&onRemove()} name={extra.nome}/>}
    </div>
    {cutoff&&<CutoffMsg/>}
  </div>
</Card>;

// ─── SOFT LIMIT WARNING (4+ extras) ───
const ExtrasWarning=({count})=>{
  if(count<4)return null;
  return<div style={{fontFamily:fb,fontSize:12,color:ST.warning.t,background:ST.warning.bg,padding:"8px 12px",borderRadius:8,marginTop:8,border:`1px solid ${ST.warning.b}`,lineHeight:1.5}}>
    <I d={ic.clock} size={14} color={ST.warning.t} sw={2}/> Você tem {count} itens nesta semana. Pedidos acima de 3 itens podem ter prioridade reduzida caso atinjamos o limite de produção da semana. Se isso acontecer, te avisaremos pelo WhatsApp e você não será cobrado.
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
          <I d={ic.bag} size={14} color={B[500]}/>{pCount} {pCount===1?"item":"itens"} — extras desta semana
        </div>
        <div style={{fontFamily:fb,fontSize:15,fontWeight:600,color:W[800]}}>{fmt(total)}</div>
      </div>
      <div style={{display:"flex",gap:8,flexShrink:0}}><Btn onClick={onCancel}>Cancelar</Btn><ActionBtn primary disabled={cutoff} loadingText="Adicionando…" successText="Adicionado ✓" onAction={()=>simulate()} onComplete={onConfirm}>Confirmar</ActionBtn></div>
    </div>
    {cutoff?<CutoffMsg/>:<div style={{fontFamily:fb,fontSize:11,color:W[500],marginTop:4}}>Além da sua assinatura. Cobrado na próxima fatura.</div>}
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

// ═══ HOME ═══
// Helpers para montar slots e converter entre qtdsMap <-> slots array
// slots: array de ids na ordem fixa (derivada da Assinatura). Ex: ["original","original","integral"] para 2 Originais + 1 Integral.
const qtdsToSlots=(qtds)=>{const s=[];Object.entries(qtds).forEach(([id,q])=>{for(let i=0;i<q;i++)s.push(id);});return s;};
const slotsToQtds=(slots)=>slots.reduce((a,id)=>{a[id]=(a[id]||0)+1;return a;},{});

const Home=({onNav,pending,confirmed,addPending,removePending,updateConfirmed,userData,isFirstVisit,onSeen,cutoff,assinaturaQtds,cestaSemana,cestaAtual,houveSwap,onSetCestaSemana})=>{
  const[modal,setModal]=useState(null);
  const[swapModal,setSwapModal]=useState(false);
  const[rascunhoSlots,setRascunhoSlots]=useState([]); // slots da cesta durante a edicao no modal
  const[toast,setToast]=useState(false);
  const[toastMsg,setToastMsg]=useState("");
  const allItems=[...confirmed,...pending];
  const cntAll=n=>cntIn(allItems,n);
  const handleAddComplete=p=>{addPending(p);setModal(null);setToastMsg(`${p.nome} adicionada à sua cesta.`);setToast(true);setTimeout(()=>setToast(false),5000);};
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
  const saudacao=isFirstVisit?(userData?.genero==="f"?"Bem-vinda":"Bem-vindo"):greet();
  const prefix=isFirstVisit?`${saudacao}, ${nome}!`:`Oi, ${nome}, ${saudacao}!`;

  // Composicao da Cesta desta semana (multi-pao)
  const cestaSlots=qtdsToSlots(cestaAtual);
  const assinaturaSlots=qtdsToSlots(assinaturaQtds);
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
    const novoQtds=slotsToQtds(rascunhoSlots);
    // Preenche ids ausentes com 0 para comparacao estavel com assinaturaQtds
    D.pães.forEach(p=>{if(novoQtds[p.id]===undefined)novoQtds[p.id]=0;});
    // Se voltou pro estado da Assinatura, limpa cestaSemana (null)
    const igual=JSON.stringify(novoQtds)===JSON.stringify(assinaturaQtds);
    onSetCestaSemana(igual?null:novoQtds);
    setSwapModal(false);
    setToastMsg("Cesta atualizada. Sua Assinatura segue como antes na próxima semana.");
    setToast(true);setTimeout(()=>setToast(false),5000);
  };

  useEffect(()=>{if(!isFirstVisit||!onSeen)return;const t=setTimeout(onSeen,5000);return()=>clearTimeout(t);},[isFirstVisit,onSeen]);

  return<div style={{padding:"24px 16px 16px",paddingBottom:pending.length>0?80:16}}>
    <h1 style={{fontFamily:fd,fontSize:30,textTransform:"uppercase",color:B[800],letterSpacing:"0.02em",margin:"0 0 20px",lineHeight:1.1}}>{prefix}</h1>

    <CutoffBanner cutoff={cutoff}/>

    {/* Card unificado — CESTA DA SEMANA (4 estados: padrão, swap, extra, swap+extra) */}
    <Card style={{marginBottom:16,padding:0,overflow:"hidden",background:"#FFF",border:`1px solid ${temSwap?B[200]:W[200]}`}} ariaLabel={`Cesta da semana: ${D.entrega.dia}`}>
      <div style={{display:"flex",alignItems:"stretch"}}>
        <img src={cestaImg} alt={primeiroPaoCesta?.nome||"Pão"} style={{width:80,objectFit:"cover",borderRadius:confirmedExtras.length>0?"12px 0 0 0":"12px 0 0 12px",display:"block"}}/>
        <div style={{flex:1,padding:"12px",display:"flex",flexDirection:"column",gap:4}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
            <SL t="Cesta da semana"/>
            {temSwap
              ?<span style={{fontFamily:fb,fontSize:11,fontWeight:500,padding:"3px 8px",borderRadius:4,background:W[200],color:W[800],whiteSpace:"nowrap"}}>editada só desta semana</span>
              :temExtras
                ?<Badge label="confirmada" type="info"/>
                :null}
          </div>
          <div style={{fontFamily:fb,fontSize:18,fontWeight:600,color:W[800]}}>{D.entrega.dia}</div>
          <div style={{fontFamily:fb,fontSize:13,color:W[600]}}>
            {cestaLabel}{temExtras&&!temSwap&&<span style={{color:W[400]}}> · assinatura</span>}
          </div>
          {temSwap&&<div style={{fontFamily:fb,fontSize:12,color:W[600],lineHeight:1.4}}>
            Cesta editada só desta semana.{!temExtras&&<br/>}
            {!temExtras&&"Próxima semana volta ao normal."}
          </div>}
          {!temSwap&&!temExtras&&<div style={{fontFamily:fb,fontSize:12,color:W[500],marginTop:2}}>Tudo certo. Essa é sua cesta da Assinatura.</div>}
          {!cutoff&&<button onClick={openSwapModal} className="lk" style={{fontFamily:fb,fontSize:12,color:B[500],fontWeight:500,cursor:"pointer",background:"none",border:"none",padding:0,textAlign:"left",marginTop:2}}>Personalizar ›</button>}
        </div>
      </div>
      {/* Extras confirmados + detalhamento swap — seção interna do mesmo card */}
      {(temExtras||temSwap&&confirmedExtras.length>0)&&<div style={{borderTop:`1px solid ${W[200]}`,padding:"12px 16px"}}>
        {temSwap&&<div style={{fontFamily:fb,fontSize:13,color:W[700],padding:"4px 0",marginBottom:confirmedExtras.length>0?4:0}}>{cestaLabel} · editada</div>}
        {!temSwap&&temExtras&&<div style={{fontFamily:fb,fontSize:13,color:W[700],padding:"4px 0",marginBottom:4}}>{cestaLabel} · assinatura</div>}
        {Object.entries(confirmedExtras.reduce((a,p)=>{a[p.nome]=a[p.nome]||p;return a;},{})).map(([nome,item])=>{const qty=cntIn(confirmedExtras,nome);return<div key={nome} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0"}}><div style={{fontFamily:fb,fontSize:13,color:W[800],flex:1}}>+ {qty>1?`${qty}× `:""}{nome} · {fmt(item.precoNum*qty)}</div><QtyBtn qty={qty} onAdd={()=>updateConfirmed(addTo(confirmed,{nome:item.nome,preco:item.preco,precoNum:item.precoNum},"extra"))} onRemove={()=>updateConfirmed(removeFrom(confirmed,nome))} name={nome}/></div>;})}
        <div style={{height:1,background:W[200],margin:"8px 0"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontFamily:fb,fontSize:14,fontWeight:600,color:B[700]}}>Total de extras: {fmt(confirmedTotal)} na próxima fatura.</div></div><button onClick={()=>onNav("cardapio")} className="lk" style={{fontFamily:fb,fontSize:13,color:B[500],fontWeight:500,cursor:"pointer",background:"none",border:"none",display:"flex",alignItems:"center",gap:4}}><I d={ic.edit} size={14} color={B[500]}/>Editar</button></div>
        {temSwap&&<div style={{fontFamily:fb,fontSize:11,color:W[500],marginTop:6}}>Próxima semana volta ao normal.</div>}
      </div>}
    </Card>

    {/* Novidade hero — edge-to-edge photo */}
    {D.extras.length>0?<NovidadeCard extra={D.extras[0]} qty={cntAll(D.extras[0].nome)} onCardClick={()=>setModal(D.extras[0])} onAdd={()=>handleQtyChange(D.extras[0],1)} onRemove={()=>handleQtyChange(D.extras[0],-1)} cutoff={cutoff}/>:<Card style={{marginBottom:16,padding:20,textAlign:"center"}}><div style={{fontFamily:fd,fontSize:15,textTransform:"uppercase",color:W[400],marginBottom:8}}>Novidades da semana</div><div style={{fontFamily:fb,fontSize:14,color:W[500],lineHeight:1.6}}>Nenhuma novidade esta semana. Mas seu pão de sempre está garantido.</div></Card>}

    <div onClick={()=>onNav("cardapio")} className="lk" style={{fontFamily:fb,fontSize:14,color:B[500],fontWeight:500,textAlign:"center",padding:"8px 0",cursor:"pointer"}}>Ver cardápio completo ›</div>

    {/* Swap modal */}
    {swapModal&&<>
      <div onClick={()=>setSwapModal(false)} style={{position:"fixed",inset:0,background:"rgba(26,24,21,0.5)",zIndex:50,animation:"fadeIn 200ms ease"}}/>
      <div role="dialog" aria-label="Personalizar cesta da semana" style={{position:"fixed",bottom:0,left:0,right:0,maxWidth:390,margin:"0 auto",background:"#FFF",borderRadius:"16px 16px 0 0",zIndex:51,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 -4px 24px rgba(26,24,21,0.12)",animation:"slideUp 300ms ease",padding:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontFamily:fd,fontSize:20,textTransform:"uppercase",color:B[800]}}>Personalizar cesta da semana</div>
          <button aria-label="Fechar" onClick={()=>setSwapModal(false)} style={{width:36,height:36,borderRadius:9999,background:W[100],border:"none",cursor:"pointer",fontSize:18,color:W[600],display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{fontFamily:fb,fontSize:14,color:W[600],marginBottom:20,lineHeight:1.5}}>
          Você pode trocar os pães da sua Assinatura por outros produtos elegíveis. A troca vale só pra esta semana. Sua Assinatura volta ao normal na próxima.
        </div>
        {/* Slots dinamicos: um bloco por pao da Assinatura */}
        {assinaturaSlots.map((produtoPadraoId,idx)=>{
          const produtoAtualId=rascunhoSlots[idx]||produtoPadraoId;
          return<div key={idx} style={{marginBottom:16}}>
            {assinaturaSlots.length>1&&<div style={{fontFamily:fd,fontSize:13,textTransform:"uppercase",color:W[500],letterSpacing:"0.04em",marginBottom:8}}>Pão {idx+1}</div>}
            {D.pães.map(p=>{const sel=produtoAtualId===p.id;return<button key={p.id} onClick={()=>setSlotProduto(idx,p.id)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"12px",marginBottom:8,borderRadius:8,border:`2px solid ${sel?B[500]:W[200]}`,background:sel?B[50]:"#FFF",cursor:"pointer",textAlign:"left"}}>
              <div style={{width:20,height:20,borderRadius:9999,border:`2px solid ${sel?B[500]:W[300]}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{sel&&<div style={{width:10,height:10,borderRadius:9999,background:B[500]}}/>}</div>
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
const composicaoToStr=(qtdsMap)=>Object.entries(qtdsMap).filter(([,q])=>q>0).map(([id,q])=>{const p=D.pães.find(x=>x.id===id);return p?`${q} ${p.nome} (${p.peso})`:"";}).filter(Boolean).join(" + ");

const Assinatura=({onNav,hasPending,cutoff,assinaturaQtds,onSalvar})=>{
  const[editing,setEditing]=useState(false);
  // Rascunho local SO durante a edicao. Ao salvar, chama onSalvar(rascunho). Ao cancelar, descarta.
  const[rascunho,setRascunho]=useState(assinaturaQtds);
  const[saved,setSaved]=useState(false);const[showCalc,setShowCalc]=useState(false);
  const[addrSt,setAddrSt]=useState('idle');const[cardSt,setCardSt]=useState('idle');

  // Sincroniza rascunho quando fecha edicao ou assinatura muda externamente
  useEffect(()=>{setRascunho(assinaturaQtds);},[assinaturaQtds,editing]);

  const total=Object.values(rascunho).reduce((s,q)=>s+q,0);
  const origTotal=Object.values(assinaturaQtds).reduce((s,q)=>s+q,0);
  const mensal=D.assinatura.valorMensal*total;
  const orig=D.assinatura.valorMensal*origTotal;
  const changed=JSON.stringify(rascunho)!==JSON.stringify(assinaturaQtds);
  const diff=mensal-orig;const prop=Math.abs(diff/4*D.semanasRestantes);
  const upd=(id,d)=>setRascunho(prev=>{const v=(prev[id]||0)+d;const t=total+d;if(v<0||t>3)return prev;return{...prev,[id]:v};});
  const handleSave=()=>{onSalvar(rascunho);setEditing(false);setSaved(true);setTimeout(()=>setSaved(false),5000);};

  const itensStr=composicaoToStr(assinaturaQtds)||"Sem pães configurados";
  const valorMensalAtual=D.assinatura.valorMensal*origTotal;
  const primeiroPao=D.pães.find(p=>assinaturaQtds[p.id]>0)||D.pães[0];

  return<div style={{padding:"24px 16px 16px",paddingBottom:hasPending?80:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{fontFamily:fd,fontSize:26,textTransform:"uppercase",color:B[800],margin:0}}>Sua Assinatura</h2><Badge label="Ativa"/></div>
    <div style={{background:B[50],borderRadius:12,padding:16,marginBottom:16,fontFamily:fb,fontSize:14,color:B[800],lineHeight:1.6}}>Toda semana você recebe pão fresco na porta da sua casa. O valor da assinatura é fixo. Em meses com 5 semanas, o pão extra é por nossa conta.</div>
    <Card style={{marginBottom:12}}><SL t="Minha assinatura"/>
      <div style={{display:"flex",gap:12,alignItems:"center"}}><ProductThumb src={primeiroPao.img} w={56} h={48} alt={primeiroPao.nome}/><div style={{flex:1}}><div style={{fontFamily:fb,fontSize:13,color:W[600]}}>{itensStr} / semana</div><div style={{fontFamily:fb,fontSize:15,fontWeight:600,color:B[500],marginTop:4}}>{fmt(valorMensalAtual)}/mês</div></div></div>
      {!editing&&<><Btn full disabled={cutoff} onClick={()=>setEditing(true)} style={{marginTop:12}}>Alterar minha assinatura</Btn>{cutoff&&<CutoffMsg/>}</>}
      {editing&&<div style={{marginTop:16,borderTop:`1px solid ${W[200]}`,paddingTop:16}}>
        <DeadlineWarning/>
        <div style={{fontFamily:fb,fontSize:12,color:W[500],marginBottom:12}}>Limite: 3 pães/semana ({total}/3)</div>
        {D.pães.map((p,i)=>{const q=rascunho[p.id]||0;return<div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:i<D.pães.length-1?`1px solid ${W[100]}`:"none"}}>
          <ProductThumb src={p.img} w={48} h={40} alt={p.nome}/>
          <div style={{flex:1}}><div style={{fontFamily:fb,fontSize:14,fontWeight:600,color:W[800]}}>{p.nome} <span style={{fontWeight:400,fontSize:12,color:W[500]}}>({p.peso})</span></div></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}><button onClick={()=>upd(p.id,-1)} disabled={q===0} className="qb" style={{width:32,height:32,borderRadius:8,border:`1px solid ${q>0?W[300]:W[200]}`,background:"none",cursor:q>0?"pointer":"default",fontSize:18,color:q>0?W[600]:W[300],display:"flex",alignItems:"center",justifyContent:"center",opacity:q===0?0.4:1}}>−</button><span style={{fontFamily:fb,fontSize:16,fontWeight:600,color:q>0?B[500]:W[400],width:24,textAlign:"center"}}>{q}</span><button onClick={()=>upd(p.id,1)} disabled={total>=3} className="qb" style={{width:32,height:32,borderRadius:8,border:`1px solid ${total<3?B[500]:W[200]}`,background:total<3?B[50]:"none",cursor:total<3?"pointer":"default",fontSize:18,color:total<3?B[500]:W[300],display:"flex",alignItems:"center",justifyContent:"center",opacity:total>=3?0.4:1}}>+</button></div>
        </div>;})}
        <div style={{fontFamily:fb,fontSize:15,fontWeight:600,color:W[800],textAlign:"right",padding:"12px 0 4px"}}>Novo valor mensal: <span style={{color:B[500]}}>{fmt(mensal)}</span></div>
        {changed&&<><div style={{fontFamily:fb,fontSize:12,color:W[500],textAlign:"right",marginBottom:4}}>Antes: {fmt(orig)} → Depois: {fmt(mensal)}</div>
          <div onClick={()=>setShowCalc(!showCalc)} style={{background:B[50],borderRadius:8,padding:"10px 12px",marginBottom:12,cursor:"pointer",border:`1px solid ${B[100]}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontFamily:fb,fontSize:13,color:B[700]}}>Ajuste neste mês: <span style={{fontWeight:600}}>{diff>0?"+":""}{fmt(prop)}</span></div><I d={ic.chevDown} size={16} color={B[400]}/></div>{showCalc&&<div style={{marginTop:8,fontFamily:fb,fontSize:12,color:B[600],lineHeight:1.6,animation:"fadeUp 200ms ease"}}>Faltam {D.semanasRestantes} semanas neste mês.<br/>Diferença semanal: {diff>0?"+":""}{fmt(Math.abs(diff/4))}/semana<br/>Cobrado proporcionalmente na próxima fatura: {diff>0?"+":""}{fmt(prop)}</div>}</div>
        </>}
        <div style={{display:"flex",gap:8}}><Btn onClick={()=>{setEditing(false);setRascunho(assinaturaQtds);setShowCalc(false);}} style={{flex:1}}>Cancelar</Btn><ActionBtn primary disabled={!changed} loadingText="Atualizando…" successText="Atualizada ✓" onAction={()=>simulate()} onComplete={handleSave} style={{flex:2}}>{changed?"Salvar":"Faça uma alteração"}</ActionBtn></div>
      </div>}
    </Card>
    <Toast msg="Assinatura atualizada! O novo valor começa a valer esta semana." vis={saved}/>
    <Card style={{marginBottom:12}}><SL t="Entrega"/><div style={{fontFamily:fb,fontSize:16,fontWeight:600,color:W[800],marginBottom:4}}>Entregas às {D.ent.dia.toLowerCase()}</div><div style={{fontFamily:fb,fontSize:13,color:W[600]}}>{D.ent.cond}, {D.ent.bloco}</div><div style={{fontFamily:fb,fontSize:13,color:W[500],marginBottom:8}}>Frete: {D.ent.frete}</div><div style={{fontFamily:fb,fontSize:12,color:B[700],background:B[50],padding:"8px 12px",borderRadius:8,marginBottom:8,display:"flex",gap:8,alignItems:"flex-start"}}><I d={ic.users} size={16} color={B[500]}/><span>Traga 5 moradores do seu prédio e tenha entrega gratuita.</span></div><div onClick={async()=>{if(addrSt!=='idle')return;setAddrSt('loading');await simulate();setAddrSt('success');setTimeout(()=>setAddrSt('idle'),1500);}} className="lk" style={{fontFamily:fb,fontSize:13,color:addrSt==='success'?'#065F46':B[500],fontWeight:500,cursor:addrSt!=='idle'?'default':'pointer',background:addrSt==='success'?'#D1FAE5':'none',padding:addrSt==='success'?'4px 8px':0,borderRadius:6,display:'inline-block',transition:'all 150ms ease',opacity:addrSt==='loading'?0.5:1}}>{addrSt==='loading'?'Salvando…':addrSt==='success'?'Salvo ✓':'Editar endereço ›'}</div></Card>
    <Card style={{marginBottom:12}}><SL t="Cobrança"/><div style={{fontFamily:fb,fontSize:16,fontWeight:600,color:W[800],marginBottom:4}}>Mensal no cartão</div><div style={{fontFamily:fb,fontSize:13,color:W[600]}}>{D.cartao.band} ••••{D.cartao.n}</div><div style={{fontFamily:fb,fontSize:13,color:W[500],marginBottom:8}}>Próxima: {D.cartao.prox}</div><div onClick={async()=>{if(cardSt!=='idle')return;setCardSt('loading');await simulate();setCardSt('success');setTimeout(()=>setCardSt('idle'),1500);}} className="lk" style={{fontFamily:fb,fontSize:13,color:cardSt==='success'?'#065F46':B[500],fontWeight:500,cursor:cardSt!=='idle'?'default':'pointer',background:cardSt==='success'?'#D1FAE5':'none',padding:cardSt==='success'?'4px 8px':0,borderRadius:6,display:'inline-block',transition:'all 150ms ease',opacity:cardSt==='loading'?0.5:1}}>{cardSt==='loading'?'Validando…':cardSt==='success'?'Atualizado ✓':'Atualizar cartão ›'}</div></Card>
    <Card onClick={()=>onNav("perfil")} style={{marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} ariaLabel="Ver histórico"><div style={{display:"flex",alignItems:"center",gap:12}}><I d={ic.file} size={20} color={B[500]}/><div><div style={{fontFamily:fb,fontSize:14,fontWeight:500,color:W[700]}}>Histórico de entregas e cobranças</div><div style={{fontFamily:fb,fontSize:12,color:W[500]}}>{D.cob.mes} — {D.cob.valor} — {D.cob.status}</div></div></div><I d={ic.chev} size={16} color={W[400]}/></Card>
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
    <h2 style={{fontFamily:fd,fontSize:26,textTransform:"uppercase",color:B[800],margin:"0 0 4px"}}>Cardápio</h2>
    <div style={{fontFamily:fb,fontSize:13,color:W[500],marginBottom:12}}>Peça itens extras para esta semana</div>
    <DeadlineWarning/>

    {confirmedExtras.length>0&&<div style={{background:ST.success.bg,borderRadius:8,padding:"10px 12px",marginBottom:16,border:`1px solid ${ST.success.b}`,display:"flex",alignItems:"center",gap:8}}><I d={ic.check} size={16} color={ST.success.t}/><span style={{fontFamily:fb,fontSize:13,color:ST.success.t,fontWeight:500}}>{Object.entries(confirmedExtras.reduce((a,p)=>{a[p.nome]=(a[p.nome]||0)+1;return a;},{})).map(([n,q])=>`${q}× ${n}`).join(", ")} — confirmado</span></div>}

    {D.extras.length>0?D.extras.map((ex,i)=><NovidadeCard key={i} extra={ex} qty={cntAll(ex.nome)} onCardClick={()=>setModal(ex)} onAdd={()=>addItem(ex)} onRemove={()=>removeItem(ex.nome)} cutoff={cutoff}/>):<Card style={{marginBottom:16,padding:20,textAlign:"center"}}><div style={{fontFamily:fb,fontSize:14,color:W[500]}}>Nenhuma novidade esta semana.</div></Card>}

    <div style={{height:1,background:W[200],margin:"4px 0 20px"}}/>
    <div style={{fontFamily:fd,fontSize:16,textTransform:"uppercase",color:B[800],letterSpacing:"0.02em",marginBottom:12}}>Pães da assinatura</div>

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
const Perfil=({confirmed,hasPending,assinaturaQtds,cestaAtual,houveSwap})=>{
  const[cpf,setCpf]=useState(false);const[pauseSt,setPauseSt]=useState('idle');const dados=[["Endereço","Ed. Boa Vista, Bl. A / 502"],["Dia de entrega","Quintas-feiras"],["WhatsApp","(21) 99876-5432"],["E-mail","beatriz@email.com"],["CPF",cpf?"123.456.789-00":"•••.•••.789-00"]];const confirmedExtras=confirmed.filter(p=>p.kind!=="swap");const confirmedTotal=totalOf(confirmed);const qtdTotal=Object.values(assinaturaQtds||{}).reduce((s,q)=>s+q,0);const assinVal=D.assinatura.valorMensal*qtdTotal;const cestaLabelPerfil=composicaoToStr(cestaAtual||assinaturaQtds||{})||"Sem pães configurados";
  return<div style={{padding:"24px 16px 16px",paddingBottom:hasPending?80:16}}>
    <h2 style={{fontFamily:fd,fontSize:26,textTransform:"uppercase",color:B[800],margin:"0 0 20px"}}>Perfil</h2>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><div style={{width:48,height:48,borderRadius:9999,background:B[50],display:"flex",alignItems:"center",justifyContent:"center",fontFamily:fd,fontSize:20,color:B[500],textTransform:"uppercase"}}>B</div><div><div style={{fontFamily:fb,fontSize:16,fontWeight:600,color:W[800]}}>Beatriz Silva</div><div style={{fontFamily:fb,fontSize:12,color:W[500]}}>beatriz@email.com</div></div></div>
    <Card style={{marginBottom:12}}><SL t="Dados pessoais"/>{dados.map(([l,v],i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:i<dados.length-1?`1px solid ${W[100]}`:"none"}}><div><div style={{fontFamily:fb,fontSize:11,color:W[400],marginBottom:2}}>{l}</div><div style={{fontFamily:fb,fontSize:13,color:W[700]}}>{v}</div></div>{l==="CPF"?<button aria-label={cpf?"Ocultar CPF":"Mostrar CPF"} onClick={()=>setCpf(!cpf)} style={{background:"none",border:"none",cursor:"pointer",padding:4,minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center"}}><I d={cpf?ic.eyeOff:ic.eye} size={16} color={W[400]}/></button>:<I d={ic.chev} size={14} color={W[400]}/>}</div>)}</Card>
    <Card style={{marginBottom:12}}><SL t="Histórico de entregas e cobranças"/>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><I d={ic.check} size={14} color={ST.success.t}/><span style={{fontFamily:fb,fontSize:13,fontWeight:500,color:ST.success.t}}>Tudo em dia</span></div>
      {(confirmedExtras.length>0||houveSwap)&&<div style={{padding:12,borderRadius:8,background:B[50],border:`1px solid ${B[200]}`,marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontFamily:fb,fontSize:12,color:B[700],fontWeight:500}}>Esta semana</span><Badge label="Confirmado" type="success"/></div>
        <div style={{fontFamily:fb,fontSize:13,color:B[800]}}>{cestaLabelPerfil} · {houveSwap?"editada só desta semana":"assinatura"}</div>
        {Object.entries(confirmedExtras.reduce((a,p)=>{a[p.nome]=(a[p.nome]||0)+1;return a;},{})).map(([n,q])=><div key={n} style={{fontFamily:fb,fontSize:12,color:B[500],marginTop:4}}>+ {q}× {n} · {fmt(confirmedExtras.find(p=>p.nome===n).precoNum*q)}</div>)}
        {confirmedTotal>0&&<div style={{fontFamily:fb,fontSize:12,color:B[700],marginTop:4,fontWeight:500}}>Total extras: {fmt(confirmedTotal)}</div>}
      </div>}
      {D.hist.map((h,i)=><div key={i} style={{padding:"12px 0",borderBottom:i<D.hist.length-1?`1px solid ${W[100]}`:"none"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontFamily:fb,fontSize:12,color:W[400]}}>{h.sem}</span><Badge label={h.st} type={h.st==="Entregue"?"success":"info"}/></div><div style={{fontFamily:fb,fontSize:13,color:W[700],marginTop:4}}>{h.itens}</div>{h.extra&&<div style={{fontFamily:fb,fontSize:12,color:B[500],marginTop:4}}>+ {h.extra.nome} — {h.extra.valor}</div>}</div>)}
      <div style={{marginTop:12,padding:12,borderRadius:8,background:W[50],border:`1px solid ${W[200]}`}}><div style={{fontFamily:fb,fontSize:12,color:W[400],marginBottom:4}}>Cobrança do mês</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontFamily:fb,fontSize:14,fontWeight:600,color:W[800]}}>{D.cob.mes} — {D.cob.valor}</span><Badge label="Pago"/></div></div>
      <div style={{marginTop:8,padding:12,borderRadius:8,background:B[50],border:`1px solid ${B[100]}`}}><div style={{fontFamily:fb,fontSize:12,color:B[700],marginBottom:4}}>Próxima fatura (abril)</div><div style={{fontFamily:fb,fontSize:13,color:B[800],lineHeight:1.6}}>Assinatura: {fmt(assinVal)}<br/>+ Extras: {fmt(confirmedTotal||22)}<br/>+ Frete: R$ 15,00<br/><span style={{fontWeight:600}}>= {fmt(assinVal+15+(confirmedTotal||22))} (estimado)</span></div></div>
    </Card>
    <Card style={{marginBottom:12}}><SL t="Cartão"/><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontFamily:fb,fontSize:14,fontWeight:500,color:W[800]}}>{D.cartao.band} ••••{D.cartao.n}</div><div style={{fontFamily:fb,fontSize:12,color:W[500],marginTop:4}}>Próxima: {D.cartao.prox}</div></div><ActionBtn loadingText="Validando…" successText="Atualizado ✓" onAction={()=>simulate()} style={{padding:"8px 16px",fontSize:12}}>Atualizar</ActionBtn></div></Card>
    <Card style={{marginBottom:12}}><div style={{fontFamily:fb,fontSize:14,color:W[700],marginBottom:12,lineHeight:1.5}}>Precisa pausar ou cancelar? Fale pelo WhatsApp.</div><button disabled={pauseSt!=='idle'} onClick={async()=>{if(pauseSt!=='idle')return;setPauseSt('loading');await simulate();setPauseSt('success');setTimeout(()=>setPauseSt('idle'),1500);}} className="bw" style={{width:"100%",padding:"12px 0",borderRadius:8,background:pauseSt==='success'?'#D1FAE5':'#25D366',color:pauseSt==='success'?'#065F46':'#FFF',border:pauseSt==='success'?'1px solid #6EE7B7':'none',fontFamily:fb,fontSize:14,fontWeight:500,cursor:pauseSt!=='idle'?'default':'pointer',display:"flex",alignItems:"center",justifyContent:"center",gap:8,minHeight:44,opacity:pauseSt==='loading'?0.5:1,transition:'all 150ms ease'}}>{pauseSt==='idle'&&<I d={ic.msg} size={18} color="#FFF"/>}{pauseSt==='loading'?'Processando…':pauseSt==='success'?'Confirmada ✓':'Falar pelo WhatsApp'}</button></Card>
    <button className="bl" style={{width:"100%",padding:"12px 0",borderRadius:8,background:"none",color:W[500],border:`1px solid ${W[300]}`,fontFamily:fb,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,minHeight:44}}><I d={ic.logout} size={16} color={W[500]}/>Sair da conta</button>
  </div>;
};

// ═══ APP (rodapé persistente aqui) ═══
export default function CoraPortal(){
  const skipOnboarding = window.location.search.includes("skip=true");
  const [scr, setScr] = useState(skipOnboarding ? "home" : "onboarding");
  const[pending,setPending]=useState([]);
  const[confirmed,setConfirmed]=useState([]);
  const[justConfirmed,setJustConfirmed]=useState(false);
  const[userData,setUserData]=useState(null);
  const[isFirstVisit,setIsFirstVisit]=useState(true);
  const[onboardingConfig,setOnboardingConfig]=useState(null);

  // === REFACTOR: State da Assinatura agora vive aqui (fonte unica de verdade) ===
  // NOTA: Mock-friendly. Refresh perde o state e volta ao default do mock
  // (D.pães[].qtd). Sera resolvido quando houver backend com persistencia.
  const [assinaturaQtds,setAssinaturaQtds]=useState(()=>{
    const init={};D.pães.forEach(p=>{init[p.id]=p.qtd||0;});return init;
  });
  // cestaSemana: null = segue a Assinatura. Objeto {id:qty} = cliente customizou esta semana.
  const [cestaSemana,setCestaSemana]=useState(null);

  // Sincronizacao com onboarding (substitui a mutacao direta de D)
  useEffect(()=>{
    if(!onboardingConfig?.assinatura) return;
    const next={};D.pães.forEach(p=>{next[p.id]=onboardingConfig.assinatura[p.id]||0;});
    setAssinaturaQtds(next);
    setCestaSemana(null);
    setPending([]);
    setConfirmed([]);
  },[onboardingConfig]);

  // Derivados
  const cestaAtual=cestaSemana??assinaturaQtds;
  const houveSwap=cestaSemana!==null&&JSON.stringify(cestaSemana)!==JSON.stringify(assinaturaQtds);

  const addPending=p=>setPending(prev=>addTo(prev,p,"extra"));
  const removePending=n=>setPending(prev=>removeFrom(prev,n));
  const handleConfirm=()=>{setConfirmed(prev=>[...prev,...pending]);setPending([]);setJustConfirmed(true);setTimeout(()=>setJustConfirmed(false),4000);};
  const handleCancel=()=>setPending([]);
  const hasPending=extrasCount(pending)>0;
  const cutoff=isPastCutoff();
  const isOnboarding=scr==="onboarding";

  const handleOnboardingComplete=(payload)=>{
    // Retrocompat: payload pode ser só "data" (versao antiga) ou {data, assinatura}
    const data=payload?.data||payload;
    const assinatura=payload?.assinatura;
    setUserData(data);
    if(assinatura&&Object.keys(assinatura).length>0){
      setOnboardingConfig({data,assinatura});
    }
    setScr("home");
  };

  const handleSalvarAssinatura=(novosQtds)=>{
    setAssinaturaQtds(novosQtds);
    setCestaSemana(null); // volta a seguir a Assinatura
  };

const params = new URLSearchParams(window.location.search);
  if (window.location.pathname === "/interesse") return <PreCadastro />;
  if (!params.get("dev")) return <PreCadastro />;
  if(isOnboarding) return <CoraOnboarding onComplete={handleOnboardingComplete}/>;

  return<div style={{fontFamily:fb,maxWidth:390,margin:"0 auto",background:W[50],minHeight:"100vh",display:"flex",flexDirection:"column"}}>
    <div style={{padding:"10px 16px",background:"#FFF",borderBottom:`1px solid ${W[200]}`,position:"sticky",top:0,zIndex:10}}>
      <img src={IMG.logo} alt="Cora" style={{height:28}}/>
    </div>
    <div style={{flex:1,overflowY:"auto"}}>
      {scr==="home"&&<Home onNav={setScr} pending={pending} confirmed={confirmed} addPending={addPending} removePending={removePending} updateConfirmed={setConfirmed} userData={userData} isFirstVisit={isFirstVisit} onSeen={()=>setIsFirstVisit(false)} cutoff={cutoff} assinaturaQtds={assinaturaQtds} cestaSemana={cestaSemana} cestaAtual={cestaAtual} houveSwap={houveSwap} onSetCestaSemana={setCestaSemana}/>}
      {scr==="assinatura"&&<Assinatura onNav={setScr} hasPending={hasPending} cutoff={cutoff} assinaturaQtds={assinaturaQtds} onSalvar={handleSalvarAssinatura}/>}
      {scr==="cardapio"&&<Cardapio pending={pending} confirmed={confirmed} setPending={setPending} setConfirmed={setConfirmed} hasPending={hasPending} cutoff={cutoff}/>}
      {scr==="perfil"&&<Perfil confirmed={confirmed} hasPending={hasPending} assinaturaQtds={assinaturaQtds} cestaAtual={cestaAtual} houveSwap={houveSwap}/>}
    </div>
    {/* RODAPÉ PERSISTENTE — visível em TODAS as telas */}
    <OrderFooter pending={pending} confirmed={confirmed} onConfirm={handleConfirm} onCancel={handleCancel} onNav={setScr} cutoff={cutoff}/>
    <ConfirmedFooter vis={justConfirmed}/>
    <Nav active={scr} onNav={setScr} badge={pending.length}/>
    <style>{`*{box-sizing:border-box;margin:0;-webkit-tap-highlight-color:transparent}body{margin:0;-webkit-text-size-adjust:100%;overscroll-behavior:none}img{max-width:100%}input,button{font-size:16px}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}.bp:hover{background:${B[600]}!important}.bw:hover{background:#1FAF54!important}.bl:hover{background:${W[100]}!important}.lk:hover{text-decoration:underline}.qb:hover:not(:disabled){background:${W[100]}!important}button:focus-visible{outline:none;box-shadow:0 0 0 3px ${B[50]},0 0 0 5px ${B[500]}}`}</style>
  </div>;
}