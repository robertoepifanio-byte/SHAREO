/** @jest-environment node */
/**
 * Testes de integração — validação de entrada em POST /api/founders/leads
 *
 * Dois contratos, os dois sobre campos que não dá para conferir depois:
 * `consentVersion` (trilha LGPD) e `intent` (ranking da cidade-piloto).
 *
 * Whitelist de versões de consentimento LGPD:
 *   - Versão vigente ("marketing-v1.0") → 201
 *   - Versão legada ("v1.1")            → 201 + console.warn
 *   - Campo ausente                     → 201 (usa o default "marketing-v1.0")
 *   - String desconhecida               → 422 com code UNKNOWN_CONSENT_VERSION
 *
 * Arquivo fonte: app/api/founders/leads/route.ts
 */

import { NextRequest } from "next/server"
import { POST } from "@/app/api/founders/leads/route"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFindUnique = jest.fn()
const mockCreate     = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    founderLead: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      create:     (...a: unknown[]) => mockCreate(...a),
      update:     jest.fn().mockResolvedValue({}),
    },
    founderAuditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}))

jest.mock("@/lib/founders", () => ({
  assignWave:          jest.fn().mockReturnValue("WAVE_1"),
  generateReferralCode: jest.fn().mockReturnValue("ABCD1234"),
}))

jest.mock("@/lib/email", () => ({
  sendFounderWelcomeEmail: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/geo/normalize-place", () => ({
  normalizePlace: (v: string | undefined) => (v ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""),
}))

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }))

// after() do Next.js: executa o callback imediatamente nos testes
jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server")
  return { ...actual, after: (fn: () => void) => fn() }
})

const mockCheckRateLimit    = jest.fn()
const mockRateLimitResponse = jest.fn()

jest.mock("@/lib/rateLimit", () => ({
  checkRateLimit:    (...a: unknown[]) => mockCheckRateLimit(...a),
  rateLimitResponse: (...a: unknown[]) => mockRateLimitResponse(...a),
  RATE_LIMITS:       { foundersLead: { limit: 10, windowMs: 60_000 } },
}))

// CORS: passa direto sem adicionar cabeçalhos extra
jest.mock("@/lib/cors-campanha", () => ({
  comCors:          (res: unknown) => res,
  respostaPreflight: jest.fn(),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Payload mínimo válido para criação de lead. */
const BASE_PAYLOAD = {
  email:            "teste@exemplo.com.br",
  marketingConsent: true,
  city:             "São Paulo",
  state:            "SP",
  intent:           "proprietario", // obrigatorio desde 31/08 — ver route.ts
} as const

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/founders/leads", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  })
}

function mockLeadCreated() {
  mockFindUnique.mockResolvedValue(null)
  mockCreate.mockResolvedValue({
    id: "lead-id-1",
    queuePosition: 1,
    referralCode: "ABCD1234",
  })
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()
  mockCheckRateLimit.mockResolvedValue({ allowed: true, resetAt: new Date() })
})

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("POST /api/founders/leads — consentVersion", () => {
  it("aceita a versão vigente (marketing-v1.0) e retorna 201", async () => {
    mockLeadCreated()
    const res = await POST(makeRequest({ ...BASE_PAYLOAD, consentVersion: "marketing-v1.0" }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.leadId).toBeDefined()
    // Confirma que a versão foi gravada corretamente
    const createCall = mockCreate.mock.calls[0][0]
    expect(createCall.data.consentVersion).toBe("marketing-v1.0")
  })

  it("aceita versão legada (v1.1) com console.warn e retorna 201", async () => {
    mockLeadCreated()
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})
    const res = await POST(makeRequest({ ...BASE_PAYLOAD, consentVersion: "v1.1" }))
    expect(res.status).toBe(201)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("consentVersion legada aceita"),
      "v1.1",
    )
    warnSpy.mockRestore()
  })

  it("usa o default (marketing-v1.0) quando o campo está ausente e retorna 201", async () => {
    mockLeadCreated()
    // Envia payload SEM o campo consentVersion
    const res = await POST(makeRequest({ ...BASE_PAYLOAD }))
    expect(res.status).toBe(201)
    const createCall = mockCreate.mock.calls[0][0]
    expect(createCall.data.consentVersion).toBe("marketing-v1.0")
  })

  it("rejeita versão desconhecida com 422 e code UNKNOWN_CONSENT_VERSION", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})
    const res = await POST(makeRequest({ ...BASE_PAYLOAD, consentVersion: "versao-inventada" }))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error.code).toBe("UNKNOWN_CONSENT_VERSION")
    // Log de diagnóstico deve ter sido emitido com o valor recebido
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("consentVersion desconhecida recebida"),
      "versao-inventada",
    )
    // Banco não deve ter sido tocado
    expect(mockCreate).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it("rejeita string vazia como versão desconhecida com 422", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})
    const res = await POST(makeRequest({ ...BASE_PAYLOAD, consentVersion: "" }))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error.code).toBe("UNKNOWN_CONSENT_VERSION")
    warnSpy.mockRestore()
  })

  it("não vaza o valor da string desconhecida no corpo da resposta", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})
    const res = await POST(makeRequest({ ...BASE_PAYLOAD, consentVersion: "xss-<script>alert(1)</script>" }))
    expect(res.status).toBe(422)
    const body = await res.text()
    expect(body).not.toContain("<script>")
    warnSpy.mockRestore()
  })
})

/** Impede o `.default("proprietario")` de voltar pela porta dos fundos — o
 *  motivo esta em app/api/founders/leads/route.ts. */
describe("POST /api/founders/leads — intent", () => {
  it("recusa o lead quando `intent` nao vem, em vez de assumir 'proprietario'", async () => {
    mockLeadCreated()
    const { intent: _omitido, ...semIntent } = BASE_PAYLOAD
    const res = await POST(makeRequest(semIntent))

    expect(res.status).toBe(400) // 400 = falha de schema; 422 e so consentVersion
    // O ponto nao e o status: e que nenhum lead torto foi gravado.
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it.each(["proprietario", "locatario", "ambos"])("grava intent %s como veio", async (intent) => {
    mockLeadCreated()
    const res = await POST(makeRequest({ ...BASE_PAYLOAD, intent }))

    expect(res.status).toBe(201)
    expect(mockCreate.mock.calls[0][0].data.intent).toBe(intent)
  })

  it("recusa valor fora do enum", async () => {
    mockLeadCreated()
    const res = await POST(makeRequest({ ...BASE_PAYLOAD, intent: "curioso" }))
    expect(res.status).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
