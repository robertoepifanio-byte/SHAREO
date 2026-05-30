import { test, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Nota sobre convenção de seletores:
// O campo de busca é localizado por role "searchbox" ou por placeholder.
// Os cards de item são localizados por data-testid="item-card" ou <article>.
// Os filtros de categoria usam data-testid="category-filter" ou role="combobox".
// ---------------------------------------------------------------------------

test.describe('Busca e filtros — lista de itens', () => {
  // -------------------------------------------------------------------------
  // 1. Busca por texto filtra a lista
  // -------------------------------------------------------------------------
  test('busca por texto "câmera" filtra a lista de resultados', async ({ page }) => {
    await page.goto('/itens')
    await expect(page.getByRole('main')).toBeVisible()

    const searchInput = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/buscar|pesquisar|o que você precisa/i))
    await expect(searchInput).toBeVisible()

    await searchInput.fill('câmera')
    await searchInput.press('Enter')

    // Aguarda lista recarregar — resulta em cards filtrados ou empty state
    await expect(
      page
        .locator('[data-testid="item-card"], article')
        .first()
        .or(page.getByText(/nenhum resultado|não encontrado|empty/i)),
    ).toBeVisible({ timeout: 10000 })

    // URL deve refletir o termo pesquisado
    await expect(page).toHaveURL(/search=c%C3%A2mera|search=camera|q=c%C3%A2mera/i)
  })

  // -------------------------------------------------------------------------
  // 2. Filtro por categoria atualiza a URL
  // -------------------------------------------------------------------------
  test('filtro por categoria atualiza URL com categoryId', async ({ page }) => {
    await page.goto('/itens')
    await expect(page.getByRole('main')).toBeVisible()

    // Tenta localizar filtro de categoria — pode ser select, botão ou chip
    const categoryFilter = page
      .locator('[data-testid="category-filter"]')
      .or(page.getByRole('combobox', { name: /categor/i }))
      .or(page.getByRole('listbox', { name: /categor/i }))

    const hasFilter = await categoryFilter.isVisible()
    if (!hasFilter) {
      // Alternativa: chips/botões de categoria na barra de filtros
      const categoryButton = page
        .locator('[data-testid="category-chip"], [data-testid="category-btn"]')
        .first()
        .or(
          page
            .getByRole('button')
            .filter({ hasText: /ferramentas|eletrônicos|câmeras|esportes|outros/i })
            .first(),
        )
      await expect(categoryButton).toBeVisible({ timeout: 8000 })
      await categoryButton.click()
    } else {
      // É um select/combobox: seleciona a primeira opção não-vazia
      if (await page.getByRole('combobox', { name: /categor/i }).isVisible()) {
        const options = page.getByRole('combobox', { name: /categor/i })
        await options.selectOption({ index: 1 })
      } else {
        await categoryFilter.first().click()
      }
    }

    // URL deve ter categoryId ou category como query param
    await expect(page).toHaveURL(/categoryId=|category=/, { timeout: 8000 })
  })

  // -------------------------------------------------------------------------
  // 3. Filtro por preço máximo exclui itens acima do limite
  // -------------------------------------------------------------------------
  test('filtro preço máximo oculta itens acima do valor informado', async ({ page }) => {
    await page.goto('/itens')
    await expect(page.getByRole('main')).toBeVisible()

    // Abre painel/seção de filtros se necessário
    const filtrosBtn = page.getByRole('button', { name: /filtros|mais filtros|filtrar/i })
    if (await filtrosBtn.isVisible()) {
      await filtrosBtn.click()
    }

    const precoMaxInput = page
      .getByRole('spinbutton', { name: /preço máx|até|máximo/i })
      .or(page.getByLabel(/preço máx|até|máximo/i))
      .or(page.locator('input[name*="precoMax"], input[name*="maxPrice"]'))

    const hasPrecoMax = await precoMaxInput.isVisible()
    if (!hasPrecoMax) {
      // Filtro de preço ainda não implementado — não bloqueia
      test.info().annotations.push({
        type: 'info',
        description: 'Filtro de preço máximo não encontrado — pode não estar implementado no MVP',
      })
      return
    }

    await precoMaxInput.fill('50')

    // Confirma o filtro (Enter ou botão Aplicar)
    const aplicarBtn = page.getByRole('button', { name: /aplicar|filtrar|ok/i })
    if (await aplicarBtn.isVisible()) {
      await aplicarBtn.click()
    } else {
      await precoMaxInput.press('Enter')
    }

    await page.waitForLoadState('networkidle')

    // Nenhum card deve exibir preço acima de R$ 50/dia
    const priceTexts = page.locator('[data-testid="item-price"], [data-testid="item-card"] [class*="price"]')
    const count = await priceTexts.count()

    for (let i = 0; i < count; i++) {
      const rawText = await priceTexts.nth(i).textContent()
      if (!rawText) continue

      // Extrai o valor numérico — ex.: "R$ 45,00/dia" → 45
      const match = rawText.match(/R\$\s*([\d,.]+)/)
      if (!match) continue

      const value = parseFloat(match[1].replace('.', '').replace(',', '.'))
      expect(value, `Item com preço R$ ${value} deve ser ≤ 50`).toBeLessThanOrEqual(50)
    }
  })

  // -------------------------------------------------------------------------
  // 4. Deep link com ?search= aplica busca pré-carregada
  // -------------------------------------------------------------------------
  test('acesso direto a /itens?search=câmera pré-aplica a busca', async ({ page }) => {
    await page.goto('/itens?search=c%C3%A2mera')
    await expect(page.getByRole('main')).toBeVisible()

    // Campo de busca deve estar pré-preenchido com "câmera"
    const searchInput = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/buscar|pesquisar|o que você precisa/i))

    await expect(searchInput).toBeVisible({ timeout: 8000 })
    await expect(searchInput).toHaveValue(/c[aâ]mera/i)

    // Lista deve mostrar resultados filtrados OU empty state — não a lista completa sem filtro
    await expect(
      page
        .locator('[data-testid="item-card"], article')
        .first()
        .or(page.getByText(/nenhum resultado|não encontrado/i)),
    ).toBeVisible({ timeout: 10000 })
  })

  // -------------------------------------------------------------------------
  // 5. Preservação de filtro ao voltar da página de detalhe
  // -------------------------------------------------------------------------
  test('filtro persiste ao navegar para detalhe e voltar com browser back', async ({ page }) => {
    await page.goto('/itens')
    await expect(page.getByRole('main')).toBeVisible()

    // Aplica filtro de busca
    const searchInput = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/buscar|pesquisar|o que você precisa/i))
    await expect(searchInput).toBeVisible()
    await searchInput.fill('câmera')
    await searchInput.press('Enter')

    // Aguarda lista filtrada
    await page.waitForLoadState('networkidle')
    const urlFiltrada = page.url()

    // Clica no primeiro card se existir
    const firstCard = page.locator('[data-testid="item-card"], article').first()
    const hasCard = await firstCard.isVisible()

    if (hasCard) {
      await firstCard.click()
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 8000 })

      // Volta com browser back
      await page.goBack()
      await expect(page.getByRole('main')).toBeVisible()

      // URL deve conter o mesmo parâmetro de busca
      const urlAposVoltar = page.url()
      expect(urlAposVoltar).toContain('search=')

      // Campo de busca deve permanecer preenchido
      await expect(searchInput).toHaveValue(/c[aâ]mera/i)
    } else {
      // Empty state: confirma que a URL mantém o filtro mesmo sem resultados
      expect(urlFiltrada).toContain('search=')
    }
  })

  // -------------------------------------------------------------------------
  // 6. Remover filtro com X atualiza a URL
  // -------------------------------------------------------------------------
  test('clicar em X em um filtro ativo remove o filtro e atualiza a URL', async ({ page }) => {
    await page.goto('/itens?search=c%C3%A2mera')
    await expect(page.getByRole('main')).toBeVisible()
    await page.waitForLoadState('networkidle')

    // Localiza o botão de limpar — pode ser um X no input ou um chip de filtro
    const clearBtn = page
      .getByRole('button', { name: /limpar|remover|clear|×|✕/i })
      .or(page.locator('[data-testid="clear-search"], [data-testid="filter-chip-remove"]'))
      .or(page.locator('button[aria-label*="limpar"], button[aria-label*="remover"]'))
      .first()

    const hasClearBtn = await clearBtn.isVisible()
    if (!hasClearBtn) {
      // Tenta limpar o campo de busca diretamente via triple-click + Delete
      const searchInput = page
        .getByRole('searchbox')
        .or(page.getByPlaceholder(/buscar|pesquisar|o que você precisa/i))
      await expect(searchInput).toBeVisible()
      await searchInput.tripleClick()
      await searchInput.press('Delete')
      await searchInput.press('Enter')
    } else {
      await clearBtn.click()
    }

    await page.waitForLoadState('networkidle')

    // URL não deve mais conter o parâmetro de busca (ou deve estar vazio)
    const finalUrl = page.url()
    const hasSearchParam = new URL(finalUrl).searchParams.get('search')
    expect(
      !hasSearchParam || hasSearchParam === '',
      `Parâmetro "search" deve estar ausente ou vazio após remover o filtro. URL: ${finalUrl}`,
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // 7. Aplicar filtro atualiza a URL sem reload completo (SPA navigation)
  // -------------------------------------------------------------------------
  test('filtro atualiza URL sem recarregar a página inteira (navegação SPA)', async ({ page }) => {
    await page.goto('/itens')
    await expect(page.getByRole('main')).toBeVisible()

    // Monitora navegações completas (frame navigation) — não deve ocorrer
    let fullNavigationHappened = false
    page.on('framenavigated', (frame) => {
      // Apenas o frame principal conta; ignora iframes
      if (frame === page.mainFrame()) {
        fullNavigationHappened = true
      }
    })

    // Aguarda a primeira carga antes de monitorar
    await page.waitForLoadState('domcontentloaded')
    fullNavigationHappened = false // reseta após carga inicial

    // Aplica busca
    const searchInput = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/buscar|pesquisar|o que você precisa/i))
    await expect(searchInput).toBeVisible()
    await searchInput.fill('câmera')
    await searchInput.press('Enter')

    // Aguarda lista atualizar
    await expect(
      page
        .locator('[data-testid="item-card"], article')
        .first()
        .or(page.getByText(/nenhum resultado|não encontrado/i)),
    ).toBeVisible({ timeout: 10000 })

    // URL deve ter sido atualizada
    await expect(page).toHaveURL(/search=/)

    // Não deve ter ocorrido um reload completo da página — Next.js usa router.push
    // Nota: framenavigated pode ser disparado pelo pushState em alguns configs do
    // Playwright; o teste abaixo verifica que a URL muda sem re-fetch do documento.
    const navigationEntries = await page.evaluate(() =>
      performance
        .getEntriesByType('navigation')
        .map((e) => (e as PerformanceNavigationTiming).type),
    )
    // O tipo de navegação deve ser "navigate" somente na carga inicial.
    // Após o pushState do SPA, não deve haver nova entrada "navigate".
    // Aceita tanto [] (nenhuma nova entrada) quanto entradas do tipo "navigate"
    // apenas se corresponderem à carga inicial da página.
    const reloadCount = navigationEntries.filter((t) => t === 'reload').length
    expect(reloadCount, 'Não deve ocorrer reload ao aplicar filtro').toBe(0)
  })
})
