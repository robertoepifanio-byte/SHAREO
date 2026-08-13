/**
 * Helpers de interação com a UI.
 *
 * Vivem separados de `_support.ts` de propósito: este módulo importa o runtime do
 * Playwright (`expect`), o que o torna impossível de carregar sob o jest
 * ("Class extends value undefined"). O `_support.ts` só tem lógica pura e
 * imports de tipo, para que `__tests__/unit/e2e-plan-runner.test.ts` consiga
 * importá-lo e cobrir o fecho de veredito dos planos.
 */
import { expect, type Page } from '@playwright/test'

/**
 * logout — sai da conta pelo menu do usuário.
 *
 * O botão "Sair" NÃO está solto no header: vive dentro do `UserDropdown`
 * (components/layout/UserDropdown.tsx), atrás do botão de avatar
 * `aria-label="Menu do usuário — <primeiro nome>"`. Os specs procuravam
 * `getByRole('button', { name: /sair/i })` direto na página e falhavam desde a
 * redesenhada da navegação — sem ninguém notar, porque o step é `low`/`high` e a
 * falha era engolida pelo veredito PARCIAL (ver `assertNoFailedSteps`).
 *
 * Abre o menu só se necessário: em viewport onde o botão já esteja visível
 * (menu mobile expandido, por exemplo), clicar no avatar fecharia o que já está
 * aberto.
 */
export async function logout(page: Page): Promise<void> {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

  const sair = page.getByRole('button', { name: /sair/i })

  if (!(await sair.first().isVisible().catch(() => false))) {
    const menu = page.getByRole('button', { name: /menu do usuário/i })
    await expect(menu).toBeVisible({ timeout: 8_000 })
    await menu.click()
  }

  await expect(sair.first()).toBeVisible({ timeout: 8_000 })
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/dashboard'), { timeout: 20_000 }),
    sair.first().click(),
  ])
  await expect(page).not.toHaveURL(/\/dashboard/)
}
