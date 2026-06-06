/**
 * Smoke #10 — Proteção contra double-booking
 *
 * Testa dois cenários de concorrência:
 *
 * A) Duas reservas PENDING simultâneas para as mesmas datas
 *    — Ambas devem ser criáveis (PENDING não bloqueia PENDING)
 *    — Proprietário confirma a primeira → CONFIRMED
 *    — Proprietário tenta confirmar a segunda → deve FALHAR
 *      (se ambas forem confirmadas = BUG CRÍTICO de double-booking)
 *
 * B) Reserva em datas sobrepostas após CONFIRMED existente
 *    — POST /api/bookings com datas sobrepostas a um CONFIRMED existente
 *    — Deve retornar ITEM_UNAVAILABLE (422)
 *
 * Atores:
 *   - locatário fixture → primeiro locatário
 *   - admin fixture     → segundo locatário (admins podem locar itens de terceiros)
 *   - proprietário fixture → dono do item de teste
 *
 * Item de teste: test-item-id.json (deve ser AVAILABLE)
 */

import fs from 'fs'
import { test, expect } from '@playwright/test'
import { SESSION_PATHS } from './fixtures/test-credentials'
import { TEST_ITEM_PATH } from './fixtures/test-paths'

const hasAllSessions =
  fs.existsSync(SESSION_PATHS.locatario) &&
  fs.existsSync(SESSION_PATHS.proprietario) &&
  fs.existsSync(SESSION_PATHS.admin)

const hasTestItem = fs.existsSync(TEST_ITEM_PATH)

// ---------------------------------------------------------------------------
// Cenário A — dois PENDING confirmáveis pelo mesmo proprietário?
// ---------------------------------------------------------------------------

test.describe('smoke #10A — double-booking: dois PENDING, proprietário confirma os dois?', () => {
  test.skip(
    !hasAllSessions || !hasTestItem,
    'Requer session-locatario.json, session-admin.json, session-proprietario.json e test-item-id.json',
  )

  test('segundo confirm deve falhar — proprietário não pode confirmar duas reservas para as mesmas datas', async ({ browser }) => {
    const { itemId } = JSON.parse(fs.readFileSync(TEST_ITEM_PATH, 'utf-8')) as { itemId: string }

    const locCtx  = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const admCtx  = await browser.newContext({ storageState: SESSION_PATHS.admin })
    const propCtx = await browser.newContext({ storageState: SESSION_PATHS.proprietario })

    const loc  = await locCtx.newPage()
    const adm  = await admCtx.newPage()
    const prop = await propCtx.newPage()

    // Datas: 200–210 dias no futuro, separadas dos outros smokes (60–150 dias)
    const offsetDays = 200 + Math.floor(Math.random() * 10)
    const start = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
    const end   = new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000)
    const payload = { itemId, startDate: start.toISOString(), endDate: end.toISOString() }

    try {
      // — Ambos criam PENDING para as MESMAS datas (deve ser permitido) —
      const [res1, res2] = await Promise.all([
        loc.request.post('/api/bookings', { data: { ...payload, borrowerNote: 'Double-booking test — locatário' } }),
        adm.request.post('/api/bookings', { data: { ...payload, borrowerNote: 'Double-booking test — admin' } }),
      ])

      expect(res1.ok(), 'Locatário deve conseguir criar PENDING').toBeTruthy()
      expect(res2.ok(), 'Admin deve conseguir criar PENDING nas mesmas datas (PENDING não bloqueia PENDING)').toBeTruthy()

      const { data: b1 } = await res1.json() as { data: { id: string; status: string } }
      const { data: b2 } = await res2.json() as { data: { id: string; status: string } }
      expect(b1.status).toBe('PENDING')
      expect(b2.status).toBe('PENDING')
      console.log(`  PENDING 1 criado: ${b1.id}`)
      console.log(`  PENDING 2 criado: ${b2.id} (mesmas datas — ambos PENDING coexistem)`)

      // — Proprietário confirma o primeiro —
      const confirm1 = await prop.request.patch(`/api/bookings/${b1.id}`, { data: { action: 'confirm' } })
      expect(confirm1.ok(), 'Primeira confirmação deve funcionar').toBeTruthy()
      const { data: confirmed1 } = await confirm1.json() as { data: { status: string } }
      expect(confirmed1.status).toBe('CONFIRMED')
      console.log(`  booking ${b1.id} → CONFIRMED ✅`)

      // — Proprietário tenta confirmar o segundo — DEVE FALHAR —
      const confirm2 = await prop.request.patch(`/api/bookings/${b2.id}`, { data: { action: 'confirm' } })
      const confirm2Body = await confirm2.json().catch(() => ({}))

      if (confirm2.ok()) {
        // BUG: ambas as reservas foram confirmadas para as mesmas datas
        console.error(`  ⚠️  DOUBLE-BOOKING DETECTADO: booking ${b2.id} também foi CONFIRMED!`)
        console.error(`  Dois locatários têm reservas CONFIRMED para as mesmas datas no item ${itemId}`)
        // Cancela ambas para limpar o estado
        await prop.request.patch(`/api/bookings/${b1.id}`, { data: { action: 'cancel', reason: 'Cleanup double-booking test' } })
        await prop.request.patch(`/api/bookings/${b2.id}`, { data: { action: 'cancel', reason: 'Cleanup double-booking test' } })
      }

      expect(
        confirm2.ok(),
        `Double-booking: proprietário confirmou duas reservas para as mesmas datas. ` +
        `booking ${b2.id} retornou ${confirm2.status()} — ${JSON.stringify(confirm2Body)}`,
      ).toBeFalsy()

      console.log(`  segunda confirmação bloqueada (${confirm2.status()}) ✅ — proteção funcionando`)

      // Cleanup: cancela reserva 1 (já confirmada) e 2 (deve estar PENDING ainda)
      await prop.request.patch(`/api/bookings/${b1.id}`, { data: { action: 'cancel', reason: 'Cleanup smoke #10A' } })
      await loc.request.patch(`/api/bookings/${b2.id}`, { data: { action: 'cancel', reason: 'Cleanup smoke #10A' } })

    } finally {
      await locCtx.close()
      await admCtx.close()
      await propCtx.close()
    }
  })
})

// ---------------------------------------------------------------------------
// Cenário B — overlap de datas com CONFIRMED existente na criação
// ---------------------------------------------------------------------------

test.describe('smoke #10B — double-booking: POST com datas sobrepostas a CONFIRMED', () => {
  test.skip(
    !hasAllSessions || !hasTestItem,
    'Requer sessões fixture e test-item-id.json',
  )

  test('POST /api/bookings retorna ITEM_UNAVAILABLE para datas sobrepostas a reserva CONFIRMED', async ({ browser }) => {
    const { itemId } = JSON.parse(fs.readFileSync(TEST_ITEM_PATH, 'utf-8')) as { itemId: string }

    const locCtx  = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const admCtx  = await browser.newContext({ storageState: SESSION_PATHS.admin })
    const propCtx = await browser.newContext({ storageState: SESSION_PATHS.proprietario })

    const loc  = await locCtx.newPage()
    const adm  = await admCtx.newPage()
    const prop = await propCtx.newPage()

    // Datas: 220–230 dias no futuro
    const offsetDays = 220 + Math.floor(Math.random() * 10)
    const start = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
    const end   = new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000)

    try {
      // — Locatário cria e proprietário confirma (estado CONFIRMED) —
      const createRes = await loc.request.post('/api/bookings', {
        data: { itemId, startDate: start.toISOString(), endDate: end.toISOString(), borrowerNote: 'Smoke #10B base booking' },
      })
      expect(createRes.ok()).toBeTruthy()
      const { data: base } = await createRes.json() as { data: { id: string } }

      const confirmRes = await prop.request.patch(`/api/bookings/${base.id}`, { data: { action: 'confirm' } })
      expect(confirmRes.ok()).toBeTruthy()
      console.log(`  reserva base ${base.id} → CONFIRMED`)

      // — Admin tenta criar reserva com datas sobrepostas (start+1 dia dentro do período) —
      const overlapStart = new Date(start.getTime() + 1 * 24 * 60 * 60 * 1000)
      const overlapEnd   = new Date(overlapStart.getTime() + 2 * 24 * 60 * 60 * 1000)

      const overlapRes = await adm.request.post('/api/bookings', {
        data: { itemId, startDate: overlapStart.toISOString(), endDate: overlapEnd.toISOString(), borrowerNote: 'Overlap test' },
      })

      const overlapBody = await overlapRes.json().catch(() => ({}))
      console.log(`  tentativa com datas sobrepostas: ${overlapRes.status()} — ${JSON.stringify(overlapBody)}`)

      expect(
        overlapRes.status(),
        'POST com datas sobrepostas a CONFIRMED deve retornar 409 DATE_CONFLICT',
      ).toBe(409)
      expect((overlapBody as { error?: { code?: string } }).error?.code).toBe('DATE_CONFLICT')
      console.log(`  overlap bloqueado com DATE_CONFLICT ✅`)

      // Cleanup: cancela reserva base
      await prop.request.patch(`/api/bookings/${base.id}`, { data: { action: 'cancel', reason: 'Cleanup smoke #10B' } })

    } finally {
      await locCtx.close()
      await admCtx.close()
      await propCtx.close()
    }
  })
})
