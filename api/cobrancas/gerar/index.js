/**
 * POST /api/cobrancas/gerar  (Fase 3, bloco B — geracao de cobrancas)
 *
 * Cria UMA cobranca por PAGADOR no Asaas e materializa N linhas em `faturas`,
 * uma por assinatura do grupo, todas com o mesmo `asaas_payment_id`.
 *
 * Este arquivo e so a porta: metodo, autenticacao, autorizacao e traducao do
 * desfecho pra HTTP. A sequencia da geracao mora em `_lib/geracao-runner.js`,
 * porque ela tem dois chamadores — este endpoint e o `scripts/gera-sandbox.mjs`
 * — e nao pode existir em duas versoes.
 *
 * Autorizacao no molde do /api/asaas/vincular: service_role BYPASSA RLS, entao
 * o is_admin() das policies nao se aplica e a checagem e query explicita contra
 * `admin_users` pelo email do JWT (a PK de admin_users e o email; nao ha
 * coluna user_id).
 *
 * Body: { periodo_referencia: "AAAA-MM" }. NENHUM valor vem do browser — o
 * servidor recalcula a previa do zero. E a razao de a fase existir.
 */
import { supabaseAdmin } from "../../../src/lib/supabase-admin.js";
import { withCors } from "../../_lib/cors.js";
import { executaGeracao } from "../../_lib/geracao-runner.js";

const PERIODO_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  // ─── 1. Autenticacao ───
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) return res.status(401).json({ error: "missing_token" });

  const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !authData?.user) return res.status(401).json({ error: "invalid_token" });

  const email = authData.user.email;
  // Usuario autenticado sem email no JWT nao tem como ser admin (a PK e email).
  if (!email) return res.status(403).json({ error: "forbidden" });

  // ─── 2. Autorizacao: admin via query explicita ───
  const { data: adminRow, error: adminErr } = await supabaseAdmin
    .from("admin_users")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (adminErr) {
    console.error("[cobrancas/gerar] admin check error", adminErr);
    return res.status(500).json({ error: "internal_error" });
  }
  if (!adminRow) return res.status(403).json({ error: "forbidden" });

  // ─── 3. Periodo ───
  const periodoReferencia = (req.body || {}).periodo_referencia;
  if (typeof periodoReferencia !== "string" || !PERIODO_RE.test(periodoReferencia)) {
    return res.status(400).json({ error: "periodo_invalido" });
  }

  // ─── 4. Roda o ciclo ───
  try {
    const { previa, grupos, resultados, resumo } = await executaGeracao(periodoReferencia);
    return res.status(200).json({
      periodo_referencia: periodoReferencia,
      total_previa: previa.totalGeral,
      grupos_considerados: grupos.length,
      resumo,
      resultados,
    });
  } catch (err) {
    // Previa com alerta que bloqueia nao e erro do servidor: e a tela tendo que
    // ser resolvida antes. 409 pra que o front distinga de uma falha de fato.
    if (err.bloqueios) {
      return res.status(409).json({ error: "previa_bloqueada", alertas: err.bloqueios });
    }
    console.error("[cobrancas/gerar] falhou", err);
    return res.status(500).json({ error: "internal_error", detalhe: err.message });
  }
}

export default withCors(handler);
