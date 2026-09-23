/** @jest-environment node */
import crypto from "crypto"

process.env.ENCRYPTION_KEY = "11".repeat(32)
process.env.HMAC_KEY       = "22".repeat(32)

const mockUpdateMany   = jest.fn()
const mockFindUnique   = jest.fn()
const mockExecuteRaw   = jest.fn()
const mockAdminLogCreate = jest.fn().mockResolvedValue({})

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user:     { updateMany: (...a: unknown[]) => mockUpdateMany(...a), findUnique: (...a: unknown[]) => mockFindUnique(...a), update: jest.fn() },
    adminLog: { create: (...a: unknown[]) => mockAdminLogCreate(...a) },
    $executeRaw: (...a: unknown[]) => mockExecuteRaw(...a),
  },
}))
jest.mock("@/lib/rateLimit", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 9, resetAt: 0 }),
  RATE_LIMITS:    { adminMfa: { limit: 10, windowMs: 900_000 } },
}))
// CredentialsSignin do next-auth puxa ESM que o Jest não transforma — só precisamos de uma classe base.
jest.mock("next-auth", () => ({ CredentialsSignin: class extends Error { code = "credentials" } }))

import { checkRateLimit } from "@/lib/rateLimit"
import { encryptPII, hashToken } from "@/lib/crypto"
import { generateTotpSecret, totpAtStep, totpStep } from "@/lib/totp"
import {
  checkAdminSecondFactor,
  confirmEnrollment,
  generateRecoveryCodes,
  MfaInvalidError,
  MfaRequiredError,
  normalizeRecoveryCode,
  startEnrollment,
} from "@/lib/auth/mfa"

const SECRET = generateTotpSecret()
const nowCode = () => totpAtStep(SECRET, totpStep(Date.now()))

function adminUser(over: Record<string, unknown> = {}) {
  return {
    id: "adm-1", role: "ADMIN",
    totpSecretEnc: encryptPII(SECRET), totpEnabledAt: new Date(), totpLastStep: null,
    totpRecoveryHashes: [] as string[],
    ...over,
  }
}

/** Admin ativo com cadastro do 2FA iniciado e ainda não confirmado. */
function pendente(over: Record<string, unknown> = {}) {
  return { role: "ADMIN", isActive: true, deletedAt: null, totpSecretEnc: encryptPII(SECRET), totpEnabledAt: null, ...over }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUpdateMany.mockResolvedValue({ count: 1 })
  mockExecuteRaw.mockResolvedValue(1)
  ;(checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true, remaining: 9, resetAt: 0 })
})

describe("códigos de recuperação", () => {
  it("gera 10 códigos únicos no formato XXXXX-XXXXX, sem caracteres ambíguos", () => {
    const codes = generateRecoveryCodes()
    expect(codes).toHaveLength(10)
    expect(new Set(codes).size).toBe(10)
    for (const c of codes) expect(c).toMatch(/^[A-HJKMNP-Z2-9]{5}-[A-HJKMNP-Z2-9]{5}$/)
  })

  it("normaliza minúsculas, espaços e ausência do hífen para o mesmo valor", () => {
    expect(normalizeRecoveryCode("abcde-fghjk")).toBe("ABCDEFGHJK")
    expect(normalizeRecoveryCode(" ABCDE FGHJK ")).toBe("ABCDEFGHJK")
  })

  it.each(["", "ABCDE", "ABCDE-FGHJK1", "ABCDE-FGHJ0", "ABCDE-FGHJI"])("recusa %j (tamanho errado ou caractere fora do alfabeto)", (c) => {
    expect(normalizeRecoveryCode(c)).toBeNull()
  })

  it("o hash é o SHA-256 do código normalizado — nunca o código em claro", () => {
    expect(hashToken("ABCDEFGHJK")).toBe(crypto.createHash("sha256").update("ABCDEFGHJK").digest("hex"))
  })
})

describe("checkAdminSecondFactor", () => {
  it("usuário comum: não há segundo fator, mfa=false, e nada é consultado", async () => {
    const r = await checkAdminSecondFactor({ ...adminUser(), role: "USER" }, undefined)
    expect(r).toBe(false)
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it("admin SEM 2FA cadastrado: entra, mas SEM mfa (a sessão será rebaixada)", async () => {
    const r = await checkAdminSecondFactor(adminUser({ totpEnabledAt: null, totpSecretEnc: null }), undefined)
    expect(r).toBe(false)
  })

  it("admin com 2FA e SEM código → MfaRequiredError (o formulário pede o código)", async () => {
    await expect(checkAdminSecondFactor(adminUser(), undefined)).rejects.toBeInstanceOf(MfaRequiredError)
    await expect(checkAdminSecondFactor(adminUser(), "   ")).rejects.toBeInstanceOf(MfaRequiredError)
  })

  it("código TOTP correto → mfa=true e grava o passo consumido", async () => {
    const r = await checkAdminSecondFactor(adminUser(), nowCode())
    expect(r).toBe(true)
    const { where, data } = mockUpdateMany.mock.calls[0][0]
    expect(data.totpLastStep).toBe(totpStep(Date.now()))
    // O UPDATE é condicional ao passo ser mais novo — é ele que barra o replay concorrente.
    expect(where.OR).toEqual([{ totpLastStep: null }, { totpLastStep: { lt: data.totpLastStep } }])
  })

  it("código TOTP errado → MfaInvalidError", async () => {
    const errado = nowCode() === "000000" ? "000001" : "000000"
    await expect(checkAdminSecondFactor(adminUser(), errado)).rejects.toBeInstanceOf(MfaInvalidError)
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it("replay entre requisições: passo já consumido (totpLastStep) é recusado", async () => {
    const step = totpStep(Date.now())
    await expect(checkAdminSecondFactor(adminUser({ totpLastStep: step }), nowCode())).rejects.toBeInstanceOf(MfaInvalidError)
  })

  it("replay CONCORRENTE: outro login já gravou o passo (UPDATE afeta 0 linhas) → recusado", async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 })
    await expect(checkAdminSecondFactor(adminUser(), nowCode())).rejects.toBeInstanceOf(MfaInvalidError)
  })

  it("código de recuperação válido → mfa=true, consumido no banco e auditado", async () => {
    const [codigo] = generateRecoveryCodes()
    const r = await checkAdminSecondFactor(
      adminUser({ totpRecoveryHashes: [hashToken(normalizeRecoveryCode(codigo)!), "outro"] }),
      codigo.toLowerCase(),
    )
    expect(r).toBe(true)
    expect(mockExecuteRaw).toHaveBeenCalledTimes(1)
    expect(mockAdminLogCreate.mock.calls[0][0].data).toMatchObject({ action: "MFA_RECOVERY_CODE_USED", adminId: "adm-1" })
  })

  it("código de recuperação já usado (UPDATE afeta 0 linhas) → recusado, sem auditoria de uso", async () => {
    mockExecuteRaw.mockResolvedValue(0)
    await expect(checkAdminSecondFactor(adminUser(), "ABCDE-FGHJK")).rejects.toBeInstanceOf(MfaInvalidError)
    expect(mockAdminLogCreate).not.toHaveBeenCalled()
  })

  it("lixo que não é TOTP nem código de recuperação → recusado sem tocar no banco", async () => {
    await expect(checkAdminSecondFactor(adminUser(), "abc")).rejects.toBeInstanceOf(MfaInvalidError)
    expect(mockUpdateMany).not.toHaveBeenCalled()
    expect(mockExecuteRaw).not.toHaveBeenCalled()
  })

  it("rate limit estourado: nem o código CERTO passa", async () => {
    ;(checkRateLimit as jest.Mock).mockResolvedValue({ allowed: false, remaining: 0, resetAt: 0 })
    await expect(checkAdminSecondFactor(adminUser(), nowCode())).rejects.toBeInstanceOf(MfaInvalidError)
  })
})

describe("cadastro do autenticador", () => {
  it("startEnrollment só age em quem NÃO tem 2FA ativo e devolve segredo + URI", async () => {
    const r = await startEnrollment("adm-1", "admin@shareo.com.br")
    expect(mockUpdateMany.mock.calls[0][0].where).toEqual({ id: "adm-1", totpEnabledAt: null })
    expect(r?.uri).toContain("otpauth://totp/ShareO:admin%40shareo.com.br")
    expect(r?.uri).toContain(`secret=${r?.secret}`)
    // O segredo é gravado CIFRADO, não em claro.
    expect(mockUpdateMany.mock.calls[0][0].data.totpSecretEnc).not.toContain(r!.secret)
  })

  it("startEnrollment recusa quem já tem 2FA (nenhuma linha afetada)", async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 })
    expect(await startEnrollment("adm-1", "a@b.c")).toBeNull()
  })

  it("confirmEnrollment com código certo devolve 10 códigos e grava só os HASHES", async () => {
    mockFindUnique.mockResolvedValue(pendente())
    const codes = await confirmEnrollment("adm-1", nowCode())
    expect(codes).toHaveLength(10)
    const { where, data } = mockUpdateMany.mock.calls[0][0]
    expect(where).toEqual({ id: "adm-1", totpEnabledAt: null })
    expect(data.totpEnabledAt).toBeInstanceOf(Date)
    expect(data.totpRecoveryHashes).toEqual(codes!.map((c) => hashToken(c.replace("-", ""))))
    expect(JSON.stringify(data)).not.toContain(codes![0])
  })

  it("confirmEnrollment com código errado não ativa nada", async () => {
    mockFindUnique.mockResolvedValue(pendente())
    const errado = nowCode() === "000000" ? "000001" : "000000"
    expect(await confirmEnrollment("adm-1", errado)).toBeNull()
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it("confirmEnrollment recusa quando o 2FA já está ativo (não gera um 2º conjunto de códigos)", async () => {
    mockFindUnique.mockResolvedValue(pendente({ totpEnabledAt: new Date() }))
    expect(await confirmEnrollment("adm-1", nowCode())).toBeNull()
  })

  it.each([
    ["não é admin", { role: "USER" }],
    ["está inativo", { isActive: false }],
    ["foi excluído", { deletedAt: new Date() }],
  ])("confirmEnrollment recusa quem %s", async (_caso, over) => {
    mockFindUnique.mockResolvedValue(pendente(over))
    expect(await confirmEnrollment("adm-1", nowCode())).toBeNull()
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it("confirmEnrollment: dois cliques simultâneos — só o primeiro leva os códigos", async () => {
    mockFindUnique.mockResolvedValue(pendente())
    mockUpdateMany.mockResolvedValue({ count: 0 }) // o outro pedido já ativou
    expect(await confirmEnrollment("adm-1", nowCode())).toBeNull()
  })
})
