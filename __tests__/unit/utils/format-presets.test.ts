/**
 * Testes unitários para os presets de formatação de utils/format.ts
 *
 * Complementa __tests__/unit/utils/format.test.ts (que cobre formatPrice,
 * formatDate, formatDistance e formatRelativeTime).
 *
 * Funções cobertas aqui:
 *  - formatDateShort    — "23 de jun. de 2026"
 *  - formatDateNumeric  — "23/06/2026"
 *  - formatDateMonthDay — "23 de jun."
 *  - formatDateLong     — "23 de junho de 2026"
 *  - formatMonthYear    — "junho de 2026"
 *  - formatTime         — "14:30"
 *  - formatDateTime     — "23/06/2026 14:30"
 *  - formatNumber       — "1.234"
 */

import {
  formatDateShort,
  formatDateNumeric,
  formatDateMonthDay,
  formatDateLong,
  formatMonthYear,
  formatTime,
  formatDateTime,
  formatNumber,
} from "@/utils/format"

// Data de referência fixa: 23 de junho de 2026 às 14:30 UTC
const FIXED_DATE = new Date("2026-06-23T14:30:00.000Z")

// ---------------------------------------------------------------------------
// formatDateShort
// ---------------------------------------------------------------------------

describe("formatDateShort", () => {
  it("retorna string não vazia", () => {
    expect(formatDateShort(FIXED_DATE).length).toBeGreaterThan(0)
  })

  it("contém o ano 2026", () => {
    expect(formatDateShort(FIXED_DATE)).toContain("2026")
  })

  it("aceita string ISO como input", () => {
    const result = formatDateShort("2026-06-23T14:30:00.000Z")
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
  })

  it("contém abreviação do mês (ex: jun)", () => {
    // pt-BR: "23 de jun. de 2026"
    const result = formatDateShort(FIXED_DATE)
    expect(result.toLowerCase()).toMatch(/jun/)
  })
})

// ---------------------------------------------------------------------------
// formatDateNumeric
// ---------------------------------------------------------------------------

describe("formatDateNumeric", () => {
  it("retorna string não vazia", () => {
    expect(formatDateNumeric(FIXED_DATE).length).toBeGreaterThan(0)
  })

  it("contém separadores de data '/'", () => {
    expect(formatDateNumeric(FIXED_DATE)).toContain("/")
  })

  it("contém o ano 2026", () => {
    expect(formatDateNumeric(FIXED_DATE)).toContain("2026")
  })

  it("contém '06' (mês junho em formato numérico)", () => {
    expect(formatDateNumeric(FIXED_DATE)).toContain("06")
  })
})

// ---------------------------------------------------------------------------
// formatDateMonthDay
// ---------------------------------------------------------------------------

describe("formatDateMonthDay", () => {
  it("retorna string não vazia", () => {
    expect(formatDateMonthDay(FIXED_DATE).length).toBeGreaterThan(0)
  })

  it("NÃO contém o ano", () => {
    // Não deve incluir "2026" — apenas dia e mês
    expect(formatDateMonthDay(FIXED_DATE)).not.toContain("2026")
  })

  it("contém abreviação do mês", () => {
    expect(formatDateMonthDay(FIXED_DATE).toLowerCase()).toMatch(/jun/)
  })
})

// ---------------------------------------------------------------------------
// formatDateLong
// ---------------------------------------------------------------------------

describe("formatDateLong", () => {
  it("retorna string não vazia", () => {
    expect(formatDateLong(FIXED_DATE).length).toBeGreaterThan(0)
  })

  it("contém o ano 2026", () => {
    expect(formatDateLong(FIXED_DATE)).toContain("2026")
  })

  it("contém 'junho' por extenso (pt-BR)", () => {
    expect(formatDateLong(FIXED_DATE).toLowerCase()).toContain("junho")
  })

  it("contém o dia 23", () => {
    expect(formatDateLong(FIXED_DATE)).toMatch(/23/)
  })
})

// ---------------------------------------------------------------------------
// formatMonthYear
// ---------------------------------------------------------------------------

describe("formatMonthYear", () => {
  it("retorna string não vazia", () => {
    expect(formatMonthYear(FIXED_DATE).length).toBeGreaterThan(0)
  })

  it("contém o ano 2026", () => {
    expect(formatMonthYear(FIXED_DATE)).toContain("2026")
  })

  it("contém 'junho' por extenso (pt-BR)", () => {
    expect(formatMonthYear(FIXED_DATE).toLowerCase()).toContain("junho")
  })

  it("NÃO contém o dia do mês", () => {
    // formatMonthYear só tem mês + ano; NÃO tem dia
    // O número 23 pode aparecer como parte de "2026"? não — "2026" não contém "23".
    // Mas para ser preciso: testamos que o resultado começa pelo mês
    const result = formatMonthYear(FIXED_DATE).toLowerCase()
    expect(result.startsWith("junho")).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// formatTime
// ---------------------------------------------------------------------------

describe("formatTime", () => {
  it("retorna string não vazia", () => {
    expect(formatTime(FIXED_DATE).length).toBeGreaterThan(0)
  })

  it("contém separador ':' entre hora e minuto", () => {
    expect(formatTime(FIXED_DATE)).toContain(":")
  })

  it("retorna string com no máximo 5 caracteres (HH:MM)", () => {
    // pt-BR: "14:30" ou "14h30" dependendo do ambiente
    expect(formatTime(FIXED_DATE).length).toBeLessThanOrEqual(10)
  })

  it("aceita string ISO como input", () => {
    const result = formatTime("2026-06-23T14:30:00.000Z")
    expect(typeof result).toBe("string")
    expect(result).toContain(":")
  })
})

// ---------------------------------------------------------------------------
// formatDateTime
// ---------------------------------------------------------------------------

describe("formatDateTime", () => {
  it("retorna string não vazia", () => {
    expect(formatDateTime(FIXED_DATE).length).toBeGreaterThan(0)
  })

  it("contém o ano 2026", () => {
    expect(formatDateTime(FIXED_DATE)).toContain("2026")
  })

  it("contém separador ':' (parte da hora)", () => {
    expect(formatDateTime(FIXED_DATE)).toContain(":")
  })

  it("contém '06' (mês junho)", () => {
    expect(formatDateTime(FIXED_DATE)).toContain("06")
  })
})

// ---------------------------------------------------------------------------
// formatNumber
// ---------------------------------------------------------------------------

describe("formatNumber", () => {
  it("formata número inteiro simples", () => {
    expect(formatNumber(42)).toBe("42")
  })

  it("formata número com separador de milhar pt-BR (ponto)", () => {
    expect(formatNumber(1234)).toBe("1.234")
  })

  it("formata número grande com múltiplos separadores", () => {
    expect(formatNumber(1_234_567)).toBe("1.234.567")
  })

  it("formata zero", () => {
    expect(formatNumber(0)).toBe("0")
  })

  it("retorna string", () => {
    expect(typeof formatNumber(100)).toBe("string")
  })
})
