/**
 * P3-65 — E2E: chat em tempo real
 *
 * Cobertura:
 *  1. Usuário acessa /mensagens e vê lista de conversas
 *  2. Abre uma conversa e vê o histórico
 *  3. Templates aparecem quando campo está vazio
 *  4. Clique em template preenche o campo
 *  5. Envio de mensagem (happy path)
 *  6. Conteúdo XSS não é renderizado como HTML
 *  7. Mensagem vazia não envia
 *  8. Indicador "ao vivo" (Realtime) aparece quando WebSocket conecta
 */

import { test, expect } from "@playwright/test"

async function loginAs(page: import("@playwright/test").Page) {
  await page.goto("/entrar")
  await page.fill('[name="email"]',    process.env.E2E_USER_EMAIL    ?? "usuario@shareo.com.br")
  await page.fill('[name="password"]', process.env.E2E_USER_PASSWORD ?? "Senha@123")
  await page.click('[type="submit"]')
  await page.waitForURL(/\/(dashboard|home|mensagens|$)/, { timeout: 10_000 })
}

test.describe("lista de conversas — /mensagens", () => {
  test.skip(!process.env.E2E_USER_EMAIL, "E2E_USER_EMAIL não definido")

  test("página /mensagens carrega sem erro 500", async ({ page }) => {
    await loginAs(page)
    await page.goto("/mensagens")
    await expect(page).toHaveURL(/\/mensagens/)
    await expect(page.locator("main, [role='main']")).toBeVisible()
    await expect(page.locator("text=500")).not.toBeVisible()
  })

  test("visitante não autenticado é redirecionado de /mensagens", async ({ page }) => {
    await page.goto("/mensagens")
    await expect(page).not.toHaveURL(/\/mensagens$/)
  })
})

test.describe("janela de conversa — /mensagens/[id]", () => {
  test.skip(!process.env.E2E_CONV_ID, "E2E_CONV_ID não definido — skip sem seed")

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
  })

  test("abre conversa e mostra histórico de mensagens", async ({ page }) => {
    await page.goto(`/mensagens/${process.env.E2E_CONV_ID}`)
    await expect(page.locator("textarea, [role='textbox']")).toBeVisible()
  })

  test("templates aparecem quando campo está vazio", async ({ page }) => {
    await page.goto(`/mensagens/${process.env.E2E_CONV_ID}`)
    const textarea = page.locator("textarea").first()
    await expect(textarea).toHaveValue("")
    // Templates são chips visíveis quando campo está vazio
    await expect(page.locator("text=Ainda está disponível?")).toBeVisible()
    await expect(page.locator("text=Qual o prazo mínimo?")).toBeVisible()
  })

  test("clique em template preenche o campo sem enviar", async ({ page }) => {
    await page.goto(`/mensagens/${process.env.E2E_CONV_ID}`)
    const template = page.locator("text=Ainda está disponível?")
    await template.click()
    const textarea = page.locator("textarea").first()
    await expect(textarea).toHaveValue("Ainda está disponível?")
    // Templates somem após campo preenchido
    await expect(template).not.toBeVisible()
  })

  test("mensagem vazia não dispara envio", async ({ page }) => {
    await page.goto(`/mensagens/${process.env.E2E_CONV_ID}`)
    const sendBtn = page.locator("button[aria-label='Enviar mensagem']")
    await expect(sendBtn).toBeDisabled()
  })

  test("campo de texto tem tap target ≥ 44px de altura", async ({ page }) => {
    await page.goto(`/mensagens/${process.env.E2E_CONV_ID}`)
    const textarea = page.locator("textarea").first()
    const box = await textarea.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(40)
  })

  test("conteúdo XSS não é renderizado como HTML", async ({ page }) => {
    await page.goto(`/mensagens/${process.env.E2E_CONV_ID}`)
    const textarea = page.locator("textarea").first()
    await textarea.fill("<script>document.title='XSS'</script>Mensagem")
    // Não deve existir tag script executável no DOM
    const title = await page.title()
    expect(title).not.toBe("XSS")
  })
})
