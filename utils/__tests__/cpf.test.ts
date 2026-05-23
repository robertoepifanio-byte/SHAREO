import { validateCPF, formatCPF, stripCPF } from "../cpf"

describe("validateCPF", () => {
  it("accepts valid CPF (unformatted)", () => {
    expect(validateCPF("52998224725")).toBe(true)
  })

  it("accepts valid CPF (formatted)", () => {
    expect(validateCPF("529.982.247-25")).toBe(true)
  })

  it("rejects all-same-digit sequences", () => {
    for (let d = 0; d <= 9; d++) {
      expect(validateCPF(String(d).repeat(11))).toBe(false)
    }
  })

  it("rejects wrong length", () => {
    expect(validateCPF("1234567890")).toBe(false)
    expect(validateCPF("123456789012")).toBe(false)
  })

  it("rejects invalid check digits", () => {
    expect(validateCPF("52998224726")).toBe(false)
    expect(validateCPF("52998224715")).toBe(false)
  })

  it("rejects empty string", () => {
    expect(validateCPF("")).toBe(false)
  })
})

describe("formatCPF", () => {
  it("formats raw digits", () => {
    expect(formatCPF("52998224725")).toBe("529.982.247-25")
  })

  it("re-formats already-formatted CPF", () => {
    expect(formatCPF("529.982.247-25")).toBe("529.982.247-25")
  })
})

describe("stripCPF", () => {
  it("removes all non-digits", () => {
    expect(stripCPF("529.982.247-25")).toBe("52998224725")
  })
})
