/** @jest-environment node */
/**
 * PATCH /api/admin/disputes/[id] — desfecho da disputa pelo administrador.
 *
 * Arquivo fonte: app/api/admin/disputes/[id]/route.ts
 *
 * O que estes testes travam: `resolve_completed` leva a reserva ao MESMO estado
 * terminal que o `confirm_return` (COMPLETED) e não criava repasse nenhum. O
 * proprietário ganhava a disputa e nunca recebia — sem erro, sem log, sem nada
 * no banco registrando que um repasse deixou de existir.
 */

import { NextRequest } from "next/server"
import { PATCH } from "@/app/api/admin/disputes/[id]/route"

const mockBookingFindUnique   = jest.fn()
const mockBookingUpdate       = jest.fn()
const mockPayoutFindFirst     = jest.fn()
const mockPayoutCreate        = jest.fn()
const mockOwnerAccountFind    = jest.fn()
const mockAdminLogCreate      = jest.fn()
const mockNotificationCreate  = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    booking:      {
      findUnique: (...a: unknown[]) => mockBookingFindUnique(...a),
      update:     (...a: unknown[]) => mockBookingUpdate(...a),
    },
    payout:       {
      findFirst: (...a: unknown[]) => mockPayoutFindFirst(...a),
      create:    (...a: unknown[]) => mockPayoutCreate(...a),
    },
    ownerPaymentAccount: { findUnique: (...a: unknown[]) => mockOwnerAccountFind(...a) },
    adminLog:     { create: (...a: unknown[]) => mockAdminLogCreate(...a) },
    notification: { create: (...a: unknown[]) => mockNotificationCreate(...a) },
  },
}))

const mockAuth = jest.fn()
jest.mock("@/lib/auth", () => ({ auth: () => mockAuth() }))

jest.mock("@/lib/platform-config", () => ({
  ...jest.requireActual("@/lib/platform-config"),
  getPayoutWindowDays: async () => 7,
}))

const BOOKING_ID  = "booking-disputa-001"
const OWNER_ID    = "owner-001"
const BORROWER_ID = "borrower-002"
const CONTA_ID    = "conta-recebimento-003"

function makeReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost:3000/api/admin/disputes/${BOOKING_ID}`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  })
}

const makeParams = () => ({ params: Promise.resolve({ id: BOOKING_ID }) })

function makeBooking(over: { ownerNetAmount?: number | null } = {}) {
  return {
    id:             BOOKING_ID,
    status:         "DISPUTED",
    borrowerId:     BORROWER_ID,
    ownerId:        OWNER_ID,
    ownerNetAmount: over.ownerNetAmount === undefined ? 8500 : over.ownerNetAmount,
    totalPrice:     10000,
    paymentStatus:  "PAID",
    item:           { title: "Furadeira Bosch" },
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { id: "admin-999", role: "ADMIN" } })
  mockBookingFindUnique.mockResolvedValue(makeBooking())
  mockBookingUpdate.mockResolvedValue({ id: BOOKING_ID, status: "COMPLETED", updatedAt: new Date() })
  mockPayoutFindFirst.mockResolvedValue(null)
  mockPayoutCreate.mockResolvedValue({ id: "payout-001" })
  mockOwnerAccountFind.mockResolvedValue({ id: CONTA_ID })
  mockAdminLogCreate.mockResolvedValue({})
  mockNotificationCreate.mockResolvedValue({})
})

describe("PATCH /api/admin/disputes/[id]", () => {
  it("resolve_completed cria o repasse ao proprietário", async () => {
    const res = await PATCH(makeReq({ action: "resolve_completed" }), makeParams())

    expect(res.status).toBe(200)
    expect(mockPayoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookingId:             BOOKING_ID,
          ownerPaymentAccountId: CONTA_ID,
          amount:                8500,
          status:                "PENDING",
        }),
      }),
    )
  })

  it("resolve_cancelled NÃO cria repasse — a reserva não se completou", async () => {
    mockBookingUpdate.mockResolvedValue({ id: BOOKING_ID, status: "CANCELLED", updatedAt: new Date() })

    const res = await PATCH(makeReq({ action: "resolve_cancelled", adminNote: "Item danificado" }), makeParams())

    expect(res.status).toBe(200)
    expect(mockPayoutCreate).not.toHaveBeenCalled()
  })

  // `Payout.bookingId` NÃO é único no schema: nada no banco impede dois repasses
  // para a mesma reserva. Com dois caminhos criando repasse, deixou de ser teórico.
  it("não duplica repasse quando a reserva já tem um", async () => {
    mockPayoutFindFirst.mockResolvedValue({ id: "payout-ja-existente" })

    const res = await PATCH(makeReq({ action: "resolve_completed" }), makeParams())

    expect(res.status).toBe(200)
    expect(mockPayoutCreate).not.toHaveBeenCalled()
  })

  // Sem conta de recebimento o repasse não pode ser criado — mas a disputa
  // precisa resolver mesmo assim, e o caso não pode sumir em silêncio.
  it("sem conta de recebimento: resolve a disputa e avisa no log, sem repasse", async () => {
    mockOwnerAccountFind.mockResolvedValue(null)
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {})

    const res = await PATCH(makeReq({ action: "resolve_completed" }), makeParams())

    expect(res.status).toBe(200)
    expect(mockPayoutCreate).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("SEM CONTA DE RECEBIMENTO"))
    warn.mockRestore()
  })

  it("reserva fora de disputa → 422", async () => {
    mockBookingFindUnique.mockResolvedValue({ ...makeBooking(), status: "ACTIVE" })

    const res  = await PATCH(makeReq({ action: "resolve_completed" }), makeParams())
    const body = await res.json() as { error: { code: string } }

    expect(res.status).toBe(422)
    expect(body.error.code).toBe("INVALID_STATUS")
    expect(mockPayoutCreate).not.toHaveBeenCalled()
  })

  it("não-admin → 403", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } })

    const res = await PATCH(makeReq({ action: "resolve_completed" }), makeParams())

    expect(res.status).toBe(403)
    expect(mockBookingUpdate).not.toHaveBeenCalled()
  })
})
