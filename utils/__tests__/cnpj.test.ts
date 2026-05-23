import { validateCNPJ, formatCNPJ, stripCNPJ } from "../cnpj"

describe("validateCNPJ", () => {
  it("accepts valid CNPJ (unformatted)", () => {
    expect(validateCNPJ("11222333000181")).toBe(true)
  })

  it("accepts valid CNPJ (formatted)", () => {
    expect(validateCNPJ("11.222.333/0001-81")).toBe(true)
  })

  it("rejects all-same-digit sequences", () => {
    for (let d = 0; d <= 9; d++) {
      expect(validateCNPJ(String(d).repeat(14))).toBe(false)
    }
  })

  it("rejects wrong length", () => {
    expect(validateCNPJ("1122233300018")).toBe(false)
    expect(validateCNPJ("112223330001810")).toBe(false)
  })

  it("rejects invalid check digits", () => {
    expect(validateCNPJ("11222333000182")).toBe(false)
    expect(validateCNPJ("11222333000191")).toBe(false)
  })

  it("rejects empty string", () => {
    expect(validateCNPJ("")).toBe(false)
  })
})

describe("formatCNPJ", () => {
  it("formats raw digits", () => {
    expect(formatCNPJ("11222333000181")).toBe("11.222.333/0001-81")
  })

  it("re-formats already-formatted CNPJ", () => {
    expect(formatCNPJ("11.222.333/0001-81")).toBe("11.222.333/0001-81")
  })
})

describe("stripCNPJ", () => {
  it("removes all non-digits", () => {
    expect(stripCNPJ("11.222.333/0001-81")).toBe("11222333000181")
  })
})
