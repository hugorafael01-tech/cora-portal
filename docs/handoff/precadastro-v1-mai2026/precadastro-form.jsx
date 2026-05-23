/* ══════════════════════════════════════════════════════════════
   CORA · PreCadastro v1 — Template da TELA 2 (Form)
   Cada variante injeta seu próprio bloco de produtos via `productsSlot`.
   Recebe `state` opcional pra pré-popular campos / mostrar contagem.
   ══════════════════════════════════════════════════════════════ */

const DEFAULT_STATE = {
  nome: "",
  whatsapp: "",
  cidade: "",
  bairro: "",
  outra: "",
  optin: false,
  selectedIds: [],
  focusField: null,
  errors: {},
};

/* Renderiza a estrutura do form, com slot pra os produtos */
const PreCadastroForm = ({
  variantId,
  productsSlot,
  state = {},
  desktop = false,
  showLimitHint = false,
}) => {
  const s = { ...DEFAULT_STATE, ...state };
  const selectedCount = s.selectedIds.length;
  const isFull = selectedCount >= 2;

  return (
    <div className={"pc" + (desktop ? " is-desktop" : "") + " variant-" + variantId} data-screen-label={`Form · variante ${variantId.toUpperCase()}${showLimitHint ? " · limite" : ""}`}>
      <Header />

      <div className="pc-body">
        <h1 className="pc-h1">Conte um pouco sobre você</h1>

        {/* ─── DADOS ─── */}
        <Section eyebrow="Quem é você" top={28}>
          <div className="pc-twocol">
            <Field
              label="Como quer ser chamado(a)?"
              value={s.nome}
              placeholder="Seu nome"
              focused={s.focusField === "nome"}
              error={s.errors.nome}
            />
            <Field
              label="WhatsApp com DDD"
              value={s.whatsapp}
              placeholder="(21) 99999-9999"
              focused={s.focusField === "whatsapp"}
              error={s.errors.whatsapp}
            />
          </div>
        </Section>

        {/* ─── PÃES ─── */}
        <Section eyebrow="Pães">
          <div className="pc-paes-head">
            <p className="pc-question">Quais te interessam mais? Pode marcar 2.</p>
            <CounterChip n={selectedCount} max={2} full={isFull} />
          </div>
          {variantId === "C" && <SelectedChips selectedIds={s.selectedIds} />}
          {productsSlot}
          {showLimitHint && (
            <p className="pc-limit-hint">
              Pra trocar, desmarque um dos que já estão escolhidos.
            </p>
          )}
          <div className="pc-input pc-input-other">
            <span className="pc-input-ph">{s.outra || "Outra opção que gostaria muito…"}</span>
          </div>
        </Section>

        {/* ─── ENTREGA ─── */}
        <Section eyebrow="Onde você está">
          <div className="pc-twocol">
            <SelectField
              label="Cidade"
              value={s.cidade}
              placeholder="Selecione"
              open={s.focusField === "cidade"}
            />
            <Field
              label="Bairro"
              value={s.bairro}
              placeholder="Ex: Icaraí, Copacabana…"
              focused={s.focusField === "bairro"}
              error={s.errors.bairro}
            />
          </div>
        </Section>

        {/* ─── OPTIN + LGPD + CTA ─── */}
        <Section eyebrow="Antes de enviar">
          <div className="pc-optin">
            <Checkbox checked={s.optin} size={22} />
            <span className="pc-optin-text">
              Quero receber novidades da Cora pelo WhatsApp até as entregas começarem.
            </span>
          </div>
          <p className="pc-lgpd">
            Seus dados ficam guardados só pra te avisar quando a Cora abrir oficialmente. Pode pedir pra excluir a qualquer momento pelo WhatsApp.
          </p>
          <PrimaryCTA>Tenho interesse</PrimaryCTA>
        </Section>
      </div>
    </div>
  );
};

window.PreCadastroForm = PreCadastroForm;
