import { test, expect } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'
import { assertNoFailedSteps } from './_support'

const BASE_URL = process.env.BASE_URL ?? process.env.STAGING_URL ?? 'http://localhost:3000'
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
  { num: 1, name: '1. Carregamento e estrutura',   priority: 'critical', onFail: 'ABORTAR'   },
  { num: 2, name: '2. CTA principal do hero',      priority: 'high',     onFail: 'CONTINUAR' },
  { num: 3, name: '3. Seções visíveis',            priority: 'medium',   onFail: 'CONTINUAR' },
  { num: 4, name: '4. CTAs de outras seções',       priority: 'medium',   onFail: 'CONTINUAR' },
] as const

test.describe('Plano E2E Homepage — ShareO', () => {
  test.setTimeout(120_000)

  test('Estrutura · CTA do hero · Seções · Outros CTAs', async ({ page }) => {

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

          // Hero (seção "topo" da landing transcrita)
          await expect(page.locator('#topo')).toBeVisible()

          // Header presente
          await expect(page.locator('header[role="banner"]')).toBeVisible()

          // Footer presente
          await expect(page.locator('footer[aria-label="Rodapé ShareO"]')).toBeVisible()

          test.info().annotations.push({ type: 'h1', description: h1Text?.trim() ?? '' })
        })
      )
      if (abortError) throw abortError

      // ── Passo 2: CTA principal do hero ────────────────────────────────────────
      await test.step(STEPS[1].name, () =>
        runStep(STEPS[1], async () => {
          await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

          // CTA "Quero ser um dos primeiros" → /cadastro (todo CTA da home aponta
          // para o cadastro de conta real, não para um formulário de lead)
          const ctaCadastro = page.getByRole('link', { name: /quero ser um dos primeiros/i })
          await expect(ctaCadastro).toBeVisible()
          const href = await ctaCadastro.getAttribute('href')
          expect(href, 'CTA do hero deve apontar para /cadastro').toContain('/cadastro')

          await Promise.all([
            page.waitForURL((url) => url.pathname === '/cadastro', { timeout: 15_000 }),
            ctaCadastro.click(),
          ])
          expect(new URL(page.url()).pathname).toBe('/cadastro')

          test.info().annotations.push({
            type: 'cta-hero',
            description: `Quero ser um dos primeiros → ${href} ✓`,
          })
        })
      )

      // ── Passo 3: Seções visíveis ──────────────────────────────────────────────
      await test.step(STEPS[2].name, () =>
        runStep(STEPS[2], async () => {
          await page.goto(BASE_URL, { waitUntil: 'networkidle' })

          const sections: { id: string; label: string }[] = [
            { id: 'topo',                 label: 'Hero'          },
            { id: 'para-quem',            label: 'Dois lados'    },
            { id: 'como-funciona',        label: 'Como funciona' },
            { id: 'seguranca',            label: 'Confiança'     },
            { id: 'fundadores',           label: 'Fundadores'    },
            { id: 'programa-embaixadores',label: 'Embaixadores'  },
            { id: 'faq',                  label: 'FAQ'           },
          ]

          const missing: string[] = []

          /**
           * `.catch(() => false)` cru reporta "seção ausente" para QUALQUER erro do
           * seletor. Separar contagem de visibilidade evita mascarar um id
           * duplicado como seção sumida (lição herdada da versão anterior deste
           * teste).
           */
          async function checarSecao(id: string, label: string) {
            const el = page.locator(`#${id}`)
            const n  = await el.count()
            if (n === 0) { missing.push(label); return }
            if (n > 1)   { missing.push(`${label} (id #${id} duplicado: ${n} elementos)`); return }
            if (!(await el.isVisible())) missing.push(`${label} (presente, mas não visível)`)
          }

          for (const sec of sections) await checarSecao(sec.id, sec.label)

          // Fechamento — section com h2 #fechamento-titulo
          await checarSecao('fechamento-titulo', 'Fechamento')

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

      // ── Passo 4: CTAs de outras seções ────────────────────────────────────────
      await test.step(STEPS[3].name, () =>
        runStep(STEPS[3], async () => {
          await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

          // Todo CTA da home aponta para /cadastro — checagem por amostragem em
          // seções diferentes do hero, para pegar um CtaCadastro esquecido
          // apontando pra âncora antiga da campanha.
          const rotulos = [/quero ganhar dinheiro/i, /quero anunciar meu item/i, /quero ser um fundador/i]

          for (const rotulo of rotulos) {
            const cta = page.getByRole('link', { name: rotulo }).first()
            await expect(cta).toBeVisible()
            const href = await cta.getAttribute('href')
            expect(href, `CTA "${rotulo}" deve apontar para /cadastro`).toContain('/cadastro')
          }

          test.info().annotations.push({
            type: 'ctas-secoes',
            description: 'Todos os CTAs amostrados apontam para /cadastro ✓',
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
      assertNoFailedSteps('Plano Homepage', results, abortError)
    }
  })
})
