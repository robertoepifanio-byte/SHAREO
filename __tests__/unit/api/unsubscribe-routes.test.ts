/** @jest-environment node */
/**
 * Protocolo das duas rotas de descadastro.
 *
 * Existe porque o esqueleto (GET confirma / POST aplica / one-click RFC 8058 /
 * idempotência / não vazar existência de conta) foi extraído para
 * `lib/unsubscribe-route.ts` e passou a ser compartilhado — e a rota de
 * Fundadores, em produção desde 01/09/2026, nunca teve teste nenhum.
 * Refatorar código vivo sem rede é como o bug de reenvio nasceu.
 *
 * Dois casos dão nome ao arquivo:
 *
 * `GET não altera estado` — a URL de descadastro vai no corpo do e-mail E no
 * header `List-Unsubscribe`. Scanners que abrem links automaticamente
 * (Defender SafeLinks, antivírus corporativo, prefetch) descadastrariam a
 * pessoa sem ela clicar em nada, e ela pararia de receber sem saber por quê.
 *
 * `descadastro que mente` — com match exato de e-mail, quem se cadastrou como
 * `Roberto@Gmail.com` recebia a página "pronto, descadastrado" enquanto o
 * UPDATE casava zero linhas. A página dizia sim e os e-mails continuavam.
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

const url = (base: string, email: string, token: string) =>
  `https://shareo.com.br${base}?email=${encodeURIComponent(email)}&token=${token}`

const get = (base: string, email: string, token: string) =>
  new NextRequest(url(base, email, token))

/** POST do formulário humano: sem o corpo da RFC 8058. */
const submit = (base: string, email: string, token: string) =>
  new NextRequest(url(base, email, token), { method: "POST", body: "" })

/** POST automático do provedor de e-mail (RFC 8058). */
const oneClick = (base: string, email: string, token: string) =>
  new NextRequest(url(base, email, token), {
    method: "POST",
    body:   "List-Unsubscribe=One-Click",
  })

beforeEach(() => {
  jest.clearAllMocks()
  mockUpdateMany.mockResolvedValue({ count: 1 })
  mockLeadFind.mockResolvedValue({ id: "lead-1", status: "PENDING" })
})

describe("descadastro de reengajamento", () => {
  const path = "/api/engagement/unsubscribe"
  const token = () => engagementUnsubscribe.token(EMAIL)

  it("GET só pergunta — não descadastra ninguém", async () => {
    const res = await engagement.GET(get(path, EMAIL, token()))

    expect(res.status).toBe(200)
    // Este `not` é o teste inteiro: um scanner que abre o link não pode
    // desligar os e-mails de quem nunca clicou.
    expect(mockUpdateMany).not.toHaveBeenCalled()

    const html = await res.text()
    expect(html).toContain('method="post"')
    expect(html).toContain("Sim, desligar")
  })

  it("POST do formulário aplica e responde uma página", async () => {
    const res = await engagement.POST(submit(path, EMAIL, token()))

    expect(res.status).toBe(200)
    expect(mockUpdateMany).toHaveBeenCalledTimes(1)
    expect(await res.text()).toContain("Avisos sobre suas reservas continuam chegando")
  })

  it("POST one-click do provedor aplica e responde 204 sem corpo (RFC 8058)", async () => {
    const res = await engagement.POST(oneClick(path, EMAIL, token()))

    expect(res.status).toBe(204)
    expect(await res.text()).toBe("")
    expect(mockUpdateMany).toHaveBeenCalledTimes(1)
  })

  it("casa o e-mail sem depender da caixa — senão o descadastro mente", async () => {
    await engagement.POST(submit(path, EMAIL, token()))

    // O cadastro grava o e-mail verbatim; o token é assinado sobre a forma
    // minúscula. Sem `insensitive`, `Roberto@Gmail.com` nunca seria encontrado
    // e a página responderia sucesso do mesmo jeito.
    const { where } = mockUpdateMany.mock.calls[0][0]
    expect(where.email).toEqual({ equals: EMAIL, mode: "insensitive" })
  })

  it("recusa token de outro e-mail sem tocar no banco", async () => {
    const res = await engagement.POST(submit(path, EMAIL, engagementUnsubscribe.token("outro@x.com")))

    expect(res.status).toBe(400)
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it("não vale o token da outra lista", async () => {
    const res = await engagement.POST(submit(path, EMAIL, foundersUnsubscribe.token(EMAIL)))

    expect(res.status).toBe(400)
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })
})

describe("descadastro da campanha de Fundadores", () => {
  const path = "/api/founders/unsubscribe"
  const token = () => foundersUnsubscribe.token(EMAIL)

  it("GET só pergunta — não mexe no lead", async () => {
    const res = await founders.GET(get(path, EMAIL, token()))

    expect(res.status).toBe(200)
    expect(prisma.founderLead.update).not.toHaveBeenCalled()
    expect(await res.text()).toContain("Sim, sair da lista")
  })

  it("POST marca o lead como UNSUBSCRIBED", async () => {
    const res = await founders.POST(submit(path, EMAIL, token()))

    expect(res.status).toBe(200)
    expect(prisma.founderLead.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "UNSUBSCRIBED" } }),
    )
  })

  it("é idempotente — quem já saiu recebe sucesso, não erro", async () => {
    mockLeadFind.mockResolvedValue({ id: "lead-1", status: "UNSUBSCRIBED" })

    const res = await founders.POST(submit(path, EMAIL, token()))

    expect(res.status).toBe(200)
    expect(prisma.founderLead.update).not.toHaveBeenCalled()
  })

  it("não revela se o e-mail está na base", async () => {
    mockLeadFind.mockResolvedValue(null)
    const ausente = await founders.POST(submit(path, EMAIL, token()))

    mockLeadFind.mockResolvedValue({ id: "lead-1", status: "PENDING" })
    const presente = await founders.POST(submit(path, EMAIL, token()))

    expect(ausente.status).toBe(presente.status)
    expect(await ausente.text()).toBe(await presente.text())
  })

  it("falha do banco no clique humano responde uma PÁGINA, não corpo vazio", async () => {
    // O momento exato da revogação (LGPD art. 18) é o pior lugar para uma tela
    // branca: a pessoa não sabe se saiu, e a alternativa dela é marcar como
    // spam — no mesmo remetente que manda reset de senha.
    mockLeadFind.mockRejectedValue(new Error("banco fora"))

    const res  = await founders.POST(submit(path, EMAIL, token()))
    const html = await res.text()

    expect(res.status).toBe(500)
    expect(html).toContain("Tente novamente")
  })

  it("a mesma falha responde corpo vazio para o one-click da máquina", async () => {
    mockLeadFind.mockRejectedValue(new Error("banco fora"))

    const res = await founders.POST(oneClick(path, EMAIL, token()))

    expect(res.status).toBe(500)
    expect(await res.text()).toBe("")
  })

  it("token inválido responde 400 sem consultar o lead", async () => {
    const res = await founders.POST(submit(path, EMAIL, "token-forjado"))

    expect(res.status).toBe(400)
    expect(mockLeadFind).not.toHaveBeenCalled()
  })
})
