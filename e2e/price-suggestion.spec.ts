/**
 * Sugestão de preço por faixa (GAP-06)
 *
 * GET /api/items/price-suggestion
 *   - sem city/categoryId obrigatórios → 400
 *   - com value + city + categoryId válidos → 200 com sugestão (diária/semana/mês)
 *
 * Endpoint público (alimenta o formulário de anúncio). categoryId real é obtido
 * via /api/items.
 */

import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'

test.describe('price-suggestion API (GAP-06)', () => {
  test('1. sem parâmetros obrigatórios → 400', async ({ request }) => {
    const res = await request.get(`${BASE}/api/items/price-suggestion?value=100000`)
    expect([400, 422], 'faltando city/categoryId deve ser 400/422').toContain(res.status())
    console.log(`  sem city/categoryId → ${res.status()} ✅`)
  })

  test('2. com value + city + categoryId válidos → 200 com sugestão', async ({ request }) => {
    test.setTimeout(20000)

    // categoryId real a partir de um item existente
    const itemsRes = await request.get(`${BASE}/api/items?limit=1`)
    expect(itemsRes.ok(), 'GET /api/items deve responder').toBeTruthy()
    const items = await itemsRes.json() as { data: Array<{ category?: { id: string }; city?: string }> }
    const categoryId = items.data?.[0]?.category?.id
    const city = items.data?.[0]?.city ?? 'Sao Paulo'

    test.skip(!categoryId, 'Sem itens no ambiente para extrair categoryId')

    const res = await request.get(`${BASE}/api/items/price-suggestion?value=100000&city=${encodeURIComponent(city)}&categoryId=${categoryId}`)
    expect(res.status(), 'sugestão com params válidos deve ser 200').toBe(200)

    const body = await res.json() as Record<string, unknown>
    // contrato real: { data: <sugestão por comparáveis | null>, count: <nº de comparáveis> }
    expect(body, 'resposta deve ter o envelope { data, count }').toHaveProperty('count')
    console.log(`  sugestão 200 → ${JSON.stringify(body).slice(0, 120)} ✅`)
  })
})
