/**
 * Plano de Teste E2E — ShareO Staging (Fluxo de Compartilhamento)
 *
 * Fluxo:
 *  1. Login (inclui cadastro de usuário de teste)
 *  2. Criar item (conteúdo para compartilhar)
 *  3. Gerar link de compartilhamento (/itens/[id])
 *  4. Acessar link como usuário externo (novo contexto, sem auth)
 *  5. Validar permissões de acesso (dono edita; não-autenticado bloqueado)
 *  6. Excluir conteúdo de teste
 *  7. Logout
 *
 * Restrições:
 *  - Somente staging — sem produção
 *  - Sem alterações de infra
 *  - Dados isolados por run (email/CPF únicos)
 *  - Logs locais: e2e-share-plan-report.json
 *  - Abortar em passo crítico
 */

import fs from 'fs'
import path from 'path'
import { test, expect } from '@playwright/test'
import { SESSION_PATHS } from './fixtures/test-credentials'

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
}

class SkipStep extends Error {
  constructor(reason: string) { super(reason); this.name = 'SkipStep' }
}

// ---------------------------------------------------------------------------
// CPF válido para testes
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
// Dados por run
// ---------------------------------------------------------------------------
const RUN_TS  = Date.now()
const BASE_URL = process.env.STAGING_URL ?? 'https://shareo-rouge.vercel.app'

const TEST_USER = {
  name:           'Share E2E Playwright',
  email:          `share_e2e_${RUN_TS}@shareo.test`,
  password:       'SenhaCompartilhar123',
  cpf:            generateValidCPF(),
  city:           'Natal',
  state:          'RN',
  consentVersion: 'v1.0',
}

const ITEM_TITLE = `Conteúdo E2E ${RUN_TS}`

let createdUserId: string | null = null
let createdItemId: string | null = null

// ---------------------------------------------------------------------------
// Suite principal
// ---------------------------------------------------------------------------

test('Plano E2E Compartilhamento — Login · Criar · Link · Externo · Permissões · Excluir · Logout', async ({ page }) => {
  test.setTimeout(180_000) // contextos externos adicionam latência

  const startTime = Date.now()
  const results: StepResult[] = []
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

  try {
    // -----------------------------------------------------------------------
    // Step 1 — Login (inclui cadastro de usuário de teste)  [critical]
    // -----------------------------------------------------------------------
    await runStep(1, '1. Login com usuário de teste', 'critical', async () => {
      // Cadastro via API (o plano não tem etapa de registro separada)
      const regRes = await page.request.post('/api/auth/register', {
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
      const regBody = await regRes.json() as { data?: { id: string }; error?: unknown }
      expect(
        regRes.status(),
        `Cadastro falhou (${regRes.status()}): ${JSON.stringify(regBody.error ?? regBody)}`,
      ).toBe(201)
      createdUserId = regBody.data!.id

      // Login via formulário UI
      await page.goto('/login')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.getByLabel(/e-?mail/i).fill(TEST_USER.email)
      await page.locator('input[type="password"]').fill(TEST_USER.password)
      await page.getByRole('button', { name: /entrar|login|acessar/i }).click()
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    })

    // -----------------------------------------------------------------------
    // Step 2 — Criar conteúdo para compartilhamento  [critical]
    // -----------------------------------------------------------------------
    await runStep(2, '2. Criar conteúdo para compartilhamento', 'critical', async () => {
      const catRes = await page.request.get('/api/categories')
      expect(catRes.ok(), 'GET /api/categories deve retornar 2xx').toBeTruthy()
      const { data: cats } = await catRes.json() as { data: { id: string }[] }
      expect(cats.length, 'Deve existir ao menos uma categoria').toBeGreaterThan(0)

      const res = await page.request.post('/api/items', {
        data: {
          title:       ITEM_TITLE,
          description: 'Fluxo de compartilhamento completo E2E — pode ser removido',
          categoryId:  cats[0].id,
          condition:   'GOOD',
          pricePerDay: 4500,
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

      // Visível em /meus-anuncios
      await page.goto('/meus-anuncios')
      await expect(page.getByText(ITEM_TITLE).first()).toBeVisible({ timeout: 15_000 })
    })

    // -----------------------------------------------------------------------
    // Step 3 — Gerar link de compartilhamento  [high]
    // -----------------------------------------------------------------------
    await runStep(3, '3. Gerar link de compartilhamento', 'high', async () => {
      if (!createdItemId) throw new SkipStep('Item não criado — step 2 falhou')

      const shareUrl = `${BASE_URL}/itens/${createdItemId}`

      // Acessa a URL pública enquanto autenticado como dono
      await page.goto(`/itens/${createdItemId}`)
      await expect(page).toHaveURL(new RegExp(`/itens/${createdItemId}`), { timeout: 15_000 })

      // Título aparece no breadcrumb (item atual)
      await expect(
        page.locator('[aria-current="page"]').filter({ hasText: ITEM_TITLE }),
      ).toBeVisible({ timeout: 10_000 })

      // Dono vê botão "Editar anúncio" (não PriceCalc)
      await expect(page.getByText('Editar anúncio')).toBeVisible({ timeout: 5_000 })

      // Log do link gerado
      test.info().annotations.push({ type: 'shareUrl', description: shareUrl })
    })

    // -----------------------------------------------------------------------
    // Step 4 — Acessar link como usuário externo (sem auth)  [high]
    // -----------------------------------------------------------------------
    await runStep(4, '4. Acessar link como usuário externo (mock)', 'high', async () => {
      if (!createdItemId) throw new SkipStep('Item não criado — step 2 falhou')

      const browser = page.context().browser()
      if (!browser) throw new Error('Browser não disponível para criar contexto externo')

      // Novo contexto sem cookies → simula visitante anônimo
      const externalCtx = await browser.newContext()
      try {
        const externalPage = await externalCtx.newPage()
        await externalPage.goto(`${BASE_URL}/itens/${createdItemId}`, {
          waitUntil: 'domcontentloaded',
          timeout:   30_000,
        })

        // Conteúdo acessível publicamente
        await expect(
          externalPage.locator('[aria-current="page"]').filter({ hasText: ITEM_TITLE }),
        ).toBeVisible({ timeout: 10_000 })

        // Visitante NÃO vê "Editar anúncio" (reservado ao dono autenticado)
        await expect(externalPage.getByText('Editar anúncio')).not.toBeVisible()

        // Visitante vê "Salvar nos favoritos" (controle de não-donos)
        await expect(
          externalPage.getByText('Salvar nos favoritos'),
        ).toBeVisible({ timeout: 8_000 })
      } finally {
        await externalCtx.close()
      }
    })

    // -----------------------------------------------------------------------
    // Step 5 — Validar permissões de acesso  [medium]
    // -----------------------------------------------------------------------
    await runStep(5, '5. Validar permissões de acesso', 'medium', async () => {
      if (!createdItemId) throw new SkipStep('Item não criado — step 2 falhou')

      // 5a — Dono autenticado consegue acessar a página de edição
      await page.goto(`/itens/${createdItemId}/editar`)
      await expect(page).toHaveURL(
        new RegExp(`/itens/${createdItemId}/editar`),
        { timeout: 15_000 },
      )
      await expect(
        page.getByRole('heading', { name: /editar anúncio/i }),
      ).toBeVisible({ timeout: 8_000 })

      // 5b — Usuário não autenticado é bloqueado → redirect para /login
      const browser = page.context().browser()
      if (!browser) throw new Error('Browser não disponível para contexto de não-autenticado')

      const unauthCtx = await browser.newContext()
      try {
        const unauthPage = await unauthCtx.newPage()
        await unauthPage.goto(`${BASE_URL}/itens/${createdItemId}/editar`, {
          waitUntil: 'networkidle',
          timeout:   30_000,
        })
        await expect(unauthPage).toHaveURL(/\/login/, { timeout: 10_000 })
        // callbackUrl preservado na query string
        expect(unauthPage.url()).toContain('callbackUrl')
      } finally {
        await unauthCtx.close()
      }
    })

    // -----------------------------------------------------------------------
    // Step 6 — Excluir conteúdo de teste  [medium]
    // -----------------------------------------------------------------------
    await runStep(6, '6. Excluir conteúdo de teste', 'medium', async () => {
      if (!createdItemId) throw new SkipStep('Item não criado — steps anteriores falharam')

      const delRes = await page.request.delete(`/api/items/${createdItemId}`)
      expect(delRes.status(), `Excluir item falhou: ${delRes.status()}`).toBe(204)

      // Item não mais acessível (soft-delete → API retorna 404)
      const checkRes = await page.request.get(`/api/items/${createdItemId}`)
      expect(checkRes.status(), 'Item deletado deve retornar 404 via API').toBe(404)

      createdItemId = null
    })

    // -----------------------------------------------------------------------
    // Step 7 — Logout  [low]
    // -----------------------------------------------------------------------
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
    // Relatório final — sempre gerado, mesmo em abort crítico
    // -----------------------------------------------------------------------
    const totalMs = Date.now() - startTime

    const passed  = results.filter((r) => r.status === 'passed').length
    const failed  = results.filter((r) => r.status === 'failed').length
    const skipped = results.filter((r) => r.status === 'skipped').length
    const verdict = abortError ? 'ABORTADO' : failed > 0 ? 'PARCIAL' : 'OK'

    const report = {
      meta: {
        name:        'Teste E2E Shareo - Compartilhamento',
        environment: 'staging',
        url:         BASE_URL,
        runAt:       new Date(RUN_TS).toISOString(),
        totalMs,
        verdict,
      },
      summary: { passed, failed, skipped, total: results.length },
      steps:   results,
    }

    const reportPath = path.resolve('e2e-share-plan-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

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

    if (abortError) throw abortError
  }
})

// ---------------------------------------------------------------------------
// Cleanup — desativar usuário de teste via admin API
// ---------------------------------------------------------------------------

test.describe('cleanup — desativar usuário de teste (share)', () => {
  test.skip(
    !fs.existsSync(SESSION_PATHS.admin),
    'session-admin.json não encontrado — rode: STAGING_URL=https://shareo-rouge.vercel.app pnpm tsx scripts/create-staging-fixtures.ts',
  )
  test.use({ storageState: SESSION_PATHS.admin })

  test('desativar usuário de teste via admin API', async ({ page }) => {
    test.skip(
      !createdUserId,
      'Nenhum userId registrado — step 1 (login) falhou ou foi pulado',
    )

    const res = await page.request.patch(`/api/admin/users/${createdUserId}`, {
      data: { action: 'deactivate' },
    })

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
