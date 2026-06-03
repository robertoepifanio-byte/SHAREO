/** @jest-environment node */
/**
 * Testes de integração para GET /api/items (listagem pública)
 *
 * Arquivo fonte: app/api/items/route.ts
 *
 * Regra de negócio (a implementar):
 *   - Itens com isActive=false (DRAFT — sem fotos) NÃO devem aparecer na listagem pública
 *   - Itens com isActive=true (AVAILABLE) aparecem normalmente
 *
 * A query atual já filtra por isActive: true quando ownerId não é fornecido.
 * Os testes garantem que essa proteção se mantém e que um item DRAFT não vaza
 * na resposta da página /explorar.
 */

import { NextRequest } from "next/server"
import { GET } from "@/app/api/items/route"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockItemFindMany = jest.fn()
const mockItemCount    = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    item: {
      findMany: (...args: unknown[]) => mockItemFindMany(...args),
      count:    (...args: unknown[]) => mockItemCount(...args),
    },
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGetReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/items")
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return new NextRequest(url.toString())
}

function makePublicItem(overrides: { id?: string; isActive?: boolean } = {}) {
  return {
    id:          overrides.id        ?? "item-id-001",
    title:       "Furadeira Bosch 500W",
    pricePerDay: 5000,
    pricePerWeek: null,
    condition:   "GOOD",
    city:        "Natal",
    state:       "RN",
    neighborhood: "Tirol",
    latitude:    -5.795,
    longitude:   -35.211,
    isActive:    overrides.isActive  ?? true,
    viewCount:   0,
    createdAt:   new Date("2026-06-01T00:00:00Z"),
    category:    { id: "cat-id", name: "Ferramentas", slug: "ferramentas" },
    owner:       { id: "owner-id", name: "João Silva", avatarUrl: null, isVerified: false },
    images:      [{ id: "img-id", url: "https://storage.exemplo.com/foto.jpg" }],
    _count:      { reviews: 3, favorites: 1 },
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()
  mockItemCount.mockResolvedValue(0)
  mockItemFindMany.mockResolvedValue([])
})

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("GET /api/items — filtragem de itens DRAFT na listagem pública", () => {

  // --------------------------------------------------------------------------
  // Item DRAFT não aparece na listagem pública
  // --------------------------------------------------------------------------
  describe("item DRAFT (isActive=false) não aparece na listagem pública", () => {
    it("query sem ownerId usa isActive:true → item DRAFT não é retornado pelo Prisma", async () => {
      // Prisma retorna lista vazia (item DRAFT foi filtrado pelo where)
      mockItemFindMany.mockResolvedValue([])
      mockItemCount.mockResolvedValue(0)

      const res  = await GET(makeGetReq())
      const body = await res.json() as { data: unknown[] }

      expect(res.status).toBe(200)
      expect(body.data).toHaveLength(0)

      // Confirma que o Prisma foi chamado com isActive: true
      expect(mockItemFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      )
    })

    it("listagem pública não contém nenhum item com isActive=false", async () => {
      // Simula que o banco retornou apenas itens ativos (DRAFT foram filtrados)
      const availableItem = makePublicItem({ id: "item-001", isActive: true })
      mockItemFindMany.mockResolvedValue([availableItem])
      mockItemCount.mockResolvedValue(1)

      const res  = await GET(makeGetReq())
      const body = await res.json() as { data: Array<{ isActive: boolean }> }

      expect(res.status).toBe(200)

      // Nenhum item da resposta deve ter isActive=false
      const draftItems = body.data.filter(item => item.isActive === false)
      expect(draftItems).toHaveLength(0)
    })

    it("item DRAFT não aparece mesmo quando outros filtros (city, categoryId) são passados", async () => {
      // Filtro por cidade + categoria: Prisma ainda deve receber isActive: true
      mockItemFindMany.mockResolvedValue([])
      mockItemCount.mockResolvedValue(0)

      const res = await GET(makeGetReq({ city: "Natal", categoryId: "cat-ferramentas" }))

      expect(res.status).toBe(200)

      expect(mockItemFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      )
    })
  })

  // --------------------------------------------------------------------------
  // Item AVAILABLE aparece normalmente
  // --------------------------------------------------------------------------
  describe("item AVAILABLE (isActive=true) aparece na listagem pública", () => {
    it("item com isActive=true é retornado na listagem", async () => {
      const availableItem = makePublicItem({ id: "item-002", isActive: true })
      mockItemFindMany.mockResolvedValue([availableItem])
      mockItemCount.mockResolvedValue(1)

      const res  = await GET(makeGetReq())
      const body = await res.json() as {
        data: Array<{ id: string; isActive: boolean }>
        meta: { total: number }
      }

      expect(res.status).toBe(200)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].id).toBe("item-002")
      expect(body.data[0].isActive).toBe(true)
      expect(body.meta.total).toBe(1)
    })

    it("múltiplos itens AVAILABLE são todos retornados", async () => {
      const items = [
        makePublicItem({ id: "item-003", isActive: true }),
        makePublicItem({ id: "item-004", isActive: true }),
        makePublicItem({ id: "item-005", isActive: true }),
      ]
      mockItemFindMany.mockResolvedValue(items)
      mockItemCount.mockResolvedValue(3)

      const res  = await GET(makeGetReq())
      const body = await res.json() as { data: unknown[]; meta: { total: number } }

      expect(res.status).toBe(200)
      expect(body.data).toHaveLength(3)
      expect(body.meta.total).toBe(3)
    })
  })

  // --------------------------------------------------------------------------
  // Listagem por ownerId — dono pode ver seus próprios itens DRAFT
  // --------------------------------------------------------------------------
  describe("listagem por ownerId — dono vê seus próprios itens DRAFT", () => {
    it("quando ownerId é passado, isActive não é forçado como true (dono vê DRAFTs)", async () => {
      const draftItem = makePublicItem({ id: "item-006", isActive: false })
      mockItemFindMany.mockResolvedValue([draftItem])
      mockItemCount.mockResolvedValue(1)

      const res  = await GET(makeGetReq({ ownerId: "owner-id-001" }))
      const body = await res.json() as { data: Array<{ isActive: boolean }> }

      expect(res.status).toBe(200)

      // Com ownerId, a query não filtra por isActive — dono vê os seus DRAFTs
      expect(mockItemFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: undefined }),
        })
      )
    })
  })

  // --------------------------------------------------------------------------
  // Paginação e meta (regressão)
  // --------------------------------------------------------------------------
  describe("paginação e meta", () => {
    it("retorna meta com total, page, limit e hasNextPage corretos", async () => {
      const items = Array.from({ length: 5 }, (_, i) =>
        makePublicItem({ id: `item-${i + 1}`, isActive: true })
      )
      mockItemFindMany.mockResolvedValue(items)
      mockItemCount.mockResolvedValue(12)

      const res  = await GET(makeGetReq({ page: "1", limit: "5" }))
      const body = await res.json() as {
        meta: { total: number; page: number; limit: number; hasNextPage: boolean }
      }

      expect(res.status).toBe(200)
      expect(body.meta.total).toBe(12)
      expect(body.meta.page).toBe(1)
      expect(body.meta.limit).toBe(5)
      expect(body.meta.hasNextPage).toBe(true)
    })

    it("retorna 400 VALIDATION_ERROR para parâmetros inválidos", async () => {
      const res  = await GET(makeGetReq({ limit: "999" })) // acima do máximo de 50
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
    })
  })
})
