/** @jest-environment node */
/**
 * Estorno automático de cancelamento (pauta-raimundo-2026-08-22, item 1).
 *
 * Arquivo fonte: lib/payments/refund.ts
 */
import { emitCancellationRefund } from "@/lib/payments/refund"

const mockRefundsCreate = jest.fn()
const mockTxCreate      = jest.fn()

jest.mock("@/lib/stripe", () => ({
  getStripe: () => ({ refunds: { create: (...a: unknown[]) => mockRefundsCreate(...a) } }),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    platformTransaction: {
      create: (...a: unknown[]) => mockTxCreate(...a),
    },
  },
}))

beforeEach(() => {
  jest.clearAllMocks()
  mockRefundsCreate.mockResolvedValue({ id: "re_123" })
  mockTxCreate.mockResolvedValue({})
})

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
