/** @jest-environment node */
/**
 * GET /api/cron/refund-reconcile — fila de reprocessamento de estornos.
 *
 * Arquivo fonte: app/api/cron/refund-reconcile/route.ts
 *
 * Follow-up do #7 (Red Team 2026-10-28): quando `emitCancellationRefund` falha,
 * `recordRefundFailure` enfileira um PendingRefund PENDING. Este cron reexecuta
 * o estorno: sucesso → DONE; falha com attempts < teto → continua PENDING;
 * falha no teto → FAILED + alerta no Sentry.
 */
import { NextRequest } from "next/server"

const mockAssertCron = jest.fn()
const mockFindMany   = jest.fn()
const mockUpdateMany = jest.fn()
const mockUpdate     = jest.fn()
const mockEmitRefund = jest.fn()
const mockSentry     = jest.fn()

jest.mock("@/lib/auth/cron-guard", () => ({ assertCronAuth: (...a: unknown[]) => mockAssertCron(...a) }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    pendingRefund: {
      findMany:   (...a: unknown[]) => mockFindMany(...a),
      updateMany: (...a: unknown[]) => mockUpdateMany(...a),
      update:     (...a: unknown[]) => mockUpdate(...a),
    },
  },
}))
jest.mock("@/lib/payments/refund", () => ({
  emitCancellationRefund: (...a: unknown[]) => mockEmitRefund(...a),
}))
jest.mock("@sentry/nextjs", () => ({ captureException: (...a: unknown[]) => mockSentry(...a) }))

import { GET } from "@/app/api/cron/refund-reconcile/route"

const req = () => new NextRequest("http://localhost/api/cron/refund-reconcile")

const pendente = (over: Partial<{ id: string; attempts: number; motivo: string }> = {}) => ({
  id:              over.id ?? "pr-1",
  bookingId:       "booking-1",
  paymentIntentId: "pi_1",
  amount:          5000,
  motivo:          over.motivo ?? "cancellation",
  attempts:        over.attempts ?? 0,
})

let errSpy: jest.SpyInstance
let warnSpy: jest.SpyInstance

beforeEach(() => {
  jest.clearAllMocks()
  mockAssertCron.mockReturnValue(undefined)        // autenticado
  mockUpdateMany.mockResolvedValue({ count: 1 })   // claim do optimistic lock
  mockUpdate.mockResolvedValue({})
  mockEmitRefund.mockResolvedValue({ id: "re_1" })
  errSpy  = jest.spyOn(console, "error").mockImplementation(() => {})
  warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})
})
afterEach(() => { errSpy.mockRestore(); warnSpy.mockRestore() })

describe("GET /api/cron/refund-reconcile", () => {
  it("401 sem credencial de cron — não lê a fila", async () => {
    const { NextResponse } = await import("next/server")
    mockAssertCron.mockReturnValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))

    const res = await GET(req())
    expect(res.status).toBe(401)
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it("sucesso: reexecuta o estorno com o motivo original e marca DONE", async () => {
    mockFindMany.mockResolvedValue([pendente({ motivo: "dispute-partial" })])

    const res  = await GET(req())
    const body = await res.json() as { done: number; retried: number; failed: number }

    expect(mockEmitRefund).toHaveBeenCalledWith({
      bookingId: "booking-1", paymentIntentId: "pi_1", amount: 5000, motivo: "dispute-partial",
    })
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "pr-1" },
      data:  { status: "COMPLETED", lastError: null },
    })
    expect(body).toMatchObject({ done: 1, retried: 0, failed: 0 })
    expect(mockSentry).not.toHaveBeenCalled()
  })

  it("claim perdido (outro ciclo pegou a linha): não estorna", async () => {
    mockFindMany.mockResolvedValue([pendente()])
    mockUpdateMany.mockResolvedValue({ count: 0 })

    const res  = await GET(req())
    const body = await res.json() as { done: number }

    expect(mockEmitRefund).not.toHaveBeenCalled()
    expect(body.done).toBe(0)
  })

  it("falha abaixo do teto: continua PENDING, sem Sentry (tenta no próximo ciclo)", async () => {
    mockFindMany.mockResolvedValue([pendente({ attempts: 1 })]) // vira 2 após o claim
    mockEmitRefund.mockRejectedValue(new Error("stripe_timeout"))

    const res  = await GET(req())
    const body = await res.json() as { retried: number; failed: number }

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "pr-1" },
      data:  { status: "PENDING", lastError: "stripe_timeout" },
    })
    expect(body).toMatchObject({ retried: 1, failed: 0 })
    expect(mockSentry).not.toHaveBeenCalled()
  })

  it("falha no teto (5ª tentativa): marca FAILED e alerta no Sentry", async () => {
    mockFindMany.mockResolvedValue([pendente({ attempts: 4 })]) // vira 5 após o claim = teto
    mockEmitRefund.mockRejectedValue(new Error("card_declined"))

    const res  = await GET(req())
    const body = await res.json() as { failed: number; retried: number }

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "pr-1" },
      data:  { status: "FAILED", lastError: "card_declined" },
    })
    expect(body).toMatchObject({ failed: 1, retried: 0 })
    expect(mockSentry).toHaveBeenCalledTimes(1)
    const [, ctx] = mockSentry.mock.calls[0] as [Error, { tags: { pagamento: string }; extra: { attempts: number } }]
    expect(ctx.tags.pagamento).toBe("refund-reconcile-exhausted")
    expect(ctx.extra.attempts).toBe(5)
  })
})
