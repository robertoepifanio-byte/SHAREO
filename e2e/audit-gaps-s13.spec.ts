/**
 * Cobertura de gaps da Auditoria Crítica s13 — nível de guard/validação.
 *
 * Fluxos antes sem nenhuma cobertura E2E. Estes testes garantem o contrato de
 * segurança (rejeição sem auth) e validação de entrada — robustos contra o
 * staging sem depender de estado pré-semeado. Os caminhos felizes que exigem
 * booking em estado específico ficam anotados para um fixture dedicado.
 *
 * GAP-01 cupons · GAP-02 embaixadores · GAP-03 extensão · GAP-04 disputa
 * GAP-07 fotos de booking · GAP-08 auth mobile · GAP-09 founder leads
 * GAP-10 notificação individual
 */

import fs from 'fs'
import { test, expect } from '@playwright/test'
import { SESSION_PATHS } from './fixtures/test-credentials'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const FAKE = 'clfakebooking000000000000'
const hasLocatario = fs.existsSync(SESSION_PATHS.locatario)

// ─── GAP-03 — Extensão de prazo ───────────────────────────────────────────────
test('GAP-03 — POST /api/bookings/[id]/extend sem auth → 401', async ({ request }) => {
  const res = await request.post(`${BASE}/api/bookings/${FAKE}/extend`, { data: { newEndDate: '2030-01-01' } })
  expect(res.status(), 'extend sem auth deve ser 401').toBe(401)
  console.log('  extend sem auth → 401 ✅ (happy-path bilateral precisa de fixture booking)')
})

// ─── GAP-04 — Disputa ─────────────────────────────────────────────────────────
test.describe('GAP-04 — Disputa', () => {
  test('POST /api/bookings/[id]/dispute sem auth → 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/bookings/${FAKE}/dispute`, { data: { reason: 'teste' } })
    expect(res.status(), 'abrir disputa sem auth deve ser 401').toBe(401)
    console.log('  dispute sem auth → 401 ✅')
  })
  test('PATCH /api/admin/disputes/[id] sem auth → 401', async ({ request }) => {
    const res = await request.patch(`${BASE}/api/admin/disputes/${FAKE}`, { data: { action: 'resolve_completed' } })
    expect(res.status(), 'resolver disputa sem auth deve ser 401').toBe(401)
    console.log('  admin dispute sem auth → 401 ✅')
  })
})

// ─── GAP-07 — Fotos de booking (guarda SEC-CRIT-05) ──────────────────────────
test('GAP-07 — POST /api/bookings/[id]/photos sem auth → 401', async ({ request }) => {
  const res = await request.post(`${BASE}/api/bookings/${FAKE}/photos`, { data: {} })
  expect(res.status(), 'upload de foto sem auth deve ser 401').toBe(401)
  console.log('  booking photos sem auth → 401 ✅ (validação MIME/magic-bytes coberta por SEC-CRIT-05)')
})

// ─── GAP-10 — Notificação individual ──────────────────────────────────────────
test('GAP-10 — PATCH /api/notifications/[id]/read sem auth → 401', async ({ request }) => {
  const res = await request.patch(`${BASE}/api/notifications/${FAKE}/read`)
  expect(res.status(), 'marcar notificação individual sem auth deve ser 401').toBe(401)
  console.log('  notification read individual sem auth → 401 ✅')
})

// ─── GAP-01 — Cupons (aplicados na criação de reserva) ───────────────────────
test('GAP-01 — POST /api/bookings sem auth → 401 (path do couponCode)', async ({ request }) => {
  const res = await request.post(`${BASE}/api/bookings`, { data: { itemId: FAKE, couponCode: 'INVALIDO' } })
  expect(res.status(), 'criar reserva sem auth deve ser 401').toBe(401)
  console.log('  booking create sem auth → 401 ✅ (lógica de cupom vive no POST /api/bookings)')
})

// ─── GAP-02 — Embaixadores ────────────────────────────────────────────────────
test.describe('GAP-02 — Embaixadores', () => {
  test('POST /api/ambassador/consent sem auth → 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/ambassador/consent`, { data: {} })
    expect(res.status(), 'consent sem auth deve ser 401').toBe(401)
    console.log('  ambassador consent sem auth → 401 ✅')
  })
  test('/perfil/embaixador carrega para usuário logado', async ({ browser }) => {
    test.skip(!hasLocatario, 'Requer session-locatario.json')
    test.skip(test.info().project.name !== 'chromium', 'UI só em chromium')
    test.setTimeout(30000)
    const ctx = await browser.newContext({ storageState: SESSION_PATHS.locatario, viewport: { width: 1280, height: 800 } })
    const page = await ctx.newPage()
    try {
      const resp = await page.goto(`${BASE}/perfil/embaixador`)
      expect(resp?.status(), 'painel embaixador deve responder 200').toBeLessThan(400)
      await expect(page.locator('body')).toContainText(/embaixad|indica|tier|bronze|prata|ouro/i, { timeout: 10000 })
      console.log('  /perfil/embaixador renderiza painel ✅')
    } finally {
      await ctx.close()
    }
  })
})

// ─── GAP-09 — Founder leads (público) ─────────────────────────────────────────
test('GAP-09 — POST /api/founders/leads com body inválido → 400/422', async ({ request }) => {
  const res = await request.post(`${BASE}/api/founders/leads`, { data: {} })
  expect([400, 422], 'lead sem campos obrigatórios deve ser 400/422').toContain(res.status())
  console.log(`  founder leads body inválido → ${res.status()} ✅`)
})

// ─── GAP-08 — Auth mobile ─────────────────────────────────────────────────────
test.describe('GAP-08 — Auth mobile', () => {
  test('POST /api/auth/mobile/login com credenciais inválidas → 400/401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/mobile/login`, { data: { email: 'naoexiste@shareo-test.com', password: 'errada123' } })
    expect([400, 401], 'login mobile inválido deve ser 400/401').toContain(res.status())
    console.log(`  mobile login inválido → ${res.status()} ✅`)
  })
  test('POST /api/auth/mobile/refresh com token inválido → 400/401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/mobile/refresh`, { data: { refreshToken: 'token-invalido' } })
    expect([400, 401], 'refresh mobile inválido deve ser 400/401').toContain(res.status())
    console.log(`  mobile refresh inválido → ${res.status()} ✅`)
  })
})
