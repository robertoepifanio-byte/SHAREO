/**
 * Smoke #36 — Fluxo de devolução: "Devolução em Andamento" (confirmação bilateral)
 *
 * Cobre o ciclo introduzido no PR #79:
 *   ACTIVE ──(locatário "Devolver" = mark_returned)──▶ "Devolução em andamento" (RETURNED)
 *   "Devolução em andamento" ──(locador confirma = confirm_return)──▶ "Concluído" (COMPLETED)
 *
 * Asserts (via test.step):
 *   1. Setup: cria item + reserva, confirma (gera pickupToken), mark_active → ACTIVE
 *   2. Guard ACTIVE: locador NÃO pode mark_returned (403 FORBIDDEN)
 *   3. Guard ACTIVE: confirm_return antes de devolver → 422 INVALID_TRANSITION
 *   4. Locatário mark_returned → 200, status RETURNED ("Devolução em andamento")
 *   5. UI: página de detalhe do locatário mostra "Devolução em andamento"
 *   6. Guard RETURNED: locatário NÃO pode confirm_return (403 FORBIDDEN — só o locador)
 *   7. Locador confirm_return → 200, status COMPLETED ("Concluído")
 *
 * IMPORTANTE: o teste NÃO submete avaliações antes do confirm_return. A rota de reviews
 * tem um caminho de auto-conclusão (RETURNED → COMPLETED após 3 reviews); submeter reviews
 * aqui mascararia o teste do confirm_return como caminho de conclusão.
 *
 * Atores (fixtures): locatário (cria/devolve) + proprietário (dono do item / confirma).
 * API-only, exceto a checagem leve de UI do passo 5. Janela de datas 500–560 dias no
 * futuro para não colidir com os demais smokes (que usam até ~480 dias).
 */

import fs from 'fs'
import { test, expect } from '@playwright/test'
import { SESSION_PATHS } from './fixtures/test-credentials'
import { apiWithRetry, enviarFotoDevolucao, markBookingPaidForTest, createTestItem, futureWindow, rndOffset } from './_support'

// ---------------------------------------------------------------------------
// Pré-condições de skip
// ---------------------------------------------------------------------------

const hasSessions =
  fs.existsSync(SESSION_PATHS.locatario) &&
  fs.existsSync(SESSION_PATHS.proprietario)

// ---------------------------------------------------------------------------
// Smoke #36
// ---------------------------------------------------------------------------

test.describe('smoke #36 — fluxo de devolução: Devolução em Andamento → Concluído', () => {
  test.skip(!hasSessions, 'Requer session-locatario.json e session-proprietario.json')

  test('ciclo ACTIVE → Devolução em andamento → Concluído (+ guards de papel/transição)', async ({ browser }) => {
    test.setTimeout(150_000)

    const propCtx = await browser.newContext({ storageState: SESSION_PATHS.proprietario })
    const locCtx  = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const prop    = await propCtx.newPage()
    const loc     = await locCtx.newPage()

    let itemId:    string | null = null
    let bookingId: string | null = null
    let completed = false

    try {
      // ── Setup: item + reserva + confirm + mark_active → ACTIVE ──────────────
      await test.step('setup: item, reserva, confirm e mark_active → ACTIVE', async () => {
        itemId = await createTestItem(prop, `Devolução E2E ${Date.now()}`, 'Item de teste E2E — fluxo de devolução (pode ser removido)')
        test.skip(!itemId, 'Não foi possível criar o item de teste (setup falhou)')

        const { start, end } = futureWindow(rndOffset(500, 560), 2)

        const createRes = await apiWithRetry(() =>
          loc.request.post('/api/bookings', {
            data: { itemId: itemId!, startDate: start, endDate: end, borrowerNote: 'Smoke #36 — fluxo de devolução.' },
          })
        )
        const createBody = await createRes.json().catch(() => ({}))
        expect(createRes.status(), `criação da reserva falhou: ${JSON.stringify(createBody)}`).toBe(201)
        bookingId = (createBody as { data: { id: string } }).data.id

        const confirmRes = await apiWithRetry(() =>
          prop.request.patch(`/api/bookings/${bookingId!}`, { data: { action: 'confirm' } })
        )
        expect(confirmRes.ok(), `confirm falhou (${confirmRes.status()})`).toBeTruthy()
        expect((await confirmRes.json()).data.status).toBe('CONFIRMED')

        // pickupToken é gerado no confirm e exposto aos participantes no GET
        const detailRes = await apiWithRetry(() => prop.request.get(`/api/bookings/${bookingId!}`))
        const pickupToken = (await detailRes.json() as { data: { pickupToken: string | null } }).data.pickupToken
        expect(pickupToken, 'pickupToken deve existir após o confirm').toBeTruthy()

        await markBookingPaidForTest(prop.request, bookingId!)
        const activeRes = await apiWithRetry(() =>
          prop.request.patch(`/api/bookings/${bookingId!}`, { data: { action: 'mark_active', pickupToken } })
        )
        expect(activeRes.ok(), `mark_active falhou (${activeRes.status()})`).toBeTruthy()
        expect((await activeRes.json()).data.status).toBe('ACTIVE')
        console.log(`  booking ${bookingId} → ACTIVE`)
      })

      // ── Guard: locador não pode iniciar a devolução (mark_returned é do locatário) ──
      await test.step('guard ACTIVE: locador mark_returned → 403 FORBIDDEN', async () => {
        const res  = await prop.request.patch(`/api/bookings/${bookingId!}`, { data: { action: 'mark_returned' } })
        const body = await res.json().catch(() => ({}))
        expect(res.status(), `esperado 403, recebido ${res.status()}: ${JSON.stringify(body)}`).toBe(403)
        expect((body as { error?: { code?: string } }).error?.code).toBe('FORBIDDEN')
      })

      // ── Guard: não dá para confirmar o recebimento antes da devolução ──
      await test.step('guard ACTIVE: confirm_return antes de devolver → 422 INVALID_TRANSITION', async () => {
        const res  = await prop.request.patch(`/api/bookings/${bookingId!}`, { data: { action: 'confirm_return' } })
        const body = await res.json().catch(() => ({}))
        expect([400, 422], `esperado 422, recebido ${res.status()}`).toContain(res.status())
        expect((body as { error?: { code?: string } }).error?.code).toBe('INVALID_TRANSITION')
      })

      // ── Guard: devolução sem foto é recusada (decisão do fundador, 23/08) ──
      await test.step('guard: mark_returned sem foto → 422 RETURN_PHOTO_REQUIRED', async () => {
        const res  = await loc.request.patch(`/api/bookings/${bookingId!}`, { data: { action: 'mark_returned' } })
        const body = await res.json().catch(() => ({}))
        expect(res.status(), `esperava 422, veio ${res.status()}: ${JSON.stringify(body)}`).toBe(422)
        expect((body as { error?: { code?: string } }).error?.code).toBe('RETURN_PHOTO_REQUIRED')
      })

      // ── Locatário inicia a devolução → "Devolução em andamento" (RETURNED) ──
      await test.step('locatário mark_returned → 200, status RETURNED (Devolução em andamento)', async () => {
        const foto = await enviarFotoDevolucao(loc.request, bookingId!)
        expect(foto.ok(), `upload da foto de devolução falhou: ${foto.status()}`).toBeTruthy()

        const res  = await apiWithRetry(() =>
          loc.request.patch(`/api/bookings/${bookingId!}`, { data: { action: 'mark_returned' } })
        )
        const body = await res.json().catch(() => ({}))
        expect(res.status(), `mark_returned falhou: ${JSON.stringify(body)}`).toBe(200)
        expect((body as { data: { status: string } }).data.status).toBe('RETURNED')

        // confirma pela leitura do locador (participante) que o estado persistiu
        const getRes = await apiWithRetry(() => prop.request.get(`/api/bookings/${bookingId!}`))
        expect((await getRes.json() as { data: { status: string } }).data.status).toBe('RETURNED')
        console.log(`  booking ${bookingId} → RETURNED (Devolução em andamento)`)
      })

      // ── UI: a página de detalhe do locatário mostra "Devolução em andamento" ──
      await test.step('UI: detalhe do locatário exibe "Devolução em andamento"', async () => {
        await loc.goto(`/reservas/${bookingId!}`)
        await expect(
          loc.getByText(/devolução em andamento/i).first(),
          'a página de detalhe deve exibir o rótulo "Devolução em andamento"',
        ).toBeVisible({ timeout: 15_000 })
      })

      // ── Guard: locatário não pode confirmar o recebimento (é ação do locador) ──
      await test.step('guard RETURNED: locatário confirm_return → 403 FORBIDDEN', async () => {
        const res  = await loc.request.patch(`/api/bookings/${bookingId!}`, { data: { action: 'confirm_return' } })
        const body = await res.json().catch(() => ({}))
        expect(res.status(), `esperado 403, recebido ${res.status()}: ${JSON.stringify(body)}`).toBe(403)
        expect((body as { error?: { code?: string } }).error?.code).toBe('FORBIDDEN')
      })

      // ── Locador confirma o recebimento → "Concluído" (COMPLETED) ──
      await test.step('locador confirm_return → 200, status COMPLETED (Concluído)', async () => {
        const res  = await apiWithRetry(() =>
          prop.request.patch(`/api/bookings/${bookingId!}`, { data: { action: 'confirm_return' } })
        )
        const body = await res.json().catch(() => ({}))
        expect(res.status(), `confirm_return falhou: ${JSON.stringify(body)}`).toBe(200)
        expect((body as { data: { status: string } }).data.status).toBe('COMPLETED')
        completed = true
        console.log(`  booking ${bookingId} → COMPLETED (Concluído)`)
      })

    } finally {
      // Cleanup: se a reserva não chegou a COMPLETED e ainda é cancelável, cancela.
      if (bookingId && !completed) {
        await prop.request.patch(`/api/bookings/${bookingId}`, {
          data: { action: 'cancel', reason: 'Cleanup smoke #36 fluxo de devolução' },
        }).catch(() => {})
      }
      if (itemId) await prop.request.delete(`/api/items/${itemId}`).catch(() => {})
      console.log('  cleanup smoke #36 concluído')
      await propCtx.close()
      await locCtx.close()
    }
  })
})

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * NOTA DE EXECUÇÃO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Local:
 *   BASE_URL=http://localhost:3000 E2E_SECRET=<valor> \
 *   pnpm playwright test e2e/return-flow.spec.ts --project=chromium
 *
 * Staging:
 *   BASE_URL=https://staging.shareo.com.br E2E_SECRET=<valor> \
 *   pnpm playwright test e2e/return-flow.spec.ts --project=chromium
 *
 * Premissas (mesmas do multi-item-booking.spec.ts):
 *   - session-locatario.json e session-proprietario.json existem em e2e/fixtures/
 *     (gerados por scripts/create-staging-fixtures.ts).
 *   - locatário com e-mail verificado + cadastro completo (profileCompletedAt != null).
 *   - POST /api/items + upload de foto promovem o item a AVAILABLE.
 *
 * Não coberto aqui (proposital):
 *   - Entrega real dos e-mails (sendReturnInProgressEmail / sendReturnCompletedEmail):
 *     a suíte não acessa caixa de entrada. Os e-mails são validados manualmente no staging.
 *   - Caminho alternativo de conclusão por 3 avaliações (coberto pelo smoke #6 review.spec.ts).
 * ─────────────────────────────────────────────────────────────────────────────
 */
