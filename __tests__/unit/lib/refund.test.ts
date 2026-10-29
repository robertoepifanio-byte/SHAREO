/** @jest-environment node */
/**
 * Estorno automático de cancelamento (pauta-raimundo-2026-08-22, item 1).
 *
 * Arquivo fonte: lib/payments/refund.ts
 */
import { emitCancellationRefund, recordRefundFailure } from "@/lib/payments/refund"

const mockRefundsCreate = jest.fn()
const mockTxCreate      = jest.fn()
const mockPrUpsert      = jest.fn()
const mockSentry        = jest.fn()

jest.mock("@/lib/stripe", () => ({
  getStripe: () => ({ refunds: { create: (...a: unknown[]) => mockRefundsCreate(...a) } }),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    platformTransaction: {
      create: (...a: unknown[]) => mockTxCreate(...a),
    },
    pendingRefund: {
      upsert: (...a: unknown[]) => mockPrUpsert(...a),
    },
  },
}))

jest.mock("@sentry/nextjs", () => ({ captureException: (...a: unknown[]) => mockSentry(...a) }))

let errSpy: jest.SpyInstance

beforeEach(() => {
  jest.clearAllMocks()
  mockRefundsCreate.mockResolvedValue({ id: "re_123" })
  mockTxCreate.mockResolvedValue({})
  mockPrUpsert.mockResolvedValue({})
  errSpy = jest.spyOn(console, "error").mockImplementation(() => {})
})
afterEach(() => { errSpy.mockRestore() })

it("chama refunds.create com o payment_intent, o valor e uma idempotencyKey por reserva", async () => {
  await emitCancellationRefund({ bookingId: "booking-1", paymentIntentId: "pi_123", amount: 5000 })

  expect(mockRefundsCreate).toHaveBeenCalledWith(
    { payment_intent: "pi_123", amount: 5000 },
    { idempotencyKey: "cancellation-refund-booking-1" },
  )
})

it("registra o estorno em PlatformTransaction com o id do Refund da Stripe", async () => {
  await emitCancellationRefund({ bookingId: "booking-1", paymentIntentId: "pi_123", amount: 5000 })

  expect(mockTxCreate).toHaveBeenCalledWith({
    data: {
      bookingId:   "booking-1",
      type:        "REFUND",
      amount:      5000,
      description: "Estorno automático por cancelamento",
      metadata:    { stripeRefundId: "re_123" },
    },
  })
})

it("devolve o Refund criado", async () => {
  mockRefundsCreate.mockResolvedValue({ id: "re_456" })

  const refund = await emitCancellationRefund({ bookingId: "booking-1", paymentIntentId: "pi_123", amount: 5000 })

  expect(refund).toEqual({ id: "re_456" })
})

it("propaga o erro da Stripe sem engolir — quem chama decide o que fazer", async () => {
  mockRefundsCreate.mockRejectedValue(new Error("card_declined"))

  await expect(
    emitCancellationRefund({ bookingId: "booking-1", paymentIntentId: "pi_123", amount: 5000 }),
  ).rejects.toThrow("card_declined")

  expect(mockTxCreate).not.toHaveBeenCalled()
})

describe("recordRefundFailure — o que o catch de estorno executa", () => {
  it("enfileira um PendingRefund (upsert por bookingId+motivo) E alerta no Sentry", async () => {
    await recordRefundFailure({
      bookingId:       "booking-1",
      paymentIntentId: "pi_123",
      amount:          5000,
      motivo:          "cancellation",
      error:           new Error("stripe_timeout"),
    })

    expect(mockPrUpsert).toHaveBeenCalledWith({
      where:  { bookingId_motivo: { bookingId: "booking-1", motivo: "cancellation" } },
      create: { bookingId: "booking-1", paymentIntentId: "pi_123", amount: 5000, motivo: "cancellation", status: "PENDING", attempts: 0, lastError: "stripe_timeout" },
      update: { status: "PENDING", amount: 5000, paymentIntentId: "pi_123", lastError: "stripe_timeout" },
    })
    expect(mockSentry).toHaveBeenCalledTimes(1)
    const [, ctx] = mockSentry.mock.calls[0] as [Error, { tags: { pagamento: string } }]
    expect(ctx.tags.pagamento).toBe("refund-failure")
  })

  it("não lança quando o próprio enqueue falha — resta o log + Sentry", async () => {
    mockPrUpsert.mockRejectedValue(new Error("pooler down"))

    await expect(
      recordRefundFailure({
        bookingId:       "booking-1",
        paymentIntentId: "pi_123",
        amount:          5000,
        motivo:          "dispute-full",
        error:           new Error("stripe_timeout"),
      }),
    ).resolves.toBeUndefined()

    // O alerta do estorno continua de pé mesmo com o enqueue falhando.
    expect(mockSentry).toHaveBeenCalledTimes(1)
  })
})
