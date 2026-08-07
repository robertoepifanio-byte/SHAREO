/**
 * Modo de pré-lançamento — campanha nacional de captação.
 *
 * Verifica:
 *  A) O gate bloqueia o marketplace (páginas → 307 para "/", APIs → 503 PRELAUNCH)
 *  B) A allowlist deixa passar landing, legais, auth e /api/founders
 *  C) A correspondência é por SEGMENTO (/loginfake NÃO passa)
 *  D) A landing não vaza link de marketplace nem BottomNav, e tem exatamente um h1
 *  E) O fluxo de CEP: sucesso, CEP inexistente e falha de rede — os três com
 *     ViaCEP INTERCEPTADO (nunca bater na API real no CI)
 *  F) O CEP nunca bloqueia a conversão: com ViaCEP fora, dá para enviar manualmente
 *
 * ⚠️ Os testes de gate só fazem sentido com NEXT_PUBLIC_PRELAUNCH_MODE=true no
 * build do ambiente alvo. Em ambiente sem a flag eles são pulados (ver skipIf),
 * em vez de falhar — assim a suíte roda igual em staging (flag on) e em produção
 * interna (flag off).
 */

import { test, expect, type Page } from '@playwright/test'

/** Lê a flag do artefato deployado — é a fonte da verdade, não o .env local. */
async function prelaunchAtivo(page: Page): Promise<boolean> {
  const res = await page.request.get('/api/health')
  const json = await res.json().catch(() => null)
  return json?.flags?.prelaunch === true
}

test.describe('pré-lançamento — gate', () => {
  test('páginas de marketplace redirecionam para a landing (307)', async ({ page, request }) => {
    test.skip(!(await prelaunchAtivo(page)), 'flag de pré-lançamento desligada neste ambiente')

    for (const path of ['/itens', '/dashboard', '/reservas', '/carrinho', '/meus-anuncios']) {
      const res = await request.get(path, { maxRedirects: 0 })
      expect(res.status(), `${path} deveria ser bloqueado`).toBe(307)
      expect(res.headers()['location']).toMatch(/\/$/)
    }
  })

  test('signup público fica fechado durante a campanha', async ({ page, request }) => {
    test.skip(!(await prelaunchAtivo(page)), 'flag desligada')
    const res = await request.get('/cadastro', { maxRedirects: 0 })
    expect(res.status()).toBe(307)
  })

  test('APIs do marketplace devolvem 503 PRELAUNCH', async ({ page, request }) => {
    test.skip(!(await prelaunchAtivo(page)), 'flag desligada')

    for (const path of ['/api/bookings', '/api/items', '/api/conversations']) {
      const res = await request.get(path)
      expect(res.status(), `${path}`).toBe(503)
      const body = await res.json()
      expect(body.error.code).toBe('PRELAUNCH')
      // 503 e não 404: 404 mentiria para o monitoramento e para o app mobile.
      expect(res.headers()['retry-after']).toBeTruthy()
    }
  })

  test('allowlist deixa passar landing, legais e captação', async ({ page, request }) => {
    test.skip(!(await prelaunchAtivo(page)), 'flag desligada')

    for (const path of ['/', '/pilotos/recife', '/termos', '/privacidade', '/politicas', '/login']) {
      const res = await request.get(path, { maxRedirects: 0 })
      expect([200, 304], `${path} deveria passar`).toContain(res.status())
    }
    // A rota de captação existe e só aceita POST — 405 prova que passou pelo gate.
    const leads = await request.get('/api/founders/leads')
    expect(leads.status()).not.toBe(503)
  })

  test('casa por segmento — /loginfake e /adminx NÃO passam', async ({ page, request }) => {
    test.skip(!(await prelaunchAtivo(page)), 'flag desligada')

    // Regressão: com startsWith(prefixo) puro em vez de comparação por segmento,
    // estas rotas abririam um buraco no gate.
    for (const path of ['/loginfake', '/adminx', '/pilotosX', '/termosdeuso']) {
      const res = await request.get(path, { maxRedirects: 0 })
      expect(res.status(), `${path} não deveria passar`).toBe(307)
    }
  })

  test('robots bloqueia indexação quando NOINDEX está ligado', async ({ page, request }) => {
    const res = await request.get('/api/health')
    const flags = (await res.json())?.flags
    test.skip(flags?.noindex !== true, 'noindex desligado neste ambiente')

    const robots = await request.get('/robots.txt')
    expect(await robots.text()).toContain('Disallow: /')
  })
})

test.describe('pré-lançamento — landing', () => {
  test('não vaza navegação de marketplace e tem um único h1', async ({ page }) => {
    test.skip(!(await prelaunchAtivo(page)), 'flag desligada')

    await page.goto('/')

    // Exatamente um h1 (a11y): a ListaVIP é promovida a h1 nesta página.
    await expect(page.locator('h1')).toHaveCount(1)

    // Nenhum link para rota bloqueada — um rodapé cheio de links que
    // redirecionam de volta é pior do que rodapé nenhum.
    const vazando = await page
      .locator('a[href^="/itens"], a[href^="/reservas"], a[href^="/mensagens"], a[href^="/dashboard"], a[href^="/perfil"], a[href^="/cadastro"]')
      .count()
    expect(vazando).toBe(0)

    // BottomNav é 100% marketplace — não pode aparecer.
    await expect(page.locator('nav').filter({ hasText: 'Explorar' })).toHaveCount(0)

    // Os links legais SÃO obrigatórios (LGPD + revisão de anúncio do Meta).
    await expect(page.locator('a[href="/privacidade"]').first()).toBeVisible()
  })
})

test.describe('pré-lançamento — captura por CEP', () => {
  /** Abre o formulário (ele começa colapsado num CTA na home). */
  async function abrirFormulario(page: Page) {
    await page.goto('/')
    const cta = page.getByRole('button', { name: /Quero ser avisado/i })
    if (await cta.count()) await cta.click()
    await expect(page.locator('#founder-email')).toBeVisible()
  }

  test('CEP válido preenche bairro/cidade/UF', async ({ page }) => {
    test.skip(!(await prelaunchAtivo(page)), 'flag desligada')

    // ViaCEP interceptado: o CI não pode depender de serviço externo.
    await page.route('**/viacep.com.br/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ logradouro: 'Rua da Aurora', bairro: 'Boa Vista', localidade: 'Recife', uf: 'PE' }),
      }),
    )

    await abrirFormulario(page)
    await page.locator('#founder-cep').fill('50030230')

    const status = page.locator('#founder-cep-status')
    await expect(status).toContainText('Boa Vista')
    await expect(status).toContainText('Recife')
    await expect(status).toContainText('PE')
    // Resolvido pelo CEP → não precisa mostrar os campos manuais.
    await expect(page.locator('#founder-city')).toHaveCount(0)
  })

  test('CEP inexistente revela preenchimento manual', async ({ page }) => {
    test.skip(!(await prelaunchAtivo(page)), 'flag desligada')

    await page.route('**/viacep.com.br/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ erro: true }) }),
    )

    await abrirFormulario(page)
    await page.locator('#founder-cep').fill('00000000')

    await expect(page.locator('#founder-cep-status')).toContainText(/não encontrado/i)
    await expect(page.locator('#founder-city')).toBeVisible()
    await expect(page.locator('#founder-cep')).toHaveAttribute('aria-invalid', 'true')
  })

  test('ViaCEP fora do ar NÃO impede a inscrição', async ({ page }) => {
    test.skip(!(await prelaunchAtivo(page)), 'flag desligada')

    // Este é o teste que protege a receita da campanha: numa campanha paga,
    // uma dependência externa caindo não pode zerar a captação.
    await page.route('**/viacep.com.br/**', (route) => route.abort('failed'))

    await abrirFormulario(page)
    await page.locator('#founder-cep').fill('50030230')

    await expect(page.locator('#founder-cep-status')).toContainText(/não conseguimos consultar/i)
    await expect(page.locator('#founder-city')).toBeVisible()

    // Com cidade/UF manuais + consentimento, o envio fica habilitado.
    await page.locator('#founder-email').fill('e2e-prelaunch@exemplo.com')
    await page.locator('#founder-city').fill('Campina Grande')
    await page.locator('#founder-uf').fill('PB')
    await page.locator('input[type="checkbox"]').check()

    await expect(page.getByRole('button', { name: /Garantir minha vaga/i })).toBeEnabled()
  })
})
