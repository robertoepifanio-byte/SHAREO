/**
 * P3-83 — Testes unitários para utils/format.ts
 */

import { formatPrice, formatDate, formatDistance, formatRelativeTime } from "@/utils/format"

describe("formatPrice", () => {
  it("converte centavos para string BRL", () => {
    expect(formatPrice(10000)).toBe("R$ 100,00")
  })

  it("formata valores com centavos", () => {
    expect(formatPrice(4990)).toBe("R$ 49,90")
  })

  it("formata zero corretamente", () => {
    expect(formatPrice(0)).toBe("R$ 0,00")
  })

  it("formata valores grandes", () => {
    expect(formatPrice(1_000_000)).toBe("R$ 10.000,00")
  })

  it("aceita moeda alternativa", () => {
    const result = formatPrice(5000, "USD")
    expect(result).toContain("50,00")
  })
})

describe("formatDate", () => {
  const fixedDate = new Date("2026-06-15T12:00:00.000Z")

  it("retorna string não vazia para uma data válida", () => {
    const result = formatDate(fixedDate)
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
  })

  it("aceita string ISO como input", () => {
    const result = formatDate("2026-06-15T12:00:00.000Z")
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
  })

  it("aplica opções customizadas — só ano", () => {
    const result = formatDate(fixedDate, { year: "numeric" })
    expect(result).toContain("2026")
  })

  it("aplica opções — mês longo", () => {
    const result = formatDate(new Date("2026-01-20"), { month: "long" })
    expect(result.toLowerCase()).toContain("janeiro")
  })
})

describe("formatDistance", () => {
  it("exibe metros quando distância < 1000 m", () => {
    expect(formatDistance(500)).toBe("500 m")
  })

  it("exibe metros arredondados", () => {
    expect(formatDistance(750)).toBe("750 m")
  })

  it("converte para km quando >= 1000 m", () => {
    expect(formatDistance(1000)).toBe("1.0 km")
  })

  it("formata km com uma casa decimal", () => {
    expect(formatDistance(2500)).toBe("2.5 km")
  })

  it("arredonda km corretamente", () => {
    expect(formatDistance(1234)).toBe("1.2 km")
  })

  it("zero metros", () => {
    expect(formatDistance(0)).toBe("0 m")
  })
})

describe("formatRelativeTime", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2026-06-01T12:00:00.000Z"))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("futuro em segundos — menos de 60s", () => {
    const future = new Date("2026-06-01T12:00:30.000Z")
    const result = formatRelativeTime(future)
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
  })

  it("futuro em minutos", () => {
    const future = new Date("2026-06-01T12:05:00.000Z")
    const result = formatRelativeTime(future)
    expect(result).toMatch(/5|minuto/i)
  })

  it("futuro em horas", () => {
    const future = new Date("2026-06-01T15:00:00.000Z")
    const result = formatRelativeTime(future)
    expect(result).toMatch(/3|hora/i)
  })

  it("futuro em dias", () => {
    const future = new Date("2026-06-04T12:00:00.000Z")
    const result = formatRelativeTime(future)
    expect(result).toMatch(/3|dia/i)
  })

  it("passado também produz string válida", () => {
    const past = new Date("2026-05-30T12:00:00.000Z")
    const result = formatRelativeTime(past)
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
  })
})
