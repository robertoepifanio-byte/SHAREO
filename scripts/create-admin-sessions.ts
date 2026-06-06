/**
 * Cria session fixtures para admins financeiro e operacional no staging.
 * Uso: npx tsx scripts/create-admin-sessions.ts
 *
 * O script valida que cada sessão dá acesso à rota esperada antes de salvar.
 * Se um admin não consegue acessar a rota de validação, o script aborta com
 * diagnóstico claro em vez de salvar um storageState inútil.
 */

import { chromium } from "playwright"
import * as fs from "fs"
import * as path from "path"

const BASE    = process.env.STAGING_URL ?? "https://shareo-rouge.vercel.app"
const OUT_DIR = path.join(process.cwd(), "e2e", "fixtures")

interface AdminConfig {
  email:       string
  password:    string
  file:        string
  /**
   * Rota que deve ser acessível após login com essa conta.
   * Usada para validar que o storageState é funcional antes de salvar.
   * Se não especificada, apenas verifica que saiu do /login.
   */
  validateUrl?: string
  validatePattern?: RegExp
}

const ADMINS: AdminConfig[] = [
  {
    email:          "admin.fixture@shareo-test.com",
    password:       "Fixture@Admin99",
    file:           "session-admin.json",
    // SUPERADMIN deve acessar /admin/usuarios/admins — se cair em /admin,
    // o adminRole está errado no banco. Execute fix-admin-roles.ts primeiro.
    validateUrl:    "/admin/usuarios/admins",
    validatePattern: /\/admin\/usuarios\/admins/,
  },
  {
    email:          "financeiro@shareo.com.br",
    password:       "REDACTED_USE_ENV_VAR",
    file:           "session-financeiro.json",
    validateUrl:    "/admin/usuarios",
    validatePattern: /\/admin\/usuarios/,
  },
  {
    email:          "operacional@shareo.com.br",
    password:       "REDACTED_USE_ENV_VAR",
    file:           "session-operacional.json",
    validateUrl:    "/admin/usuarios",
    validatePattern: /\/admin\/usuarios/,
  },
]

async function createSession(cfg: AdminConfig): Promise<object> {
  const { email, password, validateUrl, validatePattern } = cfg

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page    = await context.newPage()

  try {
    console.log(`  → Abrindo ${BASE}/login`)
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" })

    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill(password)

    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20_000 }),
      page.locator('button[type="submit"]').click(),
    ])

    const postLoginUrl = page.url()
    console.log(`  → Redirecionado para ${postLoginUrl}`)

    // Validação: navegar para a rota protegida e verificar que chegou lá
    if (validateUrl && validatePattern) {
      console.log(`  → Validando acesso a ${validateUrl}`)
      await page.goto(`${BASE}${validateUrl}`, { waitUntil: "domcontentloaded", timeout: 60_000 })
      const finalUrl = page.url()

      if (!validatePattern.test(finalUrl)) {
        // Diagnóstico baseado na URL final
        let diagnosis = `URL final: ${finalUrl}`
        if (/\/login/.test(finalUrl)) {
          diagnosis = "Caiu em /login — cookie de sessão não foi aceito pelo servidor. " +
            "Verifique AUTH_SECRET no Vercel."
        } else if (/\/admin$/.test(finalUrl.replace(/\/$/, ""))) {
          diagnosis = "Caiu em /admin — sessão válida mas adminRole insuficiente. " +
            "Execute: pnpm tsx scripts/fix-admin-roles.ts"
        } else if (/\/dashboard/.test(finalUrl)) {
          diagnosis = "Caiu em /dashboard — usuário não tem role=ADMIN no banco. " +
            "Verifique o campo role no Supabase staging."
        }
        throw new Error(`Validação falhou para ${email}. ${diagnosis}`)
      }

      console.log(`  → Validação OK: ${finalUrl}`)
    }

    // Salvar o storageState após a validação.
    // Navegar para a rota de validação não altera os cookies de sessão JWT
    // (o __Secure-authjs.session-token é imutável até expirar).
    // O único cookie que pode mudar é o __Secure-authjs.callback-url,
    // que não afeta a autenticação.
    const state = await context.storageState()
    return state

  } finally {
    await browser.close()
  }
}

async function main() {
  console.log(`\nCriando sessions de admin no staging: ${BASE}\n`)

  for (const cfg of ADMINS) {
    console.log(`[${cfg.email}]`)
    try {
      const session = await createSession(cfg)
      const outPath = path.join(OUT_DIR, cfg.file)
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
