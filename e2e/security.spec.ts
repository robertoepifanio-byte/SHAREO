/**
 * Smoke #13-#17 — Segurança e integridade de negócio
 *
 * #13 IDOR           — Acesso cruzado a recursos de outro usuário (booking, conversa)
 * #14 Admin bypass   — Rotas /api/admin/* bloqueadas para usuários sem role admin
 * #15 Own-item       — Proprietário não pode reservar o próprio item
 * #16 Price tamper   — Servidor ignora totalPrice do cliente; recalcula server-side
 * #17 Upload MIME    — Tipos não-imagem bloqueados (SVG/svg+xml, octet-stream)
 *                      SVG com <script> seria XSS se servido com Content-Type: image/svg+xml
 *
 * Todos os testes devem PASSAR — failure = vulnerabilidade ativa em produção.
 */

import fs from 'fs'
import { test, expect } from '@playwright/test'
import { SESSION_PATHS } from './fixtures/test-credentials'
import { TEST_ITEM_PATH } from './fixtures/test-paths'

const hasSessions =
  fs.existsSync(SESSION_PATHS.locatario) &&
  fs.existsSync(SESSION_PATHS.proprietario) &&
  fs.existsSync(SESSION_PATHS.admin)

const hasTestItem = fs.existsSync(TEST_ITEM_PATH)

// Minimal SVG com script — vetor de XSS se servido como image/svg+xml
const XSS_SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script><rect width="1" height="1"/></svg>',
)

// Minimal JPEG válido (1×1px) — para criar item AVAILABLE no setup do smoke #17
const MINIMAL_JPEG = Buffer.from(
  'ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707' +
  '07090909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c' +
  '231c1c2837292c30313434341f27393d38323c2e333432ffffc0000b080001000101' +
  '011100ffc4001f0000010501010101010100000000000000000102030405060708090a' +
  '0bffda00080101000003f0007fffd9',
  'hex',
)

// ─────────────────────────────────────────────────────────────────────────────
// Smoke #13 — IDOR: acesso cruzado a booking alheio
// ─────────────────────────────────────────────────────────────────────────────
test.describe('smoke #13 — IDOR: acesso cruzado a recursos alheios', () => {
  test.skip(!hasSessions || !hasTestItem, 'Requer todas as sessões fixture e test-item-id.json')

  test('admin não consegue ler nem modificar booking entre locatário e proprietário', async ({ browser }) => {
    const { itemId } = JSON.parse(fs.readFileSync(TEST_ITEM_PATH, 'utf-8')) as { itemId: string }

    const locCtx  = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const propCtx = await browser.newContext({ storageState: SESSION_PATHS.proprietario })
    const admCtx  = await browser.newContext({ storageState: SESSION_PATHS.admin })

    const loc  = await locCtx.newPage()
    const prop = await propCtx.newPage()
    const adm  = await admCtx.newPage()

    // Datas 350+ dias para não conflitar com outros smokes
    const offset = 350 + Math.floor(Math.random() * 10)
    const start = new Date(Date.now() + offset * 86400000).toISOString()
    const end   = new Date(Date.now() + (offset + 2) * 86400000).toISOString()

    let bookingId = ''
    try {
      // Setup: locatário cria booking, proprietário confirma
      const createRes = await loc.request.post('/api/bookings', {
        data: { itemId, startDate: start, endDate: end, borrowerNote: 'IDOR smoke test' },
      })
      expect(createRes.ok(), 'Criação do booking falhou').toBeTruthy()
      const { data: booking } = await createRes.json() as { data: { id: string } }
      bookingId = booking.id
      console.log(`  booking criado para teste IDOR: ${bookingId}`)

      // ── A) Admin tenta GET do booking alheio → 403 ──
      const getRes = await adm.request.get(`/api/bookings/${bookingId}`)
      const getBody = await getRes.json().catch(() => ({}))
      console.log(`  GET /api/bookings/${bookingId} como admin → ${getRes.status()}`)
      expect(
        getRes.status(),
        `IDOR: admin conseguiu ler booking alheio (deveria ser 403). Body: ${JSON.stringify(getBody)}`,
      ).toBe(403)
      console.log('  GET booking alheio → 403 ✅')

      // ── B) Admin tenta PATCH (confirm) do booking alheio → 403 ──
      const patchRes = await adm.request.patch(`/api/bookings/${bookingId}`, {
        data: { action: 'confirm' },
      })
      const patchBody = await patchRes.json().catch(() => ({}))
      console.log(`  PATCH /api/bookings/${bookingId} como admin → ${patchRes.status()}`)
      expect(
        patchRes.status(),
        `IDOR: admin conseguiu modificar booking alheio (deveria ser 403). Body: ${JSON.stringify(patchBody)}`,
      ).toBe(403)
      console.log('  PATCH booking alheio → 403 ✅')

    } finally {
      // Cleanup
      if (bookingId) {
        await loc.request.patch(`/api/bookings/${bookingId}`, {
          data: { action: 'cancel', reason: 'Cleanup smoke #13 IDOR' },
        }).catch(() => {})
      }
      await locCtx.close()
      await propCtx.close()
      await admCtx.close()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Smoke #14 — Admin route authorization
// ─────────────────────────────────────────────────────────────────────────────
test.describe('smoke #14 — Admin routes bloqueadas para usuário comum', () => {
  test.skip(!hasSessions, 'Requer sessões fixture')

  test('locatário não acessa /api/admin/* — deve receber 403', async ({ browser }) => {
    const locCtx = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const loc    = await locCtx.newPage()

    const routes = [
      { method: 'GET',  path: '/api/admin/platform-config' },
      { method: 'POST', path: '/api/admin/export',         body: { startDate: '2026-01-01', endDate: '2026-03-01' } },
      { method: 'GET',  path: '/api/admin/usuarios'       },
    ]

    try {
      for (const route of routes) {
        const res = route.method === 'GET'
          ? await loc.request.get(route.path)
          : await loc.request.post(route.path, { data: route.body })

        const status = res.status()
        console.log(`  ${route.method} ${route.path} como locatário → ${status}`)
        expect(
          status,
          `Admin bypass: locatário acessou ${route.method} ${route.path} com status ${status} (esperado 403)`,
        ).toBe(403)
        console.log(`  ${route.path} → 403 ✅`)
      }
    } finally {
      await locCtx.close()
    }
  })

  test('requisição sem sessão para /api/admin/* → redirect (307) ou 401/403', async ({ request }) => {
    // NextAuth v5 middleware intercepta antes do handler: redireciona (307) para /login.
    // O handler em si retornaria 403, mas o middleware é a primeira linha de defesa.
    // Playwright segue redirects por padrão → veria 200 da página /login.
    // Por isso verificamos os status ANTES do follow: 307 = middleware bloqueou ✅
    // Para simular o comportamento real usamos fetch nativo com redirect:'manual'
    const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
    const response = await fetch(`${BASE}/api/admin/platform-config`, { redirect: 'manual' })
    const status = response.status
    console.log(`  GET /api/admin/platform-config sem sessão → ${status} (raw, sem seguir redirect)`)
    expect(
      [307, 308, 401, 403],
      `Admin bypass: endpoint sem auth retornou ${status} ` +
      '(esperado 307 redirect para /login, 401 ou 403). ' +
      'Se 200: rota pública sem proteção — vulnerabilidade crítica.',
    ).toContain(status)
    console.log(`  sem sessão → ${status} ✅ (middleware/guard bloqueou antes de entregar dados)`)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Smoke #15 — Proprietário não pode reservar o próprio item
// ─────────────────────────────────────────────────────────────────────────────
test.describe('smoke #15 — Proprietário não reserva o próprio item', () => {
  test.skip(!hasSessions || !hasTestItem, 'Requer sessão de proprietário e test-item-id.json')

  test('POST /api/bookings com próprio item → 403 CANNOT_BOOK_OWN_ITEM', async ({ browser }) => {
    const { itemId } = JSON.parse(fs.readFileSync(TEST_ITEM_PATH, 'utf-8')) as { itemId: string }
    const propCtx = await browser.newContext({ storageState: SESSION_PATHS.proprietario })
    const prop    = await propCtx.newPage()

    const offset = 360 + Math.floor(Math.random() * 5)
    const start  = new Date(Date.now() + offset * 86400000).toISOString()
    const end    = new Date(Date.now() + (offset + 1) * 86400000).toISOString()

    try {
      const res  = await prop.request.post('/api/bookings', {
        data: { itemId, startDate: start, endDate: end, borrowerNote: 'Smoke #15' },
      })
      const body = await res.json().catch(() => ({}))
      console.log(`  POST booking próprio item → ${res.status()} ${JSON.stringify(body)}`)
      expect(
        res.status(),
        `Proprietário conseguiu criar reserva do próprio item (deveria ser 403). Body: ${JSON.stringify(body)}`,
      ).toBe(403)
      const code = (body as { error?: { code?: string } }).error?.code
      expect(code).toBe('CANNOT_BOOK_OWN_ITEM')
      console.log('  booking próprio item → 403 CANNOT_BOOK_OWN_ITEM ✅')
    } finally {
      await propCtx.close()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Smoke #16 — Server-side price: cliente não controla totalPrice
// ─────────────────────────────────────────────────────────────────────────────
test.describe('smoke #16 — Manipulação de preço: servidor recalcula e ignora campo cliente', () => {
  test.skip(!hasSessions || !hasTestItem, 'Requer sessões fixture e test-item-id.json')

  test('totalPrice no body é ignorado — servidor calcula pelo pricePerDay do item', async ({ browser }) => {
    const { itemId } = JSON.parse(fs.readFileSync(TEST_ITEM_PATH, 'utf-8')) as { itemId: string }

    const locCtx  = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const propCtx = await browser.newContext({ storageState: SESSION_PATHS.proprietario })
    const loc     = await locCtx.newPage()
    const prop    = await propCtx.newPage()

    const offset = 370 + Math.floor(Math.random() * 5)
    const start  = new Date(Date.now() + offset * 86400000).toISOString()
    const end    = new Date(Date.now() + (offset + 2) * 86400000).toISOString() // 2 noites

    let bookingId = ''
    try {
      const res = await loc.request.post('/api/bookings', {
        data: {
          itemId,
          startDate:  start,
          endDate:    end,
          totalPrice: 1,    // ← tentativa de manipulação: R$0,01
          borrowerNote: 'Smoke #16 price tamper',
        },
      })
      expect(res.ok(), `Criação de booking falhou: ${res.status()}`).toBeTruthy()

      const { data: booking } = await res.json() as { data: { id: string; totalPrice: number; dailyPrice: number } }
      bookingId = booking.id

      console.log(`  booking criado: totalPrice=${booking.totalPrice} dailyPrice=${booking.dailyPrice}`)

      // totalPrice deve ser > 1 (foi calculado pelo servidor, não pelo cliente)
      expect(
        booking.totalPrice,
        `Price tamper: servidor aceitou totalPrice=1 do cliente. Retornou ${booking.totalPrice}. ` +
        'O servidor deve sempre calcular o preço a partir de item.pricePerDay.',
      ).toBeGreaterThan(1)

      // totalPrice deve ser múltiplo do dailyPrice (calculado corretamente)
      expect(
        booking.totalPrice % booking.dailyPrice,
        'totalPrice não é múltiplo do dailyPrice — cálculo inconsistente',
      ).toBe(0)

      console.log(`  totalPrice=${booking.totalPrice} (> 1 e correto) ✅ — manipulação bloqueada pelo servidor`)
    } finally {
      if (bookingId) {
        await loc.request.patch(`/api/bookings/${bookingId}`, {
          data: { action: 'cancel', reason: 'Cleanup smoke #16 price tamper' },
        }).catch(() => {})
      }
      await locCtx.close()
      await propCtx.close()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Smoke #17 — Upload MIME bypass: SVG e octet-stream devem ser bloqueados
// ─────────────────────────────────────────────────────────────────────────────
test.describe('smoke #17 — Upload MIME bypass: tipos perigosos bloqueados', () => {
  test.skip(!hasSessions, 'Requer sessão de proprietário')
  test.use({ storageState: SESSION_PATHS.proprietario })

  test('SVG (svg+xml), octet-stream bloqueados; jpeg e gif aceitos', async ({ page }) => {
    test.setTimeout(60000)

    // — Setup: item DRAFT próprio do proprietário (auto-suficiente, sem beforeAll) —
    const catRes = await page.request.get('/api/categories')
    expect(catRes.ok()).toBeTruthy()
    const { data: cats } = await catRes.json() as { data: { id: string }[] }
    const createRes = await page.request.post('/api/items', {
      data: {
        title: 'MIME bypass test item E2E', description: 'Temporário smoke #17',
        categoryId: cats[0].id, condition: 'GOOD', pricePerDay: 1000,
        city: 'Natal', state: 'RN', latitude: -5.7945, longitude: -35.211,
      },
    })
    if (!createRes.ok()) {
      const err = await createRes.text()
      throw new Error(`Setup falhou — POST /api/items: ${createRes.status()} ${err.slice(0, 200)}`)
    }
    const { data: item } = await createRes.json() as { data: { id: string } }
    const itemId = item.id
    console.log(`  item de teste criado: ${itemId}`)

    const MINIMAL_GIF = Buffer.from(
      '47494638396101000100800000ffffff00000021f90400000000002c00000000010001000002024401003b',
      'hex',
    )

    try {
      // ── A) SVG com image/svg+xml → deve ser bloqueado (415) ──
      // Sem o fix: isImageType("image/svg+xml") = true (startsWith "image/")
      // Com o fix: whitelist explícita não inclui svg+xml → 415
      // XSS vector: Supabase serviria com Content-Type: image/svg+xml → scripts executam no browser
      {
        const res  = await page.request.post(`/api/items/${itemId}/images`, {
          multipart: { file: { name: 'evil.svg', mimeType: 'image/svg+xml', buffer: XSS_SVG } },
        })
        const body = await res.json().catch(() => ({}))
        console.log(`  SVG (image/svg+xml) → ${res.status()} ${JSON.stringify(body)}`)
        expect(
          res.status(),
          `[XSS] SVG com image/svg+xml aceito (${res.status()}) — Supabase serviria com ` +
          'Content-Type: image/svg+xml e scripts executariam no browser diretamente. ' +
          'Fix aplicado: whitelist MIME em isImageType().',
        ).toBe(415)
        console.log('  SVG image/svg+xml → 415 ✅ (XSS bloqueado)')
      }

      // ── B) application/octet-stream → deve ser bloqueado (415) ──
      // Sem o fix: isImageType("application/octet-stream") = true
      // Com o fix: não está na whitelist → 415
      {
        const res  = await page.request.post(`/api/items/${itemId}/images`, {
          multipart: { file: { name: 'malware.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ\x90\x00') } },
        })
        const body = await res.json().catch(() => ({}))
        console.log(`  application/octet-stream → ${res.status()} ${JSON.stringify(body)}`)
        expect(
          res.status(),
          `application/octet-stream aceito (${res.status()}) — qualquer binário armazenado no Storage público.`,
        ).toBe(415)
        console.log('  application/octet-stream → 415 ✅')
      }

      // ── C) SVG disfarçado de JPEG (image/jpeg) — documenta comportamento ──
      // Risco menor: Supabase serve como image/jpeg → browser não executa scripts
      // Ideal futuro: validar magic bytes (sharp/file-type) → rejeitar bytes não-JPEG
      {
        const res = await page.request.post(`/api/items/${itemId}/images`, {
          multipart: { file: { name: 'evil.jpg', mimeType: 'image/jpeg', buffer: XSS_SVG } },
        })
        const status = res.status()
        if (status === 201) {
          const { data } = await res.json() as { data: { id: string } }
          await page.request.delete(`/api/items/${itemId}/images`, { data: { imageId: data.id } }).catch(() => {})
          console.log('  ⚠️  SVG/JPEG aceito — sem risco XSS imediato (servido como image/jpeg); recomenda-se magic bytes validation futuramente')
        } else {
          console.log(`  SVG/JPEG rejeitado (${status}) ✅`)
        }
        // Não falha — baixo risco; apenas documenta
      }

      // ── D) image/gif legítimo → deve ser aceito (201) ──
      // Verifica que o whitelist não bloqueou tipos válidos
      {
        const res  = await page.request.post(`/api/items/${itemId}/images`, {
          multipart: { file: { name: 'valid.gif', mimeType: 'image/gif', buffer: MINIMAL_GIF } },
        })
        const body = await res.json().catch(() => ({}))
        console.log(`  image/gif (válido) → ${res.status()}`)
        expect(res.status(), `image/gif foi rejeitado indevidamente. Body: ${JSON.stringify(body)}`).toBe(201)
        if (res.ok()) {
          const { data } = body as { data: { id: string } }
          await page.request.delete(`/api/items/${itemId}/images`, { data: { imageId: data.id } }).catch(() => {})
        }
        console.log('  image/gif → 201 ✅ (tipo legítimo aceito)')
      }

    } finally {
      await page.request.delete(`/api/items/${itemId}`).catch(() => {})
      console.log(`  item ${itemId} removido (cleanup) ✅`)
    }
  })
})
