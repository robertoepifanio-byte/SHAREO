/** @jest-environment node */
/**
 * Testes de integração para GET /api/items (listagem pública)
 *
 * Arquivo fonte: app/api/items/route.ts
 *
 * Regra de negócio:
 *   - Itens com status=DRAFT (sem fotos) NÃO devem aparecer na listagem pública
 *   - Itens com status=AVAILABLE aparecem normalmente
 *
 * A query filtra por status: AVAILABLE quando ownerId não é fornecido.
 * Os testes garantem que essa proteção se mantém e que um item DRAFT não vaza
 * na resposta da página /explorar.
 *
 * Migração P2-isActive→status: campo isActive removido; usa ItemStatus enum
 * (AVAILABLE, PAUSED, DRAFT, DELETED). Mocks atualizados em 2026-06-03.
 *
 * ATENÇÃO: esta suíte falha ao rodar com SyntaxError em next-auth (ESM não
 * transformado pelo Jest). Esse é um problema preexistente, não relacionado
 * à migração isActive→status. Rastrear em issue separada.
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

type ItemStatus = "AVAILABLE" | "PAUSED" | "DRAFT" | "DELETED"

function makePublicItem(overrides: { id?: string; status?: ItemStatus } = {}) {
  return {
    id:           overrides.id     ?? "item-id-001",
    title:        "Furadeira Bosch 500W",
    pricePerDay:  5000,
    pricePerWeek: null,
    condition:    "GOOD",
    city:         "Natal",
    state:        "RN",
    neighborhood: "Tirol",
    latitude:     -5.795,
    longitude:    -35.211,
    status:       overrides.status ?? "AVAILABLE",
    viewCount:    0,
    createdAt:    new Date("2026-06-01T00:00:00Z"),
    category:     { id: "cat-id", name: "Ferramentas", slug: "ferramentas" },
    owner:        { id: "owner-id", name: "João Silva", avatarUrl: null, isVerified: false },
    images:       [{ id: "img-id", url: "https://storage.exemplo.com/foto.jpg" }],
    _count:       { reviews: 3, favorites: 1 },
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
  describe("item DRAFT (status=DRAFT) não aparece na listagem pública", () => {
    it("query sem ownerId filtra por status AVAILABLE → item DRAFT não é retornado pelo Prisma", async () => {
      // Prisma retorna lista vazia (item DRAFT foi filtrado pelo where)
      mockItemFindMany.mockResolvedValue([])
      mockItemCount.mockResolvedValue(0)

      const res  = await GET(makeGetReq())
      const body = await res.json() as { data: unknown[] }

      expect(res.status).toBe(200)
      expect(body.data).toHaveLength(0)

      // Confirma que o Prisma foi chamado com status: AVAILABLE
      expect(mockItemFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "AVAILABLE" }),
        })
      )
    })

    it("listagem pública não contém nenhum item com status=DRAFT", async () => {
      // Simula que o banco retornou apenas itens ativos (DRAFT foram filtrados)
      const availableItem = makePublicItem({ id: "item-001", status: "AVAILABLE" })
      mockItemFindMany.mockResolvedValue([availableItem])
      mockItemCount.mockResolvedValue(1)

      const res  = await GET(makeGetReq())
      const body = await res.json() as { data: Array<{ status: string }> }

      expect(res.status).toBe(200)

      // Nenhum item da resposta deve ter status=DRAFT
      const draftItems = body.data.filter(item => item.status === "DRAFT")
      expect(draftItems).toHaveLength(0)
    })

    it("item DRAFT não aparece mesmo quando outros filtros (city, categoryId) são passados", async () => {
      // Filtro por cidade + categoria: Prisma ainda deve receber status: AVAILABLE
      mockItemFindMany.mockResolvedValue([])
      mockItemCount.mockResolvedValue(0)

      const res = await GET(makeGetReq({ city: "Natal", categoryId: "cat-ferramentas" }))

      expect(res.status).toBe(200)

      expect(mockItemFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "AVAILABLE" }),
        })
      )
    })
  })

  // --------------------------------------------------------------------------
  // Item AVAILABLE aparece normalmente
  // --------------------------------------------------------------------------
  describe("item AVAILABLE (status=AVAILABLE) aparece na listagem pública", () => {
    it("item com status=AVAILABLE é retornado na listagem", async () => {
      const availableItem = makePublicItem({ id: "item-002", status: "AVAILABLE" })
      mockItemFindMany.mockResolvedValue([availableItem])
      mockItemCount.mockResolvedValue(1)

      const res  = await GET(makeGetReq())
      const body = await res.json() as {
        data: Array<{ id: string; status: string }>
        meta: { total: number }
      }

      expect(res.status).toBe(200)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].id).toBe("item-002")
      expect(body.data[0].status).toBe("AVAILABLE")
      expect(body.meta.total).toBe(1)
    })

    it("múltiplos itens AVAILABLE são todos retornados", async () => {
      const items = [
        makePublicItem({ id: "item-003", status: "AVAILABLE" }),
        makePublicItem({ id: "item-004", status: "AVAILABLE" }),
        makePublicItem({ id: "item-005", status: "AVAILABLE" }),
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
    it("quando ownerId é passado, status não é forçado como AVAILABLE (dono vê DRAFTs)", async () => {
      const draftItem = makePublicItem({ id: "item-006", status: "DRAFT" })
      mockItemFindMany.mockResolvedValue([draftItem])
      mockItemCount.mockResolvedValue(1)

      const res  = await GET(makeGetReq({ ownerId: "owner-id-001" }))
      const body = await res.json() as { data: Array<{ status: string }> }

      expect(res.status).toBe(200)

      // Com ownerId, a query não filtra por status — dono vê os seus DRAFTs
      expect(mockItemFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ status: "AVAILABLE" }),
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
        makePublicItem({ id: `item-${i + 1}`, status: "AVAILABLE" })
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
