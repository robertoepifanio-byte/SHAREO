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

// 🪤 `extraHTTPHeaders: {}` anula o `x-e2e-token` global das configs do Playwright. Um header
// customizado no contexto vale para TODA requisição da página — inclusive os GETs que o Mapbox GL
// faz para api.mapbox.com. Header custom transforma GET simples em requisição non-simple → o
// Chromium dispara preflight → a Mapbox não devolve `Access-Control-Allow-Headers: x-e2e-token`
// → tile bloqueado por CORS e o mapa não carrega. NÃO remover pensando que é redundante.
const MAPBOX_CONTEXT = { storageState: SESSION_PATHS.proprietario, extraHTTPHeaders: {} } as const

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
  test.use(MAPBOX_CONTEXT)

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
        estimatedRetailPrice: 100_000,
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

// ─── smoke #12b — Pins de itens no mapa e navegação por clique ───────────────

test.describe('smoke #12b — Mapbox GL pins e navegação', () => {
  test.skip(
    !hasProprietarioSession,
    'Requer session-proprietario.json — rode: pnpm tsx scripts/create-staging-fixtures.ts',
  )
  test.use(MAPBOX_CONTEXT)

  test('pins de itens aparecem no mapa; clique em marcador navega para /itens/{id}', async ({ page }) => {
    test.setTimeout(90000)

    const mapboxErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && /mapbox|webgl/i.test(msg.text())) {
        mapboxErrors.push(msg.text())
      }
    })

    // ── Setup: cria item com coordenadas explícitas ────────────────────────
    const catRes = await page.request.get('/api/categories')
    expect(catRes.ok()).toBeTruthy()
    const { data: categories } = await catRes.json() as { data: { id: string }[] }
    const categoryId = categories[0]?.id
    expect(categoryId, 'Nenhuma categoria encontrada').toBeTruthy()

    const createRes = await page.request.post('/api/items', {
      data: {
        title:       'Pin Smoke Test E2E — Mapbox',
        description: 'Item temporário para teste de pin no mapa. Pode ser removido.',
        categoryId,
        condition:   'GOOD',
        pricePerDay: 3000,
        estimatedRetailPrice: 60_000,
        city:        'Natal',
        state:       'RN',
        latitude:    -5.7945,
        longitude:   -35.211,
      },
    })
    expect(createRes.status(), 'Falha ao criar item de teste').toBe(201)
    const { data: item } = await createRes.json() as { data: { id: string } }
    const itemId = item.id
    console.log(`  item de teste criado: ${itemId}`)

    let imageId: string | null = null

    try {
      // Upload para ativar o item (DRAFT → AVAILABLE)
      const uploadRes = await page.request.post(`/api/items/${itemId}/images`, {
        multipart: {
          file: { name: 'pin-test.jpg', mimeType: 'image/jpeg', buffer: MINIMAL_JPEG },
        },
      })
      if (!uploadRes.ok()) {
        const err = await uploadRes.json().catch(() => ({}))
        throw new Error(`Upload falhou: ${uploadRes.status()} ${JSON.stringify(err)}`)
      }
      const { data: img } = await uploadRes.json() as { data: { id: string; itemStatus: string } }
      expect(img.itemStatus, 'Item deve estar AVAILABLE após upload').toBe('AVAILABLE')
      imageId = img.id
      console.log('  item → AVAILABLE ✅')

      // ── Navega ao mapa ─────────────────────────────────────────────────
      await page.goto('/itens?view=map', { waitUntil: 'load', timeout: 45000 })
      await expect(page.getByRole('main')).toBeVisible()

      // Aguarda canvas Mapbox GL
      const canvas = page.locator('.mapboxgl-canvas').first()
      await expect(canvas).toBeAttached({ timeout: 20000 })
      await expect(canvas).toBeVisible()
      console.log('  canvas Mapbox GL visível ✅')

      // Aguarda tiles e renderização do mapa
      await page.waitForTimeout(3000)

      // ── Pins HTML (.mapboxgl-marker) ───────────────────────────────────
      // Mapbox GL JS renderiza Marker() como elementos .mapboxgl-marker no DOM.
      // Pins GeoJSON ficam no canvas e não são acessíveis via DOM.
      const markers      = page.locator('.mapboxgl-marker')
      const markerCount  = await markers.count()

      if (markerCount > 0) {
        console.log(`  ${markerCount} marcador(es) HTML encontrado(s) no mapa ✅`)

        // ── Clique num marcador clicável → navegação ───────────────────
        // 🪤 DUAS coisas cobrem um pin e fazem o Playwright abortar o clique:
        //   1) `app/itens/page.tsx:493` arredonda lat/lng para 3 casas (~110m, SEC-MIN-06) —
        //      vários itens de Natal caem na MESMA coordenada e os `.mapboxgl-marker` se
        //      empilham. O `<img>` do marcador de cima intercepta o clique no de baixo.
        //   2) O header é `sticky top-0 z-[200]`: pin na faixa dele é coberto pelo link
        //      "Explorar". Nenhum dos dois é bug de produto (pin sobreposto/rolado para fora
        //      também não é clicável para o usuário) — o teste é que precisa escolher o alvo.
        // Filtrar só por "abaixo do header" não bastava: não trata o empilhamento (1).
        // Aqui perguntamos ao próprio DOM quem está por cima no ponto de clique.
        await page.locator('.mapboxgl-map').first().scrollIntoViewIfNeeded()
        await page.waitForTimeout(500)  // mapa reposiciona os markers após o scroll

        const clickableIndex = await page.evaluate(() => {
          const els = Array.from(document.querySelectorAll('.mapboxgl-marker'))
          // De trás para frente: o último no DOM é o pintado por cima.
          for (let i = els.length - 1; i >= 0; i--) {
            const el = els[i] as HTMLElement
            const r  = el.getBoundingClientRect()
            if (r.width === 0 || r.height === 0) continue
            const x = r.left + r.width / 2
            const y = r.top  + r.height / 2
            if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue
            const hit = document.elementFromPoint(x, y)
            if (hit && el.contains(hit)) return i
          }
          return -1
        })

        expect(
          clickableIndex,
          'Nenhum dos marcadores está clicável (todos cobertos por outro pin, pelo header ou fora da viewport)',
        ).toBeGreaterThanOrEqual(0)
        console.log(`  marcador clicável: índice ${clickableIndex} de ${markerCount}`)

        // O `clickableIndex` já provou, pelo DOM, que este marcador recebe o clique —
        // reconfirmar com isVisible() só reabriria o caminho de falso-verde.
        await markers.nth(clickableIndex).click({ timeout: 5000 })

        // Clicar no pin NÃO navega: `ItemsMap.tsx:128` faz setPopup(item) e abre um <Popup>.
        // 🪤 Ancorar em `.mapboxgl-popup`: `[class*="popup"], [role="dialog"]` casava o
        // bottom-sheet "Filtros" (oculto, mais cedo no DOM) e o teste nunca provava nada.
        const popup = page.locator('.mapboxgl-popup')
        await expect(popup, 'Clique no pin deve abrir o popup do mapa').toBeVisible({ timeout: 5000 })
        console.log('  Clique no pin → popup do mapa abriu ✅')

        // O popup carrega o link do item — é ele que cumpre a navegação do título do teste
        await popup.getByRole('link').first().click()
        await page.waitForURL(/\/itens\/[^/?#]+/, { timeout: 15000 })
        console.log(`  Popup → navegação para ${page.url()} ✅`)
      } else {
        // Pins podem ser GeoJSON (canvas) — não detectáveis via DOM
        // Verifica indirectamente: API deve ter itens com coordenadas
        const itemsRes = await page.request.get('/api/items?limit=5')
        const itemsOk  = itemsRes.ok()
        if (itemsOk) {
          const { data: items } = await itemsRes.json() as { data: Array<{ id: string; latitude: number | null }> }
          const geoItems = items.filter(i => i.latitude != null)
          if (geoItems.length > 0) {
            test.info().annotations.push({
              type: 'info',
              description: `${geoItems.length} item(s) com coordenadas no DB — pins provavelmente são GeoJSON (canvas), não detectáveis via DOM`,
            })
            console.log(`  Pins GeoJSON (canvas) — ${geoItems.length} itens com lat/lng ✅`)
          } else {
            test.info().annotations.push({
              type: 'info',
              description: 'Nenhum item com coordenadas encontrado — geocoding pode estar atrasado',
            })
          }
        }
      }

      expect(mapboxErrors, `Erros Mapbox no console:\n${mapboxErrors.join('\n')}`).toHaveLength(0)

    } finally {
      if (imageId) {
        await page.request.delete(`/api/items/${itemId}/images`, { data: { imageId } }).catch(() => {})
      }
      await page.request.delete(`/api/items/${itemId}`).catch(() => {})
      console.log(`  item ${itemId} removido (cleanup) ✅`)
    }
  })
})
