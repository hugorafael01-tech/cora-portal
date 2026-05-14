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
  ProductCard — componente compartilhado (Portal · Cardápio, Onboarding T2, PreCadastro).

  DOIS MODOS visuais:

  1. Cardápio (default) — wireframe v2 Frente C item 3:
     - Linha clicável "row" (foto 88×88 + nome + meta + desc curta + price-row "detalhes ⌄")
     - Botão "Adicionar à cesta" primary full-width, sempre presente
     - Accordion inline com Sobre + Ingredientes (chips) abre/fecha sem modal
     - Click na row toggla expand; click no botão dispara onAdd com stopPropagation
     - Múltiplos cards podem ficar abertos simultaneamente

  2. Onboarding/PreCadastro — `directQtySelector=true`:
     - Mantém visual atual (foto à esquerda, QtyBtn à direita)
     - Cardápio nunca usa esse modo

  Props:
    product            — { id, nome, peso, img, desc, ingredientes?, detalhe?, sobre?, preco }
                         preco = string de exibição, ex: "R$ 98,00/mês" ou "R$ 25,00/un"
    qty                — number (só usado em directQtySelector)
    onAdd              — () => void. No Cardápio recebe o produto via wrapper externo.
    onRemove           — () => void (só directQtySelector)
    ctaLabel           — string. Default: "Adicionar à cesta"
    directQtySelector  — bool. true: nunca mostra CTA, sempre QtyBtn. Onboarding T2.
    lockedReason       — string opcional. CTA disabled + microcopy abaixo.
    cutoff             — bool. CTA disabled + CutoffMsg abaixo.
    disabled           — bool. CTA disabled (sem microcopy específico).
    basketIds          — number[]. Marca "Este pão já faz parte da sua cesta" no card de Pão Original/Integral durante Onboarding.
*/
export default function ProductCard({
  product,
  qty = 0,
  onAdd,
  onRemove,
  ctaLabel = "Adicionar à cesta",
  cutoff = false,
  disabled = false,
  basketIds = [],
  loadingText,
  successText,
  directQtySelector = false,
  lockedReason,
}) {
  const [expanded, setExpanded] = useState(false);
  const [ctaSt, setCtaSt] = useState("idle");
  const [ctaErr, setCtaErr] = useState("");

  const sobreText = product.sobre || product.detalhe;
  const hasDetails = !!(product.ingredientes || sobreText);
  const inBasket = product.id && basketIds.includes(product.id);
  const regionId = product.id ? `product-details-${product.id}` : undefined;

  // Parse ingredientes em chips (string → array). Blindado contra whitespace e vazios.
  const ingredientesList = product.ingredientes
    ? product.ingredientes.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const isCtaLocked = cutoff || !!lockedReason || disabled;

  const handleCta = async (e) => {
    e?.stopPropagation?.();
    if (!loadingText) { onAdd?.(); return; }
    if (ctaSt !== "idle") return;
    setCtaSt("loading"); setCtaErr("");
    try {
      await new Promise((r) => setTimeout(r, 600));
      setCtaSt("success");
      setTimeout(() => { setCtaSt("idle"); onAdd?.(); }, 1500);
    } catch (err) {
      setCtaErr(err.message || "Erro ao processar.");
      setCtaSt("idle");
    }
  };

  // ─── Modo directQtySelector (Onboarding T2, PreCadastro) ─────────────────
  // Mantém o layout legacy com QtyBtn à direita. Sem accordion inline.
  if (directQtySelector) {
    const cardBg = qty > 0 ? B[50] : W[50];
    const cardBorderColor = qty > 0 ? B[500] : W[200];
    const cardBorderWidth = qty > 0 ? "1.5px" : "1px";
    return (
      <div style={{
        background: cardBg,
        border: `${cardBorderWidth} solid ${cardBorderColor}`,
        borderRadius: radii.lg,
        overflow: "hidden",
        transition: "background 200ms, border-color 200ms, opacity 200ms",
        marginBottom: 8,
        opacity: (disabled && qty === 0) ? 0.55 : 1,
      }}>
        <div style={{ display: "flex", alignItems: "stretch" }}>
          <img
            src={product.img} alt={product.nome}
            loading="lazy" decoding="async"
            style={{ width: 88, objectFit: "cover", display: "block", flexShrink: 0, borderRadius: `${radii.lg} 0 0 ${radii.lg}` }}
          />
          <div style={{ flex: 1, padding: "12px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: fb, fontSize: 14, fontWeight: 600, color: W[800] }}>
                {product.nome} <span style={{ fontWeight: 400, fontSize: 12, color: W[500] }}>({product.peso})</span>
              </div>
              {inBasket && <div style={{ fontFamily: fb, fontSize: 12, fontStyle: "italic", color: "#2E55CD", marginTop: 2 }}>Este pão já faz parte da sua cesta</div>}
              <div style={{ fontFamily: fb, fontSize: 12, color: W[500], marginTop: 4, lineHeight: 1.4 }}>{product.desc}</div>
              <div style={{ fontFamily: fb, fontSize: 12, color: W[600], marginTop: 4 }}>{product.preco}</div>
            </div>
            <QtyBtn qty={qty} onAdd={onAdd} onRemove={onRemove} name={product.nome} addDisabled={disabled} />
          </div>
        </div>
      </div>
    );
  }

  // ─── Modo Cardápio (default) — wireframe v2 ──────────────────────────────
  const toggleExpand = () => { if (hasDetails) setExpanded((e) => !e); };
  return (
    <div style={{
      background: "#FFF",
      border: `1px solid ${W[200]}`,
      borderRadius: radii.lg,
      overflow: "hidden",
      transition: "border-color 200ms",
      marginBottom: 8,
    }}>
      {/* Linha clicável: foto + info */}
      <div
        role={hasDetails ? "button" : undefined}
        aria-expanded={hasDetails ? expanded : undefined}
        aria-controls={hasDetails ? regionId : undefined}
        onClick={toggleExpand}
        style={{
          display: "flex", alignItems: "stretch",
          cursor: hasDetails ? "pointer" : "default",
        }}
      >
        <img
          src={product.img} alt={product.nome}
          loading="lazy" decoding="async"
          style={{
            width: 88, height: 88, objectFit: "cover", display: "block", flexShrink: 0,
            borderRadius: `${radii.lg} 0 0 0`,
          }}
        />
        <div style={{ flex: 1, padding: "12px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
          <div style={{ fontFamily: fb, fontSize: 14, fontWeight: 600, color: W[800] }}>
            {product.nome} <span style={{ fontWeight: 400, fontSize: 12, color: W[500] }}>({product.peso})</span>
          </div>
          {product.desc && <div style={{ fontFamily: fb, fontSize: 12, color: W[500], lineHeight: 1.4, marginTop: 2 }}>{product.desc}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{ fontFamily: fb, fontSize: 12, color: W[700], fontWeight: 500 }}>{product.preco}</span>
            {hasDetails && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontFamily: fd, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: W[400] }}>
                detalhes
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={W[400]} strokeWidth="2"
                  style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 200ms" }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CTA full-width "Adicionar à cesta" */}
      <div style={{ padding: "0 12px 12px" }}>
        <button
          onClick={handleCta}
          disabled={isCtaLocked || ctaSt !== "idle"}
          className={isCtaLocked ? "" : "press-scale"}
          style={{
            width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "10px 14px",
            borderRadius: radii.md,
            border: ctaSt === "success" ? "1px solid #6EE7B7" : "none",
            background: ctaSt === "success" ? "#D1FAE5" : B[500],
            color: ctaSt === "success" ? "#065F46" : "#FFF",
            fontFamily: fb, fontSize: 13, fontWeight: 500,
            cursor: (isCtaLocked || ctaSt !== "idle") ? "default" : "pointer",
            opacity: isCtaLocked ? 0.5 : (ctaSt === "loading" ? 0.7 : 1),
            minHeight: 40,
            transition: "all 150ms ease",
          }}
        >
          {ctaSt === "loading" ? loadingText : ctaSt === "success" ? successText : (
            <>
              <span style={{ fontSize: 16, lineHeight: 1 }} aria-hidden="true">+</span>
              {ctaLabel}
            </>
          )}
        </button>
        {cutoff && <div style={{ fontFamily: fb, fontSize: 13, color: "#7A766E", marginTop: 6 }}>Prazo encerrado. Alterações valem a partir da próxima semana.</div>}
        {lockedReason && !cutoff && <div style={{ fontFamily: fb, fontSize: 12, color: W[500], marginTop: 6, lineHeight: 1.4 }}>{lockedReason}</div>}
        {ctaErr && <div style={{ fontFamily: fb, fontSize: 13, color: "#9A3412", background: "#FFEDD5", borderRadius: radii.md, padding: "6px 10px", marginTop: 6 }}>{ctaErr}</div>}
      </div>

      {/* Accordion expandido */}
      {expanded && hasDetails && (
        <div id={regionId} role="region" aria-label={`Detalhes de ${product.nome}`} style={{ padding: "12px 16px 16px", borderTop: `1px solid ${W[200]}`, animation: "fadeUp 200ms ease" }}>
          {sobreText && (
            <div style={{ marginBottom: ingredientesList.length > 0 ? 14 : 8 }}>
              <div style={{ fontFamily: fd, fontSize: 12, textTransform: "uppercase", color: W[500], letterSpacing: "0.04em", marginBottom: 6 }}>Sobre</div>
              <div style={{ fontFamily: fb, fontSize: 13, color: W[700], lineHeight: 1.6 }}>{sobreText}</div>
            </div>
          )}
          {ingredientesList.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontFamily: fd, fontSize: 12, textTransform: "uppercase", color: W[500], letterSpacing: "0.04em", marginBottom: 6 }}>Ingredientes</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ingredientesList.map((ing, i) => (
                  <span key={i} style={{ fontFamily: fb, fontSize: 12, color: W[700], background: W[100], border: `1px solid ${W[200]}`, borderRadius: radii.full, padding: "4px 10px" }}>{ing}</span>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => setExpanded(false)}
            className="press-scale"
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontFamily: fd, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em",
              color: W[500], background: "none", border: "none", cursor: "pointer",
              padding: "6px 0", marginTop: 4,
            }}
          >
            Fechar detalhes
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={W[500]} strokeWidth="2">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
