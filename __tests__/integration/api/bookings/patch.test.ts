/** @jest-environment node */
/**
 * P1-11 — Testes de integração para PATCH /api/bookings/[id]
 *
 * Arquivo fonte: app/api/bookings/[id]/route.ts
 *
 * Transições de estado:
 *   PENDING  → confirm (owner)        → CONFIRMED
 *   PENDING  → cancel  (both)         → CANCELLED
 *   CONFIRMED → mark_active (owner)   → ACTIVE
 *   CONFIRMED → cancel  (both)        → CANCELLED
 *   ACTIVE   → mark_returned (borrower) → RETURNED
 *   ACTIVE   → open_dispute (both)    → DISPUTED
 *   RETURNED → confirm (owner)        → COMPLETED  [via "mark_returned" semântica — veja TRANSITIONS]
 *   COMPLETED / CANCELLED → qualquer  → 400/422
 */

import { NextRequest } from "next/server"
import { PATCH } from "@/app/api/bookings/[id]/route"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockBookingFindUnique = jest.fn()
const mockBookingUpdate     = jest.fn()
const mockNotificationCreate = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      findUnique: (...args: unknown[]) => mockBookingFindUnique(...args),
      update:     (...args: unknown[]) => mockBookingUpdate(...args),
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

jest.mock("@/lib/email", () => ({
  sendBookingConfirmedEmail: jest.fn().mockResolvedValue(undefined),
  sendBookingCancelledEmail: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/outboundWebhooks", () => ({
  dispatchWebhookEvent: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/cancellationPolicy", () => ({
  calcRefund: jest.fn().mockReturnValue({
    refundAmount:  100,
    refundPercent: 100,
    reason:        "Cancelado com antecedência",
  }),
}))

// ---------------------------------------------------------------------------
// IDs de referência
// ---------------------------------------------------------------------------

const OWNER_ID    = "owner-id-001"
const BORROWER_ID = "borrower-id-002"
const THIRD_ID    = "third-id-003"
const BOOKING_ID  = "booking-id-abc"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Cria uma NextRequest para PATCH /api/bookings/[id] com body JSON. */
function makeReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost:3000/api/bookings/${BOOKING_ID}`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  })
}

/** Params do Next.js (Promise com { id }). */
function makeParams(id = BOOKING_ID) {
  return { params: Promise.resolve({ id }) }
}

/** Cria um booking mockado com os dados fornecidos. */
function makeBooking(overrides: {
  status?: string
  ownerId?: string
  borrowerId?: string
}) {
  return {
    id:          BOOKING_ID,
    status:      overrides.status      ?? "PENDING",
    ownerId:     overrides.ownerId     ?? OWNER_ID,
    borrowerId:  overrides.borrowerId  ?? BORROWER_ID,
    startDate:   new Date("2026-06-10T00:00:00Z"),
    endDate:     new Date("2026-06-15T00:00:00Z"),
    totalPrice:  300,
    item:        { title: "Furadeira Bosch" },
    borrower:    { email: "borrower@ex.com", name: "Locatário Teste" },
    owner:       { email: "owner@ex.com",    name: "Proprietário Teste" },
  }
}

/** Cria uma sessão autenticada para o usuário indicado. */
function makeSession(userId: string, role = "USER") {
  return { user: { id: userId, role } }
}

/** Resultado de booking.update bem-sucedido. */
function makeUpdatedBooking(status: string) {
  return { id: BOOKING_ID, status, updatedAt: new Date() }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()
  mockNotificationCreate.mockResolvedValue({})
})

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("PATCH /api/bookings/[id]", () => {

  // --------------------------------------------------------------------------
  // 1. PENDING + confirm (owner) → 200, status CONFIRMED
  // --------------------------------------------------------------------------
  describe("transições de estado válidas", () => {
    it("PENDING + confirm pelo owner → 200, status CONFIRMED", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "PENDING" }))
      mockBookingUpdate.mockResolvedValue(makeUpdatedBooking("CONFIRMED"))

      const res  = await PATCH(makeReq({ action: "confirm" }), makeParams())
      const body = await res.json() as { data: { status: string } }

      expect(res.status).toBe(200)
      expect(body.data.status).toBe("CONFIRMED")
    })

    // 2. PENDING + cancel (borrower, com reason) → 200, status CANCELLED
    it("PENDING + cancel pelo borrower com reason → 200, status CANCELLED", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "PENDING" }))
      mockBookingUpdate.mockResolvedValue(makeUpdatedBooking("CANCELLED"))

      const res  = await PATCH(makeReq({ action: "cancel", reason: "Não preciso mais." }), makeParams())
      const body = await res.json() as { data: { status: string } }

      expect(res.status).toBe(200)
      expect(body.data.status).toBe("CANCELLED")
    })

    // 3. CONFIRMED + mark_active (owner) → 200, status ACTIVE
    it("CONFIRMED + mark_active pelo owner → 200, status ACTIVE", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "CONFIRMED" }))
      mockBookingUpdate.mockResolvedValue(makeUpdatedBooking("ACTIVE"))

      const res  = await PATCH(makeReq({ action: "mark_active" }), makeParams())
      const body = await res.json() as { data: { status: string } }

      expect(res.status).toBe(200)
      expect(body.data.status).toBe("ACTIVE")
    })

    // 4. CONFIRMED + cancel (owner, com reason) → 200, status CANCELLED
    it("CONFIRMED + cancel pelo owner com reason → 200, status CANCELLED", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "CONFIRMED" }))
      mockBookingUpdate.mockResolvedValue(makeUpdatedBooking("CANCELLED"))

      const res  = await PATCH(makeReq({ action: "cancel", reason: "Conflito de agenda." }), makeParams())
      const body = await res.json() as { data: { status: string } }

      expect(res.status).toBe(200)
      expect(body.data.status).toBe("CANCELLED")
    })

    // 5. ACTIVE + mark_returned (borrower) → 200, status RETURNED
    it("ACTIVE + mark_returned pelo borrower → 200, status RETURNED", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "ACTIVE" }))
      mockBookingUpdate.mockResolvedValue(makeUpdatedBooking("RETURNED"))

      const res  = await PATCH(makeReq({ action: "mark_returned" }), makeParams())
      const body = await res.json() as { data: { status: string } }

      expect(res.status).toBe(200)
      expect(body.data.status).toBe("RETURNED")
    })

    // 6. ACTIVE + open_dispute (borrower, com reason) → 200, status DISPUTED
    it("ACTIVE + open_dispute pelo borrower com reason → 200, status DISPUTED", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "ACTIVE" }))
      mockBookingUpdate.mockResolvedValue(makeUpdatedBooking("DISPUTED"))

      const res  = await PATCH(makeReq({ action: "open_dispute", reason: "Item chegou danificado." }), makeParams())
      const body = await res.json() as { data: { status: string } }

      expect(res.status).toBe(200)
      expect(body.data.status).toBe("DISPUTED")
    })

    // 7. RETURNED + open_dispute (owner) → 200, status DISPUTED
    // open_dispute aceita RETURNED como status de origem (requiredStatus inclui "RETURNED").
    // Nota: a rota não expõe uma ação "complete" explícita — a conclusão de locação
    // pode ser tratada via lógica de negócio ou webhook externo.
    it("RETURNED + open_dispute pelo owner com reason → 200, status DISPUTED", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "RETURNED" }))
      mockBookingUpdate.mockResolvedValue(makeUpdatedBooking("DISPUTED"))

      const res  = await PATCH(makeReq({ action: "open_dispute", reason: "Verificando danos." }), makeParams())
      const body = await res.json() as { data: { status: string } }

      expect(res.status).toBe(200)
      expect(body.data.status).toBe("DISPUTED")
    })
  })

  // --------------------------------------------------------------------------
  // 8 e 9. Estados terminais — COMPLETED e CANCELLED rejeitam qualquer ação
  // --------------------------------------------------------------------------
  describe("estados terminais (COMPLETED e CANCELLED)", () => {
    it("COMPLETED + confirm → 422 INVALID_TRANSITION", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "COMPLETED" }))

      const res  = await PATCH(makeReq({ action: "confirm" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect([400, 422]).toContain(res.status)
      expect(body.error.code).toBe("INVALID_TRANSITION")
    })

    it("CANCELLED + mark_active → 422 INVALID_TRANSITION", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "CANCELLED" }))

      const res  = await PATCH(makeReq({ action: "mark_active" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect([400, 422]).toContain(res.status)
      expect(body.error.code).toBe("INVALID_TRANSITION")
    })
  })

  // --------------------------------------------------------------------------
  // 10. Borrower tenta confirm (somente owner pode) → 403
  // --------------------------------------------------------------------------
  describe("restrições de papel (role)", () => {
    it("borrower tenta confirm → 403 FORBIDDEN", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "PENDING" }))

      const res  = await PATCH(makeReq({ action: "confirm" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(403)
      expect(body.error.code).toBe("FORBIDDEN")
    })

    // 11. Owner tenta mark_returned (somente borrower pode) → 403
    it("owner tenta mark_returned → 403 FORBIDDEN", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "ACTIVE" }))

      const res  = await PATCH(makeReq({ action: "mark_returned" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(403)
      expect(body.error.code).toBe("FORBIDDEN")
    })
  })

  // --------------------------------------------------------------------------
  // 12. cancel sem reason → 400
  // --------------------------------------------------------------------------
  describe("validação de payload", () => {
    it("cancel sem reason → 400 VALIDATION_ERROR", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      // findUnique não deve ser chamado — validação Zod rejeita antes
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "PENDING" }))

      const res  = await PATCH(makeReq({ action: "cancel" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
    })

    it("open_dispute sem reason → 400 VALIDATION_ERROR", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "ACTIVE" }))

      const res  = await PATCH(makeReq({ action: "open_dispute" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
    })
  })

  // --------------------------------------------------------------------------
  // 13. Usuário não-participante → 403
  // --------------------------------------------------------------------------
  describe("autorização — não-participante", () => {
    it("usuário sem vínculo com a reserva → 403 FORBIDDEN", async () => {
      mockAuth.mockResolvedValue(makeSession(THIRD_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "PENDING" }))

      const res  = await PATCH(makeReq({ action: "confirm" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(403)
      expect(body.error.code).toBe("FORBIDDEN")
    })
  })

  // --------------------------------------------------------------------------
  // 14. Booking não encontrado → 404
  // --------------------------------------------------------------------------
  describe("booking inexistente", () => {
    it("booking não encontrado → 404 BOOKING_NOT_FOUND", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(null)

      const res  = await PATCH(makeReq({ action: "confirm" }), makeParams("id-que-nao-existe"))
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(404)
      expect(body.error.code).toBe("BOOKING_NOT_FOUND")
    })
  })

  // --------------------------------------------------------------------------
  // Autenticação ausente → 401
  // --------------------------------------------------------------------------
  describe("sem autenticação", () => {
    it("sem sessão → 401 UNAUTHORIZED", async () => {
      mockAuth.mockResolvedValue(null)

      const res  = await PATCH(makeReq({ action: "confirm" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(401)
      expect(body.error.code).toBe("UNAUTHORIZED")
    })
  })
})
