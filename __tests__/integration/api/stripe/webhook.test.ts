/** @jest-environment node */
/**
 * Roteamento de eventos do webhook do Stripe (ADR-028).
 *
 * Arquivo fonte: app/api/webhooks/stripe/route.ts
 *
 * Foco: qual evento dispara qual efeito. A aritmética da reversão é testada
 * em __tests__/unit/lib/owner-transfer.test.ts, e os efeitos de "reserva paga"
 * ficam em lib/payments/mark-booking-paid.ts — aqui os dois são mockados.
 *
 * O que este arquivo protege:
 *
 * 1. Pix/boleto (ADR-028) são ASSÍNCRONOS: a Checkout Session dispara
 *    `checkout.session.completed` com `payment_status` ainda não "paid" e o
 *    pagamento confirma depois. Sem tratar `async_payment_succeeded`, um
 *    pagamento por Pix/boleto NUNCA marcaria a reserva como paga.
 *
 * 2. Reembolso e disputa perdida são os dois caminhos de "o dinheiro voltou
 *    pro locatário" — os DOIS precisam devolver a parte do repasse que já
 *    tinha saído para o proprietário.
 *
 * `@jest-environment node`: a rota usa Request/Response da Web API.
 */
import { POST } from "@/app/api/webhooks/stripe/route"

const mockConstructEvent  = jest.fn()
const mockMarkRentalPaid  = jest.fn()
const mockReverseTransfer = jest.fn()

const mockQueueFindUnique = jest.fn()
const mockQueueUpsert     = jest.fn()
const mockQueueUpdate     = jest.fn()

const mockBookingUpdateMany           = jest.fn()
const mockBookingUpdateManyAndReturn  = jest.fn()
const mockUserFindMany                = jest.fn()
const mockNotificationCreateMany      = jest.fn()

jest.mock("@/lib/stripe", () => ({
  ...jest.requireActual("@/lib/stripe"),
  getStripe: () => ({ webhooks: { constructEvent: (...a: unknown[]) => mockConstructEvent(...a) } }),
}))

jest.mock("@/lib/payments/mark-booking-paid", () => ({
  markRentalPaid: (...a: unknown[]) => mockMarkRentalPaid(...a),
}))

jest.mock("@/lib/payments/owner-transfer", () => ({
  reverseOwnerTransfer: (...a: unknown[]) => mockReverseTransfer(...a),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    stripeEventQueue: {
      findUnique: (...a: unknown[]) => mockQueueFindUnique(...a),
      upsert:     (...a: unknown[]) => mockQueueUpsert(...a),
      update:     (...a: unknown[]) => mockQueueUpdate(...a),
    },
    booking: {
      updateMany:           (...a: unknown[]) => mockBookingUpdateMany(...a),
      updateManyAndReturn:  (...a: unknown[]) => mockBookingUpdateManyAndReturn(...a),
    },
    user:         { findMany: (...a: unknown[]) => mockUserFindMany(...a) },
    notification: { createMany: (...a: unknown[]) => mockNotificationCreateMany(...a) },
  },
}))

jest.mock("@/lib/ambassador", () => ({ cancelAmbassadorCommissions: jest.fn() }))

process.env.STRIPE_WEBHOOK_SECRET = "whsec_teste"

function requisicao(payload: unknown) {
  return new Request("https://staging.shareo.com.br/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "t=1,v1=fake" }, // constructEvent é mockado
    body: JSON.stringify(payload),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockConstructEvent.mockImplementation((body: string) => JSON.parse(body))
  mockQueueFindUnique.mockResolvedValue(null)
  mockQueueUpsert.mockResolvedValue({})
  mockQueueUpdate.mockResolvedValue({})
  mockBookingUpdateMany.mockResolvedValue({ count: 1 })
  mockBookingUpdateManyAndReturn.mockResolvedValue([{ id: "booking-1", totalPrice: 10000 }])
  mockUserFindMany.mockResolvedValue([])
  mockNotificationCreateMany.mockResolvedValue({})
  mockMarkRentalPaid.mockResolvedValue(undefined)
  mockReverseTransfer.mockResolvedValue(undefined)
  jest.spyOn(console, "warn").mockImplementation(() => {})
  jest.spyOn(console, "error").mockImplementation(() => {})
})

// ── Pix/boleto: pagamento assíncrono ────────────────────────────────────────

it("completed com payment_status pendente NÃO marca pago — aguarda a confirmação assíncrona", async () => {
  const res = await POST(requisicao({
    id: "evt_1", type: "checkout.session.completed",
    data: { object: { id: "cs_1", payment_status: "unpaid", metadata: { bookingId: "booking-1" } } },
  }))

  expect(res.status).toBe(200)
  expect(mockMarkRentalPaid).not.toHaveBeenCalled()
})

it("async_payment_succeeded marca a reserva como paga (Pix/boleto confirmados)", async () => {
  const res = await POST(requisicao({
    id: "evt_2", type: "checkout.session.async_payment_succeeded",
    data: { object: { id: "cs_1", payment_status: "paid", payment_intent: "pi_1", metadata: { bookingId: "booking-1" } } },
  }))

  expect(res.status).toBe(200)
  expect(mockMarkRentalPaid).toHaveBeenCalledWith({ bookingId: "booking-1", stripePaymentIntentId: "pi_1" })
})

it("completed com cartão (já paid) marca a reserva como paga", async () => {
  await POST(requisicao({
    id: "evt_3", type: "checkout.session.completed",
    data: { object: { id: "cs_1", payment_status: "paid", payment_intent: "pi_1", metadata: { bookingId: "booking-1" } } },
  }))

  expect(mockMarkRentalPaid).toHaveBeenCalledWith({ bookingId: "booking-1", stripePaymentIntentId: "pi_1" })
})

it.each([
  ["checkout.session.async_payment_failed"],
  ["checkout.session.expired"],
])("%s libera nova tentativa sem tocar em reserva já paga", async (type) => {
  const res = await POST(requisicao({
    id: `evt_${type}`, type,
    data: { object: { id: "cs_1", metadata: { bookingId: "booking-1" } } },
  }))

  expect(res.status).toBe(200)
  expect(mockBookingUpdateMany).toHaveBeenCalledWith({
    where: { id: "booking-1", paymentStatus: { not: "PAID" } },
    data:  { stripeSessionId: null },
  })
})

// ── Devolução de dinheiro: os dois caminhos ─────────────────────────────────

it("charge.refunded marca REFUNDED e devolve a parte proporcional do repasse", async () => {
  const res = await POST(requisicao({
    id: "evt_5", type: "charge.refunded",
    data: { object: { id: "ch_1", payment_intent: "pi_1", amount: 10000, amount_refunded: 5000 } },
  }))

  expect(res.status).toBe(200)
  expect(mockBookingUpdateManyAndReturn).toHaveBeenCalledWith(expect.objectContaining({
    where: { stripePaymentIntentId: "pi_1" },
    data:  { paymentStatus: "REFUNDED" },
  }))
  expect(mockReverseTransfer).toHaveBeenCalledWith(expect.objectContaining({
    bookingId: "booking-1", clawbackAmount: 5000, chargedAmount: 10000,
  }))
})

it("falha ao reverter propaga 500 para a Stripe retentar — dinheiro não fica no lugar errado em silêncio", async () => {
  mockReverseTransfer.mockRejectedValue(new Error("Stripe fora do ar"))

  const res = await POST(requisicao({
    id: "evt_6", type: "charge.refunded",
    data: { object: { id: "ch_1", payment_intent: "pi_1", amount: 10000, amount_refunded: 10000 } },
  }))

  expect(res.status).toBe(500)
  expect(mockQueueUpdate).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ status: "FAILED" }),
  }))
})

it("charge.dispute.created marca DISPUTED e avisa os admins financeiros", async () => {
  mockBookingUpdateMany.mockResolvedValue({ count: 1 })
  mockUserFindMany.mockResolvedValue([{ id: "admin-1" }, { id: "admin-2" }])

  const res = await POST(requisicao({
    id: "evt_disp", type: "charge.dispute.created",
    data: { object: { id: "dp_1", amount: 10000, payment_intent: "pi_1" } },
  }))

  expect(res.status).toBe(200)
  expect(mockBookingUpdateMany).toHaveBeenCalledWith({
    where: { stripePaymentIntentId: "pi_1" },
    data:  { status: "DISPUTED", stripeDisputeId: "dp_1" },
  })
  // Uma chamada só para os dois admins — o repasse fica retido enquanto
  // a reserva estiver DISPUTED (o cron de payout exclui DISPUTED).
  expect(mockNotificationCreateMany).toHaveBeenCalledTimes(1)
  expect(mockNotificationCreateMany.mock.calls[0][0].data).toHaveLength(2)
})

it("disputa PERDIDA cancela a reserva e devolve o repasse (o outro caminho do estorno)", async () => {
  await POST(requisicao({
    id: "evt_7", type: "charge.dispute.closed",
    data: { object: { id: "dp_1", status: "lost", amount: 10000, payment_intent: "pi_1" } },
  }))

  expect(mockBookingUpdateManyAndReturn).toHaveBeenCalledWith(expect.objectContaining({
    data: { status: "CANCELLED" },
  }))
  expect(mockReverseTransfer).toHaveBeenCalledWith(expect.objectContaining({
    bookingId: "booking-1", clawbackAmount: 10000, chargedAmount: 10000,
  }))
})

it("disputa GANHA volta a reserva para COMPLETED e não mexe no repasse", async () => {
  await POST(requisicao({
    id: "evt_8", type: "charge.dispute.closed",
    data: { object: { id: "dp_1", status: "won", amount: 10000, payment_intent: "pi_1" } },
  }))

  expect(mockBookingUpdateManyAndReturn).toHaveBeenCalledWith(expect.objectContaining({
    data: { status: "COMPLETED" },
  }))
  expect(mockReverseTransfer).not.toHaveBeenCalled()
})

// ── Fila de eventos ─────────────────────────────────────────────────────────

it("evento já COMPLETED sai como duplicado sem reprocessar", async () => {
  mockQueueFindUnique.mockResolvedValue({ status: "COMPLETED" })

  const res = await POST(requisicao({
    id: "evt_9", type: "checkout.session.async_payment_succeeded",
    data: { object: { id: "cs_1", payment_status: "paid", metadata: { bookingId: "booking-1" } } },
  }))

  expect(res.status).toBe(200)
  await expect(res.json()).resolves.toMatchObject({ duplicate: true })
  expect(mockMarkRentalPaid).not.toHaveBeenCalled()
})

it("recusa requisição sem assinatura", async () => {
  const res = await POST(new Request("https://staging.shareo.com.br/api/webhooks/stripe", {
    method: "POST", body: "{}",
  }))

  expect(res.status).toBe(400)
  expect(mockQueueUpsert).not.toHaveBeenCalled()
})
