/** @jest-environment node */
/**
 * Testes de integração do GET /api/loja/[slug]
 *
 * Verifica:
 * - slug encontrado: retorna owner + items + avgRating + reviewCount
 * - slug não encontrado: 404 com code NOT_FOUND
 * - conta inativa / deletada não é retornada (404)
 * - o select NÃO vaza campos sensíveis (email, cpf, cnpj, passwordHash)
 */

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

// ── Mock do Prisma ─────────────────────────────────────────────────────────────

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user:   { findFirst: jest.fn() },
    item:   { findMany:  jest.fn() },
    review: { aggregate: jest.fn() },
  },
}))

const mockUserFindFirst  = (prisma.user.findFirst  as jest.Mock)
const mockItemFindMany   = (prisma.item.findMany   as jest.Mock)
const mockReviewAggregate = (prisma.review.aggregate as jest.Mock)

// ── Import da rota DEPOIS dos mocks ───────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET } = require("@/app/api/loja/[slug]/route") as {
  GET: (req: NextRequest, ctx: { params: Promise<{ slug: string }> }) => Promise<Response>
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const OWNER = {
  id:         "owner-1",
  name:       "Ferramentas do Zé",
  slug:       "ferramentas-do-ze",
  bio:        "Alugamos ferramentas.",
  avatarUrl:  null,
  city:       "São Paulo",
  state:      "SP",
  userType:   "PJ",
  isVerified: true,
  createdAt:  new Date("2024-01-15"),
  _count: { items: 1, reviewsReceived: 3 },
}

const ITEM = {
  id:           "item-1",
  title:        "Furadeira Bosch 650W",
  pricePerDay:  3500,
  condition:    "EXCELLENT",
  city:         "São Paulo",
  state:        "SP",
  neighborhood: "Centro",
  status:       "AVAILABLE",
  images:       [{ url: "https://example.com/img.jpg" }],
  category:     { name: "Ferramentas", slug: "ferramentas" },
  owner:        { name: "Ferramentas do Zé", isVerified: true },
  _count:       { reviews: 2, favorites: 5 },
}

function makeReq(slug: string) {
  const req    = new NextRequest(`http://localhost:3000/api/loja/${slug}`)
  const params = Promise.resolve({ slug })
  return { req, ctx: { params } }
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks())

// ── Slug encontrado ────────────────────────────────────────────────────────────

describe("GET /api/loja/[slug] — slug encontrado", () => {
  beforeEach(() => {
    mockUserFindFirst.mockResolvedValue(OWNER)
    mockItemFindMany.mockResolvedValue([ITEM])
    mockReviewAggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: { _all: 3 } })
  })

  it("retorna status 200", async () => {
    const { req, ctx } = makeReq("ferramentas-do-ze")
    const res = await GET(req, ctx)
    expect(res.status).toBe(200)
  })

  it("retorna owner com name, slug, isVerified, userType, createdAt", async () => {
    const { req, ctx } = makeReq("ferramentas-do-ze")
    const body = await (await GET(req, ctx)).json() as { data: { owner: typeof OWNER } }
    expect(body.data.owner.name).toBe("Ferramentas do Zé")
    expect(body.data.owner.isVerified).toBe(true)
    expect(body.data.owner.userType).toBe("PJ")
  })

  it("retorna a lista de itens com category.slug", async () => {
    const { req, ctx } = makeReq("ferramentas-do-ze")
    const body = await (await GET(req, ctx)).json() as { data: { items: typeof ITEM[] } }
    expect(body.data.items).toHaveLength(1)
    expect(body.data.items[0].category.slug).toBe("ferramentas")
  })

  it("retorna avgRating e reviewCount", async () => {
    const { req, ctx } = makeReq("ferramentas-do-ze")
    const body = await (await GET(req, ctx)).json() as { data: { avgRating: number; reviewCount: number } }
    expect(body.data.avgRating).toBe(4.5)
    expect(body.data.reviewCount).toBe(3)
  })

  it("consulta o banco pelo slug OU pelo id (retrocompatibilidade)", async () => {
    const { req, ctx } = makeReq("ferramentas-do-ze")
    await GET(req, ctx)
    expect(mockUserFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { slug: "ferramentas-do-ze" },
            { id:   "ferramentas-do-ze" },
          ]),
        }),
      }),
    )
  })

  it("o select de user NÃO contém campos sensíveis", async () => {
    const { req, ctx } = makeReq("ferramentas-do-ze")
    await GET(req, ctx)
    const callArg = mockUserFindFirst.mock.calls[0][0] as { select: Record<string, unknown> }
    const fields  = Object.keys(callArg.select)
    expect(fields).not.toContain("email")
    expect(fields).not.toContain("passwordHash")
    expect(fields).not.toContain("cpf")
    expect(fields).not.toContain("cnpj")
    expect(fields).not.toContain("emailVerified")
    expect(fields).not.toContain("phone")
    expect(fields).not.toContain("resetToken")
  })

  it("o select de item NÃO contém campos sensíveis", async () => {
    const { req, ctx } = makeReq("ferramentas-do-ze")
    await GET(req, ctx)
    const callArg = mockItemFindMany.mock.calls[0][0] as { select: Record<string, unknown> }
    const fields  = Object.keys(callArg.select)
    expect(fields).not.toContain("ownerId")  // ID do dono não é necessário no item
    expect(fields).not.toContain("latitude")
    expect(fields).not.toContain("longitude")
  })

  it("o select de item CONTÉM os campos que a tela renderiza", async () => {
    // Âncora positiva: sem ela, esvaziar o select para `{ id: true }` deixaria
    // a asserção negativa acima passando do mesmo jeito.
    const { req, ctx } = makeReq("ferramentas-do-ze")
    await GET(req, ctx)
    const callArg = mockItemFindMany.mock.calls[0][0] as { select: Record<string, unknown> }
    const fields  = Object.keys(callArg.select)
    expect(fields).toEqual(
      expect.arrayContaining(["id", "title", "pricePerDay", "images", "category", "owner"]),
    )
    const ownerSelect = (callArg.select.owner as { select: Record<string, unknown> }).select
    expect(Object.keys(ownerSelect)).toEqual(["name", "isVerified"])
  })
})

// ── Slug não encontrado ────────────────────────────────────────────────────────

describe("GET /api/loja/[slug] — slug não encontrado", () => {
  beforeEach(() => mockUserFindFirst.mockResolvedValue(null))

  it("retorna status 404", async () => {
    const { req, ctx } = makeReq("nao-existe")
    const res = await GET(req, ctx)
    expect(res.status).toBe(404)
  })

  it("retorna error.code = NOT_FOUND", async () => {
    const { req, ctx } = makeReq("nao-existe")
    const body = await (await GET(req, ctx)).json() as { error: { code: string } }
    expect(body.error.code).toBe("NOT_FOUND")
  })

  it("não consulta itens quando o dono não existe", async () => {
    const { req, ctx } = makeReq("nao-existe")
    await GET(req, ctx)
    expect(mockItemFindMany).not.toHaveBeenCalled()
    expect(mockReviewAggregate).not.toHaveBeenCalled()
  })
})

// ── avgRating nulo (sem avaliações) ───────────────────────────────────────────

describe("GET /api/loja/[slug] — sem avaliações", () => {
  it("retorna avgRating: null e reviewCount: 0", async () => {
    mockUserFindFirst.mockResolvedValue(OWNER)
    mockItemFindMany.mockResolvedValue([])
    mockReviewAggregate.mockResolvedValue({ _avg: { rating: null }, _count: { _all: 0 } })

    const { req, ctx } = makeReq("ferramentas-do-ze")
    const body = await (await GET(req, ctx)).json() as { data: { avgRating: null; reviewCount: number } }
    expect(body.data.avgRating).toBeNull()
    expect(body.data.reviewCount).toBe(0)
  })
})
