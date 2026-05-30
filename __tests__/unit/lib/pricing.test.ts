import { calcBookingTotal } from "@/lib/pricing"

describe("calcBookingTotal", () => {
  // -------------------------------------------------------------------------
  // Plano diário
  // -------------------------------------------------------------------------
  describe("plano diário", () => {
    it("calcula corretamente para 1 dia sem preços alternativos", () => {
      const result = calcBookingTotal(1, 1000)
      expect(result.totalPrice).toBe(1000)
      expect(result.savings).toBe(0)
      expect(result.period).toBe("day")
    })

    it("calcula corretamente para 6 dias sem preços alternativos", () => {
      const result = calcBookingTotal(6, 500)
      expect(result.totalPrice).toBe(3000)
      expect(result.savings).toBe(0)
      expect(result.period).toBe("day")
    })

    it("usa plano diário quando dias < 7, mesmo com pricePerWeek definido", () => {
      const result = calcBookingTotal(6, 500, 2800)
      expect(result.period).toBe("day")
      expect(result.totalPrice).toBe(3000)
      expect(result.savings).toBe(0)
    })

    it("usa plano diário quando pricePerWeek é null e dias >= 7", () => {
      const result = calcBookingTotal(7, 500, null)
      expect(result.period).toBe("day")
      expect(result.totalPrice).toBe(3500)
      expect(result.savings).toBe(0)
    })

    it("usa plano diário quando pricePerWeek não é fornecido e dias >= 7", () => {
      const result = calcBookingTotal(10, 500)
      expect(result.period).toBe("day")
      expect(result.totalPrice).toBe(5000)
      expect(result.savings).toBe(0)
    })
  })

  // -------------------------------------------------------------------------
  // Plano semanal
  // -------------------------------------------------------------------------
  describe("plano semanal", () => {
    it("calcula corretamente para 7 dias exatos", () => {
      // naive = 7 * 500 = 3500 | semanal = 1 * 2800 = 2800
      const result = calcBookingTotal(7, 500, 2800)
      expect(result.totalPrice).toBe(2800)
      expect(result.savings).toBe(700)
      expect(result.period).toBe("week")
    })

    it("calcula corretamente para 10 dias (1 semana + 3 dias extras)", () => {
      // naive = 10 * 500 = 5000 | total = 2800 + 3 * 500 = 4300
      const result = calcBookingTotal(10, 500, 2800)
      expect(result.totalPrice).toBe(4300)
      expect(result.savings).toBe(700)
      expect(result.period).toBe("week")
    })

    it("calcula corretamente para 14 dias (2 semanas exatas)", () => {
      // naive = 14 * 500 = 7000 | total = 2 * 2800 = 5600
      const result = calcBookingTotal(14, 500, 2800)
      expect(result.totalPrice).toBe(5600)
      expect(result.savings).toBe(1400)
      expect(result.period).toBe("week")
    })

    it("calcula savings zero quando pricePerWeek não oferece desconto real", () => {
      // pricePerWeek igual ao preço diário × 7 — sem economia
      const result = calcBookingTotal(7, 500, 3500)
      expect(result.totalPrice).toBe(3500)
      expect(result.savings).toBe(0)
      expect(result.period).toBe("week")
    })
  })

  // -------------------------------------------------------------------------
  // Plano mensal
  // -------------------------------------------------------------------------
  describe("plano mensal", () => {
    it("calcula corretamente para 30 dias exatos", () => {
      // naive = 30 * 500 = 15000 | mensal = 1 * 12000 = 12000
      const result = calcBookingTotal(30, 500, 2800, 12000)
      expect(result.totalPrice).toBe(12000)
      expect(result.savings).toBe(3000)
      expect(result.period).toBe("month")
    })

    it("calcula corretamente para 45 dias (1 mês + 15 dias extras)", () => {
      // naive = 45 * 500 = 22500 | total = 12000 + 15 * 500 = 19500
      const result = calcBookingTotal(45, 500, 2800, 12000)
      expect(result.totalPrice).toBe(19500)
      expect(result.savings).toBe(3000)
      expect(result.period).toBe("month")
    })

    it("calcula corretamente para 60 dias (2 meses exatos)", () => {
      // naive = 60 * 500 = 30000 | total = 2 * 12000 = 24000
      const result = calcBookingTotal(60, 500, 2800, 12000)
      expect(result.totalPrice).toBe(24000)
      expect(result.savings).toBe(6000)
      expect(result.period).toBe("month")
    })
  })

  // -------------------------------------------------------------------------
  // Prioridade mensal > semanal
  // -------------------------------------------------------------------------
  describe("prioridade mensal > semanal quando dias >= 30", () => {
    it("usa plano mensal quando ambos pricePerWeek e pricePerMonth estão definidos", () => {
      const result = calcBookingTotal(30, 500, 2800, 12000)
      expect(result.period).toBe("month")
    })

    it("usa plano semanal para 29 dias mesmo com pricePerMonth definido", () => {
      // 29 dias < 30 → não aciona plano mensal
      const result = calcBookingTotal(29, 500, 2800, 12000)
      expect(result.period).toBe("week")
    })
  })

  // -------------------------------------------------------------------------
  // savings nunca negativo
  // -------------------------------------------------------------------------
  describe("savings nunca negativo", () => {
    it("savings é 0 quando plano semanal é mais caro que diário", () => {
      // pricePerWeek maior que 7 × pricePerDay — não deveria acontecer em prod, mas testa robustez
      const result = calcBookingTotal(7, 500, 4000)
      expect(result.savings).toBe(0)
      expect(result.savings).toBeGreaterThanOrEqual(0)
    })

    it("savings é 0 quando plano mensal é mais caro que diário", () => {
      const result = calcBookingTotal(30, 500, null, 20000)
      expect(result.savings).toBe(0)
      expect(result.savings).toBeGreaterThanOrEqual(0)
    })
  })

  // -------------------------------------------------------------------------
  // Integridade dos valores em centavos (inteiros)
  // -------------------------------------------------------------------------
  describe("valores em centavos (inteiros)", () => {
    it("totalPrice é sempre um inteiro", () => {
      const result = calcBookingTotal(10, 333, 2100)
      expect(Number.isInteger(result.totalPrice)).toBe(true)
    })

    it("savings é sempre um inteiro", () => {
      const result = calcBookingTotal(10, 333, 2100)
      expect(Number.isInteger(result.savings)).toBe(true)
    })

    it("plano diário mantém integridade com preço exato", () => {
      const result = calcBookingTotal(3, 1500)
      expect(result.totalPrice).toBe(4500)
      expect(Number.isInteger(result.totalPrice)).toBe(true)
    })
  })
})
