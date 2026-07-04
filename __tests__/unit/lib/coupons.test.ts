/** @jest-environment node */
/**
 * TEST-BL2 (parte 1) — Testes de integração para lib/coupons.ts
 *
 * `validateCoupon`, `issueReviewCoupon` e `releaseCouponForBooking` estavam
 * sem cobertura. O Prisma client é mockado no nível de módulo — padrão já
 * adotado em __tests__/integration/api/bookings/post.test.ts.
 *
 * Casos cobertos:
 *
 * validateCoupon:
 *   (a) cupom válido → { ok: true, couponId, percentOff }
 *   (b) cupom não encontrado → { ok: false, reason: "NOT_FOUND" }
 *   (c) cupom já usado (usedAt preenchido) → { ok: false, reason: "USED" }
 *   (d) cupom expirado (expiresAt no passado) → { ok: false, reason: "EXPIRED" }
 *   (e) código é normalizado (trim + toUpperCase) antes da busca
 *
 * issueReviewCoupon:
 *   (f) config desabilitada → retorna sem criar cupom
 *   (g) cupom já existe (idempotência) → retorna sem criar novo
 *   (h) caminho feliz — cria cupom e notificação
 *   (i) erros são engolidos (não propagados) — fire-and-forget seguro
 *
 * releaseCouponForBooking:
 *   (j) chama updateMany com { usedAt: null, bookingId: null }
 *   (k) erros são engolidos (não propagados)
 *
 * NOTA SOBRE TESTABILIDADE:
 *   `issueReviewCoupon` e `releaseCouponForBooking` acessam `prisma` e
 *   `getReviewCouponConfig` diretamente (sem injeção de dependência). Os testes
 *   mockam ambos no nível de módulo. Refatorar para injeção de dependência
 *   tornaria os testes mais precisos, mas mudaria a interface de produção — o
 *   backlog original (TEST-BL2) reconhece isso como "exige extração/refator" e
 *   está fora do escopo desta entrega.
 */

import {
  validateCoupon,
  issueReviewCoupon,
  releaseCouponForBooking,
} from "@/lib/coupons"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCouponFindFirst  = jest.fn()
const mockCouponFindUnique = jest.fn()
const mockCouponCreate     = jest.fn()
const mockCouponUpdateMany = jest.fn()
const mockNotifCreate      = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    coupon: {
      findFirst:  (...a: unknown[]) => mockCouponFindFirst(...a),
      findUnique: (...a: unknown[]) => mockCouponFindUnique(...a),
      create:     (...a: unknown[]) => mockCouponCreate(...a),
      updateMany: (...a: unknown[]) => mockCouponUpdateMany(...a),
    },
    notification: {
      create: (...a: unknown[]) => mockNotifCreate(...a),
    },
  },
}))

const mockGetReviewCouponConfig = jest.fn()
jest.mock("@/lib/platform-config", () => ({
  getReviewCouponConfig: (...a: unknown[]) => mockGetReviewCouponConfig(...a),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ID    = "ckuser0000000000000001"
const BOOKING_ID = "ckbooking000000000000001"
const COUPON_ID  = "ckcoupon000000000000001"
const CODE       = "SHARE10-ABCDE"

function futureDateFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

function pastDateFromNow(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()
  mockGetReviewCouponConfig.mockResolvedValue({
    enabled:     true,
    percentOff:  10,
    validityDays: 90,
  })
  mockNotifCreate.mockResolvedValue({})
})

// ---------------------------------------------------------------------------
// validateCoupon
// ---------------------------------------------------------------------------

describe("validateCoupon", () => {

  describe("(a) cupom válido", () => {
    it("retorna { ok: true, couponId, percentOff } para cupom não expirado e não usado", async () => {
      mockCouponFindFirst.mockResolvedValue({
        id:         COUPON_ID,
        percentOff: 10,
        usedAt:     null,
        expiresAt:  futureDateFromNow(30),
      })

      const result = await validateCoupon(CODE, USER_ID)

      expect(result).toEqual({ ok: true, couponId: COUPON_ID, percentOff: 10 })
    })

    it("retorna percentOff correto independentemente do valor configurado", async () => {
      mockCouponFindFirst.mockResolvedValue({
        id: COUPON_ID, percentOff: 15, usedAt: null, expiresAt: futureDateFromNow(1),
      })

      const result = await validateCoupon(CODE, USER_ID)

      expect(result).toMatchObject({ ok: true, percentOff: 15 })
    })
  })

  describe("(b) cupom não encontrado", () => {
    it("retorna { ok: false, reason: 'NOT_FOUND' } quando prisma retorna null", async () => {
      mockCouponFindFirst.mockResolvedValue(null)

      const result = await validateCoupon("INVALIDO", USER_ID)

      expect(result).toEqual({ ok: false, reason: "NOT_FOUND" })
    })

    it("retorna NOT_FOUND para código que pertence a outro usuário (prisma retorna null)", async () => {
      // O WHERE filtra por userId — outro usuário não vê o cupom
      mockCouponFindFirst.mockResolvedValue(null)

      const result = await validateCoupon(CODE, "outro-user-id")

      expect(result).toEqual({ ok: false, reason: "NOT_FOUND" })
    })
  })

  describe("(c) cupom já usado", () => {
    it("retorna { ok: false, reason: 'USED' } quando usedAt está preenchido", async () => {
      mockCouponFindFirst.mockResolvedValue({
        id:         COUPON_ID,
        percentOff: 10,
        usedAt:     pastDateFromNow(1), // usado ontem
        expiresAt:  futureDateFromNow(30),
      })

      const result = await validateCoupon(CODE, USER_ID)

      expect(result).toEqual({ ok: false, reason: "USED" })
    })
  })

  describe("(d) cupom expirado", () => {
    it("retorna { ok: false, reason: 'EXPIRED' } quando expiresAt é anterior a agora", async () => {
      mockCouponFindFirst.mockResolvedValue({
        id:         COUPON_ID,
        percentOff: 10,
        usedAt:     null,
        expiresAt:  pastDateFromNow(1), // expirou ontem
      })

      const result = await validateCoupon(CODE, USER_ID)

      expect(result).toEqual({ ok: false, reason: "EXPIRED" })
    })

    it("cupom expirado não retorna ok: true mesmo que não tenha sido usado", async () => {
      mockCouponFindFirst.mockResolvedValue({
        id: COUPON_ID, percentOff: 10, usedAt: null, expiresAt: pastDateFromNow(90),
      })

      const result = await validateCoupon(CODE, USER_ID)

      expect(result).not.toMatchObject({ ok: true })
    })
  })

  describe("(e) normalização do código", () => {
    it("busca com trim e toUpperCase aplicados ao código informado", async () => {
      mockCouponFindFirst.mockResolvedValue(null)

      await validateCoupon("  share10-abcde  ", USER_ID)

      const callArgs = mockCouponFindFirst.mock.calls[0][0]
      expect(callArgs.where.code).toBe("SHARE10-ABCDE")
    })

    it("remove espaços em branco antes de buscar", async () => {
      mockCouponFindFirst.mockResolvedValue(null)

      await validateCoupon("  SHARE10-ABCDE  ", USER_ID)

      const callArgs = mockCouponFindFirst.mock.calls[0][0]
      expect(callArgs.where.code).toBe("SHARE10-ABCDE")
    })
  })
})

// ---------------------------------------------------------------------------
// issueReviewCoupon
// ---------------------------------------------------------------------------

describe("issueReviewCoupon", () => {

  describe("(f) config desabilitada", () => {
    it("retorna sem criar cupom quando reviewCouponEnabled é false", async () => {
      mockGetReviewCouponConfig.mockResolvedValue({ enabled: false, percentOff: 10, validityDays: 90 })

      await issueReviewCoupon(USER_ID, BOOKING_ID)

      expect(mockCouponFindUnique).not.toHaveBeenCalled()
      expect(mockCouponCreate).not.toHaveBeenCalled()
    })
  })

  describe("(g) idempotência — cupom já existe", () => {
    it("retorna sem criar novo cupom quando já existe um para userId+sourceBookingId", async () => {
      mockCouponFindUnique.mockResolvedValue({ id: COUPON_ID })

      await issueReviewCoupon(USER_ID, BOOKING_ID)

      expect(mockCouponCreate).not.toHaveBeenCalled()
      expect(mockNotifCreate).not.toHaveBeenCalled()
    })
  })

  describe("(h) caminho feliz — cria cupom e notificação", () => {
    it("cria o cupom com os dados corretos quando config está habilitada e cupom não existe", async () => {
      mockCouponFindUnique.mockResolvedValue(null)
      mockCouponCreate.mockResolvedValue({ code: "SHARE10-XYZAB", percentOff: 10 })

      await issueReviewCoupon(USER_ID, BOOKING_ID)

      expect(mockCouponCreate).toHaveBeenCalledTimes(1)
      const createArgs = mockCouponCreate.mock.calls[0][0]
      expect(createArgs.data.userId).toBe(USER_ID)
      expect(createArgs.data.sourceBookingId).toBe(BOOKING_ID)
      expect(createArgs.data.percentOff).toBe(10)
      expect(createArgs.data.expiresAt).toBeInstanceOf(Date)
    })

    it("cria notificação de COUPON_EARNED após criar o cupom", async () => {
      mockCouponFindUnique.mockResolvedValue(null)
      mockCouponCreate.mockResolvedValue({ code: "SHARE10-XYZAB", percentOff: 10 })

      await issueReviewCoupon(USER_ID, BOOKING_ID)

      expect(mockNotifCreate).toHaveBeenCalledTimes(1)
      const notifArgs = mockNotifCreate.mock.calls[0][0]
      expect(notifArgs.data.userId).toBe(USER_ID)
      expect(notifArgs.data.type).toBe("COUPON_EARNED")
    })

    it("expiresAt é uma data futura com base em validityDays", async () => {
      mockGetReviewCouponConfig.mockResolvedValue({ enabled: true, percentOff: 10, validityDays: 30 })
      mockCouponFindUnique.mockResolvedValue(null)
      mockCouponCreate.mockResolvedValue({ code: "SHARE10-XYZAB", percentOff: 10 })

      const before = Date.now()
      await issueReviewCoupon(USER_ID, BOOKING_ID)
      const after = Date.now()

      const createArgs = mockCouponCreate.mock.calls[0][0]
      const expiresAt = createArgs.data.expiresAt as Date
      const expectedMin = before + 30 * 24 * 60 * 60 * 1000
      const expectedMax = after  + 30 * 24 * 60 * 60 * 1000
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin)
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax)
    })

    it("o código gerado tem o formato SHARE{N}-{5 chars}", async () => {
      mockCouponFindUnique.mockResolvedValue(null)
      mockCouponCreate.mockResolvedValue({ code: "SHARE10-XYZAB", percentOff: 10 })

      await issueReviewCoupon(USER_ID, BOOKING_ID)

      const createArgs = mockCouponCreate.mock.calls[0][0]
      expect(createArgs.data.code).toMatch(/^SHARE\d+-[A-Z0-9]{5}$/)
    })
  })

  describe("(i) erros são engolidos — fire-and-forget seguro", () => {
    it("não lança erro quando getReviewCouponConfig rejeita", async () => {
      mockGetReviewCouponConfig.mockRejectedValue(new Error("DB offline"))

      await expect(issueReviewCoupon(USER_ID, BOOKING_ID)).resolves.toBeUndefined()
    })

    it("não lança erro quando coupon.create rejeita (ex: race condition unique)", async () => {
      mockCouponFindUnique.mockResolvedValue(null)
      mockCouponCreate.mockRejectedValue(new Error("Unique constraint"))

      await expect(issueReviewCoupon(USER_ID, BOOKING_ID)).resolves.toBeUndefined()
    })

    it("não lança erro quando notification.create rejeita", async () => {
      mockCouponFindUnique.mockResolvedValue(null)
      mockCouponCreate.mockResolvedValue({ code: "SHARE10-XYZAB", percentOff: 10 })
      mockNotifCreate.mockRejectedValue(new Error("Notif failed"))

      await expect(issueReviewCoupon(USER_ID, BOOKING_ID)).resolves.toBeUndefined()
    })
  })
})

// ---------------------------------------------------------------------------
// releaseCouponForBooking
// ---------------------------------------------------------------------------

describe("releaseCouponForBooking", () => {

  describe("(j) liberação correta do cupom", () => {
    it("chama coupon.updateMany com where.bookingId e data { usedAt: null, bookingId: null }", async () => {
      mockCouponUpdateMany.mockResolvedValue({ count: 1 })

      await releaseCouponForBooking(BOOKING_ID)

      expect(mockCouponUpdateMany).toHaveBeenCalledTimes(1)
      const args = mockCouponUpdateMany.mock.calls[0][0]
      expect(args.where).toEqual({ bookingId: BOOKING_ID })
      expect(args.data).toEqual({ usedAt: null, bookingId: null })
    })

    it("resolve sem erro quando nenhum cupom é encontrado para a reserva (count: 0)", async () => {
      mockCouponUpdateMany.mockResolvedValue({ count: 0 })

      await expect(releaseCouponForBooking(BOOKING_ID)).resolves.toBeUndefined()
    })
  })

  describe("(k) erros são engolidos", () => {
    it("não lança erro quando coupon.updateMany rejeita", async () => {
      mockCouponUpdateMany.mockRejectedValue(new Error("DB error"))

      await expect(releaseCouponForBooking(BOOKING_ID)).resolves.toBeUndefined()
    })
  })
})
