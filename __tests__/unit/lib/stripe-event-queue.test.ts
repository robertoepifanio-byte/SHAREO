/** @jest-environment node */
/**
 * Envelope de idempotência dos webhooks do Stripe.
 *
 * Arquivo fonte: lib/payments/stripe-event-queue.ts
 *
 * Por que este teste existe: em 21/08/2026 TODO evento de Connect morria com
 * 500 em staging — inclusive o ping de verificação. A assinatura conferia; o
 * que quebrava era o `upsert` da fila.
 *
 * Causa: o payload dos eventos v2 NÃO é JSON puro. `parseEventNotification`
 * anexa métodos (`fetchEvent`, `fetchRelatedObject`) e um `StripeContext` ao
 * objeto que devolve, e o Prisma recusa isso numa coluna Json. O caminho v1
 * nunca sofreu porque `constructEvent` devolve o resultado cru de um
 * `JSON.parse` — por isso o bug só apareceu quando o webhook de Connect
 * entrou.
 *
 * O `as Prisma.InputJsonValue` que existia no lugar não protegia nada: era o
 * cast que escondia o problema do compilador.
 */
import { withStripeEventQueue } from "@/lib/payments/stripe-event-queue"

const mockFindUnique = jest.fn()
const mockUpsert     = jest.fn()
const mockUpdate     = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    stripeEventQueue: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      upsert:     (...a: unknown[]) => mockUpsert(...a),
      update:     (...a: unknown[]) => mockUpdate(...a),
    },
  },
}))

beforeEach(() => {
  jest.clearAllMocks()
  mockFindUnique.mockResolvedValue(null)
  mockUpsert.mockResolvedValue({})
  mockUpdate.mockResolvedValue({})
  jest.spyOn(console, "warn").mockImplementation(() => {})
  jest.spyOn(console, "error").mockImplementation(() => {})
})

/** Espelha o que `stripe.parseEventNotification` devolve: dados + métodos. */
function notificacaoV2() {
  return {
    id:       "evt_test_ping",
    object:   "v2.core.event",
    type:     "v2.core.event_destination.ping",
    livemode: false,
    related_object: { id: "ed_test_1", type: "v2.core.event_destination", url: "/v2/core/event_destinations/ed_test_1" },
    context:  { toString: () => "ctx" },
    fetchEvent:         () => Promise.resolve({}),
    fetchRelatedObject: () => Promise.resolve({}),
  }
}

it("grava o payload v2 como JSON puro — sem os métodos que o SDK anexa", async () => {
  const res = await withStripeEventQueue(
    { id: "evt_test_ping", type: "v2.core.event_destination.ping", payload: notificacaoV2() },
    "[teste]",
    async () => {},
  )

  expect(res.status).toBe(200)

  const gravado = mockUpsert.mock.calls[0][0].create.payload
  // O que quebrava em produção: função dentro de coluna Json.
  expect(typeof gravado.fetchEvent).toBe("undefined")
  expect(typeof gravado.fetchRelatedObject).toBe("undefined")
  // E os dados de auditoria continuam lá.
  expect(gravado).toMatchObject({ id: "evt_test_ping", type: "v2.core.event_destination.ping" })
})

it("payload circular não derruba o webhook — a linha da fila vale mais que a auditoria", async () => {
  const circular: Record<string, unknown> = { id: "evt_1" }
  circular.self = circular

  const res = await withStripeEventQueue(
    { id: "evt_1", type: "v2.core.account[requirements].updated", payload: circular },
    "[teste]",
    async () => {},
  )

  expect(res.status).toBe(200)
  expect(mockUpsert.mock.calls[0][0].create.payload).toEqual({})
})

it("evento já COMPLETED sai como duplicado sem reprocessar", async () => {
  mockFindUnique.mockResolvedValue({ status: "COMPLETED" })
  const handler = jest.fn()

  const res = await withStripeEventQueue({ id: "evt_2", type: "x", payload: {} }, "[teste]", handler)

  expect(res.status).toBe(200)
  await expect(res.json()).resolves.toMatchObject({ duplicate: true })
  expect(handler).not.toHaveBeenCalled()
  expect(mockUpsert).not.toHaveBeenCalled()
})

it("handler que lança vira 500 e marca FAILED — e a Stripe retenta", async () => {
  const res = await withStripeEventQueue(
    { id: "evt_3", type: "x", payload: {} },
    "[teste]",
    async () => { throw new Error("falhou") },
  )

  expect(res.status).toBe(500)
  expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ status: "FAILED", lastError: "falhou" }),
  }))
})
