/** @jest-environment node */
/**
 * Contrato do e-mail de MARKETING.
 *
 * O que se afirma aqui não é estética: é o que separa um e-mail opcional
 * legítimo de um que queima a reputação do domínio. `noreply@shareo.com.br` é
 * o mesmo remetente da confirmação de reserva e do reset de senha — se o digest
 * de favoritos for para a caixa de spam, esses vão junto.
 *
 * Por isso três garantias viram teste:
 *   • headers RFC 8058 (Gmail/Yahoo exigem de remetente de volume);
 *   • link de descadastro visível no corpo (LGPD art. 18);
 *   • o layout do produto, e não `<p>` cru como os e-mails do cron saíam.
 *
 * E uma quarta, pela negativa: `sendAppEmail` — o caminho do transacional —
 * NÃO pode ganhar descadastro. Oferecer "cancelar" num reset de senha faria o
 * usuário desligar o que é execução do contrato.
 */

process.env.AUTH_SECRET     = "segredo-de-teste-nao-usar-em-producao"
process.env.RESEND_API_KEY  = "re_test_key"
process.env.EMAIL_FROM      = "noreply@shareo.com.br"

const mockSend = jest.fn().mockResolvedValue({ data: { id: "x" }, error: null })

jest.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend }
  },
}))

jest.mock("@/lib/prisma", () => ({ prisma: { user: { findFirst: jest.fn() } } }))

import { prisma } from "@/lib/prisma"
import { sendMarketingEmail, sendAppEmail } from "@/lib/email"
import { engagementUnsubscribeToken } from "@/lib/engagement-unsubscribe"

const TO = "roberto@example.com"

const mockOptOut = prisma.user.findFirst as jest.Mock

beforeEach(() => {
  mockSend.mockClear()
  mockOptOut.mockReset()
  mockOptOut.mockResolvedValue(null) // ninguém descadastrado por padrão
})

describe("sendMarketingEmail", () => {
  it("manda os headers de descadastro em um clique (RFC 8058)", async () => {
    await sendMarketingEmail({ to: TO, subject: "Seus favoritos", bodyHtml: "<p>oi</p>" })

    const { headers } = mockSend.mock.calls[0][0]
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click")
    expect(headers["List-Unsubscribe"]).toContain("/api/engagement/unsubscribe")
    // O token tem que ser o do destinatário — um link genérico descadastraria
    // a pessoa errada, ou pessoa nenhuma.
    expect(headers["List-Unsubscribe"]).toContain(engagementUnsubscribeToken(TO))
  })

  it("põe o link de descadastro no corpo, não só no header", async () => {
    await sendMarketingEmail({ to: TO, subject: "Seus favoritos", bodyHtml: "<p>oi</p>" })

    const { html } = mockSend.mock.calls[0][0]
    expect(html).toContain("/api/engagement/unsubscribe")
    expect(html).toContain("Cancelar estes avisos")
  })

  it("envolve o corpo no layout do produto", async () => {
    await sendMarketingEmail({ to: TO, subject: "Seus favoritos", bodyHtml: "<p>meu conteudo</p>" })

    const { html } = mockSend.mock.calls[0][0]
    expect(html).toContain("<p>meu conteudo</p>")
    expect(html).toContain("Use Mais. Possua Menos.") // slogan do baseLayout
    expect(html).toContain("<!DOCTYPE html>")
  })

  it("deixa claro que os avisos de reserva continuam", async () => {
    await sendMarketingEmail({ to: TO, subject: "Seus favoritos", bodyHtml: "<p>oi</p>" })

    const { html } = mockSend.mock.calls[0][0]
    expect(html).toContain("Avisos sobre suas reservas continuam chegando")
  })
})

describe("sendAppEmail — o caminho transacional", () => {
  it("NÃO oferece descadastro", async () => {
    await sendAppEmail({ to: TO, subject: "Redefinir sua senha", html: "<p>link</p>" })

    const payload = mockSend.mock.calls[0][0]
    expect(payload.headers).toBeUndefined()
    expect(payload.html).not.toContain("unsubscribe")
  })
})

describe("sendMarketingEmail — segunda porta do descadastro", () => {
  it("não envia para quem se descadastrou, mesmo chamada direto", async () => {
    // O cron já filtra pelo claim. Esta guarda é para o próximo chamador, que
    // vai importar a função pelo nome "marketing" sem saber que a garantia
    // principal mora em lib/engagement-email.ts.
    mockOptOut.mockResolvedValue({ id: "user-1" })

    const { error } = await sendMarketingEmail({ to: TO, subject: "Campanha", bodyHtml: "<p>oi</p>" })

    expect(mockSend).not.toHaveBeenCalled()
    expect(error).toBeNull() // pular não é falha
  })

  it("casa o e-mail sem depender da caixa", async () => {
    await sendMarketingEmail({ to: TO, subject: "Campanha", bodyHtml: "<p>oi</p>" })

    const { where } = mockOptOut.mock.calls[0][0]
    expect(where.email).toEqual({ equals: TO, mode: "insensitive" })
  })
})
