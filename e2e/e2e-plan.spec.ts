/**
 * Plano de Teste E2E — ShareO Staging
 *
 * Fluxo: Homepage → Cadastro (API) → Login (UI) → Criar item → Editar item
 *        → Excluir item → Logout → Cleanup (desativar usuário)
 *
 * Restrições:
 *  - Somente staging (shareo-rouge.vercel.app) — sem produção
 *  - Sem alterações de infra
 *  - Dados de teste isolados (emails/CPFs únicos por run)
 *  - Logs armazenados apenas localmente (e2e-plan-report.json)
 *  - Abortar execução se qualquer passo crítico falhar
 */

import fs from 'fs'
import path from 'path'
import { test, expect } from '@playwright/test'
import { SESSION_PATHS } from './fixtures/test-credentials'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type Priority = 'critical' | 'high' | 'medium' | 'low'
type StepStatus = 'passed' | 'failed' | 'skipped'

interface StepResult {
  step: number
  name: string
  priority: Priority
  onFail: 'ABORTAR' | 'CONTINUAR'
  status: StepStatus
  durationMs: number
  error?: string
}

// Sinaliza dependência não satisfeita — registrado como 'skipped', não 'failed'
class SkipStep extends Error {
  constructor(reason: string) { super(reason); this.name = 'SkipStep' }
}

// ---------------------------------------------------------------------------
// CPF — gerador válido para testes (nunca reutiliza CPFs de fixtures)
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

// ---------------------------------------------------------------------------
// Dados únicos por run (email + CPF nunca conflitam com runs anteriores)
// ---------------------------------------------------------------------------
const RUN_TS = Date.now()

const TEST_USER = {
  name:           'Teste E2E Playwright',
  email:          `teste_e2e_${RUN_TS}@shareo.test`,
  password:       'SenhaForte123',
  cpf:            generateValidCPF(),
  city:           'Natal',
  state:          'RN',
  consentVersion: 'v1.0',
}

const ITEM_TITLE        = `Item E2E ${RUN_TS}`
const ITEM_TITLE_EDITED = `Item E2E Editado ${RUN_TS}`

// Estado compartilhado dentro do teste (mesma instância de page)
let createdUserId: string | null = null
let createdItemId: string | null = null

// ---------------------------------------------------------------------------
// Suite principal — sessão persiste em um único contexto de página
// ---------------------------------------------------------------------------

test('Plano E2E Completo — Registro · Login · CRUD item · Logout', async ({ page }) => {
  test.setTimeout(120_000)

  const startTime  = Date.now()
  const results: StepResult[] = []
  let   abortError: Error | undefined

  // -------------------------------------------------------------------------
  // Runner de steps
  //   critical  → on_fail: ABORTAR  — interrompe execução se falhar
  //   high/medium/low → on_fail: CONTINUAR — registra falha, segue em frente
  //   SkipStep  → status 'skipped' independente da prioridade
  // -------------------------------------------------------------------------
  async function runStep(
    num: number,
    name: string,
    priority: Priority,
    fn: () => Promise<void>,
  ) {
    const onFail: StepResult['onFail'] = priority === 'critical' ? 'ABORTAR' : 'CONTINUAR'

    // Passo anterior crítico falhou → todos os seguintes são skipped
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
        status:   isSkip ? 'skipped' : 'failed',
        durationMs: Date.now() - t0,
        error:    isSkip ? undefined : error,
      })
      if (priority === 'critical' && !isSkip) {
        abortError = e instanceof Error ? e : new Error(String(e))
      }
    }
  }

  // -------------------------------------------------------------------------
  // Execução dos steps
  // -------------------------------------------------------------------------
  try {
    // Step 1 — critical
    await runStep(1, '1. Página inicial', 'critical', async () => {
      await page.goto('/')
      await expect(page).toHaveTitle(/ShareO/)
      await expect(page.getByRole('banner')).toBeVisible()
      await expect(page.getByRole('main')).toBeVisible()
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })

    // Step 2 — critical
    await runStep(2, '2. Cadastro de novo usuário', 'critical', async () => {
      const res = await page.request.post('/api/auth/register', {
        data: {
          name:           TEST_USER.name,
          email:          TEST_USER.email,
          password:       TEST_USER.password,
          userType:       'PF',
          cpf:            TEST_USER.cpf,
          city:           TEST_USER.city,
          state:          TEST_USER.state,
          phone:          '+5584999999999',
          consentVersion: TEST_USER.consentVersion,
        },
      })
      const body = await res.json() as { data?: { id: string }; error?: unknown }
      expect(
        res.status(),
        `Cadastro falhou (${res.status()}): ${JSON.stringify(body.error ?? body)}`,
      ).toBe(201)
      expect(body.data?.id).toBeTruthy()
      createdUserId = body.data!.id
    })

    // Step 3 — critical
    await runStep(3, '3. Login com credenciais criadas', 'critical', async () => {
      await page.goto('/login')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.getByLabel(/e-?mail/i).fill(TEST_USER.email)
      await page.locator('input[type="password"]').fill(TEST_USER.password)
      await page.getByRole('button', { name: /entrar|login|acessar/i }).click()
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    })

    // Step 4 — high (CONTINUAR se falhar)
    await runStep(4, '4. Criar item de teste', 'high', async () => {
      const catRes = await page.request.get('/api/categories')
      expect(catRes.ok(), 'GET /api/categories deve retornar 2xx').toBeTruthy()
      const { data: categories } = await catRes.json() as { data: { id: string }[] }
      expect(categories.length, 'Deve existir ao menos uma categoria').toBeGreaterThan(0)

      const res = await page.request.post('/api/items', {
        data: {
          title:       ITEM_TITLE,
          description: 'Validação de fluxo completo E2E — pode ser removido',
          categoryId:  categories[0].id,
          condition:   'GOOD',
          pricePerDay: 3000,
          city:        'Natal',
          state:       'RN',
          latitude:    -5.7945,
          longitude:   -35.211,
        },
      })
      const body = await res.json() as { data?: { id: string; title: string }; error?: unknown }
      expect(
        res.status(),
        `Criar item falhou (${res.status()}): ${JSON.stringify(body.error ?? body)}`,
      ).toBe(201)
      expect(body.data?.title).toBe(ITEM_TITLE)
      createdItemId = body.data!.id

      await page.goto('/meus-anuncios')
      await expect(page.getByText(ITEM_TITLE).first()).toBeVisible({ timeout: 15_000 })
    })

    // Step 5 — medium (CONTINUAR; skipped se step 4 falhou)
    await runStep(5, '5. Editar item de teste', 'medium', async () => {
      if (!createdItemId) throw new SkipStep('Item não criado — step 4 falhou ou foi pulado')

      const res = await page.request.put(`/api/items/${createdItemId}`, {
        data: { title: ITEM_TITLE_EDITED },
      })
      const body = await res.json() as { data?: { id: string; title: string }; error?: unknown }
      expect(
        res.status(),
        `Editar item falhou (${res.status()}): ${JSON.stringify(body.error ?? body)}`,
      ).toBe(200)
      expect(body.data?.title).toBe(ITEM_TITLE_EDITED)

      await page.goto('/meus-anuncios')
      await expect(page.getByText(ITEM_TITLE_EDITED).first()).toBeVisible({ timeout: 15_000 })
    })

    // Step 6 — medium (CONTINUAR; skipped se step 4 falhou)
    await runStep(6, '6. Excluir item de teste', 'medium', async () => {
      if (!createdItemId) throw new SkipStep('Item não existe — steps 4/5 falharam ou foram pulados')

      const res = await page.request.delete(`/api/items/${createdItemId}`)
      expect(res.status(), `Excluir item falhou: ${res.status()}`).toBe(204)

      await page.goto('/meus-anuncios')
      await page.waitForLoadState('networkidle')
      await expect(page.getByText(ITEM_TITLE_EDITED)).not.toBeVisible({ timeout: 10_000 })
      createdItemId = null
    })

    // Step 7 — low (CONTINUAR)
    await runStep(7, '7. Logout', 'low', async () => {
      await page.goto('/dashboard')
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

      const logoutBtn = page.getByRole('button', { name: /sair/i })
      await expect(logoutBtn).toBeVisible({ timeout: 8_000 })

      await Promise.all([
        page.waitForURL((url) => !url.pathname.includes('/dashboard'), { timeout: 20_000 }),
        logoutBtn.click(),
      ])
      await expect(page).not.toHaveURL(/\/dashboard/)
    })

  } finally {
    // -----------------------------------------------------------------------
    // Relatório final — sempre gerado, mesmo em caso de abort crítico
    // -----------------------------------------------------------------------
    const totalMs = Date.now() - startTime

    const passed  = results.filter((r) => r.status === 'passed').length
    const failed  = results.filter((r) => r.status === 'failed').length
    const skipped = results.filter((r) => r.status === 'skipped').length
    const verdict = abortError ? 'ABORTADO' : failed > 0 ? 'PARCIAL' : 'OK'

    const report = {
      meta: {
        name:        'Teste E2E Shareo',
        environment: 'staging',
        url:         process.env.STAGING_URL ?? 'https://shareo-rouge.vercel.app',
        runAt:       new Date(RUN_TS).toISOString(),
        totalMs,
        verdict,
      },
      summary: { passed, failed, skipped, total: results.length },
      steps:   results,
    }

    // Escreve JSON localmente
    const reportPath = path.resolve('e2e-plan-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    // Emite como anotação no relatório HTML do Playwright
    const stepLines = results.map((r) => {
      const icon  = r.status === 'passed' ? '✓' : r.status === 'failed' ? '✗' : '⊘'
      const badge = `[${r.priority.toUpperCase()} / ${r.onFail}]`
      const err   = r.error ? ` → ${r.error}` : ''
      return `  ${icon} Step ${r.step} ${badge} "${r.name}"${err} (${r.durationMs}ms)`
    })

    test.info().annotations.push({
      type: 'E2E Report',
      description:
        `Verdict: ${verdict} | ${passed}✓ ${failed}✗ ${skipped}⊘ em ${totalMs}ms\n` +
        `Relatório: ${reportPath}\n\n` +
        stepLines.join('\n'),
    })

    // Re-throw para que o Playwright marque o teste como failed se houve abort
    if (abortError) throw abortError
  }
})

// ---------------------------------------------------------------------------
// Cleanup — desativar usuário de teste via admin API
// ---------------------------------------------------------------------------

test.describe('cleanup — desativar usuário de teste', () => {
  test.skip(
    !fs.existsSync(SESSION_PATHS.admin),
    'session-admin.json não encontrado — rode: STAGING_URL=https://shareo-rouge.vercel.app pnpm tsx scripts/create-staging-fixtures.ts',
  )
  test.use({ storageState: SESSION_PATHS.admin })

  test('desativar usuário de teste via admin API', async ({ page }) => {
    test.skip(
      !createdUserId,
      'Nenhum userId registrado — step 2 (cadastro) falhou ou foi pulado',
    )

    const res = await page.request.patch(`/api/admin/users/${createdUserId}`, {
      data: { action: 'deactivate' },
    })

    // Sessão expirada: middleware redireciona para /login → HTML, não JSON
    const contentType = res.headers()['content-type'] ?? ''
    if (!contentType.includes('application/json')) {
      test.info().annotations.push({
        type: 'warning',
        description:
          `Sessão admin expirada (HTTP ${res.status()}). ` +
          `Recriar com: STAGING_URL=https://shareo-rouge.vercel.app pnpm tsx scripts/create-staging-fixtures.ts\n` +
          `userId pendente de remoção: ${createdUserId}`,
      })
      return
    }

    const body = await res.json() as { data?: { isActive: boolean }; error?: unknown }
    expect(
      res.status(),
      `Desativar usuário falhou (${res.status()}): ${JSON.stringify(body.error ?? body)}`,
    ).toBe(200)
    expect(body.data?.isActive).toBe(false)
  })
})
