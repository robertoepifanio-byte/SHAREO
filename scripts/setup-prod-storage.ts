/**
 * setup-prod-storage.ts — cria os 3 buckets de Storage no projeto shareo-prd
 * (produção, uso interno enquanto D4 não fecha).
 *
 * Lê NEXT_PUBLIC_SUPABASE_URL_PROD + SUPABASE_SERVICE_ROLE_KEY_PROD do ambiente
 * (não do .env — produção nunca fica em arquivo local, só env vars de sessão).
 * Idempotente (ignora buckets que já existem).
 *
 * Uso (PowerShell):
 *   $env:NEXT_PUBLIC_SUPABASE_URL_PROD = 'https://jdxdndrhjxtkaifbpagr.supabase.co'
 *   $env:SUPABASE_SERVICE_ROLE_KEY_PROD = 'sb_secret_...'
 *   npx tsx scripts/setup-prod-storage.ts
 */
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL_PROD
const key = process.env.SUPABASE_SERVICE_ROLE_KEY_PROD
if (!url || !key) {
  console.error("✗ Faltam NEXT_PUBLIC_SUPABASE_URL_PROD e/ou SUPABASE_SERVICE_ROLE_KEY_PROD no ambiente.")
  process.exit(1)
}
if (!url.includes("jdxdndrhjxtkaifbpagr")) {
  console.error(`✗ Segurança: a URL não é a do shareo-prd (${url}). Abortando para não tocar em dev/staging.`)
  process.exit(1)
}

const BUCKETS: { name: string; public: boolean }[] = [
  { name: "item-images",    public: true  },
  { name: "booking-photos", public: true  },
  { name: "id-docs",        public: false },
]

async function main() {
  const supabase = createClient(url!, key!)
  for (const b of BUCKETS) {
    const { error } = await supabase.storage.createBucket(b.name, { public: b.public })
    if (error) {
      if (/already exists/i.test(error.message)) console.log(`= ${b.name} (já existia)`)
      else console.error(`✗ ${b.name}: ${error.message}`)
    } else {
      console.log(`✅ ${b.name} criado (public=${b.public})`)
    }
  }
  const { data } = await supabase.storage.listBuckets()
  console.log("\nBuckets no shareo-prd:", (data ?? []).map((x) => x.name).join(", ") || "(nenhum)")
}

main().catch((e) => { console.error("✗ erro:", e instanceof Error ? e.message : e); process.exit(1) })
