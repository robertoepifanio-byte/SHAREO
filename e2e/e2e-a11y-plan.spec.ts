/**
 * Plano de Teste E2E — ShareO Staging (Acessibilidade WCAG 2.1 AA)
 *
 * Step 1 · Contraste de cores    — critical / ABORTAR
 * Step 2 · Navegação por teclado — high    / CONTINUAR
 * Step 3 · ARIA e leitores de tela — high  / CONTINUAR
 * Step 4 · Validação de formulários — medium / CONTINUAR
 *
 * Motor: axe-core 4.9.1 injetado via page.addScriptTag (jest-axe transitive dep)
 * Relatório: e2e-a11y-report.json (WCAG compliance report local)
 */

import fs from 'fs'
import path from 'path'
import { test, expect, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// axe-core — caminho local (transitivo via jest-axe, não requer instalação extra)
// ---------------------------------------------------------------------------
const AXE_PATH = path.resolve(
  'node_modules/.pnpm/jest-axe@9.0.0/node_modules/axe-core/axe.min.js',
)

if (!fs.existsSync(AXE_PATH)) {
  throw new Error(`axe-core não encontrado em: ${AXE_PATH}`)
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type Priority   = 'critical' | 'high' | 'medium' | 'low'
type StepStatus = 'passed' | 'failed' | 'skipped'

interface AxeViolation {
  id:          string
  impact:      'critical' | 'serious' | 'moderate' | 'minor'
  description: string
  helpUrl:     string
  nodes:       { html: string; target: string[] }[]
}

interface PageAudit {
  url:        string
  violations: AxeViolation[]
  passes:     number
  incomplete: number
}

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function injectAxe(page: Page) {
  await page.addScriptTag({ path: AXE_PATH })
}

async function runAxe(
  page: Page,
  opts?: { runOnly?: string[]; include?: string }
): Promise<AxeViolation[]> {
  return page.evaluate((options) => {
    type AxeResults = { violations: AxeViolation[]; passes: unknown[]; incomplete: unknown[] }
    return (window as unknown as { axe: { run: (ctx: Document, opts: unknown) => Promise<AxeResults> } })
      .axe.run(document, {
        ...(options.runOnly && { runOnly: { type: 'rule', values: options.runOnly } }),
        resultTypes: ['violations', 'passes', 'incomplete'],
      })
      .then((r) => r.violations)
  }, opts ?? {})
}

async function auditPage(
  page: Page,
  url: string,
  runOnly?: string[],
): Promise<PageAudit> {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
  await injectAxe(page)

  const result = await page.evaluate(
    (options) => {
      type Res = { violations: AxeViolation[]; passes: unknown[]; incomplete: unknown[] }
      return (window as unknown as { axe: { run: (ctx: Document, opts: unknown) => Promise<Res> } })
        .axe.run(document, {
          ...(options.runOnly && { runOnly: { type: 'rule', values: options.runOnly } }),
          resultTypes: ['violations', 'passes', 'incomplete'],
        })
        .then((r) => ({
          violations: r.violations.map((v) => ({
            id:          v.id,
            impact:      v.impact,
            description: v.description,
            helpUrl:     v.helpUrl,
            nodes:       v.nodes.slice(0, 3).map((n) => ({ html: n.html.slice(0, 120), target: n.target })),
          })),
          passes:     r.passes.length,
          incomplete: r.incomplete.length,
        }))
    },
    { runOnly },
  ) as { violations: AxeViolation[]; passes: number; incomplete: number }

  return { url, ...result }
}

function summaryLine(audit: PageAudit) {
  const byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 }
  audit.violations.forEach((v) => { byImpact[v.impact] = (byImpact[v.impact] ?? 0) + 1 })
  const total = audit.violations.length
  return total === 0
    ? `${audit.url}: ✓ 0 violations (${audit.passes} passes)`
    : `${audit.url}: ✗ ${total} violations [${Object.entries(byImpact).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(', ')}]`
}

// ---------------------------------------------------------------------------
// Pages to audit
// ---------------------------------------------------------------------------
const PUBLIC_PAGES  = ['/', '/login', '/itens'] as const
const FORM_PAGES    = ['/login', '/cadastro'] as const

// ---------------------------------------------------------------------------
// Suite principal
// ---------------------------------------------------------------------------

test('Plano E2E Acessibilidade — Contraste · Teclado · ARIA · Formulários', async ({ page }) => {
  test.setTimeout(240_000)

  const startTime = Date.now()
  const results: StepResult[] = []
  let   abortError: Error | undefined

  // Page audits collected across steps — shared for the WCAG report
  const wcagAudits: PageAudit[] = []

  // -------------------------------------------------------------------------
  // Step runner
  // -------------------------------------------------------------------------
  async function runStep(
    num:      number,
    name:     string,
    priority: Priority,
    fn:       () => Promise<void>,
  ) {
    const onFail: StepResult['onFail'] = priority === 'critical' ? 'ABORTAR' : 'CONTINUAR'
    if (abortError) {
      results.push({ step: num, name, priority, onFail, status: 'skipped', durationMs: 0 })
      return
    }
    const t0 = Date.now()
    try {
      await test.step(name, fn)
      results.push({ step: num, name, priority, onFail, status: 'passed', durationMs: Date.now() - t0 })
    } catch (e) {
      const isSkip = e instanceof SkipStep
      const error  = e instanceof Error ? e.message.split('\n')[0] : String(e)
      results.push({
        step: num, name, priority, onFail,
        status:     isSkip ? 'skipped' : 'failed',
        durationMs: Date.now() - t0,
        error:      isSkip ? undefined : error,
      })
      if (priority === 'critical' && !isSkip) {
        abortError = e instanceof Error ? e : new Error(String(e))
      }
    }
  }

  try {
    // -----------------------------------------------------------------------
    // Step 1 — Contraste de cores  [critical / ABORTAR]
    // Regra axe: color-contrast (WCAG 1.4.3 AA = 4.5:1 normal, 3:1 large)
    // Falha se qualquer página tiver violações de impacto serious ou critical
    // -----------------------------------------------------------------------
    await runStep(1, '1. Contraste de cores (WCAG 1.4.3 AA)', 'critical', async () => {
      const contrastAudits: PageAudit[] = []

      for (const url of PUBLIC_PAGES) {
        const audit = await auditPage(page, url, ['color-contrast'])
        contrastAudits.push(audit)
        wcagAudits.push(audit)
      }

      const blocking = contrastAudits
        .flatMap((a) => a.violations)
        .filter((v) => v.impact === 'critical' || v.impact === 'serious')

      const summary = contrastAudits.map(summaryLine).join('\n')
      test.info().annotations.push({ type: 'contraste', description: summary })

      if (blocking.length > 0) {
        const details = blocking
          .map((v) => `  [${v.impact}] ${v.id}: ${v.description} — ${v.nodes[0]?.target[0] ?? '?'}`)
          .join('\n')
        throw new Error(`${blocking.length} violação(ões) de contraste WCAG AA:\n${details}`)
      }
    })

    // -----------------------------------------------------------------------
    // Step 2 — Navegação por teclado  [high / CONTINUAR]
    // Verifica: foco visível, ordem de Tab lógica no form de login
    // -----------------------------------------------------------------------
    await runStep(2, '2. Navegação por teclado', 'high', async () => {
      await page.goto('/login', { waitUntil: 'networkidle' })

      // 2a — axe regras de foco
      await injectAxe(page)
      const focusViolations = await runAxe(page, [
        'focus-visible', 'scrollable-region-focusable', 'tabindex',
      ])
      const focusBlocking = focusViolations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      )
      if (focusBlocking.length > 0) {
        const details = focusBlocking.map((v) => `[${v.impact}] ${v.id}`).join(', ')
        throw new Error(`Violações de navegabilidade: ${details}`)
      }

      // 2b — Tab order no formulário de login
      // DOM order: "Voltar" link → email input → "Esqueci" link → password input → eye button → submit → "Criar conta"
      await page.keyboard.press('Tab') // primeiro elemento focável na página

      const tabSequence: string[] = []
      for (let i = 0; i < 10; i++) {
        const info = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement
          if (!el || el === document.body) return null
          return {
            tag:   el.tagName,
            type:  el.getAttribute('type') ?? '',
            id:    el.id,
            label: el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 30) ?? '',
          }
        })
        if (!info) break
        tabSequence.push(`${info.tag}[${info.type || info.id || info.label}]`)
        await page.keyboard.press('Tab')
      }

      // Verifica que email e password estão na sequência de Tab
      const seqStr = tabSequence.join(' → ')
      const hasEmail    = tabSequence.some((s) => s.includes('email') || s.includes('E-mail'))
      const hasPassword = tabSequence.some((s) => s.includes('password') || s.includes('PASSWORD'))
      const hasSubmit   = tabSequence.some((s) => s.includes('submit') || s.includes('BUTTON'))
      test.info().annotations.push({ type: 'tab-order', description: seqStr })
      expect(hasEmail,    'Email input deve ser alcançável por Tab').toBe(true)
      expect(hasPassword, 'Password input deve ser alcançável por Tab').toBe(true)
      expect(hasSubmit,   'Submit button deve ser alcançável por Tab').toBe(true)

      // 2c — foco visível (ring ou outline) em pelo menos 1 elemento interativo
      await page.getByLabel(/e-?mail/i).focus()
      const hasFocusIndicator = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement
        if (!el) return false
        const s = window.getComputedStyle(el)
        const hasRing    = s.boxShadow !== 'none' && s.boxShadow !== ''
        const hasOutline = s.outlineWidth !== '0px' && s.outlineStyle !== 'none'
        return hasRing || hasOutline
      })
      expect(hasFocusIndicator, 'Input focado deve ter indicador visual de foco').toBe(true)

      // 2d — Enter no botão submit aciona a ação
      const submitBtn = page.getByRole('button', { name: /entrar/i })
      await submitBtn.focus()
      await page.keyboard.press('Enter')
      // Com campos vazios, signIn é chamado — aguarda resposta (erro ou redirect)
      await page.waitForTimeout(2_000)
      // Não houve redirect (campos vazios → erro) — ainda no /login
      await expect(page).toHaveURL(/\/login/)
    })

    // -----------------------------------------------------------------------
    // Step 3 — ARIA e compatibilidade com leitores de tela  [high / CONTINUAR]
    // Regras axe WCAG 2.1 AA (exceto color-contrast — feito no step 1)
    // Páginas: /, /login, /itens
    // -----------------------------------------------------------------------
    await runStep(3, '3. ARIA e leitores de tela (WCAG 2.1 AA)', 'high', async () => {
      const ariaAudits: PageAudit[] = []

      const ARIA_RULES = [
        'image-alt', 'label', 'button-name', 'input-button-name',
        'link-name', 'landmark-one-main', 'region', 'bypass',
        'aria-required-attr', 'aria-valid-attr', 'aria-valid-attr-value',
        'aria-hidden-body', 'aria-hidden-focus',
        'duplicate-id-aria', 'duplicate-id-active',
      ]

      for (const url of PUBLIC_PAGES) {
        // Re-audit only if not already in wcagAudits (step 1 only ran color-contrast)
        const audit = await auditPage(page, url, ARIA_RULES)
        ariaAudits.push(audit)
      }

      const blocking = ariaAudits
        .flatMap((a) => a.violations)
        .filter((v) => v.impact === 'critical' || v.impact === 'serious')

      const summary = ariaAudits.map(summaryLine).join('\n')
      test.info().annotations.push({ type: 'aria', description: summary })

      // Adiciona ao relatório consolidado (página já auditada com color-contrast antes)
      ariaAudits.forEach((a) => {
        const existing = wcagAudits.find((w) => w.url === a.url)
        if (existing) {
          existing.violations.push(...a.violations)
          existing.passes     += a.passes
          existing.incomplete += a.incomplete
        } else {
          wcagAudits.push(a)
        }
      })

      if (blocking.length > 0) {
        const details = blocking
          .map((v) => `  [${v.impact}] ${v.id}: ${v.description}`)
          .join('\n')
        throw new Error(`${blocking.length} violação(ões) ARIA WCAG AA:\n${details}`)
      }
    })

    // -----------------------------------------------------------------------
    // Step 4 — Validação de formulários  [medium / CONTINUAR]
    // Verifica mensagens de erro acessíveis nos formulários de login e cadastro
    // -----------------------------------------------------------------------
    await runStep(4, '4. Validação de formulários acessíveis', 'medium', async () => {
      // 4a — Login form: erro global com role="alert"
      await page.goto('/login', { waitUntil: 'networkidle' })
      await page.getByLabel(/e-?mail/i).fill('naoexiste@shareo.test')
      await page.locator('input[type="password"]').fill('SenhaErrada999!')

      await Promise.all([
        page.waitForResponse((r) => r.url().includes('/api/auth'), { timeout: 15_000 }),
        page.getByRole('button', { name: /entrar/i }).click(),
      ])

      const alertEl = page.locator('[role="alert"]')
      await expect(alertEl).toBeVisible({ timeout: 10_000 })
      const alertText = await alertEl.textContent()
      expect(alertText?.trim().length, 'Mensagem de erro deve ter conteúdo').toBeGreaterThan(0)

      // Axe sobre o estado de erro
      await injectAxe(page)
      const errorStateViolations = await runAxe(page, ['label', 'aria-required-attr'])
      const errorBlocking = errorStateViolations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      )

      test.info().annotations.push({
        type: 'form-login-error',
        description: `role="alert" presente: ✓ | texto: "${alertText?.trim()}" | axe blocking: ${errorBlocking.length}`,
      })

      // 4b — Input component: aria-invalid e aria-describedby (via axe na página de cadastro)
      await page.goto('/cadastro', { waitUntil: 'networkidle' })
      await injectAxe(page)

      // Checa que os inputs no cadastro têm label associado antes de qualquer erro
      const cadastroViolations = await runAxe(page, ['label', 'aria-required-attr'])
      const cadastroBlocking = cadastroViolations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      )

      test.info().annotations.push({
        type: 'form-cadastro',
        description: `Cadastro labels: ${cadastroBlocking.length === 0 ? '✓ OK' : `✗ ${cadastroBlocking.length} violações`}`,
      })

      // 4c — aria-live: verifica se existe região anunciável na homepage para buscas
      await page.goto('/', { waitUntil: 'networkidle' })
      const ariaLiveElements = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[aria-live], [role="alert"], [role="status"]'))
          .map((el) => ({
            tag:     el.tagName,
            role:    el.getAttribute('role'),
            live:    el.getAttribute('aria-live'),
            text:    el.textContent?.slice(0, 50),
          })),
      )
      test.info().annotations.push({
        type: 'aria-live-regions',
        description: `${ariaLiveElements.length} regiões aria-live/alert/status encontradas`,
      })

      const allFormBlocking = [...errorBlocking, ...cadastroBlocking]
      if (allFormBlocking.length > 0) {
        throw new Error(
          `${allFormBlocking.length} violação(ões) de acessibilidade em formulários: ` +
          allFormBlocking.map((v) => `[${v.impact}] ${v.id}`).join(', '),
        )
      }
    })

  } finally {
    // -----------------------------------------------------------------------
    // Relatório de conformidade WCAG — sempre gerado
    // -----------------------------------------------------------------------
    const totalMs = Date.now() - startTime

    const passed  = results.filter((r) => r.status === 'passed').length
    const failed  = results.filter((r) => r.status === 'failed').length
    const skipped = results.filter((r) => r.status === 'skipped').length
    const verdict = abortError ? 'ABORTADO' : failed > 0 ? 'PARCIAL' : 'OK'

    // Consolidate violations per impact
    const allViolations = wcagAudits.flatMap((a) => a.violations)
    const byImpact = {
      critical: allViolations.filter((v) => v.impact === 'critical').length,
      serious:  allViolations.filter((v) => v.impact === 'serious').length,
      moderate: allViolations.filter((v) => v.impact === 'moderate').length,
      minor:    allViolations.filter((v) => v.impact === 'minor').length,
    }

    const report = {
      meta: {
        name:        'Teste E2E Shareo - Acessibilidade',
        wcagLevel:   '2.1 AA',
        environment: 'staging',
        url:         process.env.STAGING_URL ?? 'https://shareo-rouge.vercel.app',
        runAt:       new Date().toISOString(),
        axeVersion:  '4.9.1',
        totalMs,
        verdict,
      },
      summary: {
        steps:          { passed, failed, skipped, total: results.length },
        pagesAudited:   wcagAudits.length,
        violations:     byImpact,
        totalViolations: allViolations.length,
      },
      steps: results,
      pages: wcagAudits.map((a) => ({
        url:        a.url,
        passes:     a.passes,
        incomplete: a.incomplete,
        violations: a.violations.map((v) => ({
          rule:        v.id,
          impact:      v.impact,
          description: v.description,
          helpUrl:     v.helpUrl,
          affectedElements: v.nodes.map((n) => n.target[0] ?? n.html.slice(0, 80)),
        })),
      })),
    }

    const reportPath = path.resolve('e2e-a11y-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    const stepLines = results.map((r) => {
      const icon  = r.status === 'passed' ? '✓' : r.status === 'failed' ? '✗' : '⊘'
      const badge = `[${r.priority.toUpperCase()} / ${r.onFail}]`
      const err   = r.error ? ` → ${r.error.slice(0, 120)}` : ''
      return `  ${icon} Step ${r.step} ${badge} "${r.name}"${err} (${r.durationMs}ms)`
    })

    test.info().annotations.push({
      type: 'WCAG Report',
      description:
        `Verdict: ${verdict} | ${passed}✓ ${failed}✗ ${skipped}⊘ em ${totalMs}ms\n` +
        `Violações: ${byImpact.critical} critical · ${byImpact.serious} serious · ` +
        `${byImpact.moderate} moderate · ${byImpact.minor} minor\n` +
        `Relatório: ${reportPath}\n\n` +
        stepLines.join('\n'),
    })

    if (abortError) throw abortError
  }
})
