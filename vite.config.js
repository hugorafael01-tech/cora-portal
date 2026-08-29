import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vars que o front nao consegue funcionar sem.
 *
 * Faltando qualquer uma, o Vite troca `import.meta.env.VITE_*` por `undefined`
 * e o app sobe em branco. Ate 29/08/2026 o BUILD nao dava sinal nenhum disso:
 * o throw no topo do src/lib/supabase.js virava incondicional, o Rollup provava
 * que o corpo do main.jsx nunca roda e fazia tree-shaking do App.jsx inteiro.
 * `vite build` saia 0, sem warning, emitindo um chunk de ~340KB em vez de
 * ~540KB. So dava pra perceber abrindo a pagina. O .env.local ficou meses
 * desatualizado assim, e o Preview (que tem as vars) escondia o problema.
 *
 * Derrubar aqui, alto e cedo, e melhor do que entregar um bundle mudo.
 *
 * So as duas do Supabase entram: VITE_AUTH_METHODS e VITE_ENABLE_DEV_TOOLS sao
 * feature flags com comportamento definido quando ausentes, e exigi-las
 * quebraria o dev de quem nao precisa delas.
 */
const REQUIRED_ENV = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  // Roda em `dev`, `build` e `preview` -- a config e resolvida nos tres, entao
  // o erro aparece tambem em quem so levanta o servidor local.
  //
  // loadEnv le os arquivos .env* E as vars de processo com o prefixo, que e
  // como a Vercel entrega as dela. Nao usa `import.meta.env` porque isso aqui
  // roda em Node, antes do bundle existir.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const missing = REQUIRED_ENV.filter((key) => !env[key])

  if (missing.length) {
    throw new Error(
      `\n\n  Faltam variaveis de ambiente obrigatorias (${command}, mode=${mode}):\n` +
        missing.map((key) => `    - ${key}`).join('\n') +
        `\n\n  Local: copie as VITE_* do .env.local.example pro .env.local.\n` +
        `  Deploy: confira as Environment Variables do projeto na Vercel.\n\n` +
        `  Sem elas o app abre em branco e o build sai 0 sem reclamar.\n`
    )
  }

  return {
    plugins: [react()],
  }
})
