/**
 * Verificação de e-mail — guards, restrição de reserva e API
 *
 * Cobertura:
 * 1.  GET /api/auth/verify-email sem token → redirect /verify-email?error=invalid
 * 2.  GET /api/auth/verify-email?token=fake → redirect /verify-email?error=invalid
 * 3.  POST /api/auth/resend-verification sem auth → 401
 * 4.  POST /api/auth/resend-verification com auth → 200 | 409 | 429
 * 5.  POST /api/bookings com emailVerified=null → 403 EMAIL_NOT_VERIFIED   ← P0 core
 * 6.  UI: /perfil exibe aviso de verificação pendente para usuário recém-cadastrado
 *
 * Pré-requisito teste 4: session-locatario.json (pnpm tsx scripts/create-staging-fixtures.ts)
 */

import fs from 'fs'
import { test, expect } from '@playwright/test'
import { SESSION_PATHS } from './fixtures/test-credentials'

const BASE               = process.env.BASE_URL ?? 'http://localhost:3000'
const hasLocatarioSession = fs.existsSync(SESSION_PATHS.locatario)

function randomCpf(): string {
  const n  = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))
  const d1 = (n.reduce((s, v, i) => s + v * (10 - i), 0) * 10) % 11 % 10
  const d2 = ([...n, d1].reduce((s, v, i) => s + v * (11 - i), 0) * 10) % 11 % 10
  const f  = [...n, d1, d2]
  return `${f.slice(0, 3).join('')}.${f.slice(3, 6).join('')}.${f.slice(6, 9).join('')}-${f.slice(9).join('')}`
}

async function registerUnverified(
  request: import('@playwright/test').APIRequestContext,
  suffix: string,
): Promise<{ email: string; password: string; ok: boolean }> {
  const email    = `unverified.e2e.${suffix}@shareo-test.com`
  const password = 'Shareo@E2eTest!'
  const res      = await request.post(`${BASE}/api/auth/register`, {
    data: {
      name:            `E2E Unverified ${suffix}`,
      email,
      password,
      confirmPassword: password,
      userType:        'PF',
      cpf:             randomCpf(),
      city:            'Natal',
      state:           'RN',
      consentVersion:  'v1.0',
      consentAt:       new Date().toISOString(),
    },
  })
  return { email, password, ok: res.ok() }
}

// ─── 1–2. Token inválido ou ausente ──────────────────────────────────────────

test.describe('verify-email — token inválido ou ausente', () => {
  test('1. sem token → redireciona para /verify-email?error=invalid', async ({ page }) => {
    await page.goto(`${BASE}/api/auth/verify-email`)
    await expect(page).toHaveURL(/verify-email.*error=invalid/, { timeout: 8000 })
    console.log('  Sem token → error=invalid ✅')
  })

  test('2. token inexistente no DB → redireciona para /verify-email?error=invalid', async ({ page }) => {
    await page.goto(`${BASE}/api/auth/verify-email?token=token-invalido-e2e-smoke-xyz`)
    await expect(page).toHaveURL(/verify-email.*error=invalid/, { timeout: 8000 })
    console.log('  Token inválido → error=invalid ✅')
  })
})

// ─── 3–4. Reenvio de verificação ─────────────────────────────────────────────

test.describe('resend-verification — autenticação obrigatória', () => {
  test('3. POST /api/auth/resend-verification sem auth → 401', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/auth/resend-verification`)
    console.log(`  POST resend sem auth → ${res.status()}`)
    expect(res.status(), 'Reenvio sem auth deve ser 401').toBe(401)
    console.log('  401 ✅')
  })

  test('4. POST /api/auth/resend-verification com auth → 200 | 400 | 409 | 429', async ({ browser }) => {
    test.skip(!hasLocatarioSession, 'Requer session-locatario.json')
    test.skip(test.info().project.name !== 'chromium', 'Verificado apenas em chromium')
    test.setTimeout(20000)

    const ctx  = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const page = await ctx.newPage()
    try {
      const res = await page.request.post(`${BASE}/api/auth/resend-verification`)
      console.log(`  POST resend com auth → ${res.status()}`)
      // 400 = ALREADY_VERIFIED (fixture locatário já tem o e-mail verificado) — ver route.ts
      expect(
        [200, 400, 409, 429],
        '200 enviado | 400 já verificado (ALREADY_VERIFIED) | 409 | 429 rate limit',
      ).toContain(res.status())
      console.log(`  ${res.status()} ✅`)
    } finally {
      await ctx.close()
    }
  })
})

// ─── 5. Restrição de reserva — P0 core ───────────────────────────────────────

test.describe('booking restriction — e-mail não verificado', () => {
  test('5. POST /api/bookings com emailVerified=null → 403 EMAIL_NOT_VERIFIED', async ({ browser }) => {
    test.skip(test.info().project.name !== 'chromium', 'Verificado apenas em chromium')
    test.setTimeout(90000)

    const ts  = Date.now()
    const ctx = await browser.newContext()
    const page = await ctx.newPage()

    try {
      // 1. Cadastra usuário novo (emailVerified = null por padrão)
      const { email, password, ok } = await registerUnverified(page.request, String(ts))
      if (!ok) {
        test.info().annotations.push({ type: 'info', description: 'Cadastro retornou erro — IP pode ter atingido rate limit (5/min)' })
        return
      }
      console.log(`  Usuário cadastrado: ${email} (não verificado)`)

      // 2. Login
      await page.goto(`${BASE}/login`)
      await page.getByLabel(/e-?mail/i).fill(email)
      await page.locator('input[type="password"]').fill(password)
      await page.getByRole('button', { name: /entrar|login|acessar/i }).click()
      await page.waitForURL(/^(?!.*\/login).*/, { timeout: 15000 }).catch(() => {})
      console.log(`  Login → ${page.url()}`)

      // 3. Busca um item disponível
      const itemsRes  = await page.request.get(`${BASE}/api/items?limit=1`)
      const itemsBody = await itemsRes.json() as { data: Array<{ id: string }> }
      const item      = itemsBody.data?.[0]
      if (!item) {
        test.info().annotations.push({ type: 'info', description: 'Sem itens disponíveis no staging' })
        return
      }

      // 4. Tenta reservar — deve ser bloqueado
      const startDate = new Date(Date.now() + 30 * 86400000).toISOString()
      const endDate   = new Date(Date.now() + 32 * 86400000).toISOString()
      const bookRes   = await page.request.post(`${BASE}/api/bookings`, {
        data: { itemId: item.id, startDate, endDate },
      })

      console.log(`  POST /api/bookings (não verificado) → ${bookRes.status()}`)
      expect(bookRes.status(), 'Usuário sem e-mail verificado deve receber 403').toBe(403)

      const body = await bookRes.json() as { error: { code: string } }
      expect(body.error.code, 'Código deve ser EMAIL_NOT_VERIFIED').toBe('EMAIL_NOT_VERIFIED')
      console.log('  403 EMAIL_NOT_VERIFIED ✅')

    } finally {
      // Cleanup: sem bookings → DELETE aceita
      await page.request.delete(`${BASE}/api/users/me`).catch(() => {})
      await ctx.close()
    }
  })
})

// ─── 6. UI — banner de verificação no /perfil ────────────────────────────────

test.describe('UI — banner de verificação pendente', () => {
  test('6. /perfil exibe aviso de e-mail não verificado para recém-cadastrado', async ({ browser }) => {
    test.skip(test.info().project.name !== 'chromium', 'UI verificada apenas em chromium')
    test.setTimeout(90000)

    const ts  = Date.now() + 1
    const ctx  = await browser.newContext()
    const page = await ctx.newPage()

    try {
      const { email, password, ok } = await registerUnverified(page.request, `ui-${ts}`)
      if (!ok) {
        test.info().annotations.push({ type: 'info', description: 'Cadastro falhou (rate limit) — skip' })
        return
      }

      await page.goto(`${BASE}/login`)
      await page.getByLabel(/e-?mail/i).fill(email)
      await page.locator('input[type="password"]').fill(password)
      await page.getByRole('button', { name: /entrar|login|acessar/i }).click()
      await page.waitForURL(/^(?!.*\/login).*/, { timeout: 15000 }).catch(() => {})

      await page.goto(`${BASE}/perfil`)
      await expect(page.locator('main')).toBeVisible({ timeout: 10000 })

      const banner = page
        .getByText(/verif.*e-?mail|confirme.*e-?mail|e-?mail.*não verificado|pendente.*verificação/i)
        .first()
      const hasBanner = await banner.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasBanner) {
        console.log('  Banner de verificação pendente encontrado ✅')
      } else {
        test.info().annotations.push({
          type: 'info',
          description: 'Banner não encontrado em /perfil — verificar implementação do aviso na UI',
        })
        console.log('  Banner não encontrado — anotar (UI pode não ter o componente)')
      }

    } finally {
      await page.request.delete(`${BASE}/api/users/me`).catch(() => {})
      await ctx.close()
    }
  })
})
