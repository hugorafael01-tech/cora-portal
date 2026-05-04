import { useState } from "react";
import CEPField from "../components/CEPField";
import CoverageBlocker from "../components/CoverageBlocker";
import { B, W, fb, fd, radii } from "../tokens";
import { COVERED_AREAS } from "../config/coverage";
import { equalsLoose } from "../utils/normalize";
import { postWaitlist } from "../utils/api";
import { formatWhatsApp } from "../utils/validators";

/*
  T1Playground — testa CEPField + CoverageBlocker em isolamento.

  Acessivel via /?dev=t1playground
  Esta pasta inteira (src/dev/) eh removida na Fase 4.

  Cenarios cobertos:
   - CEP coberto (ex: 24220-001 — Icarai/Niteroi)
   - CEP fora de cobertura (ex: 01310-100 — Bela Vista/SP)
   - CEP inexistente (ex: 00000-000)
   - Fallback ViaCEP: simula offline desligando rede no devtools
   - Waitlist sucesso: qualquer email valido ou em branco
   - Waitlist erro: email contendo "erro" (ex: erro@test.com)
*/

const dummyEstaCoberto = (bairro, cidade) => {
  const lista = COVERED_AREAS[Object.keys(COVERED_AREAS).find((k) => equalsLoose(k, cidade)) || ""] || [];
  return lista.some((b) => equalsLoose(b, bairro));
};

const buildWhatsLink = (bairro) => {
  const msg = `Oi, vi que vocês ainda não entregam no ${bairro || "meu bairro"} mas queria falar sobre uma situação especial.`;
  return `https://wa.me/5521999429843?text=${encodeURIComponent(msg)}`;
};

export default function T1Playground() {
  const [cep, setCep] = useState("");
  const [whatsappForm, setWhatsappForm] = useState("");
  const [resolved, setResolved] = useState(null);
  const [coverageBlocked, setCoverageBlocked] = useState(false);
  const [coverageUnconfirmed, setCoverageUnconfirmed] = useState(false);
  const [emailForWaitlist, setEmailForWaitlist] = useState("");
  const [log, setLog] = useState([]);

  const pushLog = (msg) => setLog((prev) => [`${new Date().toLocaleTimeString()} · ${msg}`, ...prev].slice(0, 8));

  const handleResolve = (r) => {
    setResolved(r);
    pushLog(`onResolve: success=${r.success} fallback=${r.fallback}${r.bairro ? ` ${r.bairro}/${r.cidade}` : ""}`);
    if (r.success) {
      // ViaCEP confirmou — valida cobertura
      const coberto = dummyEstaCoberto(r.bairro, r.cidade);
      setCoverageBlocked(!coberto);
      setCoverageUnconfirmed(false);
    } else if (r.fallback) {
      // ViaCEP caiu — Opcao A: nao bloqueia, marca pra confirmacao manual
      setCoverageBlocked(false);
      setCoverageUnconfirmed(true);
    } else {
      // CEP inexistente — limpa estados
      setCoverageBlocked(false);
      setCoverageUnconfirmed(false);
    }
  };

  const handleSubmitWaitlist = async (payload) => {
    pushLog(`postWaitlist tentando — email=${emailForWaitlist || "(vazio)"}`);
    await postWaitlist({ ...payload, email: emailForWaitlist });
    pushLog(`postWaitlist OK`);
  };

  const handleTryOtherCEP = () => {
    setCep("");
    setResolved(null);
    setCoverageBlocked(false);
    setCoverageUnconfirmed(false);
    pushLog("Reset CEP via 'Tentar outro CEP'");
  };

  const labelStyle = { fontFamily: fb, fontSize: 13, color: W[600], marginBottom: 4, display: "block" };
  const fieldWrap = { marginBottom: 14 };
  const sectionTitle = { fontFamily: fd, fontSize: 14, textTransform: "uppercase", color: B[500], letterSpacing: "0.04em", marginTop: 20, marginBottom: 10 };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 20, fontFamily: fb, background: W[50], minHeight: "100vh" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: fd, fontSize: 24, textTransform: "uppercase", color: B[500] }}>T1 Playground</div>
        <div style={{ fontFamily: fb, fontSize: 12, color: W[500], marginTop: 4 }}>
          Teste isolado de CEPField + CoverageBlocker. Removido na Fase 4.
        </div>
      </div>

      <div style={sectionTitle}>Inputs auxiliares</div>
      <div style={fieldWrap}>
        <label style={labelStyle}>WhatsApp do form (pra pre-popular o CoverageBlocker)</label>
        <input
          value={whatsappForm}
          onChange={(e) => setWhatsappForm(formatWhatsApp(e.target.value))}
          placeholder="(21) 99999-0000"
          style={{ width: "100%", padding: "10px 12px", fontSize: 14, fontFamily: fb, border: `1.5px solid ${W[200]}`, borderRadius: radii.md, background: "#FFF", outline: "none" }}
        />
      </div>
      <div style={fieldWrap}>
        <label style={labelStyle}>Email pra simular erro do waitlist (use "erro@test.com")</label>
        <input
          value={emailForWaitlist}
          onChange={(e) => setEmailForWaitlist(e.target.value)}
          placeholder="erro@test.com pra forçar falha"
          style={{ width: "100%", padding: "10px 12px", fontSize: 14, fontFamily: fb, border: `1.5px solid ${W[200]}`, borderRadius: radii.md, background: "#FFF", outline: "none" }}
        />
      </div>

      <div style={sectionTitle}>CEPField</div>
      <CEPField value={cep} onChange={setCep} onResolve={handleResolve} />

      {resolved?.success && (
        <div style={{ marginTop: 12, padding: 12, background: "#FFF", border: `1px solid ${W[200]}`, borderRadius: radii.lg, fontSize: 13 }}>
          <div><strong>Rua:</strong> {resolved.rua || "(vazio)"}</div>
          <div><strong>Bairro:</strong> {resolved.bairro || "(vazio)"}</div>
          <div><strong>Cidade/UF:</strong> {resolved.cidade}/{resolved.estado}</div>
        </div>
      )}

      {resolved?.fallback && (
        <div style={{ marginTop: 12, padding: 12, background: B[50], border: `1px solid ${B[100]}`, borderRadius: radii.lg, fontSize: 13, color: B[700] }}>
          Fallback ativo. Pai libera rua/bairro como editáveis. Cobertura marcada como "não confirmada" (Opção A).
        </div>
      )}

      {coverageBlocked && (
        <>
          <div style={sectionTitle}>CoverageBlocker</div>
          <CoverageBlocker
            whatsappFromForm={whatsappForm}
            cep={resolved?.cep || ""}
            bairro={resolved?.bairro || ""}
            cidade={resolved?.cidade || ""}
            estado={resolved?.estado || ""}
            onSubmitWaitlist={handleSubmitWaitlist}
            onTryOtherCEP={handleTryOtherCEP}
            whatsappLink={buildWhatsLink(resolved?.bairro)}
          />
        </>
      )}

      {coverageUnconfirmed && (
        <div style={{ marginTop: 12, padding: 12, background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: radii.lg, fontSize: 13, color: "#92400E", lineHeight: 1.5 }}>
          ⚠ Cobertura não confirmada (ViaCEP indisponível). No fluxo real, isso vira flag <code>coverage_unconfirmed=true</code> no payload e Hugo confirma manualmente via WhatsApp.
        </div>
      )}

      <div style={sectionTitle}>Log de eventos</div>
      <div style={{ background: "#FFF", border: `1px solid ${W[200]}`, borderRadius: radii.lg, padding: 12, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, color: W[700], minHeight: 80 }}>
        {log.length === 0 ? <em style={{ color: W[400] }}>Nenhum evento ainda.</em> : log.map((l, i) => <div key={i}>{l}</div>)}
      </div>

      <div style={{ marginTop: 24, padding: 12, background: W[100], borderRadius: radii.md, fontSize: 11, color: W[600], lineHeight: 1.5 }}>
        <strong>CEPs sugeridos:</strong><br />
        24220-001 — Icaraí/Niterói (cobertura)<br />
        22271-070 — Botafogo/RJ (cobertura)<br />
        20021-130 — Centro/RJ (fora de cobertura)<br />
        01310-100 — Bela Vista/SP (fora de cobertura)<br />
        00000-000 — CEP inexistente<br />
        <br />
        <strong>Pra testar fallback:</strong> abra DevTools &gt; Network &gt; Offline e digite um CEP novo.
      </div>
    </div>
  );
}
