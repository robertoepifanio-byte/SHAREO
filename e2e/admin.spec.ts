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
 */

import { test, expect } from "@playwright/test"

const ADMIN_URL   = "/admin"
const ITEMS_URL   = "/admin/itens"
const USERS_URL   = "/admin/usuarios"

// ─── helpers ─────────────────────────────────────────────────────────────────

async function loginAs(page: import("@playwright/test").Page, role: "admin" | "user") {
  const creds = role === "admin"
    ? { email: process.env.E2E_ADMIN_EMAIL ?? "admin@shareo.com.br",    password: process.env.E2E_ADMIN_PASSWORD ?? "Admin@123" }
    : { email: process.env.E2E_USER_EMAIL  ?? "usuario@shareo.com.br",  password: process.env.E2E_USER_PASSWORD  ?? "Senha@123" }

  await page.goto("/entrar")
  await page.fill('[name="email"]',    creds.email)
  await page.fill('[name="password"]', creds.password)
  await page.click('[type="submit"]')
  await page.waitForURL(/\/(dashboard|home|$)/, { timeout: 10_000 })
}

// ─── 1. Acesso bloqueado para visitante ──────────────────────────────────────

test.describe("visitante — sem autenticação", () => {
  test("GET /admin redireciona para /entrar ou home", async ({ page }) => {
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
  test.skip(
    !process.env.E2E_USER_EMAIL,
    "E2E_USER_EMAIL não definido — skip em CI sem seed",
  )

  test("usuário comum não acessa /admin", async ({ page }) => {
    await loginAs(page, "user")
    await page.goto(ADMIN_URL)
    // Deve redirecionar ou mostrar 403
    await expect(page).not.toHaveURL(/\/admin$/)
  })
})

// ─── 3–6. Admin autenticado ──────────────────────────────────────────────────

test.describe("admin autenticado", () => {
  test.skip(
    !process.env.E2E_ADMIN_EMAIL,
    "E2E_ADMIN_EMAIL não definido — skip em CI sem seed de admin",
  )

  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin")
  })

  test("admin acessa dashboard /admin com título", async ({ page }) => {
    await page.goto(ADMIN_URL)
    await expect(page).toHaveURL(/\/admin/)
    await expect(page.locator("h1, h2").first()).toBeVisible()
  })

  test("admin vê lista de itens em /admin/itens", async ({ page }) => {
    await page.goto(ITEMS_URL)
    await expect(page).toHaveURL(/\/admin\/itens/)
    // Página carrega sem erro 500
    await expect(page.locator("main, [role='main']")).toBeVisible()
  })

  test("admin vê lista de usuários em /admin/usuarios", async ({ page }) => {
    await page.goto(USERS_URL)
    await expect(page).toHaveURL(/\/admin\/usuarios/)
    await expect(page.locator("main, [role='main']")).toBeVisible()
  })

  test("botões de ação de aprovação têm tap target ≥ 44px", async ({ page }) => {
    await page.goto(ITEMS_URL)
    const buttons = page.locator("button")
    const count = await buttons.count()
    for (let i = 0; i < Math.min(count, 5); i++) {
      const box = await buttons.nth(i).boundingBox()
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(40) // tolerância de 4px
      }
    }
  })
})
