/** @jest-environment node */
/**
 * Testes de integração para POST /api/items
 *
 * Arquivo fonte: app/api/items/route.ts
 *
 * Regra de negócio:
 *   - Item cadastrado SEM imagens → status = "DRAFT"
 *   - Item cadastrado COM ao menos 1 imagem no payload → status = "AVAILABLE"
 *
 * Nota: a rota atual não recebe imagens no POST (upload separado via
 * POST /api/items/[id]/images). O campo `imageUrls` no payload é a forma
 * planejada de suportar upload simultâneo. Os testes refletem o comportamento
 * esperado após a implementação — podem falhar até que o dev implemente a regra.
 */

import { NextRequest } from "next/server"
import { POST } from "@/app/api/items/route"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockItemCreate   = jest.fn()
const mockItemFindMany = jest.fn()
const mockItemCount    = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    item: {
      create:   (...args: unknown[]) => mockItemCreate(...args),
      findMany: (...args: unknown[]) => mockItemFindMany(...args),
      count:    (...args: unknown[]) => mockItemCount(...args),
    },
  },
}))

const mockAuth = jest.fn()
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}))

jest.mock("@/lib/geocodeItem", () => ({
  geocodeItem: jest.fn().mockResolvedValue(undefined),
}))

// ---------------------------------------------------------------------------
// Dados de base
// ---------------------------------------------------------------------------

const OWNER_ID = "owner-id-001"

const BASE_ITEM_PAYLOAD = {
  title:       "Furadeira Bosch 500W",
  description: "Furadeira profissional em ótimo estado de conservação, ideal para uso doméstico.",
  categoryId:  "cat-ferramentas-id",
  condition:   "GOOD",
  pricePerDay: 5000,
  city:        "Natal",
  state:       "RN",
  latitude:    -5.795,
  longitude:   -35.211,
}

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/items", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  })
}

function makeSession(userId = OWNER_ID, role = "USER") {
  return { user: { id: userId, role } }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue(makeSession())
})

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("POST /api/items — regra de status por presença de fotos", () => {

  // --------------------------------------------------------------------------
  // Sem imagens → DRAFT
  // --------------------------------------------------------------------------
  describe("sem imagens no cadastro", () => {
    it("cria o item com status=DRAFT quando nenhuma imagem é fornecida", async () => {
      // Item criado pelo Prisma sem fotos → status DRAFT
      const createdItem = {
        id:          "item-id-001",
        title:       BASE_ITEM_PAYLOAD.title,
        city:        BASE_ITEM_PAYLOAD.city,
        state:       BASE_ITEM_PAYLOAD.state,
        pricePerDay: BASE_ITEM_PAYLOAD.pricePerDay,
        status:      "DRAFT", // sem fotos
        createdAt:   new Date("2026-06-03T00:00:00Z"),
      }
      mockItemCreate.mockResolvedValue(createdItem)

      const res  = await POST(makeRequest(BASE_ITEM_PAYLOAD))
      const body = await res.json() as { data: Record<string, unknown> }

      expect(res.status).toBe(201)
      expect(body.data.status).toBe("DRAFT")
    })

    it("prisma.item.create é chamado com status=DRAFT quando payload não contém imageUrls", async () => {
      mockItemCreate.mockResolvedValue({
        id: "item-id-001", title: BASE_ITEM_PAYLOAD.title,
        city: "Natal", state: "RN", pricePerDay: 5000,
        status: "DRAFT", createdAt: new Date(),
      })

      await POST(makeRequest(BASE_ITEM_PAYLOAD))

      // Garante que a rota passou status: "DRAFT" para o Prisma
      expect(mockItemCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "DRAFT" }),
        })
      )
    })
  })

  // --------------------------------------------------------------------------
  // Com imagens → AVAILABLE
  // --------------------------------------------------------------------------
  describe("com ao menos 1 imagem no payload", () => {
    it("cria o item com status=AVAILABLE quando imageUrls contém ao menos 1 URL", async () => {
      const payloadComFotos = {
        ...BASE_ITEM_PAYLOAD,
        imageUrls: ["https://storage.exemplo.com/item-id-001/foto1.jpg"],
      }

      const createdItem = {
        id:          "item-id-002",
        title:       BASE_ITEM_PAYLOAD.title,
        city:        BASE_ITEM_PAYLOAD.city,
        state:       BASE_ITEM_PAYLOAD.state,
        pricePerDay: BASE_ITEM_PAYLOAD.pricePerDay,
        status:      "AVAILABLE", // tem foto
        createdAt:   new Date("2026-06-03T00:00:00Z"),
      }
      mockItemCreate.mockResolvedValue(createdItem)

      const res  = await POST(makeRequest(payloadComFotos))
      const body = await res.json() as { data: Record<string, unknown> }

      expect(res.status).toBe(201)
      expect(body.data.status).toBe("AVAILABLE")
    })

    it("prisma.item.create é chamado com status=AVAILABLE quando imageUrls é não-vazio", async () => {
      const payloadComFotos = {
        ...BASE_ITEM_PAYLOAD,
        imageUrls: [
          "https://storage.exemplo.com/item-id-002/foto1.jpg",
          "https://storage.exemplo.com/item-id-002/foto2.jpg",
        ],
      }

      mockItemCreate.mockResolvedValue({
        id: "item-id-002", title: BASE_ITEM_PAYLOAD.title,
        city: "Natal", state: "RN", pricePerDay: 5000,
        status: "AVAILABLE", createdAt: new Date(),
      })

      await POST(makeRequest(payloadComFotos))

      expect(mockItemCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "AVAILABLE" }),
        })
      )
    })
  })

  // --------------------------------------------------------------------------
  // Autenticação ausente → 401 (comportamento já existente, regredindo)
  // --------------------------------------------------------------------------
  describe("sem autenticação", () => {
    it("retorna 401 UNAUTHORIZED quando não há sessão", async () => {
      mockAuth.mockResolvedValue(null)

      const res  = await POST(makeRequest(BASE_ITEM_PAYLOAD))
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(401)
      expect(body.error.code).toBe("UNAUTHORIZED")
    })
  })

  // --------------------------------------------------------------------------
  // Validação básica (regressão)
  // --------------------------------------------------------------------------
  describe("validação de payload", () => {
    it("retorna 400 VALIDATION_ERROR quando title é muito curto", async () => {
      const res  = await POST(makeRequest({ ...BASE_ITEM_PAYLOAD, title: "abc" }))
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
    })
  })
})
