import type { Page } from '@playwright/test'
import { totpAtStep, totpStep } from '../../lib/totp'

/**
 * Login de admin com 2FA obrigatório: as contas admin fixture têm o autenticador
 * cadastrado com um segredo CONHECIDO (variável de ambiente / GitHub Secret), e o
 * teste calcula o código do momento — não há bypass do 2FA em nenhum ambiente.
 *
 * O segredo é gravado no banco por `enrollFixtureTotp()` (scripts/create-staging-fixtures.ts).
 * O servidor aceita ±1 passo de 30 s, então não é preciso esperar a virada do passo.
 */

/**
 * Chame logo DEPOIS de clicar em "Entrar" numa conta admin. Se o formulário pedir o
 * código de verificação (2ª etapa), preenche e envia; senão (conta sem 2FA) não faz nada.
 *
 * Conta admin sem `secret` que peça o código = configuração faltando: falha com a causa
 * dita, em vez de estourar 30 s depois em "Login timeout".
 */
export async function completeTwoFactorIfAsked(page: Page, email: string, secret: string | undefined): Promise<void> {
  const field = page.getByLabel(/código de verificação/i)
  const asked = await field.waitFor({ state: 'visible', timeout: 6_000 }).then(() => true, () => false)
  if (!asked) return

  if (!secret) {
    throw new Error(
      `${email} pede o código do 2FA e não há segredo TOTP para ela. ` +
      `Defina o segredo da conta (ex.: FIXTURE_ADMIN_TOTP_SECRET) e rode enrollFixtureTotp().`,
    )
  }
  await field.fill(totpAtStep(secret, totpStep(Date.now())))
  await page.getByRole('button', { name: /entrar/i }).click()
}

/**
 * Chame DEPOIS de o login sair de /login. 🪤 Os regex de "login concluído" dos scripts aceitam
 * /perfil — e /perfil/seguranca/2fa também casa. Admin sem 2FA cai ali, e a sessão salva seria a
 * de um admin REBAIXADO: toda spec de admin voltaria 403 sem apontar a causa.
 */
export function assertNotEnrollment(page: Page, email: string): void {
  if (page.url().includes('/perfil/seguranca/2fa')) {
    throw new Error(
      `${email} caiu no cadastro do 2FA: sem segredo TOTP conhecido a sessão sairia sem acesso admin. ` +
      `Defina o segredo da conta e cadastre o 2FA (enrollFixtureTotp em scripts/create-staging-fixtures.ts).`,
    )
  }
}
