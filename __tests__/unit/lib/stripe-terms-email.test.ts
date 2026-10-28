/** @jest-environment node */
/**
 * Aviso dos termos da Stripe (prazo da Stripe: 07/11/2026; vigência: 06/01/2027).
 *
 * O que se fixa: a data de vigência e o link do contrato (o que a Stripe manda
 * dizer), o escape do nome (campo livre do usuário num e-mail de @shareo.com.br)
 * e que é e-mail TRANSACIONAL, sem descadastro nem headers de marketing.
 */

process.env.AUTH_SECRET    = "segredo-de-teste-nao-usar-em-producao"
process.env.RESEND_API_KEY = "re_test_key"
process.env.EMAIL_FROM     = "noreply@shareo.com.br"

const mockSend = jest.fn()

jest.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend }
  },
}))

jest.mock("@/lib/prisma", () => ({ prisma: {} }))

import { sendStripeTermsUpdateEmail } from "@/lib/email"

beforeEach(() => mockSend.mockReset().mockResolvedValue({ data: { id: "x" }, error: null }))

describe("sendStripeTermsUpdateEmail", () => {
  it("diz a data de vigência e leva ao contrato de conta conectada da Stripe", async () => {
    await sendStripeTermsUpdateEmail("dono@example.com", "Maria Souza")

    const payload = mockSend.mock.calls[0][0]
    expect(payload.to).toBe("dono@example.com")
    expect(payload.html).toContain("6 de janeiro de 2027")
    expect(payload.html).toContain("https://stripe.com/legal/connect-account")
    expect(payload.html).toContain("Olá, Maria!")
    expect(payload.html).toContain(`href="mailto:suporte@shareo.com.br"`)
  })

  it("escapa o nome — campo livre não vira HTML no e-mail", async () => {
    await sendStripeTermsUpdateEmail("dono@example.com", `<a href="https://golpe.example">clique</a> Souza`)

    const { html } = mockSend.mock.calls[0][0]
    expect(html).not.toContain(`<a href="https://golpe.example">`)
    expect(html).toContain("&lt;a")
  })

  it("é transacional: sem headers de descadastro", async () => {
    await sendStripeTermsUpdateEmail("dono@example.com", "Maria")

    expect(mockSend.mock.calls[0][0].headers).toBeUndefined()
  })

  it("devolve o erro do provedor em vez de engolir", async () => {
    const log = jest.spyOn(console, "error").mockImplementation(() => {}) // sendWithRetry loga as 2 tentativas
    mockSend.mockResolvedValue({ data: null, error: { message: "rate limit" } })

    const { error } = await sendStripeTermsUpdateEmail("dono@example.com", "Maria")

    expect(error?.message).toBe("rate limit")
    log.mockRestore()
  })
})
