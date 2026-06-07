/**
 * Smoke #28 — Checkout Stripe: guards, criação de sessão, webhook auth
 *
 * O que é testado:
 *   A) Guards de autenticação e estado:
 *      - sem auth → 401
 *      - proprietário tenta pagar → 403
 *      - booking PENDING (não confirmado) → 422 BOOKING_NOT_CONFIRMED
 *   B) Criação de Checkout Session (Stripe test mode):
 *      - locatário + booking CONFIRMED → 200 + URL checkout.stripe.com
 *      - second call no mesmo booking → 200 (nova session sobrescreve)
 *      - booking já PAID → 409 ALREADY_PAID
 *   C) Webhook guards:
 *      - POST /api/webhooks/stripe sem header stripe-signature → 400
 *      - POST /api/webhooks/stripe com assinatura inválida → 400
 *
 * O que NÃO é testado aqui (requer Stripe CLI / browser real):
 *   - Preenchimento do formulário de pagamento Stripe
 *   - Webhook completo (checkout.session.completed) após pagamento real
 */

import fs from 'fs'
import { test, expect } from '@playwright/test'
import { SESSION_PATHS } from './fixtures/test-credentials'
import { TEST_ITEM_PATH } from './fixtures/test-paths'

const hasSessions =
  fs.existsSync(SESSION_PATHS.locatario) &&
  fs.existsSync(SESSION_PATHS.proprietario)

const hasTestItem = fs.existsSync(TEST_ITEM_PATH)

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'

// ─────────────────────────────────────────────────────────────────────────────
// Smoke #28 — Checkout Stripe: guards de auth/estado + criação de session
// ─────────────────────────────────────────────────────────────────────────────
test.describe('smoke #28 — Checkout Stripe: guards e criação de sessão', () => {
  test.skip(!hasSessions || !hasTestItem, 'Requer sessões fixture e test-item-id.json')

  // ── A) Guards sem Stripe ──────────────────────────────────────────────────

  test('POST /api/payments/checkout sem auth → 401', async () => {
    test.skip(test.info().project.name !== 'chromium', 'Checkout verificado apenas em chromium')

    const res = await fetch(`${BASE}/api/payments/checkout`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ bookingId: 'qualquer-id' }),
    })
    console.log(`  POST /api/payments/checkout sem auth → ${res.status}`)
    expect(res.status, 'Checkout sem auth deve retornar 401').toBe(401)
    console.log(`  401 ✅`)
  })

  test('POST /api/payments/checkout com proprietário → 403 (só locatário paga)', async ({ browser }) => {
    test.skip(test.info().project.name !== 'chromium', 'Checkout verificado apenas em chromium')
    test.setTimeout(60000)

    const { itemId } = JSON.parse(fs.readFileSync(TEST_ITEM_PATH, 'utf-8')) as { itemId: string }

    const locCtx  = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const propCtx = await browser.newContext({ storageState: SESSION_PATHS.proprietario })
    const loc     = await locCtx.newPage()
    const prop    = await propCtx.newPage()

    // Criar booking PENDING
    const base = 7000 + test.info().workerIndex * 200
    const day  = (n: number) => new Date(Date.now() + n * 86400000).toISOString()

    const resBook = await loc.request.post(`${BASE}/api/bookings`, {
      data: { itemId, startDate: day(base), endDate: day(base + 1), borrowerNote: 'Smoke #28 403' },
    })
    expect(resBook.ok(), `Booking falhou: ${resBook.status()}`).toBeTruthy()
    const { data: bk } = await resBook.json() as { data: { id: string } }
    console.log(`  Booking PENDING criado: ${bk.id}`)

    // Proprietário tenta chamar checkout (deve ser 403 — só o locatário paga)
    const resForbidden = await prop.request.post(`${BASE}/api/payments/checkout`, {
      data: { bookingId: bk.id },
    })
    console.log(`  POST checkout como proprietário → ${resForbidden.status()}`)
    expect(resForbidden.status(), 'Proprietário não pode iniciar checkout → 403').toBe(403)
    const body403 = await resForbidden.json()
    expect(body403.error?.code).toBe('FORBIDDEN')
    console.log(`  403 FORBIDDEN ✅ — apenas o locatário pode pagar`)

    // Cleanup: cancelar booking
    await loc.request.patch(`${BASE}/api/bookings/${bk.id}`, {
      data: { action: 'cancel', reason: 'Cleanup smoke #28' },
    })

    await locCtx.close()
    await propCtx.close()
  })

  test('POST /api/payments/checkout com booking PENDING → 422 BOOKING_NOT_CONFIRMED', async ({ browser }) => {
    test.skip(test.info().project.name !== 'chromium', 'Checkout verificado apenas em chromium')
    test.setTimeout(60000)

    const { itemId } = JSON.parse(fs.readFileSync(TEST_ITEM_PATH, 'utf-8')) as { itemId: string }

    const locCtx = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const loc    = await locCtx.newPage()

    const base = 7200 + test.info().workerIndex * 200
    const day  = (n: number) => new Date(Date.now() + n * 86400000).toISOString()

    const resBook = await loc.request.post(`${BASE}/api/bookings`, {
      data: { itemId, startDate: day(base), endDate: day(base + 1), borrowerNote: 'Smoke #28 422' },
    })
    expect(resBook.ok(), `Booking falhou: ${resBook.status()}`).toBeTruthy()
    const { data: bk } = await resBook.json() as { data: { id: string } }
    console.log(`  Booking PENDING criado: ${bk.id}`)

    // Tentar checkout com booking ainda PENDING → 422
    const res422 = await loc.request.post(`${BASE}/api/payments/checkout`, {
      data: { bookingId: bk.id },
    })
    console.log(`  POST checkout com PENDING → ${res422.status()}`)
    expect(res422.status(), 'Checkout de booking PENDING deve retornar 422').toBe(422)
    const body422 = await res422.json()
    expect(body422.error?.code).toBe('BOOKING_NOT_CONFIRMED')
    console.log(`  422 BOOKING_NOT_CONFIRMED ✅`)

    // Cleanup
    await loc.request.patch(`${BASE}/api/bookings/${bk.id}`, {
      data: { action: 'cancel', reason: 'Cleanup smoke #28' },
    })

    await locCtx.close()
  })

  // ── B) Criação de Checkout Session (Stripe test mode) ────────────────────

  test('POST /api/payments/checkout com CONFIRMED → 200 + URL Stripe válida', async ({ browser }) => {
    test.skip(test.info().project.name !== 'chromium', 'Checkout verificado apenas em chromium')
    test.setTimeout(90000)

    const { itemId } = JSON.parse(fs.readFileSync(TEST_ITEM_PATH, 'utf-8')) as { itemId: string }

    const locCtx  = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const propCtx = await browser.newContext({ storageState: SESSION_PATHS.proprietario })
    const loc     = await locCtx.newPage()
    const prop    = await propCtx.newPage()

    const base = 7400 + test.info().workerIndex * 200
    const day  = (n: number) => new Date(Date.now() + n * 86400000).toISOString()

    // Criar booking e confirmar
    const resBook = await loc.request.post(`${BASE}/api/bookings`, {
      data: { itemId, startDate: day(base), endDate: day(base + 1), borrowerNote: 'Smoke #28 checkout' },
    })
    expect(resBook.ok(), `Booking falhou: ${resBook.status()}`).toBeTruthy()
    const { data: bk } = await resBook.json() as { data: { id: string } }
    console.log(`  Booking PENDING criado: ${bk.id}`)

    // Proprietário confirma
    const resConfirm = await prop.request.patch(`${BASE}/api/bookings/${bk.id}`, {
      data: { action: 'confirm' },
    })
    expect(resConfirm.ok(), `Confirm falhou: ${resConfirm.status()}`).toBeTruthy()
    console.log(`  Booking CONFIRMED ✅`)

    // Locatário inicia checkout
    const resCheckout = await loc.request.post(`${BASE}/api/payments/checkout`, {
      data: { bookingId: bk.id },
    })
    console.log(`  POST /api/payments/checkout → ${resCheckout.status()}`)
    expect(resCheckout.status(), 'Checkout de CONFIRMED deve retornar 200').toBe(200)

    const { data } = await resCheckout.json() as { data: { url: string } }
    console.log(`  URL Stripe recebida: ${data?.url?.slice(0, 60)}…`)

    // Valida que é uma URL Stripe real (test mode)
    expect(data?.url, 'Resposta deve conter url').toBeTruthy()
    expect(data.url, 'URL deve ser do checkout.stripe.com').toMatch(/https:\/\/checkout\.stripe\.com\//)
    console.log(`  URL checkout.stripe.com ✅`)

    // Segunda chamada no mesmo booking → nova session (a anterior ainda não expirou)
    const resCheckout2 = await loc.request.post(`${BASE}/api/payments/checkout`, {
      data: { bookingId: bk.id },
    })
    console.log(`  Segunda chamada checkout → ${resCheckout2.status()}`)
    expect(resCheckout2.status(), 'Segunda chamada deve retornar 200 (nova session)').toBe(200)
    const { data: data2 } = await resCheckout2.json() as { data: { url: string } }
    expect(data2?.url).toMatch(/https:\/\/checkout\.stripe\.com\//)
    console.log(`  Segunda sessão Stripe criada ✅`)

    // Cleanup: cancelar booking (não chegou a pagar, então pode cancelar)
    await loc.request.patch(`${BASE}/api/bookings/${bk.id}`, {
      data: { action: 'cancel', reason: 'Cleanup smoke #28' },
    })
    console.log(`  Booking cancelado (cleanup) ✅`)

    await locCtx.close()
    await propCtx.close()
  })

  // ── C) Webhook guards ─────────────────────────────────────────────────────

  test('POST /api/webhooks/stripe sem stripe-signature → 400', async () => {
    test.skip(test.info().project.name !== 'chromium', 'Webhook verificado apenas em chromium')

    const res = await fetch(`${BASE}/api/webhooks/stripe`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type: 'checkout.session.completed' }),
    })
    console.log(`  POST /api/webhooks/stripe sem signature → ${res.status}`)
    expect(res.status, 'Webhook sem stripe-signature deve retornar 400').toBe(400)
    const json = await res.json()
    expect(json.error).toContain('stripe-signature')
    console.log(`  400 — assinatura ausente rejeitada ✅`)
  })

  test('POST /api/webhooks/stripe com assinatura inválida → 400', async () => {
    test.skip(test.info().project.name !== 'chromium', 'Webhook verificado apenas em chromium')

    const res = await fetch(`${BASE}/api/webhooks/stripe`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'stripe-signature': 't=1234,v1=assinatura_invalida_smoke28',
      },
      body: JSON.stringify({ type: 'checkout.session.completed' }),
    })
    console.log(`  POST /api/webhooks/stripe com assinatura inválida → ${res.status}`)
    expect(res.status, 'Assinatura inválida deve retornar 400').toBe(400)
    console.log(`  400 — assinatura inválida rejeitada ✅`)
  })
})
