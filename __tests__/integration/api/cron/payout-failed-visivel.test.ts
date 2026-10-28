/** @jest-environment node */
/**
 * GET /api/cron/payout — a falha ao marcar um Payout como FAILED não pode ser silenciosa.
 *
 * Arquivo fonte: app/api/cron/payout/route.ts
 *
 * #8 (Red Team 2026-10-28): o Payout é movido para PROCESSING pelo optimistic
 * lock ANTES do Transfer. Se o Transfer falha e o update que marca FAILED também
 * falha (timeout de pooler/deadlock), o registro fica preso em PROCESSING — e a
 * query de candidatos só pega PENDING, então nunca mais o reprocessa. Antes isso
 * era `.catch(() => null)`: zero rastro. Agora loga E alerta no Sentry.
 */
import { NextRequest } from "next/server"

const mockAssertCron     = jest.fn()
const mockFindMany       = jest.fn()
const mockUpdateMany     = jest.fn()
const mockUpdate         = jest.fn()
const mockCount          = jest.fn()
const mockRetrieve       = jest.fn()
const mockCreateTransfer = jest.fn()
const mockHasConnect     = jest.fn()
const mockSentry         = jest.fn()

jest.mock("@/lib/auth/cron-guard", () => ({ assertCronAuth: (...a: unknown[]) => mockAssertCron(...a) }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    payout: {
      findMany:   (...a: unknown[]) => mockFindMany(...a),
      updateMany: (...a: unknown[]) => mockUpdateMany(...a),
      update:     (...a: unknown[]) => mockUpdate(...a),
      count:      (...a: unknown[]) => mockCount(...a),
    },
  },
}))
jest.mock("@/lib/stripe", () => ({
  getStripe: () => ({ paymentIntents: { retrieve: (...a: unknown[]) => mockRetrieve(...a) } }),
  idOf: (c: unknown) => (typeof c === "string" ? c : (c as { id?: string } | null)?.id ?? null),
}))
jest.mock("@/lib/payments/owner-transfer", () => ({ createOwnerTransfer: (...a: unknown[]) => mockCreateTransfer(...a) }))
jest.mock("@/lib/payments/charge-guards",  () => ({ hasActiveConnect: (...a: unknown[]) => mockHasConnect(...a) }))
jest.mock("@sentry/nextjs", () => ({ captureException: (...a: unknown[]) => mockSentry(...a) }))

import { GET } from "@/app/api/cron/payout/route"

const req = () => new NextRequest("http://localhost/api/cron/payout")

const candidato = {
  id:     "payout-1",
  amount: 5100,
  sourcePaymentIntentId: null,
  booking: { id: "booking-1", stripePaymentIntentId: "pi_1" },
  ownerPaymentAccount: { pixKey: "x", stripeAccountId: "acct_1", stripeConnectStatus: "ACTIVE" },
}

let errSpy: jest.SpyInstance
let warnSpy: jest.SpyInstance

beforeEach(() => {
  jest.clearAllMocks()
  mockAssertCron.mockReturnValue(undefined)          // autenticado
  mockFindMany.mockResolvedValue([candidato])
  mockUpdateMany.mockResolvedValue({ count: 1 })     // claim do optimistic lock
  mockHasConnect.mockReturnValue(true)
  mockRetrieve.mockResolvedValue({ latest_charge: "ch_1" })
  mockCreateTransfer.mockResolvedValue({ id: "tr_1" })
  mockUpdate.mockResolvedValue({ id: "payout-1" })
  mockCount.mockResolvedValue(0)
  errSpy  = jest.spyOn(console, "error").mockImplementation(() => {})
  warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})
})
afterEach(() => { errSpy.mockRestore(); warnSpy.mockRestore() })

describe("GET /api/cron/payout — falha ao marcar FAILED", () => {
  // 🪤 O núcleo do #8: Transfer falha E o update de FAILED falha → não pode sumir.
  it("Transfer falha e o update de FAILED também falha → loga e alerta no Sentry", async () => {
    mockCreateTransfer.mockRejectedValue(new Error("Stripe transfer recusado"))
    mockUpdate.mockRejectedValue(new Error("pooler timeout"))

    const res  = await GET(req())
    const body = await res.json() as { ok: boolean; errors: number }

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.errors).toBe(1)

    // A falha do update de FAILED é VISÍVEL (antes: .catch(() => null), zero rastro).
    expect(mockSentry).toHaveBeenCalledTimes(1)
    const [, ctx] = mockSentry.mock.calls[0] as [Error, { extra: { payoutId: string }; tags: { pagamento: string } }]
    expect(ctx.extra.payoutId).toBe("payout-1")
    expect(ctx.tags.pagamento).toBe("payout-stuck-processing")
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining("preso em PROCESSING"),
      expect.anything(),
    )
  })

  it("Transfer falha mas o update de FAILED grava → sem Sentry (recuperável pelo fluxo normal)", async () => {
    mockCreateTransfer.mockRejectedValue(new Error("Stripe transfer recusado"))
    // mockUpdate resolve (default do beforeEach)

    const res  = await GET(req())
    const body = await res.json() as { errors: number }

    expect(body.errors).toBe(1)
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "FAILED" }),
    }))
    expect(mockSentry).not.toHaveBeenCalled()
  })

  it("caminho feliz: Transfer ok → COMPLETED, nenhum erro nem Sentry", async () => {
    const res  = await GET(req())
    const body = await res.json() as { processed: number; errors: number }

    expect(body.processed).toBe(1)
    expect(body.errors).toBe(0)
    expect(mockUpdate).not.toHaveBeenCalled() // só o updateMany do claim roda
    expect(mockSentry).not.toHaveBeenCalled()
  })
})
