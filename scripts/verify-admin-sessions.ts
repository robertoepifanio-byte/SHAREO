/**
 * Verifica se os storageState de admin têm sessão válida no staging.
 * Carrega cada fixture, navega para uma rota protegida por adminRole e
 * confirma que a URL final bate com o esperado.
 *
 * Uso: npx tsx scripts/verify-admin-sessions.ts
 *
 * Saída:
 *   ✓ session-admin.json       → /admin/usuarios/admins (SUPERADMIN OK)
 *   ✗ session-financeiro.json  → URL inesperada: /login  (SESSÃO INVÁLIDA)
 */

import { chromium } from "playwright"
import * as fs from "fs"
import * as path from "path"

const BASE    = process.env.STAGING_URL ?? "https://shareo-rouge.vercel.app"
const OUT_DIR = path.join(process.cwd(), "e2e", "fixtures")

interface CheckConfig {
  file:        string
  targetUrl:   string
  expectedUrl: RegExp
  label:       string
}

const CHECKS: CheckConfig[] = [
  {
    file:        "session-admin.json",
    targetUrl:   "/admin/usuarios/admins",
    expectedUrl: /\/admin\/usuarios\/admins/,
    label:       "SUPERADMIN → /admin/usuarios/admins",
  },
  {
    file:        "session-financeiro.json",
    targetUrl:   "/admin/usuarios",
    expectedUrl: /\/admin\/usuarios/,
    label:       "FINANCEIRO → /admin/usuarios",
  },
  {
    file:        "session-operacional.json",
    targetUrl:   "/admin/usuarios",
    expectedUrl: /\/admin\/usuarios/,
    label:       "OPERACIONAL → /admin/usuarios",
  },
]

async function checkSession(cfg: CheckConfig): Promise<{ ok: boolean; finalUrl: string; error?: string }> {
  const fixturePath = path.join(OUT_DIR, cfg.file)

  if (!fs.existsSync(fixturePath)) {
    return { ok: false, finalUrl: "", error: "Arquivo não encontrado" }
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: fixturePath })
  const page    = await context.newPage()

  try {
    await page.goto(`${BASE}${cfg.targetUrl}`, { waitUntil: "networkidle", timeout: 20_000 })
    const finalUrl = page.url()
    const ok = cfg.expectedUrl.test(finalUrl)
    return { ok, finalUrl }
  } catch (e) {
    return { ok: false, finalUrl: page.url(), error: e instanceof Error ? e.message : String(e) }
  } finally {
    await browser.close()
  }
}

async function main() {
  console.log(`\nVerificando sessions de admin no staging: ${BASE}\n`)

  let allOk = true

  for (const cfg of CHECKS) {
    process.stdout.write(`  [${cfg.file}] ${cfg.label} ... `)
    const result = await checkSession(cfg)

    if (result.ok) {
      console.log(`✓ OK (${result.finalUrl})`)
    } else {
      allOk = false
      const reason = result.error ?? `URL final: ${result.finalUrl}`
      console.log(`✗ FALHOU — ${reason}`)

      // Diagnóstico adicional: verificar se caiu em /login (sessão inválida)
      // ou em /admin (sessão válida mas adminRole errado)
      if (/\/login/.test(result.finalUrl)) {
        console.log(`     → CAUSA: cookie de sessão inválido ou expirado. Recrie com: pnpm tsx scripts/create-admin-sessions.ts`)
      } else if (/\/admin$/.test(result.finalUrl)) {
        console.log(`     → CAUSA: sessão válida mas adminRole insuficiente. Verifique o adminRole no banco de staging.`)
        console.log(`     → FIX: execute pnpm tsx scripts/fix-admin-roles.ts`)
      } else if (/\/dashboard/.test(result.finalUrl)) {
        console.log(`     → CAUSA: usuário não tem role=ADMIN no banco. Verifique o campo role no Supabase staging.`)
      }
    }
  }

  console.log(allOk ? "\nTodas as sessions estão OK.\n" : "\nAlgumas sessions têm problemas. Veja as causas acima.\n")
  process.exit(allOk ? 0 : 1)
}

main()
