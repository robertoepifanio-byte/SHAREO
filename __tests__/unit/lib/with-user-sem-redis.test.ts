/** @jest-environment node */
/**
 * withUser (lib/withUser.ts) — rejeição de conta excluída/inativa sem Redis.
 *
 * Contexto:
 *   Antes desta correção, withUser() sem `select` retornava { id: userId }
 *   sem qualquer consulta ao banco. isSessionStale (Redis) é fail-open: se o
 *   Upstash falha, tokens Bearer de contas excluídas chegavam aqui com userId
 *   válido e o handler operava em nome de uma conta deletada.
 *   Handlers afetados: checkout, dispute, extend, notifications, referral…
 *
 * Correção (SEC-CRIT-04c — withUser):
 *   Todos os caminhos de withUser (com ou sem select) consultam o banco com
 *   where: { deletedAt: null, isActive: true }. Uma única query cobre os dois
 *   casos sem overhead extra.
 *
 * Cada teste abaixo FALHA se o guard `if (!opts?.select) return { id: userId }`
 * for restaurado (path sem select sem checagem de banco).
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockFindUnique = jest.fn()
jest.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: (...a: unknown[]) => mockFindUnique(...a) } },
}))

const mockResolveUserId = jest.fn()
jest.mock("@/lib/resolveUserId", () => ({
  resolveUserId: (...a: unknown[]) => mockResolveUserId(...a),
}))

// next/server mocks mínimos
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ _body: body, status: init?.status ?? 200 }),
  },
}))

import { withUser } from "@/lib/withUser"

// Cria um NextRequest fake — withUser só usa resolveUserId (mockado), então
// o objeto em si não precisa de métodos reais.
const fakeReq = {} as Parameters<typeof withUser>[0]

beforeEach(() => jest.clearAllMocks())

// ─── Sem select — o caminho que antes ignorava o banco ────────────────────────

describe("withUser() sem select — conta excluída/inativa é rejeitada mesmo sem Redis", () => {
  it("🪤 Redis fora + conta com deletedAt preenchido → 401 (handler não recebe userId)", async () => {
    mockResolveUserId.mockResolvedValue("cuser-abc")
    // Redis ausente: isSessionStale não é chamado. O banco é a única barreira.
    mockFindUnique.mockResolvedValue(null) // deletedAt ≠ null → query retorna null

    const result = await withUser(fakeReq)

    expect(mockFindUnique).toHaveBeenCalledTimes(1)
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "cuser-abc", deletedAt: null, isActive: true }),
      }),
    )
    // NextResponse.json(..., { status: 401 })
    expect((result as { status: number }).status).toBe(401)
  })

  it("🪤 Redis com erro + conta com isActive=false → 401", async () => {
    mockResolveUserId.mockResolvedValue("cuser-xyz")
    mockFindUnique.mockResolvedValue(null) // isActive: false → filtrado pelo where

    const result = await withUser(fakeReq)

    expect((result as { status: number }).status).toBe(401)
  })

  it("🪤 Redis fora + usuário não encontrado no banco → 401", async () => {
    mockResolveUserId.mockResolvedValue("cuser-ghost")
    mockFindUnique.mockResolvedValue(null)

    const result = await withUser(fakeReq)

    expect((result as { status: number }).status).toBe(401)
  })

  it("conta ativa → retorna { id } e consulta o banco", async () => {
    mockResolveUserId.mockResolvedValue("cuser-ok")
    mockFindUnique.mockResolvedValue({ id: "cuser-ok" })

    const result = await withUser(fakeReq)

    expect(mockFindUnique).toHaveBeenCalledTimes(1)
    expect((result as { id: string }).id).toBe("cuser-ok")
  })
})

// ─── Com select — comportamento existente mantido ─────────────────────────────

describe("withUser({ select }) — comportamento preservado após a correção", () => {
  it("conta excluída → 401 (comportamento anterior mantido)", async () => {
    mockResolveUserId.mockResolvedValue("cuser-del")
    mockFindUnique.mockResolvedValue(null)

    const result = await withUser(fakeReq, { select: { name: true } })

    expect((result as { status: number }).status).toBe(401)
  })

  it("conta ativa com select → retorna campos solicitados", async () => {
    mockResolveUserId.mockResolvedValue("cuser-sel")
    mockFindUnique.mockResolvedValue({ id: "cuser-sel", name: "Fulano" })

    const result = await withUser(fakeReq, { select: { name: true } })

    expect((result as { id: string; name: string }).name).toBe("Fulano")
  })

  it("uma única query serve ambos os casos (sem select e com select)", async () => {
    mockResolveUserId.mockResolvedValue("cuser-q")
    mockFindUnique.mockResolvedValue({ id: "cuser-q" })

    await withUser(fakeReq)
    expect(mockFindUnique).toHaveBeenCalledTimes(1)

    jest.clearAllMocks()
    mockResolveUserId.mockResolvedValue("cuser-q")
    mockFindUnique.mockResolvedValue({ id: "cuser-q", name: "X" })

    await withUser(fakeReq, { select: { name: true } })
    expect(mockFindUnique).toHaveBeenCalledTimes(1)
  })
})

// ─── resolveUserId retorna null ───────────────────────────────────────────────

describe("withUser — resolveUserId retorna null → 401 sem query ao banco", () => {
  it("sem autenticação → 401, sem consulta ao banco", async () => {
    mockResolveUserId.mockResolvedValue(null)

    const result = await withUser(fakeReq)

    expect(mockFindUnique).not.toHaveBeenCalled()
    expect((result as { status: number }).status).toBe(401)
  })
})
