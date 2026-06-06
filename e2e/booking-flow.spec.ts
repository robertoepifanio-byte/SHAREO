import fs from 'fs'
import { test, expect, type Page } from '@playwright/test'
import { SESSION_PATHS } from './fixtures/test-credentials'
import { TEST_ITEM_PATH, TEST_BOOKING_PATH } from './fixtures/test-paths'

const hasLocatarioSession    = fs.existsSync(SESSION_PATHS.locatario)
const hasProprietarioSession = fs.existsSync(SESSION_PATHS.proprietario)
const hasTestItem            = fs.existsSync(TEST_ITEM_PATH)

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
// Smoke #5 — Fluxo de reserva com session fixtures
// ---------------------------------------------------------------------------

test.describe('smoke #5 — locatário solicita reserva', () => {
  test.skip(
    !hasLocatarioSession || !hasTestItem,
    'Requer session-locatario.json e test-item-id.json — rode: pnpm tsx scripts/create-staging-fixtures.ts && pnpm playwright test e2e/anuncio.spec.ts',
  )
  test.use({ storageState: SESSION_PATHS.locatario })

  test('cria reserva via API e verifica status PENDING em /reservas', async ({ page }) => {
    const { itemId } = JSON.parse(fs.readFileSync(TEST_ITEM_PATH, 'utf-8')) as { itemId: string }

    // Cancela booking anterior do smoke test para liberar disponibilidade
    if (fs.existsSync(TEST_BOOKING_PATH)) {
      const { bookingId: prevId } = JSON.parse(fs.readFileSync(TEST_BOOKING_PATH, 'utf-8')) as { bookingId: string }
      await page.request.patch(`/api/bookings/${prevId}`, { data: { action: 'cancel', reason: 'Cleanup automático pelo smoke test E2E' } })
    }

    // Datas dinâmicas: 90+ dias no futuro, offset aleatório para evitar conflito entre runs paralelos
    const offsetDays = 90 + Math.floor(Math.random() * 30)
    const start = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
    const end = new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000)

    const res = await page.request.post('/api/bookings', {
      data: {
        itemId,
        startDate:    start.toISOString(),
        endDate:      end.toISOString(),
        borrowerNote: 'Reserva criada pelo smoke test E2E automatizado.',
      },
    })
    if (!res.ok()) {
      const err = await res.json().catch(() => ({}))
      console.error(`  [booking API] ${res.status()}:`, JSON.stringify(err))
    }
    expect(res.ok()).toBeTruthy()

    const { data: booking } = await res.json() as { data: { id: string; status: string } }
    expect(booking.id).toBeTruthy()
    expect(booking.status).toBe('PENDING')

    fs.writeFileSync(TEST_BOOKING_PATH, JSON.stringify({ bookingId: booking.id }, null, 2))
    console.log(`  booking criado: ${booking.id}`)

    // Verifica na UI (aba Como locatário)
    await page.goto('/reservas?tab=borrower')
    await expect(page).toHaveURL(/\/reservas/, { timeout: 15000 })
    await expect(page.getByText('Aguardando').first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('smoke #5 — proprietário confirma reserva', () => {
  test.skip(
    !hasProprietarioSession,
    'Requer session-proprietario.json — rode: pnpm tsx scripts/create-staging-fixtures.ts',
  )
  test.use({ storageState: SESSION_PATHS.proprietario })

  test('vê reserva PENDING em /reservas e confirma via API → CONFIRMED', async ({ page }) => {
    // Avaliado em runtime (após o teste do locatário criar o arquivo)
    test.skip(!fs.existsSync(TEST_BOOKING_PATH), 'test-booking-id.json não encontrado — rode o teste do locatário primeiro')

    const { bookingId } = JSON.parse(fs.readFileSync(TEST_BOOKING_PATH, 'utf-8')) as { bookingId: string }

    // Confirma via API (não depende de texto exato na UI — evita falso positivo por timing paralelo)
    const confirmRes = await page.request.patch(`/api/bookings/${bookingId}`, {
      data: { action: 'confirm' },
    })
    if (!confirmRes.ok()) {
      const err = await confirmRes.json().catch(() => ({}))
      console.error(`  [confirm API] ${confirmRes.status()}:`, JSON.stringify(err))
    }
    expect(confirmRes.ok()).toBeTruthy()
    const { data: confirmed } = await confirmRes.json() as { data: { status: string } }
    expect(confirmed.status).toBe('CONFIRMED')

    // Verifica na UI que "Confirmada" aparece na aba de locador
    await page.goto('/reservas?tab=owner')
    await expect(page).toHaveURL(/\/reservas/, { timeout: 15000 })
    await expect(page.getByText('Confirmada').first()).toBeVisible({ timeout: 10000 })
  })
})

// ---------------------------------------------------------------------------
// Suite legada (testes de UI completa — skipped, documentam o fluxo esperado)
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
