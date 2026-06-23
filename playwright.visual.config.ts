/**
 * playwright.visual.config.ts
 *
 * Configuração SEPARADA para testes de regressão visual.
 * NÃO é carregado pelo CI principal (ci.yml usa playwright.config.ts).
 *
 * Por que configuração isolada:
 *  - Baselines de screenshot são específicas de plataforma (Windows ≠ Linux).
 *    Misturar visual com o CI obrigatório causaria quebras falsas.
 *  - Rodar apenas chromium desktop + mobile reduz o tempo de geração de baselines.
 *
 * Uso:
 *   pnpm test:visual              → roda contra baselines existentes
 *   pnpm test:visual:update       → gera/atualiza baselines
 */

import { defineConfig, devices } from '@playwright/test'

const isRemote =
  !!process.env.BASE_URL && process.env.BASE_URL.startsWith('https://')

export default defineConfig({
  testDir: './e2e/visual',
  fullyParallel: false,   // visual tests são sensíveis à ordem de renderização
  forbidOnly: !!process.env.CI,
  retries: 0,             // sem retry em visual — falha é sinal, não ruído
  workers: 1,             // serializado para consistência de screenshots
  reporter: [['html', { open: 'never', outputFolder: 'playwright-report-visual' }]],

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    // Desabilita animações globalmente — reduz flakiness em screenshots
    launchOptions: {
      args: ['--force-prefers-reduced-motion'],
    },
    // Captura screenshot em falha para diagnóstico
    screenshot: 'only-on-failure',
    // Sem token E2E — páginas públicas não precisam
  },

  projects: [
    {
      name: 'visual-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'visual-mobile',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 375, height: 812 },
      },
    },
  ],

  // Sobe o servidor de dev local se BASE_URL não apontar para remote
  webServer: isRemote
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,   // reutiliza se já estiver rodando
        timeout: 120_000,
      },
})
