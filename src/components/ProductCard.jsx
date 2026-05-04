import { useState } from "react";
import { B, W, fb, fd, radii } from "../tokens";

const QtyBtn=({qty,onAdd,onRemove,name,addDisabled=false})=>{
  const removeDisabled=qty<=0;
  return (
    <div onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
      <button aria-label={`Remover ${name}`} onClick={onRemove} disabled={removeDisabled} style={{width:32,height:32,borderRadius:radii.md,border:`1px solid ${W[300]}`,background:"none",cursor:removeDisabled?"not-allowed":"pointer",fontSize:18,color:removeDisabled?W[300]:W[600],display:"flex",alignItems:"center",justifyContent:"center",opacity:removeDisabled?0.35:1}}>−</button>
      <span style={{fontFamily:fb,fontSize:16,fontWeight:600,color:B[500],width:24,textAlign:"center"}}>{qty}</span>
      <button aria-label={`Adicionar ${name}`} onClick={onAdd} disabled={addDisabled} style={{width:32,height:32,borderRadius:radii.md,border:`1px solid ${addDisabled?W[200]:B[500]}`,background:addDisabled?"transparent":B[50],cursor:addDisabled?"not-allowed":"pointer",fontSize:18,color:addDisabled?W[300]:B[500],display:"flex",alignItems:"center",justifyContent:"center",opacity:addDisabled?0.35:1}}>+</button>
    </div>
  );
};

/*
  ProductCard — componente compartilhado (Portal, Onboarding, Pré-cadastro)

  Props:
    product            — { id, nome, peso, img, desc, ingredientes?, detalhe?, sobre?, preco }
                         preco = string de exibição, ex: "R$ 98,00/mês" ou "R$ 25,00/un"
                         sobre = texto técnico (composição, hidratação) — alias preferido de detalhe
    qty                — number (0 = mostra CTA; >0 = mostra controles −/+)
    onAdd              — () => void
    onRemove           — () => void
    ctaLabel           — string, ex: "Pedir", "Quero", "Tenho interesse"
    directQtySelector  — bool. true: nunca mostra CTA, sempre QtyBtn (− desabilita em qty=0).
                         Usado pela T2 do Onboarding. Default false (Cardápio).
*/
export default function ProductCard({ product, qty=0, onAdd, onRemove, ctaLabel="Pedir", cutoff=false, disabled=false, basketIds=[], loadingText, successText, directQtySelector=false }) {
  const [expanded, setExpanded] = useState(false);
  const [ctaSt, setCtaSt] = useState('idle');
  const [ctaErr, setCtaErr] = useState('');
  const sobreText = product.sobre || product.detalhe;
  const hasDetails = product.ingredientes || sobreText;
  const inBasket = product.id && basketIds.includes(product.id);
  const regionId = product.id ? `product-details-${product.id}` : undefined;
  const handleCta=async()=>{
    if(!loadingText){onAdd?.();return;}
    if(ctaSt!=='idle')return;
    setCtaSt('loading');setCtaErr('');
    try{await new Promise(r=>setTimeout(r,600));setCtaSt('success');setTimeout(()=>{setCtaSt('idle');onAdd?.();},1500);}
    catch(e){setCtaErr(e.message||'Erro ao processar.');setCtaSt('idle');}
  };
  const showCta=!directQtySelector && (qty===0||ctaSt!=='idle');
  // Estados visuais novos da T2 do Onboarding (briefing 5.2). Cardápio mantém o visual atual.
  const cardBg = directQtySelector ? (qty>0 ? B[50] : W[50]) : W[100];
  const cardBorderColor = directQtySelector
    ? (qty>0 ? B[500] : W[200])
    : (qty>0 ? B[200] : W[200]);
  const cardBorderWidth = directQtySelector && qty>0 ? "1.5px" : "1px";

  return (
    <div style={{
      background:cardBg,
      border:`${cardBorderWidth} solid ${cardBorderColor}`,
      borderRadius:radii.lg,
      overflow:"hidden",
      transition:"background 200ms, border-color 200ms, opacity 200ms",
      marginBottom:8,
      opacity:(disabled&&qty===0)?0.55:1,
    }}>
      {/* Linha principal */}
      <div style={{display:"flex",alignItems:"stretch"}}>
        <img
          src={product.img} alt={product.nome}
          loading="lazy" decoding="async"
          role={hasDetails?"button":undefined}
          aria-expanded={hasDetails?expanded:undefined}
          aria-controls={hasDetails?regionId:undefined}
          onClick={hasDetails?()=>setExpanded(e=>!e):undefined}
          style={{
            width:88, objectFit:"cover", display:"block", flexShrink:0,
            borderRadius:expanded?`${radii.lg} 0 0 0`:`${radii.lg} 0 0 ${radii.lg}`,
            cursor:hasDetails?"pointer":"default",
          }}
        />
        <div style={{flex:1,padding:"12px",display:"flex",alignItems:"center",gap:8}}>
          <div
            role={hasDetails?"button":undefined}
            aria-expanded={hasDetails?expanded:undefined}
            aria-controls={hasDetails?regionId:undefined}
            style={{flex:1,cursor:hasDetails?"pointer":"default"}}
            onClick={hasDetails?()=>setExpanded(e=>!e):undefined}
          >
            <div style={{fontFamily:fb,fontSize:14,fontWeight:600,color:W[800]}}>
              {product.nome} <span style={{fontWeight:400,fontSize:12,color:W[500]}}>({product.peso})</span>
            </div>
            {inBasket&&<div style={{fontFamily:fb,fontSize:12,fontStyle:"italic",color:"#2E55CD",marginTop:2}}>Este pão já faz parte da sua cesta</div>}
            <div style={{fontFamily:fb,fontSize:12,color:W[500],marginTop:4,lineHeight:1.4}}>{product.desc}</div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
              <span style={{fontFamily:fb,fontSize:12,color:W[600]}}>{product.preco}</span>
              {hasDetails&&(
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={W[400]} strokeWidth="2"
                  style={{transform:expanded?"rotate(180deg)":"none",transition:"transform 200ms",flexShrink:0}}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              )}
            </div>
          </div>

          {(cutoff||(disabled&&qty===0))&&!directQtySelector
            ?<button disabled style={{padding:"8px 16px",borderRadius:radii.md,border:"none",background:B[500],color:"#FFF",fontFamily:fb,fontSize:12,fontWeight:500,cursor:"default",flexShrink:0,minHeight:40,opacity:0.5}}>{ctaLabel}</button>
            :showCta
            ?<button disabled={ctaSt!=='idle'} onClick={handleCta} style={{padding:"8px 16px",borderRadius:radii.md,border:ctaSt==='success'?'1px solid #6EE7B7':'none',background:ctaSt==='success'?'#D1FAE5':B[500],color:ctaSt==='success'?'#065F46':'#FFF',fontFamily:fb,fontSize:12,fontWeight:500,cursor:ctaSt!=='idle'?'default':'pointer',flexShrink:0,minHeight:40,opacity:ctaSt==='loading'?0.5:1,transition:'all 150ms ease'}}>{ctaSt==='loading'?loadingText:ctaSt==='success'?successText:ctaLabel}</button>
            :<QtyBtn qty={qty} onAdd={onAdd} onRemove={onRemove} name={product.nome} addDisabled={disabled}/>
          }
        </div>
      </div>

      {cutoff&&<div style={{padding:"0 12px 8px",fontFamily:fb,fontSize:13,color:"#7A766E"}}>Prazo encerrado. Alterações valem a partir da próxima semana.</div>}
      {ctaErr&&<div style={{padding:"4px 12px 8px",fontFamily:fb,fontSize:13,color:'#9A3412',background:'#FFEDD5',borderRadius:radii.md,margin:"0 12px 8px"}}>{ctaErr}</div>}

      {/* Detalhe expandido */}
      {expanded&&hasDetails&&(
        <div id={regionId} role="region" aria-label={`Detalhes de ${product.nome}`} style={{padding:"12px 16px 16px",borderTop:`1px solid ${W[200]}`,animation:"fadeUp 200ms ease"}}>
          {product.ingredientes&&(
            <div style={{marginBottom:10}}>
              <div style={{fontFamily:fd,fontSize:12,textTransform:"uppercase",color:W[500],letterSpacing:"0.04em",marginBottom:4}}>Ingredientes</div>
              <div style={{fontFamily:fb,fontSize:13,color:W[600],lineHeight:1.5}}>{product.ingredientes}</div>
            </div>
          )}
          {sobreText&&(
            <div>
              <div style={{fontFamily:fd,fontSize:12,textTransform:"uppercase",color:W[500],letterSpacing:"0.04em",marginBottom:4}}>Sobre este pão</div>
              <div style={{fontFamily:fb,fontSize:13,color:W[700],lineHeight:1.6}}>{sobreText}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}