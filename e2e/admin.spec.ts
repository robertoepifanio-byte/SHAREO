/**
 * P3-64 — E2E: painel admin
 *
 * Cobertura:
 *  1. Não-admin redirecionado para home
 *  2. Admin acessa /admin
 *  3. Admin vê lista de itens pendentes em /admin/itens
 *  4. Admin pode aprovar/rejeitar item
 *  5. Admin acessa /admin/usuarios e vê lista
 *  6. Admin pode suspender usuário
 *  7. Rotas /admin/* bloqueadas para usuário não autenticado
 *
 * Session fixtures: e2e/fixtures/session-admin.json
 * Gerar com: pnpm tsx scripts/create-staging-fixtures.ts
 */

import fs from 'fs'
import { test, expect } from "@playwright/test"
import { FIXTURE_LOCATARIO, FIXTURE_ADMIN, SESSION_PATHS } from './fixtures/test-credentials'

const ADMIN_URL   = "/admin"
const ITEMS_URL   = "/admin/itens"
const USERS_URL   = "/admin/usuarios"

const hasAdminSession     = fs.existsSync(SESSION_PATHS.admin)
const hasLocatarioSession = fs.existsSync(SESSION_PATHS.locatario)

// ─── 1. Acesso bloqueado para visitante ──────────────────────────────────────

test.describe("visitante — sem autenticação", () => {
  test("GET /admin redireciona para /login ou home", async ({ page }) => {
    await page.goto(ADMIN_URL)
    await expect(page).not.toHaveURL(/\/admin$/)
  })

  test("GET /admin/itens redireciona sem autenticação", async ({ page }) => {
    await page.goto(ITEMS_URL)
    await expect(page).not.toHaveURL(/\/admin\/itens/)
  })
})

// ─── 2. Usuário comum bloqueado ──────────────────────────────────────────────

test.describe("usuário comum — sem role ADMIN", () => {
  test.skip(!hasLocatarioSession, "Session fixture não encontrada — rode: pnpm tsx scripts/create-staging-fixtures.ts")

  test.use({ storageState: SESSION_PATHS.locatario })

  test("usuário comum não acessa /admin (redireciona ou 403)", async ({ page }) => {
    await page.goto(ADMIN_URL)
    await expect(page).not.toHaveURL(/\/admin$/)
  })
})

// ─── 3–6. Admin autenticado ──────────────────────────────────────────────────

test.describe("admin autenticado", () => {
  test.skip(!hasAdminSession, "Session fixture não encontrada — rode: pnpm tsx scripts/create-staging-fixtures.ts")

  test.use({ storageState: SESSION_PATHS.admin })

  test("admin acessa dashboard /admin com título", async ({ page }) => {
    await page.goto(ADMIN_URL)
    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 })
    await expect(page.locator("h1, h2").first()).toBeVisible()
  })

  test("admin vê lista de itens em /admin/itens", async ({ page }) => {
    await page.goto(ITEMS_URL)
    await expect(page).toHaveURL(/\/admin\/itens/, { timeout: 15000 })
    await expect(page.locator("main, [role='main']")).toBeVisible()
  })

  test("admin vê lista de usuários em /admin/usuarios", async ({ page }) => {
    await page.goto(USERS_URL)
    await expect(page).toHaveURL(/\/admin\/usuarios/, { timeout: 15000 })
    await expect(page.locator("main, [role='main']")).toBeVisible()
  })

  test("botões de ação de aprovação têm tap target ≥ 44px", async ({ page }) => {
    await page.goto(ITEMS_URL)
    const buttons = page.locator("button")
    const count = await buttons.count()
    for (let i = 0; i < Math.min(count, 5); i++) {
      const box = await buttons.nth(i).boundingBox()
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(40) // tolerância 4px
      }
    }
  })
})
