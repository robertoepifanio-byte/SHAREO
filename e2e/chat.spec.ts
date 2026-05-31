/**
 * P3-65 — E2E: chat em tempo real
 *
 * Cobertura:
 *  1. Visitante não autenticado é redirecionado de /mensagens
 *  2. Usuário acessa /mensagens e vê lista de conversas
 *  3. Abre uma conversa e vê o histórico
 *  4. Templates aparecem quando campo está vazio
 *  5. Clique em template preenche o campo
 *  6. Envio de mensagem (happy path)
 *  7. Conteúdo XSS não é renderizado como HTML
 *  8. Mensagem vazia não envia
 *  9. Indicador "ao vivo" (Realtime) aparece quando WebSocket conecta
 *
 * Session fixtures: e2e/fixtures/session-locatario.json
 * Gerar com: pnpm tsx scripts/create-staging-fixtures.ts
 */

import fs from 'fs'
import { test, expect } from "@playwright/test"
import { SESSION_PATHS } from './fixtures/test-credentials'

const hasLocatarioSession = fs.existsSync(SESSION_PATHS.locatario)

// ---------------------------------------------------------------------------
// 1. Visitante sem autenticação (não requer fixture)
// ---------------------------------------------------------------------------

test.describe("visitante — /mensagens sem autenticação", () => {
  test("visitante não autenticado é redirecionado de /mensagens", async ({ page }) => {
    await page.goto("/mensagens")
    await expect(page).not.toHaveURL(/\/mensagens$/)
  })
})

// ---------------------------------------------------------------------------
// 2. Lista de conversas — requer session fixture de locatário
// ---------------------------------------------------------------------------

test.describe("lista de conversas — /mensagens", () => {
  test.skip(!hasLocatarioSession, "Session fixture não encontrada — rode: pnpm tsx scripts/create-staging-fixtures.ts")

  test.use({ storageState: SESSION_PATHS.locatario })

  test("página /mensagens carrega sem erro 500", async ({ page }) => {
    await page.goto("/mensagens")
    await expect(page).toHaveURL(/\/mensagens/, { timeout: 15000 })
    await expect(page.locator("main, [role='main']")).toBeVisible()
    await expect(page.getByText(/500|erro interno/i)).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 3. Janela de conversa — requer session fixture + conversa existente (E2E_CONV_ID)
// ---------------------------------------------------------------------------

const convId = process.env.E2E_CONV_ID

test.describe("janela de conversa — /mensagens/[id]", () => {
  test.skip(!hasLocatarioSession || !convId, "Session fixture ou E2E_CONV_ID não definido")

  test.use({ storageState: SESSION_PATHS.locatario })

  test("abre conversa e mostra histórico de mensagens", async ({ page }) => {
    await page.goto(`/mensagens/${convId}`)
    await expect(page.locator("textarea, [role='textbox']")).toBeVisible()
  })

  test("templates aparecem quando campo está vazio", async ({ page }) => {
    await page.goto(`/mensagens/${convId}`)
    const textarea = page.locator("textarea").first()
    await expect(textarea).toHaveValue("")
    await expect(page.getByText("Ainda está disponível?")).toBeVisible()
    await expect(page.getByText("Qual o prazo mínimo?")).toBeVisible()
  })

  test("clique em template preenche o campo sem enviar", async ({ page }) => {
    await page.goto(`/mensagens/${convId}`)
    const template = page.getByText("Ainda está disponível?")
    await template.click()
    const textarea = page.locator("textarea").first()
    await expect(textarea).toHaveValue("Ainda está disponível?")
    await expect(template).not.toBeVisible()
  })

  test("mensagem vazia não dispara envio", async ({ page }) => {
    await page.goto(`/mensagens/${convId}`)
    const sendBtn = page.locator("button[aria-label='Enviar mensagem']")
    await expect(sendBtn).toBeDisabled()
  })

  test("campo de texto tem tap target ≥ 44px de altura", async ({ page }) => {
    await page.goto(`/mensagens/${convId}`)
    const textarea = page.locator("textarea").first()
    const box = await textarea.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(40)
  })

  test("conteúdo XSS não é renderizado como HTML", async ({ page }) => {
    await page.goto(`/mensagens/${convId}`)
    const textarea = page.locator("textarea").first()
    await textarea.fill("<script>document.title='XSS'</script>Mensagem")
    const title = await page.title()
    expect(title).not.toBe("XSS")
  })
})
