/**
 * Cron de aviso de carrinho abandonado.
 *
 * Trigger: Vercel Cron a cada 15min (ver `vercel.json`).
 * Auth: header `Authorization: Bearer ${CRON_SECRET}` (Vercel injeta automaticamente).
 *
 * Critério de elegibilidade (pedido em rascunho, com extras, parado há ≥2h,
 * sem aviso enviado, entrega futura, cutoff ainda não passado):
 *   - status = 'rascunho'
 *   - first_extra_added_at IS NOT NULL
 *   - first_extra_added_at < NOW() - INTERVAL '2 hours'
 *   - abandonment_warning_sent_at IS NULL
 *   - delivery_date >= CURRENT_DATE
 *   - jsonb_array_length(extras) > 0
 *
 * Filtro pós-SELECT em JS via `isPastCutoff`. Sucesso → marca
 * `abandonment_warning_sent_at = NOW()` (envio único garantido). Falha de
 * Resend → loga, mantém NULL pra próximo ciclo retentar.
 */
import { supabaseAdmin } from "../../src/lib/supabase-admin.js";
import { resend } from "../../src/lib/resend.js";
import { isPastCutoff } from "../_lib/cutoff.js";

const PORTAL_URL = process.env.PORTAL_URL || "https://app.acora.com.br/";

const buildEmail = ({ primeiroNome }) => ({
  subject: "Sua cesta da Cora tá esperando",
  text: `Oi, ${primeiroNome}.

Você adicionou itens à sua cesta dessa semana mas ainda não confirmou.
Confirme até terça, 12h pra entrar na entrega de quinta.

${PORTAL_URL}

Se não confirmar, a entrega segue a assinatura padrão.

Hugo
`,
});

export default async function handler(req, res) {
  // ─── Auth ─────────────────────────────────────────────────────────────
  // Vercel Cron envia o header automaticamente quando CRON_SECRET está
  // configurada no projeto. Sem header válido, recusa (defesa contra hits
  // diretos no endpoint).
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("[cron abandoned] CRON_SECRET env var missing");
    return res.status(500).json({ error: "cron_secret_not_configured" });
  }
  const authHeader = req.headers.authorization || "";
  if (authHeader !== `Bearer ${expected}`) {
    return res.status(401).json({ error: "unauthorized" });
  }

  // ─── Query: pedidos elegíveis ─────────────────────────────────────────
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString().slice(0, 10);

  const { data: candidates, error: queryErr } = await supabaseAdmin
    .from("weekly_orders")
    .select("id, delivery_date, extras, subscription:subscriptions(nome, email)")
    .eq("status", "rascunho")
    .not("first_extra_added_at", "is", null)
    .lt("first_extra_added_at", twoHoursAgo)
    .is("abandonment_warning_sent_at", null)
    .gte("delivery_date", today);
  if (queryErr) {
    console.error("[cron abandoned] query failed", queryErr);
    return res.status(500).json({ error: "internal_error" });
  }

  let sent = 0;
  let failed = 0;
  const processed = candidates?.length || 0;

  for (const order of candidates || []) {
    // Filtros que não dá pra expressar bem no SELECT: extras vazio e cutoff
    // (cutoff usa lógica BRT-aware em JS). Se cutoff passou, pula — aviso
    // pós-cutoff é Fase 2.
    if (!Array.isArray(order.extras) || order.extras.length === 0) continue;
    if (isPastCutoff(order.delivery_date)) continue;

    const sub = order.subscription;
    if (!sub?.email || !sub?.nome) {
      console.error("[cron abandoned] order missing subscription data", order.id);
      continue;
    }
    const primeiroNome = String(sub.nome).split(" ")[0];
    const { subject, text } = buildEmail({ primeiroNome });

    try {
      const result = await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: sub.email,
        subject,
        text,
      });
      if (result?.error) {
        console.error("[cron abandoned] resend error", order.id, result.error);
        failed += 1;
        continue;
      }
      // Marca envio. Se essa UPDATE falhar, próximo ciclo pode reenviar —
      // aceitável (raro e logado).
      const { error: markErr } = await supabaseAdmin
        .from("weekly_orders")
        .update({ abandonment_warning_sent_at: new Date().toISOString() })
        .eq("id", order.id);
      if (markErr) {
        console.error("[cron abandoned] mark sent failed", order.id, markErr);
        failed += 1;
        continue;
      }
      sent += 1;
    } catch (err) {
      console.error("[cron abandoned] send threw", order.id, err);
      failed += 1;
    }
  }

  return res.status(200).json({ processed, sent, failed });
}
