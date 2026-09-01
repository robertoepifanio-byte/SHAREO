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
    // A reserva em disputa NÃO fica num status próprio — segue seu ciclo de
    // vida normal. Quem diz que há disputa é `disputeStatus` (01/09/2026).
    status:         "RETURNED",
    disputeStatus:  "OPEN",
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

  // Estorno da disputa é INTEGRAL, não a escada do cancelamento: a demora é do
  // processo de mediação, não do locatário, e a disputa só existe depois da
  // retirada — a escada quase sempre daria 50% a quem acabou de ganhar o caso.
  // Decisão do fundador, 2026-08-23.
  it("resolve_cancelled grava estorno INTEGRAL quando a reserva foi paga", async () => {
    mockBookingUpdate.mockResolvedValue({ id: BOOKING_ID, status: "CANCELLED", updatedAt: new Date() })

    await PATCH(makeReq({ action: "resolve_cancelled" }), makeParams())

    expect(mockBookingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ refundAmount: 10000, refundPercent: 100 }),
      }),
    )
  })

  // Não se estorna dinheiro que nunca entrou: um valor a devolver numa reserva
  // não paga vira trabalho real na fila de alguém (mesma regra do #345).
  it("resolve_cancelled em reserva NÃO paga grava estorno zero", async () => {
    mockBookingFindUnique.mockResolvedValue({ ...makeBooking(), paymentStatus: "PENDING" })
    mockBookingUpdate.mockResolvedValue({ id: BOOKING_ID, status: "CANCELLED", updatedAt: new Date() })

    await PATCH(makeReq({ action: "resolve_cancelled" }), makeParams())

    expect(mockBookingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ refundAmount: 0, refundPercent: 0 }),
      }),
    )
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
    // "Fora de disputa" passou a significar `disputeStatus: NONE` — o `status`
    // da reserva não decide mais nada sobre isso.
    mockBookingFindUnique.mockResolvedValue({ ...makeBooking(), status: "ACTIVE", disputeStatus: "NONE" })

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

  describe("dismiss_dispute — encerrar a disputa sem cancelar a locação", () => {
    it("encerra a disputa e deixa a reserva EXATAMENTE onde estava", async () => {
      mockBookingFindUnique.mockResolvedValue(makeBooking())
      mockBookingUpdate.mockResolvedValue({
        id: BOOKING_ID, status: "RETURNED", disputeStatus: "DISMISSED", updatedAt: new Date(),
      })

      const res = await PATCH(
        makeReq({ action: "dismiss_dispute", adminNote: "Partes se entenderam pelo chat." }),
        makeParams(),
      )
      expect(res.status).toBe(200)

      const [[arg]] = mockBookingUpdate.mock.calls as [[{ data: Record<string, unknown> }]]
      expect(arg.data.disputeStatus).toBe("DISMISSED")
      // A correcao 4 do Thiago, ponto a ponto: nem status, nem cancelamento,
      // nem estorno. A locacao segue.
      expect(arg.data).not.toHaveProperty("status")
      expect(arg.data).not.toHaveProperty("cancelledAt")
      expect(arg.data).not.toHaveProperty("cancelledById")
      expect(arg.data).not.toHaveProperty("refundAmount")
      expect(arg.data).not.toHaveProperty("refundPercent")
      // ...e nao gera repasse: nenhum lado ganhou a disputa.
      expect(mockPayoutCreate).not.toHaveBeenCalled()
    })

    it("exige justificativa — e o admin vê qual foi o erro", async () => {
      mockBookingFindUnique.mockResolvedValue(makeBooking())

      const res  = await PATCH(makeReq({ action: "dismiss_dispute" }), makeParams())
      const body = await res.json() as { error: { code: string; message: string } }

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
      // A mensagem generica "Acao invalida" nao dizia o que corrigir.
      expect(body.error.message).toContain("Explique por que")
      expect(mockBookingUpdate).not.toHaveBeenCalled()
    })

    it("avisa as partes que a locação segue — e não que foi cancelada", async () => {
      mockBookingFindUnique.mockResolvedValue(makeBooking())
      mockBookingUpdate.mockResolvedValue({
        id: BOOKING_ID, status: "RETURNED", disputeStatus: "DISMISSED", updatedAt: new Date(),
      })

      await PATCH(
        makeReq({ action: "dismiss_dispute", adminNote: "Sem elementos para mediar." }),
        makeParams(),
      )

      const corpos = mockNotificationCreate.mock.calls.map(
        (c) => (c[0] as { data: { body: string } }).data.body,
      )
      expect(corpos).toHaveLength(2)
      for (const corpo of corpos) {
        expect(corpo).toContain("segue normalmente")
        expect(corpo).not.toContain("cancelada")
      }
    })
  })
})
