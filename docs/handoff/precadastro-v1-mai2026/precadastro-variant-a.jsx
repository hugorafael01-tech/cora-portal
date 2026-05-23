/* ══════════════════════════════════════════════════════════════
   CORA · PreCadastro v1 — VARIANTE A
   "Lista editorial vertical"
   Foto 16:9 full-bleed em cima · info embaixo · 1 col
   ══════════════════════════════════════════════════════════════ */

const ProductCardA = ({ p, selected, disabled }) => (
  <article
    className={"vA-card" + (selected ? " is-selected" : "") + (disabled ? " is-disabled" : "")}
    aria-pressed={selected}
  >
    <div className="vA-photo">
      <img src={p.img} alt="" loading="lazy" />
      <div className="vA-checkmark" aria-hidden="true">
        <Checkbox checked={selected} size={28} />
      </div>
      {disabled && <div className="vA-photo-veil" aria-hidden="true" />}
    </div>
    <div className="vA-info">
      <div className="vA-info-head">
        <h3 className="vA-name">{p.nome}</h3>
        <span className="vA-peso">{p.peso}</span>
      </div>
      <p className="vA-desc">{p.desc}</p>
    </div>
  </article>
);

const ProductListA = ({ selectedIds = [], limit = false }) => (
  <div className="vA-list">
    {PRODUCTS.map((p) => {
      const isSel = selectedIds.includes(p.id);
      const isDis = limit && !isSel;
      return <ProductCardA key={p.id} p={p} selected={isSel} disabled={isDis} />;
    })}
  </div>
);

window.ProductCardA = ProductCardA;
window.ProductListA = ProductListA;
