import fs from 'fs'
import { test, expect, type Page } from '@playwright/test'
import { SESSION_PATHS, FIXTURE_LOCATARIO } from './fixtures/test-credentials'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface RegisterData {
  nome: string
  email: string
  senha: string
  userType: 'PF' | 'PJ'
  cpf: string
  cidade: string
  estado: string
}

async function fillRegisterForm(page: Page, data: RegisterData) {
  await page.getByLabel(/nome/i).fill(data.nome)
  await page.getByLabel(/e-?mail/i).fill(data.email)
  await page.getByLabel(/senha/i).first().fill(data.senha)

  // Confirmar senha — campo pode estar presente
  const confirmSenha = page.getByLabel(/confirmar?\s*senha|repetir?\s*senha/i)
  if (await confirmSenha.isVisible()) {
    await confirmSenha.fill(data.senha)
  }

  // userType: radio ou select
  const pfRadio = page.getByRole('radio', { name: /pessoa\s*física|PF/i })
  if (await pfRadio.isVisible()) {
    await pfRadio.check()
  }

  await page.getByLabel(/CPF/i).fill(data.cpf)
  // getByRole usa ARIA accessible name (exclui aria-hidden *) — evita "Cidade*" vs "Cidade"
  await page.getByRole('textbox', { name: /^Cidade/i }).fill(data.cidade)

  // Estado pode ser select ou input
  const estadoSelect = page.getByRole('combobox', { name: /estado/i })
  if (await estadoSelect.isVisible()) {
    await estadoSelect.selectOption(data.estado)
  } else {
    await page.getByLabel(/estado/i).fill(data.estado)
  }
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/e-?mail/i).fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: /entrar|login|acessar/i }).click()
}

// ---------------------------------------------------------------------------
// Dados de teste
// ---------------------------------------------------------------------------

function randomCpf(): string {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))
  const d1 = (n.reduce((s, v, i) => s + v * (10 - i), 0) * 10) % 11 % 10
  const d2 = ([...n, d1].reduce((s, v, i) => s + v * (11 - i), 0) * 10) % 11 % 10
  const f = [...n, d1, d2]
  return `${f.slice(0,3).join('')}.${f.slice(3,6).join('')}.${f.slice(6,9).join('')}-${f.slice(9).join('')}`
}

const VALID_USER = {
  nome: 'Ana Teste',
  email: `ana.teste+${Date.now()}@shareo.test`,
  senha: 'Shareo@2026!',
  userType: 'PF' as const,
  cpf: randomCpf(),
  cidade: 'São Paulo',
  estado: 'SP',
}

const hasLocatarioSession = fs.existsSync(SESSION_PATHS.locatario)

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe('Autenticação — cadastro, login, logout e redirect', () => {
  // -------------------------------------------------------------------------
  // 1. Cadastro PF completo
  // -------------------------------------------------------------------------
  test('cadastro PF completo redireciona para /dashboard ou página de sucesso', async ({ page }) => {
    await page.goto('/cadastro')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await fillRegisterForm(page, VALID_USER)

    // Consentimento LGPD — checkbox obrigatório
    const consentimento = page.getByRole('checkbox', { name: /concordo|consentimento|termos/i })
    await expect(consentimento).toBeVisible()
    await consentimento.check()

    // Confirmação de idade — também obrigatório
    const ageConfirmation = page.getByRole('checkbox', { name: /declaro|18 anos/i })
    if (await ageConfirmation.isVisible()) {
      await ageConfirmation.check()
    }

    await page.getByRole('button', { name: /cadastrar|criar conta|registrar/i }).click()

    // Aguarda redirecionamento ou mensagem de sucesso
    await expect(page).toHaveURL(/\/(dashboard|cadastro-sucesso|bem-vindo)/, { timeout: 10000 })
  })

  // -------------------------------------------------------------------------
  // 2. Cadastro com senha fraca
  // -------------------------------------------------------------------------
  test('cadastro com senha sem maiúscula exibe erro inline', async ({ page }) => {
    await page.goto('/cadastro')

    await fillRegisterForm(page, {
      ...VALID_USER,
      email: `fraca+${Date.now()}@shareo.test`,
      senha: 'senhafraca123!', // sem maiúscula
    })

    const consentimento = page.getByRole('checkbox', { name: /concordo|consentimento|termos/i })
    if (await consentimento.isVisible()) {
      await consentimento.check()
    }

    await page.getByRole('button', { name: /cadastrar|criar conta|registrar/i }).click()

    // Erro inline deve aparecer próximo ao campo de senha — não redireciona
    await expect(
      page.getByText(/maiúscula|senha forte|requisito|fraca|caractere/i).first(),
    ).toBeVisible({ timeout: 5000 })

    // Confirma que não houve redirecionamento
    await expect(page).toHaveURL(/\/cadastro/)
  })

  // -------------------------------------------------------------------------
  // 3. Login válido
  // -------------------------------------------------------------------------
  test('login válido redireciona para área logada', async ({ page }) => {
    test.skip(!hasLocatarioSession, 'Requer session-locatario.json (FIXTURE_LOCATARIO)')
    await login(page, FIXTURE_LOCATARIO.email, FIXTURE_LOCATARIO.password)
    // Após login bem-sucedido não deve permanecer em /login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
  })

  // -------------------------------------------------------------------------
  // 4. Login com credenciais erradas
  // -------------------------------------------------------------------------
  test('login com credenciais erradas exibe mensagem de erro', async ({ page }) => {
    await login(page, 'naoexiste@shareo.test', 'SenhaErrada999!')

    // Permanece na página de login e exibe erro
    await expect(page).toHaveURL(/\/login/)
    await expect(
      page.getByText(/inválid|incorret|credenciai|e-mail ou senha|não encontrad/i),
    ).toBeVisible({ timeout: 5000 })
  })

  // -------------------------------------------------------------------------
  // 5. Logout
  // -------------------------------------------------------------------------
  test('usuário logado faz logout e é redirecionado', async ({ browser }) => {
    test.skip(!hasLocatarioSession, 'Requer session-locatario.json')
    const ctx = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const page = await ctx.newPage()
    try {
      await page.goto('/dashboard')

      // Logout vive dentro do UserDropdown — abre pelo botão de avatar (aria-label "Menu do usuário — Nome")
      const avatarBtn = page.getByRole('button', { name: /menu do usuário/i })
      await expect(avatarBtn).toBeVisible({ timeout: 8000 })
      await avatarBtn.click()

      // "Sair" é um <button role="menuitem"> dentro do dropdown → o role efetivo é menuitem, não button
      const logoutBtn = page.getByRole('menuitem', { name: /sair|logout/i })
      await expect(logoutBtn).toBeVisible({ timeout: 8000 })
      await logoutBtn.click()

      await expect(page).toHaveURL(/\/(login|$)/, { timeout: 8000 })
    } finally {
      await ctx.close()
    }
  })

  // -------------------------------------------------------------------------
  // 6. Redirect com callbackUrl
  // -------------------------------------------------------------------------
  test('usuário não autenticado acessando /dashboard é redirecionado para /login com callbackUrl', async ({ page }) => {
    await page.goto('/dashboard')

    // Deve ser enviado para login
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })

    // URL deve conter callbackUrl apontando de volta para /dashboard
    const url = page.url()
    expect(url).toContain('callbackUrl')
    expect(decodeURIComponent(url)).toContain('/dashboard')
  })

  test('após login com callbackUrl, redireciona de volta para /dashboard', async ({ page }) => {
    test.skip(!hasLocatarioSession, 'Requer fixture de credenciais (FIXTURE_LOCATARIO)')
    await page.goto('/login?callbackUrl=%2Fdashboard')
    // getByRole textbox desambigua "Senha" (input) do botão "Mostrar senha" — getByLabel(/senha/i) colide com ambos
    await page.getByRole('textbox', { name: /e-?mail/i }).fill(FIXTURE_LOCATARIO.email)
    await page.getByRole('textbox', { name: /senha/i }).fill(FIXTURE_LOCATARIO.password)
    await page.getByRole('button', { name: /entrar|login|acessar/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
  })

  // -------------------------------------------------------------------------
  // 7. Usuário autenticado acessa /login → redireciona para fora do /login
  // -------------------------------------------------------------------------
  test('usuário já autenticado que acessa /login é redirecionado', async ({ browser }) => {
    test.skip(!hasLocatarioSession, 'Requer session-locatario.json')
    const ctx = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const page = await ctx.newPage()
    try {
      await page.goto('/login')
      // Usuário autenticado não deve permanecer em /login
      await expect(page).not.toHaveURL(/\/login/, { timeout: 8000 })
    } finally {
      await ctx.close()
    }
  })
})
