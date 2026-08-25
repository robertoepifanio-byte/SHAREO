/**
 * Cria sessões de usuário fixture para os smoke tests autenticados.
 *
 * O que faz:
 *  1. Registra locatário + proprietário + admin via POST /api/auth/register
 *     (idempotente: ignora EMAIL_ALREADY_EXISTS / CPF_ALREADY_EXISTS)
 *  2. Para o admin: promove a role='ADMIN' via Prisma (precisa acontecer ANTES
 *     do login — a role vai pro JWT no momento da autenticação, sessão antiga
 *     não se atualiza sozinha)
 *  3. Faz login de cada usuário via Playwright no staging
 *  4. Salva storageState em e2e/fixtures/session-*.json
 *
 * Pré-requisito: DIRECT_URL (conexão direta, não pooler — evita timeout de
 * transação curta no PgBouncer) e STAGING_URL no ambiente.
 *
 * 🪤 Até 25/08/2026 a promoção do admin era só um `console.log` com instrução de
 * UPDATE manual no Supabase SQL Editor — nunca rodava de verdade em CI (runner
 * efêmero, sessão nova a cada run, ninguém reaplicava o SQL). Resultado: a
 * "sessão de admin" do CI era sempre um usuário comum, e todo endpoint
 * admin-only respondia 403 — permanentemente, mascarando qualquer regressão
 * real na área. Ver memória feedback-e2e-admin-session-ci-sempre-403.
 *
 * Uso:
 *   pnpm tsx scripts/create-staging-fixtures.ts
 */

import { chromium } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { FIXTURE_LOCATARIO, FIXTURE_PROPRIETARIO, FIXTURE_ADMIN, SESSION_PATHS } from '../e2e/fixtures/test-credentials'

const STAGING_URL =
  process.env.STAGING_URL ??
  'https://shareo-git-main-robertoepifanio-bytes-projects.vercel.app'

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
        // 🪤 Endereço completo é obrigatório para o proprietário confirmar
        // reserva desde 22/08/2026 (422 OWNER_ADDRESS_REQUIRED). Enviamos para
        // todos os fixtures porque qualquer um pode virar locador num smoke.
        cep:            user.cep,
        street:         user.street,
        neighborhood:   user.neighborhood,
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
    await page.waitForLoadState('networkidle')
    await page.getByLabel(/e-mail/i).fill(email)
    await page.locator('#password').fill(password)
    await page.getByRole('button', { name: /entrar/i }).click()

    try {
      await page.waitForURL(/\/(dashboard|itens|perfil|home|meus-anuncios)/, { timeout: 30000 })
    } catch {
      await page.screenshot({ path: `scripts/debug-login-${email.split('@')[0]}.png` })
      const url = page.url()
      const bodyText = await page.locator('body').innerText().catch(() => '')
      throw new Error(`Login timeout. URL atual: ${url}\nConteúdo: ${bodyText.slice(0, 500)}`)
    }

    const dir = path.dirname(outputPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    await context.storageState({ path: outputPath })
    console.log(`  ✅ Sessão salva: ${outputPath}`)
  } finally {
    await browser.close()
  }
}

/**
 * Promove o fixture a ADMIN via Prisma, direto no banco — precisa rodar ANTES
 * do login (loginAndSaveSession), porque a role vai pro JWT no momento da
 * autenticação (lib/auth.ts, jwt callback: `token.role = u.role`). Promover
 * depois do login não teria efeito na sessão já salva.
 *
 * `datasourceUrl: DIRECT_URL` — não o pooler (`DATABASE_URL`): é um UPDATE
 * único e pontual, sem motivo pra passar pelo PgBouncer em modo transaction.
 */
async function promoteToAdmin(email: string): Promise<void> {
  const directUrl = process.env.DIRECT_URL
  if (!directUrl) {
    throw new Error(
      'DIRECT_URL ausente no ambiente — não dá pra promover o fixture a ADMIN. ' +
      'Defina DIRECT_URL (conexão direta com o Postgres de staging) antes de rodar este script.',
    )
  }

  const prisma = new PrismaClient({ datasourceUrl: directUrl })
  try {
    const { count } = await prisma.user.updateMany({
      where: { email },
      data:  { role: 'ADMIN', adminRole: 'ADMIN_SUPERADMIN' },
    })
    if (count === 0) {
      throw new Error(`Nenhum usuário encontrado com email ${email} — registerUser() rodou antes?`)
    }
    console.log(`  ✅ Promovido a ADMIN: ${email}`)
  } finally {
    await prisma.$disconnect()
  }
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
