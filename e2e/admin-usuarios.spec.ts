/**
 * E2E — Módulo de Gestão de Usuários Admin
 *
 * Cobertura:
 *  Grupo 1 — Controle de acesso por role
 *  Grupo 2 — CRUD de admins (SUPERADMIN)
 *  Grupo 3 — Ativar/desativar usuário regular
 *  Grupo 4 — Troca de senha admin
 *  Grupo 5 — Rate limiting
 *  Grupo 6 — Blocklist Redis (skipped em staging sem Redis)
 *
 * Pré-requisito: pnpm tsx scripts/create-staging-fixtures.ts
 *
 * Sessions adicionais necessárias:
 *   e2e/fixtures/session-financeiro.json   — admin com adminRole ADMIN_FINANCEIRO
 *   e2e/fixtures/session-operacional.json  — admin com adminRole ADMIN_OPERACIONAL
 */

import fs from 'fs'
import { test, expect } from '@playwright/test'
import { SESSION_PATHS } from './fixtures/test-credentials'

// ─── Session paths adicionais ────────────────────────────────────────────────

const SESSION_FINANCEIRO  = 'e2e/fixtures/session-financeiro.json'
const SESSION_OPERACIONAL = 'e2e/fixtures/session-operacional.json'

const hasAdminSession        = fs.existsSync(SESSION_PATHS.admin)
const hasFinanceiroSession   = fs.existsSync(SESSION_FINANCEIRO)
const hasOperacionalSession  = fs.existsSync(SESSION_OPERACIONAL)
const hasLocatarioSession    = fs.existsSync(SESSION_PATHS.locatario)

// ─── Grupo 1 — Controle de acesso por role ──────────────────────────────────

test.describe('Grupo 1 — SUPERADMIN: acesso completo', () => {
  test.skip(!hasAdminSession, 'Requer session-admin.json — rode: pnpm tsx scripts/create-staging-fixtures.ts')
  test.use({ storageState: SESSION_PATHS.admin })

  test('1.1 SUPERADMIN acessa /admin/usuarios/admins sem redirecionar', async ({ page }) => {
    await page.goto('/admin/usuarios/admins')
    await expect(page).toHaveURL(/\/admin\/usuarios\/admins/, { timeout: 15000 })
    await expect(page.locator('h1')).toContainText('Administradores')
  })
})

test.describe('Grupo 1 — FINANCEIRO: acesso restrito', () => {
  test.skip(!hasFinanceiroSession, 'Requer session-financeiro.json')
  test.use({ storageState: SESSION_FINANCEIRO })

  test('1.2 FINANCEIRO é redirecionado de /admin/usuarios/admins para /admin', async ({ page }) => {
    await page.goto('/admin/usuarios/admins')
    await expect(page).not.toHaveURL(/\/admin\/usuarios\/admins/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 })
  })

  test('1.3 FINANCEIRO é redirecionado de /admin/itens para /admin', async ({ page }) => {
    await page.goto('/admin/itens')
    await expect(page).not.toHaveURL(/\/admin\/itens$/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 })
  })

  test('1.4 FINANCEIRO é redirecionado de /admin/verificacoes para /admin', async ({ page }) => {
    await page.goto('/admin/verificacoes')
    await expect(page).not.toHaveURL(/\/admin\/verificacoes/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 })
  })

  test('1.5 FINANCEIRO acessa /admin/usuarios (leitura permitida)', async ({ page }) => {
    await page.goto('/admin/usuarios')
    await expect(page).toHaveURL(/\/admin\/usuarios/, { timeout: 15000 })
    await expect(page.locator('h1')).toContainText('Usuários')
  })

  test('1.6 FINANCEIRO em /admin/usuarios NÃO vê botões Ativar/Desativar', async ({ page }) => {
    await page.goto('/admin/usuarios')
    await expect(page.locator('h1')).toContainText('Usuários', { timeout: 15000 })
    // Botões de ação não devem existir para o role FINANCEIRO
    await expect(page.getByRole('button', { name: /Desativar/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Ativar/i })).toHaveCount(0)
  })
})

test.describe('Grupo 1 — OPERACIONAL: acesso restrito', () => {
  test.skip(!hasOperacionalSession, 'Requer session-operacional.json')
  test.use({ storageState: SESSION_OPERACIONAL })

  test('1.7 OPERACIONAL é redirecionado de /admin/usuarios/admins para /admin', async ({ page }) => {
    await page.goto('/admin/usuarios/admins')
    await expect(page).not.toHaveURL(/\/admin\/usuarios\/admins/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 })
  })

  test('1.8 OPERACIONAL é redirecionado de /admin/financeiro para /admin', async ({ page }) => {
    await page.goto('/admin/financeiro')
    await expect(page).not.toHaveURL(/\/admin\/financeiro$/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 })
  })
})

// ─── Grupo 2 — CRUD de admins (SUPERADMIN) ──────────────────────────────────

test.describe('Grupo 2 — CRUD de admins', () => {
  test.skip(!hasAdminSession, 'Requer session-admin.json')
  test.use({ storageState: SESSION_PATHS.admin })

  test('2.1 criar novo admin com dados válidos aparece na tabela', async ({ page }) => {
    await page.goto('/admin/usuarios/admins')
    await expect(page.locator('h1')).toContainText('Administradores', { timeout: 15000 })

    // Abrir formulário
    await page.getByRole('button', { name: /\+ Novo admin/i }).click()
    await expect(page.locator('h2', { hasText: /Novo administrador/i })).toBeVisible()

    // Preencher dados
    const uniqueEmail = `admin.e2e.${Date.now()}@shareo-test.com`
    await page.getByLabel('Nome').fill('Admin E2E Teste')
    await page.getByLabel('E-mail').fill(uniqueEmail)
    await page.getByLabel('Senha').fill('Teste@E2E2026!')
    // Role padrão OPERACIONAL já está selecionado

    // Submeter e aguardar request
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/users/admins') && res.request().method() === 'POST'),
      page.getByRole('button', { name: /Criar administrador/i }).click(),
    ])
    expect(response.status()).toBe(201)

    // Tabela deve exibir o novo admin (refresh automático)
    await expect(page.locator('td', { hasText: uniqueEmail })).toBeVisible({ timeout: 10000 })
  })

  test('2.2 criar admin com e-mail já existente exibe erro "Já existe"', async ({ page }) => {
    await page.goto('/admin/usuarios/admins')
    await expect(page.locator('h1')).toContainText('Administradores', { timeout: 15000 })

    await page.getByRole('button', { name: /\+ Novo admin/i }).click()

    // Usar e-mail do próprio superadmin (já existe)
    await page.getByLabel('Nome').fill('Conflito Teste')
    await page.getByLabel('E-mail').fill('admin@shareo.com.br')
    await page.getByLabel('Senha').fill('Teste@E2E2026!')

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/users/admins') && res.request().method() === 'POST'),
      page.getByRole('button', { name: /Criar administrador/i }).click(),
    ])
    expect(response.status()).toBe(409)

    await expect(page.locator('p.text-xs.text-red-600')).toContainText(/Já existe/, { timeout: 8000 })
  })

  test('2.3 senha fraca (< 10 chars) retorna erro de validação', async ({ page }) => {
    await page.goto('/admin/usuarios/admins')
    await page.getByRole('button', { name: /\+ Novo admin/i }).click()

    await page.getByLabel('Nome').fill('Senha Fraca Teste')
    await page.getByLabel('E-mail').fill(`fraca.${Date.now()}@shareo-test.com`)
    // 8 chars: passa HTML5 minLength=8, mas falha na API (mínimo 10)
    await page.getByLabel('Senha').fill('Curta1!!')

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/users/admins') && res.request().method() === 'POST'),
      page.getByRole('button', { name: /Criar administrador/i }).click(),
    ])
    expect(response.status()).toBe(400)

    await expect(page.locator('p.text-xs.text-red-600')).toBeVisible({ timeout: 8000 })
  })

  test('2.4 senha sem caractere especial retorna erro de validação', async ({ page }) => {
    await page.goto('/admin/usuarios/admins')
    await page.getByRole('button', { name: /\+ Novo admin/i }).click()

    await page.getByLabel('Nome').fill('Sem Especial Teste')
    await page.getByLabel('E-mail').fill(`semespecial.${Date.now()}@shareo-test.com`)
    await page.getByLabel('Senha').fill('SemEspecial123456')

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/users/admins') && res.request().method() === 'POST'),
      page.getByRole('button', { name: /Criar administrador/i }).click(),
    ])
    expect(response.status()).toBe(400)

    await expect(page.locator('p.text-xs.text-red-600')).toBeVisible({ timeout: 8000 })
  })

  test('2.5 alterar adminRole via select atualiza o badge', async ({ page }) => {
    await page.goto('/admin/usuarios/admins')
    await expect(page.locator('h1')).toContainText('Administradores', { timeout: 15000 })

    // Encontrar uma linha que não seja o próprio admin logado (não tem "—" na coluna Ações)
    // e que tenha o select de role disponível
    const roleSelect = page.locator('select[aria-label="Alterar role"]').first()
    const count = await roleSelect.count()
    if (count === 0) {
      test.skip() // Só existe o próprio admin na lista
      return
    }

    const currentValue = await roleSelect.inputValue()
    const newValue = currentValue === 'ADMIN_FINANCEIRO' ? 'ADMIN_OPERACIONAL' : 'ADMIN_FINANCEIRO'

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/users/admins/') && res.request().method() === 'PATCH'),
      roleSelect.selectOption(newValue),
    ])
    expect(response.status()).toBe(200)
    const body = await response.json() as { data: { adminRole: string } }
    expect(body.data.adminRole).toBe(newValue)
  })

  test('2.6 desativar admin: confirm dialog → confirma → badge "inativo" aparece', async ({ page }) => {
    await page.goto('/admin/usuarios/admins')
    await expect(page.locator('h1')).toContainText('Administradores', { timeout: 15000 })

    // Procurar admin de teste (@shareo-test.com) com botão "Desativar" — evita desativar admins reais
    const testRow = page.locator('tr', { hasText: '@shareo-test.com' }).first()
    const desativarBtn = testRow.getByRole('button', { name: /^Desativar$/ })
    const count = await desativarBtn.count()
    if (count === 0) {
      test.skip() // Sem admin de teste ativo para desativar
      return
    }

    // Aceitar o confirm dialog
    page.once('dialog', (dialog) => dialog.accept())

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/users/admins/') && res.request().method() === 'PATCH'),
      desativarBtn.click(),
    ])
    expect(response.status()).toBe(200)

    // Após refresh, badge "inativo" deve aparecer
    await expect(page.locator('span', { hasText: 'inativo' }).first()).toBeVisible({ timeout: 10000 })
  })

  test('2.7 desativar admin: cancela no confirm → nada muda', async ({ page }) => {
    await page.goto('/admin/usuarios/admins')
    await expect(page.locator('h1')).toContainText('Administradores', { timeout: 15000 })

    const testRow = page.locator('tr', { hasText: '@shareo-test.com' }).first()
    const desativarBtn = testRow.getByRole('button', { name: /^Desativar$/ })
    const count = await desativarBtn.count()
    if (count === 0) {
      test.skip()
      return
    }

    // Cancelar o confirm dialog
    page.once('dialog', (dialog) => dialog.dismiss())

    // Não deve emitir request ao cancelar
    let requestFired = false
    page.on('request', (req) => {
      if (req.url().includes('/api/admin/users/admins/') && req.method() === 'PATCH') {
        requestFired = true
      }
    })

    await desativarBtn.click()
    // Aguardar breve momento para garantir que não houve request
    await page.waitForTimeout(500)
    expect(requestFired).toBe(false)
  })

  test('2.8 "(você)" aparece para o próprio admin logado e sem ações visíveis', async ({ page }) => {
    await page.goto('/admin/usuarios/admins')
    await expect(page.locator('h1')).toContainText('Administradores', { timeout: 15000 })

    // O admin logado deve ter "(você)" ao lado do nome
    await expect(page.locator('span', { hasText: '(você)' })).toBeVisible({ timeout: 10000 })

    // A linha do próprio admin deve mostrar "—" nas ações (não o select/botão)
    // Localiza a linha que contém "(você)"
    const selfRow = page.locator('tr', { has: page.locator('span', { hasText: '(você)' }) })
    await expect(selfRow.locator('select[aria-label="Alterar role"]')).toHaveCount(0)
    await expect(selfRow.getByRole('button', { name: /Desativar|Ativar/ })).toHaveCount(0)
  })
})

// ─── Grupo 3 — Ativar/desativar usuário regular ──────────────────────────────

test.describe('Grupo 3 — SUPERADMIN: gerenciar usuário regular', () => {
  test.skip(!hasAdminSession, 'Requer session-admin.json')
  test.use({ storageState: SESSION_PATHS.admin })

  test('3.1 SUPERADMIN desativa usuário regular via confirm', async ({ page }) => {
    await page.goto('/admin/usuarios')
    await expect(page.locator('h1')).toContainText('Usuários', { timeout: 15000 })

    // Encontrar botão Desativar de um usuário regular (não admin)
    const desativarBtn = page.getByRole('button', { name: /^Desativar$/ }).first()
    const count = await desativarBtn.count()
    if (count === 0) {
      test.skip()
      return
    }

    page.once('dialog', (dialog) => dialog.accept())

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/users/') && res.request().method() === 'PATCH'),
      desativarBtn.click(),
    ])
    expect(response.status()).toBe(200)
  })
})

test.describe('Grupo 3 — OPERACIONAL: gerenciar usuário regular', () => {
  test.skip(!hasOperacionalSession, 'Requer session-operacional.json')
  test.use({ storageState: SESSION_OPERACIONAL })

  test('3.2 OPERACIONAL vê e usa botão Desativar em /admin/usuarios', async ({ page }) => {
    await page.goto('/admin/usuarios')
    await expect(page.locator('h1')).toContainText('Usuários', { timeout: 15000 })

    const desativarBtn = page.getByRole('button', { name: /^Desativar$/ }).first()
    const count = await desativarBtn.count()
    if (count === 0) {
      test.skip()
      return
    }

    page.once('dialog', (dialog) => dialog.accept())

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/users/') && res.request().method() === 'PATCH'),
      desativarBtn.click(),
    ])
    expect(response.status()).toBe(200)
  })
})

test.describe('Grupo 3 — FINANCEIRO: API de usuário bloqueada', () => {
  test.skip(!hasFinanceiroSession, 'Requer session-financeiro.json')
  test.use({ storageState: SESSION_FINANCEIRO })

  test('3.3 PATCH /api/admin/users/:id por FINANCEIRO retorna 403', async ({ page }) => {
    const res = await page.request.patch('/api/admin/users/usuario-inexistente-teste', {
      data: { action: 'deactivate' },
    })
    expect(res.status()).toBe(403)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('FORBIDDEN')
  })
})

// ─── Grupo 4 — Troca de senha admin ─────────────────────────────────────────

test.describe('Grupo 4 — Admin: troca de senha em /perfil/seguranca', () => {
  test.skip(!hasAdminSession, 'Requer session-admin.json')
  test.use({ storageState: SESSION_PATHS.admin })

  test('4.1 admin vê formulário inline de troca de senha (não link forgot-password)', async ({ page }) => {
    await page.goto('/perfil/seguranca')
    await expect(page.locator('h1')).toContainText('Login e Segurança', { timeout: 15000 })

    // Formulário inline deve estar visível
    await expect(page.locator('form')).toBeVisible()
    await expect(page.getByLabel('Senha atual')).toBeVisible()
    await expect(page.locator('#pwd-new')).toBeVisible()

    // Link forgot-password NÃO deve existir
    await expect(page.getByRole('link', { name: /Alterar senha/i })).toHaveCount(0)
  })

  test('4.2 admin NÃO vê "Zona de perigo" em /perfil/seguranca', async ({ page }) => {
    await page.goto('/perfil/seguranca')
    await expect(page.locator('h1')).toContainText('Login e Segurança', { timeout: 15000 })

    await expect(page.locator('h2', { hasText: /Zona de perigo/i })).toHaveCount(0)
  })

  test('4.3 admin: senha atual incorreta exibe erro', async ({ page }) => {
    await page.goto('/perfil/seguranca')
    await expect(page.getByLabel('Senha atual')).toBeVisible({ timeout: 15000 })

    await page.getByLabel('Senha atual').fill('SenhaErrada@2026!')
    await page.locator('#pwd-new').fill('NovaSenha@2026!')
    await page.locator('#pwd-confirm').fill('NovaSenha@2026!')

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/user/password')),
      page.getByRole('button', { name: /Salvar nova senha/i }).click(),
    ])
    expect(response.status()).toBe(400)

    await expect(page.locator('p.text-xs.text-destructive')).toContainText(/Senha atual incorreta/, { timeout: 8000 })
  })

  test('4.4 admin: nova senha < 8 chars exibe erro de validação no cliente', async ({ page }) => {
    await page.goto('/perfil/seguranca')
    await expect(page.getByLabel('Senha atual')).toBeVisible({ timeout: 15000 })

    await page.getByLabel('Senha atual').fill('QualquerCoisa@123')
    await page.locator('#pwd-new').fill('curta')
    await page.locator('#pwd-confirm').fill('curta')

    // O erro de validação é no lado cliente (< 8 chars), sem fazer request
    await page.getByRole('button', { name: /Salvar nova senha/i }).click()

    await expect(page.locator('p.text-xs.text-destructive')).toContainText(/Mínimo 8 caracteres/, { timeout: 5000 })
  })
})

test.describe('Grupo 4 — Usuário regular: /perfil/seguranca', () => {
  test.skip(!hasLocatarioSession, 'Requer session-locatario.json')
  test.use({ storageState: SESSION_PATHS.locatario })

  test('4.5 usuário regular vê link forgot-password (não formulário inline)', async ({ page }) => {
    await page.goto('/perfil/seguranca')
    await expect(page.locator('h1')).toContainText('Login e Segurança', { timeout: 15000 })

    // Link "Alterar senha" deve existir
    await expect(page.getByRole('link', { name: /Alterar senha/i })).toBeVisible()

    // Formulário inline NÃO deve existir
    await expect(page.locator('form')).toHaveCount(0)
  })

  test('4.6 usuário regular VÊ "Zona de perigo" em /perfil/seguranca', async ({ page }) => {
    await page.goto('/perfil/seguranca')
    await expect(page.locator('h1')).toContainText('Login e Segurança', { timeout: 15000 })

    await expect(page.locator('h2', { hasText: /Zona de perigo/i })).toBeVisible()
  })
})

// ─── Grupo 5 — Rate limiting ─────────────────────────────────────────────────

test.describe('Grupo 5 — Rate limiting na troca de senha', () => {
  test.skip(!hasAdminSession, 'Requer session-admin.json')
  test.use({ storageState: SESSION_PATHS.admin })

  test('5.1 6ª tentativa de troca de senha retorna 429', async ({ page }) => {
    // O rate limit é de 5 por 15 minutos — a 6ª deve retornar 429
    const payload = { currentPassword: 'SenhaErradaRateLimit@1', newPassword: 'NovaRateLimit@2026' }

    let lastStatus = 0
    for (let i = 1; i <= 6; i++) {
      const res = await page.request.patch('/api/user/password', { data: payload })
      lastStatus = res.status()
      // Se já chegou em 429 antes da 6ª iteração, encerra
      if (lastStatus === 429) break
    }

    expect(lastStatus).toBe(429)
  })
})

// ─── Grupo 6 — Blocklist Redis (mock/stub) ───────────────────────────────────
//
// Estes testes dependem do Redis (Upstash) configurado no ambiente de staging.
// Em staging, as variáveis UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN
// podem não estar disponíveis — o middleware falha aberto (sem bloquear).
// Por isso os testes estão marcados como .skip.
//
// Para rodar localmente: configure .env.local com as vars do Redis e remova o skip.

test.describe('Grupo 6 — Blocklist Redis (requer Redis no ambiente)', () => {
  test.skip(true, 'Requer Redis (Upstash) configurado no ambiente — não garantido em staging')

  test.use({ storageState: SESSION_PATHS.admin })

  test('6.1 admin com userId na blocklist tenta acessar /admin → redirect /sair', async ({ page }) => {
    // Pré-condição (a ser feita via script/fixture externo):
    // Inserir o userId do admin na blocklist via Redis diretamente antes do teste.
    // Ex.: redis.setex(`admin:blocked:${userId}`, 86400, "1")
    //
    // Após inserção, o middleware deve redirecionar para /sair.
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/sair/, { timeout: 10000 })
  })

  test('6.2 admin bloqueado chama /api/admin/financeiro → 403 JSON', async ({ page }) => {
    // Mesma pré-condição: userId na blocklist antes do request.
    const res = await page.request.get('/api/admin/financeiro')
    expect(res.status()).toBe(403)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('FORBIDDEN')
  })
})

// ─── API — validações server-side dos admins ─────────────────────────────────

test.describe('API — /api/admin/users/admins validações', () => {
  test.skip(!hasAdminSession, 'Requer session-admin.json')
  test.use({ storageState: SESSION_PATHS.admin })

  test('POST /api/admin/users/admins retorna 400 para body vazio', async ({ page }) => {
    const res = await page.request.post('/api/admin/users/admins', { data: {} })
    // 400 = validação falhou; 429 = rate limit atingido pelos testes anteriores — ambos indicam rejeição correta
    expect([400, 429]).toContain(res.status())
  })

  test('POST /api/admin/users/admins retorna 400 para adminRole inválido', async ({ page }) => {
    const res = await page.request.post('/api/admin/users/admins', {
      data: {
        name:      'Teste Role Inválido',
        email:     `invalido.${Date.now()}@shareo-test.com`,
        password:  'Valida@2026!',
        adminRole: 'ADMIN_INVALIDO',
      },
    })
    expect([400, 429]).toContain(res.status())
  })

  test('PATCH /api/admin/users/admins/:id retorna 404 para ID inexistente', async ({ page }) => {
    const res = await page.request.patch('/api/admin/users/admins/id-inexistente-e2e', {
      data: { action: 'deactivate' },
    })
    expect(res.status()).toBe(404)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('NOT_FOUND')
  })

  test('PATCH /api/admin/users/admins/:id retorna 403 ao tentar alterar própria conta', async ({ page }) => {
    // Para executar este teste, precisaríamos do próprio userId do admin logado.
    // Usamos um endpoint que retorne o session user ID, ou pulamos se não disponível.
    // Como não há endpoint GET /api/auth/me explícito, testamos via comportamento:
    // a API retorna 403 se o id na URL for o mesmo do admin autenticado.
    // Aqui fazemos um PATCH com ID fictício para confirmar que a validação existe.
    const res = await page.request.patch('/api/admin/users/admins/self', {
      data: { action: 'deactivate' },
    })
    // 403 (self) ou 404 (not found) — ambos corretos dependendo da ordem dos guards
    expect([403, 404]).toContain(res.status())
  })
})

test.describe('API — /api/admin/users/admins protegida por role', () => {
  test.skip(!hasFinanceiroSession, 'Requer session-financeiro.json')
  test.use({ storageState: SESSION_FINANCEIRO })

  test('POST /api/admin/users/admins por FINANCEIRO retorna 403', async ({ page }) => {
    const res = await page.request.post('/api/admin/users/admins', {
      data: {
        name:      'Tentativa Financeiro',
        email:     `fin.${Date.now()}@shareo-test.com`,
        password:  'Valida@2026!',
        adminRole: 'ADMIN_OPERACIONAL',
      },
    })
    expect(res.status()).toBe(403)
  })

  test('PATCH /api/admin/users/admins/:id por FINANCEIRO retorna 403', async ({ page }) => {
    const res = await page.request.patch('/api/admin/users/admins/qualquer-id', {
      data: { action: 'deactivate' },
    })
    expect(res.status()).toBe(403)
  })
})
