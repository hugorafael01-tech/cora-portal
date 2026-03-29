import { useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   CORA — Onboarding (3 telas) — Protótipo para teste de usabilidade
   Rota: /cadastro → ao confirmar, redireciona pra Home
   ═══════════════════════════════════════════════════════════════ */

const B = { 50:"#EBEEFB",100:"#C4CDF4",200:"#8B9BE6",400:"#5670D8",500:"#2E55CD",600:"#2545A8",700:"#1D3787",800:"#172E6E",900:"#0F1E49" };
const W = { 50:"#FAFAF8",100:"#F5F4F0",200:"#E8E6E1",300:"#D4D1CA",400:"#A8A49C",500:"#7A766E",600:"#5C5850",700:"#3D3A34",800:"#2A2723" };
const fd = "'League Gothic',Impact,'Arial Narrow',sans-serif";
const fb = "'Montagu Slab',Georgia,Palatino,serif";
const fmt = (v) => `R$ ${v.toFixed(2).replace(".",",")}`;

const CESTAS = [
  { id:"original",    nome:"Pão Original",  peso:"580g", avulso:25, mensal:98,  cor:"#E8D5B7", desc:"Farinha, água, sal e o levain da Cora. Fermentação longa de 36h. O pão que começou tudo." },
  { id:"integral",    nome:"Pão Integral",   peso:"614g", avulso:28, mensal:110, cor:"#C4A882", desc:"100% integral com azeite extra-virgem. Casca fina, miolo denso e nutritivo." },
  { id:"multigraos",  nome:"Multigrãos",     peso:"631g", avulso:32, mensal:126, cor:"#B8976A", desc:"Gergelim, quinoa, linhaça, girassol e abóbora. Crocante por fora, macio por dentro." },
  { id:"brioche",     nome:"Brioche",        peso:"400g", avulso:34, mensal:128, cor:"#D4A855", desc:"Manteiga, ovos e mel. Massa amanteigada de fermentação natural, dourada e leve." },
];

/* ─── Componentes base ─── */
const H = ({ children, size=24 }) => (
  <div style={{ fontFamily:fd, fontSize:size, textTransform:"uppercase", letterSpacing:"0.02em", color:B[800], margin:0 }}>{children}</div>
);

const Label = ({ children, apoio }) => (
  <div style={{ marginBottom:4 }}>
    <div style={{ fontFamily:fb, fontSize:14, fontWeight:500, color:W[700] }}>{children}</div>
    {apoio && <div style={{ fontFamily:fb, fontSize:12, color:W[400], marginTop:2 }}>{apoio}</div>}
  </div>
);

const Input = ({ placeholder, value, onChange, type="text" }) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={e => onChange(e.target.value)}
    style={{
      width:"100%", padding:"12px 14px", fontSize:15, fontFamily:fb,
      border:`1.5px solid ${W[200]}`, borderRadius:8, background:"#FFF",
      color:W[800], outline:"none", transition:"border-color 200ms",
    }}
    onFocus={e => e.target.style.borderColor = B[400]}
    onBlur={e => e.target.style.borderColor = W[200]}
  />
);

const Btn = ({ children, primary, disabled, onClick, style={} }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      width:"100%", padding:"14px 0", borderRadius:8, fontSize:15, fontWeight:600,
      fontFamily:fb, cursor: disabled ? "default" : "pointer", transition:"all 200ms",
      border: primary ? "none" : `1.5px solid ${W[300]}`,
      background: primary ? (disabled ? W[300] : B[500]) : "transparent",
      color: primary ? "#FFF" : W[600],
      opacity: disabled ? 0.6 : 1,
      ...style,
    }}
  >
    {children}
  </button>
);

const Progress = ({ step }) => (
  <div style={{ display:"flex", gap:6, padding:"0 16px" }}>
    {[1,2,3].map(s => (
      <div key={s} style={{
        flex:1, height:3, borderRadius:2, transition:"all 300ms",
        background: s <= step ? B[500] : W[200],
      }} />
    ))}
  </div>
);

const Field = ({ label, apoio, children }) => (
  <div style={{ marginBottom:16 }}>
    <Label apoio={apoio}>{label}</Label>
    {children}
  </div>
);

/* ═══════════════════ TELA 1 — Dados pessoais ═══════════════════ */
const Step1 = ({ data, setData }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
    <div style={{ marginBottom:20 }}>
      <H size={22}>SEUS DADOS</H>
      <div style={{ fontFamily:fb, fontSize:14, color:W[500], marginTop:4 }}>
        Pra gente saber quem você é e onde entregar.
      </div>
    </div>

    <Field label="Nome completo" apoio="Como você gostaria de ser chamado(a)?">
      <Input placeholder="Ana Beatriz Souza" value={data.nome} onChange={v => setData({...data, nome:v})} />
    </Field>

    <Field label="WhatsApp (com DDD)" apoio="Para confirmações de entrega e novidades.">
      <Input placeholder="(21) 99999-0000" value={data.whatsapp} onChange={v => setData({...data, whatsapp:v})} type="tel" />
    </Field>

    <Field label="E-mail" apoio="Para login e comprovantes.">
      <Input placeholder="ana@email.com" value={data.email} onChange={v => setData({...data, email:v})} type="email" />
    </Field>

    <div style={{ height:1, background:W[200], margin:"4px 0 16px" }} />

    <Field label="Endereço completo" apoio="Rua, número, bairro e cidade.">
      <Input placeholder="Rua das Flores, 120 — Fonseca, Niterói" value={data.endereco} onChange={v => setData({...data, endereco:v})} />
    </Field>

    <Field label="Complemento" apoio="Apartamento, bloco, portaria, referência.">
      <Input placeholder="Bl. A, Apto 502 — deixar com o porteiro" value={data.complemento} onChange={v => setData({...data, complemento:v})} />
    </Field>
  </div>
);

/* ═══════════════════ TELA 2 — Escolha sua cesta ═══════════════════ */
const Step2 = ({ cesta, setCesta, qtd, setQtd }) => {
  const selected = CESTAS.find(c => c.id === cesta);
  const mensal = selected ? selected.mensal * qtd : 0;
  const frete = 15;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
      <div style={{ marginBottom:16 }}>
        <H size={22}>ESCOLHA SUA CESTA</H>
        <div style={{ fontFamily:fb, fontSize:14, color:W[500], marginTop:4 }}>
          Você recebe toda semana, sem precisar pedir de novo. Pode trocar a qualquer momento.
        </div>
      </div>

      {/* Cards de cesta */}
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
        {CESTAS.map(c => {
          const sel = cesta === c.id;
          return (
            <div
              key={c.id}
              onClick={() => setCesta(c.id)}
              style={{
                position:"relative",
                background: sel ? "#FFF" : W[100],
                border: sel ? `2px solid ${B[500]}` : `1.5px solid ${W[200]}`,
                borderRadius:12, padding:14, cursor:"pointer",
                transition:"all 200ms",
              }}
            >
              {/* Check no canto */}
              {sel && (
                <div style={{
                  position:"absolute", top:10, right:10,
                  width:22, height:22, borderRadius:11,
                  background:B[500], display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  <span style={{ color:"#FFF", fontSize:13, fontWeight:700 }}>&#10003;</span>
                </div>
              )}
              <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                {/* Placeholder de foto */}
                <div style={{
                  width:48, height:48, borderRadius:8, flexShrink:0,
                  background: sel ? c.cor : W[200],
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={sel ? "#FFF" : W[400]} strokeWidth="1.5">
                    <ellipse cx="12" cy="11" rx="9" ry="7" />
                    <path d="M3 11c0 3 4 7 9 7s9-4 9-7" />
                  </svg>
                </div>
                <div style={{ flex:1, paddingRight: sel ? 24 : 0 }}>
                  <div style={{ fontFamily:fb, fontSize:15, fontWeight:600, color: sel ? W[800] : W[600] }}>{c.nome}</div>
                  <div style={{ fontFamily:fb, fontSize:12, color:W[400], marginTop:1 }}>{c.peso} · {fmt(c.mensal)}/mês</div>
                  {sel && (
                    <div style={{ fontFamily:fb, fontSize:12, color:W[500], marginTop:6, lineHeight:1.4 }}>
                      {c.desc}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quantidade semanal */}
      {cesta && (
        <div style={{ marginBottom:20 }}>
          <Label apoio="Comece com 1 e aumente quando quiser.">Quantos por semana?</Label>
          <div style={{ display:"flex", gap:10, marginTop:6 }}>
            {[1,2].map(q => (
              <button
                key={q}
                onClick={() => setQtd(q)}
                style={{
                  flex:1, padding:"12px 0", borderRadius:8, fontSize:15,
                  fontFamily:fb, fontWeight:600, cursor:"pointer", transition:"all 200ms",
                  border: qtd===q ? `2px solid ${B[500]}` : `1.5px solid ${W[200]}`,
                  background: qtd===q ? B[50] : "#FFF",
                  color: qtd===q ? B[700] : W[500],
                }}
              >
                {q} pão{q>1?"es":""}/semana
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resumo de valor */}
      {cesta && (
        <div style={{
          background:W[100], borderRadius:10, padding:14,
          border:`1px solid ${W[200]}`,
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ fontFamily:fb, fontSize:13, color:W[500] }}>{selected.nome} × {qtd}/semana</span>
            <span style={{ fontFamily:fb, fontSize:13, color:W[600] }}>{fmt(selected.mensal * qtd)}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ fontFamily:fb, fontSize:13, color:W[500] }}>Frete mensal</span>
            <span style={{ fontFamily:fb, fontSize:13, color:W[600] }}>{fmt(frete)}</span>
          </div>
          <div style={{ height:1, background:W[200], marginBottom:8 }} />
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontFamily:fb, fontSize:15, fontWeight:600, color:W[800] }}>Total mensal</span>
            <span style={{ fontFamily:fb, fontSize:18, fontWeight:700, color:B[500] }}>{fmt(mensal + frete)}</span>
          </div>
          <div style={{ fontFamily:fb, fontSize:11, color:W[400], marginTop:6, lineHeight:1.4 }}>
            Cobrado mensalmente no cartão. Em meses com 5 semanas, o 5º pão é presente da Cora.
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════ TELA 2b — Pagamento (dentro da tela 2) ═══════════════════ */
const PaymentFields = ({ payment, setPayment }) => (
  <div style={{ marginTop:20 }}>
    <div style={{ height:1, background:W[200], marginBottom:16 }} />
    <Label apoio="Seu cartão é cadastrado com segurança. A primeira cobrança acontece no início do mês.">Dados de pagamento</Label>

    <div style={{ marginBottom:12 }}>
      <Input placeholder="Número do cartão" value={payment.numero} onChange={v => setPayment({...payment, numero:v})} />
    </div>
    <div style={{ display:"flex", gap:10, marginBottom:12 }}>
      <div style={{ flex:1 }}>
        <Input placeholder="MM/AA" value={payment.validade} onChange={v => setPayment({...payment, validade:v})} />
      </div>
      <div style={{ flex:1 }}>
        <Input placeholder="CVV" value={payment.cvv} onChange={v => setPayment({...payment, cvv:v})} />
      </div>
    </div>
    <Field label="CPF" apoio="Para a nota fiscal.">
      <Input placeholder="000.000.000-00" value={payment.cpf} onChange={v => setPayment({...payment, cpf:v})} />
    </Field>
  </div>
);

/* ═══════════════════ TELA 3 — Revisão e confirmação ═══════════════════ */
const Step3 = ({ data, cesta, qtd, payment }) => {
  const selected = CESTAS.find(c => c.id === cesta);
  const mensal = selected ? selected.mensal * qtd : 0;
  const frete = 15;

  const Row = ({ label, value }) => (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${W[100]}` }}>
      <span style={{ fontFamily:fb, fontSize:13, color:W[500] }}>{label}</span>
      <span style={{ fontFamily:fb, fontSize:13, fontWeight:500, color:W[800], textAlign:"right", maxWidth:"60%" }}>{value}</span>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
      <div style={{ marginBottom:16 }}>
        <H size={22}>TUDO CERTO?</H>
        <div style={{ fontFamily:fb, fontSize:14, color:W[500], marginTop:4 }}>
          Confira seus dados antes de confirmar. Você pode alterar tudo depois.
        </div>
      </div>

      {/* Seção: Dados pessoais */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontFamily:fd, fontSize:14, textTransform:"uppercase", color:B[700], letterSpacing:"0.04em", marginBottom:8 }}>DADOS PESSOAIS</div>
        <div style={{ background:"#FFF", borderRadius:10, padding:"4px 14px", border:`1px solid ${W[200]}` }}>
          <Row label="Nome" value={data.nome || "—"} />
          <Row label="WhatsApp" value={data.whatsapp || "—"} />
          <Row label="E-mail" value={data.email || "—"} />
          <Row label="Endereço" value={data.endereco || "—"} />
          {data.complemento && <Row label="Complemento" value={data.complemento} />}
        </div>
      </div>

      {/* Seção: Sua cesta */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontFamily:fd, fontSize:14, textTransform:"uppercase", color:B[700], letterSpacing:"0.04em", marginBottom:8 }}>SUA CESTA</div>
        <div style={{ background:"#FFF", borderRadius:10, padding:14, border:`1px solid ${W[200]}` }}>
          <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:10 }}>
            <div style={{
              width:44, height:44, borderRadius:8, background: selected?.cor || W[200],
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="1.5">
                <ellipse cx="12" cy="11" rx="9" ry="7" />
                <path d="M3 11c0 3 4 7 9 7s9-4 9-7" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily:fb, fontSize:15, fontWeight:600, color:W[800] }}>{selected?.nome}</div>
              <div style={{ fontFamily:fb, fontSize:12, color:W[500] }}>{selected?.peso} · {qtd} pão{qtd>1?"es":""}/semana</div>
            </div>
          </div>
          <div style={{ height:1, background:W[100], marginBottom:8 }} />
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ fontFamily:fb, fontSize:13, color:W[500] }}>Assinatura</span>
            <span style={{ fontFamily:fb, fontSize:13, color:W[600] }}>{fmt(mensal)}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ fontFamily:fb, fontSize:13, color:W[500] }}>Frete</span>
            <span style={{ fontFamily:fb, fontSize:13, color:W[600] }}>{fmt(frete)}</span>
          </div>
          <div style={{ height:1, background:W[200], marginBottom:8 }} />
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontFamily:fb, fontSize:15, fontWeight:600, color:W[800] }}>Total mensal</span>
            <span style={{ fontFamily:fb, fontSize:18, fontWeight:700, color:B[500] }}>{fmt(mensal + frete)}</span>
          </div>
        </div>
      </div>

      {/* Seção: Pagamento */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontFamily:fd, fontSize:14, textTransform:"uppercase", color:B[700], letterSpacing:"0.04em", marginBottom:8 }}>PAGAMENTO</div>
        <div style={{ background:"#FFF", borderRadius:10, padding:"4px 14px", border:`1px solid ${W[200]}` }}>
          <Row label="Cartão" value={payment.numero ? `•••• ${payment.numero.slice(-4)}` : "—"} />
          <Row label="CPF" value={payment.cpf || "—"} />
        </div>
      </div>

      {/* Entrega */}
      <div style={{
        background:B[50], borderRadius:10, padding:14,
        border:`1px solid ${B[100]}`, marginBottom:4,
      }}>
        <div style={{ fontFamily:fb, fontSize:13, color:B[700], fontWeight:500 }}>
          Entrega toda quinta-feira
        </div>
        <div style={{ fontFamily:fb, fontSize:12, color:B[600], marginTop:4 }}>
          Alterações na cesta até terça, 22h. Cancelamento sem taxa, a qualquer momento.
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════ TELA PÓS-CADASTRO ═══════════════════ */
const WelcomeScreen = ({ data, cesta }) => {
  const selected = CESTAS.find(c => c.id === cesta);
  const nome = data.nome ? data.nome.split(" ")[0] : "você";

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, textAlign:"center", minHeight:500 }}>
      <div style={{
        width:64, height:64, borderRadius:32, background:B[50],
        display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20,
        border:`2px solid ${B[200]}`,
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={B[500]} strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>

      <H size={26}>BEM-VINDA, {nome.toUpperCase()}</H>
      <div style={{ fontFamily:fb, fontSize:15, color:W[600], marginTop:12, lineHeight:1.6, maxWidth:300 }}>
        Sua assinatura está ativa. Sua primeira entrega será na próxima quinta-feira.
      </div>

      {selected && (
        <div style={{
          background:W[100], borderRadius:12, padding:16, marginTop:24, width:"100%",
          border:`1px solid ${W[200]}`,
        }}>
          <div style={{ fontFamily:fb, fontSize:13, color:W[500], marginBottom:4 }}>Você vai receber</div>
          <div style={{ fontFamily:fb, fontSize:16, fontWeight:600, color:W[800] }}>{selected.nome} ({selected.peso})</div>
          <div style={{ fontFamily:fb, fontSize:13, color:W[500], marginTop:2 }}>Toda quinta, na porta do seu apartamento.</div>
        </div>
      )}

      <div style={{
        fontFamily:fb, fontSize:13, color:B[600], marginTop:20, lineHeight:1.5,
        background:B[50], borderRadius:8, padding:12, width:"100%",
      }}>
        Você vai receber uma mensagem no WhatsApp com os detalhes. Qualquer dúvida, é só responder por lá.
      </div>
    </div>
  );
};

/* ═══════════════════ APP PRINCIPAL ═══════════════════ */
export default function CoraOnboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState(false);
  const [termos, setTermos] = useState(false);

  const [data, setData] = useState({
    nome:"", whatsapp:"", email:"",
    endereco:"", complemento:""
  });

  const [cesta, setCesta] = useState(null);
  const [qtd, setQtd] = useState(1);

  const [payment, setPayment] = useState({
    numero:"", validade:"", cvv:"", cpf:""
  });

  const canNext1 = data.nome && data.whatsapp && data.email && data.endereco;
  const canNext2 = cesta && payment.numero && payment.cpf;
  const canConfirm = termos;

  const handleConfirm = () => {
    setCompleted(true);
  };

  const stepLabel = ["Dados", "Cesta e pagamento", "Confirmação"];

  return (
    <div style={{
      display:"flex", justifyContent:"center", padding:"20px 0",
      fontFamily:fb, background:W[200], minHeight:"100vh",
    }}>
      <div style={{
        width:375, minHeight:720, background:W[50], borderRadius:24,
        overflow:"hidden", display:"flex", flexDirection:"column",
        position:"relative", boxShadow:"0 4px 24px rgba(26,24,21,0.12)",
      }}>
        {/* Header */}
        <div style={{
          background:"#FFF", padding:"12px 16px",
          borderBottom:`1px solid ${W[200]}`, flexShrink:0,
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontFamily:fd, fontSize:22, color:B[500], textTransform:"uppercase", letterSpacing:"0.02em" }}>CORA</div>
            {!completed && (
              <div style={{ fontFamily:fb, fontSize:12, color:W[400] }}>
                {step}/3 · {stepLabel[step-1]}
              </div>
            )}
          </div>
          {!completed && <Progress step={step} />}
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", padding:16 }}>
          {completed ? (
            <WelcomeScreen data={data} cesta={cesta} />
          ) : (
            <>
              {step === 1 && <Step1 data={data} setData={setData} />}
              {step === 2 && (
                <>
                  <Step2 cesta={cesta} setCesta={setCesta} qtd={qtd} setQtd={setQtd} />
                  <PaymentFields payment={payment} setPayment={setPayment} />
                </>
              )}
              {step === 3 && (
                <>
                  <Step3 data={data} cesta={cesta} qtd={qtd} payment={payment} />
                  <div
                    onClick={() => setTermos(!termos)}
                    style={{
                      display:"flex", gap:10, alignItems:"flex-start",
                      padding:"14px 0", cursor:"pointer", marginTop:8,
                    }}
                  >
                    <div style={{
                      width:20, height:20, borderRadius:4, flexShrink:0, marginTop:1,
                      border: termos ? `2px solid ${B[500]}` : `2px solid ${W[300]}`,
                      background: termos ? B[500] : "#FFF",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      transition:"all 200ms",
                    }}>
                      {termos && <span style={{ color:"#FFF", fontSize:13, fontWeight:700 }}>✓</span>}
                    </div>
                    <div style={{ fontFamily:fb, fontSize:13, color:W[600], lineHeight:1.5 }}>
                      Ao confirmar, aceito os termos de uso e a política de privacidade da Cora.
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer com botões */}
        {!completed && (
          <div style={{
            padding:"12px 16px", background:"#FFF",
            borderTop:`1px solid ${W[200]}`, flexShrink:0,
            display:"flex", gap:10,
          }}>
            {step > 1 && (
              <Btn onClick={() => setStep(step-1)} style={{ width:"auto", flex:"0 0 auto", padding:"14px 20px" }}>
                Voltar
              </Btn>
            )}
            {step < 3 ? (
              <Btn
                primary
                disabled={step===1 ? !canNext1 : !canNext2}
                onClick={() => setStep(step+1)}
              >
                Continuar
              </Btn>
            ) : (
              <Btn
                primary
                disabled={!canConfirm}
                onClick={handleConfirm}
              >
                Confirmar assinatura
              </Btn>
            )}
          </div>
        )}

        {/* Botão pós-cadastro */}
        {completed && (
          <div style={{ padding:"12px 16px", flexShrink:0 }}>
            <Btn primary onClick={onComplete}>
              Ir para o portal
            </Btn>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=League+Gothic&family=Montagu+Slab:wght@400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; }
        button { font-family:'Montagu Slab',Georgia,Palatino,serif; }
        input { font-family:'Montagu Slab',Georgia,Palatino,serif; }
        ::-webkit-scrollbar { width:0; }
        input::placeholder { font-family:'Montagu Slab',Georgia,Palatino,serif; }
      `}</style>
    </div>
  );
}