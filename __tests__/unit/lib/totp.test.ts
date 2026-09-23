import {
  base32Decode,
  base32Encode,
  generateTotpSecret,
  totpAtStep,
  totpStep,
  totpUri,
  verifyTotp,
} from "@/lib/totp"

// Segredo ASCII "12345678901234567890" em base32 — o mesmo do Apêndice B do RFC 6238.
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"

describe("totp — vetores do RFC 6238 (SHA-1, 8 dígitos)", () => {
  it.each([
    [59,          "94287082"],
    [1111111109,  "07081804"],
    [1111111111,  "14050471"],
    [1234567890,  "89005924"],
    [2000000000,  "69279037"],
    [20000000000, "65353130"],
  ])("t=%i → %s", (t, esperado) => {
    expect(totpAtStep(RFC_SECRET, totpStep(t * 1000), 8)).toBe(esperado)
  })
})

describe("base32", () => {
  it("round-trip preserva os bytes", () => {
    const buf = Buffer.from("segredo-de-teste-🔑")
    expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true)
  })

  it("decodifica o segredo do RFC para o ASCII original", () => {
    expect(base32Decode(RFC_SECRET).toString("ascii")).toBe("12345678901234567890")
  })

  it("rejeita caractere fora do alfabeto", () => {
    expect(() => base32Decode("ABC1")).toThrow()
  })

  it("segredo gerado tem 32 caracteres (160 bits) e só usa o alfabeto", () => {
    const s = generateTotpSecret()
    expect(s).toMatch(/^[A-Z2-7]{32}$/)
    expect(generateTotpSecret()).not.toBe(s)
  })
})

describe("verifyTotp", () => {
  const nowMs = 1_700_000_000_000
  const step  = totpStep(nowMs)

  it("aceita o código do passo atual e devolve o passo", () => {
    expect(verifyTotp(RFC_SECRET, totpAtStep(RFC_SECRET, step), { nowMs })).toBe(step)
  })

  it("aceita um passo de tolerância para cada lado", () => {
    expect(verifyTotp(RFC_SECRET, totpAtStep(RFC_SECRET, step - 1), { nowMs })).toBe(step - 1)
    expect(verifyTotp(RFC_SECRET, totpAtStep(RFC_SECRET, step + 1), { nowMs })).toBe(step + 1)
  })

  it("recusa dois passos de distância", () => {
    expect(verifyTotp(RFC_SECRET, totpAtStep(RFC_SECRET, step - 2), { nowMs })).toBeNull()
    expect(verifyTotp(RFC_SECRET, totpAtStep(RFC_SECRET, step + 2), { nowMs })).toBeNull()
  })

  it("recusa replay: passo já consumido não vale de novo", () => {
    const code = totpAtStep(RFC_SECRET, step)
    expect(verifyTotp(RFC_SECRET, code, { nowMs, lastUsedStep: step })).toBeNull()
  })

  it("recusa passo mais VELHO que o último consumido", () => {
    const code = totpAtStep(RFC_SECRET, step - 1)
    expect(verifyTotp(RFC_SECRET, code, { nowMs, lastUsedStep: step })).toBeNull()
  })

  it("passo novo depois de um consumido continua valendo", () => {
    const code = totpAtStep(RFC_SECRET, step + 1)
    expect(verifyTotp(RFC_SECRET, code, { nowMs, lastUsedStep: step })).toBe(step + 1)
  })

  it.each(["", "12345", "1234567", "12345a", " 123456", "123 456"])("recusa formato inválido %j", (c) => {
    expect(verifyTotp(RFC_SECRET, c, { nowMs })).toBeNull()
  })

  it("recusa código de outro segredo", () => {
    const outro = generateTotpSecret()
    expect(verifyTotp(RFC_SECRET, totpAtStep(outro, step), { nowMs })).toBeNull()
  })
})

describe("totpUri", () => {
  it("monta a URI otpauth com issuer, período e dígitos", () => {
    const uri = totpUri("ABC234", "admin@shareo.com.br")
    expect(uri.startsWith("otpauth://totp/ShareO:admin%40shareo.com.br?")).toBe(true)
    const q = new URL(uri).searchParams
    expect(q.get("secret")).toBe("ABC234")
    expect(q.get("issuer")).toBe("ShareO")
    expect(q.get("digits")).toBe("6")
    expect(q.get("period")).toBe("30")
  })
})
