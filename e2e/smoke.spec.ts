import { test, expect } from '@playwright/test'

test.describe('Smoke tests', () => {
  test('landing page carrega corretamente', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/ShareO/)
    await expect(page.getByRole('banner')).toBeVisible() // header
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('página de login é acessível', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('rota de API de auth responde', async ({ request }) => {
    const response = await request.get('/api/auth/providers')
    expect(response.status()).toBe(200)
  })
})
