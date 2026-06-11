/**
 * Tarefa 1 — Playwright QA
 * Valida que os links do submenu Explorar fecham o MobileMenu no mobile,
 * incluindo o caso crítico: mesmo pathname /itens com query params diferentes.
 *
 * Bug corrigido (be32df8): NavLink wrapper com onClick=close garante que links
 * com mesmo pathname mas query params diferentes fecham o menu, porque
 * useEffect([pathname]) não dispara nesse caso.
 *
 * Nota de diagnóstico: a navegação Next.js App Router entre query params
 * usa history.pushState (sem frame reload), por isso é necessário aguardar
 * a URL mudar após o clique antes de fazer assertions na URL.
 */
import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const MOBILE_NAV = '#mobile-nav'
const HAMBURGER_OPEN = 'button[aria-label="Abrir menu"]'

test.use({
  viewport: { width: 375, height: 812 },
  userAgent:
    'Mozilla/5.0 (Linux; Android 12; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
})

/** Abre o hamburguer e expande o submenu Explorar. */
async function openMenuAndExpandExplorar(page: import('@playwright/test').Page) {
  const nav = page.locator(MOBILE_NAV)
  await page.click(HAMBURGER_OPEN)
  await expect(nav).toBeVisible({ timeout: 8000 })
  await nav.getByRole('button', { name: 'Explorar' }).click()
  // Aguarda pelo menos o primeiro link aparecer como prova de expansão
  await expect(nav.locator('a[href="/itens?intent=rent"]')).toBeVisible({ timeout: 5000 })
  return nav
}

// ─── Rodada 1: pathname diferente (/itens?intent=rent a partir de /) ─────────

test('Rodada 1: menu fecha ao clicar link Explorar com pathname diferente', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'networkidle' })

  const nav = await openMenuAndExpandExplorar(page)
  const link = nav.locator('a[href="/itens?intent=rent"]')
  await expect(link).toBeVisible()

  await link.click()

  // Critério principal: menu deve fechar
  await expect(page.locator(MOBILE_NAV)).not.toBeVisible({ timeout: 8000 })

  // Aguarda URL estabilizar (navegação App Router é assíncrona)
  await page.waitForURL('**/itens**', { timeout: 8000 }).catch(() => {
    // Pode ser redirecionado por geolocalização/middleware; o que importa é o menu ter fechado
  })

  const urlAfter = page.url()
  console.log('[R1] Menu fechou. URL final:', urlAfter)
})

// ─── Rodada 2: MESMO pathname, query diferente (/itens?intent=rent → ?sort=views) ─

test('Rodada 2: menu fecha ao clicar link Explorar com mesmo pathname, query diferente', async ({ page }) => {
  // Navega para /itens?intent=rent — este é o caso crítico do bug be32df8
  await page.goto(`${BASE}/itens?intent=rent`, { waitUntil: 'networkidle' })
  console.log('[R2] URL inicial:', page.url())

  const nav = await openMenuAndExpandExplorar(page)

  // Link com mesmo pathname /itens mas query param diferente
  const link = nav.locator('a[href="/itens?sort=views"]')
  await expect(link).toBeVisible({ timeout: 5000 })

  await link.click()

  // Critério 1: menu deve fechar (este é o bug corrigido — useEffect[pathname] não disparava)
  await expect(page.locator(MOBILE_NAV)).not.toBeVisible({ timeout: 8000 })

  // Critério 2: URL deve mudar para /itens?sort=views
  await page.waitForURL('**/itens?sort=views**', { timeout: 8000 })

  const urlAfter = page.url()
  console.log('[R2] Menu fechou. URL final:', urlAfter)

  expect(urlAfter).toContain('sort=views')
})
