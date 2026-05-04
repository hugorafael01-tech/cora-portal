import { useState, useRef, useEffect } from "react";
import ProductCard from "./components/ProductCard";
import CEPField from "./components/CEPField";
import CoverageBlocker from "./components/CoverageBlocker";
import { B, W, fd, fb, fmt, radii } from "./tokens";
import { formatWhatsApp, formatCPF, isValidWhatsApp, isValidEmail, isValidCPF, isValidCEP, isValidNome, isValidNumero } from "./utils/validators";
import { estaCoberto, estaNaWhitelist } from "./utils/coverage";
import { buildHugoCoverageLink } from "./config/contact";
import { postWaitlist } from "./utils/api";

/* ═══════════════════════════════════════════════════════════════
   CORA . Onboarding v5
   Alinhado com PreCadastro: splash, honeypot, validacoes inline
   ═══════════════════════════════════════════════════════════════ */

const IMG={
  logo:"/images/cora_logo_com_tag.svg",
  logoTag:"/images/cora_logo_com_tag.svg",
  original:"/images/_original.webp",
  integral:"/images/_integral.webp",
  coracao:"/images/grafismo_coracao.svg",
};

const VALOR_POR_PAO=99;
const FRETE_MENSAL=15;
const LIMITE_PAES=3;

// Sem campo `ingredientes` nem `historia`: ProductCard oculta o accordion quando
// nao ha conteudo extra. Quando o storytelling estiver pronto, adicionar `historia`
// em cada produto e o accordion volta automaticamente.
const ASSINATURA_OPCOES=[
  {id:"original",nome:"Pão Original",peso:"700g",avulso:27,img:IMG.original,desc:"Pão de toda mesa. Vai com azeite, queijo, bruschetta de tomate ou o que você abrir na cozinha.",sobre:"Blend de farinha branca italiana e integral brasileira. Levain da Cora, água, sal. Hidratação 70%."},
  {id:"integral",nome:"Pão Integral",peso:"700g",avulso:29,img:IMG.integral,desc:"Sabor de grão inteiro, miolo leve. Torrado pela manhã ou ao lado da salada no almoço.",sobre:"100% integral em blend de farinha brasileira e italiana. Levain da Cora, água, sal, azeite. Hidratação 75%."},
];

/* ── Utilitarios ── */
// formatWhatsApp e similares vem de utils/validators.js. sanitize fica
// local (defensivo: remove < e > antes de armazenar texto livre).
const sanitize=(str)=>str.replace(/[<>]/g,"");

/* ── Grafismo Coração (decorativo, reaproveitado do PreCadastro) ── */
const GrafismoCoracao=({size=36})=>(
  <img src={IMG.coracao} alt="" aria-hidden="true" style={{width:size,height:"auto"}}/>
);

/* ─── Base ─── */
const H=({children,size=24})=><div style={{fontFamily:fd,fontSize:size,textTransform:"uppercase",letterSpacing:"0.02em",color:B[500],margin:0}}>{children}</div>;
const Label=({children,apoio})=><div style={{marginBottom:4}}><div style={{fontFamily:fb,fontSize:14,fontWeight:500,color:W[700]}}>{children}</div>{apoio&&<div style={{fontFamily:fb,fontSize:12,color:W[500],marginTop:2}}>{apoio}</div>}</div>;
const Input=({placeholder,value,onChange,type="text",error,onFocusExtra})=><input type={type} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"12px 14px",fontSize:15,fontFamily:fb,border:`1.5px solid ${error?"#EF4444":W[200]}`,borderRadius:radii.md,background:"#FFF",color:W[800],outline:"none",transition:"border-color 200ms"}} onFocus={e=>{e.target.style.borderColor=error?"#EF4444":B[400];onFocusExtra&&onFocusExtra();}} onBlur={e=>e.target.style.borderColor=error?"#EF4444":W[200]}/>;
const Btn=({children,primary,disabled,onClick,style:es={}})=><button onClick={onClick} disabled={disabled} style={{width:"100%",padding:"14px 0",borderRadius:radii.md,fontSize:15,fontWeight:600,fontFamily:fb,cursor:disabled?"default":"pointer",transition:"all 200ms",border:primary?"none":`1.5px solid ${W[300]}`,background:primary?(disabled?W[300]:B[500]):"transparent",color:primary?"#FFF":W[600],opacity:disabled?0.6:1,...es}}>{children}</button>;
const Progress=({step})=><div style={{display:"flex",gap:6,padding:"0 16px"}}>{[1,2].map(s=><div key={s} style={{flex:1,height:3,borderRadius:radii.xs,transition:"all 300ms",background:s<=step?B[500]:W[200]}}/>)}</div>;
const Field=({label,apoio,children,error})=><div style={{marginBottom:16}}><Label apoio={apoio}>{label}</Label>{children}{error&&<div style={{fontSize:13,color:"#DC2626",fontFamily:fb,marginTop:4}}>{error}</div>}</div>;

/* ═══ SPLASH . Redesenhado alinhado com PreCadastro ═══ */
const Splash=({onStart})=>(
  <div style={{minHeight:"100dvh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 32px 40px",background:W[50],textAlign:"center"}}>
    <GrafismoCoracao size={36}/>

    <div style={{marginTop:40}}>
      <img src={IMG.logoTag} alt="Cora. Padaria por assinatura" style={{width:"clamp(180px, 65vw, 260px)",height:"auto"}}/>
    </div>

    <div style={{marginTop:48,maxWidth:300,padding:"0 8px"}}>
      <p style={{fontFamily:fb,fontSize:"clamp(22px, 6.5vw, 30px)",lineHeight:1.3,color:W[500],margin:0,fontWeight:400}}>
        Feliz em te receber.
      </p>
      <p style={{fontFamily:fb,fontSize:"clamp(22px, 6.5vw, 30px)",lineHeight:1.3,color:W[800],margin:0,marginTop:4,fontWeight:500}}>
        Vamos montar sua Assinatura?
      </p>
    </div>

    <button onClick={onStart} style={{marginTop:48,width:200,height:52,borderRadius:radii.md,border:"none",background:B[500],color:"#FFF",fontSize:16,fontWeight:600,fontFamily:fb,cursor:"pointer",transition:"background 150ms"}} onMouseOver={e=>e.currentTarget.style.background=B[600]} onMouseOut={e=>e.currentTarget.style.background=B[500]}>
      Vamos
    </button>

    <div style={{marginTop:60}}>
      <GrafismoCoracao size={36}/>
    </div>
  </div>
);

/* ═══ STEP 1 . Sobre voce + Entrega ═══ */
const SectionTitle=({children})=>(
  <div style={{fontFamily:fd,fontSize:14,textTransform:"uppercase",color:B[500],letterSpacing:"0.04em",marginBottom:12,marginTop:4}}>{children}</div>
);

// Input controlado com mascara/sanitize externo + onBlur pra validacao inline.
const FormInput=({placeholder,value,onChange,onBlur,type="text",error,readOnly,inputMode,autoComplete})=>(
  <input
    type={type}
    inputMode={inputMode}
    autoComplete={autoComplete}
    placeholder={placeholder}
    value={value}
    readOnly={readOnly}
    onChange={(e)=>onChange(e.target.value)}
    onBlur={onBlur}
    style={{
      width:"100%",
      padding:"12px 14px",
      fontSize:15,
      fontFamily:fb,
      border:`1.5px solid ${error?"#EF4444":W[200]}`,
      borderRadius:radii.md,
      background:readOnly?W[100]:"#FFF",
      color:readOnly?W[600]:W[800],
      outline:"none",
      transition:"border-color 200ms",
    }}
    onFocus={(e)=>{ if(readOnly) return; e.target.style.borderColor=error?"#EF4444":B[400]; }}
  />
);

const Step1=({
  data,
  updateField,
  handleBlur,
  errors,
  cepFallback,
  coverageStatus,
  viaCEPResolved,
  onCEPResolve,
  onTryOtherCEP,
  onSubmitWaitlist,
})=>{
  const camposEntregaVisiveis=viaCEPResolved && coverageStatus!=="blocked";
  return (
    <div>
      <div style={{marginBottom:20}}>
        <H size={22}>Sobre você</H>
        <div style={{fontFamily:fb,fontSize:14,color:W[500],marginTop:6,lineHeight:1.5}}>Pra começar, conta pra gente quem é você e onde quer receber.</div>
      </div>

      <SectionTitle>Sobre você</SectionTitle>

      <Field label="Como quer ser chamado(a)?" error={errors.nome}>
        <FormInput placeholder="ex: Beatriz" value={data.nome}
          onChange={(v)=>updateField("nome", sanitize(v))}
          onBlur={()=>handleBlur("nome")}
          autoComplete="given-name"
          error={errors.nome}/>
      </Field>

      <Field label="WhatsApp" apoio="Para confirmações de entrega e novidades." error={errors.whatsapp}>
        <FormInput placeholder="(21) 99999-9999" value={data.whatsapp}
          onChange={(v)=>updateField("whatsapp", formatWhatsApp(v))}
          onBlur={()=>handleBlur("whatsapp")}
          type="tel" inputMode="tel" autoComplete="tel"
          error={errors.whatsapp}/>
      </Field>

      <Field label="E-mail" apoio="Para login e comprovantes." error={errors.email}>
        <FormInput placeholder="seu@email.com" value={data.email}
          onChange={(v)=>updateField("email", sanitize(v))}
          onBlur={()=>handleBlur("email")}
          type="email" inputMode="email" autoComplete="email"
          error={errors.email}/>
      </Field>

      <Field label="CPF" apoio="Para gerar sua cobrança." error={errors.cpf}>
        <FormInput placeholder="000.000.000-00" value={data.cpf}
          onChange={(v)=>updateField("cpf", formatCPF(v))}
          onBlur={()=>handleBlur("cpf")}
          inputMode="numeric"
          error={errors.cpf}/>
      </Field>

      <div style={{height:1,background:W[200],margin:"8px 0 16px"}}/>

      <SectionTitle>Entrega</SectionTitle>

      <Field label="CEP" apoio="A gente preenche o resto pra você." error={errors.cep}>
        <CEPField value={data.cep} onChange={(v)=>updateField("cep", v)} onResolve={onCEPResolve}/>
      </Field>

      {camposEntregaVisiveis && (
        <>
          <Field label="Rua" error={errors.rua}>
            <FormInput placeholder={cepFallback?"Nome da rua":"Preenchido pelo CEP"} value={data.rua}
              readOnly={!cepFallback}
              onChange={(v)=>updateField("rua", sanitize(v))}
              onBlur={()=>handleBlur("rua")}
              error={errors.rua}/>
          </Field>

          <Field label="Bairro" error={errors.bairro}>
            <FormInput placeholder={cepFallback?"Bairro":"Preenchido pelo CEP"} value={data.bairro}
              readOnly={!cepFallback}
              onChange={(v)=>updateField("bairro", sanitize(v))}
              onBlur={()=>handleBlur("bairro")}
              error={errors.bairro}/>
            {(data.cidade||data.estado)&&(
              <div style={{fontFamily:fb,fontSize:12,color:W[500],marginTop:4}}>{data.cidade}{data.estado?` · ${data.estado}`:""}</div>
            )}
          </Field>

          <Field label="Número" error={errors.numero}>
            <FormInput placeholder="123" value={data.numero}
              onChange={(v)=>updateField("numero", sanitize(v))}
              onBlur={()=>handleBlur("numero")}
              inputMode="numeric"
              error={errors.numero}/>
          </Field>

          <Field label="Complemento (opcional)" apoio="apto, bloco, casa, fundos…">
            <FormInput placeholder="apto 502, bloco A" value={data.complemento}
              onChange={(v)=>updateField("complemento", sanitize(v))}/>
          </Field>
        </>
      )}

      {coverageStatus==="blocked" && viaCEPResolved && (
        <CoverageBlocker
          whatsappFromForm={data.whatsapp}
          cep={data.cep}
          bairro={data.bairro}
          cidade={data.cidade}
          estado={data.estado}
          onSubmitWaitlist={onSubmitWaitlist}
          onTryOtherCEP={onTryOtherCEP}
          whatsappLink={buildHugoCoverageLink(data.bairro)}
        />
      )}

      {coverageStatus==="unconfirmed" && (
        <div style={{
          background:"#FEF3C7",
          border:"1px solid #FCD34D",
          borderRadius:radii.lg,
          padding:"12px 14px",
          marginTop:8,
          fontFamily:fb,
          fontSize:13,
          color:"#92400E",
          lineHeight:1.5,
        }}>
          Não conseguimos confirmar cobertura agora. Vamos seguir e a gente confirma com você no WhatsApp.
        </div>
      )}

      <p style={{
        fontFamily:fb,
        fontSize:12,
        color:W[600],
        lineHeight:1.6,
        marginTop:16,
        marginBottom:24,
      }}>
        Seus dados são usados pra entregar seu pão e cobrar a Assinatura. Pode pedir pra excluir pelo WhatsApp.
      </p>
    </div>
  );
};

/* ═══ STEP 2 . Sua Assinatura ═══ */
const Step2=({assinatura,setAssinatura})=>{
  const totalPaes=Object.values(assinatura).reduce((s,q)=>s+q,0);
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
        <H size={30}>Sua Assinatura</H>
        <div style={{fontFamily:fb,fontSize:14,color:W[500],marginTop:6,lineHeight:1.5}}>Toda quinta, pão fresco na sua porta. Escolha entre 1 e 3 pães e altere quando quiser.</div>
      </div>

      {/* Cards com seletor direto (sem botao 'Quero') — estados visuais via directQtySelector. */}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {ASSINATURA_OPCOES.map(c=>{
          const qty=assinatura[c.id]||0;
          return<ProductCard key={c.id}
            product={{...c, preco:undefined}}
            qty={qty}
            disabled={atingiuLimite}
            directQtySelector
            onAdd={()=>{if(!atingiuLimite)setQty(c.id,qty+1);}}
            onRemove={()=>setQty(c.id,qty-1)}
          />;
        })}
      </div>
    </div>
  );
};

/* ═══ WELCOME . Check animado + stagger de entrada ═══ */
const Welcome=({data,assinatura,onComplete})=>{
  const items=Object.entries(assinatura).map(([id,qty])=>({...ASSINATURA_OPCOES.find(c=>c.id===id),qty})).filter(Boolean);
  const nome=data.nome?data.nome.split(" ")[0]:"você";
  const saudacao=data.genero==="f"?"Bem-vinda":data.genero==="m"?"Bem-vindo":"Boas-vindas";

  // Animacao: path do check tem length ~28. Anima de dashoffset 28 (invisivel) ate 0 (desenhado).
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",textAlign:"center",minHeight:"100%",background:W[50]}}>
      <div style={{width:"100%"}}>
        <div className="welcome-check" style={{width:64,height:64,borderRadius:radii.full,background:B[50],display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",border:`2px solid ${B[200]}`}}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={B[500]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" className="welcome-check-path"/>
          </svg>
        </div>
        <div className="welcome-stagger-1"><H size={26}>{saudacao}, {nome.toUpperCase()}.</H></div>
        <div className="welcome-stagger-2" style={{fontFamily:fb,fontSize:15,color:W[600],marginTop:12,lineHeight:1.6,maxWidth:300,margin:"12px auto 0"}}>Sua Assinatura está ativa. Sua primeira entrega será na próxima quinta-feira.</div>

        {items.length>0&&<div className="welcome-stagger-3" style={{background:"#FFF",borderRadius:radii.lg,overflow:"hidden",marginTop:24,width:"100%",border:`1px solid ${W[200]}`,textAlign:"left"}}>
          <div style={{padding:"14px 14px 8px",fontFamily:fb,fontSize:13,color:W[500]}}>Você vai receber toda quinta</div>
          {items.map(c=><div key={c.id} style={{display:"flex",alignItems:"stretch",borderTop:`1px solid ${W[200]}`}}>
            <img src={c.img} alt={c.nome} style={{width:72,objectFit:"cover",display:"block"}}/>
            <div style={{flex:1,padding:12}}>
              <div style={{fontFamily:fb,fontSize:15,fontWeight:600,color:W[800]}}>{c.qty}× {c.nome} ({c.peso})</div>
            </div>
          </div>)}
          <div style={{padding:"10px 14px 14px",fontFamily:fb,fontSize:13,color:W[500],borderTop:`1px solid ${W[200]}`}}>Na sua porta.</div>
        </div>}

        <div className="welcome-stagger-4" style={{fontFamily:fb,fontSize:13,color:B[600],marginTop:20,lineHeight:1.5,background:B[50],borderRadius:radii.md,padding:12,width:"100%",textAlign:"left"}}>Vai chegar uma mensagem no WhatsApp com os detalhes. Qualquer dúvida, é só responder por lá.</div>
        <div className="welcome-stagger-5" style={{marginTop:24,width:"100%"}}><Btn primary onClick={onComplete}>Acompanhe sua Assinatura</Btn></div>
      </div>
    </div>
  );
};

/* ═══ APP ═══ */
export default function CoraOnboarding({onComplete}){
  const[screen,setScreen]=useState("splash");
  const[step,setStep]=useState(1);
  const[data,setData]=useState({
    nome:"", whatsapp:"", email:"", cpf:"",
    cep:"", rua:"", numero:"", complemento:"",
    bairro:"", cidade:"", estado:"",
  });
  const assinaturaDaURL=(()=>{const p=new URLSearchParams(window.location.search);const id=p.get("produto")||p.get("cesta");return id?{[id]:1}:{};})();
  const[assinatura,setAssinatura]=useState(assinaturaDaURL);
  const[errors,setErrors]=useState({});
  const[website,setWebsite]=useState(""); // honeypot
  // Estado da T1 (cobertura + fallback do ViaCEP). Vive no pai pra
  // preservar quando voltar de Step2 pra Step1.
  const[cepFallback,setCepFallback]=useState(false);
  const[coverageStatus,setCoverageStatus]=useState("idle"); // idle | ok | blocked | unconfirmed
  const[viaCEPResolved,setViaCEPResolved]=useState(false);
  const scrollRef=useRef(null);
  // Reset scroll ao trocar step/screen do onboarding (mesma logica do App).
  useEffect(()=>{scrollRef.current?.scrollTo({top:0});window.scrollTo({top:0});},[step,screen]);

  // Validador puro por campo. Retorna mensagem de erro ou null/false.
  const validateField=(field, value, ctx={})=>{
    switch(field){
      case "nome": return !isValidNome(value) ? "Mínimo 2 caracteres, sem números." : null;
      case "whatsapp": return !isValidWhatsApp(value) ? "Confira o número com DDD." : null;
      case "email": return !isValidEmail(value) ? "Informe um e-mail válido." : null;
      case "cpf": return !isValidCPF(value) ? "CPF inválido." : null;
      case "cep": return !isValidCEP(value) ? "Informe um CEP válido." : null;
      case "numero": return !isValidNumero(value) ? "Informe o número." : null;
      case "rua": return ctx.cepFallback && !value?.trim() ? "Informe a rua." : null;
      case "bairro": return ctx.cepFallback && !value?.trim() ? "Informe o bairro." : null;
      default: return null;
    }
  };

  // Validacao inline mista:
  //  - onChange (via updateField): so revalida se o campo ja tinha erro
  //  - onBlur: valida sempre
  const updateField=(field, value)=>{
    setData(prev=>{
      const next={...prev,[field]:value};
      // Reset dependentes do CEP quando CEP muda apos resolver.
      if(field==="cep" && (prev.rua || prev.bairro || prev.cidade)){
        next.rua=""; next.bairro=""; next.cidade=""; next.estado="";
      }
      return next;
    });
    if(field==="cep"){
      // Limpa estados auxiliares ate o proximo resolve.
      setViaCEPResolved(false);
      setCepFallback(false);
      setCoverageStatus("idle");
    }
    if(errors[field]){
      const msg=validateField(field, value, {cepFallback});
      setErrors(prev=>{
        const next={...prev};
        if(msg) next[field]=msg; else delete next[field];
        return next;
      });
    }
  };

  const handleBlur=(field)=>{
    const msg=validateField(field, data[field], {cepFallback});
    setErrors(prev=>{
      const next={...prev};
      if(msg) next[field]=msg; else delete next[field];
      return next;
    });
  };

  const handleCEPResolve=(result)=>{
    setViaCEPResolved(true);
    if(result.success){
      setData(prev=>({
        ...prev,
        cep: prev.cep,
        rua: result.rua||"",
        bairro: result.bairro||"",
        cidade: result.cidade||"",
        estado: result.estado||"",
      }));
      setCepFallback(false);
      const coberto=estaCoberto(result.bairro, result.cidade);
      const naWhitelist=estaNaWhitelist({cpf:data.cpf, email:data.email, cep:result.cep});
      setCoverageStatus(coberto || naWhitelist ? "ok" : "blocked");
      // Limpa erro de CEP se havia
      setErrors(prev=>{const n={...prev}; delete n.cep; return n;});
    } else if(result.fallback){
      // ViaCEP indisponivel — libera campos pra edicao manual e marca
      // pra confirmacao manual no email pro Hugo (Opcao A).
      setCepFallback(true);
      setCoverageStatus("unconfirmed");
      setData(prev=>({...prev, rua:"", bairro:"", cidade:"", estado:""}));
      setErrors(prev=>{const n={...prev}; delete n.cep; return n;});
    } else {
      // CEP inexistente — esconde campos dependentes e nao deixa avancar
      setCepFallback(false);
      setCoverageStatus("idle");
      setViaCEPResolved(false);
      setData(prev=>({...prev, rua:"", bairro:"", cidade:"", estado:""}));
    }
  };

  const handleTryOtherCEP=()=>{
    setData(prev=>({...prev, cep:"", rua:"", bairro:"", cidade:"", estado:""}));
    setViaCEPResolved(false);
    setCepFallback(false);
    setCoverageStatus("idle");
  };

  const handleSubmitWaitlist=async(payload)=>{
    await postWaitlist({
      ...payload,
      nome: data.nome,
      email: data.email,
      cpf: data.cpf.replace(/\D/g,""),
    });
  };

  // Forma derivada: form completo e valido pra habilitar Continuar?
  const step1Valido=(()=>{
    if(coverageStatus==="blocked") return false;
    if(!viaCEPResolved) return false;
    const camposBase=["nome","whatsapp","email","cpf","cep","numero"];
    for(const f of camposBase){
      if(validateField(f, data[f], {cepFallback})) return false;
    }
    if(cepFallback){
      if(!data.rua?.trim()) return false;
      if(!data.bairro?.trim()) return false;
    }
    return true;
  })();

  const handleNext=()=>{
    if(website) return; // honeypot: bot detectado
    if(step===1){
      if(!step1Valido){
        // Defensivo: re-valida tudo pra exibir erros caso usuario clique mesmo desabilitado.
        const e={};
        ["nome","whatsapp","email","cpf","cep","numero","rua","bairro"].forEach(f=>{
          const msg=validateField(f, data[f], {cepFallback});
          if(msg) e[f]=msg;
        });
        setErrors(e);
        return;
      }
      setStep(2);
      return;
    }
    if(step===2){
      // T2 confirmada -> vai pra Welcome. Persistencia em DB e disparo
      // de e-mail entram na Fase 7 (backend).
      setScreen("welcome");
    }
  };

  const totalItems=Object.values(assinatura).reduce((s,q)=>s+q,0);
  const canNext2=totalItems>0;
  const atingiuLimite=totalItems>=LIMITE_PAES;
  const valorPaes=VALOR_POR_PAO*totalItems;
  const valorTotal=valorPaes+FRETE_MENSAL;

  const stepLabel=["SOBRE VOCÊ","SUA ASSINATURA"];

  const shell=(content)=>(
    <div style={{maxWidth:390,margin:"0 auto",minHeight:"100vh",background:W[50],display:"flex",flexDirection:"column"}}>
      {content}
      <style>{`
        *{box-sizing:border-box;margin:0;-webkit-tap-highlight-color:transparent}
        body{margin:0}
        img{max-width:100%}
        input,button{font-size:16px}
        ::-webkit-scrollbar{width:0}
        input::placeholder{font-family:'Montagu Slab',Georgia,Palatino,serif}
        /* Focus visible universal */
        button:focus-visible,a:focus-visible,[role="button"]:focus-visible,[role="dialog"]:focus-visible,[tabindex]:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:none;box-shadow:0 0 0 3px ${B[50]},0 0 0 5px ${B[500]}}
        /* Welcome: check desenhando */
        .welcome-check-path{stroke-dasharray:30;stroke-dashoffset:30;animation:drawCheck 600ms 100ms ease-out forwards}
        @keyframes drawCheck{to{stroke-dashoffset:0}}
        .welcome-check{opacity:0;transform:scale(0.8);animation:popIn 300ms ease-out forwards}
        @keyframes popIn{to{opacity:1;transform:scale(1)}}
        /* Welcome: stagger de entrada */
        [class^="welcome-stagger-"]{opacity:0;transform:translateY(12px);animation:fadeUp 400ms ease-out forwards}
        .welcome-stagger-1{animation-delay:500ms}
        .welcome-stagger-2{animation-delay:650ms}
        .welcome-stagger-3{animation-delay:800ms}
        .welcome-stagger-4{animation-delay:950ms}
        .welcome-stagger-5{animation-delay:1100ms}
        @keyframes fadeUp{to{opacity:1;transform:translateY(0)}}
        /* Reduced motion */
        @media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;animation-delay:0ms!important;transition-duration:0.01ms!important;scroll-behavior:auto!important}.welcome-check-path{stroke-dashoffset:0!important}}
      `}</style>
    </div>
  );

  if(screen==="splash") return shell(<Splash onStart={()=>setScreen("form")}/>);

  if(screen==="welcome") return shell(<>
    <div style={{padding:"10px 16px",background:"#FFF",borderBottom:`1px solid ${W[200]}`}}><img src={IMG.logo} alt="Cora" style={{height:28}}/></div>
    <div style={{flex:1}}><Welcome data={data} assinatura={assinatura} onComplete={()=>onComplete&&onComplete({data,assinatura})}/></div>
  </>);

  return shell(<>
    <div style={{background:"#FFF",padding:"12px 16px",borderBottom:`1px solid ${W[200]}`,flexShrink:0}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <img src={IMG.logo} alt="Cora" style={{height:24}}/>
        <div style={{fontFamily:fb,fontSize:12,color:W[500]}}>{step}/2 · {stepLabel[step-1]}</div>
      </div>
      <Progress step={step}/>
    </div>
    <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:16}}>
      {step===1&&<Step1
        data={data}
        updateField={updateField}
        handleBlur={handleBlur}
        errors={errors}
        cepFallback={cepFallback}
        coverageStatus={coverageStatus}
        viaCEPResolved={viaCEPResolved}
        onCEPResolve={handleCEPResolve}
        onTryOtherCEP={handleTryOtherCEP}
        onSubmitWaitlist={handleSubmitWaitlist}
      />}
      {step===2&&<Step2 assinatura={assinatura} setAssinatura={setAssinatura}/>}

      {/* Honeypot anti-bot (escondido fora de tela) */}
      <div style={{position:"absolute",left:"-9999px",opacity:0,height:0,overflow:"hidden"}} aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input type="text" id="website" name="website" value={website} onChange={e=>setWebsite(e.target.value)} tabIndex={-1} autoComplete="off"/>
      </div>
    </div>
    {/* Footer condicional: T2 com info financeira; T1 simples; some quando CEP bloqueado em T1. */}
    {!(step===1 && coverageStatus==="blocked") && (
      <div style={{padding:"12px 16px",background:"#FFF",borderTop:`1px solid ${W[200]}`,flexShrink:0}}>
        {step===2?(
          // Footer da T2: bloco de info financeira a esquerda (so com paes selecionados)
          // + botoes a direita. Quando vazio: spacer mantem botoes na borda.
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {totalItems>0?(
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:fb,fontSize:13,fontWeight:500,color:W[800],lineHeight:1.3}}>{totalItems} {totalItems===1?"pão":"pães"} por semana</div>
                <div style={{fontFamily:fb,fontSize:12,color:W[600],marginTop:2,lineHeight:1.3}}>{fmt(valorPaes)}/mês · Frete {fmt(FRETE_MENSAL)}</div>
                <div style={{fontFamily:fb,fontSize:14,fontWeight:700,color:B[700],marginTop:2,lineHeight:1.3}}>Total {fmt(valorTotal)}/mês</div>
                {atingiuLimite&&<div style={{fontFamily:fb,fontSize:12,color:W[500],marginTop:6,lineHeight:1.4}}>Máximo 3 pães por semana.</div>}
              </div>
            ):<div style={{flex:1}}/>}
            <div style={{display:"flex",gap:10,flexShrink:0}}>
              <Btn onClick={()=>setStep(1)} style={{width:"auto",flex:"0 0 auto",padding:"14px 20px"}}>Voltar</Btn>
              <Btn primary disabled={!canNext2} onClick={handleNext} style={{width:"auto",flex:"0 0 auto",padding:"14px 24px"}}>Continuar</Btn>
            </div>
          </div>
        ):(
          <div style={{display:"flex",gap:10}}>
            <Btn primary disabled={!step1Valido} onClick={handleNext}>Continuar</Btn>
          </div>
        )}
      </div>
    )}
  </>);
}
