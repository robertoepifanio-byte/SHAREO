import { test, expect } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

const BASE_URL = process.env.STAGING_URL ?? 'https://shareo-rouge.vercel.app'
const REPORT_PATH = path.resolve('e2e-home-report.json')

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
  { num: 1, name: '1. Carregamento e estrutura',       priority: 'critical', onFail: 'ABORTAR'   },
  { num: 2, name: '2. CTAs do hero',                   priority: 'high',     onFail: 'CONTINUAR' },
  { num: 3, name: '3. Busca no hero',                  priority: 'high',     onFail: 'CONTINUAR' },
  { num: 4, name: '4. Seções visíveis',                priority: 'medium',   onFail: 'CONTINUAR' },
  { num: 5, name: '5. Chips de ItensProcurados',       priority: 'medium',   onFail: 'CONTINUAR' },
] as const

test.describe('Plano E2E Homepage — ShareO', () => {
  test.setTimeout(120_000)

  test('Estrutura · CTAs · Busca · Seções · Chips', async ({ page }) => {
    const results: StepResult[] = []
    let abortError: Error | undefined

    async function runStep(
      meta: typeof STEPS[number],
      fn: () => Promise<void>,
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

    try {
      // ── Passo 1: Carregamento e estrutura ─────────────────────────────────────
      await test.step(STEPS[0].name, () =>
        runStep(STEPS[0], async () => {
          await page.goto(BASE_URL, { waitUntil: 'networkidle' })

          // H1 presente e visível
          const h1 = page.getByRole('heading', { level: 1 })
          await expect(h1).toBeVisible({ timeout: 10_000 })
          const h1Text = await h1.textContent()
          expect(h1Text?.trim().length, 'H1 deve ter conteúdo').toBeGreaterThan(0)

          // Seção principal (hero)
          await expect(page.locator('[aria-label="Seção principal"]')).toBeVisible()

          // Badge de proposta de valor
          await expect(page.locator('[role="note"][aria-label="Proposta de valor"]')).toBeVisible()

          // Header presente
          await expect(page.locator('header[role="banner"]')).toBeVisible()

          // Footer presente
          await expect(page.locator('footer[aria-label="Rodapé ShareO"]')).toBeVisible()

          // Stats da plataforma
          await expect(page.locator('[role="list"][aria-label="Números da plataforma"]')).toBeVisible()

          test.info().annotations.push({ type: 'h1', description: h1Text?.trim() ?? '' })
        })
      )
      if (abortError) throw abortError

      // ── Passo 2: CTAs do hero ─────────────────────────────────────────────────
      await test.step(STEPS[1].name, () =>
        runStep(STEPS[1], async () => {
          await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

          // CTA 1: "Quero Ganhar Dinheiro" → /itens/novo
          const ctaGanhar = page.getByRole('link', { name: /quero ganhar dinheiro/i })
          await expect(ctaGanhar).toBeVisible()
          const hrefGanhar = await ctaGanhar.getAttribute('href')
          expect(hrefGanhar, 'CTA Ganhar deve apontar para /itens/novo').toContain('/itens/novo')

          // /itens/novo requer auth — middleware redireciona para /login?callbackUrl=/itens/novo
          await Promise.all([
            page.waitForURL(
              (url) => url.pathname.includes('/itens/novo') || url.pathname === '/login',
              { timeout: 15_000 },
            ),
            ctaGanhar.click(),
          ])
          const url1 = new URL(page.url())
          const validCta1 = url1.pathname === '/itens/novo' ||
            (url1.pathname === '/login' && (url1.searchParams.get('callbackUrl') ?? '').includes('/itens/novo'))
          expect(validCta1, 'CTA Ganhar deve chegar a /itens/novo ou a /login com callbackUrl correto').toBe(true)
          await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

          // CTA 2: "Quero Alugar" → /itens
          const ctaAlugar = page.getByRole('link', { name: /quero alugar/i })
          await expect(ctaAlugar).toBeVisible()
          const hrefAlugar = await ctaAlugar.getAttribute('href')
          expect(hrefAlugar, 'CTA Alugar deve apontar para /itens').toContain('/itens')

          await Promise.all([
            page.waitForURL(/\/itens/, { timeout: 15_000 }),
            ctaAlugar.click(),
          ])

          test.info().annotations.push({
            type: 'ctas',
            description: `Ganhar → ${hrefGanhar} ✓ | Alugar → ${hrefAlugar} ✓`,
          })
        })
      )

      // ── Passo 3: Busca no hero ────────────────────────────────────────────────
      await test.step(STEPS[2].name, () =>
        runStep(STEPS[2], async () => {
          await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

          const searchInput = page.getByRole('searchbox').or(
            page.locator('input[name="search"]'),
          )
          await expect(searchInput).toBeVisible()
          await searchInput.fill('furadeira')

          await Promise.all([
            page.waitForURL((url) => url.pathname === '/itens' && url.searchParams.get('search') === 'furadeira', { timeout: 15_000 }),
            page.getByRole('button', { name: /buscar/i }).click(),
          ])

          const finalUrl = new URL(page.url())
          expect(finalUrl.pathname).toBe('/itens')
          expect(finalUrl.searchParams.get('search')).toBe('furadeira')

          test.info().annotations.push({ type: 'search-result-url', description: page.url() })
        })
      )

      // ── Passo 4: Seções visíveis ──────────────────────────────────────────────
      await test.step(STEPS[3].name, () =>
        runStep(STEPS[3], async () => {
          await page.goto(BASE_URL, { waitUntil: 'networkidle' })

          const sections: { id: string; label: string }[] = [
            { id: 'simulador-renda',  label: 'SimuladorRenda'    },
            { id: 'casos-renda',      label: 'CasosRenda'        },
            { id: 'itens-procurados', label: 'ItensProcurados'   },
            { id: 'seguranca',        label: 'Segurança'         },
            { id: 'lista-vip',        label: 'ListaVIP'          },
          ]

          const missing: string[] = []
          for (const sec of sections) {
            const el = page.locator(`#${sec.id}`)
            const visible = await el.isVisible().catch(() => false)
            if (!visible) missing.push(sec.label)
          }

          // "Como funciona" — section com h2 #how-title
          const howVisible = await page.locator('#how-title').isVisible().catch(() => false)
          if (!howVisible) missing.push('Como funciona')

          test.info().annotations.push({
            type: 'secoes',
            description: missing.length === 0
              ? '✓ Todas as seções visíveis'
              : `✗ Ausentes: ${missing.join(', ')}`,
          })

          if (missing.length > 0) {
            throw new Error(`Seções não encontradas na homepage: ${missing.join(', ')}`)
          }
        })
      )

      // ── Passo 5: Chips de ItensProcurados ─────────────────────────────────────
      await test.step(STEPS[4].name, () =>
        runStep(STEPS[4], async () => {
          await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

          // Chip "Furadeiras" sempre presente (dados hardcoded no componente)
          const chip = page.getByRole('listitem').filter({ has: page.locator('[aria-label="Buscar Furadeiras"]') })
            .or(page.locator('[aria-label="Buscar Furadeiras"]'))
          await expect(chip.first()).toBeVisible({ timeout: 10_000 })

          await Promise.all([
            page.waitForURL(
              (url) => url.pathname === '/itens' && !!url.searchParams.get('search'),
              { timeout: 15_000 },
            ),
            chip.first().click(),
          ])

          const finalUrl = new URL(page.url())
          expect(finalUrl.pathname).toBe('/itens')
          expect(finalUrl.searchParams.get('search')).toBeTruthy()

          test.info().annotations.push({
            type: 'chip-navegacao',
            description: `Chip Furadeiras → ${page.url()} ✓`,
          })
        })
      )

    } finally {
      const passed  = results.filter(r => r.status === 'passed').length
      const failed  = results.filter(r => r.status === 'failed').length
      const skipped = results.filter(r => r.status === 'skipped').length
      const verdict = abortError ? 'ABORTADO' : failed > 0 ? 'PARCIAL' : 'OK'

      const report = {
        meta: {
          name:        'Teste E2E Shareo - Homepage',
          environment: 'staging',
          url:         BASE_URL,
          runAt:       new Date().toISOString(),
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
