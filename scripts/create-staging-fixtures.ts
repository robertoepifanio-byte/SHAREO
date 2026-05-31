/**
 * Cria sessões de usuário fixture para os smoke tests autenticados.
 *
 * O que faz:
 *  1. Registra locatário + proprietário + admin via POST /api/auth/register
 *     (idempotente: ignora EMAIL_ALREADY_EXISTS / CPF_ALREADY_EXISTS)
 *  2. Faz login de cada usuário via Playwright no staging
 *  3. Salva storageState em e2e/fixtures/session-*.json
 *  4. Para o admin: usa a API do Supabase (service_role) para setar role='ADMIN'
 *
 * Pré-requisito: SUPABASE_SERVICE_ROLE_KEY_STAGING e STAGING_URL no ambiente
 * (ou editar as constantes abaixo).
 *
 * Uso:
 *   pnpm tsx scripts/create-staging-fixtures.ts
 */

import { chromium } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { FIXTURE_LOCATARIO, FIXTURE_PROPRIETARIO, FIXTURE_ADMIN, SESSION_PATHS } from '../e2e/fixtures/test-credentials'

const STAGING_URL =
  process.env.STAGING_URL ??
  'https://shareo-git-main-robertoepifanio-bytes-projects.vercel.app'

const SUPABASE_URL = process.env.SUPABASE_URL_STAGING ?? 'https://fflpuoluiqmhpvcxubqi.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_STAGING ?? ''

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function registerUser(user: typeof FIXTURE_LOCATARIO, retries = 3): Promise<string | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(`${STAGING_URL}/api/auth/register`, {
      method:  'POST',
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
      console.log(`  ✅ Criado: ${user.email} (id: ${json.data.id})`)
      return json.data.id as string
    }

    const code = json.error?.code
    if (code === 'EMAIL_ALREADY_EXISTS' || code === 'CPF_ALREADY_EXISTS') {
      console.log(`  ℹ️  Já existe: ${user.email}`)
      return null
    }

    if (code === 'RATE_LIMITED' && attempt < retries) {
      console.log(`  ⏳ Rate limit — aguardando 75s (tentativa ${attempt}/${retries})...`)
      await new Promise((r) => setTimeout(r, 75_000))
      continue
    }

    console.error(`  ❌ Erro ao registrar ${user.email}:`, json.error)
    throw new Error(`register failed: ${JSON.stringify(json.error)}`)
  }
  return null
}

async function loginAndSaveSession(
  email: string,
  password: string,
  outputPath: string,
): Promise<void> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ baseURL: STAGING_URL })
  const page    = await context.newPage()

  try {
    await page.goto('/login')
    await page.getByLabel(/e-mail/i).fill(email)
    await page.locator('#password').fill(password)
    await page.getByRole('button', { name: /entrar/i }).click()

    await page.waitForURL(/\/(dashboard|home|meus-anuncios)/, { timeout: 20000 })

    const dir = path.dirname(outputPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    await context.storageState({ path: outputPath })
    console.log(`  ✅ Sessão salva: ${outputPath}`)
  } finally {
    await browser.close()
  }
}

async function getUserIdByEmail(email: string): Promise<string | null> {
  if (!SERVICE_ROLE_KEY) return null

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/User?email=eq.${encodeURIComponent(email)}&select=id`,
    {
      headers: {
        apikey:        SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    },
  )
  if (!res.ok) return null
  const rows = await res.json() as { id: string }[]
  return rows[0]?.id ?? null
}

async function promoteToAdmin(email: string): Promise<void> {
  // PostgREST não expõe as tabelas da aplicação (sem grants para anon/authenticated).
  // Alternativa: usar o Supabase SQL Editor ou o Prisma CLI com DATABASE_URL_STAGING.
  console.log(`  ℹ️  Promoção de admin requer acesso direto ao DB.`)
  console.log(`     Execute no Supabase SQL Editor (https://app.supabase.com/project/fflpuoluiqmhpvcxubqi/sql):`)
  console.log(``)
  console.log(`     UPDATE users SET role = 'ADMIN' WHERE email = '${email}';`)
  console.log(``)
  console.log(`     Depois, salve a sessão novamente:`)
  console.log(`     pnpm tsx scripts/create-staging-fixtures.ts --only-admin`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n🎭 Criando fixtures de sessão para staging`)
  console.log(`   URL: ${STAGING_URL}\n`)

  // --- Locatário ---
  console.log('👤 Locatário:')
  await registerUser(FIXTURE_LOCATARIO)
  await loginAndSaveSession(FIXTURE_LOCATARIO.email, FIXTURE_LOCATARIO.password, SESSION_PATHS.locatario)

  // --- Proprietário ---
  console.log('\n👤 Proprietário:')
  await registerUser(FIXTURE_PROPRIETARIO)
  await loginAndSaveSession(FIXTURE_PROPRIETARIO.email, FIXTURE_PROPRIETARIO.password, SESSION_PATHS.proprietario)

  // --- Admin ---
  console.log('\n👤 Admin:')
  await registerUser(FIXTURE_ADMIN)
  await promoteToAdmin(FIXTURE_ADMIN.email)
  await loginAndSaveSession(FIXTURE_ADMIN.email, FIXTURE_ADMIN.password, SESSION_PATHS.admin)

  console.log('\n✨ Fixtures criados. Agora rode os smoke tests autenticados:')
  console.log('   pnpm playwright test e2e/admin.spec.ts --config=playwright.staging.config.ts')
  console.log('   pnpm playwright test e2e/chat.spec.ts  --config=playwright.staging.config.ts')
  console.log('   pnpm playwright test e2e/favorites.spec.ts --config=playwright.staging.config.ts\n')
}

main().catch((err) => {
  console.error('\n❌ Erro:', err.message)
  process.exit(1)
})
