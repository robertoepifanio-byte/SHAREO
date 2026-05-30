import {
  hashDocument,
  verifyDocument,
  encryptDocument,
  decryptDocument,
  maskCPF,
  maskCNPJ,
} from "@/lib/crypto"

// ---------------------------------------------------------------------------
// Setup — ENCRYPTION_KEY de 64 chars hex (32 bytes de zeros)
// ---------------------------------------------------------------------------

const TEST_KEY = "0".repeat(64)

beforeEach(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY
})

afterEach(() => {
  delete process.env.ENCRYPTION_KEY
})

// ---------------------------------------------------------------------------
// hashDocument
// ---------------------------------------------------------------------------

describe("hashDocument", () => {
  it("retorna uma string hex não vazia para um CPF válido", () => {
    const hash = hashDocument("12345678900")
    expect(typeof hash).toBe("string")
    expect(hash.length).toBeGreaterThan(0)
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true)
  })

  it("mesmo input produz sempre o mesmo hash (determinístico)", () => {
    const hash1 = hashDocument("12345678900")
    const hash2 = hashDocument("12345678900")
    expect(hash1).toBe(hash2)
  })

  it("CPF com e sem formatação produz o mesmo hash", () => {
    const semFormatacao = hashDocument("12345678900")
    const comFormatacao = hashDocument("123.456.789-00")
    expect(semFormatacao).toBe(comFormatacao)
  })

  it("CNPJ com e sem formatação produz o mesmo hash", () => {
    const semFormatacao = hashDocument("12345678000100")
    const comFormatacao = hashDocument("12.345.678/0001-00")
    expect(semFormatacao).toBe(comFormatacao)
  })

  it("inputs diferentes produzem hashes diferentes", () => {
    const hash1 = hashDocument("12345678900")
    const hash2 = hashDocument("00000000000")
    expect(hash1).not.toBe(hash2)
  })

  it("lança erro quando ENCRYPTION_KEY não está definida", () => {
    delete process.env.ENCRYPTION_KEY
    expect(() => hashDocument("12345678900")).toThrow("ENCRYPTION_KEY não definida")
  })
})

// ---------------------------------------------------------------------------
// verifyDocument
// ---------------------------------------------------------------------------

describe("verifyDocument", () => {
  it("retorna true quando o documento corresponde ao hash", () => {
    const hash = hashDocument("12345678900")
    expect(verifyDocument("12345678900", hash)).toBe(true)
  })

  it("retorna true quando CPF formatado é comparado com hash do não-formatado", () => {
    const hash = hashDocument("12345678900")
    expect(verifyDocument("123.456.789-00", hash)).toBe(true)
  })

  it("retorna false quando o documento não corresponde ao hash", () => {
    const hash = hashDocument("12345678900")
    expect(verifyDocument("00000000000", hash)).toBe(false)
  })

  it("retorna false para hash adulterado", () => {
    const hash = hashDocument("12345678900")
    const adulterado = hash.slice(0, -1) + (hash.endsWith("0") ? "1" : "0")
    expect(verifyDocument("12345678900", adulterado)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// encryptDocument + decryptDocument (round-trip)
// ---------------------------------------------------------------------------

describe("encryptDocument / decryptDocument", () => {
  it("round-trip correto: encripta e decripta o mesmo CPF", () => {
    const cpf = "12345678900"
    const encrypted = encryptDocument(cpf)
    const decrypted = decryptDocument(encrypted)
    expect(decrypted).toBe(cpf)
  })

  it("round-trip correto: encripta e decripta CNPJ", () => {
    const cnpj = "12345678000100"
    const encrypted = encryptDocument(cnpj)
    const decrypted = decryptDocument(encrypted)
    expect(decrypted).toBe(cnpj)
  })

  it("remove não-dígitos antes de criptografar (CPF formatado → digits apenas)", () => {
    const comFormatacao = "123.456.789-00"
    const semFormatacao = "12345678900"
    const encComFormato = encryptDocument(comFormatacao)
    const decComFormato = decryptDocument(encComFormato)
    expect(decComFormato).toBe(semFormatacao)
  })

  it("dois encryptDocument do mesmo input produzem ciphertexts diferentes (IV aleatório)", () => {
    const cpf = "12345678900"
    const enc1 = encryptDocument(cpf)
    const enc2 = encryptDocument(cpf)
    // IVs aleatórios garantem que os ciphertexts são distintos
    expect(enc1).not.toBe(enc2)
    // Mas ambos decriptam para o mesmo valor
    expect(decryptDocument(enc1)).toBe(cpf)
    expect(decryptDocument(enc2)).toBe(cpf)
  })

  it("formato criptografado contém 3 partes separadas por ':'", () => {
    const encrypted = encryptDocument("12345678900")
    const parts = encrypted.split(":")
    expect(parts).toHaveLength(3)
    // Cada parte deve ser uma string hex não-vazia
    parts.forEach((p) => {
      expect(p.length).toBeGreaterThan(0)
      expect(/^[0-9a-f]+$/.test(p)).toBe(true)
    })
  })

  it("decryptDocument lança erro para formato sem 3 partes separadas por ':'", () => {
    expect(() => decryptDocument("invalido")).toThrow("Formato de dado criptografado inválido")
    expect(() => decryptDocument("parte1:parte2")).toThrow("Formato de dado criptografado inválido")
    expect(() => decryptDocument("a:b:c:d")).toThrow("Formato de dado criptografado inválido")
  })

  it("decryptDocument lança erro quando ENCRYPTION_KEY não está definida", () => {
    const encrypted = encryptDocument("12345678900")
    delete process.env.ENCRYPTION_KEY
    expect(() => decryptDocument(encrypted)).toThrow("ENCRYPTION_KEY não definida")
  })
})

// ---------------------------------------------------------------------------
// maskCPF
// ---------------------------------------------------------------------------

describe("maskCPF", () => {
  it("mascara CPF sem formatação no padrão •••.XXX.XXX-XX", () => {
    // "12345678900" → grupos: [123][456][789][00] → •••.456.789-00
    const masked = maskCPF("12345678900")
    expect(masked).toBe("•••.456.789-00")
  })

  it("mascara CPF com formatação no mesmo padrão", () => {
    // "123.456.789-00" → digits "12345678900" → •••.456.789-00
    const masked = maskCPF("123.456.789-00")
    expect(masked).toBe("•••.456.789-00")
  })

  it("CPF formatado e não-formatado produzem o mesmo resultado", () => {
    // "45678912300" e "456.789.123-00" devem mascarar identicamente
    const maskedSem = maskCPF("45678912300")
    const maskedCom = maskCPF("456.789.123-00")
    expect(maskedSem).toBe(maskedCom)
  })

  it("resultado contém os marcadores '•••' no início", () => {
    const masked = maskCPF("98765432100")
    expect(masked.startsWith("•••.")).toBe(true)
  })

  it("os três primeiros dígitos são substituídos por bullets (•••)", () => {
    const masked = maskCPF("12345678900")
    // Os três primeiros dígitos ("123") não devem aparecer
    expect(masked).not.toContain("123")
  })
})

// ---------------------------------------------------------------------------
// maskCNPJ
// ---------------------------------------------------------------------------

describe("maskCNPJ", () => {
  it("mascara CNPJ sem formatação no padrão ••.XXX.XXX/XXXX-XX", () => {
    const masked = maskCNPJ("12345678000100")
    expect(masked).toBe("••.345.678/0001-00")
  })

  it("mascara CNPJ com formatação no mesmo padrão", () => {
    const masked = maskCNPJ("12.345.678/0001-00")
    expect(masked).toBe("••.345.678/0001-00")
  })

  it("CNPJ formatado e não-formatado produzem o mesmo resultado", () => {
    const maskedSem = maskCNPJ("98765432000195")
    const maskedCom = maskCNPJ("98.765.432/0001-95")
    expect(maskedSem).toBe(maskedCom)
  })

  it("resultado contém os marcadores '••' no início", () => {
    const masked = maskCNPJ("12345678000100")
    expect(masked.startsWith("••.")).toBe(true)
  })

  it("os dois primeiros dígitos são substituídos por bullets (••)", () => {
    const masked = maskCNPJ("12345678000100")
    // Os dois primeiros dígitos ("12") não devem aparecer no início
    expect(masked.startsWith("12")).toBe(false)
  })
})
