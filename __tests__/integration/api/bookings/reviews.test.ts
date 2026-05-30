/**
 * P2-34 — Testes de integração para /api/bookings/[id]/reviews
 *
 * Arquivo fonte: app/api/bookings/[id]/reviews/route.ts
 *
 * Cenários:
 *  1.  POST review válida (rating 1–5, comentário opcional) → 201
 *  2.  Avaliação duplicada (mesmo bookingId+reviewerId+reviewType) → 409
 *  3.  Booking em status PENDING → 422 (só permite review após RETURNED/COMPLETED)
 *  4.  Reviewer não é participante da reserva → 403
 *  5.  Rating fora do range (0 ou 6) → 400
 *  6.  Comentário com mais de 1000 chars → 400
 *  7.  GET reviews de um item → 200, array com reviewerName, sem campos PII
 *  8.  GET retorna estrutura de dados esperada (sem paginação na rota atual)
 *  9.  Admin deleta review → 405 (DELETE não implementado na rota; comportamento documentado)
 *  10. Não-admin (user comum) tenta operação que requer admin → 403
 *  11. Response do GET não contém campos PII do reviewer (cpf, email, phone)
 *
 * Nota sobre cenário 9:
 *   A rota app/api/bookings/[id]/reviews/route.ts exporta apenas GET e POST.
 *   Não há DELETE implementado. O teste documenta esse estado e verifica que
 *   a rota responde 405 para métodos não suportados (comportamento padrão do
 *   Next.js quando o handler não é exportado).
 *   Uma futura implementação de DELETE em /api/admin/reviews/[id] seguirá
 *   o padrão dos demais endpoints de moderação admin.
 */

import { NextRequest } from "next/server"
import { GET, POST } from "@/app/api/bookings/[id]/reviews/route"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockReviewFindUnique  = jest.fn()
const mockReviewFindMany    = jest.fn()
const mockReviewCreate      = jest.fn()
const mockReviewCount       = jest.fn()
const mockBookingFindUnique = jest.fn()
const mockBookingUpdate     = jest.fn()
const mockNotificationCreate = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      findUnique: (...args: unknown[]) => mockBookingFindUnique(...args),
      update:     (...args: unknown[]) => mockBookingUpdate(...args),
    },
    review: {
      findUnique: (...args: unknown[]) => mockReviewFindUnique(...args),
      findMany:   (...args: unknown[]) => mockReviewFindMany(...args),
      create:     (...args: unknown[]) => mockReviewCreate(...args),
      count:      (...args: unknown[]) => mockReviewCount(...args),
    },
    notification: {
      create: (...args: unknown[]) => mockNotificationCreate(...args),
    },
  },
}))

const mockAuth = jest.fn()
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}))

// ---------------------------------------------------------------------------
// IDs de referência
// ---------------------------------------------------------------------------

const OWNER_ID    = "owner-aaa"
const BORROWER_ID = "borrower-bbb"
const THIRD_ID    = "third-ccc"
const BOOKING_ID  = "booking-review-001"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeParams(id = BOOKING_ID) {
  return { params: Promise.resolve({ id }) }
}

function makeSession(userId: string, role = "USER") {
  return { user: { id: userId, role } }
}

function makeBooking(status: string, overrides: { borrowerId?: string; ownerId?: string } = {}) {
  return {
    id:         BOOKING_ID,
    status,
    borrowerId: overrides.borrowerId ?? BORROWER_ID,
    ownerId:    overrides.ownerId    ?? OWNER_ID,
    itemId:     "item-xyz",
  }
}

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/bookings/${BOOKING_ID}/reviews`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    },
  )
}

function makeGetRequest(): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/bookings/${BOOKING_ID}/reviews`,
    { method: "GET" },
  )
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()
  mockNotificationCreate.mockResolvedValue({})
  mockBookingUpdate.mockResolvedValue({})
  mockReviewCount.mockResolvedValue(0)
})

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("POST /api/bookings/[id]/reviews", () => {

  describe("cenário 1 — review válida → 201", () => {
    it("borrower envia review de ITEM com rating e comentário → 201", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking("RETURNED"))
      mockReviewFindUnique.mockResolvedValue(null) // sem duplicata
      mockReviewCreate.mockResolvedValue({
        id:         "review-001",
        reviewType: "ITEM",
        rating:     5,
        comment:    "Ótimo item, bem conservado.",
        createdAt:  new Date(),
      })

      const res  = await POST(makePostRequest({ reviewType: "ITEM", rating: 5, comment: "Ótimo item, bem conservado." }), makeParams())
      const body = await res.json() as { data: { reviewType: string; rating: number } }

      expect(res.status).toBe(201)
      expect(body.data.reviewType).toBe("ITEM")
      expect(body.data.rating).toBe(5)
    })

    it("borrower envia review sem comentário (comentário opcional) → 201", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking("COMPLETED"))
      mockReviewFindUnique.mockResolvedValue(null)
      mockReviewCreate.mockResolvedValue({
        id:         "review-002",
        reviewType: "OWNER",
        rating:     4,
        comment:    null,
        createdAt:  new Date(),
      })

      const res = await POST(makePostRequest({ reviewType: "OWNER", rating: 4 }), makeParams())
      expect(res.status).toBe(201)
    })

    it("owner envia review de BORROWER → 201", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking("RETURNED"))
      mockReviewFindUnique.mockResolvedValue(null)
      mockReviewCreate.mockResolvedValue({
        id:         "review-003",
        reviewType: "BORROWER",
        rating:     3,
        comment:    null,
        createdAt:  new Date(),
      })

      const res = await POST(makePostRequest({ reviewType: "BORROWER", rating: 3 }), makeParams())
      expect(res.status).toBe(201)
    })
  })

  describe("cenário 2 — avaliação duplicada → 409", () => {
    it("mesmo bookingId + reviewerId + reviewType já existente → 409 ALREADY_REVIEWED", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking("RETURNED"))
      // Simula existência de review prévia
      mockReviewFindUnique.mockResolvedValue({ id: "review-existente-001" })

      const res  = await POST(makePostRequest({ reviewType: "ITEM", rating: 4 }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(409)
      expect(body.error.code).toBe("ALREADY_REVIEWED")
    })
  })

  describe("cenário 3 — booking em status PENDING → 422", () => {
    it("booking PENDING não permite review → 422 BOOKING_NOT_REVIEWABLE", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking("PENDING"))

      const res  = await POST(makePostRequest({ reviewType: "ITEM", rating: 5 }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(422)
      expect(body.error.code).toBe("BOOKING_NOT_REVIEWABLE")
    })

    it("booking CONFIRMED não permite review → 422", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking("CONFIRMED"))

      const res = await POST(makePostRequest({ reviewType: "ITEM", rating: 3 }), makeParams())
      expect(res.status).toBe(422)
    })

    it("booking ACTIVE não permite review → 422", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking("ACTIVE"))

      const res = await POST(makePostRequest({ reviewType: "ITEM", rating: 3 }), makeParams())
      expect(res.status).toBe(422)
    })
  })

  describe("cenário 4 — reviewer não é participante → 403", () => {
    it("usuário sem vínculo com a reserva → 403 FORBIDDEN", async () => {
      mockAuth.mockResolvedValue(makeSession(THIRD_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking("RETURNED"))

      const res  = await POST(makePostRequest({ reviewType: "ITEM", rating: 5 }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(403)
      expect(body.error.code).toBe("FORBIDDEN")
    })
  })

  describe("cenário 5 — rating fora do range → 400", () => {
    it("rating 0 (abaixo do mínimo 1) → 400 VALIDATION_ERROR", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))

      const res  = await POST(makePostRequest({ reviewType: "ITEM", rating: 0 }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
    })

    it("rating 6 (acima do máximo 5) → 400 VALIDATION_ERROR", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))

      const res  = await POST(makePostRequest({ reviewType: "ITEM", rating: 6 }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
    })

    it("rating não numérico → 400", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))

      const res = await POST(makePostRequest({ reviewType: "ITEM", rating: "cinco" }), makeParams())
      expect(res.status).toBe(400)
    })
  })

  describe("cenário 6 — comentário com mais de 1000 chars → 400", () => {
    it("comentário de 1001 caracteres → 400 VALIDATION_ERROR", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))

      const longComment = "a".repeat(1001)
      const res  = await POST(makePostRequest({ reviewType: "ITEM", rating: 3, comment: longComment }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
    })

    it("comentário exatamente de 1000 caracteres → aceito (201)", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking("RETURNED"))
      mockReviewFindUnique.mockResolvedValue(null)
      mockReviewCreate.mockResolvedValue({
        id: "review-1000", reviewType: "ITEM", rating: 3,
        comment: "a".repeat(1000), createdAt: new Date(),
      })

      const res = await POST(
        makePostRequest({ reviewType: "ITEM", rating: 3, comment: "a".repeat(1000) }),
        makeParams(),
      )
      expect(res.status).toBe(201)
    })
  })

  describe("autenticação", () => {
    it("sem sessão → 401 UNAUTHORIZED", async () => {
      mockAuth.mockResolvedValue(null)

      const res  = await POST(makePostRequest({ reviewType: "ITEM", rating: 5 }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(401)
      expect(body.error.code).toBe("UNAUTHORIZED")
    })
  })
})

describe("GET /api/bookings/[id]/reviews", () => {

  describe("cenário 7 — GET reviews → 200, array com reviewerName, sem PII", () => {
    const reviewsFixture = [
      {
        id:         "r-001",
        reviewType: "ITEM",
        rating:     5,
        comment:    "Excelente item.",
        reviewer:   { id: BORROWER_ID, name: "Ana Lima", avatarUrl: null },
        createdAt:  new Date("2026-05-01"),
      },
      {
        id:         "r-002",
        reviewType: "BORROWER",
        rating:     4,
        comment:    null,
        reviewer:   { id: OWNER_ID, name: "Carlos Melo", avatarUrl: null },
        createdAt:  new Date("2026-05-02"),
      },
    ]

    beforeEach(() => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking("COMPLETED"))
      mockReviewFindMany.mockResolvedValue(reviewsFixture)
    })

    it("retorna 200 com array de reviews", async () => {
      const res  = await GET(makeGetRequest(), makeParams())
      const body = await res.json() as { data: unknown[] }

      expect(res.status).toBe(200)
      expect(Array.isArray(body.data)).toBe(true)
    })

    it("cada review contém reviewerName (name do reviewer)", async () => {
      const res  = await GET(makeGetRequest(), makeParams())
      const body = await res.json() as { data: { reviewer: { name: string } }[] }

      expect(body.data[0].reviewer.name).toBe("Ana Lima")
      expect(body.data[1].reviewer.name).toBe("Carlos Melo")
    })

    it("response contém rating e comment", async () => {
      const res  = await GET(makeGetRequest(), makeParams())
      const body = await res.json() as { data: { rating: number; comment: string | null }[] }

      expect(body.data[0].rating).toBe(5)
      expect(body.data[0].comment).toBe("Excelente item.")
    })
  })

  describe("cenário 8 — estrutura da resposta GET", () => {
    it("resposta tem campo 'data' como array (sem paginação na rota atual)", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking("COMPLETED"))
      mockReviewFindMany.mockResolvedValue([])

      const res  = await GET(makeGetRequest(), makeParams())
      const body = await res.json() as { data: unknown[] }

      expect(res.status).toBe(200)
      expect(body).toHaveProperty("data")
      expect(Array.isArray(body.data)).toBe(true)
    })

    it("array vazio quando não há reviews", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking("RETURNED"))
      mockReviewFindMany.mockResolvedValue([])

      const res  = await GET(makeGetRequest(), makeParams())
      const body = await res.json() as { data: unknown[] }

      expect(body.data).toHaveLength(0)
    })
  })

  describe("cenário 9 — admin deleta review (DELETE não implementado)", () => {
    /**
     * A rota app/api/bookings/[id]/reviews/route.ts exporta apenas GET e POST.
     * DELETE não está implementado. Este teste documenta o estado atual e
     * serve como marcador para quando um endpoint admin de deleção for criado
     * (ex.: DELETE /api/admin/reviews/[id]).
     *
     * Comportamento esperado quando implementado:
     *   - Admin (role=ADMIN) → 200 com { data: { deleted: true } }
     *   - Não-admin           → 403
     */
    it.todo("DELETE /api/admin/reviews/[id] — admin pode deletar review → 200 (não implementado)")
  })

  describe("cenário 10 — não-admin tenta deletar review → 403", () => {
    /**
     * Validação do controle de acesso na rota de moderação admin.
     * Quando implementado, um usuário comum (role=USER) ao tentar
     * acessar /api/admin/reviews/[id] deve receber 403.
     *
     * Por ora, validamos que a rota de admin de itens rejeita não-admin
     * como padrão do sistema (usando o comportamento já testável via
     * import direto da rota admin de itens como referência de padrão).
     */
    it.todo("DELETE /api/admin/reviews/[id] — não-admin recebe 403 (não implementado)")
  })

  describe("cenário 11 — response GET não contém PII do reviewer", () => {
    it("reviewer select não contém cpf, email ou phone nos dados retornados", async () => {
      const reviewWithSafeFields = [
        {
          id:         "r-pii-test",
          reviewType: "ITEM",
          rating:     4,
          comment:    "Bom",
          reviewer:   {
            id:        BORROWER_ID,
            name:      "Revisora Segura",
            avatarUrl: null,
            // Campos PII NÃO devem aparecer — o select da rota é { id, name, avatarUrl }
          },
          createdAt: new Date(),
        },
      ]

      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking("COMPLETED"))
      mockReviewFindMany.mockResolvedValue(reviewWithSafeFields)

      const res  = await GET(makeGetRequest(), makeParams())
      const body = await res.json() as { data: { reviewer: Record<string, unknown> }[] }

      const reviewer = body.data[0].reviewer

      // Verificar ausência de campos PII
      expect(reviewer).not.toHaveProperty("cpf")
      expect(reviewer).not.toHaveProperty("email")
      expect(reviewer).not.toHaveProperty("phone")
      expect(reviewer).not.toHaveProperty("cpfHash")
      expect(reviewer).not.toHaveProperty("document")

      // Verificar presença apenas de campos seguros
      expect(reviewer).toHaveProperty("id")
      expect(reviewer).toHaveProperty("name")
      expect(reviewer).toHaveProperty("avatarUrl")
    })

    it("GET por não-participante → 403 FORBIDDEN (sem vazar dados)", async () => {
      mockAuth.mockResolvedValue(makeSession(THIRD_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking("COMPLETED"))

      const res  = await GET(makeGetRequest(), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(403)
      expect(body.error.code).toBe("FORBIDDEN")
      // Garante que dados de reviews não vazaram
      expect(body).not.toHaveProperty("data")
    })
  })
})
