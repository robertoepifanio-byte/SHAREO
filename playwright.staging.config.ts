import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  globalSetup: './e2e/staging-setup.ts',
  testDir: './e2e',
  fullyParallel: false,
  workers: 1, // staging usa estado compartilhado (fixtures, DB) — serial obrigatório
  retries: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-staging' }]],
  use: {
    baseURL: process.env.STAGING_URL ?? 'https://shareo-rouge.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 25000,
    navigationTimeout: 30000,
    // Bypassa rate limit nas requisições funcionais (page.request + form do navegador), igual ao
    // playwright.config.ts base. Só vale onde a rota repassa `req` ao checkRateLimit (ex.: admin-create).
    // Os testes que VERIFICAM rate limit usam fetch() nativo (sem este header) ou rota que ignora `req`
    // (ex.: /api/user/password) — ver security2 #18/#19 e admin-usuarios 5.1.
    extraHTTPHeaders: process.env.E2E_SECRET
      ? { 'x-e2e-token': process.env.E2E_SECRET }
      : {},
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
