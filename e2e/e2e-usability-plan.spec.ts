/**
 * Plano de Teste E2E — ShareO Staging (Usabilidade)
 *
 * Step 1 · Mensagens de feedback      — critical / ABORTAR
 * Step 2 · Consistência de navegação  — high     / CONTINUAR
 * Step 3 · Onboarding                 — medium   / CONTINUAR
 *
 * Restrições:
 *  - Somente staging (shareo-rouge.vercel.app) — sem produção
 *  - Sem criação de dados (apenas leitura de UI)
 *  - Logs armazenados apenas localmente (e2e-usability-report.json)
 *  - Abortar se qualquer passo crítico falhar
 */

import fs from 'fs'
import path from 'path'
import { test, expect } from '@playwright/test'

const BASE_URL    = process.env.STAGING_URL ?? 'https://shareo-rouge.vercel.app'
const REPORT_PATH = path.resolve('e2e-usability-report.json')

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
  { num: 1, name: '1. Mensagens de feedback',       priority: 'critical' as Priority, onFail: 'ABORTAR'   as const },
  { num: 2, name: '2. Consistência de navegação',   priority: 'high'     as Priority, onFail: 'CONTINUAR' as const },
  { num: 3, name: '3. Onboarding',                  priority: 'medium'   as Priority, onFail: 'CONTINUAR' as const },
] as const

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

test.describe('Plano E2E Usabilidade — ShareO', () => {
  test.setTimeout(120_000)

  test('Feedback · Navegação · Onboarding', async ({ page }) => {
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
      // ── Step 1: Mensagens de feedback ──────────────────────────────────────
      await test.step(STEPS[0].name, () =>
        runStep(STEPS[0], async () => {
          await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })

          // ── 1a: credenciais inválidas → mensagem de erro visível ───────────
          const emailInput = page.locator('input[type="email"]').or(page.locator('input[name="email"]'))
          const senhaInput = page.locator('input[type="password"]').first()

          await expect(emailInput, 'Campo email deve estar visível').toBeVisible({ timeout: 10_000 })
          await expect(senhaInput, 'Campo senha deve estar visível').toBeVisible()

          await emailInput.fill('usuario.invalido@naoexiste.com')
          await senhaInput.fill('senhaErrada123')

          const [response] = await Promise.all([
            page.waitForResponse(
              (r) => r.url().includes('/api/auth/callback/credentials'),
              { timeout: 20_000 },
            ),
            page.getByRole('button', { name: /entrar/i }).click(),
          ])

          // Aguarda a mensagem de erro aparecer no formulário
          const errorAlert = page.locator('form [role="alert"]')
          await expect(errorAlert).toBeVisible({ timeout: 10_000 })

          const errorText = (await errorAlert.textContent()) ?? ''
          expect(errorText.trim().length, 'Mensagem de erro deve ter conteúdo').toBeGreaterThan(0)

          test.info().annotations.push({
            type: 'login-error-msg',
            description: `✓ Erro de credenciais: "${errorText.trim().slice(0, 80)}"`,
          })

          // ── 1b: formulário vazio → validação client-side ───────────────────
          await page.reload({ waitUntil: 'domcontentloaded' })

          const emailInput2 = page.locator('input[type="email"]').or(page.locator('input[name="email"]'))
          await emailInput2.fill('')
          await page.getByRole('button', { name: /entrar/i }).click()

          // Browser nativo HTML5 ou validação React devem impedir submit
          // Verificamos que permanecemos em /login (não houve redirect)
          await page.waitForTimeout(1_000)
          const currentUrl = new URL(page.url())
          expect(currentUrl.pathname, 'Formulário vazio não deve redirecionar').toBe('/login')

          const findings = `Login inválido → erro visível ✓ | Form vazio → permanece em /login ✓`
          stepFindings = findings
        })
      )
      if (abortError) throw abortError

      // ── Step 2: Consistência de navegação ──────────────────────────────────
      await test.step(STEPS[1].name, () =>
        runStep(STEPS[1], async () => {
          await page.goto(BASE_URL, { waitUntil: 'networkidle' })

          // ── Header: logo e links de navegação ─────────────────────────────
          const header = page.locator('header[role="banner"]')
          await expect(header, 'Header deve estar presente').toBeVisible()

          // Logo ShareO — link para a homepage
          const logoLink = header.getByRole('link', { name: /shareo/i })
          await expect(logoLink.first(), 'Logo deve estar no header').toBeVisible()

          // Link para explorar itens
          const explorarLink = header.getByRole('link', { name: /explorar|itens/i })
          if (await explorarLink.count() > 0) {
            const href = await explorarLink.first().getAttribute('href')
            expect(href, 'Link Explorar deve apontar para /itens').toContain('/itens')
          }

          // Botões de auth (login/cadastro) visíveis para usuário não autenticado
          const authButtons = header.getByRole('link', { name: /entrar|login|cadastr/i })
          expect(
            await authButtons.count(),
            'Header deve ter botões de auth para usuário anônimo',
          ).toBeGreaterThan(0)

          // ── Footer presente ────────────────────────────────────────────────
          const footer = page.locator('footer[aria-label="Rodapé ShareO"]')
          await expect(footer, 'Footer deve estar presente').toBeVisible()

          // ── Navegação: homepage → /itens → voltar ─────────────────────────
          const itemsLink = page.getByRole('link', { name: /explorar|ver itens|alugar/i }).first()
          if (await itemsLink.isVisible()) {
            await Promise.all([
              page.waitForURL(/\/itens/, { timeout: 15_000 }),
              itemsLink.click(),
            ])

            // Header deve persistir em /itens
            const headerItens = page.locator('header[role="banner"]')
            await expect(headerItens, 'Header deve persistir em /itens').toBeVisible()
          }

          // ── Voltar para homepage via logo ──────────────────────────────────
          const logoBack = page.locator('header[role="banner"]').getByRole('link', { name: /shareo/i }).first()
          if (await logoBack.isVisible()) {
            await Promise.all([
              page.waitForURL((url) => url.pathname === '/', { timeout: 10_000 }),
              logoBack.click(),
            ])
          }

          const findings = 'Header ✓ | Logo ✓ | Auth buttons ✓ | Footer ✓ | Navegação home↔itens ✓'
          stepFindings = findings

          test.info().annotations.push({
            type: 'navegacao',
            description: findings,
          })
        })
      )

      // ── Step 3: Onboarding ──────────────────────────────────────────────────
      await test.step(STEPS[2].name, () =>
        runStep(STEPS[2], async () => {
          await page.goto(`${BASE_URL}/cadastro`, { waitUntil: 'domcontentloaded' })

          // ── Campos obrigatórios do formulário ─────────────────────────────
          // RegisterForm usa componente Input com label — sem atributo name
          const campos: { label: string; locator: ReturnType<typeof page.getByLabel> }[] = [
            { label: 'Nome completo', locator: page.getByLabel('Nome completo', { exact: false }) },
            { label: 'E-mail',        locator: page.getByLabel('E-mail',        { exact: false }) },
            { label: 'Senha',         locator: page.getByLabel('Senha',         { exact: false }).first() },
          ]

          const missingFields: string[] = []
          for (const campo of campos) {
            if (!await campo.locator.isVisible()) missingFields.push(campo.label)
          }

          if (missingFields.length > 0) {
            throw new Error(`Campos ausentes no formulário de cadastro: ${missingFields.join(', ')}`)
          }

          // ── CTA de submit visível e rotulado ──────────────────────────────
          const submitBtn = page.getByRole('button', { name: /criar|cadastr|registr/i })
          await expect(submitBtn.first(), 'Botão de submit deve estar visível').toBeVisible()

          // ── Link "Já tenho conta" → /login ────────────────────────────────
          const loginLink = page.getByRole('link', { name: /já tenho|entrar|login/i })
          if (await loginLink.count() > 0) {
            const href = await loginLink.first().getAttribute('href')
            expect(href, 'Link de login deve apontar para /login').toContain('/login')
          }

          // ── Homepage: proposta de valor visível ───────────────────────────
          await page.goto(BASE_URL, { waitUntil: 'networkidle' })

          const heroBadge = page.locator('[role="note"][aria-label="Proposta de valor"]')
          await expect(heroBadge, 'Badge de proposta de valor deve ser visível').toBeVisible({ timeout: 10_000 })

          const h1 = page.getByRole('heading', { level: 1 })
          await expect(h1, 'H1 deve ser visível na homepage').toBeVisible()
          const h1Text = await h1.textContent()
          expect((h1Text ?? '').trim().length, 'H1 deve ter conteúdo').toBeGreaterThan(0)

          const findings = `Cadastro: ${campos.length} campos (${campos.map((c) => c.label).join(', ')}) ✓ | CTA ✓ | Link login ✓ | Hero: "${(h1Text ?? '').trim().slice(0, 60)}"`
          stepFindings = findings

          test.info().annotations.push({
            type: 'onboarding',
            description: findings,
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
          name:        'Teste E2E Shareo - Usabilidade',
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
