/**
 * Supabase browser client (anon key).
 *
 * Usado no bundle do front. A VITE_SUPABASE_ANON_KEY eh publica por design:
 * a RLS protege os dados linha-por-dono no banco. NUNCA importar a
 * service_role aqui (use src/lib/supabase-admin.js, restrito a api/).
 *
 * Helpers de auth (signInWithMagicLink, signOut, etc.) ficam em
 * src/auth/useAuth.js - este arquivo so expoe o client cru.
 */
import { createClient } from "@supabase/supabase-js";

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)");
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
