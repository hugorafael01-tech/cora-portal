import { useEffect, useState } from "react";
import { loadSubscription } from "../utils/subscription";
import { B, fb } from "../tokens";

/**
 * Banner persistente exibido quando subscription.status === 'pending_payment'.
 * Mounted no shell do portal, abaixo do header sticky e acima do <main>.
 * Aparece em todas as telas (Home/Assinatura/Cardapio/Perfil).
 *
 * Le subscription do localStorage no mount + escuta `storage` event
 * (atualiza quando outra aba edita localStorage). Edicao no DevTools
 * da mesma aba precisa de F5.
 *
 * Outros status (active, paused, cancelled) nao mostram banner no MVP.
 */
export default function PendingPaymentBanner() {
  const [status, setStatus] = useState(() => loadSubscription()?.status);

  useEffect(() => {
    const onStorage = () => setStatus(loadSubscription()?.status);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (status !== "pending_payment") return null;

  return (
    <div
      role="status"
      style={{
        background: B[50],
        borderBottom: `1px solid ${B[100]}`,
        padding: "10px 16px",
        fontFamily: fb,
        fontSize: 13,
        color: B[700],
        lineHeight: 1.5,
        textAlign: "center",
      }}
    >
      Recebemos sua assinatura. Em breve enviamos o link de pagamento pelo WhatsApp.
    </div>
  );
}
