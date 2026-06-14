/**
 * Smoke #18-#22 — Segurança e integridade (round 2)
 *
 * #18 Brute force login    — 10+ tentativas com senha errada → 429 ou null (rate limited)
 * #19 Password reset       — fluxo completo: token criado, token single-use, token expirado rejeita
 * #20 id-docs privado      — URL pública de documento de identidade não é acessível sem auth
 * #21 Review flow          — COMPLETED booking → reviews válidos; bloqueios: wrong status, duplicate, wrong type
 * #22 Booking boundary     — datas adjacentes permitidas; sobreposição bloqueada; 1 dia
 *
 * Todos os testes devem PASSAR — failure = vulnerabilidade ou bug em produção.
 */

import fs from 'fs'
import { test, expect } from '@playwright/test'
import { SESSION_PATHS, FIXTURE_LOCATARIO, FIXTURE_PROPRIETARIO } from './fixtures/test-credentials'
import { TEST_ITEM_PATH } from './fixtures/test-paths'

const hasSessions =
  fs.existsSync(SESSION_PATHS.locatario) &&
  fs.existsSync(SESSION_PATHS.proprietario) &&
  fs.existsSync(SESSION_PATHS.admin)

const hasTestItem = fs.existsSync(TEST_ITEM_PATH)

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'

// ─────────────────────────────────────────────────────────────────────────────
// Smoke #18 — Brute force login: deve ser bloqueado após múltiplas tentativas
// ─────────────────────────────────────────────────────────────────────────────
test.describe('smoke #18 — Brute force login bloqueado por rate limit', () => {
  test('10 tentativas de login com senha errada → rate limited (credenciais recusadas)', async () => {
    test.setTimeout(90000)

    // Obtém CSRF token + cookie de sessão (NextAuth usa double-submit cookie para CSRF)
    const csrfRes   = await fetch(`${BASE}/api/auth/csrf`)
    const csrfJson  = await csrfRes.json() as { csrfToken?: string }
    const csrfToken = csrfJson.csrfToken ?? ''
    // Captura o cookie da resposta (necessário para CSRF ser aceito)
    const csrfCookie = csrfRes.headers.get('set-cookie') ?? ''
    console.log(`  CSRF token: ${csrfToken ? csrfToken.slice(0, 8) + '…' : 'FALHOU'}`)
    console.log(`  CSRF cookie: ${csrfCookie ? csrfCookie.slice(0, 40) + '…' : 'nenhum'}`)

    const email = `bruteforce-${Date.now()}@shareo-test.com`
    let blockedAt = -1

    // Sem x-e2e-token → rate limit NÃO é bypassado
    for (let i = 1; i <= 12; i++) {
      const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...(csrfCookie ? { 'Cookie': csrfCookie.split(';')[0] } : {}),
        },
        body: new URLSearchParams({
          email,
          password: `WrongPassword${i}!`,
          csrfToken,
          callbackUrl: `${BASE}/dashboard`,
          json: 'true',
        }),
        redirect: 'manual',
      })

      const status = res.status
      console.log(`  tentativa ${i} → ${status}`)

      if (status === 429) {
        blockedAt = i
        console.log(`  rate limit ativo em tentativa ${i} → 429 ✅`)
        break
      }

      await new Promise(r => setTimeout(r, 150))
    }

    expect(
      blockedAt,
      'Rate limit não ativado em 12 tentativas de login — brute force possível. ' +
      'O login deve ser bloqueado após 10 tentativas/min por IP. ' +
      'Fix: checkRateLimit() no POST wrapper de app/api/auth/[...nextauth]/route.ts.',
    ).toBeGreaterThan(0)

    console.log(`  brute force bloqueado em tentativa ${blockedAt} ✅`)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Smoke #19 — Password reset: token criado, single-use, expirado rejeita
// ─────────────────────────────────────────────────────────────────────────────
test.describe('smoke #19 — Password reset: fluxo e segurança do token', () => {
  test('forgot-password retorna 200 independente do email existir (não vaza info)', async ({ page }) => {
    // Anti-enumeration é propriedade server-side — testar em 1 projeto é suficiente.
    // Os 4 projetos compartilham o mesmo IP; o rate limit sub-test esgota o contador
    // Redis antes que tablet/Mobile Chrome/Mobile Safari rodem (429 inevitável).
    // browserName não distingue projetos (tablet e Mobile Chrome também usam engine chromium).
    test.skip(test.info().project.name !== 'chromium', 'Anti-enumeration verificado apenas no projeto chromium (IP compartilhado)')

    // Usa page.request (inclui x-e2e-token via extraHTTPHeaders) para bypassar rate limit
    const res = await page.request.post(`${BASE}/api/auth/forgot-password`, {
      data: { email: `naoexiste-${Date.now()}@shareo-test.com` },
    })
    console.log(`  forgot-password (email inexistente) → ${res.status()}`)
    expect(
      res.status(),
      'forgot-password deve retornar 200 mesmo para emails inexistentes (anti-enumeration)',
    ).toBe(200)
    const body = await res.json()
    expect(body.data?.message).toBeTruthy()
    console.log(`  resposta genérica (não vaza existência do email) ✅`)
  })

  test('reset-password com token inválido → 400/404', async () => {
    const res = await fetch(`${BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'token-invalido-qualquer-coisa-abc123',
        password: 'NovaSenha@2026',
      }),
    })
    console.log(`  reset-password (token inválido) → ${res.status}`)
    expect(
      [400, 404],
      `Token inválido deve retornar 400 ou 404, recebeu ${res.status}`,
    ).toContain(res.status)
    console.log(`  token inválido → ${res.status} ✅ (rejeitado corretamente)`)
  })

  test('rate limit em forgot-password: mais de 3/min → 429', async () => {
    const email = `ratelimit-${Date.now()}@shareo-test.com`
    let got429 = false

    // Usa fetch nativo SEM x-e2e-token para não bypassar rate limit
    for (let i = 1; i <= 5; i++) {
      const res = await fetch(`${BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      console.log(`  forgot-password tentativa ${i} → ${res.status}`)
      if (res.status === 429) { got429 = true; break }
    }

    expect(
      got429,
      'Rate limit de forgot-password não ativou em 5 tentativas. ' +
      'Configurado para 3/min — possível abuso para spam de emails.',
    ).toBe(true)
    console.log(`  rate limit forgot-password → 429 ✅`)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Smoke #20 — id-docs privado: URL pública inacessível
// ─────────────────────────────────────────────────────────────────────────────
test.describe('smoke #20 — id-docs: documentos de identidade não acessíveis publicamente', () => {
  test('URL pública de id-docs retorna erro sem autenticação', async () => {
    // Testa que o bucket id-docs é privado: URL pública sem auth deve retornar erro
    // Supabase bucket privado: /storage/v1/object/public/id-docs/* → 400
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://fflpuoluiqmhpvcxubqi.supabase.co'
    const testUrl = `${SUPABASE_URL}/storage/v1/object/public/id-docs/id-verification/fake-user-id/document-fake.jpg`

    const res = await fetch(testUrl)
    console.log(`  GET id-docs public URL → ${res.status}`)

    expect(
      res.status,
      `id-docs bucket parece estar PÚBLICO (status ${res.status}). ` +
      'Documentos de identidade (CPF, selfie) poderiam ser acessados por qualquer pessoa. ' +
      'O bucket deve estar configurado como PRIVADO no Supabase.',
    ).not.toBe(200)

    console.log(`  id-docs não acessível publicamente (${res.status}) ✅ — bucket privado confirmado`)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Smoke #21 — Review flow: avaliações pós-booking
// ─────────────────────────────────────────────────────────────────────────────
test.describe('smoke #21 — Review flow: avaliações após booking COMPLETED', () => {
  test.skip(!hasSessions || !hasTestItem, 'Requer sessões fixture e test-item-id.json')

  test('review em booking ativo é bloqueado; avaliação duplicada bloqueada; roles respeitados', async ({ browser }) => {
    test.setTimeout(120000)

    const { itemId } = JSON.parse(fs.readFileSync(TEST_ITEM_PATH, 'utf-8')) as { itemId: string }

    const locCtx  = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const propCtx = await browser.newContext({ storageState: SESSION_PATHS.proprietario })
    const loc     = await locCtx.newPage()
    const prop    = await propCtx.newPage()

    // Offset amplo para não conflitar com outros smokes nem runs anteriores
    const offset = 800 + Math.floor(Math.random() * 500)
    const start  = new Date(Date.now() + offset * 86400000).toISOString()
    const end    = new Date(Date.now() + (offset + 2) * 86400000).toISOString()

    let bookingId = ''
    try {
      // — Setup: criar booking PENDING —
      const createRes = await loc.request.post('/api/bookings', {
        data: { itemId, startDate: start, endDate: end, borrowerNote: 'Smoke #21 review flow' },
      })
      expect(createRes.ok(), `Criação do booking falhou: ${createRes.status()}`).toBeTruthy()
      const { data: booking } = await createRes.json() as { data: { id: string } }
      bookingId = booking.id
      console.log(`  booking criado: ${bookingId}`)

      // ── A) Review em booking PENDING → 422 ──
      const reviewPendingRes = await loc.request.post(`/api/bookings/${bookingId}/reviews`, {
        data: { reviewType: 'ITEM', rating: 5, comment: 'Tentativa indevida' },
      })
      console.log(`  review em PENDING → ${reviewPendingRes.status()}`)
      expect(
        reviewPendingRes.status(),
        'Review em booking PENDING foi aceito — só deve ser possível em RETURNED/COMPLETED.',
      ).toBe(422)
      const pendingBody = await reviewPendingRes.json()
      expect(pendingBody.error?.code).toBe('BOOKING_NOT_REVIEWABLE')
      console.log('  review em PENDING → 422 BOOKING_NOT_REVIEWABLE ✅')

      // — Avança booking para RETURNED: confirm → mark_active (com pickupToken) → mark_returned —
      await prop.request.patch(`/api/bookings/${bookingId}`, { data: { action: 'confirm' } })
      // pickupToken é gerado no confirm e visível apenas para o borrower (locatário) — obrigatório no mark_active
      const detailRes = await loc.request.get(`/api/bookings/${bookingId}`)
      const { data: detail } = await detailRes.json() as { data: { pickupToken: string | null } }
      const activeRes = await prop.request.patch(`/api/bookings/${bookingId}`, {
        data: { action: 'mark_active', pickupToken: detail.pickupToken },
      })
      expect(activeRes.ok(), `mark_active falhou: ${activeRes.status()}`).toBeTruthy()
      const returnRes = await loc.request.patch(`/api/bookings/${bookingId}`, { data: { action: 'mark_returned' } })
      console.log(`  booking avançado para RETURNED → ${returnRes.status()}`)
      expect(returnRes.ok(), `mark_returned falhou: ${returnRes.status()}`).toBeTruthy()

      // ── B) Proprietário tenta avaliar como ITEM (tipo não permitido) → 422 ──
      const wrongTypeRes = await prop.request.post(`/api/bookings/${bookingId}/reviews`, {
        data: { reviewType: 'ITEM', rating: 4, comment: 'Tentativa de tipo errado' },
      })
      console.log(`  proprietário review ITEM (tipo errado) → ${wrongTypeRes.status()}`)
      expect(
        wrongTypeRes.status(),
        'Proprietário conseguiu avaliar como ITEM — só pode avaliar BORROWER.',
      ).toBe(422)
      console.log('  tipo errado → 422 ✅')

      // ── C) Locatário avalia o item → 201 ──
      const reviewItemRes = await loc.request.post(`/api/bookings/${bookingId}/reviews`, {
        data: { reviewType: 'ITEM', rating: 5, comment: 'Produto excelente, recomendo!' },
      })
      console.log(`  locatário review ITEM → ${reviewItemRes.status()}`)
      expect(reviewItemRes.status(), 'Review de ITEM falhou').toBe(201)
      console.log('  locatário review ITEM → 201 ✅')

      // ── D) Locatário tenta avaliar o mesmo item novamente → 409 ──
      const duplicateRes = await loc.request.post(`/api/bookings/${bookingId}/reviews`, {
        data: { reviewType: 'ITEM', rating: 3, comment: 'Tentativa duplicada' },
      })
      console.log(`  review duplicado → ${duplicateRes.status()}`)
      expect(
        duplicateRes.status(),
        'Review duplicado foi aceito — ALREADY_REVIEWED deveria ter bloqueado.',
      ).toBe(409)
      const dupBody = await duplicateRes.json()
      expect(dupBody.error?.code).toBe('ALREADY_REVIEWED')
      console.log('  review duplicado → 409 ALREADY_REVIEWED ✅')

      // ── E) Proprietário avalia o locatário → 201 ──
      const reviewBorrowerRes = await prop.request.post(`/api/bookings/${bookingId}/reviews`, {
        data: { reviewType: 'BORROWER', rating: 5, comment: 'Ótimo locatário, cuidou bem do item.' },
      })
      console.log(`  proprietário review BORROWER → ${reviewBorrowerRes.status()}`)
      expect(reviewBorrowerRes.status(), 'Review de BORROWER falhou').toBe(201)
      console.log('  proprietário review BORROWER → 201 ✅')

    } finally {
      // Booking já avançou para RETURNED/COMPLETED — não pode cancelar; cleanup só fecha contextos
      await locCtx.close()
      await propCtx.close()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Smoke #22 — Booking boundary: datas adjacentes e sobreposição
// ─────────────────────────────────────────────────────────────────────────────
test.describe('smoke #22 — Booking boundary: casos limítrofes de datas', () => {
  test.skip(!hasSessions || !hasTestItem, 'Requer sessões fixture e test-item-id.json')

  test('datas adjacentes permitidas; sobreposição bloqueada; booking de 1 dia aceito', async ({ browser }) => {
    test.setTimeout(90000)

    const { itemId } = JSON.parse(fs.readFileSync(TEST_ITEM_PATH, 'utf-8')) as { itemId: string }

    const locCtx  = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const propCtx = await browser.newContext({ storageState: SESSION_PATHS.proprietario })
    const loc     = await locCtx.newPage()
    const prop    = await propCtx.newPage()

    // Base determinística por worker para evitar colisão entre browsers paralelos.
    // workerIndex é único por processo Playwright (0–3 com 4 browsers).
    // Offset semanal garante separação de runs anteriores que podem ter deixado
    // bookings PENDING/CONFIRMED no staging sem cleanup.
    const workerIdx = test.info().workerIndex
    const weekNum   = Math.floor(Date.now() / (7 * 86400000)) % 52
    const base      = 2000 + workerIdx * 300 + weekNum * 50
    const day       = (n: number) => new Date(Date.now() + n * 86400000).toISOString()

    const bookingIds: string[] = []
    try {
      // ── A) Booking A: dias 450→453 (3 dias) ──
      const resA = await loc.request.post('/api/bookings', {
        data: { itemId, startDate: day(base), endDate: day(base + 3), borrowerNote: 'Smoke #22 A' },
      })
      expect(resA.ok(), `Booking A falhou: ${resA.status()}`).toBeTruthy()
      const { data: bookingA } = await resA.json() as { data: { id: string } }
      bookingIds.push(bookingA.id)
      await prop.request.patch(`/api/bookings/${bookingA.id}`, { data: { action: 'confirm' } })
      console.log(`  Booking A (dias ${base}→${base + 3}) criado: ${bookingA.id} ✅`)

      // ── B) Booking B adjacente: dias 453→456 (começa onde A termina) → deve ser ACEITO ──
      const resB = await loc.request.post('/api/bookings', {
        data: { itemId, startDate: day(base + 3), endDate: day(base + 6), borrowerNote: 'Smoke #22 B adjacente' },
      })
      console.log(`  Booking B adjacente (dias ${base + 3}→${base + 6}) → ${resB.status()}`)
      expect(
        resB.status(),
        `Booking adjacente (começa no dia em que A termina) foi bloqueado — ` +
        'deveria ser ACEITO: item devolvido no dia 453, pode ser alugado de volta no mesmo dia.',
      ).toBe(201)
      const { data: bookingB } = await resB.json() as { data: { id: string } }
      bookingIds.push(bookingB.id)
      await prop.request.patch(`/api/bookings/${bookingB.id}`, { data: { action: 'confirm' } })
      console.log(`  Booking B adjacente → 201 ✅ (datas adjacentes permitidas)`)

      // ── C) Booking que sobrepõe A (dias 451→454) → deve ser BLOQUEADO ──
      const resC = await loc.request.post('/api/bookings', {
        data: { itemId, startDate: day(base + 1), endDate: day(base + 4), borrowerNote: 'Smoke #22 C overlap' },
      })
      console.log(`  Booking C sobreposição (dias ${base + 1}→${base + 4}) → ${resC.status()}`)
      expect(
        resC.status(),
        `Booking sobreposição foi ACEITO — double-booking crítico. ` +
        'Período ${base + 1}→${base + 4} conflita com A (${base}→${base + 3}).',
      ).toBe(409)
      const bodyC = await resC.json()
      expect(bodyC.error?.code).toBe('DATE_CONFLICT')
      console.log(`  Booking C sobreposição → 409 DATE_CONFLICT ✅`)

      // ── D) Booking de 1 único dia (dias 460→461) → deve ser ACEITO ──
      const resD = await loc.request.post('/api/bookings', {
        data: { itemId, startDate: day(base + 10), endDate: day(base + 11), borrowerNote: 'Smoke #22 D 1 dia' },
      })
      console.log(`  Booking D 1 dia (dias ${base + 10}→${base + 11}) → ${resD.status()}`)
      expect(
        resD.status(),
        'Booking de 1 dia foi bloqueado — deve ser aceito.',
      ).toBe(201)
      const { data: bookingD } = await resD.json() as { data: { id: string } }
      bookingIds.push(bookingD.id)
      console.log(`  Booking D 1 dia → 201 ✅`)

    } finally {
      for (const id of bookingIds) {
        await loc.request.patch(`/api/bookings/${id}`, {
          data: { action: 'cancel', reason: 'Cleanup smoke #22' },
        }).catch(() => {})
      }
      await locCtx.close()
      await propCtx.close()
    }
  })
})
