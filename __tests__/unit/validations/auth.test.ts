import { RegisterSchema, LoginSchema } from "@/lib/validations/auth"

// ---------------------------------------------------------------------------
// Dados válidos de base
// ---------------------------------------------------------------------------

/** CPF matematicamente válido: 529.982.247-25 */
const CPF_VALIDO = "529.982.247-25"
/** CNPJ matematicamente válido: 11.222.333/0001-81 */
const CNPJ_VALIDO = "11.222.333/0001-81"

const BASE_PF = {
  name: "Maria Silva",
  email: "maria@exemplo.com",
  password: "Senha1234",
  userType: "PF" as const,
  cpf: CPF_VALIDO,
  city: "Natal",
  state: "RN",
  consentVersion: "1",
}

const BASE_PJ = {
  name: "Empresa Exemplo",
  email: "contato@empresa.com",
  password: "Senha1234",
  userType: "PJ" as const,
  cnpj: CNPJ_VALIDO,
  city: "São Paulo",
  state: "SP",
  consentVersion: "1",
}

// ---------------------------------------------------------------------------
// RegisterSchema — casos válidos
// ---------------------------------------------------------------------------

describe("RegisterSchema", () => {
  describe("caso válido — Pessoa Física", () => {
    it("aceita payload PF mínimo completo", () => {
      const result = RegisterSchema.safeParse(BASE_PF)
      expect(result.success).toBe(true)
    })

    it("aceita payload PF com phone válido", () => {
      const result = RegisterSchema.safeParse({
        ...BASE_PF,
        phone: "+5584999991234",
      })
      expect(result.success).toBe(true)
    })

    it("aceita phone em branco (string vazia) para PF", () => {
      const result = RegisterSchema.safeParse({
        ...BASE_PF,
        phone: "",
      })
      expect(result.success).toBe(true)
    })

    it("aceita neighborhood opcional ausente", () => {
      const { ...payload } = BASE_PF
      const result = RegisterSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it("aceita neighborhood como string vazia", () => {
      const result = RegisterSchema.safeParse({
        ...BASE_PF,
        neighborhood: "",
      })
      expect(result.success).toBe(true)
    })
  })

  describe("caso válido — Pessoa Jurídica", () => {
    it("aceita payload PJ mínimo completo", () => {
      const result = RegisterSchema.safeParse(BASE_PJ)
      expect(result.success).toBe(true)
    })

    it("aceita payload PJ com phone e neighborhood", () => {
      const result = RegisterSchema.safeParse({
        ...BASE_PJ,
        phone: "+5511988887777",
        neighborhood: "Centro",
      })
      expect(result.success).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Campos obrigatórios ausentes
  // ---------------------------------------------------------------------------

  describe("campos obrigatórios ausentes", () => {
    it("rejeita quando name está ausente", () => {
      const { name: _, ...payload } = BASE_PF
      const result = RegisterSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it("rejeita quando email está ausente", () => {
      const { email: _, ...payload } = BASE_PF
      const result = RegisterSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it("rejeita quando password está ausente", () => {
      const { password: _, ...payload } = BASE_PF
      const result = RegisterSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it("rejeita quando userType está ausente", () => {
      const { userType: _, ...payload } = BASE_PF
      const result = RegisterSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it("rejeita quando city está ausente", () => {
      const { city: _, ...payload } = BASE_PF
      const result = RegisterSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it("rejeita quando state está ausente", () => {
      const { state: _, ...payload } = BASE_PF
      const result = RegisterSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it("rejeita quando consentVersion está ausente", () => {
      const { consentVersion: _, ...payload } = BASE_PF
      const result = RegisterSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // Validação de password
  // ---------------------------------------------------------------------------

  describe("password fraca", () => {
    it("rejeita password sem letra maiúscula", () => {
      const result = RegisterSchema.safeParse({
        ...BASE_PF,
        password: "senha1234",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("password"))).toBe(true)
      }
    })

    it("rejeita password sem dígito numérico", () => {
      const result = RegisterSchema.safeParse({
        ...BASE_PF,
        password: "SenhaSemNumero",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("password"))).toBe(true)
      }
    })

    it("rejeita password com menos de 8 caracteres", () => {
      const result = RegisterSchema.safeParse({
        ...BASE_PF,
        password: "Ab1",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("password"))).toBe(true)
      }
    })

    it("rejeita password com mais de 72 caracteres", () => {
      const result = RegisterSchema.safeParse({
        ...BASE_PF,
        password: "A1" + "a".repeat(71),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("password"))).toBe(true)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // CPF / CNPJ
  // ---------------------------------------------------------------------------

  describe("PF sem CPF", () => {
    it("rejeita PF sem campo cpf", () => {
      const { cpf: _, ...payload } = BASE_PF
      const result = RegisterSchema.safeParse(payload)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("cpf"))).toBe(true)
      }
    })

    it("rejeita PF com CPF matematicamente inválido", () => {
      const result = RegisterSchema.safeParse({
        ...BASE_PF,
        cpf: "000.000.000-00",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("cpf"))).toBe(true)
      }
    })
  })

  describe("PJ sem CNPJ", () => {
    it("rejeita PJ sem campo cnpj", () => {
      const { cnpj: _, ...payload } = BASE_PJ
      const result = RegisterSchema.safeParse(payload)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("cnpj"))).toBe(true)
      }
    })

    it("rejeita PJ com CNPJ matematicamente inválido", () => {
      const result = RegisterSchema.safeParse({
        ...BASE_PJ,
        cnpj: "00.000.000/0000-00",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("cnpj"))).toBe(true)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // Validação de email
  // ---------------------------------------------------------------------------

  describe("email inválido", () => {
    it("rejeita email sem @", () => {
      const result = RegisterSchema.safeParse({
        ...BASE_PF,
        email: "nao-e-email",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("email"))).toBe(true)
      }
    })

    it("rejeita email sem domínio", () => {
      const result = RegisterSchema.safeParse({
        ...BASE_PF,
        email: "usuario@",
      })
      expect(result.success).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // Validação de state
  // ---------------------------------------------------------------------------

  describe("state com comprimento incorreto", () => {
    it("rejeita state com 1 caractere", () => {
      const result = RegisterSchema.safeParse({
        ...BASE_PF,
        state: "R",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("state"))).toBe(true)
      }
    })

    it("rejeita state com 3 caracteres", () => {
      const result = RegisterSchema.safeParse({
        ...BASE_PF,
        state: "RNX",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("state"))).toBe(true)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // Validação de phone
  // ---------------------------------------------------------------------------

  describe("phone com formato errado", () => {
    it("rejeita phone sem prefixo +55", () => {
      const result = RegisterSchema.safeParse({
        ...BASE_PF,
        phone: "84999991234",
      })
      expect(result.success).toBe(false)
    })

    it("rejeita phone com poucos dígitos após +55", () => {
      const result = RegisterSchema.safeParse({
        ...BASE_PF,
        phone: "+5584",
      })
      expect(result.success).toBe(false)
    })

    it("rejeita phone com letras", () => {
      const result = RegisterSchema.safeParse({
        ...BASE_PF,
        phone: "+55849999abcd",
      })
      expect(result.success).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // Validação de consentVersion
  // ---------------------------------------------------------------------------

  describe("consentVersion vazia", () => {
    it("rejeita consentVersion como string vazia", () => {
      const result = RegisterSchema.safeParse({
        ...BASE_PF,
        consentVersion: "",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("consentVersion"))).toBe(true)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // Validação de name e city
  // ---------------------------------------------------------------------------

  describe("name com comprimento inválido", () => {
    it("rejeita name com menos de 3 caracteres", () => {
      const result = RegisterSchema.safeParse({
        ...BASE_PF,
        name: "AB",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("name"))).toBe(true)
      }
    })

    it("rejeita name com mais de 100 caracteres", () => {
      const result = RegisterSchema.safeParse({
        ...BASE_PF,
        name: "A".repeat(101),
      })
      expect(result.success).toBe(false)
    })
  })

  describe("city com comprimento inválido", () => {
    it("rejeita city com menos de 2 caracteres", () => {
      const result = RegisterSchema.safeParse({
        ...BASE_PF,
        city: "N",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("city"))).toBe(true)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // userType enum
  // ---------------------------------------------------------------------------

  describe("userType fora do enum", () => {
    it("rejeita userType desconhecido", () => {
      const result = RegisterSchema.safeParse({
        ...BASE_PF,
        userType: "ME",
      })
      expect(result.success).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// LoginSchema
// ---------------------------------------------------------------------------

describe("LoginSchema", () => {
  describe("caso válido", () => {
    it("aceita email e password preenchidos", () => {
      const result = LoginSchema.safeParse({
        email: "usuario@shareo.com",
        password: "qualquerSenha",
      })
      expect(result.success).toBe(true)
    })

    it("aceita password com apenas 1 caractere (min=1)", () => {
      const result = LoginSchema.safeParse({
        email: "a@b.com",
        password: "x",
      })
      expect(result.success).toBe(true)
    })
  })

  describe("campos ausentes", () => {
    it("rejeita quando email está ausente", () => {
      const result = LoginSchema.safeParse({ password: "Senha1234" })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("email"))).toBe(true)
      }
    })

    it("rejeita quando password está ausente", () => {
      const result = LoginSchema.safeParse({ email: "a@b.com" })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("password"))).toBe(true)
      }
    })

    it("rejeita password como string vazia (min=1)", () => {
      const result = LoginSchema.safeParse({
        email: "a@b.com",
        password: "",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("email inválido", () => {
    it("rejeita email sem formato válido", () => {
      const result = LoginSchema.safeParse({
        email: "nao-e-email",
        password: "Senha1234",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("email"))).toBe(true)
      }
    })
  })
})
