/** @jest-environment node */
/**
 * Testes de integração para GET /api/stats/public
 *
 * Arquivo fonte: app/api/stats/public/route.ts
 *
 * Endpoint público (sem autenticação) — contagem de itens não-excluídos para
 * páginas de marketing (Sobre, no site e no app). Cobre o gap de zero cobertura
 * apontado na revisão s41 (QA): rate limit, shape do response, Cache-Control,
 * fallback em erro de banco.
 */

import { GET } from "@/app/api/stats/public/route"
import type { NextRequest } from "next/server"

const mockCount = jest.fn()
jest.mock("@/lib/prisma", () => ({
  prisma: { item: { count: (...a: unknown[]) => mockCount(...a) } },
}))

const mockCheckRateLimit    = jest.fn()
const mockRateLimitResponse = jest.fn()
jest.mock("@/lib/rateLimit", () => ({
  checkRateLimit:    (...a: unknown[]) => mockCheckRateLimit(...a),
  rateLimitResponse: (...a: unknown[]) => mockRateLimitResponse(...a),
}))

jest.mock("@/lib/access-log", () => ({ extractClientIp: () => "1.2.3.4" }))

function req(): NextRequest {
  return new Request("http://localhost/api/stats/public") as unknown as NextRequest
}

describe("GET /api/stats/public", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckRateLimit.mockResolvedValue({ allowed: true, resetAt: 0 })
  })

  it("200 retornando a contagem de itens não-excluídos", async () => {
    mockCount.mockResolvedValueOnce(42)
    const res = await GET(req())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.itemCount).toBe(42)
  })

  it("conta apenas itens com deletedAt null", async () => {
    mockCount.mockResolvedValueOnce(10)
    await GET(req())
    expect(mockCount).toHaveBeenCalledWith({ where: { deletedAt: null } })
  })

  it("define Cache-Control público de 60s (alivia o banco)", async () => {
    mockCount.mockResolvedValueOnce(5)
    const res = await GET(req())
    expect(res.headers.get("Cache-Control")).toContain("max-age=60")
  })

  it("só expõe itemCount, nenhum outro campo", async () => {
    mockCount.mockResolvedValueOnce(5)
    const res = await GET(req())
    const json = await res.json()
    expect(Object.keys(json.data)).toEqual(["itemCount"])
  })

  it("erro no banco → itemCount 0 (não vaza erro, fail-safe)", async () => {
    mockCount.mockRejectedValueOnce(new Error("db down"))
    const res = await GET(req())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.itemCount).toBe(0)
  })

  it("rate limit excedido → devolve rateLimitResponse (sem tocar no banco)", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ allowed: false, resetAt: 123 })
    mockRateLimitResponse.mockReturnValueOnce(new Response(null, { status: 429 }))
    const res = await GET(req())
    expect(mockRateLimitResponse).toHaveBeenCalledWith(123)
    expect(res.status).toBe(429)
    expect(mockCount).not.toHaveBeenCalled()
  })
})
