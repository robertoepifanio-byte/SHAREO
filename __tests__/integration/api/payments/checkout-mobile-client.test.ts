/** @jest-environment node */
/**
 * POST /api/payments/checkout — suporte ao client="mobile"
 *
 * Verifica que, quando o app mobile envia client="mobile", a Checkout Session
 * da Stripe recebe URLs de retorno com deep link shareo:// em vez das URLs web.
 * Quando client="web" (ou ausente), as URLs web seguem inalteradas.
 */
import { NextRequest } from "next/server"
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
jest.mock("@/lib/payments/charge-guards", () => ({
  checkChargeGuards: jest.fn().mockResolvedValue(null), // null = sem bloqueio
}))

const BORROWER = "borrower-1"
const OWNER    = "owner-1"
const BK_ID    = "bk-mobile-1"

function makeBooking() {
  return {
    id: BK_ID, borrowerId: BORROWER, ownerId: OWNER, status: "CONFIRMED", paymentStatus: "PENDING",
    totalPrice: 10_000, discountCents: 0, totalDays: 2,
    startDate: new Date("2026-10-10T12:00:00Z"), endDate: new Date("2026-10-12T12:00:00Z"),
    item:     { title: "Furadeira", images: [] },
    borrower: { email: "loc@ex.com", name: "Loc" },
  }
}

function stubHappyPath() {
  mockWithUser.mockResolvedValue({ id: BORROWER, email: "loc@ex.com" })
  mockBookingFind.mockResolvedValue(makeBooking())
  mockConfigFindMany.mockResolvedValue([
    { key: "platformFeeRateBps", value: "1500" },
  ])
  mockSessionCreate.mockResolvedValue({ id: "cs_test", url: "https://checkout.stripe.com/test" })
  mockBookingUpdate.mockResolvedValue({})
}

beforeEach(() => {
  jest.clearAllMocks()
  clearPlatformConfigCache()
})

describe("checkout client=mobile — deep links", () => {
  it("usa deep link shareo:// no success_url e cancel_url quando client=mobile", async () => {
    stubHappyPath()

    const res = await POST(new NextRequest("http://localhost/api/payments/checkout", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ bookingId: BK_ID, client: "mobile" }),
    }))

    expect(res.status).toBe(200)
    const createCall = mockSessionCreate.mock.calls[0][0]
    expect(createCall.success_url).toBe(`shareo://reservas/sucesso?bookingId=${BK_ID}`)
    expect(createCall.cancel_url).toBe(`shareo://reservas/${BK_ID}?payment=cancelled`)
  })

  it("usa URLs web quando client=web (padrão)", async () => {
    stubHappyPath()

    const res = await POST(new NextRequest("http://localhost/api/payments/checkout", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ bookingId: BK_ID, client: "web" }),
    }))

    expect(res.status).toBe(200)
    const createCall = mockSessionCreate.mock.calls[0][0]
    expect(createCall.success_url).toBe(`https://app.shareo.test/reservas/sucesso?bookingId=${BK_ID}`)
    expect(createCall.cancel_url).toBe(`https://app.shareo.test/reservas/${BK_ID}?payment=cancelled`)
  })

  it("usa URLs web quando client omitido (retrocompatibilidade)", async () => {
    stubHappyPath()

    const res = await POST(new NextRequest("http://localhost/api/payments/checkout", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ bookingId: BK_ID }),
    }))

    expect(res.status).toBe(200)
    const createCall = mockSessionCreate.mock.calls[0][0]
    expect(createCall.success_url).toContain("https://app.shareo.test")
    expect(createCall.cancel_url).toContain("https://app.shareo.test")
  })
})
