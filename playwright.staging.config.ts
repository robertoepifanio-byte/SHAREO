import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  globalSetup: './e2e/staging-setup.ts',
  testDir: './e2e',
  fullyParallel: false,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-staging' }]],
  use: {
    baseURL: 'https://shareo-q7qggoi4m-robertoepifanio-bytes-projects.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 25000,
    navigationTimeout: 30000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
