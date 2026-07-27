import { B, fb } from "../tokens";
import { buildCoraContactLink } from "../config/contact";

/**
 * Banner persistente exibido quando subscription.status === 'pending_payment'.
 * Mounted no shell do portal, abaixo do header sticky e acima do <main>.
 * Aparece em todas as telas (Home/Assinatura/Cardapio/Perfil).
 *
 * Recebe pendingPayment via props pra ficar em sync com o state do App
 * (evita state isolado lendo localStorage — `storage` event nao dispara
 * na mesma aba, entao reconcile/save de outra logica nao chega aqui).
 *
 * Outros status (active, paused, cancelled) nao mostram banner no MVP.
 */
export default function PendingPaymentBanner({ pendingPayment }) {
  if (!pendingPayment) return null;

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
      Recebemos sua assinatura. A cobrança chega no seu e-mail em até 24 horas. Se não chegar,{" "}
      <a
        href={buildCoraContactLink("Oi, assinei a Cora mas ainda não recebi a cobrança por e-mail.")}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: B[500], fontWeight: 600, textDecoration: "none" }}
      >
        me chama
      </a>.
    </div>
  );
}
