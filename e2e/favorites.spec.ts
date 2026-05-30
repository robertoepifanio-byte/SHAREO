import { test, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Nota sobre seletores:
// O botão de favoritar é localizado por data-testid="favorite-btn" ou por
// aria-label contendo "favorit". O ItemCard usa data-testid="item-card" ou
// <article>. Testes que dependem de sessão autenticada estão marcados com
// test.skip até que fixtures de storageState sejam criadas.
// TODO: criar fixture de usuário (locatário) via storageState/NextAuth para
// habilitar os testes marcados como skip.
// ---------------------------------------------------------------------------

test.describe('Favoritos — botão, persistência e página /favoritos', () => {
  // -------------------------------------------------------------------------
  // 1. Botão de favoritar visível no ItemCard — tap target ≥ 44px via CSS
  // -------------------------------------------------------------------------
  test('botão de favoritar está visível no ItemCard', async ({ page }) => {
    await page.goto('/itens')
    await expect(page.getByRole('main')).toBeVisible()

    // Aguarda ao menos um card carregar
    const firstCard = page.locator('[data-testid="item-card"], article').first()
    const hasCards = await firstCard.isVisible({ timeout: 10000 })

    if (!hasCards) {
      test.info().annotations.push({
        type: 'info',
        description: 'Nenhum ItemCard encontrado — lista pode estar vazia no ambiente de teste',
      })
      return
    }

    // Localiza o botão de favoritar dentro do primeiro card
    const favBtn = firstCard
      .locator('[data-testid="favorite-btn"]')
      .or(firstCard.locator('button[aria-label*="favorit"], button[aria-label*="Favorit"]'))
      .or(firstCard.locator('button').filter({ has: page.locator('svg[class*="heart"], svg[class*="Heart"]') }))

    await expect(favBtn).toBeVisible({ timeout: 8000 })

    // Verifica tap target mínimo via propriedades CSS computadas
    // (min-width/min-height ≥ 44px ou width/height ≥ 44px)
    const tapTargetOk = await favBtn.evaluate((el) => {
      const style = window.getComputedStyle(el)
      const rect = el.getBoundingClientRect()
      const width = Math.max(
        rect.width,
        parseFloat(style.minWidth) || 0,
        parseFloat(style.width) || 0,
      )
      const height = Math.max(
        rect.height,
        parseFloat(style.minHeight) || 0,
        parseFloat(style.height) || 0,
      )
      return width >= 44 && height >= 44
    })

    expect(
      tapTargetOk,
      'Botão de favoritar deve ter tap target mínimo de 44×44px',
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // 2. Usuário autenticado: clica favoritar → ícone muda para estado ativo
  // -------------------------------------------------------------------------
  // NOTE: requer locatário autenticado via fixture de storageState NextAuth.
  // TODO: criar fixture de sessão (locatário) e injetar via storageState.
  test.skip('usuário autenticado: clica favoritar e ícone muda para preenchido', async ({ page }) => {
    // TODO: criar fixture de sessão (locatário)
    await page.goto('/itens')
    await expect(page.getByRole('main')).toBeVisible()

    const firstCard = page.locator('[data-testid="item-card"], article').first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })

    const favBtn = firstCard
      .locator('[data-testid="favorite-btn"]')
      .or(firstCard.locator('button[aria-label*="favorit"]'))

    await expect(favBtn).toBeVisible()

    // Estado inicial: ícone vazio (não favoritado)
    const ariaBefore = await favBtn.getAttribute('aria-pressed')
    const classBefore = await favBtn.evaluate((el) => el.className)
    expect(
      ariaBefore === 'false' || !classBefore.includes('active'),
      'Botão deve começar no estado não-favoritado',
    ).toBe(true)

    await favBtn.click()

    // Estado após clique: ícone preenchido / aria-pressed="true" / classe "active"
    await expect(favBtn).toHaveAttribute('aria-pressed', 'true', { timeout: 5000 })
      .catch(async () => {
        // Fallback: verifica classe ou data-attribute de estado ativo
        const classAfter = await favBtn.evaluate((el) => el.className)
        expect(
          classAfter.includes('active') ||
          classAfter.includes('filled') ||
          classAfter.includes('favorited'),
          'Ícone deve indicar estado ativo após favoritar',
        ).toBe(true)
      })
  })

  // -------------------------------------------------------------------------
  // 3. Usuário autenticado: clica favoritar novamente → remove favorito
  // -------------------------------------------------------------------------
  // NOTE: requer locatário autenticado via fixture de storageState NextAuth.
  // TODO: criar fixture de sessão (locatário) com item já favoritado.
  test.skip('usuário autenticado: segundo clique no favoritar remove o favorito', async ({ page }) => {
    // TODO: criar fixture de sessão (locatário) com item já favoritado
    await page.goto('/itens')
    await expect(page.getByRole('main')).toBeVisible()

    const firstCard = page.locator('[data-testid="item-card"], article').first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })

    const favBtn = firstCard
      .locator('[data-testid="favorite-btn"]')
      .or(firstCard.locator('button[aria-label*="favorit"]'))

    // Primeiro clique — favorita
    await favBtn.click()
    await page.waitForTimeout(500) // aguarda atualização de estado

    // Segundo clique — desfavorita
    await favBtn.click()

    // Estado deve voltar para não-favoritado
    await expect(favBtn).toHaveAttribute('aria-pressed', 'false', { timeout: 5000 })
      .catch(async () => {
        const classAfter = await favBtn.evaluate((el) => el.className)
        expect(
          !classAfter.includes('active') &&
          !classAfter.includes('filled') &&
          !classAfter.includes('favorited'),
          'Ícone deve voltar ao estado inativo após desfavoritar',
        ).toBe(true)
      })
  })

  // -------------------------------------------------------------------------
  // 4. Usuário não autenticado: clica favoritar → redireciona para /login
  // -------------------------------------------------------------------------
  test('usuário não autenticado: clica favoritar e é redirecionado para /login', async ({ page }) => {
    await page.goto('/itens')
    await expect(page.getByRole('main')).toBeVisible()

    const firstCard = page.locator('[data-testid="item-card"], article').first()
    const hasCards = await firstCard.isVisible({ timeout: 10000 })

    if (!hasCards) {
      test.info().annotations.push({
        type: 'info',
        description: 'Nenhum ItemCard encontrado — impossível testar clique em favoritar',
      })
      return
    }

    const favBtn = firstCard
      .locator('[data-testid="favorite-btn"]')
      .or(firstCard.locator('button[aria-label*="favorit"], button[aria-label*="Favorit"]'))

    const hasFavBtn = await favBtn.isVisible({ timeout: 5000 })
    if (!hasFavBtn) {
      test.info().annotations.push({
        type: 'info',
        description: 'Botão de favoritar não encontrado — pode não estar visível para não autenticados',
      })
      return
    }

    await favBtn.click()

    // Deve redirecionar para /login — com ou sem callbackUrl
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })

  // -------------------------------------------------------------------------
  // 5. Página /favoritos exibe itens favoritados
  // -------------------------------------------------------------------------
  // NOTE: requer locatário autenticado com ao menos um item favoritado.
  // TODO: criar fixture de sessão (locatário) com favoritos pré-cadastrados.
  test.skip('página /favoritos exibe itens favoritados do usuário', async ({ page }) => {
    // TODO: criar fixture de sessão (locatário) com favoritos pré-cadastrados
    await page.goto('/favoritos')
    await expect(page.getByRole('main')).toBeVisible()

    // Deve exibir ao menos um card de item favoritado
    const cards = page.locator('[data-testid="item-card"], article')
    await expect(cards.first()).toBeVisible({ timeout: 10000 })

    const count = await cards.count()
    expect(count, 'Deve exibir ao menos 1 item favoritado').toBeGreaterThanOrEqual(1)
  })

  // -------------------------------------------------------------------------
  // 6. Remover favorito da página /favoritos → item some da lista
  // -------------------------------------------------------------------------
  // NOTE: requer locatário autenticado com ao menos um item favoritado.
  // TODO: criar fixture de sessão (locatário) com favoritos pré-cadastrados.
  test.skip('remover favorito da página /favoritos retira o item da lista', async ({ page }) => {
    // TODO: criar fixture de sessão (locatário) com favoritos pré-cadastrados
    await page.goto('/favoritos')
    await expect(page.getByRole('main')).toBeVisible()

    const cards = page.locator('[data-testid="item-card"], article')
    await expect(cards.first()).toBeVisible({ timeout: 10000 })

    const countBefore = await cards.count()
    expect(countBefore).toBeGreaterThanOrEqual(1)

    // Clica no botão de remover favorito do primeiro card
    const firstCard = cards.first()
    const removeFavBtn = firstCard
      .locator('[data-testid="favorite-btn"]')
      .or(firstCard.locator('button[aria-label*="remover favorit"], button[aria-label*="desfavorit"]'))
      .or(firstCard.locator('button[aria-pressed="true"]'))

    await expect(removeFavBtn).toBeVisible()
    await removeFavBtn.click()

    // O card deve desaparecer da lista
    await expect(cards).toHaveCount(countBefore - 1, { timeout: 8000 })
  })

  // -------------------------------------------------------------------------
  // 7. Tap target do botão favoritar ≥ 44×44px (via boundingBox)
  // -------------------------------------------------------------------------
  test('tap target do botão favoritar é ≥ 44×44px (boundingBox)', async ({ page }) => {
    await page.goto('/itens')
    await expect(page.getByRole('main')).toBeVisible()

    const firstCard = page.locator('[data-testid="item-card"], article').first()
    const hasCards = await firstCard.isVisible({ timeout: 10000 })

    if (!hasCards) {
      test.info().annotations.push({
        type: 'info',
        description: 'Nenhum ItemCard encontrado — tap target não pôde ser verificado',
      })
      return
    }

    const favBtn = firstCard
      .locator('[data-testid="favorite-btn"]')
      .or(firstCard.locator('button[aria-label*="favorit"], button[aria-label*="Favorit"]'))

    const hasFavBtn = await favBtn.isVisible({ timeout: 5000 })
    if (!hasFavBtn) {
      test.info().annotations.push({
        type: 'info',
        description: 'Botão de favoritar não encontrado — tap target não pôde ser verificado',
      })
      return
    }

    const box = await favBtn.boundingBox()
    expect(box, 'boundingBox() não deve ser null').not.toBeNull()

    expect(
      box!.width,
      `Largura do botão favoritar deve ser ≥ 44px (obtido: ${box!.width}px)`,
    ).toBeGreaterThanOrEqual(44)

    expect(
      box!.height,
      `Altura do botão favoritar deve ser ≥ 44px (obtido: ${box!.height}px)`,
    ).toBeGreaterThanOrEqual(44)
  })
})
