/** @jest-environment node */
/**
 * QA-CRIT-02 — Testes de integração para POST /api/bookings
 *
 * Arquivo fonte: app/api/bookings/route.ts
 *
 * Maior gap de cobertura apontado pela auditoria s33: a criação de reserva não
 * tinha teste do happy-path nem dos caminhos de erro. Cobre os gates de
 * autenticação/cadastro, validações de item/dono, requisitos do proprietário,
 * cupom, teto R$500, conflito de datas e o caminho feliz (201).
 */

import { NextRequest } from "next/server"
import { POST } from "@/app/api/bookings/route"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUserFindUnique  = jest.fn()
const mockItemFindMany    = jest.fn()
const mockNotifCreate     = jest.fn().mockResolvedValue({})
const mockBookingCreate   = jest.fn()
const mockBookingItemCM   = jest.fn().mockResolvedValue({ count: 1 })
const mockConversationCM  = jest.fn()
const mockCouponUpdateMany = jest.fn().mockResolvedValue({ count: 1 })

jest.mock("@/lib/prisma", () => {
  const tx = {
    booking:      { create:     (...a: unknown[]) => mockBookingCreate(...a) },
    bookingItem:  { createMany: (...a: unknown[]) => mockBookingItemCM(...a) },
    conversation: { create:     (...a: unknown[]) => mockConversationCM(...a) },
    coupon:       { updateMany:  (...a: unknown[]) => mockCouponUpdateMany(...a) },
  }
  return {
    prisma: {
      user:         { findUnique: (...a: unknown[]) => mockUserFindUnique(...a) },
      item:         { findMany:   (...a: unknown[]) => mockItemFindMany(...a) },
      notification: { create:     (...a: unknown[]) => mockNotifCreate(...a) },
      // POST cria booking+itens+conversa em $transaction Serializable
      $transaction: (fn: (t: unknown) => unknown) => fn(tx),
    },
  }
})

const mockResolveUserId = jest.fn()
jest.mock("@/lib/resolveUserId", () => ({
  resolveUserId: (...a: unknown[]) => mockResolveUserId(...a),
}))

const mockFindOverlappingItem = jest.fn().mockResolvedValue(null) // sem conflito por padrão
jest.mock("@/lib/booking-availability", () => ({
  findOverlappingItem: (...a: unknown[]) => mockFindOverlappingItem(...a),
}))

const mockValidateCoupon = jest.fn()
jest.mock("@/lib/coupons", () => ({
  validateCoupon: (...a: unknown[]) => mockValidateCoupon(...a),
}))

// pricing puro mockado p/ totais previsíveis: total = diária × dias
jest.mock("@/lib/pricing", () => ({
  calcBookingTotal: (days: number, perDay: number) => ({ totalPrice: perDay * days }),
}))

jest.mock("@/lib/outboundWebhooks", () => ({
  dispatchWebhookEvent: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/rateLimit", () => ({
  checkRateLimit:    jest.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: jest.fn(),
  RATE_LIMITS:       {},
}))

// ---------------------------------------------------------------------------
// IDs (cuid-válidos onde o schema exige)
// ---------------------------------------------------------------------------

const BORROWER_ID = "ckborrower0000000000001"
const OWNER_ID    = "ckowner00000000000000001"
const ITEM_ID     = "ckitemaaaaaaaaaaaaaaa01"
const ITEM_ID_2   = "ckitemaaaaaaaaaaaaaaa02"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isoInDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(12, 0, 0, 0)
  return d.toISOString()
}

/** Body válido (período de 3 dias a partir de depois de amanhã). */
function validBody(overrides: Record<string, unknown> = {}) {
  return { itemId: ITEM_ID, startDate: isoInDays(2), endDate: isoInDays(5), ...overrides }
}

function makeReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/bookings", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  })
}

/** Usuário verificado + cadastro completo + sem restrições. */
function verifiedUser(overrides: Record<string, unknown> = {}) {
  return {
    emailVerified:        new Date(),
    profileCompletedAt:   new Date(),
    idVerificationStatus: "VERIFIED",
    phone:                "+5511999999999",
    name:                 "Locatário Teste",
    ...overrides,
  }
}

/** Item disponível padrão (R$100/dia, dono ≠ locatário, sem requisitos). */
function availableItem(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID, ownerId: OWNER_ID, title: "Furadeira Bosch",
    pricePerDay: 10000, pricePerWeek: null, pricePerMonth: null, depositAmount: null,
    requireIdVerification: false, requirePhone: false,
    ...overrides,
  }
}

function happyBookingCreateResult() {
  return {
    id: "ckbooking000000000000001", status: "PENDING",
    startDate: new Date(isoInDays(2)), endDate: new Date(isoInDays(5)),
    totalDays: 3, dailyPrice: 10000, totalPrice: 30000, depositAmount: null,
    borrowerNote: null, createdAt: new Date(),
    item: { title: "Furadeira Bosch", images: [], owner: { id: OWNER_ID, name: "Dono", avatarUrl: null } },
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()
  mockResolveUserId.mockResolvedValue(BORROWER_ID)
  mockUserFindUnique.mockResolvedValue(verifiedUser())
  mockItemFindMany.mockResolvedValue([availableItem()])
  mockFindOverlappingItem.mockResolvedValue(null)
  mockNotifCreate.mockResolvedValue({})
  mockBookingItemCM.mockResolvedValue({ count: 1 })
  mockCouponUpdateMany.mockResolvedValue({ count: 1 })
  mockBookingCreate.mockResolvedValue(happyBookingCreateResult())
  mockConversationCM.mockResolvedValue({ id: "ckconv0000000000000001" })
})

async function call(body: Record<string, unknown>) {
  const res  = await POST(makeReq(body))
  const json = await res.json() as { data?: { id?: string }; error?: { code?: string } }
  return { res, json }
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("POST /api/bookings", () => {

  describe("gates de autenticação e cadastro", () => {
    it("401 quando não autenticado", async () => {
      mockResolveUserId.mockResolvedValue(null)
      const { res, json } = await call(validBody())
      expect(res.status).toBe(401)
      expect(json.error?.code).toBe("UNAUTHORIZED")
    })

    it("403 EMAIL_NOT_VERIFIED quando e-mail não verificado", async () => {
      mockUserFindUnique.mockResolvedValue(verifiedUser({ emailVerified: null }))
      const { res, json } = await call(validBody())
      expect(res.status).toBe(403)
      expect(json.error?.code).toBe("EMAIL_NOT_VERIFIED")
    })

    it("403 REGISTRATION_INCOMPLETE quando cadastro incompleto", async () => {
      mockUserFindUnique.mockResolvedValue(verifiedUser({ profileCompletedAt: null }))
      const { res, json } = await call(validBody())
      expect(res.status).toBe(403)
      expect(json.error?.code).toBe("REGISTRATION_INCOMPLETE")
    })
  })

  describe("validação de entrada e de itens", () => {
    it("400 VALIDATION_ERROR para body inválido", async () => {
      const { res, json } = await call({ itemId: "x" }) // sem datas + itemId não-cuid
      expect(res.status).toBe(400)
      expect(json.error?.code).toBe("VALIDATION_ERROR")
    })

    it("422 ITEM_UNAVAILABLE quando o item não existe/indisponível", async () => {
      mockItemFindMany.mockResolvedValue([])
      const { res, json } = await call(validBody())
      expect(res.status).toBe(422)
      expect(json.error?.code).toBe("ITEM_UNAVAILABLE")
    })

    it("422 MIXED_OWNERS quando itens são de donos diferentes", async () => {
      mockItemFindMany.mockResolvedValue([
        availableItem(),
        availableItem({ id: ITEM_ID_2, ownerId: "ckowneroutro0000000001" }),
      ])
      const { res, json } = await call(validBody({ additionalItemIds: [ITEM_ID_2] }))
      expect(res.status).toBe(422)
      expect(json.error?.code).toBe("MIXED_OWNERS")
    })

    it("403 CANNOT_BOOK_OWN_ITEM quando o locatário é o dono", async () => {
      mockItemFindMany.mockResolvedValue([availableItem({ ownerId: BORROWER_ID })])
      const { res, json } = await call(validBody())
      expect(res.status).toBe(403)
      expect(json.error?.code).toBe("CANNOT_BOOK_OWN_ITEM")
    })
  })

  describe("requisitos do proprietário", () => {
    it("422 ID_VERIFICATION_REQUIRED quando o item exige identidade e o locatário não tem", async () => {
      mockItemFindMany.mockResolvedValue([availableItem({ requireIdVerification: true })])
      mockUserFindUnique.mockResolvedValue(verifiedUser({ idVerificationStatus: "UNVERIFIED" }))
      const { res, json } = await call(validBody())
      expect(res.status).toBe(422)
      expect(json.error?.code).toBe("ID_VERIFICATION_REQUIRED")
    })

    it("422 PHONE_REQUIRED quando o item exige telefone e o locatário não tem", async () => {
      mockItemFindMany.mockResolvedValue([availableItem({ requirePhone: true })])
      mockUserFindUnique.mockResolvedValue(verifiedUser({ phone: null }))
      const { res, json } = await call(validBody())
      expect(res.status).toBe(422)
      expect(json.error?.code).toBe("PHONE_REQUIRED")
    })
  })

  describe("cupom, teto e conflito", () => {
    it("422 COUPON_INVALID quando o cupom é inválido", async () => {
      mockValidateCoupon.mockResolvedValue({ ok: false, reason: "USED" })
      const { res, json } = await call(validBody({ couponCode: "PROMO123" }))
      expect(res.status).toBe(422)
      expect(json.error?.code).toBe("COUPON_INVALID")
    })

    it("422 EXCEEDS_MVP_LIMIT quando o total passa de R$500", async () => {
      mockItemFindMany.mockResolvedValue([availableItem({ pricePerDay: 20000 })]) // 20000 × 3 = 60000 > 50000
      const { res, json } = await call(validBody())
      expect(res.status).toBe(422)
      expect(json.error?.code).toBe("EXCEEDS_MVP_LIMIT")
    })

    it("409 DATE_CONFLICT quando há sobreposição de período", async () => {
      mockFindOverlappingItem.mockResolvedValue({ id: ITEM_ID }) // item em conflito
      const { res, json } = await call(validBody())
      expect(res.status).toBe(409)
      expect(json.error?.code).toBe("DATE_CONFLICT")
    })
  })

  describe("caminho feliz", () => {
    it("201 cria a reserva, os itens da locação e a conversa", async () => {
      const { res, json } = await call(validBody())
      expect(res.status).toBe(201)
      expect(json.data?.id).toBe("ckbooking000000000000001")
      expect(mockBookingCreate).toHaveBeenCalledTimes(1)
      expect(mockBookingItemCM).toHaveBeenCalledTimes(1)   // Story B: registra booking_items
      expect(mockConversationCM).toHaveBeenCalledTimes(1)  // cria a conversa locatário↔dono
    })
  })
})
