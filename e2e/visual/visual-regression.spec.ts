/**
 * visual-regression.spec.ts
 *
 * Regressão visual com screenshot nativo do Playwright (toHaveScreenshot).
 * Não usa SaaS externo (Percy/Chromatic) — imagens ficam 100% locais.
 *
 * PÁGINAS COBERTAS (todas públicas, sem autenticação):
 *   /        — Home
 *   /itens   — Listagem de anúncios
 *   /login   — Formulário de login
 *
 * VIEWPORTS:
 *   desktop  → 1280 × 720   (project "visual-desktop"  em playwright.visual.config.ts)
 *   mobile   → 375 × 812    (project "visual-mobile"   em playwright.visual.config.ts)
 *
 * ANTI-FLAKINESS:
 *   - CSS `prefers-reduced-motion` reduzida via arg de launch (playwright.visual.config.ts)
 *   - `animations: 'disabled'` aplicado em cada screenshot call
 *   - Conteúdo dinâmico mascarado com `mask:` (ver seção "O QUE FOI MASCARADO" abaixo)
 *   - Imagens externas (Supabase Storage / Mapbox) mascaradas
 *   - `maxDiffPixelRatio: 0.02` — tolerância de 2 % para anti-aliasing de fonte/OS
 *
 * O QUE FOI MASCARADO:
 *   Home (/):
 *     [role="list"][aria-label="Números da plataforma"]  — contadores dinâmicos
 *     (itemCount, ownerCount, avgRating, cityItemCount — variam conforme o banco)
 *     [aria-label="Por que entrar na lista"] p (social proof count da ListaVIP)
 *     FounderCaptureForm (texto de social proof dinâmico)
 *
 *   Itens (/itens):
 *     [aria-live="polite"]           — contador de anúncios encontrados (muda com DB)
 *     article img                    — imagens dos cards (URLs externas Supabase Storage)
 *     .grid article                  — cards inteiros são mascarados (títulos, preços,
 *                                      localizações — todos vindos do banco)
 *
 *   Login (/login):
 *     footer p (copyright year)      — new Date().getFullYear() no layout de auth
 *
 * BASELINE DE PLATAFORMA:
 *   Baselines geradas no Windows são armazenadas em
 *   e2e/visual/visual-regression.spec.ts-snapshots/
 *   Rodar no Linux/CI produz screenshots ligeiramente diferentes (renderização de fonte).
 *   Ver e2e/visual/README.md para instruções de geração de baseline Linux via Docker.
 */

import { test, expect, type Page, type Locator } from '@playwright/test'

// ─── Configuração global do screenshot ──────────────────────────────────────

const SCREENSHOT_OPTS = {
  animations: 'disabled' as const,
  // 2 % de tolerância pixel-a-pixel: cobre diferenças de anti-aliasing
  // entre versões de Chromium e variações de renderização de fonte no OS.
  maxDiffPixelRatio: 0.02,
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Aguarda a página carregar completamente:
 * - networkidle garante que imagens lazy e requisições de hidratação terminaram
 * - Aguarda que o <main> esteja visível
 */
async function waitForStable(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 30_000 })
  await page.locator('main, [role="main"]').first().waitFor({ state: 'visible', timeout: 10_000 })
}

/**
 * Retorna o locator do grid de cards de item na página /itens.
 * Usamos o elemento pai para mascarar todos os cards de uma vez.
 */
function itemGridLocator(page: Page): Locator {
  // O grid está dentro de um div com classes "grid grid-cols-2"
  // Usamos o aria de "N anúncios encontrados" como âncora e subimos
  // para o contêiner pai — mas é mais simples selecionar pelos articles diretamente.
  return page.locator('article').filter({ has: page.locator('img, [aria-hidden="true"]') })
}

// ─── HOME (/) ───────────────────────────────────────────────────────────────

test.describe('Visual — Home (/)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await waitForStable(page)
  })

  test('above-the-fold desktop/mobile', async ({ page }) => {
    // Captura apenas o hero (above-the-fold) — mais estável que fullPage
    // porque evita conteúdo de scroll que pode ter altura variável.
    const hero = page.locator('section[aria-label="Seção principal"]')
    await hero.waitFor({ state: 'visible' })

    await expect(hero).toHaveScreenshot('home-hero.png', {
      ...SCREENSHOT_OPTS,
      mask: [
        // Contadores dinâmicos (itemCount, ownerCount, avgRating, cityItemCount)
        page.locator('[role="list"][aria-label="Números da plataforma"]'),
      ],
    })
  })

  test('simulador de renda (acima do fold de scroll)', async ({ page }) => {
    const simulador = page.locator('#simulador-renda')
    await simulador.scrollIntoViewIfNeeded()
    await simulador.waitFor({ state: 'visible' })

    await expect(simulador).toHaveScreenshot('home-simulador.png', {
      ...SCREENSHOT_OPTS,
      // O simulador é 100% estático no estado inicial (sem interação)
    })
  })

  test('seção categorias', async ({ page }) => {
    const cats = page.locator('#categorias')
    await cats.scrollIntoViewIfNeeded()
    await cats.waitFor({ state: 'visible' })

    await expect(cats).toHaveScreenshot('home-categorias.png', {
      ...SCREENSHOT_OPTS,
    })
  })

  test('página completa (fullPage, com máscaras)', async ({ page }) => {
    await expect(page).toHaveScreenshot('home-full.png', {
      ...SCREENSHOT_OPTS,
      fullPage: true,
      mask: [
        // Contadores da hero section
        page.locator('[role="list"][aria-label="Números da plataforma"]'),
        // Social proof da ListaVIP (contagem de leads — dinâmico)
        page.locator('#lista-vip p').last(),
        // FounderCaptureForm (formulário de captação)
        page.locator('#lista-vip form, #lista-vip [role="form"]'),
        // Imagens dos "Itens mais procurados" (caso haja imagens externas)
        page.locator('#itens-procurados img'),
      ],
    })
  })
})

// ─── LISTAGEM DE ITENS (/itens) ──────────────────────────────────────────────

test.describe('Visual — Listagem (/itens)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/itens', { waitUntil: 'domcontentloaded' })
    await waitForStable(page)
  })

  test('barra de busca e filtros', async ({ page }) => {
    // Captura apenas o formulário de busca — elemento 100% estático
    const searchBar = page.locator('form[role="search"]')
    await searchBar.waitFor({ state: 'visible', timeout: 15_000 })

    await expect(searchBar).toHaveScreenshot('itens-search-bar.png', {
      ...SCREENSHOT_OPTS,
    })
  })

  test('página completa com grid mascarado (fullPage)', async ({ page }) => {
    // Aguarda pelo menos 1 card ou o estado vazio
    await page.waitForSelector('article, h3:has-text("Nenhum resultado")', { timeout: 15_000 })

    await expect(page).toHaveScreenshot('itens-full.png', {
      ...SCREENSHOT_OPTS,
      fullPage: true,
      mask: [
        // Cards de item: títulos, preços, fotos — tudo dinâmico vindo do banco
        page.locator('article'),
        // Contador de resultados ("N anúncios encontrados") — dinâmico
        page.locator('[aria-live="polite"]'),
        // Mapa Mapbox (quando visível) — tiles externos e pins dinâmicos
        page.locator('.mapboxgl-map, [class*="mapbox"]'),
        // Imagens de qualquer tipo na listagem (Supabase Storage)
        page.locator('main img'),
      ],
    })
  })

  test('estado vazio (sem resultados para busca inexistente)', async ({ page }) => {
    // Navega com um termo de busca que certamente não terá resultados
    await page.goto('/itens?search=xyzzy_termo_que_nao_existe_shareo', { waitUntil: 'domcontentloaded' })
    await waitForStable(page)

    const emptyState = page.locator('h3:has-text("Nenhum resultado")')
    const hasEmpty = await emptyState.isVisible().catch(() => false)

    if (hasEmpty) {
      const emptyContainer = emptyState.locator('xpath=ancestor::div[contains(@class,"flex")]').first()
      await expect(emptyContainer).toHaveScreenshot('itens-empty-state.png', {
        ...SCREENSHOT_OPTS,
      })
    } else {
      // Se por algum motivo houver resultados, registra aviso e pula
      test.skip(true, 'Estado vazio não apareceu — banco tem itens com termo inesperado')
    }
  })
})

// ─── LOGIN (/login) ──────────────────────────────────────────────────────────

test.describe('Visual — Login (/login)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await waitForStable(page)
  })

  test('formulário de login', async ({ page }) => {
    const form = page.locator('[class*="rounded-lg border"][class*="bg-surface"]').first()
    await form.waitFor({ state: 'visible' })

    await expect(form).toHaveScreenshot('login-form.png', {
      ...SCREENSHOT_OPTS,
      // Formulário de login é 100% estático — sem máscaras necessárias
    })
  })

  test('página completa (fullPage)', async ({ page }) => {
    await expect(page).toHaveScreenshot('login-full.png', {
      ...SCREENSHOT_OPTS,
      fullPage: true,
      mask: [
        // Copyright year: "© 2026 ShareO" — new Date().getFullYear() no layout
        page.locator('main > p').last(),
      ],
    })
  })
})
