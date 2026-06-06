import { defineConfig, devices } from '@playwright/test'

const isRemote = !!process.env.BASE_URL && process.env.BASE_URL.startsWith('https://')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    extraHTTPHeaders: process.env.E2E_SECRET
      ? { 'x-e2e-token': process.env.E2E_SECRET }
      : {},
  },
  projects: process.env.CI
    ? [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
    : [
        { name: 'chromium',      use: { ...devices['Desktop Chrome'] } },
        { name: 'tablet',        use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
        { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
        { name: 'Mobile Safari', use: { ...devices['iPhone 13'] } },
      ],
  // Não sobe servidor local quando BASE_URL aponta para staging/produção
  webServer: isRemote ? undefined : {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
