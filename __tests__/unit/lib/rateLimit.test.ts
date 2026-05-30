import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit"

// ---------------------------------------------------------------------------
// O store é um Map em memória no módulo — precisamos garantir isolamento entre
// testes usando chaves únicas por cenário (evita dependência de ordem de execução).
// ---------------------------------------------------------------------------

afterEach(() => {
  jest.useRealTimers()
})

// ---------------------------------------------------------------------------
// checkRateLimit
// ---------------------------------------------------------------------------

describe("checkRateLimit", () => {
  describe("primeira chamada", () => {
    it("retorna allowed=true e remaining=limit-1 na primeira chamada", () => {
      const key = "test:primeira-chamada"
      const result = checkRateLimit(key, 5, 60_000)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
    })

    it("resetAt está no futuro (agora + windowMs)", () => {
      const now = Date.now()
      const windowMs = 60_000
      const key = "test:resetAt-futuro"
      const result = checkRateLimit(key, 3, windowMs)

      expect(result.resetAt).toBeGreaterThan(now)
      expect(result.resetAt).toBeLessThanOrEqual(now + windowMs + 50) // margem de 50ms
    })
  })

  describe("decremento de remaining", () => {
    it("decrementa remaining corretamente a cada chamada dentro do limite", () => {
      const key = "test:decremento"
      const limit = 4

      const r1 = checkRateLimit(key, limit, 60_000)
      const r2 = checkRateLimit(key, limit, 60_000)
      const r3 = checkRateLimit(key, limit, 60_000)

      expect(r1.remaining).toBe(3)
      expect(r2.remaining).toBe(2)
      expect(r3.remaining).toBe(1)
      expect(r1.allowed).toBe(true)
      expect(r2.allowed).toBe(true)
      expect(r3.allowed).toBe(true)
    })

    it("última chamada permitida retorna remaining=0 e allowed=true", () => {
      const key = "test:ultima-permitida"
      const limit = 2

      checkRateLimit(key, limit, 60_000) // chamada 1: remaining=1
      const last = checkRateLimit(key, limit, 60_000) // chamada 2: remaining=0

      expect(last.allowed).toBe(true)
      expect(last.remaining).toBe(0)
    })
  })

  describe("chamada que excede o limite", () => {
    it("retorna allowed=false e remaining=0 ao exceder o limite", () => {
      const key = "test:excede-limite"
      const limit = 3

      checkRateLimit(key, limit, 60_000)
      checkRateLimit(key, limit, 60_000)
      checkRateLimit(key, limit, 60_000)
      const bloqueado = checkRateLimit(key, limit, 60_000)

      expect(bloqueado.allowed).toBe(false)
      expect(bloqueado.remaining).toBe(0)
    })

    it("resetAt está no futuro quando bloqueado", () => {
      const key = "test:resetAt-bloqueado"
      const limit = 2
      const windowMs = 30_000

      checkRateLimit(key, limit, windowMs)
      checkRateLimit(key, limit, windowMs)
      const bloqueado = checkRateLimit(key, limit, windowMs)

      expect(bloqueado.allowed).toBe(false)
      expect(bloqueado.resetAt).toBeGreaterThan(Date.now())
    })
  })

  describe("janela deslizante (fake timers)", () => {
    it("reseta o limite após a janela expirar", () => {
      jest.useFakeTimers()

      const key = "test:janela-deslizante"
      const limit = 2
      const windowMs = 10_000

      // Esgota o limite
      checkRateLimit(key, limit, windowMs)
      checkRateLimit(key, limit, windowMs)
      const bloqueadoAntes = checkRateLimit(key, limit, windowMs)
      expect(bloqueadoAntes.allowed).toBe(false)

      // Avança o tempo além da janela
      jest.advanceTimersByTime(windowMs + 1)

      // Agora deve estar permitido novamente
      const aposReset = checkRateLimit(key, limit, windowMs)
      expect(aposReset.allowed).toBe(true)
      expect(aposReset.remaining).toBe(limit - 1)
    })

    it("chamadas parcialmente expiradas mantêm contagem correta", () => {
      jest.useFakeTimers()

      const key = "test:janela-parcial"
      const limit = 3
      const windowMs = 10_000

      checkRateLimit(key, limit, windowMs) // t=0
      jest.advanceTimersByTime(6_000)
      checkRateLimit(key, limit, windowMs) // t=6s
      jest.advanceTimersByTime(5_000) // t=11s — a chamada do t=0 expirou, t=6s ainda válida

      // Deve permitir: 1 no window (t=6s), então remaining = limit - 2 = 1
      const result = checkRateLimit(key, limit, windowMs)
      expect(result.allowed).toBe(true)
    })
  })

  describe("isolamento por key", () => {
    it("chaves diferentes têm limites independentes", () => {
      const keyA = "test:key-a"
      const keyB = "test:key-b"
      const limit = 2

      checkRateLimit(keyA, limit, 60_000)
      checkRateLimit(keyA, limit, 60_000)
      const bloqueadoA = checkRateLimit(keyA, limit, 60_000)

      const primeiraB = checkRateLimit(keyB, limit, 60_000)

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
    const resetAt = Date.now() + 30_000
    const response = rateLimitResponse(resetAt)

    expect(response.status).toBe(429)
  })

  it("retorna Content-Type: application/json", () => {
    const response = rateLimitResponse(Date.now() + 10_000)

    expect(response.headers.get("Content-Type")).toBe("application/json")
  })

  it("inclui header Retry-After com valor em segundos", async () => {
    const resetAt = Date.now() + 60_000
    const response = rateLimitResponse(resetAt)

    const retryAfter = response.headers.get("Retry-After")
    expect(retryAfter).not.toBeNull()
    const seconds = Number(retryAfter)
    expect(seconds).toBeGreaterThan(0)
    expect(seconds).toBeLessThanOrEqual(60)
  })

  it("body contém error.code = RATE_LIMITED", async () => {
    const response = rateLimitResponse(Date.now() + 10_000)
    const body = await response.json()

    expect(body.error.code).toBe("RATE_LIMITED")
  })

  it("body contém error.message com texto amigável", async () => {
    const response = rateLimitResponse(Date.now() + 10_000)
    const body = await response.json()

    expect(typeof body.error.message).toBe("string")
    expect(body.error.message.length).toBeGreaterThan(0)
  })

  it("inclui header X-RateLimit-Remaining com valor '0'", () => {
    const response = rateLimitResponse(Date.now() + 10_000)

    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0")
  })
})
