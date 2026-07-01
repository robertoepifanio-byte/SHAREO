/**
 * Testes unitários para lib/badges.ts
 *
 * Funções cobertas:
 *  - getBorrowerBadge       — badge de reputação por aluguéis concluídos
 *  - getNextBorrowerBadge   — próximo badge e % de progresso
 *  - isActiveReviewer       — badge "Avaliador Ativo" (avaliação nos últimos 30 dias)
 *  - REPUTATION_PER_REVIEW  — constante de pontos por avaliação
 */

import {
  getBorrowerBadge,
  getNextBorrowerBadge,
  isActiveReviewer,
  REPUTATION_PER_REVIEW,
  BORROWER_BADGES,
} from "@/lib/badges"

// ---------------------------------------------------------------------------
// getBorrowerBadge
// ---------------------------------------------------------------------------

describe("getBorrowerBadge", () => {
  describe("sem badge (0 ou poucos aluguéis)", () => {
    it("0 aluguéis → null", () => {
      expect(getBorrowerBadge(0)).toBeNull()
    })

    it("2 aluguéis → null (abaixo do Bronze=3)", () => {
      expect(getBorrowerBadge(2)).toBeNull()
    })
  })

  describe("badge Bronze (mínimo = 3)", () => {
    it("3 aluguéis → Bronze", () => {
      const badge = getBorrowerBadge(3)
      expect(badge).not.toBeNull()
      expect(badge!.key).toBe("bronze")
    })

    it("9 aluguéis → Bronze (abaixo do Prata=10)", () => {
      expect(getBorrowerBadge(9)!.key).toBe("bronze")
    })
  })

  describe("badge Prata (mínimo = 10)", () => {
    it("10 aluguéis → Prata", () => {
      expect(getBorrowerBadge(10)!.key).toBe("silver")
    })

    it("24 aluguéis → Prata (abaixo do Ouro=25)", () => {
      expect(getBorrowerBadge(24)!.key).toBe("silver")
    })
  })

  describe("badge Ouro (mínimo = 25)", () => {
    it("25 aluguéis → Ouro", () => {
      expect(getBorrowerBadge(25)!.key).toBe("gold")
    })

    it("49 aluguéis → Ouro (abaixo do Diamante=50)", () => {
      expect(getBorrowerBadge(49)!.key).toBe("gold")
    })
  })

  describe("badge Diamante (mínimo = 50)", () => {
    it("50 aluguéis → Diamante", () => {
      expect(getBorrowerBadge(50)!.key).toBe("diamond")
    })

    it("1000 aluguéis → Diamante", () => {
      expect(getBorrowerBadge(1000)!.key).toBe("diamond")
    })
  })

  describe("campos do badge retornado", () => {
    it("badge contém key, label, emoji e color", () => {
      const badge = getBorrowerBadge(3)
      expect(badge).toHaveProperty("key")
      expect(badge).toHaveProperty("label")
      expect(badge).toHaveProperty("emoji")
      expect(badge).toHaveProperty("color")
    })

    it("label do Bronze está em português ('Bronze')", () => {
      expect(getBorrowerBadge(3)!.label).toBe("Bronze")
    })

    it("label do Diamante está em português ('Diamante')", () => {
      expect(getBorrowerBadge(50)!.label).toBe("Diamante")
    })
  })
})

// ---------------------------------------------------------------------------
// getNextBorrowerBadge
// ---------------------------------------------------------------------------

describe("getNextBorrowerBadge", () => {
  describe("progresso inicial", () => {
    it("0 aluguéis → próximo = Bronze, progresso = 0%", () => {
      const next = getNextBorrowerBadge(0)
      expect(next).not.toBeNull()
      expect(next!.badge.key).toBe("bronze")
      expect(next!.progress).toBe(0)
    })

    it("1 aluguel → próximo = Bronze", () => {
      const next = getNextBorrowerBadge(1)
      expect(next!.badge.key).toBe("bronze")
    })
  })

  describe("progresso para Prata (mínimo = 10)", () => {
    it("3 aluguéis (Bronze) → próximo = Prata, progresso entre 0 e 100", () => {
      const next = getNextBorrowerBadge(3)
      expect(next!.badge.key).toBe("silver")
      expect(next!.progress).toBeGreaterThanOrEqual(0)
      expect(next!.progress).toBeLessThanOrEqual(100)
    })

    it("9 aluguéis → quase no limite do Prata (progresso > 0)", () => {
      const next = getNextBorrowerBadge(9)
      expect(next!.badge.key).toBe("silver")
      expect(next!.progress).toBeGreaterThan(0)
    })
  })

  describe("progresso para Ouro (mínimo = 25)", () => {
    it("10 aluguéis (Prata) → próximo = Ouro", () => {
      const next = getNextBorrowerBadge(10)
      expect(next!.badge.key).toBe("gold")
    })
  })

  describe("progresso para Diamante (mínimo = 50)", () => {
    it("25 aluguéis (Ouro) → próximo = Diamante", () => {
      const next = getNextBorrowerBadge(25)
      expect(next!.badge.key).toBe("diamond")
    })
  })

  describe("badge máximo atingido", () => {
    it("50 aluguéis (Diamante) → null (sem próximo badge)", () => {
      expect(getNextBorrowerBadge(50)).toBeNull()
    })

    it("1000 aluguéis → null", () => {
      expect(getNextBorrowerBadge(1000)).toBeNull()
    })
  })

  describe("invariantes de progresso", () => {
    it("progresso está sempre entre 0 e 100 (inclusive)", () => {
      const cases = [0, 1, 2, 3, 5, 9, 10, 15, 24, 25, 30, 49]
      for (const n of cases) {
        const next = getNextBorrowerBadge(n)
        if (next) {
          expect(next.progress).toBeGreaterThanOrEqual(0)
          expect(next.progress).toBeLessThanOrEqual(100)
        }
      }
    })

    it("progresso é um inteiro (Math.round)", () => {
      const next = getNextBorrowerBadge(5)
      if (next) {
        expect(Number.isInteger(next.progress)).toBe(true)
      }
    })
  })
})

// ---------------------------------------------------------------------------
// isActiveReviewer
// ---------------------------------------------------------------------------

describe("isActiveReviewer", () => {
  describe("avaliação recente (dentro dos 30 dias)", () => {
    it("avaliação há 1 dia → true", () => {
      const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      expect(isActiveReviewer(oneDayAgo)).toBe(true)
    })

    it("avaliação há 29 dias → true (dentro da janela)", () => {
      const twentyNineDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
      expect(isActiveReviewer(twentyNineDaysAgo)).toBe(true)
    })
  })

  describe("avaliação antiga (fora dos 30 dias)", () => {
    it("avaliação há 31 dias → false", () => {
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
      expect(isActiveReviewer(thirtyOneDaysAgo)).toBe(false)
    })

    it("avaliação há 1 ano → false", () => {
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      expect(isActiveReviewer(oneYearAgo)).toBe(false)
    })
  })

  describe("sem avaliação", () => {
    it("null → false", () => {
      expect(isActiveReviewer(null)).toBe(false)
    })

    it("undefined → false", () => {
      expect(isActiveReviewer(undefined)).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// REPUTATION_PER_REVIEW e BORROWER_BADGES
// ---------------------------------------------------------------------------

describe("REPUTATION_PER_REVIEW", () => {
  it("vale 10 pontos por avaliação", () => {
    expect(REPUTATION_PER_REVIEW).toBe(10)
  })
})

describe("BORROWER_BADGES (constante exportada)", () => {
  it("contém 4 badges (bronze, silver, gold, diamond)", () => {
    expect(BORROWER_BADGES).toHaveLength(4)
  })

  it("badges estão ordenados do maior (Diamond) para o menor (Bronze)", () => {
    const keys = BORROWER_BADGES.map((b) => b.key)
    expect(keys[0]).toBe("diamond")
    expect(keys[keys.length - 1]).toBe("bronze")
  })

  it("minBookings crescentes do Bronze para o Diamante", () => {
    const sorted = [...BORROWER_BADGES].sort((a, b) => a.minBookings - b.minBookings)
    const bronzeMin = sorted[0]!.minBookings
    const diamondMin = sorted[sorted.length - 1]!.minBookings
    expect(bronzeMin).toBeLessThan(diamondMin)
  })
})
