import { calcRefund, getCancellationPolicyLines } from "@/lib/cancellationPolicy"
import type { CancellationConfig } from "@/lib/platform-config"

// Helpers
function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 3_600_000)
}

const now = new Date()

describe("calcRefund — comportamento padrão (sem cfg)", () => {
  describe("reembolso total (>= 24h antes do início)", () => {
    it("cancelamento exatamente 24h antes → 100%", () => {
      const start = hoursFromNow(24)
      const result = calcRefund(start, now, 10_000)
      expect(result.refundPercent).toBe(100)
      expect(result.refundAmount).toBe(10_000)
    })

    it("cancelamento 48h antes → 100%", () => {
      const start = hoursFromNow(48)
      const result = calcRefund(start, now, 5_000)
      expect(result.refundPercent).toBe(100)
      expect(result.refundAmount).toBe(5_000)
    })

    it("cancelamento 24h e 1 minuto antes → 100%", () => {
      const start = new Date(Date.now() + 24 * 3_600_000 + 60_000)
      const result = calcRefund(start, now, 8_000)
      expect(result.refundPercent).toBe(100)
    })
  })

  describe("reembolso parcial (>= 6h e < 24h antes do início)", () => {
    it("cancelamento 12h antes → 70%", () => {
      const start = hoursFromNow(12)
      const result = calcRefund(start, now, 10_000)
      expect(result.refundPercent).toBe(70)
      expect(result.refundAmount).toBe(7_000)
    })

    it("cancelamento exatamente 6h antes → 70%", () => {
      const start = hoursFromNow(6)
      const result = calcRefund(start, now, 10_000)
      expect(result.refundPercent).toBe(70)
      expect(result.refundAmount).toBe(7_000)
    })

    it("reembolso parcial é arredondado para o centavo mais próximo", () => {
      const start = hoursFromNow(12)
      const result = calcRefund(start, now, 10_001)
      expect(Number.isInteger(result.refundAmount)).toBe(true)
      expect(result.refundAmount).toBe(Math.round(10_001 * 0.7))
    })
  })

  describe("reembolso mínimo (< 6h antes do início)", () => {
    it("cancelamento 3h antes → 50%", () => {
      const start = hoursFromNow(3)
      const result = calcRefund(start, now, 10_000)
      expect(result.refundPercent).toBe(50)
      expect(result.refundAmount).toBe(5_000)
    })

    it("cancelamento após início → 50%", () => {
      const start = hoursFromNow(-1)
      const result = calcRefund(start, now, 6_000)
      expect(result.refundPercent).toBe(50)
      expect(result.refundAmount).toBe(3_000)
    })

    it("reembolso mínimo é arredondado para o centavo mais próximo", () => {
      const start = hoursFromNow(1)
      const result = calcRefund(start, now, 9_999)
      expect(Number.isInteger(result.refundAmount)).toBe(true)
      expect(result.refundAmount).toBe(Math.round(9_999 * 0.5))
    })
  })

  describe("propriedades invariantes", () => {
    it("refundAmount nunca excede totalPrice", () => {
      const cases = [hoursFromNow(48), hoursFromNow(12), hoursFromNow(2)]
      for (const start of cases) {
        const result = calcRefund(start, now, 10_000)
        expect(result.refundAmount).toBeLessThanOrEqual(10_000)
      }
    })

    it("refundAmount é sempre >= 0", () => {
      const result = calcRefund(hoursFromNow(-10), now, 500)
      expect(result.refundAmount).toBeGreaterThanOrEqual(0)
    })

    it("reason sempre contém os limites de horas usados", () => {
      const total  = calcRefund(hoursFromNow(48), now, 1000)
      const parcial = calcRefund(hoursFromNow(10), now, 1000)
      const minimo = calcRefund(hoursFromNow(2),  now, 1000)
      expect(total.reason).toMatch(/24/)
      expect(parcial.reason).toMatch(/24/)
      expect(minimo.reason).toMatch(/6/)
    })
  })
})

describe("calcRefund — cfg customizada (thresholds dinâmicos)", () => {
  const cfg: CancellationConfig = {
    fullRefundHours:    48,
    partialRefundHours: 12,
    partialPercent:     80,
    latePercent:        60,
  }

  it("cancelamento 50h antes → 100% (dentro da janela de 48h com cfg)", () => {
    const start = hoursFromNow(50)
    const result = calcRefund(start, now, 10_000, cfg)
    expect(result.refundPercent).toBe(100)
    expect(result.refundAmount).toBe(10_000)
  })

  it("cancelamento 30h antes + cfg (full=48h) → 80% pois 30 < 48", () => {
    const start = hoursFromNow(30)
    const result = calcRefund(start, now, 10_000, cfg)
    expect(result.refundPercent).toBe(80)
    expect(result.refundAmount).toBe(8_000)
  })

  it("cancelamento 30h antes sem cfg (full=24h) → 100% pois 30 >= 24", () => {
    const start = hoursFromNow(30)
    const result = calcRefund(start, now, 10_000)
    expect(result.refundPercent).toBe(100)
  })

  it("cancelamento 20h antes + cfg → 80% (faixa parcial com cfg)", () => {
    const start = hoursFromNow(20)
    const result = calcRefund(start, now, 10_000, cfg)
    expect(result.refundPercent).toBe(80)
    expect(result.refundAmount).toBe(8_000)
  })

  it("cancelamento 5h antes + cfg → 60% (faixa mínima com cfg)", () => {
    const start = hoursFromNow(5)
    const result = calcRefund(start, now, 10_000, cfg)
    expect(result.refundPercent).toBe(60)
    expect(result.refundAmount).toBe(6_000)
  })

  it("reason reflete os thresholds da cfg", () => {
    const result = calcRefund(hoursFromNow(100), now, 1000, cfg)
    expect(result.reason).toMatch(/48/)
  })
})

describe("getCancellationPolicyLines", () => {
  it("retorna 3 linhas no padrão default", () => {
    const lines = getCancellationPolicyLines()
    expect(lines).toHaveLength(3)
  })

  it("labels refletem os thresholds default (24h / 6h)", () => {
    const lines = getCancellationPolicyLines()
    expect(lines[0].label).toMatch(/24/)
    expect(lines[1].label).toMatch(/24/)
    expect(lines[1].label).toMatch(/6/)
    expect(lines[2].label).toMatch(/6/)
  })

  it("details refletem os percentuais default (100% / 70% / 50%)", () => {
    const lines = getCancellationPolicyLines()
    expect(lines[0].detail).toMatch(/100/)
    expect(lines[1].detail).toMatch(/70/)
    expect(lines[2].detail).toMatch(/50/)
  })

  it("reflete cfg customizada nos labels e detalhes", () => {
    const cfg: CancellationConfig = { fullRefundHours: 48, partialRefundHours: 12, partialPercent: 80, latePercent: 60 }
    const lines = getCancellationPolicyLines(cfg)
    expect(lines[0].label).toMatch(/48/)
    expect(lines[1].detail).toMatch(/80/)
    expect(lines[2].detail).toMatch(/60/)
  })
})
