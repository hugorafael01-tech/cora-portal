import { useState } from "react";
import ProductCard from "../components/ProductCard";

const B={50:"#EBEEFB",100:"#C4CDF4",200:"#8B9BE6",400:"#5670D8",500:"#2E55CD",600:"#2545A8",700:"#1D3787",800:"#172E6E"};
const W={50:"#FAFAF8",100:"#F5F4F0",200:"#E8E6E1",300:"#D4D1CA",400:"#A8A49C",500:"#7A766E",600:"#5C5850",700:"#3D3A34",800:"#2A2723"};
const fb="'Montagu Slab',Georgia,Palatino,serif";
const fd="'League Gothic',Impact,'Arial Narrow',sans-serif";

const WEBHOOK_URL="https://hook.us2.make.com/e8gu7ih2gfoggsac7irq2k1p967gd8t1";

const PRODUTOS=[
  {id:"original",nome:"Pão Original",peso:"580g",img:"/images/_original.jpg",desc:"Farinha, água, sal e o levain da Cora. Fermentação longa de 36h.",ingredientes:"Farinha de trigo, água, sal, levain da Cora.",detalhe:"Crosta firme, miolo aberto com alvéolos irregulares. O pão que começou tudo."},
  {id:"integral",nome:"Pão Integral",peso:"614g",img:"/images/_integral.jpg",desc:"100% integral com linhaça e girassol. Mesma fermentação longa.",ingredientes:"Farinha integral, água, sal, levain, linhaça, girassol.",detalhe:"Sementes tostadas que dão crocância. Miolo denso e nutritivo."},
  {id:"multigraos",nome:"Multi Grãos",peso:"631g",img:"/images/_multigraos.jpg",desc:"Aveia, centeio, gergelim e mel. Miolo denso, casca com gergelim.",ingredientes:"Farinha de trigo, centeio, aveia, água, mel, sal, levain, gergelim.",detalhe:"Cinco grãos na massa, mel na fermentação. Casca com gergelim tostado."},
  {id:"brioche",nome:"Brioche",peso:"400g",img:"/images/_brioche.jpg",desc:"Manteiga, ovos e levain. Fermentação 18h. Miolo dourado.",ingredientes:"Farinha, manteiga, ovos, açúcar, sal, levain, leite.",detalhe:"Massa enriquecida com manteiga. Textura que desfia."},
];

const H=({children,size=24,color=B[800]})=>(
  <div style={{fontFamily:fd,fontSize:size,textTransform:"uppercase",letterSpacing:"0.02em",color,lineHeight:1.1}}>{children}</div>
);

const Label=({children,required})=>(
  <label style={{display:"block",fontSize:14,fontWeight:500,color:W[700],marginBottom:6,fontFamily:fb}}>
    {children}{required&&<span style={{color:B[500],marginLeft:2}}>*</span>}
  </label>
);

const Input=({value,onChange,placeholder,type="text",error})=>(
  <input type={type} value={value} onChange={onChange} placeholder={placeholder}
    style={{width:"100%",padding:"12px 14px",fontSize:15,fontFamily:fb,color:W[800],background:"#FFF",
      border:`1.5px solid ${error?"#EF4444":W[200]}`,borderRadius:8,outline:"none",
      boxSizing:"border-box",transition:"border-color 150ms"}}
    onFocus={e=>e.target.style.borderColor=B[400]}
    onBlur={e=>e.target.style.borderColor=error?"#EF4444":W[200]}
  />
);

const Btn=({children,onClick,primary,disabled})=>(
  <button onClick={onClick} disabled={disabled} style={{
    width:"100%",padding:"14px 20px",borderRadius:8,
    border:primary?"none":`1.5px solid ${W[300]}`,
    background:primary?(disabled?W[300]:B[500]):"transparent",
    color:primary?"#FFF":W[600],fontSize:15,fontWeight:600,fontFamily:fb,
    cursor:disabled?"not-allowed":"pointer",transition:"background 150ms",opacity:disabled?0.6:1,
  }}>{children}</button>
);

const formatWpp=v=>{
  const d=v.replace(/\D/g,"").slice(0,11);
  if(d.length<=2)return d;
  if(d.length<=7)return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
};

/* ══ SPLASH ══ */
const SplashScreen=({onDentro,onFora})=>(
  <div style={{display:"flex",flexDirection:"column",padding:"40px 24px 32px",minHeight:"100%"}}>
    <div style={{marginBottom:40}}>
      <img src="/images/cora_logo_com_tag.svg" alt="Cora" style={{height:48}}
        onError={e=>e.target.style.display="none"}/>
    </div>
    <div style={{flex:1}}>
      <H size={28} color={B[800]}>PÃO DE FERMENTAÇÃO NATURAL, TODA SEMANA NA SUA PORTA.</H>
      <div style={{fontFamily:fb,fontSize:16,color:W[500],marginTop:10,lineHeight:1.6}}>
        Você escolhe, a gente assa. Sem loja física, sem sobra. Cada fornada feita sob medida.
      </div>
      <div style={{marginTop:32,padding:16,background:B[50],borderRadius:12,border:`1px solid ${B[100]}`}}>
        <div style={{fontFamily:fd,fontSize:13,textTransform:"uppercase",letterSpacing:"0.04em",color:B[700],marginBottom:8}}>
          Área de entrega
        </div>
        <div style={{fontFamily:fb,fontSize:14,color:B[800],lineHeight:1.8}}>
          📍 Niterói — Icaraí e região<br/>
          📍 Rio de Janeiro — Zona Sul
        </div>
      </div>
      <div style={{fontFamily:fb,fontSize:15,color:W[700],fontWeight:500,marginTop:28,marginBottom:16}}>
        Você mora em uma dessas regiões?
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <Btn primary onClick={onDentro}>Sim, moro por aqui</Btn>
        <Btn onClick={onFora}>Ainda não entregam na minha região</Btn>
      </div>
    </div>
  </div>
);

/* ══ FORA DA ÁREA ══ */
const ForaScreen=({onSubmit})=>{
  const[nome,setNome]=useState("");
  const[whatsapp,setWhatsapp]=useState("");
  const[cidade,setCidade]=useState("");
  const[bairro,setBairro]=useState("");
  const[optin,setOptin]=useState(false);
  const[loading,setLoading]=useState(false);
  const canSubmit=nome.trim()&&whatsapp.replace(/\D/g,"").length>=10;

  const handleSubmit=async()=>{
    if(!canSubmit)return;
    setLoading(true);
    try{
      await fetch(WEBHOOK_URL,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({nome:nome.trim(),whatsapp:whatsapp.replace(/\D/g,""),
          cidade:cidade||"Não informado",bairro:bairro.trim()||"Não informado",
          optin_mailing:optin?"Sim":"Não",
          tipo:"fora_da_area",data:new Date().toLocaleDateString("pt-BR")})});
    }catch(_){}
    setLoading(false);
    onSubmit(nome.trim().split(" ")[0]);
  };

  return(
    <div style={{padding:"24px 24px 32px",display:"flex",flexDirection:"column",gap:20}}>
      <div>
        <H size={22}>Ainda não chegamos aí</H>
        <div style={{fontFamily:fb,fontSize:14,color:W[500],marginTop:8,lineHeight:1.6}}>
          Mas pode estar a caminho. Deixa seu contato que a gente avisa quando a Cora chegar na sua região.
        </div>
      </div>
      <div>
        <Label required>Nome</Label>
        <Input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Como você se chama?"/>
      </div>
      <div>
        <Label required>WhatsApp com DDD</Label>
        <Input value={whatsapp} onChange={e=>setWhatsapp(formatWpp(e.target.value))} placeholder="(21) 99999-0000" type="tel"/>
      </div>
      <div>
        <Label>Cidade</Label>
        <select value={cidade} onChange={e=>setCidade(e.target.value)}
          style={{width:"100%",padding:"12px 14px",fontSize:15,fontFamily:fb,color:cidade?W[800]:W[400],
            background:"#FFF",border:`1.5px solid ${W[200]}`,borderRadius:8,outline:"none",
            appearance:"none",backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23A8A49C' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
            backgroundRepeat:"no-repeat",backgroundPosition:"right 14px center"}}>
          <option value="">Selecione...</option>
          <option value="Niterói">Niterói</option>
          <option value="Rio de Janeiro">Rio de Janeiro</option>
          <option value="Outra">Outra cidade</option>
        </select>
      </div>
      <div>
        <Label>Bairro</Label>
        <Input value={bairro} onChange={e=>setBairro(e.target.value)} placeholder="Ex: Santa Rosa, Flamengo..."/>
      </div>
      <div onClick={()=>setOptin(!optin)}
        style={{display:"flex",gap:12,alignItems:"flex-start",padding:"14px",cursor:"pointer",
          background:optin?B[50]:"#FFF",borderRadius:10,border:`1.5px solid ${optin?B[400]:W[200]}`,transition:"all 150ms"}}>
        <div style={{width:20,height:20,borderRadius:4,flexShrink:0,marginTop:1,
          border:`2px solid ${optin?B[500]:W[300]}`,background:optin?B[500]:"#FFF",
          display:"flex",alignItems:"center",justifyContent:"center",transition:"all 150ms"}}>
          {optin&&<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        <div style={{fontFamily:fb,fontSize:13,color:optin?B[700]:W[600],lineHeight:1.5}}>
          Quero entrar na lista de avisos da Cora — vou receber novidades sobre o lançamento e quando as entregas chegarem na minha região.
        </div>
      </div>
      <Btn primary disabled={!canSubmit||loading} onClick={handleSubmit}>
        {loading?"Enviando...":"Me avisa quando chegar"}
      </Btn>
    </div>
  );
};

/* ══ FORMULÁRIO (dentro da área) ══ */
const FormScreen=({onSubmit})=>{
  const[nome,setNome]=useState("");
  const[whatsapp,setWhatsapp]=useState("");
  const[cidade,setCidade]=useState("");
  const[bairro,setBairro]=useState("");
  const[produtos,setProdutos]=useState({});
  const[optin,setOptin]=useState(false);
  const[errors,setErrors]=useState({});
  const[loading,setLoading]=useState(false);

  const validate=()=>{
    const e={};
    if(!nome.trim())e.nome=true;
    if(whatsapp.replace(/\D/g,"").length<10)e.whatsapp=true;
    setErrors(e);
    return Object.keys(e).length===0;
  };

  const handleSubmit=async()=>{
    if(!validate())return;
    setLoading(true);
    const cestaSummary=Object.entries(produtos)
      .map(([id,qty])=>{const p=PRODUTOS.find(x=>x.id===id);return p?`${p.nome} x${qty}`:null;})
      .filter(Boolean).join(", ")||"Nenhum selecionado";
    try{
      await fetch(WEBHOOK_URL,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({nome:nome.trim(),whatsapp:whatsapp.replace(/\D/g,""),
          cidade:cidade||"Não informado",bairro:bairro.trim()||"Não informado",
          cesta:cestaSummary,optin_mailing:optin?"Sim":"Não",
          tipo:"dentro_da_area",data:new Date().toLocaleDateString("pt-BR")})});
    }catch(_){}
    setLoading(false);
    onSubmit(nome.trim().split(" ")[0]);
  };

  const totalQty=Object.values(produtos).reduce((s,q)=>s+q,0);

  return(
    <div style={{padding:"24px 24px 32px",display:"flex",flexDirection:"column",gap:20}}>
      <div>
        <H size={22}>CONTA PRA GENTE</H>
        <div style={{fontFamily:fb,fontSize:14,color:W[500],marginTop:6,lineHeight:1.6}}>
          Sem compromisso. Só queremos entender se a Cora faz sentido pra você.
        </div>
      </div>

      <div style={{background:B[50],borderRadius:10,padding:"12px 14px",border:`1px solid ${B[100]}`,
        display:"flex",alignItems:"flex-start",gap:10}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={B[500]} strokeWidth="2" style={{flexShrink:0,marginTop:1}}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div style={{fontFamily:fb,fontSize:13,color:B[700],lineHeight:1.5}}>
          Nenhum pagamento agora. O Hugo entra em contato pelo WhatsApp para confirmar tudo.
        </div>
      </div>

      <div>
        <Label required>Nome</Label>
        <Input value={nome} onChange={e=>{setNome(e.target.value);setErrors(x=>({...x,nome:false}));}}
          placeholder="Como você se chama?" error={errors.nome}/>
        {errors.nome&&<div style={{fontSize:12,color:"#EF4444",marginTop:4,fontFamily:fb}}>Precisa do seu nome</div>}
      </div>

      <div>
        <Label required>WhatsApp com DDD</Label>
        <Input value={whatsapp} onChange={e=>{setWhatsapp(formatWpp(e.target.value));setErrors(x=>({...x,whatsapp:false}));}}
          placeholder="(21) 99999-0000" type="tel" error={errors.whatsapp}/>
        {errors.whatsapp&&<div style={{fontSize:12,color:"#EF4444",marginTop:4,fontFamily:fb}}>Número incompleto</div>}
      </div>

      <div>
        <Label>Cidade</Label>
        <select value={cidade} onChange={e=>setCidade(e.target.value)}
          style={{width:"100%",padding:"12px 14px",fontSize:15,fontFamily:fb,color:cidade?W[800]:W[400],
            background:"#FFF",border:`1.5px solid ${W[200]}`,borderRadius:8,outline:"none",
            appearance:"none",backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23A8A49C' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
            backgroundRepeat:"no-repeat",backgroundPosition:"right 14px center"}}>
          <option value="">Selecione...</option>
          <option value="Niterói">Niterói</option>
          <option value="Rio de Janeiro">Rio de Janeiro</option>
        </select>
      </div>

      <div>
        <Label>Bairro</Label>
        <Input value={bairro} onChange={e=>setBairro(e.target.value)} placeholder="Ex: Icaraí, Botafogo..."/>
      </div>

      <div>
        <div style={{fontFamily:fb,fontSize:14,fontWeight:500,color:W[700],marginBottom:4}}>
          Se você recebesse pão toda semana, qual escolheria?
        </div>
        <div style={{fontFamily:fb,fontSize:12,color:W[400],marginBottom:12,lineHeight:1.5}}>
          Opcional — use a quantidade como referência do seu consumo semanal.
        </div>
        {PRODUTOS.map(p=>{
          const qty=produtos[p.id]||0;
          return(
            <ProductCard key={p.id}
              product={{...p,preco:p.peso}}
              qty={qty}
              onAdd={()=>setProdutos(prev=>({...prev,[p.id]:(prev[p.id]||0)+1}))}
              onRemove={()=>setProdutos(prev=>{
                const q=(prev[p.id]||0)-1;
                if(q<=0){const n={...prev};delete n[p.id];return n;}
                return{...prev,[p.id]:q};
              })}
              ctaLabel="Escolher"
            />
          );
        })}
        {totalQty>0&&(
          <div style={{fontFamily:fb,fontSize:12,color:W[500],marginTop:4,padding:"8px 12px",
            background:W[100],borderRadius:8,border:`1px solid ${W[200]}`}}>
            {totalQty} {totalQty===1?"unidade":"unidades"} por semana selecionada{totalQty>1?"s":""}
          </div>
        )}
      </div>

      <div onClick={()=>setOptin(!optin)}
        style={{display:"flex",gap:12,alignItems:"flex-start",padding:"14px",cursor:"pointer",
          background:optin?B[50]:"#FFF",borderRadius:10,border:`1.5px solid ${optin?B[400]:W[200]}`,transition:"all 150ms"}}>
        <div style={{width:20,height:20,borderRadius:4,flexShrink:0,marginTop:1,
          border:`2px solid ${optin?B[500]:W[300]}`,background:optin?B[500]:"#FFF",
          display:"flex",alignItems:"center",justifyContent:"center",transition:"all 150ms"}}>
          {optin&&<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        <div style={{fontFamily:fb,fontSize:13,color:optin?B[700]:W[600],lineHeight:1.5}}>
          Quero receber novidades da Cora — atualizações sobre o lançamento e quando as entregas começarem.
        </div>
      </div>

      <Btn primary disabled={loading} onClick={handleSubmit}>
        {loading?"Enviando...":"Quero saber mais"}
      </Btn>

      <div style={{textAlign:"center",fontSize:12,color:W[400],fontFamily:fb,lineHeight:1.5}}>
        Seus dados ficam só com a Cora. A gente não compartilha com ninguém.
      </div>
    </div>
  );
};

/* ══ CONFIRMAÇÃO ══ */
const ConfirmScreen=({nome,foraArea})=>(
  <div style={{minHeight:"100%",display:"flex",flexDirection:"column",alignItems:"center",
    justifyContent:"center",padding:"40px 24px",textAlign:"center",position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",inset:0,opacity:0.06,
      backgroundImage:"url('/images/Cora_tile_grafismo.svg')",backgroundRepeat:"repeat",backgroundSize:120}}/>
    <div style={{position:"relative",zIndex:1,maxWidth:300}}>
      <div style={{width:64,height:64,borderRadius:"50%",background:"#D1FAE5",border:"1.5px solid #6EE7B7",
        display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px"}}>
        <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
          <path d="M2 11L10 19L26 2" stroke="#065F46" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <H size={26} color={B[800]}>ANOTADO, {nome.toUpperCase()}!</H>
      <div style={{fontFamily:fb,fontSize:15,color:W[600],marginTop:16,lineHeight:1.7}}>
        {foraArea
          ?"A gente avisa assim que a Cora chegar na sua região."
          :"O Hugo entra em contato no seu WhatsApp em até 24h."}
      </div>
      {!foraArea&&(
        <div style={{marginTop:24,padding:"14px 16px",background:B[50],borderRadius:10,border:`1px solid ${B[100]}`}}>
          <div style={{fontFamily:fb,fontSize:13,color:B[700],lineHeight:1.6}}>
            Enquanto isso, o pão continua sendo feito toda semana. Com calma e sem pressa.
          </div>
        </div>
      )}

      <a href="https://instagram.com/padaria.cora" target="_blank" rel="noopener noreferrer"
        style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:24,
          padding:"12px 16px",borderRadius:10,border:`1.5px solid ${W[200]}`,
          background:"#FFF",textDecoration:"none",transition:"border-color 150ms"}}
        onMouseEnter={e=>e.currentTarget.style.borderColor=W[400]}
        onMouseLeave={e=>e.currentTarget.style.borderColor=W[200]}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={W[600]} strokeWidth="1.8">
          <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/>
          <circle cx="17.5" cy="6.5" r="1" fill={W[600]} stroke="none"/>
        </svg>
        <div>
          <div style={{fontFamily:fb,fontSize:13,fontWeight:500,color:W[700]}}>Acompanhe no Instagram</div>
          <div style={{fontFamily:fb,fontSize:11,color:W[400],marginTop:1}}>@padaria.cora — bastidores da preparação</div>
        </div>
      </a>
    </div>
  </div>
);

/* ══ APP SHELL ══ */
export default function PreCadastro(){
  const[step,setStep]=useState("splash");
  const[nome,setNome]=useState("");
  const[foraArea,setForaArea]=useState(false);

  return(
    <div style={{display:"flex",justifyContent:"center",padding:"20px 0",
      fontFamily:fb,background:W[200],minHeight:"100vh"}}>
      <div style={{width:390,minHeight:720,background:W[50],borderRadius:24,overflow:"hidden",
        display:"flex",flexDirection:"column",position:"relative",
        boxShadow:"0 4px 24px rgba(26,24,21,0.12)"}}>

        <div style={{background:"#FFF",padding:"10px 20px",borderBottom:`1px solid ${W[200]}`,
          display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{fontFamily:fd,fontSize:22,color:B[500],textTransform:"uppercase",letterSpacing:"0.02em"}}>CORA</div>
        </div>

        {step==="form"&&(
          <div style={{display:"flex",gap:4,padding:"10px 20px 0",flexShrink:0}}>
            {[0,1].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:B[500]}}/>)}
          </div>
        )}

        <div style={{flex:1,overflowY:"auto"}}>
          {step==="splash"&&<SplashScreen onDentro={()=>setStep("form")} onFora={()=>setStep("fora")}/>}
          {step==="fora"&&<ForaScreen onSubmit={n=>{setNome(n);setForaArea(true);setStep("confirm");}}/>}
          {step==="form"&&<FormScreen onSubmit={n=>{setNome(n);setStep("confirm");}}/>}
          {step==="confirm"&&<ConfirmScreen nome={nome} foraArea={foraArea}/>}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=League+Gothic&family=Montagu+Slab:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;}
        button{font-family:'Montagu Slab',Georgia,serif;}
        input::placeholder{color:${W[400]};}
        input:focus{outline:none;border-color:${B[400]} !important;}
        ::-webkit-scrollbar{width:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  );
}