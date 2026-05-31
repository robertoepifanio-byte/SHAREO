import { test, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Nota sobre as páginas de erro:
// A página 404 é renderizada pelo Next.js App Router via `not-found.tsx` ou
// `pages/404.tsx`. A página 500 depende de `error.tsx` (App Router) ou
// `pages/500.tsx`. Simulação de erro 500 via interceptação de rota é frágil
// em ambiente E2E — o teste correspondente está marcado como skip.
// A página /offline depende de service worker — também marcada como skip se
// não existir no projeto.
// ---------------------------------------------------------------------------

test.describe('Páginas de erro — 404, 500 e offline', () => {
  // -------------------------------------------------------------------------
  // 1. URL inexistente retorna página 404 com logo ShareO e CTA de retorno
  // -------------------------------------------------------------------------
  test('URL inexistente /pagina-que-nao-existe exibe página 404 com logo e CTA', async ({ page }) => {
    await page.goto('/pagina-que-nao-existe')

    // Aguarda o conteúdo principal carregar (Next.js pode demorar a renderizar a 404)
    await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 })

    // Logo ShareO deve estar presente (header ou dentro da página de erro)
    const main = page.locator('main')
    await expect(
      main
        .getByText(/ShareO/i)
        .or(main.getByRole('img', { name: /ShareO|logo/i }))
        .or(page.getByRole('img', { name: /ShareO/i }))
        .first(),
    ).toBeVisible()

    // CTA de retorno — botão ou link para home ou /itens
    await expect(
      page
        .getByRole('link', { name: /voltar|início|home|explorar|itens/i })
        .or(page.getByRole('button', { name: /voltar|início|home|explorar/i })),
    ).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 2. Página 404 não exibe stack trace ou mensagens de erro internas
  // -------------------------------------------------------------------------
  test('página 404 não expõe stack trace ou mensagens de erro internas', async ({ page }) => {
    await page.goto('/pagina-que-nao-existe')
    await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 })

    const bodyText = await page.locator('main').textContent() ?? ''

    // Stack traces típicos de Node.js/Next.js
    expect(
      bodyText,
      'Página 404 não deve conter "at Object." (stack trace)',
    ).not.toMatch(/at Object\.|at Function\.|at Module\.|at eval \(/)

    // Caminhos absolutos de sistema de arquivos
    expect(
      bodyText,
      'Página 404 não deve expor caminhos internos do servidor',
    ).not.toMatch(/\/home\/\w|\/var\/www|C:\\Users|\/app\/src/)

    // Chaves de variável de ambiente ou tokens
    expect(
      bodyText,
      'Página 404 não deve expor variáveis de ambiente (process.env)',
    ).not.toContain('process.env')

    // Mensagens de erro genéricas do Next.js em modo dev (não devem aparecer em staging/prod)
    expect(
      bodyText,
      'Página 404 não deve expor "Internal Server Error" como texto bruto',
    ).not.toMatch(/^Internal Server Error$/im)
  })

  // -------------------------------------------------------------------------
  // 3. Página 404 tem heading com texto "404" ou "não encontrada"
  // -------------------------------------------------------------------------
  test('página 404 tem heading com "404" ou "não encontrada"', async ({ page }) => {
    await page.goto('/pagina-que-nao-existe')
    await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 })

    // Localiza qualquer heading (h1–h3) com o texto esperado
    await expect(
      page
        .getByRole('heading', { name: /404/i })
        .or(page.getByRole('heading', { name: /não encontrad|page not found|página não encontrada/i }))
        .or(
          // Fallback: texto "404" visível em destaque (div, span, p) quando não for heading
          page.locator('h1, h2, h3').filter({ hasText: /404|não encontrad/i }),
        ),
    ).toBeVisible({ timeout: 8000 })
  })

  // -------------------------------------------------------------------------
  // 4. Página 404 tem link funcional para / ou /itens
  // -------------------------------------------------------------------------
  test('página 404 tem link funcional para / ou /itens', async ({ page }) => {
    await page.goto('/pagina-que-nao-existe')
    await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 })

    // Localiza o link de retorno
    const main = page.locator('main')
    const returnLink = main
      .getByRole('link', { name: /voltar|início|home|explorar|itens/i })
      .or(main.locator('a[href="/"]'))
      .or(main.locator('a[href="/itens"]'))

    await expect(returnLink.first()).toBeVisible()

    // Clica no link e confirma que a navegação ocorreu para uma rota válida
    await returnLink.first().click()

    await expect(page).toHaveURL(/^\/(itens|$)|^\/itens/, { timeout: 10000 })
    await expect(page.getByRole('main')).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 5. Página de erro 500 não expõe error.message
  // -------------------------------------------------------------------------
  // NOTE: Simular um erro 500 de forma confiável em E2E requer ou um endpoint
  // de teste dedicado (/api/test/throw-error) ou interceptação de resposta —
  // ambos dependem de infraestrutura de staging específica. Marcado como skip
  // até que um endpoint de teste seja criado.
  // TODO: criar rota /api/test/throw-error que lance um erro deliberado para
  // habilitar este teste com page.route() ou navegação direta.
  test.skip('página de erro 500 não expõe error.message ao usuário', async ({ page }) => {
    // TODO: criar endpoint /api/test/throw-error e página que o use
    // Alternativa com interceptação de resposta:
    await page.route('**/api/items', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      })
    })

    await page.goto('/itens')
    await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 })

    // A página de erro genérica não deve expor a mensagem interna do servidor
    const bodyText = await page.locator('body').textContent() ?? ''
    expect(
      bodyText,
      'Erro 500 não deve expor stack trace ao usuário',
    ).not.toMatch(/at Object\.|at Function\.|Error:/)

    // Deve exibir mensagem amigável
    await expect(
      page.getByText(/algo deu errado|tente novamente|erro interno|unexpected error/i),
    ).toBeVisible({ timeout: 8000 })
  })

  // -------------------------------------------------------------------------
  // 6. Links de retorno na página de erro têm tap target ≥ 44px
  // -------------------------------------------------------------------------
  test('links de retorno na página 404 têm tap target ≥ 44×44px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/pagina-que-nao-existe')
    await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 })

    // Coleta todos os links/botões de ação na página de erro
    const main = page.locator('main')
    const ctaElements = main
      .getByRole('link', { name: /voltar|início|home|explorar|itens/i })
      .or(main.getByRole('button', { name: /voltar|início|home|tentar novamente/i }))

    const count = await ctaElements.count()
    if (count === 0) {
      test.info().annotations.push({
        type: 'info',
        description: 'Nenhum link/botão de CTA encontrado na página 404 para verificar tap target',
      })
      return
    }

    // Verifica cada elemento encontrado
    for (let i = 0; i < count; i++) {
      const el = ctaElements.nth(i)
      const isVisible = await el.isVisible()
      if (!isVisible) continue

      const box = await el.boundingBox()
      if (!box) continue

      expect(
        box.width,
        `CTA[${i}] largura deve ser ≥ 44px (obtido: ${box.width}px)`,
      ).toBeGreaterThanOrEqual(44)

      expect(
        box.height,
        `CTA[${i}] altura deve ser ≥ 44px (obtido: ${box.height}px)`,
      ).toBeGreaterThanOrEqual(44)
    }
  })

  // -------------------------------------------------------------------------
  // 7. Página /offline — skip se service worker / offline.html não existir
  // -------------------------------------------------------------------------
  // NOTE: A presença de /offline depende de configuração de service worker no
  // projeto Next.js. Marcado como skip até que o service worker seja
  // implementado (roadmap H2/H3).
  // TODO: habilitar após configurar next-pwa ou service worker customizado
  // que sirva /offline como fallback de rede.
  test.skip('página /offline está acessível quando service worker está ativo', async ({ page }) => {
    // TODO: habilitar após implementar service worker com fallback /offline
    await page.goto('/offline')
    await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 })

    // Deve exibir mensagem de falta de conexão
    await expect(
      page.getByText(/sem conexão|offline|verifique sua internet|sem internet/i),
    ).toBeVisible()

    // Deve oferecer link para tentar novamente ou voltar
    await expect(
      page
        .getByRole('link', { name: /tentar novamente|voltar|home/i })
        .or(page.getByRole('button', { name: /tentar novamente|recarregar/i })),
    ).toBeVisible()
  })
})
