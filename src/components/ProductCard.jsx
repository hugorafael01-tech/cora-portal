import { useState } from "react";
import { B, W, fb, fd } from "../tokens";

const QtyBtn=({qty,onAdd,onRemove,name})=>(
  <div onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
    <button aria-label={`Remover ${name}`} onClick={onRemove} style={{width:32,height:32,borderRadius:8,border:`1px solid ${W[300]}`,background:"none",cursor:"pointer",fontSize:18,color:W[600],display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
    <span style={{fontFamily:fb,fontSize:16,fontWeight:600,color:B[500],width:24,textAlign:"center"}}>{qty}</span>
    <button aria-label={`Adicionar ${name}`} onClick={onAdd} style={{width:32,height:32,borderRadius:8,border:`1px solid ${B[500]}`,background:B[50],cursor:"pointer",fontSize:18,color:B[500],display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
  </div>
);

/*
  ProductCard — componente compartilhado (Portal, Onboarding, Pré-cadastro)

  Props:
    product   — { id, nome, peso, img, desc, ingredientes?, detalhe?, preco }
                preco = string de exibição, ex: "R$ 98,00/mês" ou "R$ 25,00/un"
    qty       — number (0 = mostra CTA; >0 = mostra controles −/+)
    onAdd     — () => void
    onRemove  — () => void
    ctaLabel  — string, ex: "Pedir", "Quero", "Tenho interesse"
*/
export default function ProductCard({ product, qty=0, onAdd, onRemove, ctaLabel="Pedir", cutoff=false, basketIds=[], loadingText, successText }) {
  const [expanded, setExpanded] = useState(false);
  const [ctaSt, setCtaSt] = useState('idle');
  const [ctaErr, setCtaErr] = useState('');
  const hasDetails = product.ingredientes || product.detalhe;
  const inBasket = product.id && basketIds.includes(product.id);
  const regionId = product.id ? `product-details-${product.id}` : undefined;
  const handleCta=async()=>{
    if(!loadingText){onAdd?.();return;}
    if(ctaSt!=='idle')return;
    setCtaSt('loading');setCtaErr('');
    try{await new Promise(r=>setTimeout(r,600));setCtaSt('success');setTimeout(()=>{setCtaSt('idle');onAdd?.();},1500);}
    catch(e){setCtaErr(e.message||'Erro ao processar.');setCtaSt('idle');}
  };
  const showCta=qty===0||ctaSt!=='idle';

  return (
    <div style={{
      background:W[100],
      border:`1px solid ${qty>0?B[200]:W[200]}`,
      borderRadius:12,
      overflow:"hidden",
      transition:"border-color 200ms",
      marginBottom:8,
    }}>
      {/* Linha principal */}
      <div style={{display:"flex",alignItems:"stretch"}}>
        <img
          src={product.img} alt={product.nome}
          role={hasDetails?"button":undefined}
          aria-expanded={hasDetails?expanded:undefined}
          aria-controls={hasDetails?regionId:undefined}
          onClick={hasDetails?()=>setExpanded(e=>!e):undefined}
          style={{
            width:88, objectFit:"cover", display:"block", flexShrink:0,
            borderRadius:expanded?"12px 0 0 0":"12px 0 0 12px",
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

          {cutoff
            ?<button disabled style={{padding:"8px 16px",borderRadius:8,border:"none",background:B[500],color:"#FFF",fontFamily:fb,fontSize:12,fontWeight:500,cursor:"default",flexShrink:0,minHeight:40,opacity:0.5}}>{ctaLabel}</button>
            :showCta
            ?<button disabled={ctaSt!=='idle'} onClick={handleCta} style={{padding:"8px 16px",borderRadius:8,border:ctaSt==='success'?'1px solid #6EE7B7':'none',background:ctaSt==='success'?'#D1FAE5':B[500],color:ctaSt==='success'?'#065F46':'#FFF',fontFamily:fb,fontSize:12,fontWeight:500,cursor:ctaSt!=='idle'?'default':'pointer',flexShrink:0,minHeight:40,opacity:ctaSt==='loading'?0.5:1,transition:'all 150ms ease'}}>{ctaSt==='loading'?loadingText:ctaSt==='success'?successText:ctaLabel}</button>
            :<QtyBtn qty={qty} onAdd={onAdd} onRemove={onRemove} name={product.nome}/>
          }
        </div>
      </div>

      {cutoff&&<div style={{padding:"0 12px 8px",fontFamily:fb,fontSize:13,color:"#7A766E"}}>Prazo encerrado. Alterações valem a partir da próxima semana.</div>}
      {ctaErr&&<div style={{padding:"4px 12px 8px",fontFamily:fb,fontSize:13,color:'#9A3412',background:'#FFEDD5',borderRadius:8,margin:"0 12px 8px"}}>{ctaErr}</div>}

      {/* Detalhe expandido */}
      {expanded&&hasDetails&&(
        <div id={regionId} role="region" aria-label={`Detalhes de ${product.nome}`} style={{padding:"12px 16px 16px",borderTop:`1px solid ${W[200]}`,animation:"fadeUp 200ms ease"}}>
          {product.ingredientes&&(
            <div style={{marginBottom:10}}>
              <div style={{fontFamily:fd,fontSize:12,textTransform:"uppercase",color:W[400],letterSpacing:"0.04em",marginBottom:4}}>Ingredientes</div>
              <div style={{fontFamily:fb,fontSize:13,color:W[600],lineHeight:1.5}}>{product.ingredientes}</div>
            </div>
          )}
          {product.detalhe&&(
            <div>
              <div style={{fontFamily:fd,fontSize:12,textTransform:"uppercase",color:W[400],letterSpacing:"0.04em",marginBottom:4}}>Sobre este pão</div>
              <div style={{fontFamily:fb,fontSize:13,color:W[700],lineHeight:1.6}}>{product.detalhe}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}