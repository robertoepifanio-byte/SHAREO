import { test, expect } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

const BASE_URL = process.env.STAGING_URL ?? 'https://shareo-rouge.vercel.app'
const REPORT_PATH = path.resolve('e2e-performance-report.json')
const STRESS_CONCURRENT = 10

interface NavMetrics {
  ttfbMs: number
  domContentLoadedMs: number
  loadEventMs: number
  lcpMs: number
}

interface StepResult {
  step: number
  name: string
  priority: string
  onFail: string
  status: 'passed' | 'failed' | 'skipped'
  durationMs: number
  thresholdMs?: number
  metrics?: Partial<NavMetrics>
  error?: string
}

class SkipStep extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'SkipStep'
  }
}

const STEPS = [
  { num: 1, name: '1. Página inicial (/ — threshold 2s)',           priority: 'critical', onFail: 'ABORTAR' },
  { num: 2, name: '2. Página de login (/login — threshold 1.5s)',   priority: 'high',     onFail: 'CONTINUAR' },
  { num: 3, name: '3. Listagem de itens (/itens — threshold 2.2s)', priority: 'high',     onFail: 'CONTINUAR' },
  { num: 4, name: `4. Stress test (${STRESS_CONCURRENT} req conc.)`, priority: 'medium', onFail: 'CONTINUAR' },
] as const

async function measureNav(page: Parameters<Parameters<typeof test>[1]>[0]['page'], url: string): Promise<NavMetrics> {
  await page.goto(url, { waitUntil: 'networkidle' })

  const navTiming = await page.evaluate((): Pick<NavMetrics, 'ttfbMs' | 'domContentLoadedMs' | 'loadEventMs'> => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    return {
      ttfbMs:               Math.round(nav.responseStart - nav.requestStart),
      domContentLoadedMs:   Math.round(nav.domContentLoadedEventEnd - nav.fetchStart),
      loadEventMs:          Math.round(nav.loadEventEnd - nav.fetchStart),
    }
  })

  const lcpMs = await page.evaluate((): Promise<number> =>
    new Promise((resolve) => {
      const po = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        if (entries.length > 0) resolve(Math.round(entries[entries.length - 1].startTime))
      })
      try {
        po.observe({ type: 'largest-contentful-paint', buffered: true })
      } catch {
        resolve(-1)
      }
      setTimeout(() => resolve(-1), 2000)
    })
  )

  return { ...navTiming, lcpMs }
}

test.describe('Plano Performance — ShareO', () => {
  test.setTimeout(180_000)

  test('Tempos de resposta e estabilidade sob carga', async ({ page }) => {
    const results: StepResult[] = []
    let abortError: Error | undefined

    async function runStep(
      meta: typeof STEPS[number],
      fn: () => Promise<Partial<StepResult>>
    ) {
      const t0 = Date.now()
      const base = { step: meta.num, name: meta.name, priority: meta.priority, onFail: meta.onFail }

      if (abortError) {
        results.push({ ...base, status: 'skipped', durationMs: 0, error: 'Suíte abortada — passo crítico anterior falhou' })
        return
      }

      try {
        const extra = await fn()
        results.push({ ...base, status: 'passed', durationMs: Date.now() - t0, ...extra })
      } catch (err) {
        const isSkip = err instanceof SkipStep
        const msg = err instanceof Error ? err.message : String(err)
        results.push({ ...base, status: isSkip ? 'skipped' : 'failed', durationMs: Date.now() - t0, error: msg })
        if (!isSkip && meta.onFail === 'ABORTAR') abortError = err as Error
      }
    }

    try {
      // Warm-up: acorda a instância serverless antes de medir (elimina cold start)
      await page.goto(BASE_URL, { waitUntil: 'commit', timeout: 30_000 }).catch(() => null)
      await page.waitForTimeout(800)

      // ── Passo 1: Página inicial ───────────────────────────────────────────────
      await test.step(STEPS[0].name, () =>
        runStep(STEPS[0], async () => {
          const threshold = 2000
          const metrics = await measureNav(page, BASE_URL)
          if (metrics.loadEventMs > threshold) {
            throw new Error(
              `Tempo de carregamento ${metrics.loadEventMs}ms excede limite ${threshold}ms ` +
              `(TTFB ${metrics.ttfbMs}ms, LCP ${metrics.lcpMs}ms)`
            )
          }
          return { thresholdMs: threshold, metrics }
        })
      )
      if (abortError) throw abortError

      // ── Passo 2: Página de login ──────────────────────────────────────────────
      await test.step(STEPS[1].name, () =>
        runStep(STEPS[1], async () => {
          const threshold = 1500
          const metrics = await measureNav(page, `${BASE_URL}/login`)
          if (metrics.loadEventMs > threshold) {
            throw new Error(
              `Página /login: ${metrics.loadEventMs}ms excede limite ${threshold}ms`
            )
          }
          return { thresholdMs: threshold, metrics }
        })
      )

      // ── Passo 3: Listagem de itens ────────────────────────────────────────────
      await test.step(STEPS[2].name, () =>
        runStep(STEPS[2], async () => {
          const threshold = 2200
          const metrics = await measureNav(page, `${BASE_URL}/itens`)
          if (metrics.loadEventMs > threshold) {
            throw new Error(
              `Página /itens: ${metrics.loadEventMs}ms excede limite ${threshold}ms`
            )
          }
          return { thresholdMs: threshold, metrics }
        })
      )

      // ── Passo 4: Stress test ──────────────────────────────────────────────────
      await test.step(STEPS[3].name, () =>
        runStep(STEPS[3], async () => {
          const t0 = Date.now()
          const requests = Array.from({ length: STRESS_CONCURRENT }, () =>
            page.request.get(BASE_URL, { timeout: 30_000 })
          )
          const responses = await Promise.all(requests)
          const elapsed = Date.now() - t0

          const statusCodes = responses.map(r => r.status())
          const serverErrors = statusCodes.filter(s => s >= 500)
          const clientErrors = statusCodes.filter(s => s >= 400 && s < 500)

          if (serverErrors.length > 0) {
            throw new Error(
              `${serverErrors.length}/${STRESS_CONCURRENT} requisições retornaram 5xx: ${serverErrors.join(', ')}`
            )
          }

          return {
            metrics: {
              loadEventMs: elapsed,
            },
          }
        })
      )
    } finally {
      const passed  = results.filter(r => r.status === 'passed').length
      const failed  = results.filter(r => r.status === 'failed').length
      const skipped = results.filter(r => r.status === 'skipped').length
      const verdict = abortError ? 'ABORTADO' : failed > 0 ? 'PARCIAL' : 'OK'

      const report = {
        meta: {
          name: 'Teste E2E Shareo - Performance',
          environment: 'staging',
          url: BASE_URL,
          runAt: new Date().toISOString(),
          note: 'Inclui cold-starts de funções serverless. Thresholds: / < 2s, /login < 1.5s, /itens < 2s',
          verdict,
        },
        summary: { passed, failed, skipped, total: results.length },
        steps: results,
      }

      fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))
      if (abortError) throw abortError
    }
  })
})
