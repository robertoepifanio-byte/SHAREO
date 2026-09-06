/** @jest-environment node */
/**
 * Protocolo das duas rotas de descadastro.
 *
 * Existe porque o esqueleto (GET humano / POST one-click / idempotência / não
 * vazar existência de conta) foi extraído para `lib/unsubscribe-route.ts` e
 * passou a ser compartilhado — e a rota de Fundadores, que está em produção
 * desde 01/09/2026, nunca teve teste nenhum. Refatorar código vivo sem rede é
 * como o bug de reenvio nasceu.
 *
 * O caso que dá nome ao arquivo é `descadastro que mente`: com match exato de
 * e-mail, quem se cadastrou como `Roberto@Gmail.com` recebia a página "pronto,
 * descadastrado" enquanto o UPDATE casava zero linhas. A página dizia sim e os
 * e-mails continuavam chegando.
 */

process.env.AUTH_SECRET = "segredo-de-teste-nao-usar-em-producao"

import { NextRequest } from "next/server"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user:            { updateMany: jest.fn() },
    founderLead:     { findUnique: jest.fn(), update: jest.fn() },
    founderAuditLog: { create: jest.fn() },
  },
}))

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }))

import { prisma } from "@/lib/prisma"
import { engagementUnsubscribe } from "@/lib/engagement-unsubscribe"
import { foundersUnsubscribe } from "@/lib/founders-unsubscribe"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const engagement = require("@/app/api/engagement/unsubscribe/route") as {
  GET: (r: NextRequest) => Promise<Response>
  POST: (r: NextRequest) => Promise<Response>
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const founders = require("@/app/api/founders/unsubscribe/route") as {
  GET: (r: NextRequest) => Promise<Response>
  POST: (r: NextRequest) => Promise<Response>
}

const EMAIL = "roberto@example.com"

const mockUpdateMany = prisma.user.updateMany as jest.Mock
const mockLeadFind   = prisma.founderLead.findUnique as jest.Mock

function req(base: string, email: string, token: string) {
  return new NextRequest(
    `https://shareo.com.br${base}?email=${encodeURIComponent(email)}&token=${token}`,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUpdateMany.mockResolvedValue({ count: 1 })
  mockLeadFind.mockResolvedValue({ id: "lead-1", status: "PENDING" })
})

describe("descadastro de reengajamento", () => {
  const path = "/api/engagement/unsubscribe"

  it("aplica o descadastro com token válido", async () => {
    const res = await engagement.GET(req(path, EMAIL, engagementUnsubscribe.token(EMAIL)))

    expect(res.status).toBe(200)
    expect(mockUpdateMany).toHaveBeenCalledTimes(1)
  })

  it("casa o e-mail sem depender da caixa — senão o descadastro mente", async () => {
    await engagement.GET(req(path, EMAIL, engagementUnsubscribe.token(EMAIL)))

    // O cadastro grava o e-mail verbatim; o token é assinado sobre a forma
    // minúscula. Sem `insensitive`, `Roberto@Gmail.com` nunca seria encontrado
    // e a página responderia sucesso do mesmo jeito.
    const { where } = mockUpdateMany.mock.calls[0][0]
    expect(where.email).toEqual({ equals: EMAIL, mode: "insensitive" })
  })

  it("recusa token de outro e-mail sem tocar no banco", async () => {
    const res = await engagement.GET(req(path, EMAIL, engagementUnsubscribe.token("outro@x.com")))

    expect(res.status).toBe(400)
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it("não vale o token da outra lista", async () => {
    const res = await engagement.GET(req(path, EMAIL, foundersUnsubscribe.token(EMAIL)))

    expect(res.status).toBe(400)
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it("POST one-click responde 204 sem corpo (RFC 8058)", async () => {
    const res = await engagement.POST(req(path, EMAIL, engagementUnsubscribe.token(EMAIL)))

    expect(res.status).toBe(204)
    expect(await res.text()).toBe("")
  })

  it("promete na página que os avisos de reserva continuam", async () => {
    const res = await engagement.GET(req(path, EMAIL, engagementUnsubscribe.token(EMAIL)))

    expect(await res.text()).toContain("Avisos sobre suas reservas continuam chegando")
  })
})

describe("descadastro da campanha de Fundadores", () => {
  const path = "/api/founders/unsubscribe"

  it("marca o lead como UNSUBSCRIBED", async () => {
    const res = await founders.GET(req(path, EMAIL, foundersUnsubscribe.token(EMAIL)))

    expect(res.status).toBe(200)
    expect(prisma.founderLead.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "UNSUBSCRIBED" } }),
    )
  })

  it("é idempotente — quem já saiu recebe sucesso, não erro", async () => {
    mockLeadFind.mockResolvedValue({ id: "lead-1", status: "UNSUBSCRIBED" })

    const res = await founders.GET(req(path, EMAIL, foundersUnsubscribe.token(EMAIL)))

    expect(res.status).toBe(200)
    expect(prisma.founderLead.update).not.toHaveBeenCalled()
  })

  it("não revela se o e-mail está na base", async () => {
    mockLeadFind.mockResolvedValue(null)

    const res = await founders.GET(req(path, EMAIL, foundersUnsubscribe.token(EMAIL)))
    const existente = await founders.GET(req(path, EMAIL, foundersUnsubscribe.token(EMAIL)))

    expect(res.status).toBe(existente.status)
  })

  it("token inválido responde 400 sem consultar o lead", async () => {
    const res = await founders.GET(req(path, EMAIL, "token-forjado"))

    expect(res.status).toBe(400)
    expect(mockLeadFind).not.toHaveBeenCalled()
  })
})
