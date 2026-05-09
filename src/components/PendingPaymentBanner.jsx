import { B, fb } from "../tokens";

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
      Recebemos sua assinatura. Em breve enviamos o link de pagamento pelo WhatsApp.
    </div>
  );
}
