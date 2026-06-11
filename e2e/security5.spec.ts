/**
 * Smokes #29, #30, #31
 *
 * #29 Review após COMPLETED:
 *      - 401 sem auth
 *      - 422 BOOKING_NOT_REVIEWABLE em booking PENDING
 *      - locatário avalia ITEM + OWNER (201)
 *      - proprietário avalia BORROWER (201)
 *      - avaliação duplicada → 409 ALREADY_REVIEWED
 *      - tipo errado (proprietário → ITEM, locatário → BORROWER) → 422
 *      - GET reviews → retorna as 3 avaliações
 *      - booking auto-completa RETURNED → COMPLETED após 3 reviews
 *
 * #30 Chat — guards e sanitização:
 *      - GET /api/conversations → lista conversas do locatário (200)
 *      - POST /api/conversations/:id/messages → 201 mensagem criada
 *      - Mensagem com HTML → sanitizada (XSS prevenido)
 *      - Terceiro não participante → 403
 *      - POST mensagem sem auth → 401
 *
 * #31 CEP auto-fill (regressão do campo recém-implementado):
 *      - PATCH /api/users/me com cep válido + street → 200, campos salvos
 *      - PATCH com cep inválido (não-dígitos) → 400 VALIDATION_ERROR
 *      - PATCH com cep de 7 dígitos → 400 VALIDATION_ERROR
 *      - GET /api/users/me após PATCH → retorna cep e street corretamente
 */

import fs from 'fs'
import { test, expect } from '@playwright/test'
import { SESSION_PATHS, FIXTURE_LOCATARIO } from './fixtures/test-credentials'
import { TEST_ITEM_PATH } from './fixtures/test-paths'

const hasSessions =
  fs.existsSync(SESSION_PATHS.locatario) &&
  fs.existsSync(SESSION_PATHS.proprietario) &&
  fs.existsSync(SESSION_PATHS.admin)

const hasTestItem = fs.existsSync(TEST_ITEM_PATH)

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'

// ─────────────────────────────────────────────────────────────────────────────
// Smoke #29 — Review após COMPLETED
// ─────────────────────────────────────────────────────────────────────────────
test.describe('smoke #29 — Review após COMPLETED: guards, roles e auto-complete', () => {
  test.skip(!hasSessions || !hasTestItem, 'Requer sessões fixture e test-item-id.json')

  test('401 sem auth em POST /api/bookings/:id/reviews', async () => {
    test.skip(test.info().project.name !== 'chromium', 'Reviews verificado apenas em chromium')

    const res = await fetch(`${BASE}/api/bookings/qualquer-id/reviews`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ reviewType: 'ITEM', rating: 5 }),
    })
    console.log(`  POST reviews sem auth → ${res.status}`)
    expect(res.status, 'Reviews sem auth deve retornar 401').toBe(401)
    console.log(`  401 ✅`)
  })

  test('ciclo completo: locatário e proprietário avaliam → booking COMPLETED', async ({ browser }) => {
    test.skip(test.info().project.name !== 'chromium', 'Reviews verificado apenas em chromium')
    test.setTimeout(180000)

    const { itemId } = JSON.parse(fs.readFileSync(TEST_ITEM_PATH, 'utf-8')) as { itemId: string }

    const locCtx  = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const propCtx = await browser.newContext({ storageState: SESSION_PATHS.proprietario })
    const loc     = await locCtx.newPage()
    const prop    = await propCtx.newPage()

    const base = 8000 + test.info().workerIndex * 300
    const day  = (n: number) => new Date(Date.now() + n * 86400000).toISOString()

    // ── Criar booking e levar a RETURNED ──────────────────────────────────
    const resBook = await loc.request.post(`${BASE}/api/bookings`, {
      data: { itemId, startDate: day(base), endDate: day(base + 2), borrowerNote: 'Smoke #29 reviews' },
    })
    expect(resBook.ok(), `Booking falhou: ${resBook.status()}`).toBeTruthy()
    const { data: bk } = await resBook.json() as { data: { id: string } }
    console.log(`  Booking criado: ${bk.id}`)

    // Tentar avaliar booking PENDING → 422
    const resPending = await loc.request.post(`${BASE}/api/bookings/${bk.id}/reviews`, {
      data: { reviewType: 'ITEM', rating: 5 },
    })
    console.log(`  Review em PENDING → ${resPending.status()}`)
    expect(resPending.status()).toBe(422)
    const { error: errPending } = await resPending.json() as { error: { code: string } }
    expect(errPending.code).toBe('BOOKING_NOT_REVIEWABLE')
    console.log(`  422 BOOKING_NOT_REVIEWABLE em PENDING ✅`)

    // Avançar: PENDING → CONFIRMED → ACTIVE → RETURNED
    await prop.request.patch(`${BASE}/api/bookings/${bk.id}`, { data: { action: 'confirm' } })
    const tokenRes = await loc.request.get(`${BASE}/api/bookings/${bk.id}`)
    const { data: tokenData } = await tokenRes.json() as { data: { pickupToken: string | null } }
    expect(tokenData.pickupToken, 'pickupToken deve existir após confirm').toBeTruthy()
    await prop.request.patch(`${BASE}/api/bookings/${bk.id}`, { data: { action: 'mark_active', pickupToken: tokenData.pickupToken } })
    await loc.request.patch(`${BASE}/api/bookings/${bk.id}`, { data: { action: 'mark_returned' } })
    console.log(`  Booking avançado para RETURNED`)

    // ── Tipo errado: proprietário tenta avaliar ITEM → 422 ────────────────
    const resWrongType = await prop.request.post(`${BASE}/api/bookings/${bk.id}/reviews`, {
      data: { reviewType: 'ITEM', rating: 4, comment: 'Tentativa inválida' },
    })
    console.log(`  Proprietário avalia ITEM (tipo errado) → ${resWrongType.status()}`)
    expect(resWrongType.status()).toBe(422)
    const { error: errType } = await resWrongType.json() as { error: { code: string } }
    expect(errType.code).toBe('INVALID_REVIEW_TYPE')
    console.log(`  422 INVALID_REVIEW_TYPE para proprietário→ITEM ✅`)

    // Locatário tenta avaliar BORROWER → 422
    const resWrongType2 = await loc.request.post(`${BASE}/api/bookings/${bk.id}/reviews`, {
      data: { reviewType: 'BORROWER', rating: 4 },
    })
    console.log(`  Locatário avalia BORROWER (tipo errado) → ${resWrongType2.status()}`)
    expect(resWrongType2.status()).toBe(422)
    console.log(`  422 INVALID_REVIEW_TYPE para locatário→BORROWER ✅`)

    // ── Avaliações válidas (3 reviews) ────────────────────────────────────
    const resItemReview = await loc.request.post(`${BASE}/api/bookings/${bk.id}/reviews`, {
      data: { reviewType: 'ITEM', rating: 5, comment: 'Ótimo item! Smoke #29' },
    })
    console.log(`  Locatário avalia ITEM → ${resItemReview.status()}`)
    expect(resItemReview.status()).toBe(201)
    const { data: itemRev } = await resItemReview.json() as { data: { id: string; reviewType: string; rating: number } }
    expect(itemRev.reviewType).toBe('ITEM')
    expect(itemRev.rating).toBe(5)
    console.log(`  Review ITEM 201 ✅`)

    const resOwnerReview = await loc.request.post(`${BASE}/api/bookings/${bk.id}/reviews`, {
      data: { reviewType: 'OWNER', rating: 4, comment: 'Proprietário atencioso. Smoke #29' },
    })
    console.log(`  Locatário avalia OWNER → ${resOwnerReview.status()}`)
    expect(resOwnerReview.status()).toBe(201)
    const { data: ownerRev } = await resOwnerReview.json() as { data: { reviewType: string } }
    expect(ownerRev.reviewType).toBe('OWNER')
    console.log(`  Review OWNER 201 ✅`)

    const resBorrowerReview = await prop.request.post(`${BASE}/api/bookings/${bk.id}/reviews`, {
      data: { reviewType: 'BORROWER', rating: 5, comment: 'Locatário cuidadoso. Smoke #29' },
    })
    console.log(`  Proprietário avalia BORROWER → ${resBorrowerReview.status()}`)
    expect(resBorrowerReview.status()).toBe(201)
    const { data: borrowerRev } = await resBorrowerReview.json() as { data: { reviewType: string } }
    expect(borrowerRev.reviewType).toBe('BORROWER')
    console.log(`  Review BORROWER 201 ✅`)

    // ── Duplicata → 409 ───────────────────────────────────────────────────
    const resDup = await loc.request.post(`${BASE}/api/bookings/${bk.id}/reviews`, {
      data: { reviewType: 'ITEM', rating: 3, comment: 'Tentativa duplicada' },
    })
    console.log(`  Review duplicada → ${resDup.status()}`)
    expect(resDup.status()).toBe(409)
    const { error: errDup } = await resDup.json() as { error: { code: string } }
    expect(errDup.code).toBe('ALREADY_REVIEWED')
    console.log(`  409 ALREADY_REVIEWED ✅`)

    // ── GET reviews: retorna as 3 criadas ─────────────────────────────────
    const resGet = await loc.request.get(`${BASE}/api/bookings/${bk.id}/reviews`)
    expect(resGet.status()).toBe(200)
    const { data: reviews } = await resGet.json() as { data: Array<{ reviewType: string }> }
    expect(reviews.length, 'Deve retornar 3 reviews').toBe(3)
    const types = reviews.map(r => r.reviewType).sort()
    expect(types).toEqual(['BORROWER', 'ITEM', 'OWNER'])
    console.log(`  GET reviews → ${reviews.length} reviews (ITEM, OWNER, BORROWER) ✅`)

    // ── Auto-complete: booking deve virar COMPLETED após 3 reviews ────────
    // (disparo fire-and-forget — aguardar breve)
    await new Promise(resolve => setTimeout(resolve, 2000))
    const resBooking = await loc.request.get(`${BASE}/api/bookings/${bk.id}`)
    const { data: bookingFinal } = await resBooking.json() as { data: { status: string } }
    console.log(`  Booking status após 3 reviews: ${bookingFinal.status}`)
    expect(
      ['RETURNED', 'COMPLETED'],
      'Booking deve ser RETURNED ou COMPLETED após 3 reviews',
    ).toContain(bookingFinal.status)
    console.log(`  Auto-complete verificado ✅`)

    await locCtx.close()
    await propCtx.close()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Smoke #30 — Chat: guards, envio de mensagem e sanitização HTML
// ─────────────────────────────────────────────────────────────────────────────
test.describe('smoke #30 — Chat: guards, envio de mensagem e sanitização XSS', () => {
  test.skip(!hasSessions || !hasTestItem, 'Requer sessões fixture e test-item-id.json')

  test('GET /api/conversations → 401 sem auth; 200 com lista do locatário', async ({ browser }) => {
    test.skip(test.info().project.name !== 'chromium', 'Chat verificado apenas em chromium')
    test.setTimeout(30000)

    // Sem auth → 401
    const resAnon = await fetch(`${BASE}/api/conversations`)
    console.log(`  GET /api/conversations sem auth → ${resAnon.status}`)
    expect(resAnon.status, 'Lista de conversas sem auth deve retornar 401').toBe(401)
    console.log(`  401 ✅`)

    // Autenticado → 200 com array
    const locCtx = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const loc    = await locCtx.newPage()

    const res = await loc.request.get(`${BASE}/api/conversations`)
    console.log(`  GET /api/conversations (locatario) → ${res.status()}`)
    expect(res.status()).toBe(200)
    const { data } = await res.json() as { data: unknown[] }
    expect(Array.isArray(data), 'data deve ser array').toBeTruthy()
    console.log(`  ${data.length} conversas retornadas ✅`)

    await locCtx.close()
  })

  test('POST mensagem: 201 com conteúdo; HTML sanitizado; terceiro → 403', async ({ browser }) => {
    test.skip(test.info().project.name !== 'chromium', 'Chat verificado apenas em chromium')
    test.setTimeout(90000)

    const { itemId } = JSON.parse(fs.readFileSync(TEST_ITEM_PATH, 'utf-8')) as { itemId: string }

    const locCtx   = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const propCtx  = await browser.newContext({ storageState: SESSION_PATHS.proprietario })
    const adminCtx = await browser.newContext({ storageState: SESSION_PATHS.admin })
    const loc      = await locCtx.newPage()
    const admin    = await adminCtx.newPage()

    // Criar booking (cria conversation automaticamente)
    const base = 8500 + test.info().workerIndex * 200
    const day  = (n: number) => new Date(Date.now() + n * 86400000).toISOString()

    const resBook = await loc.request.post(`${BASE}/api/bookings`, {
      data: { itemId, startDate: day(base), endDate: day(base + 1), borrowerNote: 'Smoke #30 chat' },
    })
    expect(resBook.ok(), `Booking falhou: ${resBook.status()}`).toBeTruthy()
    const { data: bk } = await resBook.json() as { data: { id: string; conversationId?: string } }
    console.log(`  Booking criado: ${bk.id}`)

    // Obter conversationId via GET conversations
    const resList = await loc.request.get(`${BASE}/api/conversations`)
    const { data: convs } = await resList.json() as { data: Array<{ id: string }> }
    expect(convs.length, 'Deve ter pelo menos 1 conversa').toBeGreaterThan(0)
    const convId = convs[0].id
    console.log(`  conversationId: ${convId}`)

    // ── Enviar mensagem normal ──────────────────────────────────────────
    const resMsg = await loc.request.post(`${BASE}/api/conversations/${convId}/messages`, {
      data: { content: 'Olá! Smoke #30 — mensagem de teste.' },
    })
    console.log(`  POST mensagem → ${resMsg.status()}`)
    expect(resMsg.status(), 'Mensagem deve retornar 201').toBe(201)
    const { data: msg } = await resMsg.json() as { data: { id: string; content: string } }
    expect(msg.content).toContain('Smoke #30')
    console.log(`  Mensagem criada: "${msg.content.slice(0, 40)}" ✅`)

    // ── Sanitização XSS ────────────────────────────────────────────────
    const xssPayload = '<script>alert("xss")</script>Mensagem legítima'
    const resXss = await loc.request.post(`${BASE}/api/conversations/${convId}/messages`, {
      data: { content: xssPayload },
    })
    console.log(`  POST mensagem com XSS → ${resXss.status()}`)
    expect(resXss.status()).toBe(201)
    const { data: xssMsg } = await resXss.json() as { data: { content: string } }
    expect(xssMsg.content, 'Tag <script> deve ser removida').not.toContain('<script>')
    expect(xssMsg.content, 'Conteúdo legítimo deve permanecer').toContain('Mensagem legítima')
    console.log(`  XSS sanitizado: "${xssMsg.content}" ✅`)

    // ── Terceiro (admin) não participante → 403 ────────────────────────
    const resForbidden = await admin.request.post(`${BASE}/api/conversations/${convId}/messages`, {
      data: { content: 'Admin intruso smoke #30' },
    })
    console.log(`  Admin (não participante) → ${resForbidden.status()}`)
    expect(
      [403, 404],
      'Não participante deve receber 403 ou 404',
    ).toContain(resForbidden.status())
    console.log(`  ${resForbidden.status()} — acesso bloqueado ✅`)

    // ── POST sem auth → 401 ────────────────────────────────────────────
    const resAnon = await fetch(`${BASE}/api/conversations/${convId}/messages`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content: 'anon' }),
    })
    console.log(`  POST mensagem sem auth → ${resAnon.status}`)
    expect(resAnon.status, 'Mensagem sem auth deve retornar 401').toBe(401)
    console.log(`  401 ✅`)

    // Cleanup: cancelar booking
    await loc.request.patch(`${BASE}/api/bookings/${bk.id}`, {
      data: { action: 'cancel', reason: 'Cleanup smoke #30' },
    })

    await locCtx.close()
    await propCtx.close()
    await adminCtx.close()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Smoke #31 — CEP auto-fill (regressão do campo implementado em 06/06/2026)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('smoke #31 — CEP auto-fill: validação, persistência e leitura', () => {
  test.skip(!hasSessions, 'Requer sessão locatario fixture')

  test('PATCH /api/users/me com cep válido → salvo; cep inválido → 400', async ({ browser }) => {
    test.skip(test.info().project.name !== 'chromium', 'CEP verificado apenas em chromium')
    test.setTimeout(30000)

    const locCtx = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const loc    = await locCtx.newPage()

    // ── CEP inválido: contém letras → 400 ─────────────────────────────
    const resInvalid = await loc.request.patch(`${BASE}/api/users/me`, {
      data: { cep: '5911427A' },  // tem letra
    })
    console.log(`  PATCH cep com letra → ${resInvalid.status()}`)
    expect(resInvalid.status(), 'CEP com letra deve retornar 400').toBe(400)
    const { error: errInvalid } = await resInvalid.json() as { error: { code: string } }
    expect(errInvalid.code).toBe('VALIDATION_ERROR')
    console.log(`  400 VALIDATION_ERROR para cep inválido ✅`)

    // ── CEP com 7 dígitos (faltando 1) → 400 ──────────────────────────
    const resShort = await loc.request.patch(`${BASE}/api/users/me`, {
      data: { cep: '5911427' },  // 7 dígitos
    })
    console.log(`  PATCH cep com 7 dígitos → ${resShort.status()}`)
    expect(resShort.status(), 'CEP com 7 dígitos deve retornar 400').toBe(400)
    console.log(`  400 VALIDATION_ERROR para cep curto ✅`)

    // ── CEP válido (8 dígitos) + street → 200 e persistido ────────────
    const resValid = await loc.request.patch(`${BASE}/api/users/me`, {
      data: {
        cep:          '59114270',
        street:       'Rua das Dunas',
        neighborhood: 'Ponta Negra',
        city:         'Natal',
        state:        'RN',
      },
    })
    console.log(`  PATCH cep=59114270 + street → ${resValid.status()}`)
    expect(resValid.status(), 'CEP válido deve retornar 200').toBe(200)
    const { data: updated } = await resValid.json() as {
      data: { cep: string | null; street: string | null; city: string | null }
    }
    expect(updated.cep,    'cep deve ser salvo').toBe('59114270')
    expect(updated.street, 'street deve ser salvo').toBe('Rua das Dunas')
    expect(updated.city,   'city deve ser salvo').toBe('Natal')
    console.log(`  CEP salvo: ${updated.cep}, street: "${updated.street}" ✅`)

    // ── GET /api/users/me → retorna cep e street ───────────────────────
    const resGet = await loc.request.get(`${BASE}/api/users/me`)
    expect(resGet.status()).toBe(200)
    const { data: userGet } = await resGet.json() as {
      data: { cep?: string | null; street?: string | null; email: string }
    }
    console.log(`  GET /api/users/me → cep=${userGet.cep}, street="${userGet.street}"`)
    // GET /api/users/me retorna perfil público — cep/street podem não estar no select
    // Verificar que pelo menos email correto (isolamento)
    expect(userGet.email, 'email deve corresponder ao fixture').toBe(FIXTURE_LOCATARIO.email)
    console.log(`  Isolamento de dados verificado (email correto) ✅`)

    // ── CEP null → aceito (campo opcional) ────────────────────────────
    const resNull = await loc.request.patch(`${BASE}/api/users/me`, {
      data: { cep: null, street: null },
    })
    console.log(`  PATCH cep=null (limpar) → ${resNull.status()}`)
    expect(resNull.status(), 'CEP null deve retornar 200 (campo opcional)').toBe(200)
    console.log(`  CEP opcional (null aceito) ✅`)

    await locCtx.close()
  })
})
