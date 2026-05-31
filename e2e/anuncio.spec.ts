/**
 * Smoke #8 — Anúncio de item
 *
 * Cobertura:
 *  1. Visitante não autenticado é redirecionado de /itens/novo para /login
 *  2. Proprietário autenticado acessa /itens/novo e vê formulário com campos obrigatórios
 *  3. Criação de item via API (com session do proprietário fixture) → resposta 201
 *  4. Item criado aparece em /meus-anuncios
 *
 * O item criado no teste 3 é salvo em e2e/fixtures/test-item-id.json para uso
 * pelo smoke #5 (fluxo de reserva).
 *
 * Session fixture: e2e/fixtures/session-proprietario.json
 * Gerar com: pnpm tsx scripts/create-staging-fixtures.ts
 */

import fs from 'fs'
import path from 'path'
import { test, expect } from '@playwright/test'
import { SESSION_PATHS } from './fixtures/test-credentials'

const hasProprietarioSession = fs.existsSync(SESSION_PATHS.proprietario)

export const TEST_ITEM_PATH = path.resolve('e2e/fixtures/test-item-id.json')

// ---------------------------------------------------------------------------
// 1. Visitante não autenticado
// ---------------------------------------------------------------------------

test.describe('anúncio — visitante não autenticado', () => {
  test('/itens/novo redireciona visitante para /login', async ({ page }) => {
    await page.goto('/itens/novo')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})

// ---------------------------------------------------------------------------
// 2–4. Proprietário autenticado
// ---------------------------------------------------------------------------

test.describe('anúncio — proprietário autenticado', () => {
  test.skip(
    !hasProprietarioSession,
    'Session fixture não encontrada — rode: pnpm tsx scripts/create-staging-fixtures.ts',
  )
  test.use({ storageState: SESSION_PATHS.proprietario })

  test('/itens/novo carrega formulário com campos obrigatórios', async ({ page }) => {
    await page.goto('/itens/novo')
    await expect(page).toHaveURL(/\/itens\/novo/, { timeout: 15000 })
    await expect(page.getByRole('heading', { name: /criar anúncio/i })).toBeVisible()
    await expect(page.getByLabel(/título do anúncio/i)).toBeVisible()
    await expect(page.getByLabel(/descrição/i)).toBeVisible()
    await expect(page.getByLabel(/preço por dia/i)).toBeVisible()
  })

  test('cria item via API (proprietário) → 201 e salva ID para smoke #5', async ({ page }) => {
    // Busca uma categoria válida para o payload
    const catRes = await page.request.get('/api/categories')
    expect(catRes.ok()).toBeTruthy()
    const { data: categories } = await catRes.json() as { data: { id: string; name: string }[] }
    const categoryId = categories[0]?.id
    expect(categoryId).toBeTruthy()

    const res = await page.request.post('/api/items', {
      data: {
        title:       'Câmera Fixture E2E Smoke Test',
        description: 'Item criado pelo smoke test E2E automatizado. Pode ser removido após os testes.',
        categoryId,
        condition:   'GOOD',
        pricePerDay: 5000,    // R$ 50,00 (valor em centavos)
        city:        'Natal',
        state:       'RN',
        latitude:    -5.7945,
        longitude:   -35.211,
      },
    })

    expect(res.status()).toBe(201)
    const { data: item } = await res.json() as { data: { id: string; title: string } }
    expect(item.id).toBeTruthy()

    fs.writeFileSync(TEST_ITEM_PATH, JSON.stringify({ itemId: item.id }, null, 2))
    console.log(`  item criado: ${item.id}`)
  })

  test('item recém-criado aparece em /meus-anuncios', async ({ page }) => {
    test.skip(!fs.existsSync(TEST_ITEM_PATH), 'test-item-id.json não encontrado — rode o teste anterior primeiro')

    await page.goto('/meus-anuncios')
    await expect(page).toHaveURL(/\/meus-anuncios/, { timeout: 15000 })
    await expect(page.getByText('Câmera Fixture E2E Smoke Test')).toBeVisible({ timeout: 10000 })
  })
})
