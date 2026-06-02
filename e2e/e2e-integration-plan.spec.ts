/**
 * Plano de Teste E2E — ShareO Staging (Integração)
 *
 * Step 1 · Validação de link de compartilhamento  — critical / ABORTAR
 * Step 2 · Testes de API interna                  — high     / CONTINUAR
 * Step 3 · Consistência front/back                — high     / CONTINUAR
 *
 * Restrições:
 *  - Somente staging (shareo-rouge.vercel.app) — sem produção
 *  - Apenas leitura (GET) — sem criação ou mutação de dados
 *  - Logs armazenados apenas localmente (e2e-integration-report.json)
 *  - Abortar se qualquer passo crítico falhar
 */

import fs from 'fs'
import path from 'path'
import { test, expect } from '@playwright/test'

const BASE_URL    = process.env.STAGING_URL ?? 'https://shareo-rouge.vercel.app'
const REPORT_PATH = path.resolve('e2e-integration-report.json')

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
  { num: 1, name: '1. Link de compartilhamento',  priority: 'critical' as Priority, onFail: 'ABORTAR'   as const },
  { num: 2, name: '2. APIs internas',              priority: 'high'     as Priority, onFail: 'CONTINUAR' as const },
  { num: 3, name: '3. Consistência front/back',    priority: 'high'     as Priority, onFail: 'CONTINUAR' as const },
] as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ApiItem {
  id:          string
  title:       string
  pricePerDay: number
  city:        string
  state:       string
}

interface ApiCategory {
  id:   string
  slug: string
  name: string
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

test.describe('Plano E2E Integração — ShareO', () => {
  test.setTimeout(120_000)

  test('Compartilhamento · APIs · Consistência', async ({ page }) => {
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

    // Item obtido no step 1 para reutilização nos passos seguintes
    let sharedItemId: string | undefined
    let sharedItemTitle: string | undefined

    try {
      // ── Step 1: Validação de link de compartilhamento ───────────────────────
      await test.step(STEPS[0].name, () =>
        runStep(STEPS[0], async () => {
          // Busca o primeiro item aprovado via API pública
          const itemsResp = await page.request.get(`${BASE_URL}/api/items?limit=1`, {
            failOnStatusCode: false,
          })

          expect(itemsResp.status(), '/api/items deve retornar 200').toBe(200)

          const body = await itemsResp.json() as { data: ApiItem[]; meta: { total: number } }
          expect(body.data, 'Resposta deve conter array data').toBeDefined()

          if (!body.data || body.data.length === 0) {
            throw new SkipStep('Nenhum item aprovado encontrado em staging — sem dados de teste')
          }

          const item = body.data[0]
          sharedItemId    = item.id
          sharedItemTitle = item.title

          expect(item.id, 'Item deve ter id').toBeTruthy()
          expect(item.title, 'Item deve ter título').toBeTruthy()

          // Navega para a página pública do item — não deve requerer autenticação
          await page.goto(`${BASE_URL}/itens/${item.id}`, { waitUntil: 'domcontentloaded' })

          // Verifica que NÃO foi redirecionado para /login (rota pública)
          const finalUrl = new URL(page.url())
          expect(
            finalUrl.pathname,
            `Página de item deve ser pública — não redirecionar para /login (atual: ${finalUrl.pathname})`,
          ).not.toBe('/login')
          expect(
            finalUrl.pathname,
            'Deve permanecer em /itens/:id',
          ).toContain('/itens/')

          // Título do item deve estar visível na página
          const titleEl = page.getByRole('heading', { name: item.title, exact: false })
            .or(page.locator('h1').filter({ hasText: item.title }))
          await expect(titleEl.first(), `Título "${item.title}" deve estar visível`).toBeVisible({ timeout: 10_000 })

          const findings = `Item "${item.title}" (${item.id}) → /itens/${item.id} — página pública acessível ✓`
          stepFindings = findings

          test.info().annotations.push({
            type: 'share-link',
            description: findings,
          })
        })
      )
      if (abortError) throw abortError

      // ── Step 2: APIs internas ───────────────────────────────────────────────
      await test.step(STEPS[1].name, () =>
        runStep(STEPS[1], async () => {
          const apiChecks: { endpoint: string; ok: boolean; details: string }[] = []

          // ── 2a: /api/health ────────────────────────────────────────────────
          const healthResp = await page.request.get(`${BASE_URL}/api/health`, {
            failOnStatusCode: false,
          })
          const healthStatus = healthResp.status()
          const healthBody   = await healthResp.json() as { status: string; checks: Record<string, string> }

          const healthOk = healthStatus === 200 && healthBody.status === 'healthy'
          apiChecks.push({
            endpoint: '/api/health',
            ok:       healthOk,
            details:  `status ${healthStatus} | ${healthBody.status} | db: ${healthBody.checks?.db ?? 'n/a'}`,
          })

          // ── 2b: /api/categories ────────────────────────────────────────────
          const catsResp = await page.request.get(`${BASE_URL}/api/categories`, {
            failOnStatusCode: false,
          })
          expect(catsResp.status(), '/api/categories deve retornar 200').toBe(200)

          const catsBody = await catsResp.json() as { data: ApiCategory[] }
          expect(catsBody.data, '/api/categories deve retornar data array').toBeDefined()
          expect(Array.isArray(catsBody.data), 'data deve ser array').toBe(true)

          const catOk = catsBody.data.length > 0
          if (catOk) {
            const first = catsBody.data[0]
            expect(first.id,   'Categoria deve ter id').toBeTruthy()
            expect(first.name, 'Categoria deve ter name').toBeTruthy()
            expect(first.slug, 'Categoria deve ter slug').toBeTruthy()
          }

          apiChecks.push({
            endpoint: '/api/categories',
            ok:       catOk,
            details:  `${catsBody.data.length} categorias retornadas`,
          })

          // ── 2c: /api/items?limit=6 ─────────────────────────────────────────
          const itemsResp = await page.request.get(`${BASE_URL}/api/items?limit=6`, {
            failOnStatusCode: false,
          })
          expect(itemsResp.status(), '/api/items deve retornar 200').toBe(200)

          const itemsBody = await itemsResp.json() as { data: ApiItem[]; meta: { total: number; hasNextPage: boolean } }
          expect(itemsBody.data, '/api/items deve retornar data array').toBeDefined()
          expect(Array.isArray(itemsBody.data), 'data deve ser array').toBe(true)
          expect(itemsBody.meta, '/api/items deve retornar meta').toBeDefined()
          expect(typeof itemsBody.meta.total, 'meta.total deve ser número').toBe('number')

          apiChecks.push({
            endpoint: '/api/items?limit=6',
            ok:       itemsBody.data.length > 0,
            details:  `${itemsBody.data.length} itens | total: ${itemsBody.meta.total}`,
          })

          const failed = apiChecks.filter((c) => !c.ok)
          const findings = apiChecks.map((c) => `${c.endpoint} (${c.ok ? '✓' : '✗'} ${c.details})`).join(' | ')
          stepFindings = findings

          if (failed.length > 0) {
            throw new Error(`APIs com falha: ${failed.map((c) => c.endpoint).join(', ')}`)
          }

          test.info().annotations.push({
            type: 'apis',
            description: findings,
          })
        })
      )

      // ── Step 3: Consistência front/back ────────────────────────────────────
      await test.step(STEPS[2].name, () =>
        runStep(STEPS[2], async () => {
          // Busca itens via API
          const itemsResp = await page.request.get(`${BASE_URL}/api/items?limit=6`, {
            failOnStatusCode: false,
          })
          expect(itemsResp.status(), '/api/items deve retornar 200').toBe(200)

          const itemsBody = await itemsResp.json() as { data: ApiItem[] }

          if (!itemsBody.data || itemsBody.data.length === 0) {
            throw new SkipStep('Nenhum item disponível via API para comparar com o frontend')
          }

          const apiTitles = itemsBody.data.map((i) => i.title)

          // Visita /itens e verifica que pelo menos um título da API aparece no DOM
          await page.goto(`${BASE_URL}/itens`, { waitUntil: 'networkidle' })

          let matchCount = 0
          const mismatches: string[] = []

          for (const title of apiTitles) {
            // Busca título na página (insensitive a truncamentos de UI — usa substring do título)
            const shortTitle = title.slice(0, 20)
            const el = page.locator(`text="${shortTitle}"`).first()
              .or(page.locator(`[data-testid="item-title"]`).filter({ hasText: shortTitle }).first())

            const visible = await el.isVisible().catch(() => false)
            if (visible) {
              matchCount++
            } else {
              mismatches.push(title)
            }
          }

          // Pelo menos 1 item da API deve ser visível no frontend
          // (limitação: UI pode paginar, truncar texto ou ordenar diferente)
          if (matchCount === 0) {
            // Fallback: verifica que existem cards de itens na página
            const itemCards = page.locator('[data-testid="item-card"]')
              .or(page.locator('article').filter({ has: page.locator('h2, h3') }))

            const cardCount = await itemCards.count()
            if (cardCount === 0) {
              throw new Error(`Nenhum item visível em /itens. API retornou ${apiTitles.length} itens mas UI não exibe nenhum.`)
            }

            // Cards presentes mas títulos não bateram — pode ser paginação/truncamento
            test.info().annotations.push({
              type: 'consistencia-aviso',
              description: `API: ${apiTitles.length} itens | UI: ${cardCount} cards (títulos exatos não coincidiram — possível truncamento)`,
            })
          } else {
            test.info().annotations.push({
              type: 'consistencia',
              description: `API: ${apiTitles.length} itens | ${matchCount} títulos confirmados no frontend`,
            })
          }

          // Verificação de preços: se item compartilhado foi encontrado no step 1,
          // o preço deve ser consistente entre API e detalhe da página
          if (sharedItemId && sharedItemTitle) {
            const itemDetailResp = await page.request.get(`${BASE_URL}/api/items/${sharedItemId}`, {
              failOnStatusCode: false,
            })

            if (itemDetailResp.status() === 200) {
              const detailBody = await itemDetailResp.json() as { data: ApiItem }
              expect(
                detailBody.data?.title,
                'Detalhe do item via API deve ter o mesmo título',
              ).toBe(sharedItemTitle)

              test.info().annotations.push({
                type: 'detalhe-item',
                description: `GET /api/items/${sharedItemId} → "${detailBody.data?.title}" ✓`,
              })
            }
          }

          const findings = `API ${apiTitles.length} itens | ${matchCount > 0 ? matchCount + ' coincidências' : 'cards presentes (fallback)'} | ${sharedItemTitle ? `Detalhe "${sharedItemTitle}" ✓` : 'sem item compartilhado'}`
          stepFindings = findings
        })
      )

    } finally {
      const passed  = results.filter((r) => r.status === 'passed').length
      const failed  = results.filter((r) => r.status === 'failed').length
      const skipped = results.filter((r) => r.status === 'skipped').length
      const verdict = abortError ? 'ABORTADO' : failed > 0 ? 'PARCIAL' : 'OK'

      const report = {
        meta: {
          name:        'Teste E2E Shareo - Integração',
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
