import { useState, useRef } from "react";
import ProductCard from "./components/ProductCard";
import { B, W, fd, fb, fmt } from "./tokens";

/* ═══════════════════════════════════════════════════════════════
   CORA . Onboarding v4
   maxWidth 390 · cards do Cardapio · splash fix
   ═══════════════════════════════════════════════════════════════ */

const IMG={
  logo:"/images/cora_logo_com_tag.svg",
  original:"/images/_original.jpg",
  integral:"/images/_integral.jpg",
};

const VALOR_POR_PAO=99;
const FRETE_MENSAL=15;
const LIMITE_PAES=3;

const ASSINATURA_OPCOES=[
  {id:"original",nome:"Pão Original",peso:"615g",avulso:27,img:IMG.original,desc:"Mix de farinhas italiana e brasileira, água, sal e o levain da Cora. Fermentação lenta, crosta firme e miolo aberto.",ingredientes:"Farinha Superiore, farinha FV integral, água, sal, levain da Cora."},
  {id:"integral",nome:"Pão Integral",peso:"615g",avulso:29,img:IMG.integral,desc:"100% integral, com um blend de farinhas brasileira e italiana que traz mais complexidade ao sabor. Azeite na massa, fermentação lenta e miolo que fica macio por dias.",ingredientes:"Farinha FV integral, farinha Mora, água, sal, levain, azeite, farelo de trigo."},
];

/* ── Utilitários (reaproveitados do PreCadastro) ── */
const sanitize=(str)=>str.replace(/[<>]/g,"");
const formatWhatsApp=(value)=>{
  const digits=value.replace(/\D/g,"").slice(0,11);
  if(digits.length<=2) return digits;
  if(digits.length<=7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
};

/* ─── Base ─── */
const H=({children,size=24})=><div style={{fontFamily:fd,fontSize:size,textTransform:"uppercase",letterSpacing:"0.02em",color:B[800],margin:0}}>{children}</div>;
const Label=({children,apoio})=><div style={{marginBottom:4}}><div style={{fontFamily:fb,fontSize:14,fontWeight:500,color:W[700]}}>{children}</div>{apoio&&<div style={{fontFamily:fb,fontSize:12,color:W[400],marginTop:2}}>{apoio}</div>}</div>;
const Input=({placeholder,value,onChange,type="text",error,onFocusExtra})=><input type={type} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"12px 14px",fontSize:15,fontFamily:fb,border:`1.5px solid ${error?"#EF4444":W[200]}`,borderRadius:8,background:"#FFF",color:W[800],outline:"none",transition:"border-color 200ms"}} onFocus={e=>{e.target.style.borderColor=error?"#EF4444":B[400];onFocusExtra&&onFocusExtra();}} onBlur={e=>e.target.style.borderColor=error?"#EF4444":W[200]}/>;
const Btn=({children,primary,disabled,onClick,style:es={}})=><button onClick={onClick} disabled={disabled} style={{width:"100%",padding:"14px 0",borderRadius:8,fontSize:15,fontWeight:600,fontFamily:fb,cursor:disabled?"default":"pointer",transition:"all 200ms",border:primary?"none":`1.5px solid ${W[300]}`,background:primary?(disabled?W[300]:B[500]):"transparent",color:primary?"#FFF":W[600],opacity:disabled?0.6:1,...es}}>{children}</button>;
const Progress=({step})=><div style={{display:"flex",gap:6,padding:"0 16px"}}>{[1,2,3].map(s=><div key={s} style={{flex:1,height:3,borderRadius:2,transition:"all 300ms",background:s<=step?B[500]:W[200]}}/>)}</div>;
const Field=({label,apoio,children,error})=><div style={{marginBottom:16}}><Label apoio={apoio}>{label}</Label>{children}{error&&<div style={{fontSize:13,color:"#DC2626",fontFamily:fb,marginTop:4}}>{error}</div>}</div>;

/* ═══ SPLASH ═══ */
const Splash=({onStart})=>(
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px",textAlign:"center",minHeight:"100%",background:W[50]}}>
    <img src={IMG.logo} alt="Cora" style={{height:48,marginBottom:40}}/>
    <div style={{fontFamily:fb,fontSize:18,color:B[800],lineHeight:1.7,maxWidth:280}}>
      Pão de fermentação natural, toda semana na sua porta.
    </div>
    <div style={{fontFamily:fb,fontSize:18,color:W[500],lineHeight:1.7,marginBottom:40}}>
      Você escolhe, a gente assa.
    </div>
    <Btn primary onClick={onStart}>Quero me cadastrar</Btn>
    <div style={{fontFamily:fb,fontSize:12,color:W[400],marginTop:16}}>
      Padaria por assinatura
    </div>
  </div>
);

/* ═══ STEP 1 . Dados pessoais + gênero ═══ */
const Step1=({data,setData,errors,clearError})=>(
  <div>
    <div style={{marginBottom:20}}>
      <H size={22}>Seus dados</H>
      <div style={{fontFamily:fb,fontSize:14,color:W[500],marginTop:4}}>Pra gente saber quem você é e onde entregar.</div>
    </div>
    <Field label="Nome completo" apoio="Como você gostaria de ser chamado(a)?" error={errors.nome}>
      <Input placeholder="Ana Beatriz Souza" value={data.nome} onChange={v=>{setData({...data,nome:sanitize(v)});clearError("nome");}} error={errors.nome}/>
    </Field>
    <Field label="WhatsApp (com DDD)" apoio="Para confirmações de entrega e novidades." error={errors.whatsapp}>
      <Input placeholder="(21) 99999-0000" value={data.whatsapp} onChange={v=>{setData({...data,whatsapp:formatWhatsApp(v)});clearError("whatsapp");}} type="tel" error={errors.whatsapp}/>
    </Field>
    <Field label="E-mail" apoio="Para login e comprovantes." error={errors.email}>
      <Input placeholder="ana@email.com" value={data.email} onChange={v=>{setData({...data,email:sanitize(v)});clearError("email");}} type="email" error={errors.email}/>
    </Field>
    <Field label="Como gostaria de ser tratado(a)?" apoio="Para a gente acertar na saudação.">
      <div style={{display:"flex",gap:8,marginTop:4}}>
        {[{id:"f",label:"Feminino"},{id:"m",label:"Masculino"},{id:"n",label:"Neutro"}].map(g=>(
          <button key={g.id} onClick={()=>setData({...data,genero:g.id})} style={{flex:1,padding:"10px 0",borderRadius:8,fontSize:13,fontFamily:fb,fontWeight:500,cursor:"pointer",transition:"all 200ms",border:data.genero===g.id?`2px solid ${B[500]}`:`1.5px solid ${W[200]}`,background:data.genero===g.id?B[50]:"#FFF",color:data.genero===g.id?B[700]:W[500]}}>{g.label}</button>
        ))}
      </div>
    </Field>
    <div style={{height:1,background:W[200],margin:"4px 0 16px"}}/>
    <Field label="Endereço completo" apoio="Rua, número, bairro e cidade." error={errors.endereco}>
      <Input placeholder="Rua das Flores, 120, Fonseca, Niterói" value={data.endereco} onChange={v=>{setData({...data,endereco:sanitize(v)});clearError("endereco");}} error={errors.endereco}/>
    </Field>
    <Field label="Complemento" apoio="Apartamento, bloco, portaria, referência.">
      <Input placeholder="Bl. A, Apto 502. Deixar com o porteiro" value={data.complemento} onChange={v=>setData({...data,complemento:sanitize(v)})}/>
    </Field>
  </div>
);

/* ═══ STEP 2 . Assinatura (cards iguais ao Cardapio) ═══ */
const Step2=({assinatura,setAssinatura})=>{
  const totalPaes=Object.values(assinatura).reduce((s,q)=>s+q,0);
  const totalMensal=VALOR_POR_PAO*totalPaes;
  const atingiuLimite=totalPaes>=LIMITE_PAES;

  const setQty=(id,q)=>{
    const outros=Object.entries(assinatura).filter(([k])=>k!==id).reduce((s,[,qtd])=>s+qtd,0);
    if(outros+q>LIMITE_PAES) return;
    const next={...assinatura};
    if(q<=0) delete next[id]; else next[id]=q;
    setAssinatura(next);
  };

  return(
    <div>
      <div style={{marginBottom:16}}>
        <H size={22}>Monte sua Assinatura</H>
        <div style={{fontFamily:fb,fontSize:14,color:W[500],marginTop:4}}>Escolha entre 1 e 3 pães pra receber toda semana, na sua porta. Você pode alterar quando quiser.</div>
        {atingiuLimite&&<div style={{fontFamily:fb,fontSize:12,color:B[700],background:B[50],border:`1px solid ${B[100]}`,borderRadius:8,padding:"8px 12px",marginTop:10,lineHeight:1.4}}>Você escolheu 3 pães, o máximo por semana.</div>}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
        {ASSINATURA_OPCOES.map(c=>{
          const qty=assinatura[c.id]||0;
          return<ProductCard key={c.id}
            product={{...c, preco:undefined}}
            qty={qty}
            onAdd={()=>{if(!atingiuLimite||qty>0)setQty(c.id,qty+1);}}
            onRemove={()=>setQty(c.id,qty-1)}
            ctaLabel="Quero"
          />;
        })}
      </div>

      {totalPaes>0&&<div style={{background:W[100],borderRadius:10,padding:14,border:`1px solid ${W[200]}`}}>
        {Object.entries(assinatura).map(([id,qty])=>{
          const c=ASSINATURA_OPCOES.find(x=>x.id===id);
          if(!c)return null;
          return<div key={id} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontFamily:fb,fontSize:13,color:W[500]}}>{c.nome} × {qty}/semana</span>
            <span style={{fontFamily:fb,fontSize:13,color:W[600]}}>{fmt(VALOR_POR_PAO*qty)}</span>
          </div>;
        })}
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontFamily:fb,fontSize:13,color:W[500]}}>Frete mensal</span>
          <span style={{fontFamily:fb,fontSize:13,color:W[600]}}>{fmt(FRETE_MENSAL)}</span>
        </div>
        <div style={{height:1,background:W[200],marginBottom:8}}/>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <span style={{fontFamily:fb,fontSize:15,fontWeight:600,color:W[800]}}>Total mensal</span>
          <span style={{fontFamily:fb,fontSize:18,fontWeight:700,color:B[500]}}>{fmt(totalMensal+FRETE_MENSAL)}</span>
        </div>
        <div style={{fontFamily:fb,fontSize:11,color:W[400],marginTop:6,lineHeight:1.4}}>Cobrado mensalmente no cartão. Em meses com 5 semanas, o pão extra é por nossa conta.</div>
      </div>}

      {totalPaes>0&&<div style={{marginTop:20}}>
        <div style={{height:1,background:W[200],marginBottom:16}}/>
        <Label apoio="Seu cartão é cadastrado com segurança. A primeira cobrança acontece no início do mês.">Dados de pagamento</Label>
        <div style={{marginBottom:12}}><Input placeholder="Número do cartão" value="" onChange={()=>{}}/></div>
        <div style={{display:"flex",gap:10,marginBottom:12}}>
          <div style={{flex:1}}><Input placeholder="MM/AA" value="" onChange={()=>{}}/></div>
          <div style={{flex:1}}><Input placeholder="CVV" value="" onChange={()=>{}}/></div>
        </div>
        <Field label="CPF" apoio="Para a nota fiscal."><Input placeholder="000.000.000-00" value="" onChange={()=>{}}/></Field>
      </div>}
    </div>
  );
};

/* ═══ STEP 3 . Revisão ═══ */
const Step3=({data,assinatura})=>{
  const items=Object.entries(assinatura).map(([id,qty])=>({...ASSINATURA_OPCOES.find(c=>c.id===id),qty})).filter(Boolean);
  const totalPaes=items.reduce((s,c)=>s+c.qty,0);
  const totalMensal=VALOR_POR_PAO*totalPaes;
  const genLabel={f:"Feminino",m:"Masculino",n:"Neutro"};
  const Row=({label,value})=><div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${W[100]}`}}><span style={{fontFamily:fb,fontSize:13,color:W[500]}}>{label}</span><span style={{fontFamily:fb,fontSize:13,fontWeight:500,color:W[800],textAlign:"right",maxWidth:"60%"}}>{value}</span></div>;

  return(
    <div>
      <div style={{marginBottom:16}}>
        <H size={22}>Tudo certo?</H>
        <div style={{fontFamily:fb,fontSize:14,color:W[500],marginTop:4}}>Confira seus dados antes de confirmar. Você pode alterar tudo depois.</div>
      </div>

      <div style={{marginBottom:16}}>
        <div style={{fontFamily:fd,fontSize:14,textTransform:"uppercase",color:B[700],letterSpacing:"0.04em",marginBottom:8}}>Dados pessoais</div>
        <div style={{background:"#FFF",borderRadius:10,padding:"4px 14px",border:`1px solid ${W[200]}`}}>
          <Row label="Nome" value={data.nome||"."}/>
          <Row label="WhatsApp" value={data.whatsapp||"."}/>
          <Row label="E-mail" value={data.email||"."}/>
          <Row label="Tratamento" value={genLabel[data.genero]||"."}/>
          <Row label="Endereço" value={data.endereco||"."}/>
          {data.complemento&&<Row label="Complemento" value={data.complemento}/>}
        </div>
      </div>

      <div style={{marginBottom:16}}>
        <div style={{fontFamily:fd,fontSize:14,textTransform:"uppercase",color:B[700],letterSpacing:"0.04em",marginBottom:8}}>Sua Assinatura</div>
        <div style={{background:"#FFF",borderRadius:10,overflow:"hidden",border:`1px solid ${W[200]}`}}>
          {items.map(c=><div key={c.id} style={{display:"flex",alignItems:"stretch",borderBottom:`1px solid ${W[100]}`}}>
            <img src={c.img} alt={c.nome} style={{width:72,objectFit:"cover",display:"block"}}/>
            <div style={{flex:1,padding:12}}>
              <div style={{fontFamily:fb,fontSize:14,fontWeight:600,color:W[800]}}>{c.nome}</div>
              <div style={{fontFamily:fb,fontSize:12,color:W[500]}}>{c.peso} · {c.qty}/semana</div>
            </div>
          </div>)}
          <div style={{padding:"8px 14px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontFamily:fb,fontSize:13,color:W[500]}}>Assinatura</span><span style={{fontFamily:fb,fontSize:13,color:W[600]}}>{fmt(totalMensal)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontFamily:fb,fontSize:13,color:W[500]}}>Frete</span><span style={{fontFamily:fb,fontSize:13,color:W[600]}}>{fmt(FRETE_MENSAL)}</span></div>
            <div style={{height:1,background:W[200],marginBottom:8}}/>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontFamily:fb,fontSize:15,fontWeight:600,color:W[800]}}>Total mensal</span><span style={{fontFamily:fb,fontSize:18,fontWeight:700,color:B[500]}}>{fmt(totalMensal+FRETE_MENSAL)}</span></div>
          </div>
        </div>
      </div>

      <div style={{background:B[50],borderRadius:10,padding:14,border:`1px solid ${B[100]}`}}>
        <div style={{fontFamily:fb,fontSize:13,color:B[700],fontWeight:500}}>Entrega toda quinta-feira</div>
        <div style={{fontFamily:fb,fontSize:12,color:B[600],marginTop:4}}>Alterações na Assinatura até terça, 12h. Cancelamento sem taxa, a qualquer momento.</div>
      </div>
    </div>
  );
};

/* ═══ WELCOME ═══ */
const Welcome=({data,assinatura,onComplete})=>{
  const items=Object.entries(assinatura).map(([id,qty])=>({...ASSINATURA_OPCOES.find(c=>c.id===id),qty})).filter(Boolean);
  const nome=data.nome?data.nome.split(" ")[0]:"você";
  const saudacao=data.genero==="f"?"Bem-vinda":data.genero==="m"?"Bem-vindo":"Boas-vindas";

  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",textAlign:"center",minHeight:"100%",background:W[50]}}>
      <div style={{width:"100%"}}>
        <div style={{width:64,height:64,borderRadius:32,background:B[50],display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",border:`2px solid ${B[200]}`}}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={B[500]} strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <H size={26}>{saudacao}, {nome.toUpperCase()}!</H>
        <div style={{fontFamily:fb,fontSize:15,color:W[600],marginTop:12,lineHeight:1.6,maxWidth:300,margin:"12px auto 0"}}>Sua Assinatura está ativa. Sua primeira entrega será na próxima quinta-feira.</div>

        {items.length>0&&<div style={{background:"#FFF",borderRadius:12,overflow:"hidden",marginTop:24,width:"100%",border:`1px solid ${W[200]}`,textAlign:"left"}}>
          <div style={{padding:"14px 14px 8px",fontFamily:fb,fontSize:13,color:W[500]}}>Você vai receber toda quinta</div>
          {items.map((c,i)=><div key={c.id} style={{display:"flex",alignItems:"stretch",borderTop:`1px solid ${W[200]}`}}>
            <img src={c.img} alt={c.nome} style={{width:72,objectFit:"cover",display:"block"}}/>
            <div style={{flex:1,padding:12}}>
              <div style={{fontFamily:fb,fontSize:15,fontWeight:600,color:W[800]}}>{c.qty}× {c.nome} ({c.peso})</div>
            </div>
          </div>)}
          <div style={{padding:"10px 14px 14px",fontFamily:fb,fontSize:13,color:W[500],borderTop:`1px solid ${W[200]}`}}>Na porta do seu apartamento.</div>
        </div>}

        <div style={{fontFamily:fb,fontSize:13,color:B[600],marginTop:20,lineHeight:1.5,background:B[50],borderRadius:8,padding:12,width:"100%",textAlign:"left"}}>Você vai receber uma mensagem no WhatsApp com os detalhes. Qualquer dúvida, é só responder por lá.</div>
        <div style={{marginTop:24,width:"100%"}}><Btn primary onClick={onComplete}>Acompanhe sua Assinatura</Btn></div>
      </div>
    </div>
  );
};

/* ═══ APP ═══ */
export default function CoraOnboarding({onComplete}){
  const[screen,setScreen]=useState("splash");
  const[step,setStep]=useState(1);
  const[termos,setTermos]=useState(false);
  const[data,setData]=useState({nome:"",whatsapp:"",email:"",endereco:"",complemento:"",genero:""});
  const assinaturaDaURL=(()=>{const p=new URLSearchParams(window.location.search);const id=p.get("produto")||p.get("cesta");return id?{[id]:1}:{};})();
  const[assinatura,setAssinatura]=useState(assinaturaDaURL);
  const[errors,setErrors]=useState({});
  const[website,setWebsite]=useState(""); // honeypot
  const formErrorRef=useRef(null);

  const clearError=(field)=>{
    setErrors(prev=>{const n={...prev};delete n[field];return n;});
    if(formErrorRef.current) formErrorRef.current.style.display='none';
  };

  const validateStep1=()=>{
    const e={};
    if(!data.nome.trim()||data.nome.trim().split(/\s+/).length<2) e.nome="Precisamos do nome e sobrenome.";
    const digits=data.whatsapp.replace(/\D/g,"");
    if(digits.length<10||digits.length>11) e.whatsapp="Confira o número com DDD.";
    if(!data.email.trim()||!data.email.includes("@")) e.email="Informe um e-mail válido.";
    if(!data.endereco.trim()) e.endereco="Informe seu endereço.";
    if(!data.genero) e.genero="Selecione uma opção.";
    setErrors(e);
    return Object.keys(e).length===0;
  };

  const handleNext=()=>{
    if(website) return; // honeypot: bot detectado
    if(formErrorRef.current) formErrorRef.current.style.display='none';
    if(step===1){
      if(!validateStep1()){
        setTimeout(()=>{
          if(formErrorRef.current){
            formErrorRef.current.style.display='block';
            formErrorRef.current.scrollIntoView({behavior:'smooth',block:'center'});
          }
        },100);
        return;
      }
    }
    setStep(step+1);
  };

  const totalItems=Object.values(assinatura).reduce((s,q)=>s+q,0);
  const canNext2=totalItems>0;
  const canConfirm=termos;

  const stepLabel=["Dados","Sua Assinatura","Confirmação"];

  const shell=(content)=>(
    <div style={{maxWidth:390,margin:"0 auto",minHeight:"100vh",background:W[50],display:"flex",flexDirection:"column"}}>
      {content}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=League+Gothic&family=Montagu+Slab:wght@400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;-webkit-tap-highlight-color:transparent}body{margin:0}img{max-width:100%}input,button{font-size:16px}::-webkit-scrollbar{width:0}input::placeholder{font-family:'Montagu Slab',Georgia,Palatino,serif}`}</style>
    </div>
  );

  if(screen==="splash") return shell(<Splash onStart={()=>setScreen("form")}/>);

  if(screen==="welcome") return shell(<>
    <div style={{padding:"10px 16px",background:"#FFF",borderBottom:`1px solid ${W[200]}`}}><img src={IMG.logo} alt="Cora" style={{height:28}}/></div>
    <div style={{flex:1}}><Welcome data={data} assinatura={assinatura} onComplete={()=>onComplete&&onComplete(data)}/></div>
  </>);

  return shell(<>
    <div style={{background:"#FFF",padding:"12px 16px",borderBottom:`1px solid ${W[200]}`,flexShrink:0}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <img src={IMG.logo} alt="Cora" style={{height:24}}/>
        <div style={{fontFamily:fb,fontSize:12,color:W[400]}}>{step}/3 · {stepLabel[step-1]}</div>
      </div>
      <Progress step={step}/>
    </div>
    <div style={{flex:1,overflowY:"auto",padding:16}}>
      {step===1&&<Step1 data={data} setData={setData} errors={errors} clearError={clearError}/>}
      {step===2&&<Step2 assinatura={assinatura} setAssinatura={setAssinatura}/>}
      {step===3&&<>
        <Step3 data={data} assinatura={assinatura}/>
        <div onClick={()=>setTermos(!termos)} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"14px 0",cursor:"pointer",marginTop:8}}>
          <div style={{width:20,height:20,borderRadius:4,flexShrink:0,marginTop:1,border:termos?`2px solid ${B[500]}`:`2px solid ${W[300]}`,background:termos?B[500]:"#FFF",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 200ms"}}>{termos&&<span style={{color:"#FFF",fontSize:13,fontWeight:700}}>&#10003;</span>}</div>
          <div style={{fontFamily:fb,fontSize:13,color:W[600],lineHeight:1.5}}>Ao confirmar, aceito os termos de uso e a política de privacidade da Cora.</div>
        </div>
      </>}

      {/* Honeypot anti-bot (escondido) */}
      <div style={{position:"absolute",left:"-9999px",opacity:0,height:0,overflow:"hidden"}} aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input type="text" id="website" name="website" value={website} onChange={e=>setWebsite(e.target.value)} tabIndex={-1} autoComplete="off"/>
      </div>

      <div ref={formErrorRef} style={{display:"none",padding:"12px 16px",borderRadius:8,background:"#FEF2F2",border:"1px solid #FECACA",color:"#991B1B",fontFamily:fb,fontSize:14,marginTop:16,lineHeight:1.5}}>
        Preencha os campos obrigatórios acima.
      </div>
    </div>
    <div style={{padding:"12px 16px",background:"#FFF",borderTop:`1px solid ${W[200]}`,flexShrink:0,display:"flex",gap:10}}>
      {step>1&&<Btn onClick={()=>setStep(step-1)} style={{width:"auto",flex:"0 0 auto",padding:"14px 20px"}}>Voltar</Btn>}
      {step<3?<Btn primary disabled={step===2&&!canNext2} onClick={handleNext}>Continuar</Btn>:<Btn primary disabled={!canConfirm} onClick={()=>setScreen("welcome")}>Confirmar assinatura</Btn>}
    </div>
  </>);
}
