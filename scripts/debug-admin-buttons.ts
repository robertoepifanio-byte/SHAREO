import { chromium } from '@playwright/test'

const SESSION = 'e2e/fixtures/session-admin.json'
const BASE    = 'https://shareo-q7qggoi4m-robertoepifanio-bytes-projects.vercel.app'

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ baseURL: BASE, storageState: SESSION })
  const page    = await context.newPage()

  await page.goto('/admin/itens')
  await page.waitForLoadState('networkidle')

  const buttons = page.locator('button')
  const count   = await buttons.count()
  console.log('Total buttons:', count)

  for (let i = 0; i < Math.min(count, 10); i++) {
    const box   = await buttons.nth(i).boundingBox()
    const label = (await buttons.nth(i).textContent())?.trim()
    const aria  = await buttons.nth(i).getAttribute('aria-label')
    console.log(`[${i}] h=${box?.height?.toFixed(0)}px  label='${label}'  aria='${aria}'`)
  }

  await browser.close()
})().catch(e => { console.error(e.message); process.exit(1) })
