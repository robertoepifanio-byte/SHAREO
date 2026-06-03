/** @jest-environment node */
/**
 * Testes de integração para POST /api/items
 *
 * Arquivo fonte: app/api/items/route.ts
 *
 * Regra de negócio implementada:
 *   - Todo item cadastrado via POST começa com status="DRAFT" (sem fotos).
 *   - A promoção para AVAILABLE ocorre separadamente via POST /api/items/[id]/images.
 *   - O campo `imageUrls` no payload NÃO é suportado nesta rota — upload é sempre separado.
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
  // Todo item começa como DRAFT — fotos são carregadas separadamente
  // --------------------------------------------------------------------------
  describe("novo item sempre começa como DRAFT", () => {
    it("cria o item com status=DRAFT (sem fotos)", async () => {
      const createdItem = {
        id:          "item-id-001",
        title:       BASE_ITEM_PAYLOAD.title,
        city:        BASE_ITEM_PAYLOAD.city,
        state:       BASE_ITEM_PAYLOAD.state,
        pricePerDay: BASE_ITEM_PAYLOAD.pricePerDay,
        status:      "DRAFT",
        createdAt:   new Date("2026-06-03T00:00:00Z"),
      }
      mockItemCreate.mockResolvedValue(createdItem)

      const res  = await POST(makeRequest(BASE_ITEM_PAYLOAD))
      const body = await res.json() as { data: Record<string, unknown> }

      expect(res.status).toBe(201)
      expect(body.data.status).toBe("DRAFT")
    })

    it("prisma.item.create é chamado com status=DRAFT independente do payload", async () => {
      mockItemCreate.mockResolvedValue({
        id: "item-id-001", title: BASE_ITEM_PAYLOAD.title,
        city: "Natal", state: "RN", pricePerDay: 5000,
        status: "DRAFT", createdAt: new Date(),
      })

      await POST(makeRequest(BASE_ITEM_PAYLOAD))

      expect(mockItemCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "DRAFT" }),
        })
      )
    })

    it("retorna status=DRAFT mesmo quando payload contém imageUrls (campo ignorado pela rota)", async () => {
      // O POST /api/items não processa imageUrls — upload é sempre via rota separada
      const payloadComFotos = {
        ...BASE_ITEM_PAYLOAD,
        imageUrls: ["https://storage.exemplo.com/item-id-001/foto1.jpg"],
      }

      mockItemCreate.mockResolvedValue({
        id: "item-id-002", title: BASE_ITEM_PAYLOAD.title,
        city: "Natal", state: "RN", pricePerDay: 5000,
        status: "DRAFT", createdAt: new Date(),
      })

      const res  = await POST(makeRequest(payloadComFotos))
      const body = await res.json() as { data: Record<string, unknown> }

      expect(res.status).toBe(201)
      // Sempre DRAFT — promoção para AVAILABLE ocorre via POST /api/items/[id]/images
      expect(body.data.status).toBe("DRAFT")
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
