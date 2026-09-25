/** @jest-environment node */
/**
 * Limite de tentativas POR E-MAIL do esqueci-senha.
 *
 * Arquivo fonte: app/api/auth/forgot-password/route.ts,
 *               lib/forgotPasswordRateLimit.ts
 *
 * Usa o limitador REAL em memória (sem Upstash): prova que variações do mesmo
 * e-mail caem no mesmo contador e que o contador é SEPARADO do login.
 * Cada teste usa e-mails próprios — o contador vive no módulo e atravessa os
 * testes dentro da mesma execução.
 */

import { NextRequest } from "next/server"
import { POST } from "@/app/api/auth/forgot-password/route"
import { RATE_LIMITS } from "@/lib/rateLimit"
import { forgotPasswordEmailKey } from "@/lib/forgotPasswordRateLimit"

// Os pacotes @upstash/* são ESM-only.
jest.mock("@upstash/redis", () => ({
  Redis: { fromEnv: jest.fn() },
}))
jest.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = jest.fn()
    limit = jest.fn()
  },
}))

// Prisma mockado: nenhum teste precisa de banco.
const mockFindUnique     = jest.fn()
const mockDeleteMany     = jest.fn()
const mockCreate         = jest.fn()
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => mockFindUnique(...a) },
    passwordResetToken: {
      deleteMany: (...a: unknown[]) => mockDeleteMany(...a),
      create:     (...a: unknown[]) => mockCreate(...a),
    },
  },
}))

jest.mock("@/lib/email", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}))

const LIMITE = RATE_LIMITS.forgotPasswordEmail.limit

beforeAll(() => {
  delete process.env.SKIP_RATE_LIMIT
  delete process.env.E2E_SECRET
  delete process.env.E2E_BYPASS_DISABLED
})

beforeEach(() => {
  mockFindUnique.mockReset()
  mockFindUnique.mockResolvedValue(null)   // e-mail não cadastrado por padrão
  mockDeleteMany.mockResolvedValue({ count: 0 })
  mockCreate.mockResolvedValue({})
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let ipSeq = 0
const novoIp = () => {
  const n = ipSeq++
  return `10.0.${(n >> 8) & 255}.${n & 255}`
}

/** Formas do mesmo e-mail normalizadas igual para o contador (caixa e espaços). */
const FORMAS: Array<(e: string) => string> = [
  (e) => e,
  (e) => e.toUpperCase(),
  (e) => `${e} `,
  (e) => ` ${e}`,
  (e) => `${e}\t`,
]
const variacao = (base: string, i: number) => FORMAS[i % FORMAS.length](base)

function req(email: unknown, ip = novoIp()): NextRequest {
  return new NextRequest("http://localhost/api/auth/forgot-password", {
    method:  "POST",
    headers: { "x-forwarded-for": ip, "content-type": "application/json" },
    body:    JSON.stringify({ email }),
  })
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("forgotPasswordEmailKey", () => {
  it("variações de caixa e espaço produzem a mesma chave", () => {
    const base = "chave@exemplo.com"
    const esperada = `forgot:email:${base}`
    for (const forma of FORMAS) {
      expect(forgotPasswordEmailKey(forma(base))).toBe(esperada)
    }
  })

  it("e-mail inválido não gera chave", () => {
    for (const invalido of ["", "  ", "nao-e-email", null, undefined, 42]) {
      expect(forgotPasswordEmailKey(invalido)).toBeNull()
    }
  })

  it("prefixo é forgot:email: (separado de login:email:)", () => {
    expect(forgotPasswordEmailKey("x@y.com")).toMatch(/^forgot:email:/)
    expect(forgotPasswordEmailKey("x@y.com")).not.toMatch(/^login:email:/)
  })
})

describe("POST /api/auth/forgot-password — limite por e-mail", () => {
  it("variações de caixa e espaço do mesmo e-mail dividem UMA cota", async () => {
    // Dentro do limite: todos os pedidos retornam 200 (anti-enumeração)
    for (let i = 0; i < LIMITE; i++) {
      const res = await POST(req(variacao("fp-a@exemplo.com", i)))
      expect(res.status).toBe(200)
    }
    // Após esgotar a cota: 429 (o e-mail não chegou ao banco desta vez)
    const findUniqueBefore = mockFindUnique.mock.calls.length
    const bloqueada = await POST(req("FP-A@exemplo.com"))
    expect(bloqueada.status).toBe(429)
    expect(mockFindUnique.mock.calls.length).toBe(findUniqueBefore) // barrou antes do banco
  })

  it("e-mails diferentes não dividem cota", async () => {
    for (let i = 0; i < LIMITE; i++) await POST(req("fp-b1@exemplo.com"))
    expect((await POST(req("fp-b1@exemplo.com"))).status).toBe(429)
    expect((await POST(req("fp-b2@exemplo.com"))).status).toBe(200)
  })

  it("o 429 mantém o formato padrão (RATE_LIMITED + Retry-After)", async () => {
    for (let i = 0; i < LIMITE; i++) await POST(req("fp-fmt@exemplo.com"))
    const res = await POST(req("fp-fmt@exemplo.com"))
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBeTruthy()
    const body = await res.json()
    expect(body).toEqual({
      error: {
        code:    "RATE_LIMITED",
        message: "Muitas tentativas. Aguarde um momento e tente novamente.",
      },
    })
  })

  it("o 429 NÃO revela se o e-mail está cadastrado (aplicado antes do banco)", async () => {
    // e-mail existente
    mockFindUnique.mockImplementation(async ({ where }: { where: { email: string } }) =>
      where.email === "fp-existe@exemplo.com"
        ? { id: "u1", name: "Maria", deletedAt: null }
        : null,
    )

    const existente   = "fp-existe@exemplo.com"
    const inexistente = "fp-fantasma@exemplo.com"

    // Esgotar a cota dos dois e-mails
    for (const email of [existente, inexistente]) {
      for (let i = 0; i < LIMITE; i++) {
        expect((await POST(req(email))).status).toBe(200)
      }
    }

    const r1 = await POST(req(existente))
    const r2 = await POST(req(inexistente))
    expect(r1.status).toBe(429)
    expect(r2.status).toBe(429)
    expect(await r1.json()).toEqual(await r2.json())
    // Cabeçalhos idênticos (mesmo Retry-After pode diferir em ±1 s — compara só as chaves)
    expect([...r1.headers.keys()].sort()).toEqual([...r2.headers.keys()].sort())
  })

  it("e-mail inválido não aplica cota por e-mail (segue para ok() silencioso)", async () => {
    for (let i = 0; i < LIMITE + 2; i++) {
      const res = await POST(req("nao-e-email"))
      expect(res.status).toBe(200)
    }
    // Conta de banco: findUnique nunca foi chamado (schema reprova antes)
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it("corpo JSON com chave repetida: conta o e-mail que o JSON.parse resolve (o último)", async () => {
    // Simula body com chave duplicada: JSON.parse em Node.js mantém o último valor.
    // O limitador deve contar o e-mail que o endpoint realmente processa.
    const bodyDup = '{"email":"lixo@exemplo.com","email":"fp-dup@exemplo.com"}'
    function dupReq(ip = novoIp()) {
      return new NextRequest("http://localhost/api/auth/forgot-password", {
        method:  "POST",
        headers: { "x-forwarded-for": ip, "content-type": "application/json" },
        body:    bodyDup,
      })
    }
    for (let i = 0; i < LIMITE; i++) {
      expect((await POST(dupReq())).status).toBe(200)
    }
    // A cota de `fp-dup@exemplo.com` foi esgotada; `lixo@` não foi tocado
    expect((await POST(dupReq())).status).toBe(429)
    expect((await POST(req("lixo@exemplo.com"))).status).toBe(200)
  })

  it("limite por e-mail é INDEPENDENTE: esgotar cota de A não afeta B", async () => {
    // Esgotar a cota do e-mail A (IPs distintos para não acionar limite por IP)
    for (let i = 0; i < LIMITE; i++) await POST(req("fp-indep-a@exemplo.com"))
    expect((await POST(req("fp-indep-a@exemplo.com"))).status).toBe(429)
    // E-mail B ainda tem cota intacta
    expect((await POST(req("fp-indep-b@exemplo.com"))).status).toBe(200)
  })

  it("após o bloqueio, o token E2E libera a cota por e-mail", async () => {
    process.env.E2E_SECRET = "segredo-e2e-forgot"
    try {
      // Esgotar sem o token
      for (let i = 0; i < LIMITE; i++) await POST(req("fp-e2e@exemplo.com"))
      expect((await POST(req("fp-e2e@exemplo.com"))).status).toBe(429)

      // Com o token E2E, bypass ativo
      const reqE2e = new NextRequest("http://localhost/api/auth/forgot-password", {
        method:  "POST",
        headers: {
          "x-forwarded-for":  novoIp(),
          "content-type":     "application/json",
          "x-e2e-token":      "segredo-e2e-forgot",
        },
        body: JSON.stringify({ email: "fp-e2e@exemplo.com" }),
      })
      expect((await POST(reqE2e)).status).toBe(200)
    } finally {
      delete process.env.E2E_SECRET
    }
  })
})
