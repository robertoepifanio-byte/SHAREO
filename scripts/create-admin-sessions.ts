/**
 * Cria session fixtures para admins financeiro e operacional no staging.
 * Uso: npx tsx scripts/create-admin-sessions.ts
 */

import { chromium } from "playwright"
import * as fs from "fs"
import * as path from "path"

const BASE    = process.env.STAGING_URL ?? "https://shareo-rouge.vercel.app"
const OUT_DIR = path.join(process.cwd(), "e2e", "fixtures")

const ADMINS = [
  { email: "financeiro@shareo.com.br",  password: "REDACTED_USE_ENV_VAR", file: "session-financeiro.json"  },
  { email: "operacional@shareo.com.br", password: "REDACTED_USE_ENV_VAR", file: "session-operacional.json" },
]

async function createSession(email: string, password: string): Promise<object> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page    = await context.newPage()

  console.log(`  → Abrindo ${BASE}/login`)
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" })

  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)

  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20_000 }),
    page.locator('button[type="submit"]').click(),
  ])

  console.log(`  → Redirecionado para ${page.url()}`)

  const cookies = await context.cookies()
  const storage = await context.storageState()

  await browser.close()

  return {
    cookies: cookies.filter((c) => c.domain.includes("shareo-rouge")),
    origins: storage.origins ?? [],
  }
}

async function main() {
  console.log(`\nCriando sessions de admin no staging: ${BASE}\n`)

  for (const { email, password, file } of ADMINS) {
    console.log(`[${email}]`)
    try {
      const session = await createSession(email, password)
      const outPath = path.join(OUT_DIR, file)
      fs.writeFileSync(outPath, JSON.stringify(session, null, 2))
      console.log(`  ✓ Salvo em ${outPath}\n`)
    } catch (err) {
      console.error(`  ✗ Falhou:`, err instanceof Error ? err.message : err)
      process.exit(1)
    }
  }

  console.log("Pronto. Sessions criadas:\n")
  ADMINS.forEach(({ file }) => console.log(`  e2e/fixtures/${file}`))
}

main()
