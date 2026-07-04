/** @jest-environment node */
/**
 * TEST-BL2 (parte 2) — Testes de integração para lib/referral.ts
 *
 * `applyReferralCode`, `getOrCreateReferralCode` e `getReferralStats` estavam
 * sem cobertura. O Prisma client e `getReferralWindowDays` são mockados no
 * nível de módulo — padrão já adotado nos demais testes de integração.
 *
 * Casos cobertos:
 *
 * applyReferralCode:
 *   (a) código inválido (referrer não encontrado) → error "Código de indicação inválido."
 *   (b) próprio código → error "Você não pode usar seu próprio código."
 *   (c) usuário não encontrado → error "Usuário não encontrado."
 *   (d) usuário já tem referral vinculado → error "Você já usou um código de indicação."
 *   (e) fora da janela de referral → error com o número de dias configurado
 *   (f) dentro da janela → cria Referral PENDING e vincula referredById
 *   (g) código normalizado (trim + toUpperCase)
 *   (h) referral já existe no banco (idempotência) → error
 *
 * getOrCreateReferralCode:
 *   (i) usuário já tem código → retorna sem criar
 *   (j) usuário sem código → gera e salva
 *
 * getReferralStats:
 *   (k) retorna code, totalReferrals, hasBeenReferred
 *
 * NOTA SOBRE TESTABILIDADE:
 *   As funções acessam `prisma` e `getReferralWindowDays` diretamente, sem
 *   injeção de dependência. Os testes mockam ambos no nível de módulo. O
 *   backlog original (TEST-BL2) reconhece que refatorar para extrair
 *   testabilidade está fora do escopo desta entrega.
 */

import {
  applyReferralCode,
  getOrCreateReferralCode,
  getReferralStats,
} from "@/lib/referral"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUserFindUnique   = jest.fn()
const mockUserUpdate       = jest.fn()
const mockReferralFindUnique = jest.fn()
const mockReferralCreate   = jest.fn()
const mockReferralCount    = jest.fn()
const mockTransaction      = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      update:     (...a: unknown[]) => mockUserUpdate(...a),
    },
    referral: {
      findUnique: (...a: unknown[]) => mockReferralFindUnique(...a),
      create:     (...a: unknown[]) => mockReferralCreate(...a),
      count:      (...a: unknown[]) => mockReferralCount(...a),
    },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
  },
}))

const mockGetReferralWindowDays = jest.fn()
jest.mock("@/lib/platform-config", () => ({
  getReferralWindowDays: (...a: unknown[]) => mockGetReferralWindowDays(...a),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const REFERRER_ID   = "ckrferrer000000000000001"
const REFERRED_ID   = "ckrreferred00000000001"
const REFERRER_CODE = "JOAO-AB12"

/** Usuário referrer padrão (dono do código). */
function referrerUser() {
  return { id: REFERRER_ID, name: "João Silva" }
}

/** Usuário que quer aplicar o código — recém-cadastrado (dentro da janela de 30 dias). */
function newUser(overrides: Record<string, unknown> = {}) {
  return {
    referredById: null,
    createdAt:    new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 dia atrás
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()
  // Padrão: janela de 30 dias
  mockGetReferralWindowDays.mockResolvedValue(30)
  // Padrão: referrer existe
  mockUserFindUnique.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
    if (where.referralCode === REFERRER_CODE) return Promise.resolve(referrerUser())
    if (where.id === REFERRED_ID)             return Promise.resolve(newUser())
    return Promise.resolve(null)
  })
  // Padrão: sem referral existente
  mockReferralFindUnique.mockResolvedValue(null)
  // Padrão: $transaction executa a lista de promessas
  mockTransaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))
  mockUserUpdate.mockResolvedValue({})
  mockReferralCreate.mockResolvedValue({})
})

// ---------------------------------------------------------------------------
// applyReferralCode
// ---------------------------------------------------------------------------

describe("applyReferralCode", () => {

  describe("(a) código inválido — referrer não encontrado", () => {
    it("retorna error 'Código de indicação inválido.' quando o código não existe no banco", async () => {
      mockUserFindUnique.mockImplementation(() => Promise.resolve(null))

      const result = await applyReferralCode(REFERRED_ID, "INVALIDO")

      expect(result).toEqual({ success: false, error: "Código de indicação inválido." })
    })
  })

  describe("(b) próprio código", () => {
    it("retorna error quando o userId é igual ao referrer.id", async () => {
      // Usuário tenta usar seu próprio código
      mockUserFindUnique.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
        if (where.referralCode) return Promise.resolve({ id: REFERRED_ID, name: "João" })
        return Promise.resolve(null)
      })

      const result = await applyReferralCode(REFERRED_ID, REFERRER_CODE)

      expect(result).toEqual({ success: false, error: "Você não pode usar seu próprio código." })
    })
  })

  describe("(c) usuário não encontrado", () => {
    it("retorna error 'Usuário não encontrado.' quando o userId não existe", async () => {
      mockUserFindUnique.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
        if (where.referralCode) return Promise.resolve(referrerUser())
        if (where.id)           return Promise.resolve(null) // referred não existe
        return Promise.resolve(null)
      })

      const result = await applyReferralCode("usuario-inexistente", REFERRER_CODE)

      expect(result).toEqual({ success: false, error: "Usuário não encontrado." })
    })
  })

  describe("(d) já tem referral vinculado (referredById preenchido)", () => {
    it("retorna error 'Você já usou um código de indicação.' quando referredById != null", async () => {
      mockUserFindUnique.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
        if (where.referralCode) return Promise.resolve(referrerUser())
        if (where.id)           return Promise.resolve(newUser({ referredById: REFERRER_ID }))
        return Promise.resolve(null)
      })

      const result = await applyReferralCode(REFERRED_ID, REFERRER_CODE)

      expect(result).toEqual({ success: false, error: "Você já usou um código de indicação." })
    })
  })

  describe("(e) fora da janela de referral", () => {
    it("retorna error com o número de dias quando usuário foi criado há mais tempo que a janela", async () => {
      mockGetReferralWindowDays.mockResolvedValue(30)
      mockUserFindUnique.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
        if (where.referralCode) return Promise.resolve(referrerUser())
        if (where.id) return Promise.resolve(newUser({
          createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 dias atrás → fora da janela
        }))
        return Promise.resolve(null)
      })

      const result = await applyReferralCode(REFERRED_ID, REFERRER_CODE)

      expect(result).toEqual({
        success: false,
        error: "O código só pode ser aplicado nos primeiros 30 dias após o cadastro.",
      })
    })

    it("respeita janela configurável (ex: 7 dias)", async () => {
      mockGetReferralWindowDays.mockResolvedValue(7)
      mockUserFindUnique.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
        if (where.referralCode) return Promise.resolve(referrerUser())
        if (where.id) return Promise.resolve(newUser({
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 dias atrás → fora da janela de 7
        }))
        return Promise.resolve(null)
      })

      const result = await applyReferralCode(REFERRED_ID, REFERRER_CODE)

      expect(result).toEqual({
        success: false,
        error: "O código só pode ser aplicado nos primeiros 7 dias após o cadastro.",
      })
    })

    it("aceita código quando usuário está exatamente no último dia da janela (boundary)", async () => {
      mockGetReferralWindowDays.mockResolvedValue(30)
      // Criado exatamente 30 dias atrás menos 1 minuto → dentro da janela
      mockUserFindUnique.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
        if (where.referralCode) return Promise.resolve(referrerUser())
        if (where.id) return Promise.resolve(newUser({
          createdAt: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000 - 60_000)),
        }))
        return Promise.resolve(null)
      })

      const result = await applyReferralCode(REFERRED_ID, REFERRER_CODE)

      expect(result).toEqual({ success: true })
    })
  })

  describe("(f) dentro da janela — caminho feliz", () => {
    it("retorna { success: true } quando tudo está correto", async () => {
      const result = await applyReferralCode(REFERRED_ID, REFERRER_CODE)

      expect(result).toEqual({ success: true })
    })

    it("executa $transaction com update de referredById e create de Referral PENDING", async () => {
      await applyReferralCode(REFERRED_ID, REFERRER_CODE)

      expect(mockTransaction).toHaveBeenCalledTimes(1)
      // A transação recebe um array de 2 operações (update + create)
      const ops = mockTransaction.mock.calls[0][0]
      expect(Array.isArray(ops)).toBe(true)
      expect(ops).toHaveLength(2)
    })

    it("chama user.update com referredById do referrer", async () => {
      await applyReferralCode(REFERRED_ID, REFERRER_CODE)

      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: REFERRED_ID },
          data:  { referredById: REFERRER_ID },
        })
      )
    })

    it("cria Referral com status PENDING e os IDs corretos", async () => {
      await applyReferralCode(REFERRED_ID, REFERRER_CODE)

      expect(mockReferralCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            referrerId: REFERRER_ID,
            referredId: REFERRED_ID,
            status:     "PENDING",
          }),
        })
      )
    })
  })

  describe("(g) normalização do código", () => {
    it("aplica trim e toUpperCase antes de buscar o referrer", async () => {
      await applyReferralCode(REFERRED_ID, `  ${REFERRER_CODE.toLowerCase()}  `)

      // Primeiro findUnique é por referralCode — deve receber o código normalizado
      const firstCall = mockUserFindUnique.mock.calls[0][0]
      expect(firstCall.where.referralCode).toBe(REFERRER_CODE)
    })
  })

  describe("(h) Referral já existe no banco (idempotência)", () => {
    it("retorna error quando referral.findUnique retorna um registro existente", async () => {
      mockReferralFindUnique.mockResolvedValue({ id: "existing-referral-id" })

      const result = await applyReferralCode(REFERRED_ID, REFERRER_CODE)

      expect(result).toEqual({ success: false, error: "Você já usou um código de indicação." })
      expect(mockTransaction).not.toHaveBeenCalled()
    })
  })
})

// ---------------------------------------------------------------------------
// getOrCreateReferralCode
// ---------------------------------------------------------------------------

describe("getOrCreateReferralCode", () => {

  describe("(i) usuário já tem código", () => {
    it("retorna o código existente sem criar novo", async () => {
      mockUserFindUnique.mockResolvedValue({ referralCode: "JOAO-AB12" })

      const result = await getOrCreateReferralCode(REFERRER_ID, "João Silva")

      expect(result).toBe("JOAO-AB12")
      expect(mockUserUpdate).not.toHaveBeenCalled()
    })
  })

  describe("(j) usuário sem código — gera e salva", () => {
    it("chama user.update com um referralCode gerado e retorna o código", async () => {
      // Primeira chamada: busca o código → null. Demais: busca clash → null.
      mockUserFindUnique.mockResolvedValue({ referralCode: null })
      mockUserUpdate.mockImplementation(({ data }: { data: { referralCode: string } }) =>
        Promise.resolve({ referralCode: data.referralCode })
      )

      const result = await getOrCreateReferralCode(REFERRER_ID, "João Silva")

      expect(mockUserUpdate).toHaveBeenCalledTimes(1)
      expect(typeof result).toBe("string")
      expect(result.length).toBeGreaterThan(0)
    })

    it("código gerado segue o formato PREFIX-SUFIXO (maiúsculas, hífen)", async () => {
      mockUserFindUnique.mockResolvedValue({ referralCode: null })
      mockUserUpdate.mockImplementation(({ data }: { data: { referralCode: string } }) =>
        Promise.resolve({ referralCode: data.referralCode })
      )

      const result = await getOrCreateReferralCode(REFERRER_ID, "Maria")

      expect(result).toMatch(/^[A-Z0-9]+-[A-Z0-9]+$/)
    })

    it("usa fallback USER-{timestamp} quando não consegue gerar código único em 5 tentativas", async () => {
      // findUnique para referralCode sempre encontra clash
      mockUserFindUnique
        .mockResolvedValueOnce({ referralCode: null })          // busca código do usuário (null → sem código)
        .mockResolvedValue({ id: "clash-user" })                // todas as tentativas de candidato → clash
      mockUserUpdate.mockImplementation(({ data }: { data: { referralCode: string } }) =>
        Promise.resolve({ referralCode: data.referralCode })
      )

      const result = await getOrCreateReferralCode(REFERRER_ID, "João")

      // O fallback começa com USER-
      expect(result).toMatch(/^USER-[A-Z0-9]+$/)
    })
  })
})

// ---------------------------------------------------------------------------
// getReferralStats
// ---------------------------------------------------------------------------

describe("getReferralStats", () => {

  describe("(k) retorna dados consolidados", () => {
    it("retorna code, totalReferrals e hasBeenReferred=false quando não foi indicado", async () => {
      mockUserFindUnique.mockResolvedValue({ referralCode: "JOAO-AB12", referredById: null })
      mockReferralCount.mockResolvedValue(5)

      const result = await getReferralStats(REFERRER_ID)

      expect(result).toEqual({
        code:            "JOAO-AB12",
        totalReferrals:  5,
        hasBeenReferred: false,
      })
    })

    it("retorna hasBeenReferred=true quando referredById está preenchido", async () => {
      mockUserFindUnique.mockResolvedValue({ referralCode: "JOAO-AB12", referredById: "outro-user" })
      mockReferralCount.mockResolvedValue(0)

      const result = await getReferralStats(REFERRER_ID)

      expect(result.hasBeenReferred).toBe(true)
    })

    it("retorna code=null quando usuário não tem código de indicação", async () => {
      mockUserFindUnique.mockResolvedValue({ referralCode: null, referredById: null })
      mockReferralCount.mockResolvedValue(0)

      const result = await getReferralStats(REFERRER_ID)

      expect(result.code).toBeNull()
    })

    it("retorna code=null e totalReferrals=0 quando usuário não existe no banco", async () => {
      mockUserFindUnique.mockResolvedValue(null)
      mockReferralCount.mockResolvedValue(0)

      const result = await getReferralStats("nao-existe")

      expect(result).toEqual({
        code:            null,
        totalReferrals:  0,
        hasBeenReferred: false,
      })
    })

    it("busca totalReferrals filtrando por referrerId", async () => {
      mockUserFindUnique.mockResolvedValue({ referralCode: "JOAO-AB12", referredById: null })
      mockReferralCount.mockResolvedValue(3)

      await getReferralStats(REFERRER_ID)

      expect(mockReferralCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { referrerId: REFERRER_ID } })
      )
    })
  })
})
