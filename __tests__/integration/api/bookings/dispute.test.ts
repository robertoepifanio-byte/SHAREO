/** @jest-environment node */
/**
 * POST /api/bookings/[id]/dispute
 *
 * Arquivo fonte: app/api/bookings/[id]/dispute/route.ts
 *
 * pauta-raimundo-2026-08-22, item 3 — decisão de Raimundo (25/08/2026): a
 * janela de abertura de disputa é assimétrica por quem abre. Antes, os dois
 * papéis podiam abrir disputa em ACTIVE ou RETURNED, a qualquer momento —
 * sem teste algum cobrindo esta rota (só a irmã PATCH /api/bookings/[id]
 * tinha cobertura). Achado registrado ao implementar a decisão.
 */
import { NextRequest } from "next/server"
import { POST } from "@/app/api/bookings/[id]/dispute/route"

const mockBookingFindUnique = jest.fn()
const mockBookingUpdate     = jest.fn()
const mockNotificationCreate = jest.fn().mockResolvedValue({})

jest.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      findUnique: (...a: unknown[]) => mockBookingFindUnique(...a),
      update:     (...a: unknown[]) => mockBookingUpdate(...a),
    },
    notification: {
      create: (...a: unknown[]) => mockNotificationCreate(...a),
    },
  },
}))

const mockAuth = jest.fn()
jest.mock("@/lib/auth", () => ({ auth: () => mockAuth() }))

const OWNER_ID    = "owner-1"
const BORROWER_ID = "borrower-1"
const BOOKING_ID  = "bk-1"

function req(body: Record<string, unknown>) {
  return new NextRequest(`http://localhost:3000/api/bookings/${BOOKING_ID}/dispute`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  })
}

function params() {
  return { params: Promise.resolve({ id: BOOKING_ID }) }
}

function session(userId: string) {
  return { user: { id: userId } }
}

function makeBooking(overrides: {
  status: string
  returnRequestedAt?: Date | null
}) {
  return {
    id:         BOOKING_ID,
    status:     overrides.status,
    ownerId:    OWNER_ID,
    borrowerId: BORROWER_ID,
    returnRequestedAt: overrides.returnRequestedAt === undefined
      ? new Date(Date.now() - 60 * 60 * 1000) // 1h atrás — dentro da janela de 48h
      : overrides.returnRequestedAt,
    item: { title: "Furadeira Bosch" },
  }
}

const VALID_BODY = { reason: "NAO_FUNCIONA", description: "O item não liga de jeito nenhum." }

beforeEach(() => {
  jest.clearAllMocks()
  mockBookingUpdate.mockResolvedValue({ id: BOOKING_ID, status: "DISPUTED", updatedAt: new Date() })
})

describe("janela de disputa — locatário", () => {
  it("pode abrir durante a locação ativa (ACTIVE)", async () => {
    mockAuth.mockResolvedValue(session(BORROWER_ID))
    mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "ACTIVE" }))

    const res = await POST(req(VALID_BODY), params())
    expect(res.status).toBe(200)
  })

  it("NÃO pode abrir depois de já ter devolvido (RETURNED)", async () => {
    mockAuth.mockResolvedValue(session(BORROWER_ID))
    mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "RETURNED" }))

    const res  = await POST(req(VALID_BODY), params())
    const body = await res.json() as { error: { code: string } }
    expect(res.status).toBe(422)
    expect(body.error.code).toBe("DISPUTE_WINDOW_CLOSED")
    expect(mockBookingUpdate).not.toHaveBeenCalled()
  })
})

describe("janela de disputa — locador", () => {
  it("NÃO pode abrir enquanto a locação ainda está ativa (antes da devolução)", async () => {
    mockAuth.mockResolvedValue(session(OWNER_ID))
    mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "ACTIVE" }))

    const res  = await POST(req(VALID_BODY), params())
    const body = await res.json() as { error: { code: string } }
    expect(res.status).toBe(422)
    expect(body.error.code).toBe("DISPUTE_WINDOW_CLOSED")
  })

  it("pode abrir dentro de 48h da devolução (RETURNED)", async () => {
    mockAuth.mockResolvedValue(session(OWNER_ID))
    mockBookingFindUnique.mockResolvedValue(makeBooking({
      status: "RETURNED",
      returnRequestedAt: new Date(Date.now() - 47 * 60 * 60 * 1000),
    }))

    const res = await POST(req(VALID_BODY), params())
    expect(res.status).toBe(200)
  })

  it("NÃO pode abrir depois de 48h da devolução", async () => {
    mockAuth.mockResolvedValue(session(OWNER_ID))
    mockBookingFindUnique.mockResolvedValue(makeBooking({
      status: "RETURNED",
      returnRequestedAt: new Date(Date.now() - 49 * 60 * 60 * 1000),
    }))

    const res  = await POST(req(VALID_BODY), params())
    const body = await res.json() as { error: { code: string } }
    expect(res.status).toBe(422)
    expect(body.error.code).toBe("DISPUTE_WINDOW_CLOSED")
  })

  it("dado legado sem returnRequestedAt não é bloqueado pela janela — fail-open", async () => {
    mockAuth.mockResolvedValue(session(OWNER_ID))
    mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "RETURNED", returnRequestedAt: null }))

    const res = await POST(req(VALID_BODY), params())
    expect(res.status).toBe(200)
  })
})

describe("comportamento geral", () => {
  it("404 se a reserva não existe", async () => {
    mockAuth.mockResolvedValue(session(BORROWER_ID))
    mockBookingFindUnique.mockResolvedValue(null)

    const res = await POST(req(VALID_BODY), params())
    expect(res.status).toBe(404)
  })

  it("403 se quem chama não é owner nem borrower", async () => {
    mockAuth.mockResolvedValue(session("stranger-id"))
    mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "ACTIVE" }))

    const res = await POST(req(VALID_BODY), params())
    expect(res.status).toBe(403)
  })

  it("401 sem sessão", async () => {
    mockAuth.mockResolvedValue(null)

    const res = await POST(req(VALID_BODY), params())
    expect(res.status).toBe(401)
  })

  it("notifica a outra parte, dizendo quem abriu", async () => {
    mockAuth.mockResolvedValue(session(BORROWER_ID))
    mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "ACTIVE" }))

    await POST(req(VALID_BODY), params())

    expect(mockNotificationCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: OWNER_ID,
        body:   expect.stringContaining("locatário abriu uma disputa"),
      }),
    }))
  })
})
