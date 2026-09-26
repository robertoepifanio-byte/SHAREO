/** @jest-environment node */
/**
 * withUser (com select) — rejeita conta com deletedAt preenchido.
 *
 * Regressão: isSessionStale é fail-open (Redis indisponível → false). Se
 * `withUser` não checar `deletedAt` na query que JÁ faz ao banco, um usuário
 * excluído com Redis fora de serviço consegue agir com o token anterior.
 * Zero queries extras: o filtro `deletedAt: null` é adicionado ao `findUnique`
 * que `withUser` já executaria.
 */
import { NextRequest } from "next/server"

const mockResolveUserId = jest.fn()
const mockFindUnique    = jest.fn()

jest.mock("@/lib/resolveUserId", () => ({
  resolveUserId: (...a: unknown[]) => mockResolveUserId(...a),
}))
jest.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: (...a: unknown[]) => mockFindUnique(...a) } },
}))

import { withUser } from "@/lib/withUser"

const req = () => new NextRequest("http://localhost/api/test", { method: "GET" })

beforeEach(() => jest.clearAllMocks())

describe("withUser com select — proteção contra conta excluída (Redis fail-open)", () => {
  it("🪤 conta com deletedAt preenchido retorna 401 (não o objeto do usuário)", async () => {
    mockResolveUserId.mockResolvedValue("cuser-deletado")
    // Simula Redis fora: isSessionStale retornou false → resolveUserId devolveu o id
    // O banco retorna null porque a query inclui deletedAt: null
    mockFindUnique.mockResolvedValue(null)

    const result = await withUser(req(), { select: { name: true } })

    expect("status" in result && result.status).toBe(401)
  })

  it("🪤 a query ao banco inclui deletedAt: null (zero queries extras — só um filtro a mais)", async () => {
    mockResolveUserId.mockResolvedValue("cuser-normal")
    mockFindUnique.mockResolvedValue({ id: "cuser-normal", name: "Normal" })

    await withUser(req(), { select: { name: true } })

    // mock.calls[0] = arg list of first call; [0] = first arg = the options object
    const callArg = (mockFindUnique.mock.calls[0] as [{ where: { id: string; deletedAt: null } }])[0]
    expect(callArg.where).toMatchObject({ id: "cuser-normal", deletedAt: null })
  })

  it("sem select: também consulta o banco com deletedAt: null (SEC-CRIT-04c)", async () => {
    mockResolveUserId.mockResolvedValue("cuser-qualquer")
    mockFindUnique.mockResolvedValue({ id: "cuser-qualquer" })

    const result = await withUser(req())

    expect(mockFindUnique).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ id: "cuser-qualquer" })
  })

  it("conta ativa (deletedAt = null no banco): withUser devolve o usuário normalmente", async () => {
    mockResolveUserId.mockResolvedValue("cuser-ativo")
    mockFindUnique.mockResolvedValue({ id: "cuser-ativo", name: "Ativo" })

    const result = await withUser(req(), { select: { name: true } })

    // Não é uma NextResponse — é o objeto do usuário
    expect("id" in result && result.id).toBe("cuser-ativo")
  })
})
