/** @jest-environment node */
/**
 * Reversão de repasse ao proprietário (ADR-028).
 *
 * Arquivo fonte: lib/payments/owner-transfer.ts
 *
 * Por que existe: quando o repasse ao proprietário JÁ saiu e o dinheiro volta
 * pro locatário (reembolso ou disputa perdida), a parte proporcional precisa
 * voltar da conta conectada — senão o proprietário fica com o dinheiro e a
 * plataforma absorve o estorno sozinha.
 *
 * O ponto delicado é a aritmética ser CUMULATIVA: `charge.amount_refunded` é
 * cumulativo por cobrança, então um segundo reembolso parcial precisa reverter
 * só a diferença. Reverter o valor cheio de novo faria a Stripe recusar
 * ("already reversed") ou, pior, tirar dinheiro a mais do proprietário.
 */
import { reverseOwnerTransfer } from "@/lib/payments/owner-transfer"

const mockCreateReversal = jest.fn()
const mockTxFindMany     = jest.fn()
const mockTxCreate       = jest.fn()

jest.mock("@/lib/stripe", () => ({
  getStripe: () => ({ transfers: { createReversal: (...a: unknown[]) => mockCreateReversal(...a) } }),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    platformTransaction: {
      findMany: (...a: unknown[]) => mockTxFindMany(...a),
      create:   (...a: unknown[]) => mockTxCreate(...a),
    },
  },
}))

/** Repasse de 85% sobre uma cobrança de R$100,00. */
const PAYOUT_ROW = { type: "OWNER_PAYOUT", amount: 8500, metadata: { stripeTransferId: "tr_123" } }

beforeEach(() => {
  jest.clearAllMocks()
  mockTxFindMany.mockResolvedValue([PAYOUT_ROW])
  mockTxCreate.mockResolvedValue({})
  mockCreateReversal.mockResolvedValue({ id: "trr_1" })
  jest.spyOn(console, "warn").mockImplementation(() => {})
})

it("não reverte nada quando o repasse ainda não aconteceu — o caso normal", async () => {
  mockTxFindMany.mockResolvedValue([])

  await reverseOwnerTransfer({
    bookingId: "booking-1", clawbackAmount: 10000, chargedAmount: 10000, reason: "Reembolso",
  })

  expect(mockCreateReversal).not.toHaveBeenCalled()
  expect(mockTxCreate).not.toHaveBeenCalled()
})

it("reverte o repasse inteiro num reembolso total", async () => {
  await reverseOwnerTransfer({
    bookingId: "booking-1", clawbackAmount: 10000, chargedAmount: 10000, reason: "Reembolso",
  })

  expect(mockCreateReversal).toHaveBeenCalledWith(
    "tr_123",
    expect.objectContaining({ amount: 8500 }),
    expect.objectContaining({ idempotencyKey: "transfer-reversal-booking-1-8500" }),
  )
})

it("reverte só a parte proporcional num reembolso parcial", async () => {
  await reverseOwnerTransfer({
    bookingId: "booking-1", clawbackAmount: 5000, chargedAmount: 10000, reason: "Reembolso",
  })

  expect(mockCreateReversal).toHaveBeenCalledWith(
    "tr_123",
    expect.objectContaining({ amount: 4250 }),
    expect.anything(),
  )
})

it("é cumulativo: o segundo reembolso reverte só a diferença", async () => {
  mockTxFindMany.mockResolvedValue([
    PAYOUT_ROW,
    { type: "REFUND", amount: 4250, metadata: { stripeTransferId: "tr_123" } },
  ])

  await reverseOwnerTransfer({
    bookingId: "booking-1", clawbackAmount: 10000, chargedAmount: 10000, reason: "Reembolso",
  })

  expect(mockCreateReversal).toHaveBeenCalledWith(
    "tr_123",
    expect.objectContaining({ amount: 4250 }), // 8500 alvo − 4250 já revertido
    expect.anything(),
  )
})

it("não chama a Stripe quando já reverteu tudo — evita o erro 'already reversed'", async () => {
  mockTxFindMany.mockResolvedValue([
    PAYOUT_ROW,
    { type: "REFUND", amount: 8500, metadata: { stripeTransferId: "tr_123" } },
  ])

  await reverseOwnerTransfer({
    bookingId: "booking-1", clawbackAmount: 10000, chargedAmount: 10000, reason: "Reembolso",
  })

  expect(mockCreateReversal).not.toHaveBeenCalled()
})

it("registra a reversão em PlatformTransaction para auditoria", async () => {
  await reverseOwnerTransfer({
    bookingId: "booking-1", clawbackAmount: 10000, chargedAmount: 10000, reason: "Disputa perdida dp_9",
  })

  expect(mockTxCreate).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      bookingId: "booking-1",
      type:      "REFUND",
      amount:    8500,
      metadata:  { stripeTransferId: "tr_123", stripeReversalId: "trr_1" },
    }),
  }))
})

it("ignora reversões de OUTRO transfer ao somar o que já foi revertido", async () => {
  mockTxFindMany.mockResolvedValue([
    PAYOUT_ROW,
    { type: "REFUND", amount: 8500, metadata: { stripeTransferId: "tr_OUTRO" } },
  ])

  await reverseOwnerTransfer({
    bookingId: "booking-1", clawbackAmount: 10000, chargedAmount: 10000, reason: "Reembolso",
  })

  expect(mockCreateReversal).toHaveBeenCalledWith(
    "tr_123",
    expect.objectContaining({ amount: 8500 }),
    expect.anything(),
  )
})

it("não divide por zero quando a cobrança é zero", async () => {
  await reverseOwnerTransfer({
    bookingId: "booking-1", clawbackAmount: 0, chargedAmount: 0, reason: "Reembolso",
  })

  expect(mockCreateReversal).not.toHaveBeenCalled()
})
