/**
 * Testes unitários para lib/platform-config.ts
 *
 * Foco nas funções síncronas que não dependem do Prisma:
 *  - calcSplit (financeiro crítico — basis points)
 *  - CHECKOUT_MAX_CENTS (constante de limite do MVP)
 *
 * As funções async (getPlatformFeeRate, getCancellationConfig, etc.)
 * dependem de `prisma.platformConfig.findMany` e são cobertas nos testes
 * de integração — não testadas aqui para não exigir mock de Prisma.
 */

import { calcSplit, CHECKOUT_MAX_CENTS } from "@/lib/platform-config"

// ---------------------------------------------------------------------------
// calcSplit — lógica financeira crítica
// ---------------------------------------------------------------------------

describe("calcSplit", () => {
  describe("taxa padrão de 15% (1500 bps)", () => {
    const FEE_RATE = 1500

    it("calcula corretamente para R$ 100,00 (10000 centavos)", () => {
      const { platformFeeAmount, ownerNetAmount } = calcSplit(10_000, FEE_RATE)
      // 15% de 10000 = 1500
      expect(platformFeeAmount).toBe(1_500)
      // 10000 - 1500 = 8500
      expect(ownerNetAmount).toBe(8_500)
    })

    it("retorna o feeRate passado em platformFeeRate", () => {
      const { platformFeeRate } = calcSplit(10_000, FEE_RATE)
      expect(platformFeeRate).toBe(FEE_RATE)
    })

    it("platformFeeAmount + ownerNetAmount = totalPrice", () => {
      const total = 7_350
      const { platformFeeAmount, ownerNetAmount } = calcSplit(total, FEE_RATE)
      expect(platformFeeAmount + ownerNetAmount).toBe(total)
    })
  })

  describe("arredondamento — Math.round (centavo mais próximo)", () => {
    it("arredonda corretamente quando resultado é fracionado", () => {
      // 15% de 333 centavos = 49.95 → arredonda para 50
      const { platformFeeAmount, ownerNetAmount } = calcSplit(333, 1_500)
      expect(platformFeeAmount).toBe(50)
      expect(ownerNetAmount).toBe(283)
      expect(platformFeeAmount + ownerNetAmount).toBe(333)
    })

    it("15% de 100 centavos = 15 exato (sem fracionamento)", () => {
      const { platformFeeAmount } = calcSplit(100, 1_500)
      expect(platformFeeAmount).toBe(15)
    })

    it("arredondamento nunca produz centavo negativo nem acima do total", () => {
      const totals = [1, 7, 13, 99, 100, 333, 1000, 9999, 50_000]
      for (const total of totals) {
        const { platformFeeAmount, ownerNetAmount } = calcSplit(total, 1_500)
        expect(platformFeeAmount).toBeGreaterThanOrEqual(0)
        expect(ownerNetAmount).toBeGreaterThanOrEqual(0)
        expect(platformFeeAmount + ownerNetAmount).toBe(total)
      }
    })
  })

  describe("taxas variadas (basis points)", () => {
    it("taxa 0% (feeRate=0) — plataforma não retém nada", () => {
      const { platformFeeAmount, ownerNetAmount } = calcSplit(10_000, 0)
      expect(platformFeeAmount).toBe(0)
      expect(ownerNetAmount).toBe(10_000)
    })

    it("taxa 10% (1000 bps)", () => {
      const { platformFeeAmount, ownerNetAmount } = calcSplit(10_000, 1_000)
      expect(platformFeeAmount).toBe(1_000)
      expect(ownerNetAmount).toBe(9_000)
    })

    it("taxa 20% (2000 bps)", () => {
      const { platformFeeAmount, ownerNetAmount } = calcSplit(10_000, 2_000)
      expect(platformFeeAmount).toBe(2_000)
      expect(ownerNetAmount).toBe(8_000)
    })

    it("taxa 100% (10000 bps) — plataforma retém tudo", () => {
      const { platformFeeAmount, ownerNetAmount } = calcSplit(10_000, 10_000)
      expect(platformFeeAmount).toBe(10_000)
      expect(ownerNetAmount).toBe(0)
    })
  })

  describe("valores extremos (teto MVP)", () => {
    it("funciona com CHECKOUT_MAX_CENTS (R$ 500,00 = 50000 centavos) a 15%", () => {
      const { platformFeeAmount, ownerNetAmount } = calcSplit(CHECKOUT_MAX_CENTS, 1_500)
      // 15% de 50000 = 7500
      expect(platformFeeAmount).toBe(7_500)
      expect(ownerNetAmount).toBe(42_500)
      expect(platformFeeAmount + ownerNetAmount).toBe(CHECKOUT_MAX_CENTS)
    })

    it("funciona com total = 1 centavo", () => {
      const { platformFeeAmount, ownerNetAmount } = calcSplit(1, 1_500)
      expect(platformFeeAmount + ownerNetAmount).toBe(1)
    })

    it("funciona com total = 0 centavos", () => {
      const { platformFeeAmount, ownerNetAmount } = calcSplit(0, 1_500)
      expect(platformFeeAmount).toBe(0)
      expect(ownerNetAmount).toBe(0)
    })
  })

  describe("invariantes gerais", () => {
    it("platformFeeAmount é sempre inteiro", () => {
      const cases = [333, 999, 1001, 7777, 50_000]
      for (const total of cases) {
        const { platformFeeAmount } = calcSplit(total, 1_500)
        expect(Number.isInteger(platformFeeAmount)).toBe(true)
      }
    })

    it("ownerNetAmount é sempre inteiro", () => {
      const cases = [333, 999, 1001, 7777, 50_000]
      for (const total of cases) {
        const { ownerNetAmount } = calcSplit(total, 1_500)
        expect(Number.isInteger(ownerNetAmount)).toBe(true)
      }
    })

    it("soma sempre preserva o total sem ganho ou perda de centavo", () => {
      // Testa a invariante principal: splitTotal === inputTotal
      const samples = [1, 3, 7, 13, 33, 99, 100, 333, 1001, 3333, 9999, 50_000]
      for (const total of samples) {
        const { platformFeeAmount, ownerNetAmount } = calcSplit(total, 1_500)
        expect(platformFeeAmount + ownerNetAmount).toBe(total)
      }
    })
  })
})

// ---------------------------------------------------------------------------
// CHECKOUT_MAX_CENTS
// ---------------------------------------------------------------------------

describe("CHECKOUT_MAX_CENTS", () => {
  it("vale exatamente 50000 centavos (R$ 500,00 — teto MVP D2)", () => {
    expect(CHECKOUT_MAX_CENTS).toBe(50_000)
  })

  it("é um inteiro positivo", () => {
    expect(Number.isInteger(CHECKOUT_MAX_CENTS)).toBe(true)
    expect(CHECKOUT_MAX_CENTS).toBeGreaterThan(0)
  })
})
