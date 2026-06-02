import { test, chromium, firefox, webkit } from '@playwright/test'
import type { Browser } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

const BASE_URL = process.env.STAGING_URL ?? 'https://shareo-rouge.vercel.app'
const REPORT_PATH = path.resolve('e2e-crossbrowser-report.json')

interface StepResult {
  step: number
  name: string
  priority: string
  onFail: string
  status: 'passed' | 'failed' | 'skipped'
  durationMs: number
  error?: string
}

class SkipStep extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'SkipStep'
  }
}

const STEPS = [
  { num: 1, name: '1. Chrome (Chromium)', priority: 'critical', onFail: 'ABORTAR' },
  { num: 2, name: '2. Firefox',           priority: 'high',     onFail: 'CONTINUAR' },
  { num: 3, name: '3. Edge (Chromium)',   priority: 'high',     onFail: 'CONTINUAR' },
  { num: 4, name: '4. Safari (WebKit)',   priority: 'medium',   onFail: 'CONTINUAR' },
] as const

test.describe('Plano Cross-Browser — ShareO', () => {
  test.setTimeout(120_000)

  test('Carregar página inicial em múltiplos navegadores', async ({ page }) => {
    const results: StepResult[] = []
    let abortError: Error | undefined

    async function runStep(
      meta: typeof STEPS[number],
      fn: () => Promise<void>
    ) {
      const t0 = Date.now()
      const base = { step: meta.num, name: meta.name, priority: meta.priority, onFail: meta.onFail }

      if (abortError) {
        results.push({ ...base, status: 'skipped', durationMs: 0, error: 'Suíte abortada — passo crítico anterior falhou' })
        return
      }

      try {
        await fn()
        results.push({ ...base, status: 'passed', durationMs: Date.now() - t0 })
      } catch (err) {
        const isSkip = err instanceof SkipStep
        const msg = err instanceof Error ? err.message : String(err)
        results.push({ ...base, status: isSkip ? 'skipped' : 'failed', durationMs: Date.now() - t0, error: msg })
        if (!isSkip && meta.onFail === 'ABORTAR') abortError = err as Error
      }
    }

    async function loadBrowserPage(browser: Browser, label: string): Promise<void> {
      const ctx = await browser.newContext()
      try {
        const p = await ctx.newPage()
        const resp = await p.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 })
        if (!resp) throw new Error(`${label}: sem resposta`)
        if (resp.status() >= 400) throw new Error(`${label}: HTTP ${resp.status()}`)
        const title = await p.title()
        if (!title) throw new Error(`${label}: página sem título`)
      } finally {
        await ctx.close()
      }
    }

    try {
      await test.step(STEPS[0].name, () =>
        runStep(STEPS[0], async () => {
          const resp = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
          if (!resp) throw new Error('Sem resposta')
          if (resp.status() >= 400) throw new Error(`HTTP ${resp.status()}`)
          const title = await page.title()
          if (!title) throw new Error('Página sem título')
        })
      )
      if (abortError) throw abortError

      await test.step(STEPS[1].name, () =>
        runStep(STEPS[1], async () => {
          let browser: Browser | undefined
          try {
            browser = await firefox.launch({ timeout: 15_000 })
          } catch (e) {
            throw new SkipStep(`Firefox não instalado: ${(e as Error).message}`)
          }
          try {
            await loadBrowserPage(browser, 'Firefox')
          } finally {
            await browser.close()
          }
        })
      )

      await test.step(STEPS[2].name, () =>
        runStep(STEPS[2], async () => {
          let browser: Browser | undefined
          try {
            browser = await chromium.launch({ channel: 'msedge', timeout: 15_000 })
          } catch (e) {
            throw new SkipStep(`Edge não instalado: ${(e as Error).message}`)
          }
          try {
            await loadBrowserPage(browser, 'Edge')
          } finally {
            await browser.close()
          }
        })
      )

      await test.step(STEPS[3].name, () =>
        runStep(STEPS[3], async () => {
          let browser: Browser | undefined
          try {
            browser = await webkit.launch({ timeout: 15_000 })
          } catch (e) {
            throw new SkipStep(`WebKit/Safari não instalado: ${(e as Error).message}`)
          }
          try {
            await loadBrowserPage(browser, 'Safari/WebKit')
          } finally {
            await browser.close()
          }
        })
      )
    } finally {
      const passed  = results.filter(r => r.status === 'passed').length
      const failed  = results.filter(r => r.status === 'failed').length
      const skipped = results.filter(r => r.status === 'skipped').length
      const verdict = abortError ? 'ABORTADO' : failed > 0 ? 'PARCIAL' : skipped > 0 ? 'PARCIAL' : 'OK'

      const report = {
        meta: {
          name: 'Teste E2E Shareo - Cross-Browser',
          environment: 'staging',
          url: BASE_URL,
          runAt: new Date().toISOString(),
          note: 'Somente Chromium instalado localmente; Firefox/Edge/WebKit marcados como skipped se não disponíveis',
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
