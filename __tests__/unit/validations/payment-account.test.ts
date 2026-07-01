/**
 * Testes unitários para lib/validations/payment-account.ts
 *
 * Schemas e funções cobertas:
 *  - PaymentAccountSchema — validação de chave PIX por tipo
 *  - pixKeyLabel          — labels amigáveis por tipo de chave
 *  - pixKeyPlaceholder    — exemplos de formato por tipo
 */

import {
  PaymentAccountSchema,
  pixKeyLabel,
  pixKeyPlaceholder,
} from "@/lib/validations/payment-account"

// ---------------------------------------------------------------------------
// PaymentAccountSchema — chaves válidas
// ---------------------------------------------------------------------------

describe("PaymentAccountSchema — casos válidos", () => {
  describe("tipo CPF", () => {
    it("aceita CPF formatado (com pontos e hífen)", () => {
      const r = PaymentAccountSchema.safeParse({
        pixKeyType: "CPF",
        pixKey:     "529.982.247-25",
        holderName: "Maria Silva",
      })
      expect(r.success).toBe(true)
    })

    it("aceita CPF sem formatação (somente dígitos)", () => {
      const r = PaymentAccountSchema.safeParse({
        pixKeyType: "CPF",
        pixKey:     "52998224725",
        holderName: "Maria Silva",
      })
      expect(r.success).toBe(true)
    })
  })

  describe("tipo CNPJ", () => {
    it("aceita CNPJ formatado", () => {
      const r = PaymentAccountSchema.safeParse({
        pixKeyType: "CNPJ",
        pixKey:     "11.222.333/0001-81",
        holderName: "Empresa LTDA",
      })
      expect(r.success).toBe(true)
    })

    it("aceita CNPJ sem formatação", () => {
      const r = PaymentAccountSchema.safeParse({
        pixKeyType: "CNPJ",
        pixKey:     "11222333000181",
        holderName: "Empresa LTDA",
      })
      expect(r.success).toBe(true)
    })
  })

  describe("tipo EMAIL", () => {
    it("aceita endereço de e-mail válido", () => {
      const r = PaymentAccountSchema.safeParse({
        pixKeyType: "EMAIL",
        pixKey:     "proprietario@shareo.com.br",
        holderName: "João Lima",
      })
      expect(r.success).toBe(true)
    })
  })

  describe("tipo PHONE", () => {
    it("aceita número de celular com prefixo +55 e 11 dígitos", () => {
      const r = PaymentAccountSchema.safeParse({
        pixKeyType: "PHONE",
        pixKey:     "+5584999991234",
        holderName: "Ana Costa",
      })
      expect(r.success).toBe(true)
    })

    it("aceita telefone fixo com 10 dígitos após +55", () => {
      const r = PaymentAccountSchema.safeParse({
        pixKeyType: "PHONE",
        pixKey:     "+558432221234",
        holderName: "Ana Costa",
      })
      expect(r.success).toBe(true)
    })
  })

  describe("tipo RANDOM (chave aleatória)", () => {
    it("aceita chave aleatória no formato UUID v4", () => {
      const r = PaymentAccountSchema.safeParse({
        pixKeyType: "RANDOM",
        pixKey:     "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        holderName: "Pedro Souza",
      })
      expect(r.success).toBe(true)
    })
  })

  describe("campos opcionais", () => {
    it("aceita bankName opcional", () => {
      const r = PaymentAccountSchema.safeParse({
        pixKeyType: "EMAIL",
        pixKey:     "teste@exemplo.com",
        holderName: "Titular",
        bankName:   "Nubank",
      })
      expect(r.success).toBe(true)
    })

    it("aceita sem bankName", () => {
      const r = PaymentAccountSchema.safeParse({
        pixKeyType: "EMAIL",
        pixKey:     "teste@exemplo.com",
        holderName: "Titular",
      })
      expect(r.success).toBe(true)
    })
  })
})

// ---------------------------------------------------------------------------
// PaymentAccountSchema — chaves inválidas
// ---------------------------------------------------------------------------

describe("PaymentAccountSchema — casos inválidos", () => {
  describe("tipo CPF com formato errado", () => {
    it("rejeita CPF com dígitos insuficientes", () => {
      const r = PaymentAccountSchema.safeParse({
        pixKeyType: "CPF",
        pixKey:     "123.456.789",
        holderName: "Maria",
      })
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.path.includes("pixKey"))).toBe(true)
    })
  })

  describe("tipo PHONE com formato errado", () => {
    it("rejeita telefone sem prefixo +55", () => {
      const r = PaymentAccountSchema.safeParse({
        pixKeyType: "PHONE",
        pixKey:     "84999991234",
        holderName: "Ana",
      })
      expect(r.success).toBe(false)
    })

    it("rejeita telefone com poucos dígitos após +55", () => {
      const r = PaymentAccountSchema.safeParse({
        pixKeyType: "PHONE",
        pixKey:     "+5584",
        holderName: "Ana",
      })
      expect(r.success).toBe(false)
    })
  })

  describe("tipo EMAIL com formato errado", () => {
    it("rejeita e-mail sem @", () => {
      const r = PaymentAccountSchema.safeParse({
        pixKeyType: "EMAIL",
        pixKey:     "nao-e-email",
        holderName: "João",
      })
      expect(r.success).toBe(false)
    })
  })

  describe("tipo RANDOM com formato errado", () => {
    it("rejeita string que não é UUID", () => {
      const r = PaymentAccountSchema.safeParse({
        pixKeyType: "RANDOM",
        pixKey:     "nao-e-um-uuid",
        holderName: "Pedro",
      })
      expect(r.success).toBe(false)
    })
  })

  describe("campos obrigatórios", () => {
    it("rejeita pixKey vazia", () => {
      const r = PaymentAccountSchema.safeParse({
        pixKeyType: "EMAIL",
        pixKey:     "",
        holderName: "Maria",
      })
      expect(r.success).toBe(false)
    })

    it("rejeita holderName muito curto (min=2)", () => {
      const r = PaymentAccountSchema.safeParse({
        pixKeyType: "EMAIL",
        pixKey:     "email@test.com",
        holderName: "A",
      })
      expect(r.success).toBe(false)
    })

    it("rejeita pixKeyType fora do enum", () => {
      const r = PaymentAccountSchema.safeParse({
        pixKeyType: "CHAVE_INVALIDA",
        pixKey:     "qualquer",
        holderName: "Maria",
      })
      expect(r.success).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// pixKeyLabel
// ---------------------------------------------------------------------------

describe("pixKeyLabel", () => {
  it("CPF → 'CPF'", () => {
    expect(pixKeyLabel("CPF")).toBe("CPF")
  })

  it("CNPJ → 'CNPJ'", () => {
    expect(pixKeyLabel("CNPJ")).toBe("CNPJ")
  })

  it("EMAIL → 'E-mail'", () => {
    expect(pixKeyLabel("EMAIL")).toBe("E-mail")
  })

  it("PHONE → 'Telefone'", () => {
    expect(pixKeyLabel("PHONE")).toBe("Telefone")
  })

  it("RANDOM → 'Chave aleatória'", () => {
    expect(pixKeyLabel("RANDOM")).toBe("Chave aleatória")
  })

  it("tipo desconhecido → retorna o próprio tipo como fallback", () => {
    expect(pixKeyLabel("UNKNOWN")).toBe("UNKNOWN")
  })
})

// ---------------------------------------------------------------------------
// pixKeyPlaceholder
// ---------------------------------------------------------------------------

describe("pixKeyPlaceholder", () => {
  it("CPF → placeholder no formato '000.000.000-00'", () => {
    expect(pixKeyPlaceholder("CPF")).toBe("000.000.000-00")
  })

  it("CNPJ → placeholder no formato '00.000.000/0001-00'", () => {
    expect(pixKeyPlaceholder("CNPJ")).toBe("00.000.000/0001-00")
  })

  it("EMAIL → placeholder de e-mail", () => {
    expect(pixKeyPlaceholder("EMAIL")).toBe("seu@email.com")
  })

  it("PHONE → placeholder com +55", () => {
    expect(pixKeyPlaceholder("PHONE")).toMatch(/^\+55/)
  })

  it("RANDOM → placeholder no formato UUID (hífens em posições corretas)", () => {
    const ph = pixKeyPlaceholder("RANDOM")
    expect(ph).toMatch(/^[x0-9a-f-]+$/)
  })

  it("tipo desconhecido → retorna string vazia", () => {
    expect(pixKeyPlaceholder("UNKNOWN")).toBe("")
  })
})
