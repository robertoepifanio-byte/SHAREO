/** @jest-environment node */
/**
 * Testes de integração para GET /api/platform-config/public
 *
 * Arquivo fonte: app/api/platform-config/public/route.ts
 *
 * Endpoint público (sem autenticação) usado pela tela mobile "Estimativa de
 * Ganhos" — regra do projeto: nunca hardcode a taxa da plataforma, sempre
 * via getPlatformFeeRate(). Este teste garante que o endpoint expõe SÓ a
 * taxa, nada além (sem vazar outros campos de PlatformConfig).
 */

import { GET } from "@/app/api/platform-config/public/route"

const mockGetPlatformFeeRate = jest.fn()
jest.mock("@/lib/platform-config", () => ({
  getPlatformFeeRate: (...args: unknown[]) => mockGetPlatformFeeRate(...args),
}))

describe("GET /api/platform-config/public", () => {
  beforeEach(() => jest.clearAllMocks())

  it("200 retornando a taxa dinâmica atual em basis points", async () => {
    mockGetPlatformFeeRate.mockResolvedValueOnce(1500)
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.feeRateBps).toBe(1500)
  })

  it("reflete mudança de taxa sem exigir deploy (fonte é getPlatformFeeRate, não uma constante)", async () => {
    mockGetPlatformFeeRate.mockResolvedValueOnce(2000)
    const res = await GET()
    const json = await res.json()
    expect(json.data.feeRateBps).toBe(2000)
  })

  it("não expõe nenhum campo além de feeRateBps", async () => {
    mockGetPlatformFeeRate.mockResolvedValueOnce(1500)
    const res = await GET()
    const json = await res.json()
    expect(Object.keys(json.data)).toEqual(["feeRateBps"])
  })
})
