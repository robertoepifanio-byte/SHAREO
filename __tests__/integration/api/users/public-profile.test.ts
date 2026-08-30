/** @jest-environment node */
/**
 * Testes de integração — GET /api/users/[id]/public
 *
 * Arquivo fonte: app/api/users/[id]/public/route.ts
 *
 * Cobre:
 *   1. Usuário existe → 200 com data
 *   2. Usuário não encontrado → 404
 *   3. Campos sensíveis NÃO vazam na resposta
 *      (email, phone, cpf, passwordHash, street, cep, latitude, longitude,
 *       role, adminRole, idDocumentUrl)
 *
 * Referência de segurança: painel-dois-atores 22/08 — o endpoint de reserva
 * entregava o endereço de casa do locador por excesso de select. O teste 3
 * é a garantia de que esse padrão não se repete aqui.
 */

import { NextRequest } from "next/server"
import { GET }         from "@/app/api/users/[id]/public/route"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUserFindFirst = jest.fn()
const mockReviewAggregate = jest.fn()
const mockReviewFindFirst = jest.fn()
const mockBookingFindMany = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => mockUserFindFirst(...args),
    },
    review: {
      aggregate:  (...args: unknown[]) => mockReviewAggregate(...args),
      findFirst:  (...args: unknown[]) => mockReviewFindFirst(...args),
    },
    booking: {
      findMany: (...args: unknown[]) => mockBookingFindMany(...args),
    },
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq(id: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/users/${id}/public`)
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

/** Usuário público mínimo que o Prisma retornaria (sem campos sensíveis). */
function makePublicUser(overrides: Partial<ReturnType<typeof _makeFullUser>> = {}) {
  return { ..._makeFullUser(), ...overrides }
}

function _makeFullUser() {
  return {
    id:               "user-pub-001",
    name:             "Maria Oliveira",
    bio:              "Aluguel de ferramentas para fins de semana.",
    city:             "São Paulo",
    state:            "SP",
    neighborhood:     "Vila Madalena",
    avatarUrl:        null,
    userType:         "PF" as const,
    isVerified:       true,
    createdAt:        new Date("2026-01-15T00:00:00Z"),
    reputationPoints: 30,
    _count: {
      items:              3,
      bookingsAsOwner:    5,
      bookingsAsBorrower: 2,
    },
    items: [
      {
        id:          "item-001",
        title:       "Furadeira Bosch 500W",
        pricePerDay: 5000,
        city:        "São Paulo",
        state:       "SP",
        neighborhood: "Vila Madalena",
        category: { name: "Ferramentas", slug: "ferramentas" },
        owner:    { name: "Maria Oliveira", isVerified: true },
        images:   [{ url: "https://storage.exemplo.com/foto.jpg" }],
        _count:   { reviews: 3, favorites: 1 },
      },
    ],
    reviewsReceived: [
      {
        rating:          5,
        comment:         "Ótima proprietária, item em perfeito estado!",
        reviewType:      "OWNER",
        sentiment:       "POSITIVE",
        itemAsDescribed: true,
        punctuality:     true,
        communication:   true,
        conservation:    null,
        photoUrl:        null,
        createdAt:       new Date("2026-08-10T00:00:00Z"),
        reviewer:        { name: "João Silva" },
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()
  // Defaults: sem badge de resposta (< 3 reservas respondidas)
  mockBookingFindMany.mockResolvedValue([])
  mockReviewFindFirst.mockResolvedValue(null)
  mockReviewAggregate.mockResolvedValue({
    _avg:   { rating: 4.8 },
    _count: { _all: 1 },
  })
})

// ---------------------------------------------------------------------------
// 1. Usuário existe → 200 com data
// ---------------------------------------------------------------------------

describe("GET /api/users/[id]/public — usuário existe", () => {
  it("retorna 200 com os dados públicos do perfil", async () => {
    mockUserFindFirst.mockResolvedValue(makePublicUser())

    const res  = await GET(makeReq("user-pub-001"), makeParams("user-pub-001"))
    const body = await res.json() as { data: Record<string, unknown> }

    expect(res.status).toBe(200)
    expect(body.data.id).toBe("user-pub-001")
    expect(body.data.name).toBe("Maria Oliveira")
    expect(body.data.isVerified).toBe(true)
  })

  it("inclui estatísticas calculadas (itemCount, totalDeals, avgRating, reviewCount)", async () => {
    mockUserFindFirst.mockResolvedValue(makePublicUser())

    const res  = await GET(makeReq("user-pub-001"), makeParams("user-pub-001"))
    const body = await res.json() as { data: Record<string, unknown> }

    expect(body.data.itemCount).toBe(3)
    expect(body.data.totalDeals).toBe(7)    // 5 owner + 2 borrower
    expect(body.data.avgRating).toBeCloseTo(4.8)
    expect(body.data.reviewCount).toBe(1)
  })

  it("inclui items e reviewsReceived", async () => {
    mockUserFindFirst.mockResolvedValue(makePublicUser())

    const res  = await GET(makeReq("user-pub-001"), makeParams("user-pub-001"))
    const body = await res.json() as { data: { items: unknown[]; reviewsReceived: unknown[] } }

    expect(body.data.items).toHaveLength(1)
    expect(body.data.reviewsReceived).toHaveLength(1)
  })

  it("responseBadge é null quando proprietário tem menos de 3 respostas nos últimos 90 dias", async () => {
    mockUserFindFirst.mockResolvedValue(makePublicUser())
    mockBookingFindMany.mockResolvedValue([])   // < 3 → null

    const res  = await GET(makeReq("user-pub-001"), makeParams("user-pub-001"))
    const body = await res.json() as { data: Record<string, unknown> }

    expect(body.data.responseBadge).toBeNull()
  })

  it("responseBadge está presente quando proprietário tem >= 3 respostas nos últimos 90 dias", async () => {
    mockUserFindFirst.mockResolvedValue(makePublicUser())
    // Simula 3 reservas respondidas em ~1h cada
    const now    = Date.now()
    const oneHr  = 60 * 60 * 1000
    mockBookingFindMany.mockResolvedValue([
      { createdAt: new Date(now - 10 * oneHr), respondedAt: new Date(now - 9 * oneHr) },
      { createdAt: new Date(now - 12 * oneHr), respondedAt: new Date(now - 11 * oneHr) },
      { createdAt: new Date(now - 14 * oneHr), respondedAt: new Date(now - 13 * oneHr) },
    ])

    const res  = await GET(makeReq("user-pub-001"), makeParams("user-pub-001"))
    const body = await res.json() as { data: { responseBadge: { label: string } | null } }

    expect(body.data.responseBadge).not.toBeNull()
    expect(body.data.responseBadge?.label).toMatch(/Responde em/)
  })
})

// ---------------------------------------------------------------------------
// 2. Usuário não encontrado → 404
// ---------------------------------------------------------------------------

describe("GET /api/users/[id]/public — usuário não encontrado", () => {
  it("retorna 404 quando id não existe no banco", async () => {
    mockUserFindFirst.mockResolvedValue(null)

    const res  = await GET(makeReq("id-inexistente"), makeParams("id-inexistente"))
    const body = await res.json() as { error: { code: string } }

    expect(res.status).toBe(404)
    expect(body.error.code).toBe("NOT_FOUND")
  })

  it("retorna 404 quando usuário está deletado (deletedAt != null no where)", async () => {
    // Prisma retorna null porque o where inclui deletedAt: null
    mockUserFindFirst.mockResolvedValue(null)

    const res = await GET(makeReq("user-deletado"), makeParams("user-deletado"))

    expect(res.status).toBe(404)
    // Confirma que a query inclui a condição de soft-delete
    expect(mockUserFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      })
    )
  })

  it("retorna 404 quando usuário está inativo (isActive: true no where)", async () => {
    mockUserFindFirst.mockResolvedValue(null)

    const res = await GET(makeReq("user-inativo"), makeParams("user-inativo"))

    expect(res.status).toBe(404)
    expect(mockUserFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      })
    )
  })
})

// ---------------------------------------------------------------------------
// 3. Campos sensíveis NÃO vazam na resposta
// ---------------------------------------------------------------------------

describe("GET /api/users/[id]/public — campos sensíveis não vazam", () => {
  it("o select do Prisma NÃO inclui email", async () => {
    mockUserFindFirst.mockResolvedValue(makePublicUser())

    await GET(makeReq("user-pub-001"), makeParams("user-pub-001"))

    const callArg = mockUserFindFirst.mock.calls[0]?.[0] as { select: Record<string, unknown> }
    expect(callArg.select).not.toHaveProperty("email")
  })

  it("o select do Prisma NÃO inclui phone", async () => {
    mockUserFindFirst.mockResolvedValue(makePublicUser())

    await GET(makeReq("user-pub-001"), makeParams("user-pub-001"))

    const callArg = mockUserFindFirst.mock.calls[0]?.[0] as { select: Record<string, unknown> }
    expect(callArg.select).not.toHaveProperty("phone")
  })

  it("o select do Prisma NÃO inclui passwordHash", async () => {
    mockUserFindFirst.mockResolvedValue(makePublicUser())

    await GET(makeReq("user-pub-001"), makeParams("user-pub-001"))

    const callArg = mockUserFindFirst.mock.calls[0]?.[0] as { select: Record<string, unknown> }
    expect(callArg.select).not.toHaveProperty("passwordHash")
  })

  it("o select do Prisma NÃO inclui cpfHash nem cpfEncrypted", async () => {
    mockUserFindFirst.mockResolvedValue(makePublicUser())

    await GET(makeReq("user-pub-001"), makeParams("user-pub-001"))

    const callArg = mockUserFindFirst.mock.calls[0]?.[0] as { select: Record<string, unknown> }
    expect(callArg.select).not.toHaveProperty("cpfHash")
    expect(callArg.select).not.toHaveProperty("cpfEncrypted")
    expect(callArg.select).not.toHaveProperty("cnpjHash")
    expect(callArg.select).not.toHaveProperty("cnpjEncrypted")
  })

  it("o select do Prisma NÃO inclui street nem cep (endereço exato)", async () => {
    mockUserFindFirst.mockResolvedValue(makePublicUser())

    await GET(makeReq("user-pub-001"), makeParams("user-pub-001"))

    const callArg = mockUserFindFirst.mock.calls[0]?.[0] as { select: Record<string, unknown> }
    expect(callArg.select).not.toHaveProperty("street")
    expect(callArg.select).not.toHaveProperty("cep")
  })

  it("o select do Prisma NÃO inclui latitude nem longitude (coordenadas precisas)", async () => {
    mockUserFindFirst.mockResolvedValue(makePublicUser())

    await GET(makeReq("user-pub-001"), makeParams("user-pub-001"))

    const callArg = mockUserFindFirst.mock.calls[0]?.[0] as { select: Record<string, unknown> }
    expect(callArg.select).not.toHaveProperty("latitude")
    expect(callArg.select).not.toHaveProperty("longitude")
  })

  it("o select do Prisma NÃO inclui role nem adminRole", async () => {
    mockUserFindFirst.mockResolvedValue(makePublicUser())

    await GET(makeReq("user-pub-001"), makeParams("user-pub-001"))

    const callArg = mockUserFindFirst.mock.calls[0]?.[0] as { select: Record<string, unknown> }
    expect(callArg.select).not.toHaveProperty("role")
    expect(callArg.select).not.toHaveProperty("adminRole")
  })

  it("o select do Prisma NÃO inclui idDocumentUrl nem idSelfieUrl", async () => {
    mockUserFindFirst.mockResolvedValue(makePublicUser())

    await GET(makeReq("user-pub-001"), makeParams("user-pub-001"))

    const callArg = mockUserFindFirst.mock.calls[0]?.[0] as { select: Record<string, unknown> }
    expect(callArg.select).not.toHaveProperty("idDocumentUrl")
    expect(callArg.select).not.toHaveProperty("idSelfieUrl")
  })

  it("a resposta JSON NÃO contém email mesmo que o mock retornasse (proteção dupla)", async () => {
    // Simula vazamento acidental no mock (campo extra no retorno do Prisma)
    const userComEmail = { ...makePublicUser(), email: "privado@shareo.com.br" }
    mockUserFindFirst.mockResolvedValue(userComEmail)

    const res  = await GET(makeReq("user-pub-001"), makeParams("user-pub-001"))
    const body = await res.json() as { data: Record<string, unknown> }

    // O handler constrói o objeto de resposta campo a campo — nunca usa spread
    // do resultado do Prisma, então email não estará na resposta mesmo no mock
    expect(body.data).not.toHaveProperty("email")
  })

  it("reviewer.name é incluído, mas reviewer.id e reviewer.email NÃO são selecionados", async () => {
    mockUserFindFirst.mockResolvedValue(makePublicUser())

    await GET(makeReq("user-pub-001"), makeParams("user-pub-001"))

    const callArg = mockUserFindFirst.mock.calls[0]?.[0] as {
      select: {
        reviewsReceived: {
          select: {
            reviewer: { select: Record<string, unknown> }
          }
        }
      }
    }
    const reviewerSelect = callArg.select.reviewsReceived.select.reviewer.select
    expect(reviewerSelect).toHaveProperty("name", true)
    expect(reviewerSelect).not.toHaveProperty("id")
    expect(reviewerSelect).not.toHaveProperty("email")
  })
})
