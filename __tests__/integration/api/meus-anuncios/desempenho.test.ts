/** @jest-environment node */
/**
 * Testes de integração para GET /api/meus-anuncios/desempenho
 *
 * Arquivo fonte: app/api/meus-anuncios/desempenho/route.ts
 *
 * Segurança crítica verificada:
 *   1. Isolamento de dados: owner só vê SEUS itens — `ownerId: userId` obrigatório.
 *      Vazar métricas de outro anunciante seria equivalente ao achado grave do
 *      painel-dois-atores 2026-08-22 (endereço vazado por filtro fraco).
 *   2. Gate PJ: PF recebe 403 com code PJ_REQUIRED — nunca expõe analytics.
 *   3. Unauthenticated: 401 UNAUTHENTICATED.
 */

import { NextRequest } from "next/server"
import { GET } from "@/app/api/meus-anuncios/desempenho/route"

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockResolveUserId = jest.fn<Promise<string | null>, []>()
jest.mock("@/lib/resolveUserId", () => ({
  resolveUserId: (...args: unknown[]) => mockResolveUserId(...args as []),
}))

const mockUserFindUnique = jest.fn()
const mockItemFindMany   = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => mockUserFindUnique(...a) },
    item: { findMany:   (...a: unknown[]) => mockItemFindMany(...a)   },
  },
}))

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(): NextRequest {
  return new NextRequest("http://localhost:3000/api/meus-anuncios/desempenho")
}

function makeItem(overrides: Partial<{
  id:        string
  ownerId:   string
  viewCount: number
  status:    string
  bookings:  { totalPrice: number }[]
  reviews:   { rating: number }[]
  _count:    { favorites: number }
}> = {}) {
  return {
    id:        overrides.id        ?? "item-001",
    title:     "Furadeira Bosch 500W",
    status:    overrides.status    ?? "AVAILABLE",
    viewCount: overrides.viewCount ?? 100,
    images:    [{ url: "https://storage.example.com/foto.jpg" }],
    _count:    overrides._count    ?? { favorites: 5 },
    bookings:  overrides.bookings  ?? [{ totalPrice: 5000 }, { totalPrice: 3000 }],
    reviews:   overrides.reviews   ?? [{ rating: 5 }, { rating: 4 }],
  }
}

// ── Testes ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
})

describe("GET /api/meus-anuncios/desempenho", () => {
  // ── Auth ──────────────────────────────────────────────────────────────────────
  it("retorna 401 quando não autenticado", async () => {
    mockResolveUserId.mockResolvedValue(null)

    const res = await GET(makeReq())

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe("UNAUTHENTICATED")
  })

  // ── Gate PJ ───────────────────────────────────────────────────────────────────
  it("retorna 403 com PJ_REQUIRED para usuário PF", async () => {
    mockResolveUserId.mockResolvedValue("user-pf-1")
    mockUserFindUnique.mockResolvedValue({ userType: "PF" })

    const res = await GET(makeReq())

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe("PJ_REQUIRED")
  })

  it("retorna 404 quando usuário não existe no banco", async () => {
    mockResolveUserId.mockResolvedValue("user-ghost")
    mockUserFindUnique.mockResolvedValue(null)

    const res = await GET(makeReq())

    expect(res.status).toBe(404)
  })

  // ── Isolamento de dados ───────────────────────────────────────────────────────
  it("SEC: query Prisma filtra SEMPRE por ownerId = userId (isolamento)", async () => {
    const userId = "user-pj-1"
    mockResolveUserId.mockResolvedValue(userId)
    mockUserFindUnique.mockResolvedValue({ userType: "PJ" })
    mockItemFindMany.mockResolvedValue([makeItem()])

    await GET(makeReq())

    // Verificar que o where inclui ownerId e deletedAt: null obrigatoriamente
    expect(mockItemFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerId: userId, deletedAt: null },
      }),
    )
  })

  it("SEC: outro usuário autenticado não acessa dados alheios (userId diferente)", async () => {
    const ownerUserId    = "user-pj-1"
    const intruderUserId = "user-pj-2"

    // Simula intruder autenticado como PJ
    mockResolveUserId.mockResolvedValue(intruderUserId)
    mockUserFindUnique.mockResolvedValue({ userType: "PJ" })
    mockItemFindMany.mockResolvedValue([]) // banco retorna vazio para intruder

    const res = await GET(makeReq())
    expect(res.status).toBe(200)

    const body = await res.json()
    // Intruder recebe lista vazia — não vê itens do owner
    expect(body.data.items).toHaveLength(0)

    // E confirma que a query usou o userId do intruder, não do owner
    expect(mockItemFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerId: intruderUserId, deletedAt: null },
      }),
    )
    expect(mockItemFindMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerId: ownerUserId, deletedAt: null },
      }),
    )
  })

  // ── Resposta correta para PJ com itens ────────────────────────────────────────
  it("retorna 200 com totais e lista de itens para PJ", async () => {
    mockResolveUserId.mockResolvedValue("user-pj-1")
    mockUserFindUnique.mockResolvedValue({ userType: "PJ" })
    mockItemFindMany.mockResolvedValue([
      makeItem({
        id:        "item-001",
        viewCount: 150,
        bookings:  [{ totalPrice: 5000 }, { totalPrice: 3000 }],
        reviews:   [{ rating: 5 }, { rating: 4 }],
        _count:    { favorites: 7 },
      }),
      makeItem({
        id:        "item-002",
        viewCount: 50,
        bookings:  [],
        reviews:   [],
        _count:    { favorites: 2 },
      }),
    ])

    const res = await GET(makeReq())
    expect(res.status).toBe(200)

    const body = await res.json()
    const { totals, items } = body.data

    // Totais agregados corretamente
    expect(totals.views).toBe(200)        // 150 + 50
    expect(totals.bookings).toBe(2)       // 2 + 0
    expect(totals.revenue).toBe(8000)     // 5000 + 3000
    expect(totals.avgRating).toBeCloseTo(4.5) // (5+4)/2
    expect(totals.ratingsCount).toBe(2)

    // Itens retornados
    expect(items).toHaveLength(2)
    expect(items[0].id).toBe("item-001")
    expect(items[0].viewCount).toBe(150)
    expect(items[0].revenue).toBe(8000)
    expect(items[0].bookingsCount).toBe(2)
    expect(items[0].favoritesCount).toBe(7)
    expect(items[0].avgRating).toBeCloseTo(4.5)

    // Item sem reservas/avaliações
    expect(items[1].revenue).toBe(0)
    expect(items[1].avgRating).toBeNull()
  })

  // ── Empty state ───────────────────────────────────────────────────────────────
  it("retorna totais zerados e lista vazia quando PJ não tem itens", async () => {
    mockResolveUserId.mockResolvedValue("user-pj-sem-itens")
    mockUserFindUnique.mockResolvedValue({ userType: "PJ" })
    mockItemFindMany.mockResolvedValue([])

    const res = await GET(makeReq())
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data.items).toHaveLength(0)
    expect(body.data.totals.views).toBe(0)
    expect(body.data.totals.revenue).toBe(0)
    expect(body.data.totals.avgRating).toBeNull()
  })

  // ── Select seguro — sem over-fetch ────────────────────────────────────────────
  it("select Prisma não inclui campos sensíveis (email, cpf, address)", async () => {
    mockResolveUserId.mockResolvedValue("user-pj-1")
    mockUserFindUnique.mockResolvedValue({ userType: "PJ" })
    mockItemFindMany.mockResolvedValue([])

    await GET(makeReq())

    const callArgs = mockItemFindMany.mock.calls[0][0] as { select: Record<string, unknown> }
    // Confirma que select não traz campos sensíveis do owner
    expect(callArgs.select).not.toHaveProperty("owner")
    expect(callArgs.select).not.toHaveProperty("ownerId")
    // Confirma que bookings traz só totalPrice (nada de dados pessoais do locatário)
    expect(callArgs.select.bookings).toEqual(
      expect.objectContaining({
        select: { totalPrice: true },
      }),
    )
  })
})
