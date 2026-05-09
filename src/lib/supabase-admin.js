/**
 * Supabase admin client (service_role).
 *
 * NUNCA importar de codigo que termina no bundle do front. So pode ser
 * importado por endpoints em api/. A SUPABASE_SERVICE_ROLE_KEY bypassa RLS
 * e nao pode vazar pro browser.
 *
 * Vercel Functions executam node-side; este modulo nao eh bundled pro client
 * desde que nao seja importado por nada em src/ que entra no Vite build.
 */
import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
}

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
