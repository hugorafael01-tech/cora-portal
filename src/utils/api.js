/**
 * Stubs de API. Substituidos por fetch real na Fase 7 (Vercel Functions
 * + Supabase). Componentes nao conhecem o stub — interface fica estavel.
 *
 * Hook de teste: payload com email contendo "erro" rejeita. Util pro
 * playground exercitar os fluxos de erro inline.
 */

const SIMULATE_LATENCY_MS = 600;

export async function postWaitlist(payload) {
  await new Promise((r) => setTimeout(r, SIMULATE_LATENCY_MS));
  if (payload?.email?.includes('erro')) {
    throw new Error('Falha simulada — payload com email contendo "erro".');
  }
  console.log('[stub postWaitlist]', payload);
  return { ok: true };
}

// Reservado pra Fase 7 — assinatura aqui pra refletir o contrato esperado.
// Fase 3 nao chama. Adicionado como referencia.
// export async function postSubscription(payload) { ... }
