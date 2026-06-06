/**
 * Smoke #9 — Upload de imagem de item (Supabase Storage)
 *
 * Cobre o caminho crítico que transforma um item DRAFT em AVAILABLE:
 *   1. Cria item DRAFT via API
 *   2. Faz upload de imagem via multipart → verifica 201 + itemStatus AVAILABLE
 *   3. Verifica que a URL pública da imagem é acessível (GET → 200)
 *   4. Verifica que GET /api/items/:id retorna status AVAILABLE
 *   5. Remove a imagem → verifica que item volta para DRAFT
 *   6. Cleanup: deleta o item de teste
 *
 * Se qualquer passo falhar (ex: SUPABASE_SERVICE_ROLE_KEY ausente, bucket
 * inexistente, CORS errado), proprietários não conseguem publicar itens
 * em produção.
 *
 * Session fixture: e2e/fixtures/session-proprietario.json
 */

import fs from 'fs'
import { test, expect } from '@playwright/test'
import { SESSION_PATHS } from './fixtures/test-credentials'

const hasProprietarioSession = fs.existsSync(SESSION_PATHS.proprietario)

// JPEG mínimo válido (1×1px, branco) — evita dependência de arquivo externo
const MINIMAL_JPEG = Buffer.from(
  'ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707' +
  '07090909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c' +
  '231c1c2837292c30313434341f27393d38323c2e333432ffffc0000b080001000101' +
  '011100ffc4001f0000010501010101010100000000000000000102030405060708090a' +
  '0bffda00080101000003f0007fffd9',
  'hex',
)

test.describe('smoke #9 — upload de imagem de item (Supabase Storage)', () => {
  test.skip(
    !hasProprietarioSession,
    'Requer session-proprietario.json — rode: pnpm tsx scripts/create-staging-fixtures.ts',
  )
  test.use({ storageState: SESSION_PATHS.proprietario })

  test('cria item DRAFT, faz upload de foto → AVAILABLE, remove foto → DRAFT', async ({ page }) => {
    // — 1. Cria item DRAFT —
    const catRes = await page.request.get('/api/categories')
    expect(catRes.ok()).toBeTruthy()
    const { data: categories } = await catRes.json() as { data: { id: string }[] }
    const categoryId = categories[0]?.id
    expect(categoryId).toBeTruthy()

    const createRes = await page.request.post('/api/items', {
      data: {
        title:       'Upload Test Item E2E',
        description: 'Item temporário criado pelo smoke test de upload. Pode ser removido.',
        categoryId,
        condition:   'GOOD',
        pricePerDay: 3000,
        city:        'Natal',
        state:       'RN',
        latitude:    -5.7945,
        longitude:   -35.211,
      },
    })
    expect(createRes.status()).toBe(201)
    const { data: item } = await createRes.json() as { data: { id: string; status: string } }
    expect(item.id).toBeTruthy()
    expect(item.status).toBe('DRAFT')
    const itemId = item.id
    console.log(`  item DRAFT criado: ${itemId}`)

    // — 2. Upload de imagem via multipart —
    const uploadRes = await page.request.post(`/api/items/${itemId}/images`, {
      multipart: {
        file: {
          name:     'test-photo.jpg',
          mimeType: 'image/jpeg',
          buffer:   MINIMAL_JPEG,
        },
      },
    })

    if (!uploadRes.ok()) {
      const err = await uploadRes.json().catch(() => ({}))
      console.error(`  [upload] ${uploadRes.status()}:`, JSON.stringify(err))
    }
    expect(uploadRes.status()).toBe(201)

    const { data: imageData } = await uploadRes.json() as {
      data: { id: string; url: string; order: number; itemStatus: string }
    }
    expect(imageData.id).toBeTruthy()
    expect(imageData.url).toMatch(/supabase\.co/)
    expect(imageData.itemStatus).toBe('AVAILABLE')
    const imageId = imageData.id
    const imageUrl = imageData.url
    console.log(`  upload OK → ${imageUrl}`)
    console.log(`  item promovido para AVAILABLE ✅`)

    // — 3. URL pública acessível —
    const headRes = await page.request.get(imageUrl)
    expect(headRes.ok()).toBeTruthy()
    const contentType = headRes.headers()['content-type'] ?? ''
    expect(contentType).toMatch(/image/)
    console.log(`  URL pública acessível (${contentType}) ✅`)

    // — 4. Item aparece como AVAILABLE via API —
    const itemRes = await page.request.get(`/api/items/${itemId}`)
    expect(itemRes.ok()).toBeTruthy()
    const { data: updatedItem } = await itemRes.json() as { data: { status: string } }
    expect(updatedItem.status).toBe('AVAILABLE')
    console.log(`  GET /api/items/${itemId} → AVAILABLE ✅`)

    // — 5. Remove imagem → item volta para DRAFT —
    const deleteRes = await page.request.delete(`/api/items/${itemId}/images`, {
      data: { imageId },
    })
    expect(deleteRes.status()).toBe(204)

    const afterDeleteRes = await page.request.get(`/api/items/${itemId}`)
    expect(afterDeleteRes.ok()).toBeTruthy()
    const { data: draftItem } = await afterDeleteRes.json() as { data: { status: string } }
    expect(draftItem.status).toBe('DRAFT')
    console.log(`  imagem removida → item voltou para DRAFT ✅`)

    // — 6. Cleanup: deleta item de teste —
    const destroyRes = await page.request.delete(`/api/items/${itemId}`)
    // 204 ou 200 dependendo da implementação; ignora erro silenciosamente
    console.log(`  item ${itemId} removido (${destroyRes.status()}) ✅`)
  })
})
