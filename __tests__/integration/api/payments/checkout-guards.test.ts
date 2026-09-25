/** @jest-environment node */
/**
 * POST /api/payments/checkout — guardas da cobrança real (go-live 01/10/2026).
 *
 * Arquivo fonte: app/api/payments/checkout/route.ts
 * Guardas:       lib/payments/charge-guards.ts (teste unitário em charge-guards.test.ts)
 *
 * Este arquivo prova a PLUMBAGEM: que a rota consulta as guardas ANTES de chamar
 * a Stripe, com o código e o status certos, e que o modo teste (staging) segue
 * funcionando como sempre. A matriz completa de cada guarda (valores do
 * interruptor, status da conta, banco fora do ar) mora em charge-guards.test.ts.
 */
import { NextRequest, NextResponse } from "next/server"
import { POST } from "@/app/api/payments/checkout/route"
import { clearPlatformConfigCache } from "@/lib/platform-config"

const mockWithUser       = jest.fn()
const mockBookingFind    = jest.fn()
const mockBookingUpdate  = jest.fn()
const mockConfigFindMany = jest.fn()
const mockAccountFind    = jest.fn()
const mockSessionCreate  = jest.fn()

jest.mock("@/lib/withUser", () => ({ withUser: (...a: unknown[]) => mockWithUser(...a) }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    booking:             { findUnique: (...a: unknown[]) => mockBookingFind(...a), update: (...a: unknown[]) => mockBookingUpdate(...a) },
    platformConfig:      { findMany:   (...a: unknown[]) => mockConfigFindMany(...a) },
    ownerPaymentAccount: { findUnique: (...a: unknown[]) => mockAccountFind(...a) },
  },
}))
jest.mock("@/lib/stripe", () => ({
  getStripe: () => ({ checkout: { sessions: { create: (...a: unknown[]) => mockSessionCreate(...a) } } }),
}))
jest.mock("@/lib/rateLimit", () => ({
  checkRateLimit:    jest.fn().mockResolvedValue({ allowed: true, resetAt: 0 }),
  rateLimitResponse: jest.fn(),
  RATE_LIMITS:       { checkout: { limit: 10, windowMs: 60_000 } },
}))
jest.mock("@/lib/app-url", () => ({ APP_URL: "https://app.shareo.test" }))

const BORROWER = "borrower-1"
const OWNER    = "owner-1"

function req() {
  return new NextRequest("http://localhost/api/payments/checkout", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ bookingId: "bk-1" }),
  })
}

function booking(over: Record<string, unknown> = {}) {
  return {
    id: "bk-1", borrowerId: BORROWER, ownerId: OWNER, status: "CONFIRMED", paymentStatus: "PENDING",
    totalPrice: 10_000, discountCents: 0, totalDays: 2,
    startDate: new Date("2026-10-10T12:00:00Z"), endDate: new Date("2026-10-12T12:00:00Z"),
    item:     { title: "Furadeira", images: [] },
    borrower: { email: "loc@ex.com", name: "Loc" },
    ...over,
  }
}

const CONNECT_ACTIVE = { pixKey: null, status: "PENDING_VERIFICATION", stripeAccountId: "acct_1", stripeConnectStatus: "ACTIVE" }

const CHAVE_ORIGINAL = process.env.STRIPE_SECRET_KEY
const setKey = (v: string) => { process.env.STRIPE_SECRET_KEY = v }
const billing = (v: string | null) =>
  mockConfigFindMany.mockResolvedValue(v === null ? [] : [{ key: "billingEnabled", value: v }])

beforeEach(() => {
  jest.clearAllMocks()
  clearPlatformConfigCache()
  mockWithUser.mockResolvedValue({ id: BORROWER })
  mockBookingFind.mockResolvedValue(booking())
  mockBookingUpdate.mockResolvedValue({})
  mockSessionCreate.mockResolvedValue({ id: "cs_1", url: "https://checkout.stripe.com/c/1" })
  billing(null)
  mockAccountFind.mockResolvedValue(CONNECT_ACTIVE)
})
afterAll(() => {
  if (CHAVE_ORIGINAL === undefined) delete process.env.STRIPE_SECRET_KEY
  else process.env.STRIPE_SECRET_KEY = CHAVE_ORIGINAL
})

describe("guarda A — cobrança real fechada por padrão", () => {
  it("🪤 chave LIVE sem billingEnabled: 403 BILLING_CLOSED e a Stripe NÃO é chamada", async () => {
    setKey("sk_live_abc")
    const res  = await POST(req())
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error.code).toBe("BILLING_CLOSED")
    expect(json.error.message).toMatch(/^Os pagamentos ainda não estão abertos\./)
    expect(mockSessionCreate).not.toHaveBeenCalled()
    expect(mockBookingUpdate).not.toHaveBeenCalled() // nada gravado (nem split) sem cobrança
  })

  it("chave LIVE com billingEnabled=true e dono pronto: 200 e sessão criada", async () => {
    setKey("sk_live_abc"); billing("true")
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect((await res.json()).data.url).toContain("checkout.stripe.com")
    expect(mockSessionCreate).toHaveBeenCalledTimes(1)
    expect(mockBookingUpdate).toHaveBeenCalledTimes(1)
  })

  it("chave de TESTE sem billingEnabled: 200 — o staging segue funcionando como hoje", async () => {
    setKey("sk_test_abc"); billing(null)
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(mockSessionCreate).toHaveBeenCalledTimes(1)
  })
})

describe("guarda B — proprietário sem caminho de repasse", () => {
  beforeEach(() => { setKey("sk_live_abc"); billing("true") })

  it("🪤 sem OwnerPaymentAccount: 409 OWNER_NOT_READY e a Stripe NÃO é chamada", async () => {
    mockAccountFind.mockResolvedValue(null)
    const res  = await POST(req())
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error.code).toBe("OWNER_NOT_READY")
    expect(json.error.message).toContain("proprietário ainda não configurou o recebimento")
    expect(mockAccountFind).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: OWNER } }))
    expect(mockSessionCreate).not.toHaveBeenCalled()
    expect(mockBookingUpdate).not.toHaveBeenCalled()
  })

})

describe("ordem e precedência", () => {
  it("🪤 reserva JÁ PAGA com a cobrança fechada: diz ALREADY_PAID (409), não 'pagamentos fechados'", async () => {
    setKey("sk_live_abc")
    mockBookingFind.mockResolvedValue(booking({ paymentStatus: "PAID" }))
    const res = await POST(req())
    expect(res.status).toBe(409)
    expect((await res.json()).error.code).toBe("ALREADY_PAID")
  })

  it("as validações da reserva continuam antes das guardas (não confirmada → 422)", async () => {
    setKey("sk_live_abc")
    mockBookingFind.mockResolvedValue(booking({ status: "PENDING" }))
    const res = await POST(req())
    expect(res.status).toBe(422)
    expect((await res.json()).error.code).toBe("BOOKING_NOT_CONFIRMED")
  })

  it("quem não é o locatário continua levando 403 FORBIDDEN, não as guardas", async () => {
    setKey("sk_live_abc")
    mockWithUser.mockResolvedValue({ id: "intruso" })
    const res = await POST(req())
    expect(res.status).toBe(403)
    expect((await res.json()).error.code).toBe("FORBIDDEN")
  })

  it("não autenticado: a resposta do withUser passa direto", async () => {
    setKey("sk_live_abc")
    mockWithUser.mockResolvedValue(NextResponse.json({ error: "x" }, { status: 401 }))
    const res = await POST(req())
    expect(res.status).toBe(401)
  })
})
