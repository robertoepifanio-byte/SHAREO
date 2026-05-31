/**
 * Busca o ID da conversa associada ao booking fixture (test-booking-id.json)
 * e salva em e2e/fixtures/test-conv-id.json
 *
 * Uso: pnpm exec playwright test --config=playwright.staging.config.ts scripts/get-conv-id.ts
 * Ou:  pnpm exec tsx scripts/get-conv-id.ts  (não funciona — requer browser)
 */
import fs from 'fs'
import path from 'path'
import { chromium } from '@playwright/test'
import { SESSION_PATHS } from '../e2e/fixtures/test-credentials'
import { TEST_BOOKING_PATH } from '../e2e/fixtures/test-paths'

const BASE_URL = 'https://shareo-git-main-robertoepifanio-bytes-projects.vercel.app'
const CONV_PATH = path.resolve('e2e/fixtures/test-conv-id.json')

async function main() {
  const { bookingId } = JSON.parse(fs.readFileSync(TEST_BOOKING_PATH, 'utf-8')) as { bookingId: string }
  console.log('bookingId:', bookingId)

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ storageState: SESSION_PATHS.locatario, baseURL: BASE_URL })

  const res  = await ctx.request.get(`/api/bookings/${bookingId}`)
  const body = await res.json() as { data?: { conversation?: { id: string }; status?: string } }

  console.log('booking status:', body?.data?.status)
  console.log('conversation:', JSON.stringify(body?.data?.conversation))

  const convId = body?.data?.conversation?.id
  if (convId) {
    fs.writeFileSync(CONV_PATH, JSON.stringify({ convId }, null, 2))
    console.log(`E2E_CONV_ID=${convId}`)
    console.log(`Salvo em: ${CONV_PATH}`)
  } else {
    console.error('Conversa não encontrada na resposta.')
    process.exit(1)
  }

  await browser.close()
}

main()
