/** @jest-environment node */
/**
 * POST /api/bookings/[id]/late-fee/pay — locatário paga a taxa de atraso pela tela.
 */
import { NextRequest } from "next/server"
import { POST } from "@/app/api/bookings/[id]/late-fee/pay/route"

const mockFind     = jest.fn()
const mockUser     = jest.fn()
const mockEmitir   = jest.fn()
const mockRetrieve = jest.fn()

jest.mock("@/lib/prisma", () => ({ prisma: { booking: { findUnique: (...a: unknown[]) => mockFind(...a) } } }))
jest.mock("@/lib/resolveUserId", () => ({ resolveUserId: (...a: unknown[]) => mockUser(...a) }))
jest.mock("@/lib/rateLimit", () => ({
  checkRateLimit: async () => ({ allowed: true }),
  rateLimitResponse: jest.fn(),
  RATE_LIMITS: { checkout: { limit: 10, windowMs: 60_000 } },
}))
jest.mock("@/lib/email", () => ({ bookingItemsLabel: (t: string) => t }))
jest.mock("@/lib/stripe", () => ({
  getStripe: () => ({ checkout: { sessions: { retrieve: (...a: unknown[]) => mockRetrieve(...a) } } }),
}))
jest.mock("@/lib/platform-config", () => ({
  ...jest.requireActual("@/lib/platform-config"),
  getLateFeeMultiplier: async () => 1.5,
}))
jest.mock("@/lib/lateFee", () => ({
  ...jest.requireActual("@/lib/lateFee"),
  emitirCobrancaTaxaAtraso: (...a: unknown[]) => mockEmitir(...a),
}))

const call = () =>
  POST(new NextRequest("http://x/api/bookings/bk-1/late-fee/pay", { method: "POST" }), {
    params: Promise.resolve({ id: "bk-1" }),
  })

function booking(over: Record<string, unknown> = {}) {
  return {
    id: "bk-1", status: "RETURNED", deletedAt: null, borrowerId: "loc",
    endDate: new Date("2026-10-01T12:00:00Z"), dailyPrice: 1000,
    returnRequestedAt: new Date("2026-10-04T12:00:00Z"), returnedAt: null,
    lateFeeAmount: 4500, lateFeePaymentIntentId: null,
    lateFeeSessionId: "cs_old", lateFeeSessionExpiresAt: new Date("2026-10-05T00:00:00Z"),
    borrower: { email: "l@x.com", name: "Loc" },
    item: { title: "Furadeira", images: [] },
    _count: { bookingItems: 1 },
    ...over,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUser.mockResolvedValue("loc")
  mockFind.mockResolvedValue(booking())
  mockEmitir.mockResolvedValue({ emitida: true, reemissao: true, valor: 4500, anterior: 4500, url: "https://checkout/novo" })
})

it("401 sem sessão", async () => {
  mockUser.mockResolvedValue(null)
  expect((await call()).status).toBe(401)
})

it("403 para quem não é o locatário (nem o proprietário)", async () => {
  mockUser.mockResolvedValue("dono")
  expect((await call()).status).toBe(403)
  expect(mockEmitir).not.toHaveBeenCalled()
})

it("422 se a taxa já foi paga", async () => {
  mockFind.mockResolvedValue(booking({ lateFeePaymentIntentId: "pi_1" }))
  const res = await call()
  expect(res.status).toBe(422)
  expect((await res.json()).error.code).toBe("JA_QUITADA")
  expect(mockEmitir).not.toHaveBeenCalled()
})

it("422 se não há taxa aplicada", async () => {
  mockFind.mockResolvedValue(booking({ lateFeeAmount: null }))
  expect((await call()).status).toBe(422)
})

it("403 BILLING_CLOSED quando a cobrança real está fechada", async () => {
  mockEmitir.mockResolvedValue({ emitida: false, motivo: "COBRANCA_FECHADA" })
  const res = await call()
  expect(res.status).toBe(403)
  expect((await res.json()).error.code).toBe("BILLING_CLOSED")
})

it("sucesso: devolve a URL, sem e-mail, com valor congelado na devolução (3 dias × 1,5 × R$10)", async () => {
  const res = await call()
  expect(res.status).toBe(200)
  expect((await res.json()).data.url).toBe("https://checkout/novo")
  const [, , valor, dias, fim, , enviarEmail] = mockEmitir.mock.calls[0]
  expect(valor).toBe(4500)
  expect(dias).toBe(3)
  expect(fim).toEqual(new Date("2026-10-04T12:00:00Z"))
  expect(enviarEmail).toBe(false)
})

it("reserva ainda ACTIVE: respeita o teto de 30 dias", async () => {
  mockFind.mockResolvedValue(booking({
    status: "ACTIVE", returnRequestedAt: null, endDate: new Date("2026-01-01T12:00:00Z"), lateFeeAmount: 1500,
  }))
  await call()
  expect(mockEmitir.mock.calls[0][3]).toBe(30)
  expect(mockEmitir.mock.calls[0][2]).toBe(45_000)
})

it("cobrança viva pelo valor certo: reaproveita a URL da sessão aberta", async () => {
  mockEmitir.mockResolvedValue({ emitida: false, motivo: "COBRANCA_ATUAL_VIVA" })
  mockRetrieve.mockResolvedValue({ status: "open", url: "https://checkout/viva" })
  const res = await call()
  expect((await res.json()).data.url).toBe("https://checkout/viva")
})
