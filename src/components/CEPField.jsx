import { useEffect, useRef, useState } from "react";
import { B, W, fb, radii } from "../tokens";
import { formatCEP, isValidCEP } from "../utils/validators";

const VIACEP_TIMEOUT_MS = 5000;

/**
 * Input controlado de CEP com integracao ViaCEP.
 *
 * Props:
 *  - value, onChange (controlled, valor mascarado vai pra onChange)
 *  - onResolve(result): chamado quando ViaCEP resolve (sucesso, erro
 *    de CEP inexistente, ou fallback por timeout/rede). Pai decide
 *    o que fazer com bairro/cidade/cobertura.
 *      result = { cep, rua, bairro, cidade, estado, success, fallback }
 *  - disabled? (opcional)
 *  - placeholder? (default "00000-000")
 *
 * Nao faz validacao de cobertura. Quem decide eh o pai.
 */
export default function CEPField({ value, onChange, onResolve, disabled = false, placeholder = "00000-000" }) {
  const [status, setStatus] = useState("idle"); // idle | loading | success | error | fallback
  const [errorMsg, setErrorMsg] = useState(null);
  const lastFetchedRef = useRef(null);
  const abortRef = useRef(null);
  const onResolveRef = useRef(onResolve);
  // Mantem ref atualizada sem re-disparar effect.
  useEffect(() => { onResolveRef.current = onResolve; }, [onResolve]);

  useEffect(() => {
    const cepDigits = (value || "").replace(/\D/g, "");
    // Reseta UI se valor mudou em estado de sucesso/erro
    if (cepDigits !== lastFetchedRef.current && (status === "success" || status === "error" || status === "fallback")) {
      setStatus("idle");
      setErrorMsg(null);
      lastFetchedRef.current = null;
    }
    if (!isValidCEP(value)) return;
    if (cepDigits === lastFetchedRef.current) return;

    // Debounce curto pra evitar flicker enquanto o auto-format completa
    const debounce = setTimeout(() => {
      lastFetchedRef.current = cepDigits;
      // Cancela request anterior, se houver
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const timeoutId = setTimeout(() => ctrl.abort(), VIACEP_TIMEOUT_MS);

      setStatus("loading");
      setErrorMsg(null);

      fetch(`https://viacep.com.br/ws/${cepDigits}/json/`, { signal: ctrl.signal })
        .then((res) => res.json())
        .then((data) => {
          clearTimeout(timeoutId);
          if (data?.erro) {
            setStatus("error");
            setErrorMsg("Não encontramos esse CEP. Confere os números?");
            onResolveRef.current?.({ cep: cepDigits, success: false, fallback: false });
            return;
          }
          setStatus("success");
          onResolveRef.current?.({
            cep: cepDigits,
            rua: data.logradouro || "",
            bairro: data.bairro || "",
            cidade: data.localidade || "",
            estado: data.uf || "",
            success: true,
            fallback: false,
          });
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          if (err?.name === "AbortError" || err?.message?.includes("Failed to fetch") || err?.message?.includes("NetworkError")) {
            setStatus("fallback");
            setErrorMsg("ViaCEP indisponível, preenche manualmente.");
            onResolveRef.current?.({ cep: cepDigits, success: false, fallback: true });
            return;
          }
          // Outros erros de parse: trata como fallback tambem (defensivo)
          setStatus("fallback");
          setErrorMsg("ViaCEP indisponível, preenche manualmente.");
          onResolveRef.current?.({ cep: cepDigits, success: false, fallback: true });
        });
    }, 100);

    return () => clearTimeout(debounce);
  }, [value, status]);

  // Cleanup no unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  const borderColor = status === "error" ? "#EF4444" : status === "success" ? "#10B981" : W[200];

  return (
    <div>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(formatCEP(e.target.value))}
          style={{
            width: "100%",
            padding: "12px 40px 12px 14px",
            fontSize: 15,
            fontFamily: fb,
            border: `1.5px solid ${borderColor}`,
            borderRadius: radii.md,
            background: "#FFF",
            color: W[800],
            outline: "none",
            transition: "border-color 200ms",
          }}
          onFocus={(e) => { if (status !== "error") e.target.style.borderColor = B[400]; }}
          onBlur={(e) => { e.target.style.borderColor = borderColor; }}
        />
        {/* Indicador a direita: spinner | check | nada */}
        <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, pointerEvents: "none" }}>
          {status === "loading" && (
            <span aria-label="Buscando CEP" style={{
              width: 14, height: 14, borderRadius: radii.full,
              border: `2px solid ${W[200]}`, borderTopColor: B[500],
              animation: "cep-spin 700ms linear infinite",
            }} />
          )}
          {status === "success" && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </div>
      {(status === "error" || status === "fallback") && errorMsg && (
        <div role="status" style={{ fontFamily: fb, fontSize: 12, color: status === "error" ? "#DC2626" : W[600], marginTop: 4, lineHeight: 1.4 }}>{errorMsg}</div>
      )}
      <style>{`@keyframes cep-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
