/**
 * seed-staging-full.ts
 *
 * Cria TODOS os dados de teste necessários para a validação final de staging:
 *   1. Registra locatário + proprietário + admin via POST /api/auth/register (idempotente)
 *   2. Promove admin via DB direto
 *   3. Cria item AVAILABLE com imagem (proprietário como dono)
 *   4. Cria booking CONFIRMED entre locatário e proprietário
 *   5. Salva sessões Playwright em e2e/fixtures/session-*.json
 *   6. Grava IDs em e2e/fixtures/test-item-id.json e test-booking-id.json
 *
 * Limpeza após os testes:
 *   pnpm exec tsx --env-file=.env.staging-migrate scripts/reset-staging-db.ts
 *
 * Uso:
 *   pnpm exec tsx --env-file=.env.staging-migrate scripts/seed-staging-full.ts
 */

import { chromium } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { FIXTURE_LOCATARIO, FIXTURE_PROPRIETARIO, FIXTURE_ADMIN, SESSION_PATHS } from '../e2e/fixtures/test-credentials'

const STAGING_URL = process.env.STAGING_URL ?? 'https://shareo-rouge.vercel.app'
const STAGING_PROJECT_ID = 'fflpuoluiqmhpvcxubqi'

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

function assertStagingDb() {
  const url = process.env.DATABASE_URL ?? ''
  if (!url.includes(STAGING_PROJECT_ID)) {
    console.error('❌ DATABASE_URL não aponta para o banco de staging.')
    console.error(`   Execute com: pnpm exec tsx --env-file=.env.staging-migrate scripts/seed-staging-full.ts`)
    process.exit(1)
  }
}

// ---------------------------------------------------------------------------
// Step 1 — Registrar usuários via API
// ---------------------------------------------------------------------------

async function registerUser(user: typeof FIXTURE_LOCATARIO, retries = 3): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(`${STAGING_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:           user.name,
        email:          user.email,
        password:       user.password,
        cpf:            user.cpf,
        phone:          user.phone,
        userType:       'PF',
        city:           user.city,
        state:          user.state,
        consentVersion: user.consentVersion,
      }),
    })

    const json = await res.json()

    if (res.ok) {
      console.log(`  ✅ Criado: ${user.email}`)
      return
    }

    const code = json.error?.code
    if (code === 'EMAIL_ALREADY_EXISTS' || code === 'CPF_ALREADY_EXISTS') {
      console.log(`  ℹ️  Já existe: ${user.email}`)
      return
    }

    if (code === 'RATE_LIMITED' && attempt < retries) {
      console.log(`  ⏳ Rate limit — aguardando 75s (tentativa ${attempt}/${retries})...`)
      await new Promise(r => setTimeout(r, 75_000))
      continue
    }

    throw new Error(`Falha ao registrar ${user.email}: ${JSON.stringify(json.error)}`)
  }
}

// ---------------------------------------------------------------------------
// Step 2 — Promover admin via DB
// ---------------------------------------------------------------------------

async function promoteAdmin(): Promise<void> {
  const updated = await prisma.user.updateMany({
    where: { email: FIXTURE_ADMIN.email },
    data:  { role: 'ADMIN' },
  })
  if (updated.count > 0) {
    console.log(`  ✅ Admin promovido: ${FIXTURE_ADMIN.email}`)
  } else {
    console.log(`  ⚠️  Admin não encontrado no DB (registro pode ter falhado acima)`)
  }
}

// ---------------------------------------------------------------------------
// Step 3 — Criar item AVAILABLE com imagem
// ---------------------------------------------------------------------------

async function createSeedItem(): Promise<string> {
  const proprietario = await prisma.user.findUniqueOrThrow({
    where:  { email: FIXTURE_PROPRIETARIO.email },
    select: { id: true },
  })

  const category = await prisma.category.findFirst({
    where: { slug: 'eletronicos' },
    select: { id: true },
  }) ?? await prisma.category.findFirst({ select: { id: true } })

  if (!category) throw new Error('Nenhuma categoria encontrada no staging DB')

  // Verifica se já existe item de teste
  const existing = await prisma.item.findFirst({
    where: { ownerId: proprietario.id, title: 'Câmera Sony A7 III — Fixture E2E', deletedAt: null },
    select: { id: true },
  })

  if (existing) {
    console.log(`  ℹ️  Item fixture já existe: ${existing.id}`)
    return existing.id
  }

  const item = await prisma.item.create({
    data: {
      ownerId:      proprietario.id,
      categoryId:   category.id,
      title:        'Câmera Sony A7 III — Fixture E2E',
      description:  'Item criado automaticamente para testes E2E. Não reservar.',
      condition:    'EXCELLENT',
      pricePerDay:  5000,  // R$50/dia em centavos
      pricePerWeek: 20000,
      city:         'Natal',
      state:        'RN',
      latitude:     -5.7945,
      longitude:    -35.2110,
      status:       'AVAILABLE',
      isApproved:   true,
      approvedAt:   new Date(),
      images: {
        create: {
          url:   'https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?w=800&q=80',
          order: 0,
        },
      },
    },
    select: { id: true },
  })

  console.log(`  ✅ Item criado: ${item.id}`)
  return item.id
}

// ---------------------------------------------------------------------------
// Step 4 — Criar booking CONFIRMED
// ---------------------------------------------------------------------------

async function createSeedBooking(itemId: string): Promise<string> {
  const locatario    = await prisma.user.findUniqueOrThrow({ where: { email: FIXTURE_LOCATARIO.email },    select: { id: true } })
  const proprietario = await prisma.user.findUniqueOrThrow({ where: { email: FIXTURE_PROPRIETARIO.email }, select: { id: true } })

  // Verifica se já existe booking de teste
  const existing = await prisma.booking.findFirst({
    where: { itemId, borrowerId: locatario.id, status: 'CONFIRMED', deletedAt: null },
    select: { id: true },
  })

  if (existing) {
    console.log(`  ℹ️  Booking fixture já existe: ${existing.id}`)
    return existing.id
  }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() + 3)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 2)

  const booking = await prisma.booking.create({
    data: {
      itemId,
      borrowerId:    locatario.id,
      ownerId:       proprietario.id,
      status:        'CONFIRMED',
      startDate,
      endDate,
      totalDays:     2,
      dailyPrice:    5000,
      totalPrice:    10000,
      paymentStatus: 'PENDING',
    },
    select: { id: true },
  })

  // Cria conversa associada ao booking
  await prisma.conversation.create({
    data: {
      bookingId: booking.id,
      participants: {
        create: [
          { userId: locatario.id },
          { userId: proprietario.id },
        ],
      },
    },
  })

  console.log(`  ✅ Booking criado: ${booking.id}`)
  return booking.id
}

// ---------------------------------------------------------------------------
// Step 5 — Salvar sessões Playwright
// ---------------------------------------------------------------------------

async function saveSession(email: string, password: string, outputPath: string): Promise<void> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ baseURL: STAGING_URL })
  const page    = await context.newPage()

  try {
    await page.goto('/login')
    await page.getByLabel(/e-mail/i).fill(email)
    await page.locator('#password').fill(password)
    await page.getByRole('button', { name: /entrar/i }).click()
    await page.waitForURL(/\/(dashboard|meus-anuncios|perfil)/, { timeout: 25000 })

    const dir = path.dirname(outputPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    await context.storageState({ path: outputPath })
    console.log(`  ✅ Sessão salva: ${outputPath}`)
  } finally {
    await browser.close()
  }
}

// ---------------------------------------------------------------------------
// Step 6 — Gravar IDs nos fixtures
// ---------------------------------------------------------------------------

function writeFixture(filePath: string, data: Record<string, string>): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  assertStagingDb()

  console.log(`\n🌱 seed-staging-full — ${STAGING_URL}\n`)

  // 1. Registrar usuários
  console.log('📝 Registrando usuários...')
  await registerUser(FIXTURE_LOCATARIO)
  await registerUser(FIXTURE_PROPRIETARIO)
  await registerUser(FIXTURE_ADMIN)

  // 2. Promover admin
  console.log('\n🔑 Promovendo admin...')
  await promoteAdmin()

  // 3. Criar item
  console.log('\n📦 Criando item fixture...')
  const itemId = await createSeedItem()

  // 4. Criar booking
  console.log('\n📋 Criando booking fixture...')
  const bookingId = await createSeedBooking(itemId)

  // 5. Gravar IDs
  writeFixture('e2e/fixtures/test-item-id.json',    { itemId })
  writeFixture('e2e/fixtures/test-booking-id.json', { bookingId })
  console.log('\n💾 IDs gravados em e2e/fixtures/')

  // 6. Salvar sessões
  console.log('\n🎭 Salvando sessões Playwright...')
  await saveSession(FIXTURE_LOCATARIO.email,    FIXTURE_LOCATARIO.password,    SESSION_PATHS.locatario)
  await saveSession(FIXTURE_PROPRIETARIO.email, FIXTURE_PROPRIETARIO.password, SESSION_PATHS.proprietario)
  await saveSession(FIXTURE_ADMIN.email,        FIXTURE_ADMIN.password,        SESSION_PATHS.admin)

  console.log(`
✨ Seeds criados com sucesso!

   Item:    ${itemId}
   Booking: ${bookingId}

▶️  Rode os testes:
   pnpm playwright test --config=playwright.staging.config.ts

🗑️  Após os testes, limpe:
   pnpm exec tsx --env-file=.env.staging-migrate scripts/reset-staging-db.ts
`)
}

main()
  .catch(err => { console.error('\n❌', err.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
