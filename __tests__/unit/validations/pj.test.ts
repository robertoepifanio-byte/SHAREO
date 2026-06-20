import { UpgradePjSchema, CompleteRegistrationSchema } from "@/lib/validations/auth"
import { buildPjUpdateData } from "@/lib/pjVerification"
import { decryptPII } from "@/lib/crypto"
import { CONSENT_VERSION } from "@/lib/legal-config"

const VALID_CNPJ = "11222333000181"
const VALID_CPF  = "52998224725"

// ---------------------------------------------------------------------------
// UpgradePjSchema (POST /api/users/me/upgrade-pj)
// ---------------------------------------------------------------------------

describe("UpgradePjSchema", () => {
  const base = { cnpj: VALID_CNPJ, responsavelLegal: "Maria da Silva", declaracaoVinculo: true as const }

  it("aceita payload válido com declaração marcada", () => {
    expect(UpgradePjSchema.safeParse(base).success).toBe(true)
  })

  it("rejeita declaração não marcada (false)", () => {
    const r = UpgradePjSchema.safeParse({ ...base, declaracaoVinculo: false })
    expect(r.success).toBe(false)
  })

  it("rejeita declaração ausente", () => {
    const { declaracaoVinculo, ...semDecl } = base
    void declaracaoVinculo
    expect(UpgradePjSchema.safeParse(semDecl).success).toBe(false)
  })

  it("rejeita nome de responsável legal muito curto", () => {
    expect(UpgradePjSchema.safeParse({ ...base, responsavelLegal: "Jo" }).success).toBe(false)
  })

  it("rejeita CNPJ inválido no dígito verificador", () => {
    expect(UpgradePjSchema.safeParse({ ...base, cnpj: "11222333000182" }).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// CompleteRegistrationSchema — caminho PJ (M4: CPF do responsável obrigatório)
// ---------------------------------------------------------------------------

describe("CompleteRegistrationSchema (PJ)", () => {
  const basePJ = {
    userType: "PJ" as const,
    cnpj: VALID_CNPJ,
    cpfResponsavel: VALID_CPF,
    responsavelLegal: "Maria da Silva",
    declaracaoVinculoPJ: true,
    city: "Recife",
    state: "PE",
  }

  it("aceita PJ com CPF do responsável + declaração", () => {
    expect(CompleteRegistrationSchema.safeParse(basePJ).success).toBe(true)
  })

  it("rejeita PJ sem CPF do responsável legal", () => {
    const { cpfResponsavel, ...semCpf } = basePJ
    void cpfResponsavel
    expect(CompleteRegistrationSchema.safeParse(semCpf).success).toBe(false)
  })

  it("rejeita PJ com CPF do responsável inválido", () => {
    expect(CompleteRegistrationSchema.safeParse({ ...basePJ, cpfResponsavel: "11111111111" }).success).toBe(false)
  })

  it("rejeita PJ sem declaração de vínculo", () => {
    expect(CompleteRegistrationSchema.safeParse({ ...basePJ, declaracaoVinculoPJ: false }).success).toBe(false)
  })

  it("PF continua válido sem campos de PJ", () => {
    const pf = { userType: "PF" as const, cpf: VALID_CPF, city: "Recife", state: "PE" }
    expect(CompleteRegistrationSchema.safeParse(pf).success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// buildPjUpdateData
// ---------------------------------------------------------------------------

describe("buildPjUpdateData", () => {
  beforeEach(() => { process.env.ENCRYPTION_KEY = "0".repeat(64) })
  afterEach(() => { delete process.env.ENCRYPTION_KEY })

  const input = { cnpj: VALID_CNPJ, responsavelLegal: "Maria da Silva", declaracaoIp: "200.1.2.3" }

  it("verification = null → pendente de revisão (fail-open)", () => {
    const data = buildPjUpdateData(input, null)
    expect(data.userType).toBe("PJ")
    expect(data.cnpjSituacaoVerificada).toBe(false)
    expect(data.cnpjDeclaracaoIp).toBe("200.1.2.3")
    expect(data.cnpjDeclaracaoVersion).toBe(CONSENT_VERSION)
    // nome criptografado e recuperável
    expect(decryptPII(data.cnpjResponsavelLegalEncrypted as string)).toBe("Maria da Silva")
    // sem dados da Receita
    expect(data.cnpjRazaoSocial).toBeUndefined()
  })

  it("verification ATIVA → verificada com dados da Receita", () => {
    const data = buildPjUpdateData(input, {
      razaoSocial: "EMPRESA TESTE LTDA",
      situacao: "ATIVA",
      dataAbertura: new Date("2020-01-15"),
      source: "brasilapi",
    })
    expect(data.cnpjSituacaoVerificada).toBe(true)
    expect(data.cnpjRazaoSocial).toBe("EMPRESA TESTE LTDA")
    expect(data.cnpjSituacao).toBe("ATIVA")
    expect(data.cnpjVerificadoAt).toBeInstanceOf(Date)
  })
})
