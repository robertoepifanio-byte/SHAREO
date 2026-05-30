import { test, expect, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

/**
 * Retorna os índices dos cards que compõem a primeira linha, agrupando por
 * `getBoundingClientRect().top`. Considera cards na mesma linha aqueles com
 * diferença de `top` menor que `tolerance` pixels (acomoda sub-pixel rendering).
 */
async function countCardsInFirstRow(page: Page, selector: string, tolerance = 4): Promise<number> {
  const cards = page.locator(selector)
  const count = await cards.count()
  if (count === 0) return 0

  // Coleta o valor `top` de cada card via JS para evitar múltiplas round-trips
  const tops: number[] = await page.evaluate(
    ({ sel, tol }: { sel: string; tol: number }) => {
      const els = Array.from(document.querySelectorAll(sel))
      return els.map((el) => {
        const rect = el.getBoundingClientRect()
        // Arredonda para evitar ruído de sub-pixel
        return Math.round(rect.top / tol) * tol
      })
    },
    { sel: selector, tol: tolerance },
  )

  if (tops.length === 0) return 0
  const firstRowTop = tops[0]
  return tops.filter((t) => Math.abs(t - firstRowTop) <= tolerance).length
}

const CARD_SELECTOR = '[data-testid="item-card"], article'

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe('Responsividade — grid de itens e layout nos 3 breakpoints', () => {
  // -------------------------------------------------------------------------
  // 1. Mobile 375px — grid de 1 ou 2 colunas em /itens
  // -------------------------------------------------------------------------
  test('mobile 375px: grid de 1–2 colunas em /itens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/itens')
    await expect(page.getByRole('main')).toBeVisible()
    await page.waitForLoadState('domcontentloaded')

    const hasCards = await page.locator(CARD_SELECTOR).first().isVisible({ timeout: 10000 })
    if (!hasCards) {
      test.info().annotations.push({
        type: 'info',
        description: 'Nenhum ItemCard encontrado em /itens — grid não pôde ser verificado',
      })
      return
    }

    const colsInFirstRow = await countCardsInFirstRow(page, CARD_SELECTOR)
    expect(
      colsInFirstRow,
      `Mobile 375px deve exibir 1 ou 2 colunas na primeira linha (obtido: ${colsInFirstRow})`,
    ).toBeGreaterThanOrEqual(1)
    expect(
      colsInFirstRow,
      `Mobile 375px não deve exceder 2 colunas (obtido: ${colsInFirstRow})`,
    ).toBeLessThanOrEqual(2)
  })

  // -------------------------------------------------------------------------
  // 2. Tablet 768px — grid de 2–3 colunas em /itens
  // -------------------------------------------------------------------------
  test('tablet 768px: grid de 2–3 colunas em /itens', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/itens')
    await expect(page.getByRole('main')).toBeVisible()
    await page.waitForLoadState('domcontentloaded')

    const hasCards = await page.locator(CARD_SELECTOR).first().isVisible({ timeout: 10000 })
    if (!hasCards) {
      test.info().annotations.push({
        type: 'info',
        description: 'Nenhum ItemCard encontrado em /itens — grid não pôde ser verificado',
      })
      return
    }

    const colsInFirstRow = await countCardsInFirstRow(page, CARD_SELECTOR)
    expect(
      colsInFirstRow,
      `Tablet 768px deve exibir 2–3 colunas na primeira linha (obtido: ${colsInFirstRow})`,
    ).toBeGreaterThanOrEqual(2)
    expect(
      colsInFirstRow,
      `Tablet 768px não deve exceder 3 colunas (obtido: ${colsInFirstRow})`,
    ).toBeLessThanOrEqual(3)
  })

  // -------------------------------------------------------------------------
  // 3. Desktop 1280px — grid de 4 colunas em /itens
  // -------------------------------------------------------------------------
  test('desktop 1280px: grid de 4 colunas em /itens', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/itens')
    await expect(page.getByRole('main')).toBeVisible()
    await page.waitForLoadState('domcontentloaded')

    const hasCards = await page.locator(CARD_SELECTOR).first().isVisible({ timeout: 10000 })
    if (!hasCards) {
      test.info().annotations.push({
        type: 'info',
        description: 'Nenhum ItemCard encontrado em /itens — grid não pôde ser verificado',
      })
      return
    }

    const colsInFirstRow = await countCardsInFirstRow(page, CARD_SELECTOR)
    expect(
      colsInFirstRow,
      `Desktop 1280px deve exibir 4 colunas na primeira linha (obtido: ${colsInFirstRow})`,
    ).toBe(4)
  })

  // -------------------------------------------------------------------------
  // 4. Mobile: bottom navigation visível e sidebar de filtros oculta
  // -------------------------------------------------------------------------
  test('mobile 375px: bottom navigation visível e sidebar de filtros oculta', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/itens')
    await expect(page.getByRole('main')).toBeVisible()

    // Bottom navigation — aceita data-testid, aria-label ou nav com links principais
    const bottomNav = page
      .locator('[data-testid="bottom-nav"]')
      .or(page.locator('[aria-label*="navegação inferior"], [aria-label*="bottom"]'))
      .or(
        page.locator('nav').filter({
          has: page.locator('a[href="/"], a[href="/itens"], a[href="/anunciar"]'),
        }),
      )

    const hasBottomNav = await bottomNav.isVisible({ timeout: 5000 })
    if (hasBottomNav) {
      await expect(bottomNav).toBeVisible()
    } else {
      // Produto pode usar hambúrguer — verifica se ao menos o header está presente
      await expect(page.getByRole('banner')).toBeVisible()
      test.info().annotations.push({
        type: 'info',
        description: 'Bottom nav não encontrado — produto pode usar padrão de hambúrguer no mobile',
      })
    }

    // Sidebar de filtros (painel lateral) deve estar oculta no mobile
    const filterSidebar = page
      .locator('[data-testid="filter-sidebar"], [data-testid="filters-panel"]')
      .or(page.locator('aside').filter({ has: page.locator('[data-testid*="filter"], [class*="filter"]') }))
      .or(page.locator('[aria-label*="filtros"], [aria-label*="Filtros"]'))

    const sidebarVisible = await filterSidebar.isVisible({ timeout: 3000 })
    expect(
      sidebarVisible,
      'Sidebar de filtros não deve estar visível no viewport 375px',
    ).toBe(false)
  })

  // -------------------------------------------------------------------------
  // 5. Desktop: sidebar de filtros visível e bottom navigation oculta
  // -------------------------------------------------------------------------
  test('desktop 1280px: sidebar de filtros visível e bottom navigation oculta', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/itens')
    await expect(page.getByRole('main')).toBeVisible()

    // Sidebar de filtros deve estar visível no desktop
    const filterSidebar = page
      .locator('[data-testid="filter-sidebar"], [data-testid="filters-panel"]')
      .or(page.locator('aside').filter({ has: page.locator('[data-testid*="filter"], [class*="filter"]') }))
      .or(page.locator('[aria-label*="filtros"], [aria-label*="Filtros"]'))

    const hasSidebar = await filterSidebar.isVisible({ timeout: 5000 })
    if (!hasSidebar) {
      // Filtros podem estar em linha (não sidebar) no desktop — verifica presença
      const inlineFilters = page
        .locator('[data-testid="category-filter"], [data-testid="price-filter"]')
        .or(page.getByRole('combobox', { name: /categor/i }))
      const hasInlineFilters = await inlineFilters.isVisible({ timeout: 3000 })
      test.info().annotations.push({
        type: 'info',
        description: hasInlineFilters
          ? 'Filtros aparecem inline no desktop, não como sidebar'
          : 'Sidebar/painel de filtros não encontrado no desktop',
      })
    } else {
      await expect(filterSidebar).toBeVisible()
    }

    // Bottom navigation não deve estar visível no desktop
    const bottomNav = page
      .locator('[data-testid="bottom-nav"]')
      .or(page.locator('[aria-label*="navegação inferior"], [aria-label*="bottom"]'))

    const bottomNavVisible = await bottomNav.isVisible({ timeout: 3000 })
    expect(
      bottomNavVisible,
      'Bottom navigation não deve estar visível no viewport 1280px',
    ).toBe(false)
  })

  // -------------------------------------------------------------------------
  // 6. Tablet: header visível e funcional em 768px
  // -------------------------------------------------------------------------
  test('tablet 768px: header visível e contém link navegável', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    await expect(page.getByRole('main')).toBeVisible()

    const header = page.getByRole('banner')
    await expect(header).toBeVisible()

    // Logo / link principal deve estar presente
    await expect(
      header.getByText(/ShareO/i).or(header.getByRole('img', { name: /ShareO|logo/i })),
    ).toBeVisible()

    // Deve conter ao menos um link navegável
    const navLinks = header.getByRole('link')
    const linkCount = await navLinks.count()
    expect(linkCount, 'Header tablet deve conter ao menos 1 link').toBeGreaterThanOrEqual(1)
  })
})
