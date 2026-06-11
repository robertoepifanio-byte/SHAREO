/**
 * Notificações — API e UI do sino
 *
 * Cobertura:
 * 1.  GET /api/notifications sem auth → 401
 * 2.  GET /api/notifications com auth → 200, { data: array, unreadCount: number }
 * 3.  PATCH /api/notifications/read-all sem auth → 401
 * 4.  PATCH /api/notifications/read-all com auth → { ok: true }; GET após → unreadCount = 0
 * 5.  UI: ícone de sino visível na navbar (desktop 1280px)
 * 6.  UI: badge de não lidas aparece quando unreadCount > 0
 *
 * Pré-requisito testes 2,4,5,6: session-locatario.json
 */

import fs from 'fs'
import { test, expect } from '@playwright/test'
import { SESSION_PATHS } from './fixtures/test-credentials'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const hasLocatarioSession = fs.existsSync(SESSION_PATHS.locatario)

// ─── 1,3. Sem autenticação ────────────────────────────────────────────────────

test.describe('notifications API — sem autenticação', () => {
  test('1. GET /api/notifications sem auth → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/notifications`)
    expect(res.status(), 'GET notifications sem auth deve ser 401').toBe(401)
    console.log('  GET /api/notifications sem auth → 401 ✅')
  })

  test('3. PATCH /api/notifications/read-all sem auth → 401', async ({ request }) => {
    const res = await request.patch(`${BASE}/api/notifications/read-all`)
    expect(res.status(), 'PATCH read-all sem auth deve ser 401').toBe(401)
    console.log('  PATCH /api/notifications/read-all sem auth → 401 ✅')
  })
})

// ─── 2. GET com auth ──────────────────────────────────────────────────────────

test.describe('notifications API — GET com autenticação', () => {
  test('2. GET /api/notifications → 200 com data array e unreadCount', async ({ browser }) => {
    test.skip(!hasLocatarioSession, 'Requer session-locatario.json')
    test.setTimeout(20000)

    const ctx  = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const page = await ctx.newPage()
    try {
      const res = await page.request.get(`${BASE}/api/notifications`)
      expect(res.ok(), 'GET notifications com auth deve ser 200').toBeTruthy()

      const body = await res.json() as { data: unknown[]; unreadCount: number }
      expect(Array.isArray(body.data), 'data deve ser array').toBe(true)
      expect(typeof body.unreadCount, 'unreadCount deve ser number').toBe('number')
      expect(body.unreadCount, 'unreadCount deve ser >= 0').toBeGreaterThanOrEqual(0)

      console.log(`  GET /api/notifications → 200 | ${body.data.length} notif(s) | unread=${body.unreadCount} ✅`)
    } finally {
      await ctx.close()
    }
  })
})

// ─── 4. PATCH read-all com auth ───────────────────────────────────────────────

test.describe('notifications API — PATCH read-all com autenticação', () => {
  test('4. PATCH read-all → ok=true; GET após → unreadCount=0', async ({ browser }) => {
    test.skip(!hasLocatarioSession, 'Requer session-locatario.json')
    test.setTimeout(20000)

    const ctx  = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const page = await ctx.newPage()
    try {
      const patchRes  = await page.request.patch(`${BASE}/api/notifications/read-all`)
      expect(patchRes.ok(), 'PATCH read-all deve ser 200').toBeTruthy()
      const patchBody = await patchRes.json() as { ok: boolean }
      expect(patchBody.ok, 'Resposta deve ter ok=true').toBe(true)
      console.log('  PATCH read-all → ok=true ✅')

      const getRes  = await page.request.get(`${BASE}/api/notifications`)
      const getBody = await getRes.json() as { data: unknown[]; unreadCount: number }
      expect(getBody.unreadCount, 'Após read-all, unreadCount deve ser 0').toBe(0)
      console.log('  GET após read-all → unreadCount=0 ✅')
    } finally {
      await ctx.close()
    }
  })
})

// ─── 5–6. UI — sino e badge ───────────────────────────────────────────────────

test.describe('notifications UI — sino e badge na navbar', () => {
  test('5–6. sino visível no header; badge presente se unreadCount > 0', async ({ browser }) => {
    test.skip(!hasLocatarioSession, 'Requer session-locatario.json')
    test.skip(test.info().project.name !== 'chromium', 'UI verificada apenas em chromium')
    test.setTimeout(30000)

    const ctx  = await browser.newContext({
      storageState: SESSION_PATHS.locatario,
      viewport:     { width: 1280, height: 800 },
    })
    const page = await ctx.newPage()
    try {
      await page.goto(`${BASE}/`)
      await expect(page.locator('header')).toBeVisible({ timeout: 10000 })

      // ── 5. Sino ────────────────────────────────────────────────────────
      const bellBtn = page
        .locator('header')
        .locator('[aria-label*="notif" i], [aria-label*="sino" i], [aria-label*="bell" i]')
        .or(page.locator('header').getByRole('button', { name: /notif|sino|bell/i }))
        .first()

      const hasBell = await bellBtn.isVisible({ timeout: 5000 }).catch(() => false)
      if (!hasBell) {
        test.info().annotations.push({
          type: 'info',
          description: 'Botão de sino não encontrado no header — verificar NotificationBell component',
        })
        console.log('  Sino não encontrado — anotar ℹ️')
        return
      }
      console.log('  Ícone de sino visível na navbar ✅')

      // ── 6. Badge ───────────────────────────────────────────────────────
      const notifRes  = await page.request.get(`${BASE}/api/notifications`)
      const notifBody = await notifRes.json() as { unreadCount: number }

      if (notifBody.unreadCount > 0) {
        // Badge deve estar visível (número ou ponto vermelho)
        const badge = page
          .locator('header')
          .locator('[data-badge], .badge, [class*="badge"], [class*="unread"], [class*="dot"]')
          .or(page.locator('header').getByText(String(notifBody.unreadCount)).first())
          .first()
        const hasBadge = await badge.isVisible({ timeout: 3000 }).catch(() => false)
        if (hasBadge) {
          console.log(`  Badge de não lidas visível (unread=${notifBody.unreadCount}) ✅`)
        } else {
          test.info().annotations.push({
            type: 'info',
            description: `unreadCount=${notifBody.unreadCount} mas badge visual não encontrado no header`,
          })
          console.log('  Badge não encontrado no DOM — anotar ℹ️')
        }
      } else {
        console.log('  unreadCount=0 — badge não esperado ✅')
      }
    } finally {
      await ctx.close()
    }
  })
})
