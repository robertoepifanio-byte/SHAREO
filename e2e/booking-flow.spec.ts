import { test, expect, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Nota: todos os testes que dependem de usuário autenticado (locatário ou
// proprietário) estão marcados como test.skip até que fixtures de sessão
// sejam criadas. O corpo do teste documenta o fluxo esperado completo.
// TODO: criar fixture de usuário (locatário e proprietário) via storageState
// ou injeção de cookie de sessão NextAuth para habilitar esses testes.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helper: navega para a lista de itens e retorna o primeiro ItemCard
// ---------------------------------------------------------------------------
async function getFirstItemCard(page: Page) {
  await page.goto('/itens')
  await expect(page.getByRole('main')).toBeVisible()
  // Aguarda pelo menos um card carregar
  const card = page.locator('[data-testid="item-card"], article, [role="listitem"]').first()
  await expect(card).toBeVisible({ timeout: 10000 })
  return card
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe('Fluxo de reserva — busca, reserva e avaliação pós-locação', () => {
  // -------------------------------------------------------------------------
  // 0. Smoke #4 — Detalhe do item: título, preço e CTA; não autenticado → /login
  // -------------------------------------------------------------------------
  test('detalhe do item — título, preço e CTA visíveis; não autenticado → redireciona para /login', async ({ page }) => {
    // Carrega o primeiro item real do staging via API (sem depender de ID hardcoded)
    const apiResp = await page.request.get('/api/items?limit=1')
    expect(apiResp.status()).toBe(200)
    const { data } = await apiResp.json()
    const item = data?.[0]

    if (!item) {
      test.info().annotations.push({ type: 'skip-reason', description: 'Nenhum item no DB de staging' })
      return
    }

    await page.goto(`/itens/${item.id}`)
    await expect(page.getByRole('main')).toBeVisible({ timeout: 15000 })

    // h1 com título do item (sr-only — presente no DOM para acessibilidade)
    await expect(page.getByRole('heading', { level: 1 })).toBeAttached()

    // Título visível na página (card lateral, p aria-hidden)
    await expect(page.getByText(item.title).first()).toBeVisible()

    // Preço com "/dia" visível
    await expect(page.getByText(/\/dia/).first()).toBeVisible()

    // CTA "Solicitar locação" visível — quando não autenticado é um <Link> (não <button>)
    const ctaLink = page
      .getByRole('link', { name: /solicitar locação/i })
      .or(page.getByRole('link', { name: /reservar agora/i }))
    await expect(ctaLink.first()).toBeVisible()

    // Clicar no CTA redireciona para /login (usuário não autenticado)
    await ctaLink.first().click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
    // URL contém callbackUrl apontando para o item (NextAuth flow)
    await expect(page).toHaveURL(/callbackUrl|next=/, { timeout: 5000 })
  })

  // -------------------------------------------------------------------------
  // 1. Busca e acessa detalhe do item
  // -------------------------------------------------------------------------
  test('busca por texto e acessa página de detalhe do item', async ({ page }) => {
    await page.goto('/itens')
    await expect(page.getByRole('main')).toBeVisible()

    // Campo de busca
    const searchInput = page.getByRole('searchbox').or(
      page.getByPlaceholder(/buscar|pesquisar|o que você precisa/i),
    )
    await expect(searchInput).toBeVisible()
    await searchInput.fill('câmera')
    await searchInput.press('Enter')

    // Lista carrega — pode ter resultados ou empty state
    await expect(
      page.locator('[data-testid="item-card"], article').first().or(
        page.getByText(/nenhum resultado|não encontrado|empty/i),
      ),
    ).toBeVisible({ timeout: 10000 })

    // Se houver resultados, clica no primeiro card
    const firstCard = page.locator('[data-testid="item-card"], article').first()
    const hasResults = await firstCard.isVisible()
    if (hasResults) {
      await firstCard.click()
      // Página de detalhe deve ter título (h1 sr-only), preço e CTA de locação
      await expect(page.getByRole('heading', { level: 1 })).toBeAttached()
      await expect(page.getByText(/\/dia/).first()).toBeVisible()
      // CTA: Link quando não autenticado, botão quando autenticado
      await expect(
        page.getByRole('link', { name: /solicitar locação|reservar agora/i })
          .or(page.getByRole('button', { name: /solicitar locação|alugar/i }))
          .first(),
      ).toBeVisible()
    }
  })

  // -------------------------------------------------------------------------
  // 2. Solicitar reserva
  // -------------------------------------------------------------------------
  // NOTE: requer locatário autenticado e item disponível no banco de staging.
  // TODO: criar fixture de usuário (locatário) e item de teste
  test.skip('locatário autenticado solicita reserva e recebe código de confirmação', async ({ page }) => {
    // TODO: criar fixture de usuário (locatário) e item de teste
    // 1. Ir para página de detalhe de um item com disponibilidade
    await page.goto('/itens/item-fixture-id')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // 2. Selecionar datas de início e fim
    const dataInicio = page.getByLabel(/data de início|retirada|check.in/i)
    const dataFim = page.getByLabel(/data de fim|devolução|check.out/i)
    if (await dataInicio.isVisible()) {
      await dataInicio.fill('2026-06-10')
      await dataFim.fill('2026-06-12')
    }

    // 3. Clicar em "Solicitar reserva"
    await page.getByRole('button', { name: /solicitar reserva|reservar/i }).click()

    // 4. Confirmar que aparece tela de confirmação com código SHR-
    await expect(
      page.getByText(/aguardando confirmação|solicitação enviada|reserva criada/i),
    ).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/#SHR-/)).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 3. Proprietário confirma reserva
  // -------------------------------------------------------------------------
  // NOTE: requer proprietário autenticado e reserva em PENDING no banco.
  // TODO: criar fixture de usuário (proprietário) e reserva em status PENDING
  test.skip('proprietário vê reserva PENDING e a confirma', async ({ page }) => {
    // TODO: criar fixture de usuário (proprietário) e reserva em status PENDING
    await page.goto('/reservas')
    await expect(page.getByRole('main')).toBeVisible()

    // Localiza card/linha com status PENDING
    const pendingReservation = page
      .locator('[data-testid="reservation-card"]')
      .filter({ hasText: /pendente|aguardando/i })
      .first()
    await expect(pendingReservation).toBeVisible({ timeout: 8000 })

    // Clica em "Confirmar"
    await pendingReservation.getByRole('button', { name: /confirmar/i }).click()

    // Status muda para CONFIRMED
    await expect(
      pendingReservation.getByText(/confirmad|ativo|aceita/i),
    ).toBeVisible({ timeout: 8000 })
  })

  // -------------------------------------------------------------------------
  // 4. Proprietário marca como ativo
  // -------------------------------------------------------------------------
  // NOTE: requer proprietário autenticado e reserva em CONFIRMED.
  // TODO: criar fixture de usuário (proprietário) e reserva em status CONFIRMED
  test.skip('proprietário marca reserva CONFIRMED como ACTIVE', async ({ page }) => {
    // TODO: criar fixture de usuário (proprietário) e reserva em status CONFIRMED
    await page.goto('/reservas')

    const confirmedReservation = page
      .locator('[data-testid="reservation-card"]')
      .filter({ hasText: /confirmad/i })
      .first()
    await expect(confirmedReservation).toBeVisible({ timeout: 8000 })

    await confirmedReservation
      .getByRole('button', { name: /marcar como ativo|item entregue|iniciar/i })
      .click()

    await expect(
      confirmedReservation.getByText(/ativo|em andamento|em uso/i),
    ).toBeVisible({ timeout: 8000 })
  })

  // -------------------------------------------------------------------------
  // 5. Locatário devolve item
  // -------------------------------------------------------------------------
  // NOTE: requer locatário autenticado e reserva em ACTIVE.
  // TODO: criar fixture de usuário (locatário) e reserva em status ACTIVE
  test.skip('locatário marca reserva ACTIVE como RETURNED', async ({ page }) => {
    // TODO: criar fixture de usuário (locatário) e reserva em status ACTIVE
    await page.goto('/minhas-reservas')

    const activeReservation = page
      .locator('[data-testid="reservation-card"]')
      .filter({ hasText: /ativo|em uso/i })
      .first()
    await expect(activeReservation).toBeVisible({ timeout: 8000 })

    await activeReservation
      .getByRole('button', { name: /marcar como devolvido|devolvi|devolução/i })
      .click()

    await expect(
      activeReservation.getByText(/devolvid|aguardando confirmação de devolução/i),
    ).toBeVisible({ timeout: 8000 })
  })

  // -------------------------------------------------------------------------
  // 6. Proprietário confirma devolução
  // -------------------------------------------------------------------------
  // NOTE: requer proprietário autenticado e reserva em RETURNED.
  // TODO: criar fixture de usuário (proprietário) e reserva em status RETURNED
  test.skip('proprietário confirma devolução e reserva vai para COMPLETED', async ({ page }) => {
    // TODO: criar fixture de usuário (proprietário) e reserva em status RETURNED
    await page.goto('/reservas')

    const returnedReservation = page
      .locator('[data-testid="reservation-card"]')
      .filter({ hasText: /devolvid/i })
      .first()
    await expect(returnedReservation).toBeVisible({ timeout: 8000 })

    await returnedReservation
      .getByRole('button', { name: /confirmar devolução|concluir|finalizar/i })
      .click()

    await expect(
      returnedReservation.getByText(/concluíd|complet|finaliz/i),
    ).toBeVisible({ timeout: 8000 })
  })

  // -------------------------------------------------------------------------
  // 7. Avaliação pós-locação
  // -------------------------------------------------------------------------
  // NOTE: requer reserva em COMPLETED e usuário autenticado (qualquer parte).
  // TODO: criar fixture de usuário e reserva em status COMPLETED
  test.skip('prompt de avaliação aparece após COMPLETED e submissão funciona', async ({ page }) => {
    // TODO: criar fixture de usuário e reserva em status COMPLETED
    await page.goto('/reservas')

    // Prompt de avaliação deve aparecer automaticamente ou via botão
    const avaliacaoPrompt = page
      .getByRole('dialog', { name: /avali/i })
      .or(page.locator('[data-testid="review-prompt"]'))
      .or(page.getByText(/avaliar locação|deixe sua avaliação/i))
    await expect(avaliacaoPrompt).toBeVisible({ timeout: 10000 })

    // Preencher rating — estrelas ou input numérico
    const stars = page.locator('[data-testid="star-rating"] [role="radio"], [aria-label*="estrela"]')
    if (await stars.count() > 0) {
      await stars.nth(4).click() // 5 estrelas (índice 4)
    } else {
      const ratingInput = page.getByRole('spinbutton', { name: /nota|rating/i })
      await ratingInput.fill('5')
    }

    // Preencher comentário
    const comentario = page.getByRole('textbox', { name: /comentário|observação|descreva/i })
    await comentario.fill('Ótimo proprietário, item em perfeito estado. Recomendo!')

    // Submeter avaliação
    await page.getByRole('button', { name: /enviar avaliação|publicar|confirmar/i }).click()

    // Confirmação de avaliação enviada
    await expect(
      page.getByText(/avaliação enviada|obrigado|publicada/i),
    ).toBeVisible({ timeout: 8000 })
  })
})
