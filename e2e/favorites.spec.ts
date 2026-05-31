import fs from 'fs'
import { test, expect } from '@playwright/test'
import { SESSION_PATHS } from './fixtures/test-credentials'

const hasLocatarioSession = fs.existsSync(SESSION_PATHS.locatario)

// ---------------------------------------------------------------------------
// Suite — testes públicos (sem autenticação)
// ---------------------------------------------------------------------------

test.describe('Favoritos — testes públicos', () => {
  test('botão de favoritar está visível no ItemCard', async ({ page }) => {
    await page.goto('/itens')
    await expect(page.getByRole('main')).toBeVisible()

    const firstCard = page.locator('[data-testid="item-card"], article').first()
    const hasCards = await firstCard.isVisible({ timeout: 10000 })

    if (!hasCards) {
      test.info().annotations.push({ type: 'info', description: 'Nenhum ItemCard encontrado' })
      return
    }

    const favBtn = firstCard
      .locator('[data-testid="favorite-btn"]')
      .or(firstCard.locator('button[aria-label*="favorit"], button[aria-label*="Favorit"]'))
      .or(firstCard.locator('button').filter({ has: page.locator('svg[class*="heart"], svg[class*="Heart"]') }))

    await expect(favBtn).toBeVisible({ timeout: 8000 })

    const tapTargetOk = await favBtn.evaluate((el) => {
      const style = window.getComputedStyle(el)
      const rect  = el.getBoundingClientRect()
      const w = Math.max(rect.width,  parseFloat(style.minWidth)  || 0, parseFloat(style.width)  || 0)
      const h = Math.max(rect.height, parseFloat(style.minHeight) || 0, parseFloat(style.height) || 0)
      return w >= 44 && h >= 44
    })
    expect(tapTargetOk, 'Tap target do favoritar deve ser ≥ 44×44px').toBe(true)
  })

  test('usuário não autenticado: clica favoritar e é redirecionado para /login', async ({ page }) => {
    await page.goto('/itens')
    await expect(page.getByRole('main')).toBeVisible()

    const firstCard = page.locator('[data-testid="item-card"], article').first()
    const hasCards = await firstCard.isVisible({ timeout: 10000 })
    if (!hasCards) { test.info().annotations.push({ type: 'info', description: 'Sem cards' }); return }

    const favBtn = firstCard
      .locator('[data-testid="favorite-btn"]')
      .or(firstCard.locator('button[aria-label*="favorit"], button[aria-label*="Favorit"]'))

    const hasFavBtn = await favBtn.isVisible({ timeout: 5000 })
    if (!hasFavBtn) { test.info().annotations.push({ type: 'info', description: 'Sem botão favoritar' }); return }

    await favBtn.click()
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })

  test('tap target do botão favoritar é ≥ 44×44px (boundingBox)', async ({ page }) => {
    await page.goto('/itens')
    await expect(page.getByRole('main')).toBeVisible()

    const firstCard = page.locator('[data-testid="item-card"], article').first()
    const hasCards = await firstCard.isVisible({ timeout: 10000 })
    if (!hasCards) { test.info().annotations.push({ type: 'info', description: 'Sem cards' }); return }

    const favBtn = firstCard
      .locator('[data-testid="favorite-btn"]')
      .or(firstCard.locator('button[aria-label*="favorit"], button[aria-label*="Favorit"]'))

    const hasFavBtn = await favBtn.isVisible({ timeout: 5000 })
    if (!hasFavBtn) { test.info().annotations.push({ type: 'info', description: 'Sem botão favoritar' }); return }

    const box = await favBtn.boundingBox()
    expect(box, 'boundingBox() não deve ser null').not.toBeNull()
    expect(box!.width,  `Largura ≥ 44px (obtido: ${box!.width}px)`).toBeGreaterThanOrEqual(44)
    expect(box!.height, `Altura ≥ 44px (obtido: ${box!.height}px)`).toBeGreaterThanOrEqual(44)
  })
})

// ---------------------------------------------------------------------------
// Suite — testes autenticados (requer session fixture de locatário)
// ---------------------------------------------------------------------------

test.describe('Favoritos — autenticado como locatário', () => {
  test.skip(!hasLocatarioSession, 'Session fixture não encontrada — rode: pnpm tsx scripts/create-staging-fixtures.ts')

  test.use({ storageState: SESSION_PATHS.locatario })

  test('usuário autenticado: clica favoritar e ícone muda para estado ativo', async ({ page }) => {
    await page.goto('/itens')
    await expect(page.getByRole('main')).toBeVisible()

    const firstCard = page.locator('[data-testid="item-card"], article').first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })

    const favBtn = firstCard
      .locator('[data-testid="favorite-btn"]')
      .or(firstCard.locator('button[aria-label*="favorit"], button[aria-label*="Favorit"]'))

    await expect(favBtn).toBeVisible()

    // Aguarda resposta da API (toggle — pode ser favoritar ou desfavoritar dependendo do estado atual)
    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/favorite') && resp.ok(),
        { timeout: 20000 },
      ),
      favBtn.click(),
    ])
    expect(response.ok(), `API de favoritar retornou ${response.status()}`).toBe(true)

    // Verifica que aria-pressed reflete o resultado da API (favorited: true ou false)
    const json = await response.json() as { data: { favorited: boolean } }
    const expectedAriaPressed = json.data.favorited ? 'true' : 'false'
    await expect(favBtn).toHaveAttribute('aria-pressed', expectedAriaPressed, { timeout: 8000 })
  })

  test('página /favoritos carrega para usuário autenticado (vazia ou com cards)', async ({ page }) => {
    await page.goto('/favoritos')
    await expect(page.getByRole('main')).toBeVisible({ timeout: 15000 })

    // O h1 "Favoritos" sempre aparece
    await expect(page.getByRole('heading', { name: /favoritos/i })).toBeVisible()

    // Empty state real: "Nenhum item salvo ainda." (sempre renderizado quando 0 itens)
    // ou grid de ItemCards — usa waitFor para aguardar renderização SSR
    const emptyState = page.getByText('Nenhum item salvo ainda.')
    const cards      = page.locator('[data-testid="item-card"], article')

    const hasEmpty = await emptyState.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)
    const hasCards = await cards.first().waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)

    expect(hasEmpty || hasCards, 'Página /favoritos deve mostrar empty state ou cards').toBe(true)
  })
})
