/** @jest-environment node */
/**
 * P1-14 — Testes de integração para POST /api/auth/register
 *
 * Arquivo fonte: app/api/auth/register/route.ts
 *
 * Estratégia: mocks de prisma, bcrypt, crypto, email e slugify para testar
 * exclusivamente a lógica da rota sem dependências de infraestrutura.
 */

import { NextRequest } from "next/server"
import { POST } from "@/app/api/auth/register/route"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFindUnique = jest.fn()
const mockCreate     = jest.fn()
const mockUpdate     = jest.fn()
const mockTransaction = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique:  (...args: unknown[]) => mockFindUnique(...args),
      create:      (...args: unknown[]) => mockCreate(...args),
      update:      (...args: unknown[]) => mockUpdate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}))

jest.mock("@/lib/crypto", () => ({
  hashDocument:    (v: string) => `hash:${v}`,
  encryptDocument: (v: string) => `enc:${v}`,
}))

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
}))

jest.mock("@/lib/email", () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/slugify", () => ({
  generateUserSlug: jest.fn().mockReturnValue("maria-silva-abc123"),
}))

// checkRateLimit precisa ser mockável por teste
const mockCheckRateLimit = jest.fn()
const mockRateLimitResponse = jest.fn()

jest.mock("@/lib/rateLimit", () => ({
  checkRateLimit:    (...args: unknown[]) => mockCheckRateLimit(...args),
  rateLimitResponse: (...args: unknown[]) => mockRateLimitResponse(...args),
  RATE_LIMITS:       { register: { limit: 5, windowMs: 60_000 } },
}))

// ---------------------------------------------------------------------------
// Dados de base
// ---------------------------------------------------------------------------

const CPF_VALIDO  = "529.982.247-25"
const CNPJ_VALIDO = "11.222.333/0001-81"

const BASE_PF = {
  name:           "Maria Silva",
  email:          "maria@exemplo.com",
  password:       "Senha1234",
  userType:       "PF",
  cpf:            CPF_VALIDO,
  city:           "Natal",
  state:          "RN",
  consentVersion: "1",
}

const BASE_PJ = {
  name:           "Empresa Exemplo Ltda",
  email:          "contato@empresa.com",
  password:       "Senha1234",
  userType:       "PJ",
  cnpj:           CNPJ_VALIDO,
  city:           "São Paulo",
  state:          "SP",
  consentVersion: "1",
}

/** Usuário criado retornado pela transação (sem campos sensíveis). */
const CREATED_USER = {
  id:         "user-id-123",
  name:       "Maria Silva",
  email:      "maria@exemplo.com",
  slug:       "maria-silva-abc123",
  userType:   "PF",
  role:       "USER",
  avatarUrl:  null,
  bio:        null,
  city:       "Natal",
  state:      "RN",
  isVerified: false,
  createdAt:  new Date("2026-01-01T00:00:00Z"),
}

// ---------------------------------------------------------------------------
// Helper: cria NextRequest com body JSON
// ---------------------------------------------------------------------------

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/register", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// Setup global: rate limit permitido e prisma limpo por padrão
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()

  // Rate limit permitido por padrão
  mockCheckRateLimit.mockReturnValue({ allowed: true, remaining: 4, resetAt: Date.now() + 60_000 })

  // Prisma: nenhum usuário duplicado por padrão
  mockFindUnique.mockResolvedValue(null)

  // $transaction executa o callback assíncrono e retorna o usuário criado
  mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      user: {
        create: mockCreate,
        update: mockUpdate,
      },
    }
    return fn(tx)
  })

  mockCreate.mockResolvedValue({ id: "user-id-123", name: "Maria Silva", email: "maria@exemplo.com" })
  mockUpdate.mockResolvedValue(CREATED_USER)
})

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("POST /api/auth/register", () => {
  describe("cadastro válido — Pessoa Física", () => {
    it("retorna 201 com dados do usuário criado", async () => {
      const res  = await POST(makeRequest(BASE_PF))
      const body = await res.json() as { data: Record<string, unknown> }

      expect(res.status).toBe(201)
      expect(body.data).toBeDefined()
      expect(body.data.email).toBe("maria@exemplo.com")
    })

    it("response não contém campos sensíveis (cpf, cnpj, hashes, passwordHash)", async () => {
      const res  = await POST(makeRequest(BASE_PF))
      const body = await res.json() as Record<string, unknown>

      const sensivel = JSON.stringify(body)
      expect(sensivel).not.toMatch(/\bcpf\b/)
      expect(sensivel).not.toMatch(/\bcnpj\b/)
      expect(sensivel).not.toMatch(/cpfHash/)
      expect(sensivel).not.toMatch(/cnpjHash/)
      expect(sensivel).not.toMatch(/cpfEncrypted/)
      expect(sensivel).not.toMatch(/cnpjEncrypted/)
      expect(sensivel).not.toMatch(/passwordHash/)
    })
  })

  describe("cadastro válido — Pessoa Jurídica", () => {
    it("retorna 201 com dados do usuário criado", async () => {
      mockUpdate.mockResolvedValue({
        ...CREATED_USER,
        name:     "Empresa Exemplo Ltda",
        email:    "contato@empresa.com",
        userType: "PJ",
      })

      const res  = await POST(makeRequest(BASE_PJ))
      const body = await res.json() as { data: Record<string, unknown> }

      expect(res.status).toBe(201)
      expect(body.data).toBeDefined()
    })
  })

  describe("conflito — CPF duplicado", () => {
    it("retorna 409 com code CPF_ALREADY_EXISTS", async () => {
      // Primeiro findUnique (email) → null (não existe)
      // Segundo findUnique (cpfHash) → usuário existente
      mockFindUnique
        .mockResolvedValueOnce(null)          // e-mail livre
        .mockResolvedValueOnce({ id: "outro-user" }) // CPF já cadastrado

      const res  = await POST(makeRequest(BASE_PF))
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(409)
      expect(body.error.code).toBe("CPF_ALREADY_EXISTS")
    })
  })

  describe("conflito — email duplicado", () => {
    it("retorna 409 com code EMAIL_ALREADY_EXISTS", async () => {
      // Primeiro findUnique (email) → já existe
      mockFindUnique.mockResolvedValueOnce({ id: "outro-user" })

      const res  = await POST(makeRequest(BASE_PF))
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(409)
      expect(body.error.code).toBe("EMAIL_ALREADY_EXISTS")
    })
  })

  describe("validação — payload inválido", () => {
    it("retorna 400 com code VALIDATION_ERROR quando senha é fraca", async () => {
      const res  = await POST(makeRequest({ ...BASE_PF, password: "fraca" }))
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
    })

    it("retorna 400 quando email está ausente", async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { email: _email, ...payload } = BASE_PF
      const res = await POST(makeRequest(payload as Record<string, unknown>))

      expect(res.status).toBe(400)
    })

    it("retorna 400 quando CPF é inválido para PF", async () => {
      const res  = await POST(makeRequest({ ...BASE_PF, cpf: "000.000.000-00" }))
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
    })
  })

  describe("rate limit excedido", () => {
    it("retorna 429 quando checkRateLimit retorna allowed=false", async () => {
      const resetAt = Date.now() + 30_000
      mockCheckRateLimit.mockReturnValue({ allowed: false, remaining: 0, resetAt })
      mockRateLimitResponse.mockReturnValue(
        new Response(
          JSON.stringify({ error: { code: "RATE_LIMITED", message: "Muitas tentativas." } }),
          {
            status:  429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After":  "30",
            },
          },
        ),
      )

      const res = await POST(makeRequest(BASE_PF))

      expect(res.status).toBe(429)
    })
  })

  describe("campos sensíveis ausentes na resposta", () => {
    it("response de PJ não vaza cpf, cnpj, hashes ou passwordHash", async () => {
      mockUpdate.mockResolvedValue({
        ...CREATED_USER,
        name:     "Empresa Exemplo Ltda",
        email:    "contato@empresa.com",
        userType: "PJ",
      })

      const res  = await POST(makeRequest(BASE_PJ))
      const body = await res.json() as Record<string, unknown>

      const json = JSON.stringify(body)
      expect(json).not.toMatch(/\bcpf\b/)
      expect(json).not.toMatch(/\bcnpj\b/)
      expect(json).not.toMatch(/cpfHash/)
      expect(json).not.toMatch(/cnpjHash/)
      expect(json).not.toMatch(/cpfEncrypted/)
      expect(json).not.toMatch(/cnpjEncrypted/)
      expect(json).not.toMatch(/passwordHash/)
    })
  })
})
