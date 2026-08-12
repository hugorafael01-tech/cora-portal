/**
 * Cron do e-mail de domingo com o especial da semana.
 *
 * ESQUELETO: só a autenticação e a rota, pra testar se o plano Hobby aceita
 * dois crons agendados em horários diferentes (ver `vercel.json`). A lógica de
 * destinatários e o envio entram depois da decisão sobre onde mora o catálogo
 * de produtos.
 */
export default async function handler(req, res) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("[cron weekly-special] CRON_SECRET env var missing");
    return res.status(500).json({ error: "cron_secret_not_configured" });
  }
  if ((req.headers.authorization || "") !== `Bearer ${expected}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  return res.status(200).json({ status: "not_implemented", sent: 0 });
}
