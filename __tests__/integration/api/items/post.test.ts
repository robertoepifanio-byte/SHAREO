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

const mockItemCreate     = jest.fn()
const mockItemUpdate     = jest.fn()
const mockItemFindMany   = jest.fn()
const mockItemCount      = jest.fn()
const mockUserFindUnique = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    item: {
      create:   (...args: unknown[]) => mockItemCreate(...args),
      update:   (...args: unknown[]) => mockItemUpdate(...args),
      findMany: (...args: unknown[]) => mockItemFindMany(...args),
      count:    (...args: unknown[]) => mockItemCount(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
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
  // Obrigatório na criação desde 25/08/2026 (pauta-raimundo-2026-08-22, item 4b).
  estimatedRetailPrice: 80_000,
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
  // Cadastro progressivo: por padrão o usuário tem cadastro completo (gate liberado)
  mockUserFindUnique.mockResolvedValue({ profileCompletedAt: new Date() })
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
      mockItemUpdate.mockImplementation(async ({ data }: { data: { slug: string } }) => ({
        ...createdItem,
        ...data,
      }))

      const res  = await POST(makeRequest(BASE_ITEM_PAYLOAD))
      const body = await res.json() as { data: Record<string, unknown> }

      expect(res.status).toBe(201)
      expect(body.data.status).toBe("DRAFT")
    })

    it("grava o slug logo após criar — sem ele a URL canônica não existe", async () => {
      // 🪤 O campo `slug` ficou NULL em 100% dos anúncios por não ter quem
      // escrevesse: `buildSlug` existia em utils/geo.ts, com 9 testes, chamado
      // só pelo próprio teste. O schema documentava "SEO URL" para uma coluna
      // vazia. Sem esta gravação, o canonical, o sitemap e o og:url caem no
      // cuid e o slug segue morto.
      const createdItem = {
        id:          "item-id-001",
        title:       "Furadeira Bosch 500W",
        city:        "Recife",
        state:       "PE",
        pricePerDay: 5000,
        status:      "DRAFT",
        createdAt:   new Date(),
      }
      mockItemCreate.mockResolvedValue(createdItem)
      mockItemUpdate.mockImplementation(async ({ data }: { data: { slug: string } }) => ({
        ...createdItem,
        ...data,
      }))

      await POST(makeRequest({ ...BASE_ITEM_PAYLOAD, title: "Furadeira Bosch 500W" }))

      const { where, data } = mockItemUpdate.mock.calls[0][0] as {
        where: { id: string }
        data:  { slug: string }
      }
      expect(where.id).toBe("item-id-001")
      // O id entra no slug: é ele que dispensa tratamento de colisão entre dois
      // anúncios de mesmo título na mesma cidade.
      expect(data.slug).toBe("furadeira-bosch-500w-em-recife-pe-item-id-001")
    })

    it("sem cidade e estado não inventa slug — o canonical usa o id", async () => {
      // "titulo-em--" não é URL, é ruído. Item importado sem localização segue
      // com slug null, e a página continua servindo pelo id.
      const semLocal = {
        id: "item-id-002", title: "Serra", city: "", state: "",
        pricePerDay: 5000, status: "DRAFT", createdAt: new Date(),
      }
      mockItemCreate.mockResolvedValue(semLocal)

      const res = await POST(makeRequest(BASE_ITEM_PAYLOAD))

      expect(res.status).toBe(201)
      expect(mockItemUpdate).not.toHaveBeenCalled()
    })

    it("prisma.item.create é chamado com status=DRAFT independente do payload", async () => {
      mockItemCreate.mockResolvedValue({
        id: "item-id-001", title: BASE_ITEM_PAYLOAD.title,
        city: "Natal", state: "RN", pricePerDay: 5000,
        status: "DRAFT", createdAt: new Date(),
      })
      mockItemUpdate.mockResolvedValue({ id: "item-id-001", status: "DRAFT" })

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
  // Cadastro progressivo — anunciar exige cadastro completo
  // --------------------------------------------------------------------------
  describe("cadastro incompleto", () => {
    it("retorna 403 REGISTRATION_INCOMPLETE quando profileCompletedAt é null", async () => {
      mockUserFindUnique.mockResolvedValue({ profileCompletedAt: null })

      const res  = await POST(makeRequest(BASE_ITEM_PAYLOAD))
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(403)
      expect(body.error.code).toBe("REGISTRATION_INCOMPLETE")
      expect(mockItemCreate).not.toHaveBeenCalled()
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
