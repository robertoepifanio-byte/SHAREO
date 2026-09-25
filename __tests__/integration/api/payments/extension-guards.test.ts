/** @jest-environment node */
/**
 * POST /api/payments/extension — guardas da cobrança real (go-live 01/10/2026).
 *
 * Arquivo fonte: app/api/payments/extension/route.ts
 * Guardas:       lib/payments/charge-guards.ts
 *
 * A extensão é uma cobrança independente da locação: sem as guardas aqui seria o
 * caminho que passa por fora do interruptor e de um proprietário sem como receber.
 * Só a plumbagem: a matriz de cada guarda está em charge-guards.test.ts.
 */
import { NextRequest } from "next/server"
import { POST } from "@/app/api/payments/extension/route"
import { clearPlatformConfigCache } from "@/lib/platform-config"

const mockResolveUserId  = jest.fn()
const mockBookingFind    = jest.fn()
const mockConfigFindMany = jest.fn()
const mockAccountFind    = jest.fn()
const mockSessionCreate  = jest.fn()

jest.mock("@/lib/resolveUserId", () => ({ resolveUserId: (...a: unknown[]) => mockResolveUserId(...a) }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    booking:             { findUnique: (...a: unknown[]) => mockBookingFind(...a) },
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
  return new NextRequest("http://localhost/api/payments/extension", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ bookingId: "bk-1" }),
  })
}

function booking(over: Record<string, unknown> = {}) {
  return {
    id: "bk-1", borrowerId: BORROWER, ownerId: OWNER, status: "ACTIVE",
    extensionStatus: "AWAITING_PAYMENT", extensionAmountCents: 10_500,
    extensionRequestedEndDate: new Date("2026-10-15T12:00:00Z"),
    item:     { title: "Furadeira", images: [] },
    borrower: { email: "loc@ex.com" },
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
  mockResolveUserId.mockResolvedValue(BORROWER)
  mockBookingFind.mockResolvedValue(booking())
  mockSessionCreate.mockResolvedValue({ id: "cs_ext", url: "https://checkout.stripe.com/c/ext" })
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
  })

  it("chave LIVE com billingEnabled=true e dono pronto: 200", async () => {
    setKey("sk_live_abc"); billing("true")
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(mockSessionCreate).toHaveBeenCalledTimes(1)
  })

  it("chave de TESTE sem billingEnabled: 200 (staging segue como hoje)", async () => {
    setKey("sk_test_abc")
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(mockSessionCreate).toHaveBeenCalledTimes(1)
  })
})

describe("guarda B — proprietário sem caminho de repasse", () => {
  beforeEach(() => { setKey("sk_live_abc"); billing("true") })

  it("🪤 sem conta de recebimento: 409 OWNER_NOT_READY e a Stripe NÃO é chamada", async () => {
    mockAccountFind.mockResolvedValue(null)
    const res  = await POST(req())
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error.code).toBe("OWNER_NOT_READY")
    expect(json.error.message).toContain("proprietário ainda não configurou o recebimento")
    expect(mockAccountFind).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: OWNER } }))
    expect(mockSessionCreate).not.toHaveBeenCalled()
  })

})

describe("ordem e precedência", () => {
  it("sem extensão aguardando pagamento: 422 NO_EXTENSION_TO_PAY antes das guardas", async () => {
    setKey("sk_live_abc")
    mockBookingFind.mockResolvedValue(booking({ extensionStatus: "NONE", extensionAmountCents: null }))
    const res = await POST(req())
    expect(res.status).toBe(422)
    expect((await res.json()).error.code).toBe("NO_EXTENSION_TO_PAY")
  })

  it("quem não é o locatário: 403 FORBIDDEN (não as guardas)", async () => {
    setKey("sk_live_abc")
    mockResolveUserId.mockResolvedValue("intruso")
    const res = await POST(req())
    expect(res.status).toBe(403)
    expect((await res.json()).error.code).toBe("FORBIDDEN")
  })

  it("não autenticado: 401", async () => {
    mockResolveUserId.mockResolvedValue(null)
    const res = await POST(req())
    expect(res.status).toBe(401)
  })
})
