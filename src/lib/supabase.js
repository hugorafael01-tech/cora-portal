/**
 * Supabase browser client (anon key).
 *
 * Usado no bundle do front. A VITE_SUPABASE_ANON_KEY eh publica por design:
 * a RLS protege os dados linha-por-dono no banco. NUNCA importar a
 * service_role aqui (use src/lib/supabase-admin.js, restrito a api/).
 *
 * Helpers de auth (signInWithMagicLink, signOut, etc.) ficam em
 * src/auth/useAuth.js - este arquivo so expoe o client cru.
 *
 * ─── Por que o client eh preguicoso ───
 * A validacao de verdade mora no vite.config.js e derruba `dev` e `build` com
 * mensagem propria. O guard daqui eh a segunda linha de defesa, e ele NAO pode
 * voltar pro escopo do modulo.
 *
 * Ate 29/08/2026 este arquivo fazia `if (!url || !key) throw` no topo. Depois
 * que o Vite substitui `import.meta.env.VITE_*` por `undefined`, esse throw
 * vira incondicional; o Rollup entao prova que o corpo do main.jsx nunca roda
 * e faz tree-shaking do App.jsx INTEIRO -- `vite build` saindo 0 e emitindo um
 * chunk de ~340KB, sem uma linha do app. O .env.local desatualizado ficou meses
 * assim sem ninguem ver.
 *
 * O que muda com o client preguicoso eh o ARTEFATO, nao o sintoma: sem env a
 * pagina segue em branco com erro no console (era assim antes tambem). Mas o
 * modulo nao lanca mais na avaliacao, entao o Rollup perde a licenca pra apagar
 * codigo nao relacionado e o bundle passa a conter o app. Foi essa mutilacao
 * silenciosa -- e nao o erro em si -- que fez o diagnostico custar caro.
 */
import { createClient } from "@supabase/supabase-js";

let client = null;

function getClient() {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). " +
        "Copie as VITE_* do .env.local.example pro .env.local."
    );
  }
  client = createClient(url, anonKey);
  return client;
}

// Proxy pra preservar a API de valor (`supabase.auth.getSession()`) em todos os
// call sites. Trocar por `getSupabase()` obrigaria a mexer em auth/, utils/ e
// App.jsx sem ganho nenhum -- o objetivo aqui eh so tirar o throw do topo.
export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const value = getClient()[prop];
      return typeof value === "function" ? value.bind(client) : value;
    },
  }
);
