/**
 * setup-dev-storage.ts — cria os 3 buckets de Storage no projeto apontado pelo
 * `.env` (shareo-dev), para isolar o ambiente LOCAL do staging.
 *
 * Lê NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY do `.env`.
 * Idempotente (ignora buckets que já existem).
 *
 * Uso: pnpm tsx scripts/setup-dev-storage.ts
 */
import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

function loadEnv(file: string) {
  const p = path.resolve(process.cwd(), file)
  if (!fs.existsSync(p)) return
  for (const raw of fs.readFileSync(p, "utf8").split("\n")) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/i)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (process.env[m[1]] === undefined) process.env[m[1]] = v
  }
}

// Carrega só o `.env` (shareo-dev) — NÃO o `.env.local` (staging)
loadEnv(".env")

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("✗ Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env (shareo-dev).")
  process.exit(1)
}
if (!url.includes("kehbrjlllfkooauaswtp")) {
  console.error(`✗ Segurança: a URL não é a do shareo-dev (${url}). Abortando para não tocar em staging/prod.`)
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
  console.log("\nBuckets no shareo-dev:", (data ?? []).map((x) => x.name).join(", ") || "(nenhum)")
}

main().catch((e) => { console.error("✗ erro:", e instanceof Error ? e.message : e); process.exit(1) })
