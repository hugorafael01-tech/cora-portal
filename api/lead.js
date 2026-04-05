/*  Vercel Serverless Function — POST /api/lead
    Proxy seguro para o webhook Make.com.
    A URL real fica na env var WEBHOOK_URL (configurada no painel da Vercel).
    O frontend nunca vê essa URL. */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(500).json({ error: "Webhook não configurado" });
  }

  const { nome, whatsapp, bairro, cidade } = req.body || {};

  // Validação mínima — impede payloads vazios ou automatizados triviais
  if (!nome || !whatsapp || !bairro || !cidade) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes" });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Falha ao encaminhar dados" });
    }

    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ error: "Falha ao encaminhar dados" });
  }
}
