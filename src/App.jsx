import { useState } from "react";

/* CORA — Portal do Assinante — Protótipo v3.2.3
   + Card "Pedido da semana" na Home (confirmados)
   + Edição direta de pedidos confirmados (sem reconfirmar)
   + Destaque no Perfil (semana corrente com badge Confirmado)
   + Prazo 3a 22h, entrega 5a */

const B={50:"#EBEEFB",100:"#C4CDF4",200:"#8B9BE6",400:"#5670D8",500:"#2E55CD",600:"#2545A8",700:"#1D3787",800:"#172E6E",900:"#0F1E49"};
const W={50:"#FAFAF8",100:"#F5F4F0",200:"#E8E6E1",300:"#D4D1CA",400:"#A8A49C",500:"#7A766E",600:"#5C5850",700:"#3D3A34",800:"#2A2723"};
const ST={success:{bg:"#D1FAE5",t:"#065F46",b:"#6EE7B7"},warning:{bg:"#FEF3C7",t:"#92400E",b:"#FCD34D"},info:{bg:"#DBEAFE",t:"#1E40AF",b:"#93C5FD"}};
const fd="'League Gothic',Impact,'Arial Narrow',sans-serif";
const fb="'Montagu Slab',Georgia,Palatino,serif";

const D={
  nome:"Beatriz",
  entrega:{dia:"Quinta, 3 de abril",produto:"1 Pão Original (550g)"},
  cesta:{nome:"Plano Cora",itens:"1 Pão Original (550g) / semana",valor:"R$ 98,00/mês"},
  ent:{dia:"Quintas",cond:"Ed. Boa Vista",bloco:"Bl. A / 502",frete:"R$ 15/mês"},
  cartao:{band:"Visa",n:"6411",prox:"1º de abril"},
  cob:{mes:"Março",valor:"R$ 98,00",status:"Pago"},
  semanasRestantes:2,
  extras:[{nome:"Focaccia Genovesa",peso:"400g",preco:"R$ 22,00",precoNum:22,ingredientes:"Farinha, água, azeite extra-virgem, sal, levain, cebola roxa, alecrim fresco.",historia:"A receita veio de Gênova, onde a focaccia é assunto sério. Lá, cada padeiro tem sua versão — a da Cora leva fermentação longa de 24h e azeite generoso. A cebola roxa carameliza no forno e o alecrim perfuma a cozinha inteira."}],
  pães:[
    {nome:"Pão Original",peso:"550g",preco:"R$ 24,50",precoNum:24.5,desc:"Fermentação natural, casca crocante, miolo macio.",ingredientes:"Farinha de trigo, água, sal, levain da Cora.",detalhe:"Fermentação longa de 36h. Apenas 4 ingredientes. Crosta firme, miolo aberto com alvéolos irregulares.",qtd:1,cor:"#E8D5B7"},
    {nome:"Pão Integral",peso:"550g",preco:"R$ 24,50",precoNum:24.5,desc:"100% integral, sementes de linhaça e girassol.",ingredientes:"Farinha integral, água, sal, levain, linhaça, girassol.",detalhe:"100% farinha integral. Mesma fermentação longa, com sementes tostadas que dão crocância.",qtd:0,cor:"#C4A882"},
    {nome:"Multi Grãos",peso:"650g",preco:"R$ 31,50",precoNum:31.5,desc:"Aveia, centeio, gergelim e mel.",ingredientes:"Farinha de trigo, centeio, aveia, água, mel, sal, levain, gergelim.",detalhe:"Cinco grãos na massa, mel na fermentação. Miolo denso, casca com gergelim tostado.",qtd:0,cor:"#B8956A"},
    {nome:"Brioche",peso:"450g",preco:"R$ 37,00",precoNum:37,desc:"Manteiga francesa, textura amanteigada.",ingredientes:"Farinha, manteiga, ovos, açúcar, sal, levain, leite.",detalhe:"Massa enriquecida com manteiga. Fermentação 18h. Miolo dourado, textura que desfia.",qtd:0,cor:"#F0D68A"},
  ],
  hist:[
    {sem:"Semana 28/03",itens:"1 Pão Original (550g)",st:"Pendente",extra:null},
    {sem:"Semana 21/03",itens:"1 Pão Original (550g)",st:"Entregue",extra:null},
    {sem:"Semana 14/03",itens:"1 Pão Original (550g)",st:"Entregue",extra:{nome:"Focaccia Genovesa",valor:"R$ 32,00"}},
    {sem:"Semana 07/03",itens:"1 Pão Original (550g)",st:"Entregue",extra:null},
  ],
};
const fmt=v=>`R$ ${v.toFixed(2).replace(".",",")}`;
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
  bag:<><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></>,
  edit:<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
};

// ─── COMPONENTS ───
const Photo=({h=120,color="#E0D5C5",label="",accent,style:es})=><div style={{width:"100%",height:h,borderRadius:12,background:accent?`linear-gradient(145deg,${B[100]},${B[50]})`:`linear-gradient(145deg,${color},${W[200]})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:fd,fontSize:11,color:accent?B[400]:W[400],textTransform:"uppercase",letterSpacing:"0.08em",overflow:"hidden",flexShrink:0,...es}}>{label||"foto"}</div>;
const SmPhoto=({w=56,h=44,color="#E0D5C5",style:es})=><div style={{width:w,height:h,borderRadius:8,background:`linear-gradient(135deg,${color},${W[200]})`,flexShrink:0,...es}}/>;
const Card=({children,style,onClick,ariaLabel})=>{const[h,setH]=useState(false);return<div role={onClick?"button":undefined} aria-label={ariaLabel} onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:W[100],border:`1px solid ${h&&onClick?W[300]:W[200]}`,borderRadius:12,padding:16,transition:"border-color 150ms ease",...style}}>{children}</div>;};
const SL=({t})=><div style={{fontFamily:fd,fontSize:15,textTransform:"uppercase",color:W[500],letterSpacing:"0.04em",marginBottom:8,lineHeight:1}}>{t}</div>;
const Badge=({label,type="success"})=>{const s=ST[type]||ST.success;return<span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,fontWeight:500,fontFamily:fb,padding:"4px 10px",borderRadius:4,background:s.bg,color:s.t,border:`1px solid ${s.b}`}}><span style={{fontSize:8}}>●</span>{label}</span>;};
const Btn=({children,primary,disabled,onClick,style:es,full,ariaLabel})=>{const[h,setH]=useState(false);return<button aria-label={ariaLabel} disabled={disabled} onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{padding:"12px 20px",borderRadius:8,border:primary?"none":`1px solid ${h&&!disabled?B[600]:B[500]}`,background:primary?(disabled?W[200]:h?B[600]:B[500]):(h&&!disabled?B[50]:"none"),color:primary?(disabled?W[500]:"#FFF"):B[500],fontFamily:fb,fontSize:14,fontWeight:500,cursor:disabled?"default":"pointer",opacity:disabled?0.5:1,minHeight:44,width:full?"100%":"auto",transition:"all 150ms ease",...es}}>{children}</button>;};
const QtyBtn=({qty,onAdd,onRemove,name})=><div onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}><button aria-label={`Remover ${name}`} onClick={onRemove} className="qb" style={{width:32,height:32,borderRadius:8,border:`1px solid ${W[300]}`,background:"none",cursor:"pointer",fontSize:18,color:W[600],display:"flex",alignItems:"center",justifyContent:"center"}}>−</button><span style={{fontFamily:fb,fontSize:16,fontWeight:600,color:B[500],width:24,textAlign:"center"}}>{qty}</span><button aria-label={`Adicionar ${name}`} onClick={onAdd} className="qb" style={{width:32,height:32,borderRadius:8,border:`1px solid ${B[500]}`,background:B[50],cursor:"pointer",fontSize:18,color:B[500],display:"flex",alignItems:"center",justifyContent:"center"}}>+</button></div>;
const Toast=({msg,vis})=>vis?<div role="status" aria-live="polite" style={{position:"fixed",bottom:72,left:16,right:16,maxWidth:358,margin:"0 auto",background:W[800],color:"#FFF",borderRadius:8,padding:"12px 16px",zIndex:60,fontFamily:fb,fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:8,animation:"fadeUp 300ms ease"}}><I d={ic.check} size={16} color="#6EE7B7"/>{msg}</div>:null;
const DeadlineWarning=()=><div style={{fontFamily:fb,fontSize:12,color:ST.warning.t,background:ST.warning.bg,padding:"8px 12px",borderRadius:8,marginBottom:20,display:"inline-flex",alignItems:"center",gap:8,border:`1px solid ${ST.warning.b}`}}><I d={ic.clock} size={14} color={ST.warning.t}/>Pedidos até terça, 22h, para entrega na quinta</div>;

// ─── MODAL ───
const Modal=({product,onClose,onAction,actionLabel,hint,qty,onAdd,onRemove})=>{
  if(!product)return null;
  return<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(26,24,21,0.5)",zIndex:50,animation:"fadeIn 200ms ease"}}/>
    <div role="dialog" aria-label={`Detalhes: ${product.nome}`} style={{position:"fixed",bottom:0,left:0,right:0,maxWidth:390,margin:"0 auto",background:"#FFF",borderRadius:"16px 16px 0 0",zIndex:51,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 -4px 24px rgba(26,24,21,0.12)",animation:"slideUp 300ms ease"}}>
      <div style={{position:"relative"}}><Photo h={200} color={product.cor||"#D5C8B5"} accent={!!product.historia} label={product.nome}/><button aria-label="Fechar" onClick={onClose} style={{position:"absolute",top:12,right:12,width:36,height:36,borderRadius:9999,background:"rgba(255,255,255,0.9)",border:"none",cursor:"pointer",fontSize:18,color:W[600],display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button></div>
      <div style={{padding:20}}>
        <div style={{fontFamily:fd,fontSize:24,textTransform:"uppercase",color:B[800],letterSpacing:"0.02em",lineHeight:1.2}}>{product.nome}</div>
        <div style={{fontFamily:fb,fontSize:14,color:W[500],marginTop:4}}>{product.peso}</div>
        <div style={{fontFamily:fb,fontSize:20,fontWeight:600,color:B[500],marginTop:8}}>{product.preco}</div>
        <div style={{height:1,background:W[200],margin:"16px 0"}}/>
        {product.ingredientes&&<div style={{marginBottom:16}}><div style={{fontFamily:fd,fontSize:13,textTransform:"uppercase",color:W[400],letterSpacing:"0.04em",marginBottom:6}}>Ingredientes</div><div style={{fontFamily:fb,fontSize:14,color:W[600],lineHeight:1.6}}>{product.ingredientes}</div></div>}
        {product.historia&&<div style={{marginBottom:16,fontFamily:fb,fontSize:14,color:W[700],lineHeight:1.7}}>{product.historia}</div>}
        {product.detalhe&&!product.historia&&<div style={{marginBottom:16}}><div style={{fontFamily:fd,fontSize:13,textTransform:"uppercase",color:W[400],letterSpacing:"0.04em",marginBottom:6}}>Sobre este pão</div><div style={{fontFamily:fb,fontSize:14,color:W[700],lineHeight:1.6}}>{product.detalhe}</div></div>}
        <div style={{marginTop:4}}>
          {qty>0?<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0"}}><div style={{fontFamily:fb,fontSize:14,color:ST.success.t,fontWeight:500,display:"flex",alignItems:"center",gap:6}}><I d={ic.check} size={16} color={ST.success.t}/>Na sua cesta</div><QtyBtn qty={qty} onAdd={onAdd} onRemove={onRemove} name={product.nome}/></div>:<>{onAction&&<Btn primary full onClick={onAction} ariaLabel={actionLabel}>{actionLabel}</Btn>}{hint&&<div style={{fontFamily:fb,fontSize:12,color:W[500],textAlign:"center",marginTop:8}}>{hint}</div>}</>}
        </div>
      </div>
    </div>
  </>;
};

// ─── NAV ───
const Nav=({active,onNav,badge})=>{const items=[{id:"home",label:"INÍCIO",icon:ic.home},{id:"assinatura",label:"ASSINATURA",icon:ic.wheat},{id:"cardapio",label:"CARDÁPIO",icon:ic.utensils},{id:"perfil",label:"PERFIL",icon:ic.user}];return<div style={{display:"flex",justifyContent:"space-around",alignItems:"center",padding:"8px 0 12px",borderTop:`1px solid ${W[200]}`,background:"#FFF",position:"sticky",bottom:0,zIndex:10,minHeight:56}}>{items.map(it=><button key={it.id} aria-label={`Ir para ${it.label}`} onClick={()=>onNav(it.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,border:"none",background:"none",cursor:"pointer",minWidth:56,minHeight:44,padding:"4px 0",position:"relative"}}><I d={it.icon} size={22} color={active===it.id?B[500]:W[400]}/>{it.id==="cardapio"&&badge>0&&<span style={{position:"absolute",top:0,right:4,width:18,height:18,borderRadius:9999,background:B[500],color:"#FFF",fontFamily:fb,fontSize:10,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>{badge}</span>}<span style={{fontFamily:fd,fontSize:11,letterSpacing:"0.02em",textTransform:"uppercase",color:active===it.id?B[500]:W[400]}}>{it.label}</span></button>)}</div>;};

// ─── NOVIDADE CARD ───
const NovidadeCard=({extra,qty,onCardClick,onAdd,onRemove})=><Card style={{padding:0,overflow:"hidden",cursor:"pointer",marginBottom:16}} onClick={onCardClick} ariaLabel={`Novidade: ${extra.nome}`}><Photo h={200} accent label={extra.nome}/><div style={{padding:16}}><SL t="Novidade da semana"/><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><div style={{flex:1}}><div style={{fontFamily:fb,fontSize:18,fontWeight:600,color:W[800]}}>{extra.nome}</div><div style={{fontFamily:fb,fontSize:14,color:W[600],marginTop:4}}>{extra.preco} — Só assinantes</div></div>{qty===0?<button onClick={e=>{e.stopPropagation();onCardClick();}} className="bp" style={{padding:"10px 24px",borderRadius:8,border:"none",background:B[500],color:"#FFF",fontFamily:fb,fontSize:14,fontWeight:500,cursor:"pointer",minHeight:44,flexShrink:0}}>Quero</button>:<QtyBtn qty={qty} onAdd={()=>onAdd&&onAdd()} onRemove={()=>onRemove&&onRemove()} name={extra.nome}/>}</div></div></Card>;

// ─── PEDIDO HELPERS (shared) ───
const cntIn=(list,nome)=>list.filter(p=>p.nome===nome).length;
const addTo=(list,product)=>{const pn=typeof product.precoNum==="number"?product.precoNum:parseFloat(product.preco.replace("R$ ","").replace(",","."));return[...list,{nome:product.nome,preco:product.preco,precoNum:pn}];};
const removeFrom=(list,nome)=>{const i=list.findIndex(p=>p.nome===nome);if(i===-1)return list;return[...list.slice(0,i),...list.slice(i+1)];};
const totalOf=list=>list.reduce((s,p)=>s+p.precoNum,0);

// ═══════════════════════════════════
// HOME
// ═══════════════════════════════════
const Home=({onNav,pending,confirmed,addPending,removePending,updateConfirmed})=>{
  const[modal,setModal]=useState(null);
  const[toast,setToast]=useState(false);
  const[toastMsg,setToastMsg]=useState("");
  const allItems=[...confirmed,...pending];
  const cntAll=n=>cntIn(allItems,n);

  const handleAdd=p=>{
    addPending(p);
    setModal(null);
    setToastMsg(`${p.nome} adicionada. Confirme no Cardápio.`);
    setToast(true);
    setTimeout(()=>setToast(false),5000);
  };

  // Edit confirmed directly via +/- on NovidadeCard
  const handleQtyChange=(product,delta)=>{
    if(confirmed.length>0){
      // Edit confirmed directly
      if(delta>0) updateConfirmed(addTo(confirmed,product));
      else updateConfirmed(removeFrom(confirmed,product.nome));
    } else {
      // No confirmed yet, edit pending
      if(delta>0) addPending(product);
      else removePending(product.nome);
    }
  };

  const confirmedTotal=totalOf(confirmed);

  return<div style={{padding:"24px 16px 16px"}}>
    <h1 style={{fontFamily:fd,fontSize:30,textTransform:"uppercase",color:B[800],letterSpacing:"0.02em",margin:"0 0 20px",lineHeight:1.1}}>Oi, {D.nome}, {greet()}!</h1>

    {/* Card entrega compacto */}
    <Card style={{marginBottom:16,padding:12}} ariaLabel={`Próxima entrega: ${D.entrega.dia}`}>
      <div style={{display:"flex",gap:12,alignItems:"center"}}>
        <SmPhoto w={56} h={48} color="#E8D5B7"/>
        <div style={{flex:1}}>
          <div style={{fontFamily:fd,fontSize:13,textTransform:"uppercase",color:W[400],letterSpacing:"0.04em",marginBottom:2}}>Sua próxima entrega</div>
          <div style={{fontFamily:fb,fontSize:18,fontWeight:600,color:W[800]}}>{D.entrega.dia}</div>
          <div style={{fontFamily:fb,fontSize:13,color:W[600],marginTop:2}}>{D.entrega.produto}</div>
        </div>
        <I d={ic.cal} size={20} color={B[400]}/>
      </div>
    </Card>

    {/* ═══ CARD PEDIDO DA SEMANA (confirmados) ═══ */}
    {confirmed.length>0&&<Card style={{marginBottom:16,border:`1px solid ${B[200]}`,background:B[50]}} ariaLabel="Seu pedido desta semana">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <SL t="Seu pedido desta semana"/>
        <Badge label="Confirmado" type="success"/>
      </div>
      {/* Group by name with qty */}
      {Object.entries(confirmed.reduce((acc,p)=>{acc[p.nome]=(acc[p.nome]||0)+1;return acc;},{})).map(([nome,qty])=>{
        const item=confirmed.find(p=>p.nome===nome);
        return<div key={nome} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0"}}>
          <div style={{fontFamily:fb,fontSize:14,color:B[800]}}>{qty}× {nome}</div>
          <div style={{fontFamily:fb,fontSize:14,fontWeight:600,color:B[500]}}>{fmt(item.precoNum*qty)}</div>
        </div>;
      })}
      <div style={{height:1,background:B[200],margin:"8px 0"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontFamily:fb,fontSize:15,fontWeight:600,color:B[800]}}>{fmt(confirmedTotal)}</div>
          <div style={{fontFamily:fb,fontSize:11,color:B[700]}}>Entrega: {D.entrega.dia} — Na fatura de abril</div>
        </div>
        <button onClick={()=>onNav("cardapio")} className="lk" style={{fontFamily:fb,fontSize:13,color:B[500],fontWeight:500,cursor:"pointer",background:"none",border:"none",display:"flex",alignItems:"center",gap:4}}>
          <I d={ic.edit} size={14} color={B[500]}/>Editar
        </button>
      </div>
    </Card>}

    {/* Novidade hero */}
    {D.extras.length>0?
      <NovidadeCard extra={D.extras[0]} qty={cntAll(D.extras[0].nome)} onCardClick={()=>setModal(D.extras[0])} onAdd={()=>handleQtyChange(D.extras[0],1)} onRemove={()=>handleQtyChange(D.extras[0],-1)}/>
    :<Card style={{marginBottom:16,padding:20,textAlign:"center"}}><div style={{fontFamily:fd,fontSize:15,textTransform:"uppercase",color:W[400],marginBottom:8}}>Novidades da semana</div><div style={{fontFamily:fb,fontSize:14,color:W[500],lineHeight:1.6}}>Nenhuma novidade esta semana. Mas seu pão de sempre está garantido.</div></Card>}

    <div onClick={()=>onNav("cardapio")} className="lk" style={{fontFamily:fb,fontSize:14,color:B[500],fontWeight:500,textAlign:"center",padding:"8px 0",cursor:"pointer"}}>Ver cardápio completo ›</div>

    {modal&&<Modal product={modal} onClose={()=>setModal(null)} onAction={()=>handleAdd(modal)} actionLabel="Adicionar à cesta" hint="Cobrado na próxima fatura" qty={cntAll(modal.nome)} onAdd={()=>handleQtyChange(modal,1)} onRemove={()=>handleQtyChange(modal,-1)}/>}
    <Toast msg={toastMsg} vis={toast}/>
  </div>;
};

// ═══════════════════════════════════
// ASSINATURA
// ═══════════════════════════════════
const Assinatura=({onNav})=>{
  const[editing,setEditing]=useState(false);
  const[qtds,setQtds]=useState(D.pães.map(p=>p.qtd));
  const[saved,setSaved]=useState(false);
  const[showCalc,setShowCalc]=useState(false);
  const total=qtds.reduce((s,q)=>s+q,0);
  const mensal=D.pães.reduce((s,p,i)=>s+qtds[i]*p.precoNum*4,0);
  const orig=D.pães.reduce((s,p)=>s+p.qtd*p.precoNum*4,0);
  const changed=qtds.some((q,i)=>q!==D.pães[i].qtd);
  const diff=mensal-orig;
  const prop=Math.abs(diff/4*D.semanasRestantes);
  const upd=(i,d)=>setQtds(p=>{const n=[...p];const v=n[i]+d;const t=total+d;if(v<0||t>3)return p;n[i]=v;return n;});
  const handleSave=()=>{setEditing(false);setSaved(true);setTimeout(()=>setSaved(false),5000);};

  return<div style={{padding:"24px 16px 16px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{fontFamily:fd,fontSize:26,textTransform:"uppercase",color:B[800],margin:0}}>Sua Assinatura</h2><Badge label="Ativa"/></div>
    <div style={{background:B[50],borderRadius:12,padding:16,marginBottom:16,fontFamily:fb,fontSize:14,color:B[800],lineHeight:1.6}}>Toda semana você recebe pão fresco na porta da sua casa. Você escolhe os pães, a gente cuida do resto.</div>

    <Card style={{marginBottom:12}}><SL t="Minha cesta"/>
      <div style={{display:"flex",gap:12,alignItems:"center"}}><SmPhoto w={56} h={48} color="#E8D5B7"/><div style={{flex:1}}><div style={{fontFamily:fb,fontSize:16,fontWeight:600,color:W[800]}}>{D.cesta.nome}</div><div style={{fontFamily:fb,fontSize:13,color:W[600]}}>{D.cesta.itens}</div><div style={{fontFamily:fb,fontSize:15,fontWeight:600,color:B[500],marginTop:4}}>{D.cesta.valor}</div></div></div>
      {!editing&&<Btn full onClick={()=>setEditing(true)} style={{marginTop:12}}>Alterar minha cesta</Btn>}
      {editing&&<div style={{marginTop:16,borderTop:`1px solid ${W[200]}`,paddingTop:16}}>
        <DeadlineWarning/>
        <div style={{fontFamily:fb,fontSize:12,color:W[500],marginBottom:12}}>Limite: 3 pães/semana ({total}/3)</div>
        {D.pães.map((p,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:i<D.pães.length-1?`1px solid ${W[100]}`:"none"}}><div style={{flex:1}}><div style={{fontFamily:fb,fontSize:14,fontWeight:600,color:W[800]}}>{p.nome} <span style={{fontWeight:400,fontSize:12,color:W[500]}}>({p.peso})</span></div><div style={{fontFamily:fb,fontSize:12,color:W[600],marginTop:4}}>{p.preco}/un</div></div><div style={{display:"flex",alignItems:"center",gap:8}}><button onClick={()=>upd(i,-1)} disabled={qtds[i]===0} className="qb" style={{width:32,height:32,borderRadius:8,border:`1px solid ${qtds[i]>0?W[300]:W[200]}`,background:"none",cursor:qtds[i]>0?"pointer":"default",fontSize:18,color:qtds[i]>0?W[600]:W[300],display:"flex",alignItems:"center",justifyContent:"center",opacity:qtds[i]===0?0.4:1}}>−</button><span style={{fontFamily:fb,fontSize:16,fontWeight:600,color:qtds[i]>0?B[500]:W[400],width:24,textAlign:"center"}}>{qtds[i]}</span><button onClick={()=>upd(i,1)} disabled={total>=3} className="qb" style={{width:32,height:32,borderRadius:8,border:`1px solid ${total<3?B[500]:W[200]}`,background:total<3?B[50]:"none",cursor:total<3?"pointer":"default",fontSize:18,color:total<3?B[500]:W[300],display:"flex",alignItems:"center",justifyContent:"center",opacity:total>=3?0.4:1}}>+</button></div></div>)}
        <div style={{fontFamily:fb,fontSize:15,fontWeight:600,color:W[800],textAlign:"right",padding:"12px 0 4px"}}>Novo valor mensal: <span style={{color:B[500]}}>{fmt(mensal)}</span></div>
        {changed&&<><div style={{fontFamily:fb,fontSize:12,color:W[500],textAlign:"right",marginBottom:4}}>Antes: {fmt(orig)} → Depois: {fmt(mensal)}</div>
          <div onClick={()=>setShowCalc(!showCalc)} style={{background:B[50],borderRadius:8,padding:"10px 12px",marginBottom:12,cursor:"pointer",border:`1px solid ${B[100]}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontFamily:fb,fontSize:13,color:B[700]}}>Ajuste neste mês: <span style={{fontWeight:600}}>{diff>0?"+":""}{fmt(prop)}</span></div><I d={ic.chevDown} size={16} color={B[400]}/></div>
            {showCalc&&<div style={{marginTop:8,fontFamily:fb,fontSize:12,color:B[600],lineHeight:1.6,animation:"fadeUp 200ms ease"}}>Faltam {D.semanasRestantes} semanas neste mês.<br/>Diferença semanal: {diff>0?"+":""}{fmt(Math.abs(diff/4))}/semana<br/>Cobrado proporcionalmente na próxima fatura: {diff>0?"+":""}{fmt(prop)}</div>}
          </div>
        </>}
        <div style={{display:"flex",gap:8}}><Btn onClick={()=>{setEditing(false);setQtds(D.pães.map(p=>p.qtd));setShowCalc(false);}} style={{flex:1}}>Cancelar</Btn><Btn primary disabled={!changed} onClick={handleSave} style={{flex:2}}>{changed?"Salvar":"Faça uma alteração"}</Btn></div>
      </div>}
    </Card>
    <Toast msg="Cesta atualizada! O novo valor começa a valer esta semana." vis={saved}/>

    <Card style={{marginBottom:12}}><SL t="Entrega"/><div style={{fontFamily:fb,fontSize:16,fontWeight:600,color:W[800],marginBottom:4}}>Entregas às {D.ent.dia.toLowerCase()}</div><div style={{fontFamily:fb,fontSize:13,color:W[600]}}>{D.ent.cond}, {D.ent.bloco}</div><div style={{fontFamily:fb,fontSize:13,color:W[500],marginBottom:8}}>Frete: {D.ent.frete}</div><div style={{fontFamily:fb,fontSize:12,color:B[700],background:B[50],padding:"8px 12px",borderRadius:8,marginBottom:8,display:"flex",gap:8,alignItems:"flex-start"}}><I d={ic.users} size={16} color={B[500]}/><span>Traga 5 moradores do seu prédio e tenha entrega gratuita.</span></div><div className="lk" style={{fontFamily:fb,fontSize:13,color:B[500],fontWeight:500,cursor:"pointer"}}>Editar endereço ›</div></Card>
    <Card style={{marginBottom:12}}><SL t="Cobrança"/><div style={{fontFamily:fb,fontSize:16,fontWeight:600,color:W[800],marginBottom:4}}>Mensal no cartão</div><div style={{fontFamily:fb,fontSize:13,color:W[600]}}>{D.cartao.band} ••••{D.cartao.n}</div><div style={{fontFamily:fb,fontSize:13,color:W[500],marginBottom:8}}>Próxima: {D.cartao.prox}</div><div className="lk" style={{fontFamily:fb,fontSize:13,color:B[500],fontWeight:500,cursor:"pointer"}}>Atualizar cartão ›</div></Card>
    <Card onClick={()=>onNav("perfil")} style={{marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} ariaLabel="Ver histórico"><div style={{display:"flex",alignItems:"center",gap:12}}><I d={ic.file} size={20} color={B[500]}/><div><div style={{fontFamily:fb,fontSize:14,fontWeight:500,color:W[700]}}>Histórico de entregas e cobranças</div><div style={{fontFamily:fb,fontSize:12,color:W[500]}}>{D.cob.mes} — {D.cob.valor} — {D.cob.status}</div></div></div><I d={ic.chev} size={16} color={W[400]}/></Card>
  </div>;
};

// ═══════════════════════════════════
// CARDÁPIO
// ═══════════════════════════════════
const Cardapio=({pending,confirmed,setPending,setConfirmed})=>{
  const[exp,setExp]=useState(null);
  const[modal,setModal]=useState(null);
  const[justConfirmed,setJustConfirmed]=useState(false);
  const allItems=[...confirmed,...pending];
  const cntAll=n=>cntIn(allItems,n);
  const totalPending=totalOf(pending);

  const addItem=p=>{setPending(prev=>addTo(prev,p));};
  const removeItem=n=>{
    // Remove from pending first, then confirmed
    const pi=pending.findIndex(p=>p.nome===n);
    if(pi!==-1){setPending(prev=>removeFrom(prev,n));return;}
    const ci=confirmed.findIndex(p=>p.nome===n);
    if(ci!==-1) setConfirmed(prev=>removeFrom(prev,n));
  };

  const handleConfirm=()=>{
    setConfirmed(prev=>[...prev,...pending]);
    setPending([]);
    setJustConfirmed(true);
    setTimeout(()=>setJustConfirmed(false),4000);
  };

  return<div style={{padding:"24px 16px 80px"}}>
    <h2 style={{fontFamily:fd,fontSize:26,textTransform:"uppercase",color:B[800],margin:"0 0 4px"}}>Cardápio</h2>
    <div style={{fontFamily:fb,fontSize:13,color:W[500],marginBottom:12}}>Peça itens extras para esta semana</div>
    <DeadlineWarning/>

    {/* Confirmados visíveis no topo */}
    {confirmed.length>0&&<div style={{background:ST.success.bg,borderRadius:8,padding:"10px 12px",marginBottom:16,border:`1px solid ${ST.success.b}`,display:"flex",alignItems:"center",gap:8}}>
      <I d={ic.check} size={16} color={ST.success.t}/>
      <span style={{fontFamily:fb,fontSize:13,color:ST.success.t,fontWeight:500}}>
        {Object.entries(confirmed.reduce((a,p)=>{a[p.nome]=(a[p.nome]||0)+1;return a;},{})).map(([n,q])=>`${q}× ${n}`).join(", ")} — confirmado
      </span>
    </div>}

    {D.extras.length>0?D.extras.map((ex,i)=><NovidadeCard key={i} extra={ex} qty={cntAll(ex.nome)} onCardClick={()=>setModal(ex)} onAdd={()=>addItem(ex)} onRemove={()=>removeItem(ex.nome)}/>):<Card style={{marginBottom:16,padding:20,textAlign:"center"}}><div style={{fontFamily:fb,fontSize:14,color:W[500]}}>Nenhuma novidade esta semana.</div></Card>}

    <div style={{height:1,background:W[200],margin:"4px 0 20px"}}/>
    <div style={{fontFamily:fd,fontSize:16,textTransform:"uppercase",color:B[800],letterSpacing:"0.02em",marginBottom:12}}>Nossos pães</div>

    {D.pães.map((p,i)=>{const q=cntAll(p.nome);const isExp=exp===i;return<Card key={i} style={{marginBottom:8}}>
      <div style={{display:"flex",gap:12,alignItems:"center"}}>
        <SmPhoto w={64} h={52} color={p.cor} onClick={()=>setExp(isExp?null:i)} style={{cursor:"pointer",borderRadius:8}}/>
        <div onClick={()=>setExp(isExp?null:i)} style={{flex:1,cursor:"pointer"}}><div style={{fontFamily:fb,fontSize:14,fontWeight:600,color:W[800]}}>{p.nome} <span style={{fontWeight:400,fontSize:12,color:W[500]}}>({p.peso})</span></div><div style={{fontFamily:fb,fontSize:12,color:W[500],marginTop:4,lineHeight:1.4}}>{p.desc}</div><div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}><span style={{fontFamily:fb,fontSize:12,color:W[600]}}>{p.preco}/un</span><I d={ic.chevDown} size={14} color={W[400]}/></div></div>
        {q===0?<button onClick={()=>addItem(p)} className="bp" style={{padding:"8px 16px",borderRadius:8,border:"none",background:B[500],color:"#FFF",fontFamily:fb,fontSize:12,fontWeight:500,cursor:"pointer",flexShrink:0,minHeight:40}}>Pedir</button>:<QtyBtn qty={q} onAdd={()=>addItem(p)} onRemove={()=>removeItem(p.nome)} name={p.nome}/>}
      </div>
      {isExp&&<div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${W[200]}`,animation:"fadeUp 200ms ease"}}><div style={{fontFamily:fd,fontSize:12,textTransform:"uppercase",color:W[400],letterSpacing:"0.04em",marginBottom:4}}>Ingredientes</div><div style={{fontFamily:fb,fontSize:13,color:W[600],lineHeight:1.5,marginBottom:12}}>{p.ingredientes}</div><div style={{fontFamily:fd,fontSize:12,textTransform:"uppercase",color:W[400],letterSpacing:"0.04em",marginBottom:4}}>Sobre este pão</div><div style={{fontFamily:fb,fontSize:13,color:W[700],lineHeight:1.6}}>{p.detalhe}</div></div>}
    </Card>;})}

    {/* Rodapé: só pending não confirmados */}
    {pending.length>0&&!justConfirmed&&<div style={{position:"fixed",bottom:56,left:0,right:0,maxWidth:390,margin:"0 auto",background:"#FFF",borderTop:`1px solid ${W[200]}`,padding:"12px 16px",zIndex:5}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontFamily:fb,fontSize:12,color:W[600]}}>{pending.length} {pending.length===1?"novo item":"novos itens"}</div><div style={{fontFamily:fb,fontSize:15,fontWeight:600,color:W[800]}}>{fmt(totalPending)}</div></div><Btn primary onClick={handleConfirm}>Confirmar</Btn></div>
      <div style={{fontFamily:fb,fontSize:11,color:W[500],marginTop:4}}>Além da sua assinatura. Cobrado na próxima fatura.</div>
    </div>}

    {justConfirmed&&<div style={{position:"fixed",bottom:56,left:0,right:0,maxWidth:390,margin:"0 auto",background:ST.success.bg,borderTop:`1px solid ${ST.success.b}`,padding:"16px",zIndex:5,textAlign:"center",animation:"fadeUp 300ms ease"}}><div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:4}}><I d={ic.check} size={18} color={ST.success.t}/><span style={{fontFamily:fb,fontSize:15,fontWeight:600,color:ST.success.t}}>Pedido confirmado!</span></div><div style={{fontFamily:fb,fontSize:13,color:ST.success.t}}>Seus extras serão entregues na próxima quinta.</div></div>}

    {modal&&<Modal product={modal} onClose={()=>setModal(null)} onAction={()=>{addItem(modal);setModal(null);}} actionLabel="Adicionar à cesta" hint="Cobrado na próxima fatura" qty={cntAll(modal.nome)} onAdd={()=>addItem(modal)} onRemove={()=>removeItem(modal.nome)}/>}
  </div>;
};

// ═══════════════════════════════════
// PERFIL
// ═══════════════════════════════════
const Perfil=({confirmed})=>{
  const[cpf,setCpf]=useState(false);
  const dados=[["Endereço","Ed. Boa Vista, Bl. A / 502"],["Dia de entrega","Quintas-feiras"],["WhatsApp","(21) 99876-5432"],["E-mail","beatriz@email.com"],["CPF",cpf?"123.456.789-00":"•••.•••.789-00"]];
  const confirmedTotal=totalOf(confirmed);

  return<div style={{padding:"24px 16px 16px"}}>
    <h2 style={{fontFamily:fd,fontSize:26,textTransform:"uppercase",color:B[800],margin:"0 0 20px"}}>Perfil</h2>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><div style={{width:48,height:48,borderRadius:9999,background:B[50],display:"flex",alignItems:"center",justifyContent:"center",fontFamily:fd,fontSize:20,color:B[500],textTransform:"uppercase"}}>B</div><div><div style={{fontFamily:fb,fontSize:16,fontWeight:600,color:W[800]}}>Beatriz Silva</div><div style={{fontFamily:fb,fontSize:12,color:W[500]}}>beatriz@email.com</div></div></div>

    <Card style={{marginBottom:12}}><SL t="Dados pessoais"/>{dados.map(([l,v],i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:i<dados.length-1?`1px solid ${W[100]}`:"none"}}><div><div style={{fontFamily:fb,fontSize:11,color:W[400],marginBottom:2}}>{l}</div><div style={{fontFamily:fb,fontSize:13,color:W[700]}}>{v}</div></div>{l==="CPF"?<button aria-label={cpf?"Ocultar CPF":"Mostrar CPF"} onClick={()=>setCpf(!cpf)} style={{background:"none",border:"none",cursor:"pointer",padding:4,minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center"}}><I d={cpf?ic.eyeOff:ic.eye} size={16} color={W[400]}/></button>:<I d={ic.chev} size={14} color={W[400]}/>}</div>)}</Card>

    {/* Histórico com destaque na semana corrente */}
    <Card style={{marginBottom:12}}><SL t="Histórico de entregas e cobranças"/>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><I d={ic.check} size={14} color={ST.success.t}/><span style={{fontFamily:fb,fontSize:13,fontWeight:500,color:ST.success.t}}>Tudo em dia</span></div>

      {/* Semana corrente com extras confirmados — DESTAQUE */}
      {confirmed.length>0&&<div style={{padding:12,borderRadius:8,background:B[50],border:`1px solid ${B[200]}`,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <span style={{fontFamily:fb,fontSize:12,color:B[700],fontWeight:500}}>Esta semana</span>
          <Badge label="Confirmado" type="success"/>
        </div>
        <div style={{fontFamily:fb,fontSize:13,color:B[800]}}>{D.entrega.produto}</div>
        {Object.entries(confirmed.reduce((a,p)=>{a[p.nome]=(a[p.nome]||0)+1;return a;},{})).map(([n,q])=>
          <div key={n} style={{fontFamily:fb,fontSize:12,color:B[500],marginTop:4}}>+ {q}× {n} — {fmt(confirmed.find(p=>p.nome===n).precoNum*q)}</div>
        )}
        <div style={{fontFamily:fb,fontSize:12,color:B[700],marginTop:4,fontWeight:500}}>Total extras: {fmt(confirmedTotal)}</div>
      </div>}

      {D.hist.map((h,i)=><div key={i} style={{padding:"12px 0",borderBottom:i<D.hist.length-1?`1px solid ${W[100]}`:"none"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontFamily:fb,fontSize:12,color:W[400]}}>{h.sem}</span><Badge label={h.st} type={h.st==="Entregue"?"success":"info"}/></div><div style={{fontFamily:fb,fontSize:13,color:W[700],marginTop:4}}>{h.itens}</div>{h.extra&&<div style={{fontFamily:fb,fontSize:12,color:B[500],marginTop:4}}>+ {h.extra.nome} — {h.extra.valor}</div>}</div>)}

      <div style={{marginTop:12,padding:12,borderRadius:8,background:W[50],border:`1px solid ${W[200]}`}}><div style={{fontFamily:fb,fontSize:12,color:W[400],marginBottom:4}}>Cobrança do mês</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontFamily:fb,fontSize:14,fontWeight:600,color:W[800]}}>{D.cob.mes} — {D.cob.valor}</span><Badge label="Pago"/></div></div>
      <div style={{marginTop:8,padding:12,borderRadius:8,background:B[50],border:`1px solid ${B[100]}`}}><div style={{fontFamily:fb,fontSize:12,color:B[700],marginBottom:4}}>Próxima fatura (abril)</div><div style={{fontFamily:fb,fontSize:13,color:B[800],lineHeight:1.6}}>Assinatura: R$ 98,00<br/>+ Extras: {fmt(confirmedTotal||22)}<br/>+ Frete: R$ 15,00<br/><span style={{fontWeight:600}}>= {fmt(98+15+(confirmedTotal||22))} (estimado)</span></div></div>
    </Card>

    <Card style={{marginBottom:12}}><SL t="Cartão"/><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontFamily:fb,fontSize:14,fontWeight:500,color:W[800]}}>{D.cartao.band} ••••{D.cartao.n}</div><div style={{fontFamily:fb,fontSize:12,color:W[500],marginTop:4}}>Próxima: {D.cartao.prox}</div></div><Btn style={{padding:"8px 16px",fontSize:12}}>Atualizar</Btn></div></Card>
    <Card style={{marginBottom:12}}><div style={{fontFamily:fb,fontSize:14,color:W[700],marginBottom:12,lineHeight:1.5}}>Precisa pausar ou cancelar? Fale pelo WhatsApp.</div><button className="bw" style={{width:"100%",padding:"12px 0",borderRadius:8,background:"#25D366",color:"#FFF",border:"none",fontFamily:fb,fontSize:14,fontWeight:500,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,minHeight:44}}><I d={ic.msg} size={18} color="#FFF"/>Falar pelo WhatsApp</button></Card>
    <button className="bl" style={{width:"100%",padding:"12px 0",borderRadius:8,background:"none",color:W[500],border:`1px solid ${W[300]}`,fontFamily:fb,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,minHeight:44}}><I d={ic.logout} size={16} color={W[500]}/>Sair da conta</button>
  </div>;
};

// ═══════════════════════════════════
// APP
// ═══════════════════════════════════
export default function CoraPortal(){
  const[scr,setScr]=useState("home");
  const[pending,setPending]=useState([]);      // aguardando confirmação
  const[confirmed,setConfirmed]=useState([]);  // pedidos confirmados da semana

  const addPending=p=>setPending(prev=>addTo(prev,p));
  const removePending=n=>setPending(prev=>removeFrom(prev,n));

  return<div style={{fontFamily:fb,maxWidth:390,margin:"0 auto",background:W[50],minHeight:"100vh",display:"flex",flexDirection:"column"}}>
    <div style={{padding:"12px 16px",background:"#FFF",borderBottom:`1px solid ${W[200]}`,position:"sticky",top:0,zIndex:10}}><div style={{fontFamily:fd,fontSize:22,color:B[500],textTransform:"uppercase",letterSpacing:"0.02em"}}>cora</div></div>
    <div style={{flex:1,overflowY:"auto"}}>
      {scr==="home"&&<Home onNav={setScr} pending={pending} confirmed={confirmed} addPending={addPending} removePending={removePending} updateConfirmed={setConfirmed}/>}
      {scr==="assinatura"&&<Assinatura onNav={setScr}/>}
      {scr==="cardapio"&&<Cardapio pending={pending} confirmed={confirmed} setPending={setPending} setConfirmed={setConfirmed}/>}
      {scr==="perfil"&&<Perfil confirmed={confirmed}/>}
    </div>
    <Nav active={scr} onNav={setScr} badge={pending.length}/>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=League+Gothic&family=Montagu+Slab:wght@400;500;600;700&display=swap');*{box-sizing:border-box;margin:0}body{margin:0}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}.bp:hover{background:${B[600]}!important}.bw:hover{background:#1FAF54!important}.bl:hover{background:${W[100]}!important}.lk:hover{text-decoration:underline}.qb:hover:not(:disabled){background:${W[100]}!important}button:focus-visible{outline:none;box-shadow:0 0 0 3px ${B[50]},0 0 0 5px ${B[500]}}`}</style>
  </div>;
}