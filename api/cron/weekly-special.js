/**
 * Cron do e-mail de domingo com o especial da semana.
 *
 * Trigger: Vercel Cron aos domingos às 21h UTC (18h em Brasília), ver
 * `vercel.json`. O plano Hobby permite dois cron jobs e limita a frequência a
 * uma execução por dia, e semanal cabe nesse teto.
 * Auth: header `Authorization: Bearer ${CRON_SECRET}` (Vercel injeta).
 *
 * Objetivo: hoje a compra de extras depende da pessoa lembrar de entrar no
 * portal sozinha. Este e-mail conta o que sai do forno na quinta, com link.
 *
 * Semana de entrega: `nextEditableThursdayISO`, a MESMA função que o portal usa
 * pra resolver a cesta corrente. Rodando no domingo o cutoff de terça ainda não
 * passou, então cai na quinta daquela mesma semana (+4 dias).
 *
 * Quem recebe: assinatura `active` que ainda NÃO tem `weekly_orders` com status
 * `confirmado` pra essa `delivery_date`. Quem já comprou extra não precisa do
 * aviso, e receber viraria ruído.
 *
 * Envio único sem coluna nova: o Resend aceita `idempotencyKey`, então uma
 * reexecução do cron no mesmo domingo é descartada do lado dele. A chave leva a
 * `delivery_date`, então o domingo seguinte envia normalmente. A alternativa
 * seria uma coluna tipo `abandonment_warning_sent_at` (ver check-abandoned-carts),
 * mas o schema mora no cora-backoffice e exigiria migration em outro repo.
 *
 * Envio em lote (`resend.batch.send`) e não um POST por assinante: a função tem
 * teto de duração no Hobby e 29 chamadas sequenciais ao Resend chegariam perto
 * dele. Uma chamada por lote de 100 resolve, e `batchValidation: 'permissive'`
 * faz um endereço inválido falhar sozinho, sem derrubar o lote inteiro.
 */
import { supabaseAdmin } from "../../src/lib/supabase-admin.js";
import { resend } from "../../src/lib/resend.js";
import { nextEditableThursdayISO } from "../_lib/cutoff.js";
import { menuDaSemana } from "../../src/config/menu.js";
import { ROTATIVOS } from "../../src/config/produtos.js";

const PORTAL_URL = process.env.PORTAL_URL || "https://app.acora.com.br/";

// Teto do batch do Resend. 29 assinantes hoje, mas o lote existe pro dia em que
// não forem mais 29.
const BATCH_MAX = 100;

const buildEmail = ({ primeiroNome, especial }) => {
  if (!especial) {
    return {
      subject: "Essa semana sem especial",
      text: `Oi, ${primeiroNome}.

Todo domingo eu passo aqui pra contar o que sai do forno na quinta.
Essa semana eu preciso organizar a padaria, então não tem especial.

Mas se quiser mais pão, dá pra adicionar Original ou Integral na cesta
até terça ao meio-dia.

${PORTAL_URL}

Hugo, padeiro apaixonado
`,
      html: `<!doctype html>
<html lang="pt-BR">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; line-height: 1.6; max-width: 520px; margin: 0 auto; padding: 24px;">
  <p>Oi, ${primeiroNome}.</p>
  <p>Todo domingo eu passo aqui pra contar o que sai do forno na quinta.<br>Essa semana eu preciso organizar a padaria, então não tem especial.</p>
  <p>Mas se quiser mais pão, dá pra adicionar Original ou Integral na cesta até terça ao meio-dia.</p>
  <p><a href="${PORTAL_URL}" style="color: #1a1a1a;">${PORTAL_URL}</a></p>
  <p style="margin-top: 32px;">Hugo, padeiro apaixonado</p>
</body>
</html>`,
    };
  }

  return {
    subject: `${especial.nome} essa semana`,
    text: `Oi, ${primeiroNome}.

Todo domingo eu passo aqui pra contar o que sai do forno na quinta.
Além do Original e do Integral, essa semana tem:

${especial.nome} · ${especial.preco}
${especial.subCopy}

Você não paga agora, entra junto na cobrança do mês que vem.

Pra pedir, é só adicionar na cesta e confirmar até terça ao meio-dia.
Depois disso a fornada já está fechada.

${PORTAL_URL}

Hugo, padeiro apaixonado
`,
    html: `<!doctype html>
<html lang="pt-BR">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; line-height: 1.6; max-width: 520px; margin: 0 auto; padding: 24px;">
  <p>Oi, ${primeiroNome}.</p>
  <p>Todo domingo eu passo aqui pra contar o que sai do forno na quinta.<br>Além do Original e do Integral, essa semana tem:</p>
  <p><strong>${especial.nome} · ${especial.preco}</strong><br>${especial.subCopy}</p>
  <p>Você não paga agora, entra junto na cobrança do mês que vem.</p>
  <p>Pra pedir, é só adicionar na cesta e confirmar até terça ao meio-dia.<br>Depois disso a fornada já está fechada.</p>
  <p><a href="${PORTAL_URL}" style="color: #1a1a1a;">${PORTAL_URL}</a></p>
  <p style="margin-top: 32px;">Hugo, padeiro apaixonado</p>
</body>
</html>`,
  };
};

export default async function handler(req, res) {
  // ─── Auth ─────────────────────────────────────────────────────────────
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("[cron weekly-special] CRON_SECRET env var missing");
    return res.status(500).json({ error: "cron_secret_not_configured" });
  }
  if ((req.headers.authorization || "") !== `Bearer ${expected}`) {
    return res.status(401).json({ error: "unauthorized" });
  }

  // ─── Especial da semana ───────────────────────────────────────────────
  const deliveryDate = nextEditableThursdayISO();
  const menu = menuDaSemana(deliveryDate);
  let especial = null;
  if (menu.especial) {
    especial = ROTATIVOS.find((p) => p.id === menu.especial) || null;
    if (!especial) {
      // Id no mapa sem produto no catálogo. Manda a versão sem especial em vez
      // de anunciar pão que ninguém sabe descrever, mesma escolha do fallback
      // de menu.js: errar pra menos é o único erro aceitável aqui.
      console.error("[cron weekly-special] especial sem produto no catalogo", menu.especial);
    }
  }

  // ─── Destinatários ────────────────────────────────────────────────────
  const { data: ativos, error: subsErr } = await supabaseAdmin
    .from("subscriptions")
    .select("id, nome, email")
    .eq("status", "active");
  if (subsErr) {
    console.error("[cron weekly-special] query subscriptions failed", subsErr);
    return res.status(500).json({ error: "internal_error" });
  }

  // Quem já confirmou extra pra essa entrega sai da lista.
  const { data: confirmados, error: ordersErr } = await supabaseAdmin
    .from("weekly_orders")
    .select("subscription_id")
    .eq("delivery_date", deliveryDate)
    .eq("status", "confirmado");
  if (ordersErr) {
    console.error("[cron weekly-special] query weekly_orders failed", ordersErr);
    return res.status(500).json({ error: "internal_error" });
  }

  const jaConfirmou = new Set((confirmados || []).map((o) => o.subscription_id));
  const destinatarios = (ativos || []).filter((s) => {
    if (jaConfirmou.has(s.id)) return false;
    if (!s.email || !s.nome) {
      console.error("[cron weekly-special] assinatura sem nome/email", s.id);
      return false;
    }
    return true;
  });

  if (destinatarios.length === 0) {
    return res.status(200).json({
      delivery_date: deliveryDate,
      especial: especial?.id || null,
      processed: 0,
      sent: 0,
      failed: 0,
    });
  }

  // ─── Envio em lote ────────────────────────────────────────────────────
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < destinatarios.length; i += BATCH_MAX) {
    const fatia = destinatarios.slice(i, i + BATCH_MAX);
    const payload = fatia.map((s) => {
      const { subject, text, html } = buildEmail({
        primeiroNome: String(s.nome).split(" ")[0],
        especial,
      });
      return { from: process.env.EMAIL_FROM, to: s.email, subject, text, html };
    });

    try {
      const result = await resend.batch.send(payload, {
        // Reexecução no mesmo domingo cai aqui e não reenvia. O índice do lote
        // entra na chave porque cada lote é uma requisição própria.
        idempotencyKey: `weekly-special:${deliveryDate}:${i / BATCH_MAX}`,
        batchValidation: "permissive",
      });
      if (result?.error) {
        console.error("[cron weekly-special] batch error", result.error);
        failed += fatia.length;
        continue;
      }
      const erros = result?.data?.errors || [];
      erros.forEach((e) => {
        console.error("[cron weekly-special] email recusado no lote", fatia[e.index]?.id, e.message);
      });
      failed += erros.length;
      sent += fatia.length - erros.length;
    } catch (err) {
      console.error("[cron weekly-special] batch throw", err);
      failed += fatia.length;
    }
  }

  console.log("[cron weekly-special] fim", { deliveryDate, especial: especial?.id || null, sent, failed });
  return res.status(200).json({
    delivery_date: deliveryDate,
    especial: especial?.id || null,
    processed: destinatarios.length,
    sent,
    failed,
  });
}
