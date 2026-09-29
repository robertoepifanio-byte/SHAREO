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
import { assertNotEnrollment, completeTwoFactorIfAsked } from '../e2e/fixtures/totp'
import { FIXTURE_LOCATARIO, FIXTURE_PROPRIETARIO, FIXTURE_ADMIN, SESSION_PATHS } from '../e2e/fixtures/test-credentials'
import { registerUser, markEmailVerified, completeProfile } from './lib/provision-staging-user'

const STAGING_URL =
  process.env.STAGING_URL ??
  'https://shareo-git-main-robertoepifanio-bytes-projects.vercel.app'

// ---------------------------------------------------------------------------
// Helpers específicos deste script (registro/verificação/cadastro genéricos
// vivem em scripts/lib/provision-staging-user.ts, compartilhados com
// scripts/create-pentest-account.ts)
// ---------------------------------------------------------------------------

async function loginAndSaveSession(
  email: string,
  password: string,
  outputPath: string,
  totpSecret?: string,
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
    // Só o admin tem 2FA — para os outros, esperar o campo custaria 6 s por login à toa.
    if (email === FIXTURE_ADMIN.email) await completeTwoFactorIfAsked(page, email, totpSecret)

    try {
      await page.waitForURL(/\/(dashboard|itens|perfil|home|meus-anuncios)/, { timeout: 30000 })
    } catch {
      await page.screenshot({ path: `scripts/debug-login-${email.split('@')[0]}.png` })
      const url = page.url()
      const bodyText = await page.locator('body').innerText().catch(() => '')
      throw new Error(`Login timeout. URL atual: ${url}\nConteúdo: ${bodyText.slice(0, 500)}`)
    }

    assertNotEnrollment(page, email)

    const dir = path.dirname(outputPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    await context.storageState({ path: outputPath })
    console.log(`  ✅ Sessão salva: ${outputPath}`)
  } finally {
    await browser.close()
  }
}

/**
 * Cliente Prisma único do script, criado sob demanda.
 *
 * `datasourceUrl: DIRECT_URL` — não o pooler (`DATABASE_URL`): são UPDATEs curtos e
 * pontuais, sem motivo pra passar pelo PgBouncer em modo transaction.
 */
let _db: PrismaClient | null = null
function db(): PrismaClient {
  if (!_db) {
    const directUrl = process.env.DIRECT_URL
    if (!directUrl) {
      throw new Error(
        'DIRECT_URL ausente no ambiente — os fixtures precisam de escrita direta no Postgres ' +
        'de staging (promover admin, verificar e-mail, completar cadastro).',
      )
    }
    _db = new PrismaClient({ datasourceUrl: directUrl })
  }
  return _db
}

/**
 * Promove o fixture a ADMIN — precisa rodar ANTES do login, porque a role vai pro JWT
 * no momento da autenticação (lib/auth.ts, jwt callback: `token.role = u.role`).
 */
async function promoteToAdmin(email: string): Promise<void> {
  const { count } = await db().user.updateMany({
    where: { email },
    data:  { role: 'ADMIN', adminRole: 'ADMIN_SUPERADMIN' },
  })
  if (count === 0) {
    throw new Error(`Nenhum usuário encontrado com email ${email} — registerUser() rodou antes?`)
  }
  console.log(`  ✅ Promovido a ADMIN: ${email}`)
}

/**
 * Cadastra o 2FA (TOTP) do admin fixture com um segredo CONHECIDO, para o login da
 * suíte poder calcular o código. É a alternativa a um bypass: o 2FA segue obrigatório
 * no staging, só que este admin já o tem cadastrado e o teste sabe o segredo.
 *
 * Idempotente (reaplica o mesmo segredo). Sem o segredo no ambiente, não mexe em
 * nada — o login do admin então cai no cadastro do 2FA e `loginAndSaveSession` avisa.
 *
 * 🪤 Passa pela rota de teste do APP, não pelo banco: o segredo vai cifrado com a
 * ENCRYPTION_KEY do runtime, que o CI não conhece (a do GitHub Secret é a do build). Gravar
 * daqui deixava o login do admin com "Ocorreu um erro" — `decryptPII` lançava no servidor.
 */
async function enrollFixtureTotp(email: string, secret: string | undefined): Promise<void> {
  if (!secret) {
    console.log('  ⚠️  FIXTURE_ADMIN_TOTP_SECRET ausente — admin fixture ficará sem 2FA e sem acesso ao painel.')
    return
  }
  const e2eSecret = process.env.E2E_SECRET
  if (!e2eSecret) throw new Error('E2E_SECRET ausente — a rota /api/test/enroll-admin-totp exige o token.')

  const res = await fetch(`${STAGING_URL}/api/test/enroll-admin-totp`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-e2e-token': e2eSecret },
    body:    JSON.stringify({ email, secret }),
  })
  if (!res.ok) throw new Error(`Cadastro do 2FA de ${email} falhou: HTTP ${res.status} ${await res.text().catch(() => '')}`)
  console.log(`  ✅ 2FA cadastrado (segredo conhecido): ${email}`)
}

// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n🎭 Criando fixtures de sessão para staging`)
  console.log(`   URL: ${STAGING_URL}\n`)

  // --- Locatário ---
  console.log('👤 Locatário:')
  await registerUser(STAGING_URL, FIXTURE_LOCATARIO)
  await loginAndSaveSession(FIXTURE_LOCATARIO.email, FIXTURE_LOCATARIO.password, SESSION_PATHS.locatario)

  // --- Proprietário ---
  console.log('\n👤 Proprietário:')
  await registerUser(STAGING_URL, FIXTURE_PROPRIETARIO)
  await loginAndSaveSession(FIXTURE_PROPRIETARIO.email, FIXTURE_PROPRIETARIO.password, SESSION_PATHS.proprietario)

  // --- Admin ---
  console.log('\n👤 Admin:')
  await registerUser(STAGING_URL, FIXTURE_ADMIN)
  await promoteToAdmin(FIXTURE_ADMIN.email)
  await enrollFixtureTotp(FIXTURE_ADMIN.email, process.env.FIXTURE_ADMIN_TOTP_SECRET)
  await loginAndSaveSession(FIXTURE_ADMIN.email, FIXTURE_ADMIN.password, SESSION_PATHS.admin, process.env.FIXTURE_ADMIN_TOTP_SECRET)

  // --- Guards de reserva: e-mail verificado + cadastro completo (os três) ---
  console.log('\n📧 Verificação de e-mail:')
  await markEmailVerified(db(), [FIXTURE_LOCATARIO.email, FIXTURE_PROPRIETARIO.email, FIXTURE_ADMIN.email])

  console.log('\n📝 Cadastro completo:')
  await completeProfile(db(), [FIXTURE_LOCATARIO, FIXTURE_PROPRIETARIO, FIXTURE_ADMIN])

  console.log('\n✨ Fixtures criados. Agora rode os smoke tests autenticados:')
  console.log('   pnpm playwright test e2e/admin.spec.ts --config=playwright.staging.config.ts')
  console.log('   pnpm playwright test e2e/chat.spec.ts  --config=playwright.staging.config.ts')
  console.log('   pnpm playwright test e2e/favorites.spec.ts --config=playwright.staging.config.ts\n')
}

main()
  .catch((err) => {
    console.error('\n❌ Erro:', err.message)
    process.exitCode = 1
  })
  .finally(() => _db?.$disconnect())
