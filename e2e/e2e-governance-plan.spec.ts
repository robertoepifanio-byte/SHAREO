/**
 * Plano de Teste E2E — ShareO Staging (Governança / Cleanup)
 *
 * Step 1 · Headers de segurança HTTP        — critical / ABORTAR
 * Step 2 · robots.txt e sitemap.xml         — high     / CONTINUAR
 * Step 3 · LGPD: endpoints de privacidade   — high     / CONTINUAR
 * Step 4 · Rate limiting                    — medium   / CONTINUAR
 * Step 5 · Integridade pós-testes           — medium   / CONTINUAR
 *
 * Restrições:
 *  - Somente staging (shareo-rouge.vercel.app) — sem produção
 *  - Apenas leitura e validação — sem mutação de dados
 *  - Logs armazenados apenas localmente (e2e-governance-report.json)
 *  - Abortar se qualquer passo crítico falhar
 */

import fs from 'fs'
import path from 'path'
import { test, expect } from '@playwright/test'

const BASE_URL    = process.env.STAGING_URL ?? 'https://shareo-rouge.vercel.app'
const REPORT_PATH = path.resolve('e2e-governance-report.json')

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
  { num: 1, name: '1. Headers de segurança HTTP',      priority: 'critical' as Priority, onFail: 'ABORTAR'   as const },
  { num: 2, name: '2. robots.txt e sitemap.xml',       priority: 'high'     as Priority, onFail: 'CONTINUAR' as const },
  { num: 3, name: '3. LGPD: endpoints de privacidade', priority: 'high'     as Priority, onFail: 'CONTINUAR' as const },
  { num: 4, name: '4. Rate limiting',                  priority: 'medium'   as Priority, onFail: 'CONTINUAR' as const },
  { num: 5, name: '5. Integridade pós-testes',         priority: 'medium'   as Priority, onFail: 'CONTINUAR' as const },
] as const

// ---------------------------------------------------------------------------
// Headers obrigatórios — configurados em next.config.ts via securityHeaders[]
// ---------------------------------------------------------------------------

const REQUIRED_HEADERS: { name: string; expected: string | RegExp }[] = [
  { name: 'x-frame-options',        expected: /sameorigin/i },
  { name: 'x-content-type-options', expected: /nosniff/i },
  { name: 'referrer-policy',        expected: /strict-origin/i },
  { name: 'permissions-policy',     expected: /camera/i },
  { name: 'content-security-policy',expected: /default-src/i },
]

// HSTS pode estar ausente em staging sem custom domain (Vercel injeta em prod)
const OPTIONAL_HEADERS = ['strict-transport-security']

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

test.describe('Plano E2E Governança — ShareO', () => {
  test.setTimeout(120_000)

  test('Headers · robots · LGPD · Rate limit · Integridade', async ({ page }) => {
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
      // ── Step 1: Headers de segurança HTTP ──────────────────────────────────
      await test.step(STEPS[0].name, () =>
        runStep(STEPS[0], async () => {
          const resp = await page.request.get(BASE_URL, { failOnStatusCode: false })

          expect(resp.status(), 'Homepage deve retornar 200').toBe(200)

          const headers = resp.headers()
          const missing: string[] = []
          const present: string[] = []

          for (const { name, expected } of REQUIRED_HEADERS) {
            const value = headers[name] ?? ''
            const ok = typeof expected === 'string'
              ? value.includes(expected)
              : expected.test(value)

            if (!ok) {
              missing.push(`${name}: "${value || '(ausente)'}"`)
            } else {
              present.push(`${name} ✓`)
            }
          }

          // HSTS — informativo em staging (sem custom domain)
          const hsts = headers['strict-transport-security'] ?? ''
          const hstsNote = hsts ? `HSTS: "${hsts.slice(0, 40)}" ✓` : 'HSTS: ausente (staging sem custom domain — ok)'

          // Não deve vazar versão do servidor
          const serverHeader = headers['server'] ?? ''
          const leaksVersion = /\d+\.\d+/.test(serverHeader) && !/vercel/i.test(serverHeader)
          if (leaksVersion) {
            missing.push(`server: "${serverHeader}" (vaza versão)`)
          }

          stepFindings = `${present.join(' | ')} | ${hstsNote} | Ausentes: ${missing.length === 0 ? 'nenhum' : missing.join('; ')}`

          if (missing.length > 0) {
            throw new Error(`Headers de segurança ausentes ou inválidos: ${missing.join('; ')}`)
          }

          test.info().annotations.push({
            type: 'security-headers',
            description: stepFindings,
          })
        })
      )
      if (abortError) throw abortError

      // ── Step 2: robots.txt e sitemap.xml ───────────────────────────────────
      await test.step(STEPS[1].name, () =>
        runStep(STEPS[1], async () => {
          // ── robots.txt ────────────────────────────────────────────────────
          const robotsResp = await page.request.get(`${BASE_URL}/robots.txt`, { failOnStatusCode: false })
          expect(robotsResp.status(), '/robots.txt deve retornar 200').toBe(200)

          const robotsText = await robotsResp.text()
          // robots.txt usa "User-Agent" (capital A) — verificação case-insensitive
          expect(robotsText.toLowerCase(), 'robots.txt deve ter user-agent').toContain('user-agent')
          expect(robotsText, 'robots.txt deve desautorizar /admin/').toContain('/admin')
          expect(robotsText, 'robots.txt deve desautorizar /api/').toContain('/api')
          expect(robotsText.toLowerCase(), 'robots.txt deve referenciar sitemap').toContain('sitemap')

          // ── sitemap.xml ───────────────────────────────────────────────────
          const sitemapResp = await page.request.get(`${BASE_URL}/sitemap.xml`, { failOnStatusCode: false })
          expect(sitemapResp.status(), '/sitemap.xml deve retornar 200').toBe(200)

          const sitemapText = await sitemapResp.text()
          const isXml = sitemapText.trimStart().startsWith('<?xml') || sitemapText.includes('<urlset')
          expect(isXml, 'sitemap.xml deve ser XML válido com <urlset').toBe(true)
          expect(sitemapText, 'sitemap.xml deve referenciar homepage').toContain(BASE_URL)

          // Conta URLs no sitemap (deve ter pelo menos homepage + /itens + items)
          const urlCount = (sitemapText.match(/<url>/g) ?? []).length
          expect(urlCount, 'sitemap.xml deve ter ao menos 3 URLs').toBeGreaterThanOrEqual(3)

          stepFindings = `robots.txt ✓ (Disallow: /admin, /api) | sitemap.xml ✓ (${urlCount} URLs)`

          test.info().annotations.push({
            type: 'seo-governance',
            description: stepFindings,
          })
        })
      )

      // ── Step 3: LGPD — endpoints de privacidade ────────────────────────────
      await test.step(STEPS[2].name, () =>
        runStep(STEPS[2], async () => {
          // O middleware do Next.js usa NextResponse.redirect (307) → não retorna 401 diretamente.
          // page.request segue o redirect: final URL = /login (200) ou /login sem suporte ao método (405).
          // "Protegido" = 401 OR redirected to /login OR 405 (método não permitido na página de login).
          function isProtected(status: number, finalUrl: string): boolean {
            return status === 401 ||
              status === 405 ||
              new URL(finalUrl).pathname === '/login'
          }

          const lgpdChecks: { endpoint: string; method: string; ok: boolean; actual: number; finalUrl: string }[] = []

          // GET /api/users/me — sem auth: middleware redireciona para /login (307→200)
          const meResp = await page.request.get(`${BASE_URL}/api/users/me`, { failOnStatusCode: false })
          lgpdChecks.push({ endpoint: '/api/users/me', method: 'GET', ok: isProtected(meResp.status(), meResp.url()), actual: meResp.status(), finalUrl: meResp.url() })

          // GET /api/users/me/export — portabilidade de dados (LGPD art. 20)
          const exportResp = await page.request.get(`${BASE_URL}/api/users/me/export`, { failOnStatusCode: false })
          lgpdChecks.push({ endpoint: '/api/users/me/export', method: 'GET', ok: isProtected(exportResp.status(), exportResp.url()), actual: exportResp.status(), finalUrl: exportResp.url() })

          // DELETE /api/users/me — direito ao esquecimento (LGPD art. 18)
          // 307 preserva o método → DELETE /login → 405 (login page não aceita DELETE)
          const deleteResp = await page.request.delete(`${BASE_URL}/api/users/me`, { failOnStatusCode: false })
          lgpdChecks.push({ endpoint: '/api/users/me', method: 'DELETE', ok: isProtected(deleteResp.status(), deleteResp.url()), actual: deleteResp.status(), finalUrl: deleteResp.url() })

          const violations = lgpdChecks.filter((c) => !c.ok)

          stepFindings = lgpdChecks
            .map((c) => `${c.method} ${c.endpoint} → status ${c.actual} final ${new URL(c.finalUrl).pathname} (${c.ok ? '✓ bloqueado' : '✗ acessível!'})`)
            .join(' | ')

          if (violations.length > 0) {
            throw new Error(
              `Endpoints LGPD acessíveis sem autenticação: ${violations.map((v) => `${v.method} ${v.endpoint} → ${v.actual} @ ${v.finalUrl}`).join('; ')}`,
            )
          }

          test.info().annotations.push({
            type: 'lgpd',
            description: stepFindings,
          })
        })
      )

      // ── Step 4: Rate limiting ───────────────────────────────────────────────
      await test.step(STEPS[3].name, () =>
        runStep(STEPS[3], async () => {
          // Endpoint: forgot-password (público, sem auth)
          // Envia 3 requests sequenciais para verificar:
          //   a) nenhum retorna 500 (falha interna)
          //   b) comportamento consistente (200 ou 429 — nunca leakage)
          const endpoint  = `${BASE_URL}/api/auth/forgot-password`
          const fakeEmail = `governance-test-noreply-${Date.now()}@naoexiste.test`

          const statuses: number[] = []
          let rate429 = false

          for (let i = 0; i < 3; i++) {
            const resp = await page.request.post(endpoint, {
              data:             { email: fakeEmail },
              failOnStatusCode: false,
            })
            statuses.push(resp.status())
            if (resp.status() === 429) rate429 = true
          }

          // Nenhuma chamada deve resultar em erro interno
          const serverErrors = statuses.filter((s) => s >= 500)
          if (serverErrors.length > 0) {
            throw new Error(`Rate limiting causou erro interno: respostas ${serverErrors.join(', ')}`)
          }

          // Todos devem ser 200 (success ocultado para evitar enumeração) ou 429 (rate limit)
          const unexpected = statuses.filter((s) => s !== 200 && s !== 201 && s !== 429 && s !== 400)
          if (unexpected.length > 0) {
            throw new Error(`Status inesperado em forgot-password: ${unexpected.join(', ')}`)
          }

          stepFindings = `3 requests → [${statuses.join(', ')}] | Rate limit 429 ativo: ${rate429 ? 'sim ✓' : 'não (abaixo do threshold — ok)'} | Erros 5xx: nenhum ✓`

          test.info().annotations.push({
            type: 'rate-limiting',
            description: stepFindings,
          })
        })
      )

      // ── Step 5: Integridade pós-testes ─────────────────────────────────────
      await test.step(STEPS[4].name, () =>
        runStep(STEPS[4], async () => {
          const checks: { route: string; ok: boolean; status: number; note: string }[] = []

          // ── /api/health — sistema saudável após todos os testes ───────────
          const healthResp = await page.request.get(`${BASE_URL}/api/health`, { failOnStatusCode: false })
          const healthBody = await healthResp.json() as { status: string; checks: Record<string, string> }
          checks.push({
            route:  '/api/health',
            ok:     healthResp.status() === 200 && healthBody.status === 'healthy',
            status: healthResp.status(),
            note:   `${healthBody.status} | db: ${healthBody.checks?.db ?? 'n/a'} | storage: ${healthBody.checks?.storage ?? 'n/a'}`,
          })

          // ── Rotas públicas primárias — devem retornar 200 ─────────────────
          for (const route of ['/', '/itens']) {
            const resp = await page.request.get(`${BASE_URL}${route}`, { failOnStatusCode: false })
            checks.push({
              route,
              ok:     resp.status() === 200,
              status: resp.status(),
              note:   `${resp.status()}`,
            })
          }

          // ── Contagem de itens — integridade do banco após testes ──────────
          const itemsResp = await page.request.get(`${BASE_URL}/api/items?limit=1`, { failOnStatusCode: false })
          if (itemsResp.status() === 200) {
            const itemsBody = await itemsResp.json() as { meta: { total: number } }
            const total = itemsBody.meta?.total ?? 0
            checks.push({
              route:  '/api/items',
              ok:     total > 0,
              status: itemsResp.status(),
              note:   `total: ${total} itens`,
            })
          }

          const failed = checks.filter((c) => !c.ok)
          stepFindings = checks.map((c) => `${c.route} → ${c.note} (${c.ok ? '✓' : '✗'})`).join(' | ')

          if (failed.length > 0) {
            throw new Error(`Sistema degradado pós-testes: ${failed.map((f) => `${f.route} ${f.note}`).join('; ')}`)
          }

          test.info().annotations.push({
            type: 'post-test-integrity',
            description: stepFindings,
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
          name:        'Teste E2E Shareo - Governança/Cleanup',
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
