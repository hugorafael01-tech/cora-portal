import { useState } from "react";

const B={50:"#EBEEFB",100:"#C4CDF4",200:"#8B9BE6",400:"#5670D8",500:"#2E55CD",600:"#2545A8",700:"#1D3787",800:"#172E6E"};
const W={50:"#FAFAF8",100:"#F5F4F0",200:"#E8E6E1",300:"#D4D1CA",400:"#A8A49C",500:"#7A766E",600:"#5C5850",700:"#3D3A34",800:"#2A2723"};
const fb="'Montagu Slab',Georgia,Palatino,serif";
const fd="'League Gothic',Impact,'Arial Narrow',sans-serif";

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
export default function ProductCard({ product, qty=0, onAdd, onRemove, ctaLabel="Pedir" }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = product.ingredientes || product.detalhe;

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
          onClick={hasDetails?()=>setExpanded(e=>!e):undefined}
          style={{
            width:88, objectFit:"cover", display:"block", flexShrink:0,
            borderRadius:expanded?"12px 0 0 0":"12px 0 0 12px",
            cursor:hasDetails?"pointer":"default",
          }}
        />
        <div style={{flex:1,padding:"12px",display:"flex",alignItems:"center",gap:8}}>
          <div
            style={{flex:1,cursor:hasDetails?"pointer":"default"}}
            onClick={hasDetails?()=>setExpanded(e=>!e):undefined}
          >
            <div style={{fontFamily:fb,fontSize:14,fontWeight:600,color:W[800]}}>
              {product.nome} <span style={{fontWeight:400,fontSize:12,color:W[500]}}>({product.peso})</span>
            </div>
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

          {qty===0
            ?<button onClick={onAdd} style={{padding:"8px 16px",borderRadius:8,border:"none",background:B[500],color:"#FFF",fontFamily:fb,fontSize:12,fontWeight:500,cursor:"pointer",flexShrink:0,minHeight:40}}>{ctaLabel}</button>
            :<QtyBtn qty={qty} onAdd={onAdd} onRemove={onRemove} name={product.nome}/>
          }
        </div>
      </div>

      {/* Detalhe expandido */}
      {expanded&&hasDetails&&(
        <div style={{padding:"12px 16px 16px",borderTop:`1px solid ${W[200]}`,animation:"fadeUp 200ms ease"}}>
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