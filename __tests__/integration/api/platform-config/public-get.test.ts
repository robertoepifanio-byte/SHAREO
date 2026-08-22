/** @jest-environment node */
/**
 * Testes de integração para GET /api/platform-config/public
 *
 * Arquivo fonte: app/api/platform-config/public/route.ts
 *
 * Endpoint público (sem autenticação) consumido pelo app mobile. Regra do
 * projeto: nunca hardcode a taxa da plataforma — sempre via getPlatformFeeRate().
 *
 * 🪤 O contrato CRESCEU em 22/08/2026. Antes expunha só `feeRateBps`, e este
 * arquivo tinha um teste fixando exatamente isso. A Central de Ajuda do app
 * cravava no texto o prazo de repasse, o teto por transação e as faixas de
 * cancelamento — e por isso divergia do site assim que qualquer config mudava
 * (foi assim que a tela inteira ficou descrevendo o PSP anterior). Passar esses
 * valores por aqui foi o que permitiu o app transcrever o site de verdade.
 *
 * O guarda continua valendo, só mudou de forma: a lista de campos é FECHADA e
 * contém apenas o que a plataforma já publica em /ajuda, /termos e /politicas.
 * Campo novo aqui = decisão consciente, não vazamento por descuido.
 */

import { GET } from "@/app/api/platform-config/public/route"

const mockGetPlatformFeeRate    = jest.fn()
const mockGetPayoutWindowDays   = jest.fn()
const mockGetCancellationConfig = jest.fn()
const mockGetLateFeeMultiplier  = jest.fn()
const mockGetAutoCancelConfig   = jest.fn()

// 🪤 Os wrappers `(...a) => mockX(...a)` NÃO são cerimônia: o prefixo `mock`
// permite REFERENCIAR a variável dentro da fábrica, mas a fábrica é içada e roda
// antes da inicialização do `const` — passar `mockX` direto como valor estoura
// `Cannot access 'mockX' before initialization`. A seta adia a leitura.
jest.mock("@/lib/platform-config", () => ({
  getPlatformFeeRate:    (...a: unknown[]) => mockGetPlatformFeeRate(...a),
  getPayoutWindowDays:   (...a: unknown[]) => mockGetPayoutWindowDays(...a),
  getCancellationConfig: (...a: unknown[]) => mockGetCancellationConfig(...a),
  getLateFeeMultiplier:  (...a: unknown[]) => mockGetLateFeeMultiplier(...a),
  getAutoCancelConfig:   (...a: unknown[]) => mockGetAutoCancelConfig(...a),
  CHECKOUT_MAX_CENTS:    50_000,
}))

const CANCEL = { fullRefundHours: 24, partialRefundHours: 6, partialPercent: 70, latePercent: 50 }

beforeEach(() => {
  jest.clearAllMocks()
  mockGetPlatformFeeRate.mockResolvedValue(1500)
  mockGetPayoutWindowDays.mockResolvedValue(3)
  mockGetCancellationConfig.mockResolvedValue(CANCEL)
  mockGetLateFeeMultiplier.mockResolvedValue(1.5)
  mockGetAutoCancelConfig.mockResolvedValue({ ownerHours: 48, borrowerHours: 24 })
})

describe("GET /api/platform-config/public", () => {
  it("200 com todos os números que a Central de Ajuda precisa, vindos da config", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toEqual({
      feeRateBps:        1500,
      payoutWindowDays:  3,
      checkoutMaxCents:  50_000,
      cancel:            CANCEL,
      lateFeeMultiplier: 1.5,
      ownerHours:        48,
    })
  })

  it("acompanha a config em vez de devolver constante — nada aqui é hardcoded", async () => {
    mockGetPlatformFeeRate.mockResolvedValue(2000)
    mockGetPayoutWindowDays.mockResolvedValue(7)
    mockGetCancellationConfig.mockResolvedValue({ ...CANCEL, partialPercent: 80 })
    const json = await (await GET()).json()
    expect(json.data.feeRateBps).toBe(2000)
    expect(json.data.payoutWindowDays).toBe(7)
    expect(json.data.cancel.partialPercent).toBe(80)
  })

  it("não vaza campo de config que não é público", async () => {
    // O `toEqual` acima já reprova chave extra. Este caso existe pelo caso
    // ESPECÍFICO: borrowerHours vem no mesmo objeto de getAutoCancelConfig() e
    // NÃO é publicado — o endpoint escolhe campo a campo em vez de espalhar.
    const json = await (await GET()).json()
    expect(json.data).not.toHaveProperty("borrowerHours")
  })

  it("mantém o cache de 60s — a config muda < 1×/mês", async () => {
    const res = await GET()
    expect(res.headers.get("Cache-Control")).toContain("max-age=60")
  })
})
