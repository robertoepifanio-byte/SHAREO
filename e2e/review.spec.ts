/**
 * Smoke #6 — Avaliação pós-locação
 *
 * Cobertura:
 *  1. Proprietário avança booking CONFIRMED → ACTIVE  (mark_active)
 *  2. Locatário avança booking ACTIVE → RETURNED      (mark_returned)
 *  3. Locatário submete review do ITEM
 *  4. Locatário submete review do OWNER
 *  5. Proprietário submete review do BORROWER → booking auto-completa para COMPLETED
 *  6. /reservas mostra booking COMPLETED
 *
 * Pré-requisito: test-booking-id.json criado pelo smoke #5 (booking-flow)
 * Session fixtures: session-locatario.json + session-proprietario.json
 * Review endpoint: POST /api/bookings/:id/reviews
 */

import fs from 'fs'
import { test, expect } from '@playwright/test'
import { SESSION_PATHS } from './fixtures/test-credentials'
import { TEST_BOOKING_PATH } from './fixtures/test-paths'

const hasLocatarioSession    = fs.existsSync(SESSION_PATHS.locatario)
const hasProprietarioSession = fs.existsSync(SESSION_PATHS.proprietario)
const hasBooking             = fs.existsSync(TEST_BOOKING_PATH)

const canRun = hasLocatarioSession && hasProprietarioSession && hasBooking

function bookingId() {
  return (JSON.parse(fs.readFileSync(TEST_BOOKING_PATH, 'utf-8')) as { bookingId: string }).bookingId
}

// ---------------------------------------------------------------------------
// 1. Proprietário: CONFIRMED → ACTIVE
// ---------------------------------------------------------------------------

test.describe('smoke #6 — proprietário: CONFIRMED → ACTIVE', () => {
  test.skip(!canRun, 'Requer session fixtures e test-booking-id.json (rode smoke #5 primeiro)')

  test('proprietário marca booking como ACTIVE (mark_active)', async ({ browser }) => {
    const id = bookingId()
    // pickupToken visível apenas para o borrower — locatário busca e repassa ao proprietário
    const locCtx  = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const propCtx = await browser.newContext({ storageState: SESSION_PATHS.proprietario })
    try {
      const detailRes = await locCtx.request.get(`/api/bookings/${id}`)
      const { data: detail } = await detailRes.json() as { data: { pickupToken: string | null } }
      expect(detail.pickupToken, 'pickupToken deve existir após confirm (smoke #5)').toBeTruthy()

      const res = await propCtx.request.patch(`/api/bookings/${id}`, {
        data: { action: 'mark_active', pickupToken: detail.pickupToken },
      })
      if (!res.ok()) {
        const err = await res.json().catch(() => ({}))
        console.error(`  [mark_active] ${res.status()}:`, JSON.stringify(err))
      }
      expect(res.ok()).toBeTruthy()
      const { data } = await res.json() as { data: { status: string } }
      expect(data.status).toBe('ACTIVE')
      console.log('  booking → ACTIVE')
    } finally {
      await locCtx.close()
      await propCtx.close()
    }
  })
})

// ---------------------------------------------------------------------------
// 2. Locatário: ACTIVE → RETURNED
// ---------------------------------------------------------------------------

test.describe('smoke #6 — locatário: ACTIVE → RETURNED', () => {
  test.skip(!canRun, 'Requer session fixtures e test-booking-id.json (rode smoke #5 primeiro)')
  test.use({ storageState: SESSION_PATHS.locatario })

  test('locatário marca booking como RETURNED (mark_returned)', async ({ page }) => {
    const id  = bookingId()
    const res = await page.request.patch(`/api/bookings/${id}`, {
      data: { action: 'mark_returned' },
    })
    if (!res.ok()) {
      const err = await res.json().catch(() => ({}))
      console.error(`  [mark_returned] ${res.status()}:`, JSON.stringify(err))
    }
    expect(res.ok()).toBeTruthy()
    const { data } = await res.json() as { data: { status: string } }
    expect(data.status).toBe('RETURNED')
    console.log('  booking → RETURNED')
  })
})

// ---------------------------------------------------------------------------
// 3–4. Locatário avalia ITEM e OWNER (booking em RETURNED)
// ---------------------------------------------------------------------------

test.describe('smoke #6 — locatário envia avaliações (ITEM + OWNER)', () => {
  test.skip(!canRun, 'Requer session fixtures e test-booking-id.json (rode smoke #5 primeiro)')
  test.use({ storageState: SESSION_PATHS.locatario })

  test('locatário avalia o ITEM → 201', async ({ page }) => {
    const id  = bookingId()
    const res = await page.request.post(`/api/bookings/${id}/reviews`, {
      data: {
        reviewType:     'ITEM',
        rating:         5,
        comment:        'Item excelente, como descrito. Smoke test E2E.',
        sentiment:      5,
        itemAsDescribed: 5,
        conservation:   5,
      },
    })
    if (!res.ok()) {
      const err = await res.json().catch(() => ({}))
      console.error(`  [review ITEM] ${res.status()}:`, JSON.stringify(err))
    }
    expect(res.status()).toBe(201)
    const { data: review } = await res.json() as { data: { id: string; reviewType: string } }
    expect(review.id).toBeTruthy()
    expect(review.reviewType).toBe('ITEM')
    console.log(`  review ITEM criada: ${review.id}`)
  })

  test('locatário avalia o OWNER → 201', async ({ page }) => {
    const id  = bookingId()
    const res = await page.request.post(`/api/bookings/${id}/reviews`, {
      data: {
        reviewType:   'OWNER',
        rating:       5,
        comment:      'Ótimo proprietário, muito atencioso. Smoke test E2E.',
        sentiment:    5,
        punctuality:  5,
        communication: 5,
      },
    })
    if (!res.ok()) {
      const err = await res.json().catch(() => ({}))
      console.error(`  [review OWNER] ${res.status()}:`, JSON.stringify(err))
    }
    expect(res.status()).toBe(201)
    const { data: review } = await res.json() as { data: { id: string; reviewType: string } }
    expect(review.id).toBeTruthy()
    expect(review.reviewType).toBe('OWNER')
    console.log(`  review OWNER criada: ${review.id}`)
  })
})

// ---------------------------------------------------------------------------
// 5. Proprietário avalia BORROWER → booking auto-completa para COMPLETED
// ---------------------------------------------------------------------------

test.describe('smoke #6 — proprietário avalia BORROWER (→ auto-COMPLETED)', () => {
  test.skip(!canRun, 'Requer session fixtures e test-booking-id.json (rode smoke #5 primeiro)')
  test.use({ storageState: SESSION_PATHS.proprietario })

  test('proprietário avalia o BORROWER → 201 (ou 409 idempotente)', async ({ page }) => {
    const id  = bookingId()
    const res = await page.request.post(`/api/bookings/${id}/reviews`, {
      data: {
        reviewType:   'BORROWER',
        rating:       5,
        comment:      'Ótimo locatário, cuidou bem do item. Smoke test E2E.',
        sentiment:    5,
        punctuality:  5,
        communication: 5,
        conservation: 5,
      },
    })
    // 201 = criada agora; 409 = já existe (idempotente — review já foi submetida)
    expect([201, 409]).toContain(res.status())
    if (res.status() === 201) {
      const { data: review } = await res.json() as { data: { id: string } }
      expect(review.id).toBeTruthy()
      console.log(`  review BORROWER criada: ${review.id}`)
    } else {
      console.log('  review BORROWER já existia (idempotente)')
    }
  })

  test('booking auto-completa para COMPLETED após 3 reviews', async ({ page }) => {
    const id = bookingId()
    // Polling com até 5 tentativas — auto-complete é fire-and-forget no servidor
    let status = ''
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(1000)
      const r = await page.request.get(`/api/bookings/${id}`)
      const { data } = await r.json() as { data: { status: string } }
      status = data.status
      if (status === 'COMPLETED') break
    }
    expect(status).toBe('COMPLETED')
    console.log('  booking → COMPLETED (auto)')
  })
})

// ---------------------------------------------------------------------------
// 6. UI: /reservas mostra booking COMPLETED
// ---------------------------------------------------------------------------

test.describe('smoke #6 — UI mostra booking COMPLETED', () => {
  test.skip(!canRun, 'Requer session fixtures e test-booking-id.json (rode smoke #5 primeiro)')
  test.use({ storageState: SESSION_PATHS.locatario })

  test('/reservas exibe status Concluída para o locatário', async ({ page }) => {
    await page.goto('/reservas?tab=borrower')
    await expect(page).toHaveURL(/\/reservas/, { timeout: 15000 })
    await expect(
      page.getByText(/concluí|complet/i).first()
    ).toBeVisible({ timeout: 10000 })
  })
})
