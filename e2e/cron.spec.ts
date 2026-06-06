/**
 * Smoke #11 — Cron endpoint /api/cron/reminders
 *
 * Verifica:
 *  A) Chamada sem Authorization → 401 (proteção funciona)
 *  B) Chamada com secret errado → 401
 *  C) Chamada com CRON_SECRET correto → 200 { ok: true, sent: N }
 *     O cron roda sem travar mesmo que não haja reservas para notificar.
 *
 * Não valida envio de email (Resend é fire-and-forget no handler).
 * Não valida criação de late fee Stripe (sem reservas ACTIVE vencidas no staging).
 */

import { test, expect } from '@playwright/test'

const CRON_SECRET  = 'shareo-cron-2026'
const CRON_ENDPOINT = '/api/cron/reminders'

test.describe('smoke #11 — cron /api/cron/reminders', () => {

  test('sem Authorization → 401', async ({ request }) => {
    const res = await request.get(CRON_ENDPOINT)
    expect(res.status()).toBe(401)
  })

  test('Authorization com secret errado → 401', async ({ request }) => {
    const res = await request.get(CRON_ENDPOINT, {
      headers: { Authorization: 'Bearer wrong-secret-xyz' },
    })
    expect(res.status()).toBe(401)
  })

  test('Authorization com CRON_SECRET correto → 200 e body { ok: true }', async ({ request }) => {
    const res = await request.get(CRON_ENDPOINT, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    })

    if (!res.ok()) {
      const body = await res.text()
      console.error(`  [cron] ${res.status()}: ${body.slice(0, 500)}`)
    }

    expect(res.status()).toBe(200)

    const body = await res.json() as { ok: boolean; sent: number; ids: string[] }
    expect(body.ok).toBe(true)
    expect(typeof body.sent).toBe('number')
    expect(Array.isArray(body.ids)).toBe(true)

    console.log(`  cron executado: ${body.sent} notificação(ões) enviada(s)`)
    if (body.ids.length > 0) {
      console.log(`  ids processados: ${body.ids.join(', ')}`)
    }
  })
})
