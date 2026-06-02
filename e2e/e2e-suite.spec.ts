/**
 * Suíte E2E Shareo Completa — 4 planos em sequência
 *
 *  Plano 1 · Autenticação      — critical / ABORTAR
 *  Plano 2 · Compartilhamento  — high    / CONTINUAR
 *  Plano 3 · Administração     — high    / CONTINUAR
 *  Plano 4 · Geral             — medium  / CONTINUAR
 *
 * Restrições:
 *  - Somente staging — sem produção
 *  - Sem alterações de infra
 *  - Dados isolados por plano (email/CPF únicos)
 *  - Logs locais: e2e-suite-report.json
 *  - Se plano crítico falhar, planos subsequentes são SKIPPED
 */

import fs from 'fs'
import path from 'path'
import { test, expect } from '@playwright/test'
import { SESSION_PATHS } from './fixtures/test-credentials'

// ---------------------------------------------------------------------------
// Tipos compartilhados
// ---------------------------------------------------------------------------

type Priority   = 'critical' | 'high' | 'medium' | 'low'
type StepStatus = 'passed' | 'failed' | 'skipped'
type PlanVerdict = 'OK' | 'PARCIAL' | 'ABORTADO' | 'SKIPPED'

interface StepResult {
  step:       number
  name:       string
  priority:   Priority
  onFail:     'ABORTAR' | 'CONTINUAR'
  status:     StepStatus
  durationMs: number
  error?:     string
}

interface PlanSummary {
  plan:      number
  name:      string
  priority:  'critical' | 'high' | 'medium'
  onFail:    'ABORTAR' | 'CONTINUAR'
  verdict:   PlanVerdict
  steps:     StepResult[]
  totalMs:   number
}

class SkipStep extends Error {
  constructor(reason: string) { super(reason); this.name = 'SkipStep' }
}

// ---------------------------------------------------------------------------
// Estado de suíte — compartilhado entre describe blocks (mesmo worker)
// ---------------------------------------------------------------------------

let   suiteShouldAbort = false
const suitePlanResults: PlanSummary[] = []
const suiteCreatedUserIds: string[]   = []
const SUITE_START = Date.now()
const BASE_URL    = process.env.STAGING_URL ?? 'https://shareo-rouge.vercel.app'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateValidCPF(): string {
  const rnd = () => Math.floor(Math.random() * 9)
  const d = Array.from({ length: 9 }, rnd)
  const r1 = d.reduce((s, n, i) => s + n * (10 - i), 0) % 11
  d.push(r1 < 2 ? 0 : 11 - r1)
  const r2 = d.reduce((s, n, i) => s + n * (11 - i), 0) % 11
  d.push(r2 < 2 ? 0 : 11 - r2)
  return `${d.slice(0, 3).join('')}.${d.slice(3, 6).join('')}.${d.slice(6, 9).join('')}-${d[9]}${d[10]}`
}

function makeUser(prefix: string, ts: number) {
  return {
    name:           `${prefix} E2E Suite`,
    email:          `${prefix.toLowerCase().replace(/\s+/g, '_')}_suite_${ts}@shareo.test`,
    password:       'SenhaSuite@2026',
    cpf:            generateValidCPF(),
    city:           'Natal',
    state:          'RN',
    consentVersion: 'v1.0',
  }
}

// step runner factory — retorna runner + results array para o plano
function makePlanRunner(results: StepResult[]) {
  let abortError: Error | undefined

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

  function getAbortError() { return abortError }
  return { runStep, getAbortError }
}

// helper para registar + logar usuário novo
async function registerAndLogin(page: Parameters<Parameters<typeof test>[1]>[0], user: ReturnType<typeof makeUser>) {
  const regRes = await page.request.post('/api/auth/register', {
    data: {
      name: user.name, email: user.email, password: user.password,
      userType: 'PF', cpf: user.cpf,
      city: user.city, state: user.state,
      phone: '+5584999999999', consentVersion: user.consentVersion,
    },
  })
  const regBody = await regRes.json() as { data?: { id: string }; error?: unknown }
  expect(regRes.status(), `Cadastro falhou (${regRes.status()}): ${JSON.stringify(regBody.error ?? regBody)}`).toBe(201)

  const userId = regBody.data!.id
  suiteCreatedUserIds.push(userId)

  await page.goto('/login')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByLabel(/e-?mail/i).fill(user.email)
  await page.locator('input[type="password"]').fill(user.password)
  await page.getByRole('button', { name: /entrar|login|acessar/i }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

  return userId
}

async function logout(page: Parameters<Parameters<typeof test>[1]>[0]) {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  const btn = page.getByRole('button', { name: /sair/i })
  await expect(btn).toBeVisible({ timeout: 8_000 })
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/dashboard'), { timeout: 20_000 }),
    btn.click(),
  ])
  await expect(page).not.toHaveURL(/\/dashboard/)
}

function pushPlanResult(
  planNum:  number,
  name:     string,
  priority: 'critical' | 'high' | 'medium',
  onFail:   'ABORTAR' | 'CONTINUAR',
  results:  StepResult[],
  abortError: Error | undefined,
  totalMs:  number,
) {
  const failed  = results.filter((r) => r.status === 'failed').length
  const verdict: PlanVerdict = abortError ? 'ABORTADO' : failed > 0 ? 'PARCIAL' : 'OK'
  suitePlanResults.push({ plan: planNum, name, priority, onFail, verdict, steps: results, totalMs })
  return verdict
}

// ============================================================================
// PLANO 1 — Autenticação  [critical / ABORTAR]
// ============================================================================

test.describe.serial('Plano 1 — Autenticação', () => {
  test('autenticação: registro · login · logout · recuperação de senha', async ({ page }) => {
    test.setTimeout(120_000)

    const ts      = Date.now()
    const user    = makeUser('Auth', ts)
    const t0      = Date.now()
    const results: StepResult[] = []
    const { runStep, getAbortError } = makePlanRunner(results)

    try {
      await runStep(1, '1. Página inicial', 'critical', async () => {
        await page.goto('/')
        await expect(page).toHaveTitle(/ShareO/)
        await expect(page.getByRole('banner')).toBeVisible()
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      })

      await runStep(2, '2. Cadastro de novo usuário', 'critical', async () => {
        await registerAndLogin(page, user)
      })

      await runStep(3, '3. Login com credenciais criadas', 'critical', async () => {
        // registerAndLogin já fez o login — só valida que dashboard está carregado
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 5_000 })
      })

      await runStep(4, '4. Logout', 'high', async () => {
        await logout(page)
      })

      await runStep(5, '5. Recuperação de senha (mock)', 'medium', async () => {
        await page.goto('/esqueci-senha')
        await page.waitForLoadState('networkidle')
        await expect(page.getByRole('heading', { name: /recuperar senha/i })).toBeVisible()
        await page.getByLabel(/e-?mail/i).fill(user.email)
        // aguarda fetch completar antes de checar o estado de sucesso
        await Promise.all([
          page.waitForResponse((r) => r.url().includes('/api/auth/forgot-password'), { timeout: 15_000 }),
          page.getByRole('button', { name: /enviar link/i }).click(),
        ])
        await expect(page.getByRole('heading', { name: /verifique seu e-?mail/i })).toBeVisible({ timeout: 15_000 })
        await expect(page.getByText(user.email)).toBeVisible({ timeout: 5_000 })
      })

    } finally {
      const abortError  = getAbortError()
      const verdict     = pushPlanResult(1, 'Autenticação', 'critical', 'ABORTAR', results, abortError, Date.now() - t0)
      if (abortError) suiteShouldAbort = true
      test.info().annotations.push({
        type: 'Plano 1',
        description: `Verdict: ${verdict} | steps: ${results.map((r) => `${r.status === 'passed' ? '✓' : '✗'} ${r.name}`).join(' · ')}`,
      })
      if (abortError) throw abortError
    }
  })
})

// ============================================================================
// PLANO 2 — Compartilhamento  [high / CONTINUAR]
// ============================================================================

test.describe.serial('Plano 2 — Compartilhamento', () => {
  test.beforeAll(() => {
    test.skip(suiteShouldAbort, 'Suíte abortada — plano crítico (Autenticação) falhou')
  })

  test('compartilhamento: login · criar · link · externo · permissões · excluir · logout', async ({ page }) => {
    test.setTimeout(180_000)

    const ts      = Date.now()
    const user    = makeUser('Share', ts)
    const title   = `Item Suite ${ts}`
    const t0      = Date.now()
    const results: StepResult[] = []
    const { runStep, getAbortError } = makePlanRunner(results)
    let itemId: string | null = null

    try {
      await runStep(1, '1. Login', 'critical', async () => {
        await registerAndLogin(page, user)
      })

      await runStep(2, '2. Criar item', 'critical', async () => {
        const catRes = await page.request.get('/api/categories')
        const { data: cats } = await catRes.json() as { data: { id: string }[] }
        const res = await page.request.post('/api/items', {
          data: {
            title, description: 'Item de teste da suíte E2E — pode ser removido',
            categoryId: cats[0].id, condition: 'GOOD', pricePerDay: 4500,
            city: 'Natal', state: 'RN', latitude: -5.7945, longitude: -35.211,
          },
        })
        const body = await res.json() as { data?: { id: string; title: string }; error?: unknown }
        expect(res.status(), `Criar item falhou: ${JSON.stringify(body.error ?? body)}`).toBe(201)
        itemId = body.data!.id
        await page.goto('/meus-anuncios')
        await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 })
      })

      await runStep(3, '3. Gerar link de compartilhamento', 'high', async () => {
        if (!itemId) throw new SkipStep('Item não criado')
        await page.goto(`/itens/${itemId}`)
        await expect(page.locator('[aria-current="page"]').filter({ hasText: title })).toBeVisible({ timeout: 10_000 })
        await expect(page.getByText('Editar anúncio')).toBeVisible()
        test.info().annotations.push({ type: 'shareUrl', description: `${BASE_URL}/itens/${itemId}` })
      })

      await runStep(4, '4. Acesso externo (sem auth)', 'high', async () => {
        if (!itemId) throw new SkipStep('Item não criado')
        const browser = page.context().browser()
        if (!browser) throw new Error('Browser não disponível')
        const extCtx = await browser.newContext()
        try {
          const extPage = await extCtx.newPage()
          await extPage.goto(`${BASE_URL}/itens/${itemId}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
          await expect(extPage.locator('[aria-current="page"]').filter({ hasText: title })).toBeVisible({ timeout: 10_000 })
          await expect(extPage.getByText('Editar anúncio')).not.toBeVisible()
          await expect(extPage.getByText('Salvar nos favoritos')).toBeVisible({ timeout: 8_000 })
        } finally { await extCtx.close() }
      })

      await runStep(5, '5. Validar permissões', 'medium', async () => {
        if (!itemId) throw new SkipStep('Item não criado')
        await page.goto(`/itens/${itemId}/editar`)
        await expect(page).toHaveURL(new RegExp(`/itens/${itemId}/editar`), { timeout: 15_000 })
        await expect(page.getByRole('heading', { name: /editar anúncio/i })).toBeVisible()

        const browser = page.context().browser()!
        const unauthCtx = await browser.newContext()
        try {
          const unauthPage = await unauthCtx.newPage()
          await unauthPage.goto(`${BASE_URL}/itens/${itemId}/editar`, { waitUntil: 'networkidle', timeout: 30_000 })
          await expect(unauthPage).toHaveURL(/\/login/, { timeout: 10_000 })
          expect(unauthPage.url()).toContain('callbackUrl')
        } finally { await unauthCtx.close() }
      })

      await runStep(6, '6. Excluir item', 'medium', async () => {
        if (!itemId) throw new SkipStep('Item não criado')
        // timeout explícito para não herdar actionTimeout: 25s do config
        const res = await page.request.delete(`/api/items/${itemId}`, { timeout: 60_000 })
        expect(res.status()).toBe(204)
        const check = await page.request.get(`/api/items/${itemId}`, { timeout: 60_000 })
        expect(check.status()).toBe(404)
        itemId = null
      })

      await runStep(7, '7. Logout', 'low', async () => { await logout(page) })

    } finally {
      const abortError = getAbortError()
      const verdict    = pushPlanResult(2, 'Compartilhamento', 'high', 'CONTINUAR', results, abortError, Date.now() - t0)
      // Limpa item órfão se deletado não aconteceu
      if (itemId) {
        await page.request.delete(`/api/items/${itemId}`).catch(() => {})
      }
      test.info().annotations.push({
        type: 'Plano 2',
        description: `Verdict: ${verdict} | steps: ${results.map((r) => `${r.status === 'passed' ? '✓' : '✗'} ${r.name}`).join(' · ')}`,
      })
      if (abortError) throw abortError
    }
  })
})

// ============================================================================
// PLANO 3 — Administração  [high / CONTINUAR]
// ============================================================================

test.describe.serial('Plano 3 — Administração', () => {
  test.beforeAll(() => {
    test.skip(suiteShouldAbort, 'Suíte abortada — plano crítico (Autenticação) falhou')
  })

  test('administração: login · perfil · bloqueio admin · logout', async ({ page }) => {
    test.setTimeout(120_000)

    const ts      = Date.now()
    const user    = makeUser('Admin', ts)
    const t0      = Date.now()
    const results: StepResult[] = []
    const { runStep, getAbortError } = makePlanRunner(results)

    try {
      await runStep(1, '1. Login', 'critical', async () => {
        await registerAndLogin(page, user)
      })

      await runStep(2, '2. Acessar perfil próprio', 'critical', async () => {
        await page.goto('/perfil')
        await expect(page).toHaveURL(/\/perfil/, { timeout: 15_000 })
        // h1 visível com o nome do usuário
        await expect(
          page.getByRole('heading', { level: 1, name: user.name }),
        ).toBeVisible({ timeout: 10_000 })
      })

      await runStep(3, '3. Usuário comum bloqueado de /admin', 'high', async () => {
        // Middleware: não-ADMIN autenticado → redirect para /dashboard
        await page.goto('/admin')
        await expect(page).not.toHaveURL(/\/admin$/, { timeout: 10_000 })
        // Pode ir para /dashboard ou /
        const url = page.url()
        expect(url).toMatch(/\/(dashboard|$)/)
      })

      await runStep(4, '4. Rotas /admin/* bloqueadas para não-autenticado', 'high', async () => {
        const browser = page.context().browser()!
        const unauthCtx = await browser.newContext()
        try {
          const unauthPage = await unauthCtx.newPage()
          await unauthPage.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 30_000 })
          // Middleware: sem token → redirect para /login
          await expect(unauthPage).toHaveURL(/\/login/, { timeout: 10_000 })
        } finally { await unauthCtx.close() }
      })

      await runStep(5, '5. Logout', 'low', async () => { await logout(page) })

    } finally {
      const abortError = getAbortError()
      const verdict    = pushPlanResult(3, 'Administração', 'high', 'CONTINUAR', results, abortError, Date.now() - t0)
      test.info().annotations.push({
        type: 'Plano 3',
        description: `Verdict: ${verdict} | steps: ${results.map((r) => `${r.status === 'passed' ? '✓' : '✗'} ${r.name}`).join(' · ')}`,
      })
      if (abortError) throw abortError
    }
  })
})

// ============================================================================
// PLANO 4 — Geral  [medium / CONTINUAR]
// ============================================================================

test.describe.serial('Plano 4 — Geral', () => {
  test.beforeAll(() => {
    test.skip(suiteShouldAbort, 'Suíte abortada — plano crítico (Autenticação) falhou')
  })

  test('geral: login · criar · editar · excluir · logout', async ({ page }) => {
    test.setTimeout(120_000)

    const ts      = Date.now()
    const user    = makeUser('Geral', ts)
    const title   = `Item Geral Suite ${ts}`
    const edited  = `Item Geral Suite Editado ${ts}`
    const t0      = Date.now()
    const results: StepResult[] = []
    const { runStep, getAbortError } = makePlanRunner(results)
    let itemId: string | null = null

    try {
      await runStep(1, '1. Login', 'critical', async () => {
        await registerAndLogin(page, user)
      })

      await runStep(2, '2. Criar item', 'high', async () => {
        const catRes = await page.request.get('/api/categories')
        const { data: cats } = await catRes.json() as { data: { id: string }[] }
        const res = await page.request.post('/api/items', {
          data: {
            title, description: 'CRUD geral da suíte E2E — pode ser removido',
            categoryId: cats[0].id, condition: 'GOOD', pricePerDay: 3000,
            city: 'Natal', state: 'RN', latitude: -5.7945, longitude: -35.211,
          },
        })
        const body = await res.json() as { data?: { id: string }; error?: unknown }
        expect(res.status(), `Criar item falhou: ${JSON.stringify(body.error ?? body)}`).toBe(201)
        itemId = body.data!.id
        await page.goto('/meus-anuncios')
        await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 })
      })

      await runStep(3, '3. Editar item', 'medium', async () => {
        if (!itemId) throw new SkipStep('Item não criado')
        const res = await page.request.put(`/api/items/${itemId}`, { data: { title: edited } })
        const body = await res.json() as { data?: { title: string }; error?: unknown }
        expect(res.status(), `Editar falhou: ${JSON.stringify(body.error ?? body)}`).toBe(200)
        expect(body.data?.title).toBe(edited)
        await page.goto('/meus-anuncios')
        await expect(page.getByText(edited).first()).toBeVisible({ timeout: 15_000 })
      })

      await runStep(4, '4. Excluir item', 'medium', async () => {
        if (!itemId) throw new SkipStep('Item não criado')
        const res = await page.request.delete(`/api/items/${itemId}`)
        expect(res.status()).toBe(204)
        itemId = null
      })

      await runStep(5, '5. Logout', 'low', async () => { await logout(page) })

    } finally {
      const abortError = getAbortError()
      const verdict    = pushPlanResult(4, 'Geral', 'medium', 'CONTINUAR', results, abortError, Date.now() - t0)
      if (itemId) {
        await page.request.delete(`/api/items/${itemId}`).catch(() => {})
      }
      test.info().annotations.push({
        type: 'Plano 4',
        description: `Verdict: ${verdict} | steps: ${results.map((r) => `${r.status === 'passed' ? '✓' : '✗'} ${r.name}`).join(' · ')}`,
      })
      if (abortError) throw abortError
    }
  })
})

// ============================================================================
// RELATÓRIO CONSOLIDADO
// ============================================================================

test.describe('Suite — Relatório Consolidado', () => {
  test('gerar relatório consolidado da suíte E2E', () => {
    const totalMs      = Date.now() - SUITE_START
    const plansOk      = suitePlanResults.filter((p) => p.verdict === 'OK').length
    const plansFailed  = suitePlanResults.filter((p) => p.verdict !== 'OK' && p.verdict !== 'SKIPPED').length
    const plansSkipped = suitePlanResults.filter((p) => p.verdict === 'SKIPPED').length
    const allSteps     = suitePlanResults.flatMap((p) => p.steps)
    const suiteVerdict: PlanVerdict =
      suiteShouldAbort ? 'ABORTADO' : plansFailed > 0 ? 'PARCIAL' : 'OK'

    const report = {
      meta: {
        name:        'Suíte E2E Shareo Completa',
        environment: 'staging',
        url:         BASE_URL,
        runAt:       new Date(SUITE_START).toISOString(),
        totalMs,
        verdict:     suiteVerdict,
      },
      summary: {
        plans: { ok: plansOk, failed: plansFailed, skipped: plansSkipped, total: suitePlanResults.length },
        steps: {
          passed:  allSteps.filter((s) => s.status === 'passed').length,
          failed:  allSteps.filter((s) => s.status === 'failed').length,
          skipped: allSteps.filter((s) => s.status === 'skipped').length,
          total:   allSteps.length,
        },
      },
      plans: suitePlanResults,
    }

    const reportPath = path.resolve('e2e-suite-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    const planLines = suitePlanResults.map((p) => {
      const icon = p.verdict === 'OK' ? '✓' : p.verdict === 'SKIPPED' ? '⊘' : '✗'
      return `  ${icon} Plano ${p.plan} [${p.priority.toUpperCase()} / ${p.onFail}] "${p.name}" — ${p.verdict} (${p.totalMs}ms, ${p.steps.length} steps)`
    })

    test.info().annotations.push({
      type: 'Suite Report',
      description:
        `Verdict: ${suiteVerdict} | Planos: ${plansOk}✓ ${plansFailed}✗ ${plansSkipped}⊘ | ` +
        `Steps: ${report.summary.steps.passed}✓ ${report.summary.steps.failed}✗ ${report.summary.steps.skipped}⊘ em ${totalMs}ms\n` +
        `Relatório: ${reportPath}\n\n` +
        planLines.join('\n'),
    })

    expect(suiteVerdict, `Suíte terminou com verdict ${suiteVerdict}`).not.toBe('ABORTADO')
  })
})

// ============================================================================
// CLEANUP — desativar todos os usuários de teste em batch
// ============================================================================

test.describe('Suite Cleanup — desativar usuários', () => {
  test.skip(
    !fs.existsSync(SESSION_PATHS.admin),
    'session-admin.json não encontrado — rode: STAGING_URL=https://shareo-rouge.vercel.app pnpm tsx scripts/create-staging-fixtures.ts',
  )
  test.use({ storageState: SESSION_PATHS.admin })

  test('desativar todos os usuários criados pela suíte', async ({ page }) => {
    test.skip(suiteCreatedUserIds.length === 0, 'Nenhum usuário registrado pela suíte')

    const results: { userId: string; status: number | 'expired-session' }[] = []

    for (const userId of suiteCreatedUserIds) {
      const res = await page.request.patch(`/api/admin/users/${userId}`, {
        data: { action: 'deactivate' },
      })

      const contentType = res.headers()['content-type'] ?? ''
      if (!contentType.includes('application/json')) {
        results.push({ userId, status: 'expired-session' })
        continue
      }
      results.push({ userId, status: res.status() })
    }

    const ok      = results.filter((r) => r.status === 200).length
    const expired = results.filter((r) => r.status === 'expired-session').length
    const failed  = results.filter((r) => r.status !== 200 && r.status !== 'expired-session').length

    test.info().annotations.push({
      type: 'cleanup',
      description:
        `${ok} usuários desativados · ${expired} sessão expirada · ${failed} falhas\n` +
        (expired > 0
          ? `Usuários pendentes: ${results.filter((r) => r.status === 'expired-session').map((r) => r.userId).join(', ')}\n` +
            `Recriar sessão admin: STAGING_URL=https://shareo-rouge.vercel.app pnpm tsx scripts/create-staging-fixtures.ts`
          : ''),
    })

    // Falha real (não expiração de sessão) deve ser reportada
    expect(failed, `${failed} usuário(s) não foram desativados por erro de API`).toBe(0)
  })
})
