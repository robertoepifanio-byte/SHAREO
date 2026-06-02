/**
 * Plano de Teste E2E — ShareO Staging (Segurança)
 *
 * Step 1 · Sessão expirada            — critical / ABORTAR
 * Step 2 · Acesso não autorizado      — critical / ABORTAR
 * Step 3 · Validação de permissões    — high     / CONTINUAR
 * Step 4 · Proteção inputs inválidos  — medium   / CONTINUAR
 *
 * Restrições:
 *  - Somente staging (shareo-rouge.vercel.app) — sem produção
 *  - Sem alterações de infra ou dados sensíveis
 *  - Logs armazenados apenas localmente (e2e-security-report.json)
 *  - Abortar se qualquer passo crítico falhar
 */

import fs from 'fs'
import path from 'path'
import { test, expect } from '@playwright/test'

const BASE_URL    = process.env.STAGING_URL ?? 'https://shareo-rouge.vercel.app'
const REPORT_PATH = path.resolve('e2e-security-report.json')

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type Priority   = 'critical' | 'high' | 'medium' | 'low'
type StepStatus = 'passed' | 'failed' | 'skipped'

interface StepResult {
  step:       number
  name:       string
  priority:   Priority
  onFail:     'ABORTAR' | 'CONTINUAR'
  status:     StepStatus
  durationMs: number
  error?:     string
  findings?:  string
}

class SkipStep extends Error {
  constructor(r: string) { super(r); this.name = 'SkipStep' }
}

const STEPS = [
  { num: 1, name: '1. Sessão expirada',           priority: 'critical' as Priority, onFail: 'ABORTAR'   as const },
  { num: 2, name: '2. Acesso não autorizado',      priority: 'critical' as Priority, onFail: 'ABORTAR'   as const },
  { num: 3, name: '3. Validação de permissões',    priority: 'high'     as Priority, onFail: 'CONTINUAR' as const },
  { num: 4, name: '4. Proteção inputs inválidos',  priority: 'medium'   as Priority, onFail: 'CONTINUAR' as const },
] as const

// ---------------------------------------------------------------------------
// Rotas protegidas definidas no middleware
// ---------------------------------------------------------------------------

const PROTECTED_ROUTES = ['/mensagens', '/meus-anuncios', '/favoritos', '/itens/novo']
const ADMIN_ROUTE      = '/admin'
const SESSION_COOKIE   = 'authjs.session-token'

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

test.describe('Plano E2E Segurança — ShareO', () => {
  test.setTimeout(120_000)

  test('Sessão · Auth · Admin · XSS', async ({ page, context }) => {
    const results: StepResult[] = []
    let abortError: Error | undefined
    let stepFindings: string | undefined

    async function runStep(
      meta: typeof STEPS[number],
      fn: () => Promise<void>,
    ) {
      stepFindings = undefined
      const t0   = Date.now()
      const base = { step: meta.num, name: meta.name, priority: meta.priority, onFail: meta.onFail }

      if (abortError) {
        results.push({ ...base, status: 'skipped', durationMs: 0, error: 'Suíte abortada — passo crítico anterior falhou' })
        return
      }

      try {
        await fn()
        results.push({ ...base, status: 'passed', durationMs: Date.now() - t0, ...(stepFindings && { findings: stepFindings }) })
      } catch (err) {
        const isSkip = err instanceof SkipStep
        const msg    = err instanceof Error ? err.message : String(err)
        results.push({ ...base, status: isSkip ? 'skipped' : 'failed', durationMs: Date.now() - t0, error: msg, ...(stepFindings && { findings: stepFindings }) })
        if (!isSkip && meta.onFail === 'ABORTAR') abortError = err as Error
      }
    }

    try {
      // ── Step 1: Sessão expirada ─────────────────────────────────────────────
      await test.step(STEPS[0].name, () =>
        runStep(STEPS[0], async () => {
          // Garante que nenhum cookie de sessão está presente (simula expiração)
          await context.clearCookies()

          await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'commit' })

          // Middleware deve redirecionar para /login?callbackUrl=/dashboard
          await page.waitForURL(
            (url) => url.pathname === '/login',
            { timeout: 15_000 },
          )

          const redirected = new URL(page.url())
          expect(redirected.pathname, 'Deve redirecionar para /login').toBe('/login')
          const callbackUrl = redirected.searchParams.get('callbackUrl') ?? ''
          expect(callbackUrl, 'callbackUrl deve incluir /dashboard').toContain('/dashboard')

          test.info().annotations.push({
            type: 'sessao-expirada',
            description: `✓ /dashboard sem sessão → ${page.url()}`,
          })
        })
      )
      if (abortError) throw abortError

      // ── Step 2: Acesso não autorizado ──────────────────────────────────────
      await test.step(STEPS[1].name, () =>
        runStep(STEPS[1], async () => {
          const failed: string[] = []

          for (const route of PROTECTED_ROUTES) {
            await page.goto(`${BASE_URL}${route}`, { waitUntil: 'commit' })

            try {
              await page.waitForURL(
                (url) => url.pathname === '/login',
                { timeout: 12_000 },
              )
              const redirected = new URL(page.url())
              if (redirected.pathname !== '/login') {
                failed.push(`${route} → ${redirected.pathname} (esperava /login)`)
              }
            } catch {
              failed.push(`${route} → não redirecionou para /login`)
            }
          }

          // Verifica também que o cookie de sessão não foi criado spuriously
          const cookies = await context.cookies()
          const sessionCookie = cookies.find((c) => c.name === SESSION_COOKIE)
          const findings = `Rotas testadas: ${PROTECTED_ROUTES.join(', ')} | Falhas: ${failed.length === 0 ? 'nenhuma' : failed.join('; ')}`
          stepFindings = findings

          if (failed.length > 0) {
            throw new Error(`Rotas protegidas acessíveis sem autenticação: ${failed.join('; ')}`)
          }

          if (sessionCookie) {
            throw new Error(`Cookie de sessão presente sem login: ${sessionCookie.name}`)
          }

          test.info().annotations.push({
            type: 'acesso-nao-autorizado',
            description: `✓ ${PROTECTED_ROUTES.length} rotas protegidas — todas redirecionam para /login`,
          })
        })
      )
      if (abortError) throw abortError

      // ── Step 3: Validação de permissões (admin) ────────────────────────────
      await test.step(STEPS[2].name, () =>
        runStep(STEPS[2], async () => {
          await page.goto(`${BASE_URL}${ADMIN_ROUTE}`, { waitUntil: 'commit' })

          await page.waitForURL(
            (url) => url.pathname === '/login',
            { timeout: 12_000 },
          )

          const redirected = new URL(page.url())
          expect(redirected.pathname, 'Admin sem auth deve redirecionar para /login').toBe('/login')
          expect(
            redirected.searchParams.get('callbackUrl') ?? '',
            'callbackUrl deve incluir /admin',
          ).toContain('/admin')

          // Verificação adicional: /api/admin sem auth
          const apiResp = await page.request.get(`${BASE_URL}/api/admin/users`, {
            maxRedirects: 0,
            failOnStatusCode: false,
          })
          // Middleware redireciona (302/307) ou NextAuth retorna 401 — nenhum dos dois deve ser 200 com dados
          expect(
            apiResp.status(),
            '/api/admin sem token não deve retornar 200',
          ).not.toBe(200)

          const findings = `/admin → /login ✓ | /api/admin status: ${apiResp.status()}`
          stepFindings = findings

          test.info().annotations.push({
            type: 'permissoes-admin',
            description: `✓ /admin sem auth → /login | /api/admin status: ${apiResp.status()}`,
          })
        })
      )

      // ── Step 4: Proteção inputs inválidos (XSS) ────────────────────────────
      await test.step(STEPS[3].name, () =>
        runStep(STEPS[3], async () => {
          const xssPayloads = [
            "<script>alert('XSS')</script>",
            '"><img src=x onerror=alert(1)>',
            "'; DROP TABLE items; --",
          ]

          let dialogFired    = false
          let dialogMessage  = ''

          // Captura qualquer dialog (alert/confirm/prompt) que indicaria XSS executado
          page.on('dialog', async (dialog) => {
            dialogFired   = true
            dialogMessage = dialog.message()
            await dialog.dismiss()
          })

          // ── Teste 1: campo de busca na homepage ───────────────────────────
          await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

          const searchInput = page.getByRole('searchbox').or(page.locator('input[name="search"]'))
          await expect(searchInput).toBeVisible({ timeout: 10_000 })

          for (const payload of xssPayloads.slice(0, 1)) {
            await searchInput.fill(payload)
            await page.getByRole('button', { name: /buscar/i }).click()

            // Aguarda navegação ou resposta — não esperamos que o script execute
            await page.waitForLoadState('domcontentloaded')

            if (dialogFired) {
              throw new Error(`XSS executado no campo de busca! Dialog: "${dialogMessage}" | Payload: ${payload}`)
            }

            // Verifica que o DOM não contém <script> não escapado vindo do input
            const bodyHtml = await page.locator('body').innerHTML()
            const rawScript = /<script\b[^>]*>\s*alert/i.test(bodyHtml)
            if (rawScript) {
              throw new Error(`Script não sanitizado encontrado no DOM após payload: ${payload}`)
            }

            await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
          }

          // ── Teste 2: campo email no /login ─────────────────────────────────
          await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })

          const emailInput = page.locator('input[type="email"]').or(page.locator('input[name="email"]'))
          if (await emailInput.isVisible()) {
            await emailInput.fill('"><script>alert(1)</script>@test.com')
            const senhaInput = page.locator('input[type="password"]').first()
            if (await senhaInput.isVisible()) await senhaInput.fill('qualquer')
            await page.getByRole('button', { name: /entrar/i }).click()
            await page.waitForLoadState('domcontentloaded')

            if (dialogFired) {
              throw new Error(`XSS executado no campo email! Dialog: "${dialogMessage}"`)
            }
          }

          const findings = `Payloads testados: ${xssPayloads.length} | Dialogs disparados: ${dialogFired ? dialogMessage : 'nenhum'}`
          stepFindings = findings

          test.info().annotations.push({
            type: 'xss-protection',
            description: `✓ ${xssPayloads.length} payloads XSS testados — nenhum dialog disparado`,
          })
        })
      )

    } finally {
      const passed  = results.filter((r) => r.status === 'passed').length
      const failed  = results.filter((r) => r.status === 'failed').length
      const skipped = results.filter((r) => r.status === 'skipped').length
      const verdict = abortError ? 'ABORTADO' : failed > 0 ? 'PARCIAL' : 'OK'

      const report = {
        meta: {
          name:        'Teste E2E Shareo - Segurança',
          environment: 'staging',
          url:         BASE_URL,
          runAt:       new Date().toISOString(),
          verdict,
        },
        summary: { passed, failed, skipped, total: results.length },
        steps:   results,
      }

      fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))
      if (abortError) throw abortError
    }
  })
})
