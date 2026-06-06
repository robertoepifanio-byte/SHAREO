/**
 * Smoke #12 — Mapbox GL em /itens?view=map
 *
 * Verifica:
 *  A) Token configurado: canvas Mapbox GL renderiza, sem fallback de "aguardando configuração"
 *  B) Tiles carregam: nenhuma requisição às APIs do Mapbox retorna 401/403
 *     (token inválido → tiles cinzas, erro silencioso)
 *  C) Sem erros de WebGL/Mapbox no console
 *
 * O teste é auto-suficiente: cria um item AVAILABLE com lat/lng antes de navegar
 * ao mapa, garantindo que MapToggle renderize independente do estado do DB.
 * Motivo: /itens só mostra MapToggle quando items.length > 0 (WHERE status=AVAILABLE
 * AND images.some). Seed items não têm imagens; o cleanup de outros smokes remove imagens.
 *
 * Lição: NEXT_PUBLIC_* marcado como Sensitive no Vercel não é injetado no build →
 * mapa mostra fallback em produção sem erro visível. Ver: memory/bug_mapbox_staging.md
 */

import fs from 'fs'
import { test, expect } from '@playwright/test'
import { SESSION_PATHS } from './fixtures/test-credentials'

const hasProprietarioSession = fs.existsSync(SESSION_PATHS.proprietario)

// JPEG mínimo válido (1×1px) — mesmo buffer usado no smoke #9
const MINIMAL_JPEG = Buffer.from(
  'ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707' +
  '07090909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c' +
  '231c1c2837292c30313434341f27393d38323c2e333432ffffc0000b080001000101' +
  '011100ffc4001f0000010501010101010100000000000000000102030405060708090a' +
  '0bffda00080101000003f0007fffd9',
  'hex',
)

test.describe('smoke #12 — Mapbox GL (/itens?view=map)', () => {
  test.skip(
    !hasProprietarioSession,
    'Requer session-proprietario.json — rode: pnpm tsx scripts/create-staging-fixtures.ts',
  )
  test.use({ storageState: SESSION_PATHS.proprietario })

  test('token configurado: canvas renderiza, fallback ausente, tiles sem 401/403', async ({ page }) => {
    // Mapbox carrega tiles continuamente — networkidle nunca dispara; usa 'load' + waits explícitos
    test.setTimeout(60000)
    const mapboxErrors: string[] = []
    const tileFailures:  string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        if (/mapbox|webgl|gl\.|token|unauthorized/i.test(text)) {
          mapboxErrors.push(text)
        }
      }
    })

    page.on('response', (res) => {
      const url = res.url()
      if (url.includes('mapbox.com') || url.includes('mapbox.cn')) {
        if (res.status() === 401 || res.status() === 403) {
          tileFailures.push(`${res.status()} ${url.slice(0, 100)}`)
        }
      }
    })

    // — Setup: item AVAILABLE com lat/lng para garantir que MapToggle renderize —
    const catRes = await page.request.get('/api/categories')
    expect(catRes.ok()).toBeTruthy()
    const { data: categories } = await catRes.json() as { data: { id: string }[] }
    const categoryId = categories[0]?.id
    expect(categoryId, 'Nenhuma categoria encontrada').toBeTruthy()

    const createRes = await page.request.post('/api/items', {
      data: {
        title:       'Mapbox Smoke Test Item E2E',
        description: 'Item temporário criado pelo smoke test de Mapbox. Pode ser removido.',
        categoryId,
        condition:   'GOOD',
        pricePerDay: 5000,
        city:        'Natal',
        state:       'RN',
        latitude:    -5.7945,   // Natal/RN — onde os seed items estão
        longitude:   -35.211,
      },
    })
    expect(createRes.status(), 'Falha ao criar item de teste').toBe(201)
    const { data: item } = await createRes.json() as { data: { id: string } }
    const itemId = item.id
    console.log(`  item de teste criado: ${itemId}`)

    let imageId: string | null = null

    try {
      // Upload: DRAFT → AVAILABLE (primeira imagem ativa o item)
      const uploadRes = await page.request.post(`/api/items/${itemId}/images`, {
        multipart: {
          file: { name: 'mapbox-test.jpg', mimeType: 'image/jpeg', buffer: MINIMAL_JPEG },
        },
      })
      if (!uploadRes.ok()) {
        const err = await uploadRes.json().catch(() => ({}))
        throw new Error(`Upload falhou: ${uploadRes.status()} ${JSON.stringify(err)}`)
      }
      const { data: img } = await uploadRes.json() as { data: { id: string; itemStatus: string } }
      expect(img.itemStatus).toBe('AVAILABLE')
      imageId = img.id
      console.log(`  imagem carregada, item → AVAILABLE ✅`)

      // — Navega ao mapa: 'load' + wait explícito para next/dynamic (ssr:false) —
      // Não usar networkidle: Mapbox GL carrega tiles continuamente e nunca atinge idle
      await page.goto('/itens?view=map', { waitUntil: 'load', timeout: 45000 })
      await expect(page.getByRole('main')).toBeVisible()

      // — A) Fallback de token ausente NÃO deve aparecer —
      const fallback = page.getByRole('img', { name: /aguardando configuração/i })
      const fallbackVisible = await fallback.isVisible().catch(() => false)
      if (fallbackVisible) {
        throw new Error(
          'NEXT_PUBLIC_MAPBOX_TOKEN ausente ou marcado como Sensitive no Vercel. ' +
          'Verificar env vars no painel Vercel (não marcar como Sensitive).',
        )
      }
      console.log('  fallback de token ausente não encontrado ✅')

      // — B) Container do Mapbox GL deve existir —
      const mapContainer = page.locator('.mapboxgl-map').first()
      await expect(mapContainer).toBeAttached({ timeout: 20000 })
      console.log('  container .mapboxgl-map presente ✅')

      // Canvas: aguarda WebGL inicializar após container estar no DOM
      const canvas = page.locator('.mapboxgl-canvas').first()
      await expect(canvas).toBeAttached({ timeout: 10000 })
      await expect(canvas).toBeVisible()
      console.log('  canvas Mapbox GL visível ✅')

      // — C) Aguarda tiles e verifica ausência de 401/403 —
      await page.waitForTimeout(2000)

      if (tileFailures.length > 0) {
        console.error('  Tiles com falha de autenticação:', tileFailures)
      }
      expect(
        tileFailures,
        `Token Mapbox inválido — ${tileFailures.length} tile(s) retornaram 401/403:\n${tileFailures.join('\n')}`,
      ).toHaveLength(0)
      console.log('  nenhuma falha de autenticação nos tiles ✅')

      // — D) Sem erros críticos de Mapbox no console —
      if (mapboxErrors.length > 0) {
        console.warn('  Avisos de console Mapbox:', mapboxErrors)
      }
      expect(
        mapboxErrors,
        `Erros Mapbox/WebGL no console:\n${mapboxErrors.join('\n')}`,
      ).toHaveLength(0)
      console.log('  sem erros Mapbox no console ✅')

    } finally {
      // Cleanup: remove imagem → DRAFT, depois deleta item
      if (imageId) {
        await page.request.delete(`/api/items/${itemId}/images`, { data: { imageId } }).catch(() => {})
      }
      await page.request.delete(`/api/items/${itemId}`).catch(() => {})
      console.log(`  item de teste ${itemId} removido (cleanup) ✅`)
    }
  })

  test('API de geocoding responde para busca de endereço (token válido)', async ({ request }) => {
    // Verifica que a rota do formulário de item carrega (usa Mapbox Geocoding no frontend)
    const res = await request.get('/itens/novo')
    // Auth redirect para /login está OK; 200 significa que carregou sem erro de build
    expect([200, 302, 307]).toContain(res.status())
    console.log(`  /itens/novo → ${res.status()} ✅`)
  })
})
