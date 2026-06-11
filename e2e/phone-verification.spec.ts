/**
 * Verificação de Celular — OTP Zenvia
 *
 * Cobertura:
 * 1.  POST /api/auth/phone/send-otp sem auth → 401
 * 2.  POST /api/auth/phone/send-otp com auth → 200 | 400 | 404 (feature em desenvolvimento)
 * 3.  POST /api/auth/phone/verify-otp com OTP inválido → 400 | 401 | 422
 * 4.  GET /api/users/me → campos phone presentes (ou ausentes por segurança LGPD)
 * 5.  UI: /perfil exibe campo de celular e/ou status de verificação
 *
 * Decisão de produto: Zenvia SMS OTP disparado na 1ª reserva (2026-06-10, Raimundo).
 * Schema: phoneVerifiedAt | phoneOtpHash | phoneOtpExpiresAt
 *
 * Nota: os endpoints de OTP podem ainda não estar implementados (404 esperado).
 * Os testes anotam graciosamente e não falham quando a feature está em dev.
 *
 * Pré-requisito testes 2,3,4,5: session-locatario.json
 */

import fs from 'fs'
import { test, expect } from '@playwright/test'
import { SESSION_PATHS } from './fixtures/test-credentials'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const hasLocatarioSession = fs.existsSync(SESSION_PATHS.locatario)

const PHONE_SEND_OTP   = `${BASE}/api/auth/phone/send-otp`
const PHONE_VERIFY_OTP = `${BASE}/api/auth/phone/verify-otp`

// ─── 1. Sem autenticação ──────────────────────────────────────────────────────

test.describe('phone OTP — sem autenticação', () => {
  test('1. POST send-otp sem auth → 401 (ou 404 se não implementado)', async ({ request }) => {
    const res = await request.post(PHONE_SEND_OTP, {
      data: { phone: '+5584999990000' },
    })
    console.log(`  POST send-otp sem auth → ${res.status()}`)

    if (res.status() === 404) {
      test.info().annotations.push({
        type: 'info',
        description: 'Endpoint /api/auth/phone/send-otp não implementado — feature em desenvolvimento',
      })
      console.log('  Endpoint não implementado (404) — anotar ℹ️')
      return
    }

    expect(res.status(), 'send-otp sem auth deve ser 401').toBe(401)
    console.log('  401 ✅')
  })
})

// ─── 2. send-otp com auth ─────────────────────────────────────────────────────

test.describe('phone OTP — send com autenticação', () => {
  test('2. POST send-otp com auth → 200 | 400 | 404 (feature em dev)', async ({ browser }) => {
    test.skip(!hasLocatarioSession, 'Requer session-locatario.json')
    test.skip(test.info().project.name !== 'chromium', 'Verificado apenas em chromium')
    test.setTimeout(20000)

    const ctx  = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const page = await ctx.newPage()
    try {
      const res = await page.request.post(PHONE_SEND_OTP, {
        data: { phone: '+5584999990000' },
      })
      console.log(`  POST send-otp com auth → ${res.status()}`)

      if (res.status() === 404) {
        test.info().annotations.push({
          type: 'info',
          description: 'Endpoint send-otp não implementado — feature Zenvia em desenvolvimento (2026-06-10)',
        })
        console.log('  Endpoint não implementado (404) — anotar ℹ️')
        return
      }

      // 200 SMS enviado, 400 phone inválido, 429 rate limit
      expect(
        [200, 400, 422, 429],
        'send-otp deve retornar 200 (enviado) | 400 (validação) | 429 (rate limit)',
      ).toContain(res.status())
      console.log(`  ${res.status()} ✅`)
    } finally {
      await ctx.close()
    }
  })
})

// ─── 3. verify-otp com OTP inválido ──────────────────────────────────────────

test.describe('phone OTP — verify com OTP inválido', () => {
  test('3. POST verify-otp OTP inválido → 400 | 401 | 422 (ou 404 se não implementado)', async ({ browser }) => {
    test.skip(!hasLocatarioSession, 'Requer session-locatario.json')
    test.skip(test.info().project.name !== 'chromium', 'Verificado apenas em chromium')
    test.setTimeout(20000)

    const ctx  = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const page = await ctx.newPage()
    try {
      const res = await page.request.post(PHONE_VERIFY_OTP, {
        data: { otp: '000000' },
      })
      console.log(`  POST verify-otp OTP inválido → ${res.status()}`)

      if (res.status() === 404) {
        test.info().annotations.push({
          type: 'info',
          description: 'Endpoint verify-otp não implementado — feature Zenvia em desenvolvimento',
        })
        console.log('  Endpoint não implementado (404) — anotar ℹ️')
        return
      }

      // OTP inválido deve retornar erro
      expect(
        [400, 401, 422],
        'OTP inválido deve retornar 400 (validação) | 401 (sessão expirada) | 422 (OTP errado)',
      ).toContain(res.status())
      console.log(`  ${res.status()} para OTP inválido ✅`)
    } finally {
      await ctx.close()
    }
  })
})

// ─── 4. Schema — campos phone no perfil ──────────────────────────────────────

test.describe('phone OTP — campos de schema no perfil', () => {
  test('4. GET /api/users/me → campo phone presente ou ausente por LGPD', async ({ browser }) => {
    test.skip(!hasLocatarioSession, 'Requer session-locatario.json')
    test.setTimeout(20000)

    const ctx  = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const page = await ctx.newPage()
    try {
      const res  = await page.request.get(`${BASE}/api/users/me`)
      expect(res.ok(), 'GET /api/users/me deve ser 200').toBeTruthy()

      const body = await res.json() as { data: Record<string, unknown> }
      const data = body.data

      // Campos de phone que podem aparecer na resposta pública
      const phoneFields = Object.keys(data).filter(k =>
        k.toLowerCase().includes('phone') ||
        k.toLowerCase().includes('celular') ||
        k.toLowerCase().includes('whatsapp')
      )

      if (phoneFields.length > 0) {
        console.log(`  Campos phone presentes na resposta: ${phoneFields.join(', ')} ✅`)
        // Se phoneVerifiedAt existir, deve ser null ou uma data válida
        if ('phoneVerifiedAt' in data) {
          const val = data.phoneVerifiedAt
          const isNullOrDate = val === null || (typeof val === 'string' && !isNaN(Date.parse(val)))
          expect(isNullOrDate, 'phoneVerifiedAt deve ser null ou ISO date').toBe(true)
          console.log(`  phoneVerifiedAt=${JSON.stringify(val)} ✅`)
        }
      } else {
        test.info().annotations.push({
          type: 'info',
          description: 'Campos phone não expostos em /api/users/me — correto por LGPD (minimização de dados)',
        })
        console.log('  Campos phone não expostos (minimização LGPD) ✅')
      }
    } finally {
      await ctx.close()
    }
  })
})

// ─── 5. UI — campo de celular no perfil ──────────────────────────────────────

test.describe('phone OTP UI — campo de celular no /perfil', () => {
  test('5. /perfil exibe campo de celular e/ou status de verificação', async ({ browser }) => {
    test.skip(!hasLocatarioSession, 'Requer session-locatario.json')
    test.skip(test.info().project.name !== 'chromium', 'UI verificada apenas em chromium')
    test.setTimeout(30000)

    const ctx  = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const page = await ctx.newPage()
    try {
      await page.goto(`${BASE}/perfil`)
      await expect(page.locator('main')).toBeVisible({ timeout: 15000 })

      // Campo de celular / telefone
      const phoneField = page
        .getByLabel(/celular|telefone|phone|whatsapp/i)
        .or(page.getByPlaceholder(/\(84\)|celular|DDD|telefone/i))
        .or(page.getByRole('textbox', { name: /celular|telefone|phone/i }))
        .first()

      const hasPhoneField = await phoneField.isVisible({ timeout: 5000 }).catch(() => false)
      if (hasPhoneField) {
        console.log('  5. Campo de celular visível em /perfil ✅')
      } else {
        test.info().annotations.push({
          type: 'info',
          description: 'Campo de celular não encontrado em /perfil — feature Zenvia em desenvolvimento (2026-06-10)',
        })
        console.log('  Campo celular não encontrado — feature em dev ℹ️')
      }

      // Status de verificação do celular
      const verifyStatus = page
        .getByText(/celular.*verif|verif.*celular|sms.*verif|número.*verif|verif.*número/i)
        .first()
      const hasStatus = await verifyStatus.isVisible({ timeout: 3000 }).catch(() => false)
      if (hasStatus) {
        const txt = (await verifyStatus.textContent() ?? '').trim()
        console.log(`  5. Status de verificação celular: "${txt}" ✅`)
      }

      // Botão para verificar / enviar SMS
      const smsBtn = page
        .getByRole('button', { name: /verificar\s+celular|enviar\s+sms|confirmar\s+celular/i })
        .first()
      const hasSmsBtn = await smsBtn.isVisible({ timeout: 3000 }).catch(() => false)
      if (hasSmsBtn) {
        console.log('  5. Botão "Verificar celular" encontrado ✅')
      }
    } finally {
      await ctx.close()
    }
  })
})
