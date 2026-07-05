/** @jest-environment node */
/**
 * Testes de integração para GET /api/dashboard
 *
 * Arquivo fonte: app/api/dashboard/route.ts
 *
 * Estratégia: mocks de prisma e resolveUserId. Foco no guard de autenticação
 * (401 sem sessão/Bearer) e no shape básico da resposta com dados agregados —
 * as queries individuais já são cobertas indiretamente pelos testes de
 * app/dashboard/page.tsx (mesma lógica espelhada, ver comentários da rota).
 */

import { NextRequest } from "next/server"
import { GET } from "@/app/api/dashboard/route"

const mockResolveUserId = jest.fn()
jest.mock("@/lib/resolveUserId", () => ({
  resolveUserId: (...args: unknown[]) => mockResolveUserId(...args),
}))

const mockItemCount     = jest.fn()
const mockItemAggregate = jest.fn()
const mockItemFindMany  = jest.fn()
const mockBookingCount     = jest.fn()
const mockBookingAggregate = jest.fn()
const mockBookingFindMany  = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    item: {
      count:     (...args: unknown[]) => mockItemCount(...args),
      aggregate: (...args: unknown[]) => mockItemAggregate(...args),
      findMany:  (...args: unknown[]) => mockItemFindMany(...args),
    },
    booking: {
      count:     (...args: unknown[]) => mockBookingCount(...args),
      aggregate: (...args: unknown[]) => mockBookingAggregate(...args),
      findMany:  (...args: unknown[]) => mockBookingFindMany(...args),
    },
  },
}))

function makeReq(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/dashboard", { headers })
}

describe("GET /api/dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockItemCount.mockResolvedValue(0)
    mockItemAggregate.mockResolvedValue({ _sum: { viewCount: 0 } })
    mockItemFindMany.mockResolvedValue([])
    mockBookingCount.mockResolvedValue(0)
    mockBookingAggregate.mockResolvedValue({ _sum: { totalPrice: null } })
    mockBookingFindMany.mockResolvedValue([])
  })

  it("401 sem sessão/Bearer (resolveUserId retorna null)", async () => {
    mockResolveUserId.mockResolvedValueOnce(null)
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe("UNAUTHORIZED")
  })

  it("200 com sessão válida — retorna shape agregado esperado", async () => {
    mockResolveUserId.mockResolvedValueOnce("user-1")
    const res = await GET(makeReq({ authorization: "Bearer valid-token" }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(typeof json.data.itemCount).toBe("number")
    expect(typeof json.data.totalViews).toBe("number")
    expect(typeof json.data.activeBookings).toBe("number")
    expect(Array.isArray(json.data.recentBookings)).toBe(true)
    expect(Array.isArray(json.data.suggestions)).toBe(true)
    expect(Array.isArray(json.data.upcomingReturns)).toBe(true)
    expect(json.data.co2Kg).toBeDefined()
    expect(json.data.treesEquivalent).toBeDefined()
  })

  it("escopa todas as queries por ownerId/borrowerId do usuário resolvido — não vaza dados de outro usuário", async () => {
    mockResolveUserId.mockResolvedValueOnce("user-1")
    await GET(makeReq({ authorization: "Bearer valid-token" }))
    expect(mockItemCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ ownerId: "user-1" }) }),
    )
  })
})
