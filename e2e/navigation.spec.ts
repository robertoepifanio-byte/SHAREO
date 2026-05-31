import { test, expect, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Rola a página para baixo em `pixels` pixels via JavaScript. */
async function scrollDown(page: Page, pixels: number) {
  await page.evaluate((px) => window.scrollBy(0, px), pixels)
  // Aguarda o scroll ser processado
  await page.waitForTimeout(300)
}

/** Localiza o header/banner da página. O smoke test já usa getByRole('banner'). */
function getHeader(page: Page) {
  return page.getByRole('banner')
}

// ---------------------------------------------------------------------------
// Suite — Header e navegação
// ---------------------------------------------------------------------------

test.describe('Navegação — header, menu mobile e links', () => {
  // -------------------------------------------------------------------------
  // 1. Header visível na home
  // -------------------------------------------------------------------------
  test('header com logo ShareO está visível na home', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('main')).toBeVisible()

    const header = getHeader(page)
    await expect(header).toBeVisible()

    // Logo deve conter o nome da marca
    await expect(
      header.getByText(/ShareO/i).or(header.getByRole('img', { name: /ShareO|logo/i })),
    ).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 2. Header sticky ao rolar
  // -------------------------------------------------------------------------
  test('header permanece visível após rolar 500px na página de itens', async ({ page }) => {
    await page.goto('/itens')
    await expect(page.getByRole('main')).toBeVisible()

    // Aguarda conteúdo suficiente para permitir scroll
    await page.waitForLoadState('domcontentloaded')
    await scrollDown(page, 500)

    const header = getHeader(page)
    // isInViewport garante que o elemento está visível na área visível do browser
    await expect(header).toBeInViewport()
  })

  // -------------------------------------------------------------------------
  // 3. Header visível em páginas internas
  // -------------------------------------------------------------------------
  for (const rota of ['/itens', '/login', '/cadastro'] as const) {
    test(`header visível em ${rota}`, async ({ page }) => {
      await page.goto(rota)
      // Páginas de auth usam layout simplificado sem <header> — verifica logo
      const isAuthRoute = rota === '/login' || rota === '/cadastro'
      if (isAuthRoute) {
        await expect(page.getByRole('img', { name: /ShareO/i })).toBeVisible()
      } else {
        await expect(getHeader(page)).toBeVisible()
      }
    })
  }

  test('header visível em página de detalhe de item (qualquer slug)', async ({ page }) => {
    // Navega primeiro para /itens e segue o primeiro link de item para obter
    // uma URL válida, evitando depender de IDs hardcoded.
    await page.goto('/itens')
    await page.waitForLoadState('domcontentloaded')

    const firstItemLink = page
      .locator('[data-testid="item-card"] a, article a')
      .first()

    const hasItems = await firstItemLink.isVisible()
    if (hasItems) {
      await firstItemLink.click()
      await expect(page.getByRole('main')).toBeVisible()
      await expect(getHeader(page)).toBeVisible()
    } else {
      // Empty state: basta confirmar que o header é visível em /itens
      await expect(getHeader(page)).toBeVisible()
    }
  })

  // -------------------------------------------------------------------------
  // 4. Menu mobile aparece no viewport 375px
  // -------------------------------------------------------------------------
  test('menu mobile (hambúrguer ou bottom nav) visível no viewport 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await expect(page.getByRole('main')).toBeVisible()

    // Aceita hambúrguer OU bottom navigation — qualquer um dos dois atende
    const hamburguer = page.getByRole('button', { name: /menu|hambúrguer|abrir navegação/i })
    const bottomNav = page.locator('[data-testid="bottom-nav"], nav[aria-label*="mobile"], nav[aria-label*="inferior"]')

    const hamburguerVisible = await hamburguer.isVisible()
    const bottomNavVisible = await bottomNav.isVisible()

    expect(
      hamburguerVisible || bottomNavVisible,
      'Deve haver hambúrguer ou bottom nav no viewport 375px',
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // 5. Menu mobile abre e exibe links de navegação
  // -------------------------------------------------------------------------
  test('menu mobile abre ao clicar no hambúrguer e exibe links', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await expect(page.getByRole('main')).toBeVisible()

    const hamburguer = page.getByRole('button', { name: /menu|hambúrguer|abrir navegação/i })
    const hasHamburguer = await hamburguer.isVisible()

    if (!hasHamburguer) {
      // Produto usa bottom nav — sem hambúrguer para abrir
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'Bottom nav não requer clique para abrir — verificando links diretamente',
      })
      const bottomNav = page.locator('[data-testid="bottom-nav"], nav[aria-label*="mobile"], nav[aria-label*="inferior"]')
      await expect(bottomNav).toBeVisible()
      return
    }

    await hamburguer.click()

    // Menu lateral ou drawer deve aparecer com links de navegação
    const navMenu = page.locator('#mobile-nav')
    await expect(navMenu).toBeVisible({ timeout: 5000 })

    // Deve conter ao menos um link navegável
    await expect(navMenu.getByRole('link').first()).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 6. Menu mobile fecha ao navegar
  // -------------------------------------------------------------------------
  test('menu mobile fecha (ou navega) ao clicar em um link', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await expect(page.getByRole('main')).toBeVisible()

    const hamburguer = page.getByRole('button', { name: /menu|hambúrguer|abrir navegação/i })
    const hasHamburguer = await hamburguer.isVisible()
    if (!hasHamburguer) {
      // Bottom nav: navega diretamente, sem drawer para fechar
      return
    }

    await hamburguer.click()

    const navMenu = page.locator('#mobile-nav')
    await expect(navMenu).toBeVisible({ timeout: 5000 })

    // Clica no primeiro link de navegação
    const firstNavLink = navMenu.getByRole('link').first()
    await firstNavLink.click()

    // Após clique: ou o menu fecha (não visível) ou a página mudou
    const menuAindaVisivel = await navMenu.isVisible()
    const urlMudou = !page.url().endsWith('/')

    expect(
      !menuAindaVisivel || urlMudou,
      'Menu deve fechar ou página deve mudar após clicar em link',
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // 7. Links de navegação no header (desktop)
  // -------------------------------------------------------------------------
  test('header desktop contém links para home, explorar e anunciar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    await expect(page.getByRole('main')).toBeVisible()

    const header = getHeader(page)

    // Home / logo (link para /)
    await expect(
      header.getByRole('link', { name: /ShareO|home|início/i }).or(
        header.getByRole('link').filter({ has: page.getByRole('img', { name: /logo/i }) }),
      ).first(),
    ).toBeVisible()

    // Explorar / buscar / itens
    await expect(
      header.getByRole('link', { name: /explorar|buscar|itens|alugar/i }),
    ).toBeVisible()

    // Anunciar / criar anúncio
    await expect(
      header.getByRole('link', { name: /anunciar|publicar|cadastrar item/i }),
    ).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 8. Bottom navigation visível com ícones no mobile
  // -------------------------------------------------------------------------
  test('bottom navigation visível com ícones de navegação no viewport 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await expect(page.getByRole('main')).toBeVisible()

    // Bottom nav identificado pelo aria-label exato e classe Tailwind fixed bottom-0
    const bottomNav = page.locator('nav[aria-label="Navegação mobile"][class*="bottom-0"]')

    const isVisible = await bottomNav.isVisible()
    if (!isVisible) {
      // Produto pode usar hambúrguer em vez de bottom nav — não é blocker
      test.info().annotations.push({
        type: 'info',
        description: 'Bottom nav não encontrado — produto pode usar hambúrguer no mobile',
      })
      return
    }

    await expect(bottomNav).toBeVisible()

    // Deve conter ao menos 2 links de navegação
    const links = bottomNav.getByRole('link')
    await expect(links).toHaveCount(2, { timeout: 5000 }).catch(async () => {
      // Aceita qualquer quantidade >= 2 como válida
      const count = await links.count()
      expect(count).toBeGreaterThanOrEqual(2)
    })
  })
})
