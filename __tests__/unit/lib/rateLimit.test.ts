/**
 * @jest-environment node
 *
 * Testa o rate limiter com fallback in-memory (UPSTASH_REDIS_REST_URL não definido).
 * Os pacotes @upstash/* são mockados para evitar incompatibilidade ESM com Jest.
 */

// Mock antes de qualquer import do módulo testado
jest.mock("@upstash/redis", () => ({
  Redis: { fromEnv: jest.fn() },
}))
jest.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = jest.fn()
    limit = jest.fn()
  },
}))

import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit"

afterEach(() => {
  jest.useRealTimers()
})

// ---------------------------------------------------------------------------
// checkRateLimit (in-memory fallback — sem UPSTASH_REDIS_REST_URL)
// ---------------------------------------------------------------------------

describe("checkRateLimit", () => {
  describe("primeira chamada", () => {
    it("retorna allowed=true e remaining=limit-1 na primeira chamada", async () => {
      const result = await checkRateLimit("test:primeira-chamada", 5, 60_000)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
    })

    it("resetAt está no futuro (agora + windowMs)", async () => {
      const now = Date.now()
      const windowMs = 60_000
      const result = await checkRateLimit("test:resetAt-futuro", 3, windowMs)
      expect(result.resetAt).toBeGreaterThan(now)
      expect(result.resetAt).toBeLessThanOrEqual(now + windowMs + 50)
    })
  })

  describe("decremento de remaining", () => {
    it("decrementa remaining corretamente a cada chamada dentro do limite", async () => {
      const key = "test:decremento"
      const limit = 4
      const r1 = await checkRateLimit(key, limit, 60_000)
      const r2 = await checkRateLimit(key, limit, 60_000)
      const r3 = await checkRateLimit(key, limit, 60_000)
      expect(r1.remaining).toBe(3)
      expect(r2.remaining).toBe(2)
      expect(r3.remaining).toBe(1)
      expect(r1.allowed).toBe(true)
      expect(r2.allowed).toBe(true)
      expect(r3.allowed).toBe(true)
    })

    it("última chamada permitida retorna remaining=0 e allowed=true", async () => {
      const key = "test:ultima-permitida"
      const limit = 2
      await checkRateLimit(key, limit, 60_000)
      const last = await checkRateLimit(key, limit, 60_000)
      expect(last.allowed).toBe(true)
      expect(last.remaining).toBe(0)
    })
  })

  describe("chamada que excede o limite", () => {
    it("retorna allowed=false e remaining=0 ao exceder o limite", async () => {
      const key = "test:excede-limite"
      const limit = 3
      await checkRateLimit(key, limit, 60_000)
      await checkRateLimit(key, limit, 60_000)
      await checkRateLimit(key, limit, 60_000)
      const bloqueado = await checkRateLimit(key, limit, 60_000)
      expect(bloqueado.allowed).toBe(false)
      expect(bloqueado.remaining).toBe(0)
    })

    it("resetAt está no futuro quando bloqueado", async () => {
      const key = "test:resetAt-bloqueado"
      const limit = 2
      const windowMs = 30_000
      await checkRateLimit(key, limit, windowMs)
      await checkRateLimit(key, limit, windowMs)
      const bloqueado = await checkRateLimit(key, limit, windowMs)
      expect(bloqueado.allowed).toBe(false)
      expect(bloqueado.resetAt).toBeGreaterThan(Date.now())
    })
  })

  describe("janela deslizante (fake timers)", () => {
    it("reseta o limite após a janela expirar", async () => {
      jest.useFakeTimers()
      const key = "test:janela-deslizante"
      const limit = 2
      const windowMs = 10_000
      await checkRateLimit(key, limit, windowMs)
      await checkRateLimit(key, limit, windowMs)
      const bloqueadoAntes = await checkRateLimit(key, limit, windowMs)
      expect(bloqueadoAntes.allowed).toBe(false)
      jest.advanceTimersByTime(windowMs + 1)
      const aposReset = await checkRateLimit(key, limit, windowMs)
      expect(aposReset.allowed).toBe(true)
      expect(aposReset.remaining).toBe(limit - 1)
    })

    it("chamadas parcialmente expiradas mantêm contagem correta", async () => {
      jest.useFakeTimers()
      const key = "test:janela-parcial"
      const limit = 3
      const windowMs = 10_000
      await checkRateLimit(key, limit, windowMs) // t=0
      jest.advanceTimersByTime(6_000)
      await checkRateLimit(key, limit, windowMs) // t=6s
      jest.advanceTimersByTime(5_000)            // t=11s — t=0 expirou
      const result = await checkRateLimit(key, limit, windowMs)
      expect(result.allowed).toBe(true)
    })
  })

  describe("isolamento por key", () => {
    it("chaves diferentes têm limites independentes", async () => {
      const keyA = "test:key-a"
      const keyB = "test:key-b"
      const limit = 2
      await checkRateLimit(keyA, limit, 60_000)
      await checkRateLimit(keyA, limit, 60_000)
      const bloqueadoA = await checkRateLimit(keyA, limit, 60_000)
      const primeiraB  = await checkRateLimit(keyB, limit, 60_000)
      expect(bloqueadoA.allowed).toBe(false)
      expect(primeiraB.allowed).toBe(true)
      expect(primeiraB.remaining).toBe(1)
    })
  })
})

// ---------------------------------------------------------------------------
// rateLimitResponse
// ---------------------------------------------------------------------------

describe("rateLimitResponse", () => {
  it("retorna Response com status 429", () => {
    expect(rateLimitResponse(Date.now() + 30_000).status).toBe(429)
  })

  it("retorna Content-Type: application/json", () => {
    expect(rateLimitResponse(Date.now() + 10_000).headers.get("Content-Type")).toBe("application/json")
  })

  it("inclui header Retry-After com valor em segundos", () => {
    const retryAfter = rateLimitResponse(Date.now() + 60_000).headers.get("Retry-After")
    expect(Number(retryAfter)).toBeGreaterThan(0)
    expect(Number(retryAfter)).toBeLessThanOrEqual(60)
  })

  it("body contém error.code = RATE_LIMITED", async () => {
    const body = await rateLimitResponse(Date.now() + 10_000).json()
    expect((body as { error: { code: string } }).error.code).toBe("RATE_LIMITED")
  })

  it("body contém error.message com texto amigável", async () => {
    const body = await rateLimitResponse(Date.now() + 10_000).json() as { error: { message: string } }
    expect(typeof body.error.message).toBe("string")
    expect(body.error.message.length).toBeGreaterThan(0)
  })

  it("inclui header X-RateLimit-Remaining com valor '0'", () => {
    expect(rateLimitResponse(Date.now() + 10_000).headers.get("X-RateLimit-Remaining")).toBe("0")
  })
})
