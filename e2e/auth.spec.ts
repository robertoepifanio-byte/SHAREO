import { test, expect, type Page } from '@playwright/test'

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

const VALID_USER = {
  nome: 'Ana Teste',
  email: `ana.teste+${Date.now()}@shareo.test`,
  senha: 'Shareo@2026!',
  userType: 'PF' as const,
  cpf: '529.982.247-25', // CPF válido (algoritmo)
  cidade: 'São Paulo',
  estado: 'SP',
}

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
      page.getByText(/maiúscula|senha forte|requisito|fraca|caractere/i),
    ).toBeVisible({ timeout: 5000 })

    // Confirma que não houve redirecionamento
    await expect(page).toHaveURL(/\/cadastro/)
  })

  // -------------------------------------------------------------------------
  // 3. Login válido
  // -------------------------------------------------------------------------
  // NOTE: este teste depende de um usuário pré-existente no banco de staging.
  // TODO: criar fixture de usuário via API antes de executar.
  test.skip('login válido redireciona para /dashboard', async ({ page }) => {
    // TODO: criar fixture de usuário
    await login(page, 'usuario.existente@shareo.test', 'Shareo@2026!')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
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
  // NOTE: requer usuário autenticado — depende de fixture de sessão.
  // TODO: criar fixture de usuário e injetar cookie/token de sessão.
  test.skip('usuário logado faz logout e é redirecionado', async ({ page }) => {
    // TODO: criar fixture de usuário e injetar cookie/token de sessão
    await page.goto('/dashboard')

    // Clica em logout — pode estar em menu de perfil
    const logoutBtn = page.getByRole('button', { name: /sair|logout/i })
    const profileMenu = page.getByRole('button', { name: /perfil|conta|avatar/i })

    if (await profileMenu.isVisible()) {
      await profileMenu.click()
    }

    await expect(logoutBtn).toBeVisible()
    await logoutBtn.click()

    await expect(page).toHaveURL(/\/(login|$)/, { timeout: 8000 })
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

  // NOTE: segunda parte do fluxo (login → retorna ao callbackUrl) depende de
  // usuário pré-existente — marcado como skip até fixture disponível.
  // TODO: criar fixture de usuário
  test.skip('após login com callbackUrl, redireciona de volta para /dashboard', async ({ page }) => {
    // TODO: criar fixture de usuário
    await page.goto('/login?callbackUrl=%2Fdashboard')
    await page.getByLabel(/e-?mail/i).fill('usuario.existente@shareo.test')
    await page.getByLabel(/senha/i).fill('Shareo@2026!')
    await page.getByRole('button', { name: /entrar|login|acessar/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  // -------------------------------------------------------------------------
  // 7. Usuário autenticado acessa /login → redireciona para /dashboard
  // -------------------------------------------------------------------------
  // NOTE: requer fixture de sessão autenticada.
  // TODO: criar fixture de usuário e injetar cookie/token de sessão.
  test.skip('usuário já autenticado que acessa /login é redirecionado para /dashboard', async ({ page }) => {
    // TODO: criar fixture de usuário e injetar cookie/token de sessão
    // Após injetar a sessão:
    await page.goto('/login')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 8000 })
  })
})
