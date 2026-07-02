import { calcBookingTotal, fmtCurrency, addDays, CHECKOUT_MAX_CENTS } from "../pricing"

describe("calcBookingTotal", () => {
  const DAY   = 3500   // R$ 35,00/dia
  const WEEK  = 9000   // R$ 90,00/semana
  const MONTH = 42000  // R$ 420,00/mês

  describe("modo diário (sem semana/mês)", () => {
    it("calcula 1 dia corretamente", () => {
      const r = calcBookingTotal(1, DAY)
      expect(r.totalPrice).toBe(3500)
      expect(r.savings).toBe(0)
      expect(r.period).toBe("day")
    })

    it("calcula 3 dias corretamente", () => {
      const r = calcBookingTotal(3, DAY)
      expect(r.totalPrice).toBe(10500)
      expect(r.savings).toBe(0)
      expect(r.period).toBe("day")
    })

    it("não aplica semanal se não informado", () => {
      const r = calcBookingTotal(7, DAY)
      expect(r.totalPrice).toBe(7 * DAY)
      expect(r.period).toBe("day")
    })
  })

  describe("modo semanal", () => {
    it("aplica preço semanal a partir de 7 dias", () => {
      const r = calcBookingTotal(7, DAY, WEEK)
      expect(r.totalPrice).toBe(WEEK)
      expect(r.savings).toBe(7 * DAY - WEEK) // 24500 - 9000 = 15500
      expect(r.period).toBe("week")
    })

    it("2 semanas + 1 dia restante", () => {
      const r = calcBookingTotal(15, DAY, WEEK)
      // 2 semanas × 9000 + 1 dia × 3500 = 18000 + 3500 = 21500
      expect(r.totalPrice).toBe(2 * WEEK + 1 * DAY)
      expect(r.period).toBe("week")
    })

    it("não aplica semanal com menos de 7 dias", () => {
      const r = calcBookingTotal(6, DAY, WEEK)
      expect(r.totalPrice).toBe(6 * DAY)
      expect(r.period).toBe("day")
    })
  })

  describe("modo mensal", () => {
    it("aplica preço mensal a partir de 30 dias", () => {
      const r = calcBookingTotal(30, DAY, WEEK, MONTH)
      expect(r.totalPrice).toBe(MONTH)
      expect(r.savings).toBe(30 * DAY - MONTH)
      expect(r.period).toBe("month")
    })

    it("1 mês + 5 dias restantes", () => {
      const r = calcBookingTotal(35, DAY, WEEK, MONTH)
      // 1 mês × 42000 + 5 dias × 3500 = 42000 + 17500 = 59500
      expect(r.totalPrice).toBe(MONTH + 5 * DAY)
      expect(r.period).toBe("month")
    })

    it("mensal tem prioridade sobre semanal quando ≥30 dias", () => {
      const r = calcBookingTotal(30, DAY, WEEK, MONTH)
      expect(r.period).toBe("month")
    })
  })

  it("savings nunca é negativo", () => {
    // Se pricePerWeek for maior que pricePerDay × 7, savings = 0
    const r = calcBookingTotal(7, 100, 800) // 700 naive, 800 semanal → sem desconto
    expect(r.savings).toBe(0)
  })
})

describe("fmtCurrency", () => {
  it("formata centavos em BRL", () => {
    expect(fmtCurrency(3500)).toBe("R$ 35,00")
  })

  it("formata zero corretamente", () => {
    expect(fmtCurrency(0)).toBe("R$ 0,00")
  })
})

describe("addDays", () => {
  it("adiciona 7 dias à data", () => {
    const base = new Date(2026, 6, 1, 12) // 01/07/2026
    const result = addDays(base, 7)
    expect(result.getDate()).toBe(8)
    expect(result.getMonth()).toBe(6)
    expect(result.getFullYear()).toBe(2026)
  })

  it("não muta a data original", () => {
    const base = new Date(2026, 6, 1, 12)
    addDays(base, 30)
    expect(base.getDate()).toBe(1) // inalterado
  })

  it("passa mês corretamente", () => {
    const base = new Date(2026, 6, 25, 12) // 25/07/2026
    const result = addDays(base, 30) // → 24/08/2026
    expect(result.getMonth()).toBe(7) // agosto
    expect(result.getDate()).toBe(24)
  })
})

describe("CHECKOUT_MAX_CENTS", () => {
  it("é R$ 500 (50000 centavos)", () => {
    expect(CHECKOUT_MAX_CENTS).toBe(50_000)
  })
})
