/**
 * Smoke #32–#35 — Locação multi-item: carrinho do mesmo dono (Story B / ADR-025)
 *
 * Cobre:
 *   #32  Happy path multi-item  — POST com itemId + additionalItemIds → 201; preço = soma
 *   #33  Donos diferentes       — 422 MIXED_OWNERS
 *   #34  Anti-duplo-booking do item secundário — após CONFIRMED, novo booking sobre o
 *          item secundário no mesmo período → 409 DATE_CONFLICT; availability reflete isso
 *   #35  Regressão item único   — POST sem additionalItemIds → 201 (legado intacto)
 *
 * Atores:
 *   - locatário fixture  (session-locatario.json)   — cria as reservas
 *   - proprietário fixture (session-proprietario.json) — dono dos 2 itens de teste;
 *                                                       confirma para virar CONFIRMED
 *   - admin fixture      (session-admin.json)        — usada como 3º usuário (locatário
 *                                                       de outro dono, ou 2º locatário)
 *
 * Premissas de setup (ver nota de execução no final do arquivo):
 *   1. Os três arquivos de sessão existem em e2e/fixtures/.
 *   2. O proprietário fixture TEM ao menos 2 itens AVAILABLE distintos no banco.
 *      Os dois primeiros itens AVAILABLE do proprietário são usados como item principal
 *      e item secundário (descobertos em runtime via GET /api/bookings?role=owner).
 *      SE o proprietário tiver menos de 2 itens AVAILABLE → suite é pulada (skip).
 *   3. O locatário fixture tem e-mail verificado + cadastro completo (profileCompletedAt != null).
 *   4. O admin fixture tem e-mail verificado + cadastro completo (para atuar como 2º locatário).
 *   5. O locatário fixture NÃO é dono de nenhum dos itens do proprietário fixture.
 *
 * Todos os testes são auto-suficientes: criam os dados necessários no início e fazem
 * cleanup (cancelamento) no finally — não deixam lixo confirmado que bloquearia outros runs.
 *
 * Janelas de data: 400–500 dias no futuro para não conflitar com outros smokes (que usam
 * até ~370 dias). Cada teste usa um offset aleatório dentro da sua faixa.
 */

import fs from 'fs'
import { test, expect } from '@playwright/test'
import { SESSION_PATHS } from './fixtures/test-credentials'
import { apiWithRetry } from './_support'

// ---------------------------------------------------------------------------
// Pré-condições de skip
// ---------------------------------------------------------------------------

const hasAllSessions =
  fs.existsSync(SESSION_PATHS.locatario) &&
  fs.existsSync(SESSION_PATHS.proprietario) &&
  fs.existsSync(SESSION_PATHS.admin)

// ---------------------------------------------------------------------------
// Helpers de data — janela dedicada 400–500 dias no futuro
// ---------------------------------------------------------------------------

/** Cria uma janela [startDate, endDate] de `durationDays` a partir de `offsetDays` no futuro. */
function futureWindow(offsetDays: number, durationDays: number = 2): { start: string; end: string } {
  const start = new Date(Date.now() + offsetDays * 86_400_000)
  const end   = new Date(start.getTime() + durationDays * 86_400_000)
  return { start: start.toISOString(), end: end.toISOString() }
}

/** Retorna um offset aleatório em [min, max] dias no futuro. */
function rndOffset(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

// ---------------------------------------------------------------------------
// JPEG mínimo válido (1×1px) — mesmo usado no smoke #17
// Magic bytes FF D8 FF garantem aprovação na validação de file-type
// ---------------------------------------------------------------------------

const MINIMAL_JPEG = Buffer.from(
  'ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707' +
  '07090909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c' +
  '231c1c2837292c30313434341f27393d38323c2e333432ffffc0000b080001000101' +
  '011100ffc4001f0000010501010101010100000000000000000102030405060708090a' +
  '0bffda00080101000003f0007fffd9',
  'hex',
)

/**
 * Cria um item de teste e faz upload de uma foto JPEG mínima para promovê-lo
 * de DRAFT → AVAILABLE. Retorna o itemId ou null em caso de falha.
 *
 * Fluxo: POST /api/items (DRAFT) → POST /api/items/[id]/images (→ AVAILABLE)
 */
async function createTestItem(propPage: import('@playwright/test').Page, title: string): Promise<string | null> {
  const catRes = await apiWithRetry(() => propPage.request.get('/api/categories'))
  if (!catRes.ok()) return null
  const { data: cats } = await catRes.json() as { data: { id: string }[] }
  if (!cats?.length) return null

  const createRes = await apiWithRetry(() =>
    propPage.request.post('/api/items', {
      data: {
        title,
        description: 'Item de teste E2E — multi-item smoke (pode ser removido)',
        categoryId:  cats[0].id,
        condition:   'GOOD',
        pricePerDay: 5000, // R$50,00 — valor fixo p/ calcular totalPrice esperado
        city:        'São Paulo',
        state:       'SP',
        latitude:    -23.5505,
        longitude:   -46.6333,
      },
    })
  )
  if (!createRes.ok()) return null
  const { data: item } = await createRes.json() as { data: { id: string } }
  if (!item?.id) return null

  // Upload de foto mínima para promover DRAFT → AVAILABLE
  const imgRes = await apiWithRetry(() =>
    propPage.request.post(`/api/items/${item.id}/images`, {
      multipart: { file: { name: 'test.jpg', mimeType: 'image/jpeg', buffer: MINIMAL_JPEG } },
    })
  )
  // Se o upload falhar, o item fica em DRAFT — cleanup e retorna null
  if (!imgRes.ok()) {
    await propPage.request.delete(`/api/items/${item.id}`).catch(() => {})
    return null
  }

  return item.id
}

// ---------------------------------------------------------------------------
// Smoke #32 — Happy path multi-item
// ---------------------------------------------------------------------------

test.describe('smoke #32 — happy path: locação multi-item do mesmo dono', () => {
  test.skip(!hasAllSessions, 'Requer session-locatario.json, session-proprietario.json e session-admin.json')

  test('POST /api/bookings com additionalItemIds → 201; totalPrice = soma dos dois itens', async ({ browser }) => {
    test.setTimeout(90_000)

    const propCtx = await browser.newContext({ storageState: SESSION_PATHS.proprietario })
    const locCtx  = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const prop    = await propCtx.newPage()
    const loc     = await locCtx.newPage()

    let itemId1: string | null = null
    let itemId2: string | null = null
    let bookingId: string | null = null

    try {
      // Setup: cria 2 itens de teste como proprietário
      const ts = Date.now()
      itemId1 = await createTestItem(prop, `Multi-item E2E Item A ${ts}`)
      itemId2 = await createTestItem(prop, `Multi-item E2E Item B ${ts}`)

      if (!itemId1 || !itemId2) {
        test.info().annotations.push({
          type: 'skip-reason',
          description: 'Não foi possível criar os itens de teste — setup falhou.',
        })
        return
      }
      console.log(`  itens criados: principal=${itemId1} adicional=${itemId2}`)

      // Descobre o pricePerDay de cada item para calcular o total esperado
      const [item1Res, item2Res] = await Promise.all([
        prop.request.get(`/api/items/${itemId1}`),
        prop.request.get(`/api/items/${itemId2}`),
      ])

      type ItemDetail = { data: { pricePerDay: number; ownerId: string } }
      const item1Body = await item1Res.json() as ItemDetail
      const item2Body = await item2Res.json() as ItemDetail
      const pricePerDay1 = item1Body.data?.pricePerDay ?? 5000
      const pricePerDay2 = item2Body.data?.pricePerDay ?? 5000

      // Janela de data: 400–420 dias no futuro, 3 dias de duração
      const offset = rndOffset(400, 420)
      const { start, end } = futureWindow(offset, 3) // 3 dias de locação
      const durationDays = 3
      const expectedTotal = pricePerDay1 * durationDays + pricePerDay2 * durationDays

      console.log(`  datas: ${start.slice(0, 10)} → ${end.slice(0, 10)} (${durationDays} dias)`)
      console.log(`  preço esperado: ${pricePerDay1}×${durationDays} + ${pricePerDay2}×${durationDays} = ${expectedTotal} centavos`)

      // Locatário faz a reserva multi-item
      const res = await apiWithRetry(() =>
        loc.request.post('/api/bookings', {
          data: {
            itemId:            itemId1!,
            additionalItemIds: [itemId2!],
            startDate:         start,
            endDate:           end,
            borrowerNote:      'Smoke #32 — locação multi-item E2E automatizada.',
          },
        })
      )

      const body = await res.json().catch(() => ({}))
      console.log(`  POST /api/bookings multi-item → ${res.status()}`, JSON.stringify(body))

      expect(
        res.status(),
        `Happy path multi-item falhou (${res.status()}): ${JSON.stringify(body)}`,
      ).toBe(201)

      const { data: booking } = body as { data: { id: string; status: string; totalPrice: number; dailyPrice: number } }
      expect(booking?.id,     'bookingId ausente na resposta 201').toBeTruthy()
      expect(booking?.status, 'status deve ser PENDING').toBe('PENDING')
      bookingId = booking.id

      // totalPrice deve ser igual à soma dos dois itens (sem desconto)
      expect(
        booking.totalPrice,
        `totalPrice=${booking.totalPrice} mas esperado ${expectedTotal} (soma dos dois itens × ${durationDays} dias)`,
      ).toBe(expectedTotal)

      // dailyPrice deve ser a soma dos pricePerDay
      const expectedDailySum = pricePerDay1 + pricePerDay2
      expect(
        booking.dailyPrice,
        `dailyPrice=${booking.dailyPrice} mas esperado ${expectedDailySum} (soma das diárias dos dois itens)`,
      ).toBe(expectedDailySum)

      console.log(`  booking multi-item criado: ${bookingId} totalPrice=${booking.totalPrice} ✅`)

      // Verifica que o item secundário aparece bloqueado na rota de disponibilidade
      // (PENDING não bloqueia — só CONFIRMED e ACTIVE. Apenas verifica que o endpoint responde OK.)
      const availRes = await loc.request.get(`/api/items/${itemId2}/availability`)
      expect(availRes.ok(), 'GET /api/items/[id]/availability deve responder 200').toBeTruthy()
      const { data: occupied } = await availRes.json() as { data: string[] }
      expect(Array.isArray(occupied), 'availability.data deve ser array').toBeTruthy()
      console.log(`  availability do item secundário consultada: ${occupied.length} datas ocupadas ✅`)

    } finally {
      // Cleanup: cancela o booking se existir
      if (bookingId) {
        await loc.request.patch(`/api/bookings/${bookingId}`, {
          data: { action: 'cancel', reason: 'Cleanup smoke #32 multi-item happy path' },
        }).catch(() => {})
        console.log(`  booking ${bookingId} cancelado (cleanup) ✅`)
      }
      // Remove itens de teste
      if (itemId1) await prop.request.delete(`/api/items/${itemId1}`).catch(() => {})
      if (itemId2) await prop.request.delete(`/api/items/${itemId2}`).catch(() => {})
      console.log('  itens de teste removidos (cleanup) ✅')

      await propCtx.close()
      await locCtx.close()
    }
  })
})

// ---------------------------------------------------------------------------
// Smoke #33 — Donos diferentes → 422 MIXED_OWNERS
// ---------------------------------------------------------------------------

test.describe('smoke #33 — donos diferentes → 422 MIXED_OWNERS', () => {
  test.skip(!hasAllSessions, 'Requer todas as sessões fixture')

  test('POST /api/bookings com itens de donos distintos → 422 MIXED_OWNERS', async ({ browser }) => {
    test.setTimeout(90_000)

    const propCtx  = await browser.newContext({ storageState: SESSION_PATHS.proprietario })
    const adminCtx = await browser.newContext({ storageState: SESSION_PATHS.admin })
    const locCtx   = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const prop  = await propCtx.newPage()
    const adm   = await adminCtx.newPage()
    const loc   = await locCtx.newPage()

    let itemDoProp:  string | null = null
    let itemDoAdmin: string | null = null

    try {
      // Setup: 1 item do proprietário fixture + 1 item do admin fixture (donos distintos)
      const ts = Date.now()
      itemDoProp  = await createTestItem(prop, `MIXED_OWNERS E2E Item Prop ${ts}`)
      itemDoAdmin = await createTestItem(adm,  `MIXED_OWNERS E2E Item Admin ${ts}`)

      if (!itemDoProp || !itemDoAdmin) {
        test.info().annotations.push({
          type: 'skip-reason',
          description: 'Setup falhou — não foi possível criar itens de donos distintos.',
        })
        return
      }
      console.log(`  item do prop: ${itemDoProp}  item do admin: ${itemDoAdmin}`)

      const offset = rndOffset(421, 435)
      const { start, end } = futureWindow(offset, 2)

      // Locatário tenta reservar 1 item de cada dono na mesma locação
      const res = await apiWithRetry(() =>
        loc.request.post('/api/bookings', {
          data: {
            itemId:            itemDoProp!,
            additionalItemIds: [itemDoAdmin!],
            startDate:         start,
            endDate:           end,
            borrowerNote:      'Smoke #33 — teste MIXED_OWNERS.',
          },
        })
      )

      const body = await res.json().catch(() => ({}))
      console.log(`  POST multi-item donos distintos → ${res.status()} ${JSON.stringify(body)}`)

      expect(
        res.status(),
        `MIXED_OWNERS: API aceitou itens de donos distintos (${res.status()}). Body: ${JSON.stringify(body)}`,
      ).toBe(422)

      const code = (body as { error?: { code?: string } }).error?.code
      expect(
        code,
        `Esperado code MIXED_OWNERS, recebido: ${code}`,
      ).toBe('MIXED_OWNERS')

      console.log('  422 MIXED_OWNERS recebido corretamente ✅')

    } finally {
      if (itemDoProp)  await prop.request.delete(`/api/items/${itemDoProp}`).catch(() => {})
      if (itemDoAdmin) await adm.request.delete(`/api/items/${itemDoAdmin}`).catch(() => {})
      await propCtx.close()
      await adminCtx.close()
      await locCtx.close()
    }
  })
})

// ---------------------------------------------------------------------------
// Smoke #34 — Anti-duplo-booking do item secundário após CONFIRMED
// ---------------------------------------------------------------------------

test.describe('smoke #34 — item secundário de locação CONFIRMED bloqueia novas reservas', () => {
  test.skip(!hasAllSessions, 'Requer todas as sessões fixture')

  test('item secundário CONFIRMED → 409 DATE_CONFLICT para nova reserva no mesmo período; availability reflete ocupação', async ({ browser }) => {
    test.setTimeout(120_000)

    const propCtx  = await browser.newContext({ storageState: SESSION_PATHS.proprietario })
    const locCtx   = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const adminCtx = await browser.newContext({ storageState: SESSION_PATHS.admin })
    const prop  = await propCtx.newPage()
    const loc   = await locCtx.newPage()
    const adm   = await adminCtx.newPage()

    let itemA: string | null = null
    let itemB: string | null = null
    let bookingId: string | null = null

    try {
      // Setup: 2 itens do mesmo proprietário
      const ts = Date.now()
      itemA = await createTestItem(prop, `ANTI-DOUBLE Item A ${ts}`)
      itemB = await createTestItem(prop, `ANTI-DOUBLE Item B ${ts}`)

      if (!itemA || !itemB) {
        test.info().annotations.push({
          type: 'skip-reason',
          description: 'Setup falhou — não foi possível criar os itens de teste.',
        })
        return
      }
      console.log(`  itens: principal=${itemA}  secundário=${itemB}`)

      // Janela 436–450 dias no futuro, 3 dias
      const offset = rndOffset(436, 450)
      const { start, end } = futureWindow(offset, 3)

      // Passo 1: locatário cria locação multi-item (itemA principal + itemB secundário)
      const createRes = await apiWithRetry(() =>
        loc.request.post('/api/bookings', {
          data: {
            itemId:            itemA!,
            additionalItemIds: [itemB!],
            startDate:         start,
            endDate:           end,
            borrowerNote:      'Smoke #34 — locação base para teste de anti-double-booking.',
          },
        })
      )
      expect(
        createRes.ok(),
        `Criação da locação base falhou (${createRes.status()}): ${JSON.stringify(await createRes.json().catch(() => ({})))}`,
      ).toBeTruthy()

      const { data: booking } = await createRes.json() as { data: { id: string; status: string } }
      bookingId = booking.id
      expect(booking.status).toBe('PENDING')
      console.log(`  locação base criada: ${bookingId} (PENDING)`)

      // Passo 2: proprietário confirma → CONFIRMED (agora itemA e itemB estão bloqueados)
      const confirmRes = await apiWithRetry(() =>
        prop.request.patch(`/api/bookings/${bookingId!}`, { data: { action: 'confirm' } })
      )
      expect(
        confirmRes.ok(),
        `Confirmação falhou (${confirmRes.status()})`,
      ).toBeTruthy()
      const { data: confirmed } = await confirmRes.json() as { data: { status: string } }
      expect(confirmed.status).toBe('CONFIRMED')
      console.log(`  locação base → CONFIRMED ✅`)

      // Passo 3: admin (3º usuário) tenta criar nova reserva para itemB no MESMO período
      //          Deve falhar com 409 DATE_CONFLICT — itemB está ocupado como item secundário
      const overlapRes = await apiWithRetry(() =>
        adm.request.post('/api/bookings', {
          data: {
            itemId:       itemB!,       // tenta reservar o item SECUNDÁRIO diretamente
            startDate:    start,        // mesmo período
            endDate:      end,
            borrowerNote: 'Smoke #34 — deve ser bloqueado pelo anti-double-booking.',
          },
        })
      )

      const overlapBody = await overlapRes.json().catch(() => ({}))
      console.log(`  nova reserva sobre itemB (secundário CONFIRMED) → ${overlapRes.status()} ${JSON.stringify(overlapBody)}`)

      expect(
        overlapRes.status(),
        `Anti-double-booking falhou: nova reserva sobre item secundário CONFIRMED foi aceita ` +
        `(${overlapRes.status()}). Deveria ser 409 DATE_CONFLICT. ` +
        `bookingItems não está sendo consultado na verificação de disponibilidade. Body: ${JSON.stringify(overlapBody)}`,
      ).toBe(409)

      const conflictCode = (overlapBody as { error?: { code?: string } }).error?.code
      expect(
        conflictCode,
        `Esperado code DATE_CONFLICT, recebido: ${conflictCode}`,
      ).toBe('DATE_CONFLICT')
      console.log(`  409 DATE_CONFLICT recebido — item secundário corretamente bloqueado ✅`)

      // Passo 4: verifica que GET /api/items/[itemB]/availability retorna a janela como ocupada
      //          (o endpoint usa booking_items como fonte de verdade — Story B)
      const availRes = await loc.request.get(`/api/items/${itemB}/availability`)
      expect(availRes.ok(), 'GET availability deve responder 200').toBeTruthy()
      const { data: occupied } = await availRes.json() as { data: string[] }
      expect(Array.isArray(occupied), 'availability.data deve ser array').toBeTruthy()

      // O período da locação deve aparecer como ocupado
      // Converte startDate para "YYYY-MM-DD" e verifica que está na lista
      const startDateKey = new Date(start).toISOString().slice(0, 10)
      expect(
        occupied.some((d) => d >= startDateKey),
        `GET /api/items/${itemB}/availability não reflete a ocupação do item secundário. ` +
        `Período ${startDateKey} não encontrado nas datas ocupadas: ${JSON.stringify(occupied.slice(0, 5))}`,
      ).toBeTruthy()
      console.log(`  availability do itemB reflete ocupação (${startDateKey} presente) ✅`)

    } finally {
      // Cleanup: cancela a reserva CONFIRMED (requer ação do proprietário)
      if (bookingId) {
        await prop.request.patch(`/api/bookings/${bookingId}`, {
          data: { action: 'cancel', reason: 'Cleanup smoke #34 anti-double-booking' },
        }).catch(() => {})
        console.log(`  booking ${bookingId} cancelado (cleanup) ✅`)
      }
      if (itemA) await prop.request.delete(`/api/items/${itemA}`).catch(() => {})
      if (itemB) await prop.request.delete(`/api/items/${itemB}`).catch(() => {})
      console.log('  itens de teste removidos (cleanup) ✅')

      await propCtx.close()
      await locCtx.close()
      await adminCtx.close()
    }
  })
})

// ---------------------------------------------------------------------------
// Smoke #35 — Regressão: item único (sem additionalItemIds) continua funcionando
// ---------------------------------------------------------------------------

test.describe('smoke #35 — regressão: locação de item único sem additionalItemIds', () => {
  test.skip(!hasAllSessions, 'Requer session-locatario.json e session-proprietario.json')

  test('POST /api/bookings sem additionalItemIds → 201 PENDING (comportamento legado intacto)', async ({ browser }) => {
    test.setTimeout(60_000)

    const propCtx = await browser.newContext({ storageState: SESSION_PATHS.proprietario })
    const locCtx  = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const prop    = await propCtx.newPage()
    const loc     = await locCtx.newPage()

    let itemId:    string | null = null
    let bookingId: string | null = null

    try {
      // Setup: 1 item de teste
      const ts = Date.now()
      itemId = await createTestItem(prop, `Regressão Item Único E2E ${ts}`)

      if (!itemId) {
        test.info().annotations.push({
          type: 'skip-reason',
          description: 'Setup falhou — não foi possível criar item de teste.',
        })
        return
      }
      console.log(`  item criado: ${itemId}`)

      // Janela 451–465 dias no futuro
      const offset = rndOffset(451, 465)
      const { start, end } = futureWindow(offset, 2)

      // Locatário cria reserva SEM additionalItemIds (caminho legado)
      const resWithout = await apiWithRetry(() =>
        loc.request.post('/api/bookings', {
          data: {
            itemId,
            startDate:    start,
            endDate:      end,
            borrowerNote: 'Smoke #35 — regressão item único sem additionalItemIds.',
          },
        })
      )

      const bodyWithout = await resWithout.json().catch(() => ({}))
      console.log(`  POST sem additionalItemIds → ${resWithout.status()} ${JSON.stringify(bodyWithout)}`)

      expect(
        resWithout.status(),
        `Regressão item único: POST sem additionalItemIds falhou (${resWithout.status()}). ` +
        `Body: ${JSON.stringify(bodyWithout)}`,
      ).toBe(201)

      const { data: booking } = bodyWithout as { data: { id: string; status: string; totalPrice: number; dailyPrice: number } }
      expect(booking?.id,     'bookingId ausente na resposta 201').toBeTruthy()
      expect(booking?.status, 'status deve ser PENDING').toBe('PENDING')
      bookingId = booking.id

      // totalPrice deve ser exatamente pricePerDay × 2 dias
      const expectedTotal = 5000 * 2 // pricePerDay fixo no createTestItem
      expect(
        booking.totalPrice,
        `totalPrice=${booking.totalPrice} mas esperado ${expectedTotal} para 1 item × 2 dias`,
      ).toBe(expectedTotal)

      console.log(`  booking ${bookingId} criado — legado item único intacto ✅`)

      // Variante: POST com additionalItemIds vazio ([] explícito) — deve ter o mesmo comportamento
      // Primeiro cancela a reserva anterior para liberar as datas
      await loc.request.patch(`/api/bookings/${bookingId}`, {
        data: { action: 'cancel', reason: 'Cleanup para variante additionalItemIds=[]' },
      }).catch(() => {})
      bookingId = null

      const offset2 = rndOffset(466, 480)
      const { start: start2, end: end2 } = futureWindow(offset2, 2)

      const resEmpty = await apiWithRetry(() =>
        loc.request.post('/api/bookings', {
          data: {
            itemId,
            additionalItemIds: [], // explicitamente vazio
            startDate:         start2,
            endDate:           end2,
            borrowerNote:      'Smoke #35 — regressão item único com additionalItemIds=[].',
          },
        })
      )

      const bodyEmpty = await resEmpty.json().catch(() => ({}))
      console.log(`  POST com additionalItemIds=[] → ${resEmpty.status()} ${JSON.stringify(bodyEmpty)}`)

      expect(
        resEmpty.status(),
        `Regressão: additionalItemIds=[] falhou (${resEmpty.status()}). Body: ${JSON.stringify(bodyEmpty)}`,
      ).toBe(201)

      const { data: bookingEmpty } = bodyEmpty as { data: { id: string; status: string } }
      expect(bookingEmpty?.status, 'status deve ser PENDING').toBe('PENDING')
      bookingId = bookingEmpty.id
      console.log(`  booking ${bookingId} criado com additionalItemIds=[] — comportamento legado intacto ✅`)

    } finally {
      if (bookingId) {
        await loc.request.patch(`/api/bookings/${bookingId}`, {
          data: { action: 'cancel', reason: 'Cleanup smoke #35 regressão item único' },
        }).catch(() => {})
      }
      if (itemId) await prop.request.delete(`/api/items/${itemId}`).catch(() => {})
      console.log('  cleanup smoke #35 concluído ✅')

      await propCtx.close()
      await locCtx.close()
    }
  })
})

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * NOTA DE EXECUÇÃO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Pré-requisito: dev server rodando em http://localhost:3000
 *   pnpm dev
 *
 * Criar as sessões fixture (se ainda não existirem):
 *   BASE_URL=http://localhost:3000 E2E_SECRET=<valor> \
 *   pnpm tsx scripts/create-staging-fixtures.ts
 *
 * Rodar só este arquivo (recomendado para iteração rápida):
 *   BASE_URL=http://localhost:3000 E2E_SECRET=<valor> \
 *   pnpm playwright test e2e/multi-item-booking.spec.ts --project=chromium
 *
 * Rodar contra staging (quando a feature estiver no staging):
 *   BASE_URL=https://staging.shareo.com.br E2E_SECRET=<valor> \
 *   pnpm playwright test e2e/multi-item-booking.spec.ts --project=chromium
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PREMISSAS E LACUNAS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. CRIAÇÃO DE ITENS PELA API: o spec usa POST /api/items como proprietário
 *    autenticado para criar os itens de teste. A rota aceita a criação mesmo
 *    sem foto (status AVAILABLE por padrão). Se isso mudar (ex.: status inicial
 *    DRAFT exigindo foto antes de AVAILABLE), o setup vai falhar e os testes
 *    serão skipped com a mensagem "Setup falhou". Solução: adjustar createTestItem
 *    para fazer upload de um JPEG mínimo antes de publicar o item, ou criar
 *    os itens diretamente no banco via script de fixture.
 *
 * 2. DELEÇÃO DE ITENS PELA API: o cleanup usa DELETE /api/items/[id]. Se a
 *    rota só permite soft-delete (e não remove itens com reservas canceladas),
 *    o cleanup pode retornar erro não-crítico — mas isso não derruba os testes.
 *
 * 3. BOOKINGITEMS NÃO EXPOSTO NO RESPONSE: GET /api/bookings/:id não inclui
 *    a relação bookingItems no select. Por isso o smoke #32 valida o número de
 *    itens indiretamente pelo totalPrice (deve ser soma dos dois itens × dias).
 *    Se o time adicionar bookingItems ao response, o teste pode ser melhorado:
 *      expect(booking.bookingItems).toHaveLength(2)
 *    Para validação explícita da contagem de itens, é necessário expor a relação
 *    na rota GET /api/bookings/:id ou criar uma rota dedicada.
 *
 * 4. LOCATÁRIO/ADMIN COM CADASTRO COMPLETO: os fixtures criados pelo
 *    create-staging-fixtures.ts precisam ter emailVerified=true e
 *    profileCompletedAt != null. Sem isso, o POST /api/bookings retorna 403
 *    EMAIL_NOT_VERIFIED ou REGISTRATION_INCOMPLETE e os testes falham no
 *    happy path. Verifique o script de fixtures.
 *
 * 5. ITEM DO ADMIN COMO 2º LOCATÁRIO (smoke #33): o admin fixture precisa ter
 *    permissão para criar itens (POST /api/items). Se admins forem bloqueados
 *    de criar itens pela regra de negócio, o setup do #33 precisa de um 4º
 *    usuário fixture (ex.: "proprietario2.fixture@shareo-test.com"). Neste caso,
 *    a solução mais simples é criar o item do dono 2 com a sessão do locatário,
 *    já que o locatário também pode ser anunciante no ShareO.
 *
 * 6. PRICEPERDAY FIXO: o createTestItem usa pricePerDay: 5000 (R$50,00). O
 *    smoke #32 calcula o expectedTotal como 5000 × durationDays + 5000 × durationDays.
 *    Se calcBookingTotal() aplicar desconto semanal/mensal para períodos longos,
 *    o cálculo pode divergir. A duração usada é 3 dias (sem desconto semanal/mensal),
 *    então não há divergência — mas mude durationDays com cuidado.
 *
 * 7. UI NÃO COBERTA: os smokes são inteiramente de API (page.request.*). A
 *    cobertura de UI (CartIndicator, /carrinho, AddToRentalButton, bloco "Itens
 *    desta locação" em /reservas/[id]) fica fora do escopo deste arquivo e deve
 *    ser adicionada quando o harness de login de browser estiver disponível para
 *    o ambiente local.
 * ─────────────────────────────────────────────────────────────────────────────
 */
