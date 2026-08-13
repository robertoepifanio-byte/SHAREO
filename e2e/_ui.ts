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

  /**
   * O "Sair" do UserDropdown é `<button type="button" role="menuitem">`. Um role
   * EXPLÍCITO substitui o implícito na árvore de acessibilidade: para o Playwright
   * aquele elemento não é mais um `button`, é um `menuitem`. Por isso o
   * `getByRole('button', { name: /sair/i })` que os specs usavam nunca poderia
   * casar — e, com a falha engolida pelo veredito PARCIAL, ninguém soube.
   *
   * O "Sair" do MobileMenu é `<button>` puro, sem role. Daí o `.or()`: um locator
   * que funciona nos dois headers, em vez de um por viewport.
   */
  const sair = page.getByRole('menuitem', { name: /sair/i })
    .or(page.getByRole('button', { name: /sair/i }))

  // As mensagens custom são essenciais: os runners dos planos truncam o erro em
  // `.message.split('\n')[0]`, então sem elas o relatório mostra só
  // "expect(locator).toBeVisible() failed" e não dá para saber QUAL locator falhou.
  if (!(await sair.first().isVisible().catch(() => false))) {
    const menu = page.getByRole('button', { name: /menu do usuário/i })
    await expect(
      menu,
      'logout: avatar "Menu do usuário" não encontrado no header de /dashboard',
    ).toBeVisible({ timeout: 8_000 })

    /**
     * O clique é repetido até o menu abrir, de propósito.
     *
     * UserDropdown abre por useState: antes da hidratação do React o botão está
     * na tela e clicável, mas o onClick ainda não existe — o clique é aceito e
     * some. Contra staging (rede real, lambda fria) essa janela é larga o
     * bastante para o `page.goto` + clique imediato cair dentro dela; em
     * servidor local, rápido, o mesmo código passava.
     *
     * Diagnóstico que levou aqui: a mensagem custom mostrou que o avatar ERA
     * encontrado e clicado, e mesmo assim o "Sair" nunca aparecia — ou seja, o
     * problema não era o seletor, era o clique não surtir efeito.
     */
    await expect(async () => {
      await menu.click()
      await expect(
        page.getByRole('menu'),
        'logout: clique no avatar não abriu o menu (provável clique pré-hidratação)',
      ).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 20_000 })
  }

  await expect(
    sair.first(),
    'logout: botão "Sair" não apareceu depois de abrir o menu do usuário',
  ).toBeVisible({ timeout: 8_000 })
  /**
   * Timeout PRÓPRIO no clique, curto de propósito.
   *
   * Sem ele o `click()` herda o orçamento do teste (120s): quando a
   * acionabilidade não é satisfeita, o Playwright fica retentando até o teste
   * inteiro estourar e o relatório mostra apenas "Test timeout of 120000ms
   * exceeded" — que não diz NADA sobre o motivo. Com timeout próprio, o erro
   * carrega o log de retentativa do Playwright, que nomeia a causa real
   * (elemento instável, coberto por outro, sem receber eventos...).
   *
   * O `Promise.all([waitForURL, click])` anterior escondia isso: quem estourava
   * primeiro era o waitForURL, então parecia "clicou mas não navegou" quando na
   * verdade o clique nunca completava.
   */
  try {
    await sair.first().click({ timeout: 15_000 })
  } catch (e) {
    // O log de acionabilidade do Playwright ("- element is not stable",
    // "- element intercepts pointer events from <div…>") vem nas linhas SEGUINTES
    // da mensagem — e os runners dos planos guardam só `.split('\n')[0]`.
    // Achatamos as linhas úteis numa só para a causa sobreviver ao truncamento.
    const bruto = e instanceof Error ? e.message : String(e)
    const pistas = bruto
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('-') || /intercepts|not stable|not visible|not enabled|outside of the viewport/i.test(l))
      .slice(0, 6)
      .join(' | ')
    throw new Error(
      `logout: clique em "Sair" não completou — ${bruto.split('\n')[0]}${pistas ? ` :: ${pistas}` : ''}`,
    )
  }

  /**
   * `signOut({ callbackUrl: '/' })` do NextAuth faz round-trip (csrf + signout) e
   * só então navega. Contra staging isso é bem mais lento que os 20s originais, e
   * o timeout cru do waitForURL não dizia ONDE a página parou — o relatório
   * mostrava só "Timeout 20000ms exceeded".
   *
   * Verificado manualmente pelo fundador em 13/08/2026: o logout funciona no
   * staging pela UI. Ou seja, aqui é o teste que precisa ser paciente e falar,
   * não o produto que está quebrado.
   */
  try {
    await page.waitForURL((url) => !url.pathname.includes('/dashboard'), { timeout: 45_000 })
  } catch {
    throw new Error(
      `logout: clique em "Sair" não deslogou em 45s — página ainda em ${page.url()}`,
    )
  }
}
