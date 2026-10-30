/** @jest-environment node */
/** Taxas de embaixador vindas de PlatformConfig (/admin/embaixadores). */

const mockConfigRows = jest.fn()
const mockCommissionCreate = jest.fn((args: unknown) => args)

jest.mock("@/lib/prisma", () => ({
  prisma: {
    platformConfig:       { findMany: () => mockConfigRows() },
    booking:              { findUnique: jest.fn().mockResolvedValue({ borrowerId: "b1", platformFeeAmount: 1500, ambassadorCommissions: [] }) },
    referral:             {
      findUnique: jest.fn().mockResolvedValue({ id: "r1", referrerId: "amb1", status: "ACTIVE" }),
      count:      jest.fn().mockResolvedValue(3), // BRONZE
    },
    ambassadorProfile:    {
      findUnique: jest.fn().mockResolvedValue({ id: "p1", revokedAt: null, activeReferralsCnt: 3, currentTier: "BRONZE" }),
      update:     jest.fn((args: unknown) => args),
    },
    ambassadorCommission: { create: (args: unknown) => mockCommissionCreate(args) },
    notification:         { create: jest.fn().mockResolvedValue({}) },
    $transaction:         jest.fn().mockResolvedValue([]),
  },
}))

import { clearPlatformConfigCache, getAmbassadorRatesBp, DEFAULT_AMBASSADOR_RATES_BP } from "@/lib/platform-config"
import { processAmbassadorOnBookingPaid } from "@/lib/ambassador"

const rows = (o: Record<string, string>) => Object.entries(o).map(([key, value]) => ({ key, value }))

beforeEach(() => {
  clearPlatformConfigCache()
  mockCommissionCreate.mockClear()
})

describe("getAmbassadorRatesBp", () => {
  it("lê as taxas gravadas pelo painel", async () => {
    mockConfigRows.mockResolvedValue(rows({ ambassadorBronzeRate: "400", ambassadorSilverRate: "600", ambassadorGoldRate: "800" }))
    await expect(getAmbassadorRatesBp()).resolves.toEqual({ BRONZE: 400, SILVER: 600, GOLD: 800 })
  })

  it("chave ausente → default", async () => {
    mockConfigRows.mockResolvedValue([])
    await expect(getAmbassadorRatesBp()).resolves.toEqual(DEFAULT_AMBASSADOR_RATES_BP)
  })

  it("valor inválido ou fora de 0–10000 bps → default só daquela chave", async () => {
    mockConfigRows.mockResolvedValue(rows({ ambassadorBronzeRate: "abc", ambassadorSilverRate: "-1", ambassadorGoldRate: "10001" }))
    await expect(getAmbassadorRatesBp()).resolves.toEqual(DEFAULT_AMBASSADOR_RATES_BP)
  })

  it("falha no banco → default", async () => {
    mockConfigRows.mockRejectedValue(new Error("db down"))
    await expect(getAmbassadorRatesBp()).resolves.toEqual(DEFAULT_AMBASSADOR_RATES_BP)
  })
})

describe("processAmbassadorOnBookingPaid", () => {
  it("usa a taxa do painel no snapshot da comissão", async () => {
    mockConfigRows.mockResolvedValue(rows({ ambassadorBronzeRate: "400" }))

    await processAmbassadorOnBookingPaid("bk1")

    expect(mockCommissionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tierSnapshot: "BRONZE", tierPercentBp: 400, amountCents: 60 }), // 4% de 1500
      }),
    )
  })
})
