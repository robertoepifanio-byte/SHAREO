/** @jest-environment node */
/**
 * Testes de integração para PATCH /api/admin/platform-config?key=autoCancelPendingHours
 *
 * O que estes testes protegem:
 *  - Gate de role: só ADMIN_SUPERADMIN pode salvar.
 *  - Validação de faixa server-side: valores fora de [MIN, MAX] retornam 422.
 *  - Caminho feliz: valor válido é persistido e o cache é limpo.
 *  - A chave gravada é exatamente "autoCancelPendingHours" — a mesma que
 *    getAutoCancelConfig() lê em lib/platform-config.ts.
 *
 * Referência: app/api/admin/platform-config/route.ts
 *             lib/platform-config.ts — AUTO_CANCEL_PENDING_HOURS_MIN/MAX
 */

import { NextRequest } from "next/server"
import { PATCH } from "@/app/api/admin/platform-config/route"
import {
  AUTO_CANCEL_PENDING_HOURS_MIN,
  AUTO_CANCEL_PENDING_HOURS_MAX,
} from "@/lib/platform-config"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAuth              = jest.fn()
const mockRequireAdminRole  = jest.fn()
const mockPlatformConfigUpsert = jest.fn()
const mockClearCache        = jest.fn()
const mockAuditLog          = jest.fn()

jest.mock("@/lib/auth", () => ({ auth: () => mockAuth() }))

jest.mock("@/lib/auth/admin-guards", () => ({
  requireAdminRole: (...args: unknown[]) => mockRequireAdminRole(...args),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    platformConfig: {
      findMany: jest.fn(),
      upsert:   (...args: unknown[]) => mockPlatformConfigUpsert(...args),
    },
  },
}))

jest.mock("@/lib/platform-config", () => {
  const actual = jest.requireActual("@/lib/platform-config")
  return {
    ...actual,
    clearPlatformConfigCache: () => mockClearCache(),
  }
})

jest.mock("@/lib/audit", () => ({ auditLog: (...args: unknown[]) => mockAuditLog(...args) }))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SUPERADMIN_SESSION = { user: { id: "user-sa", adminRole: "ADMIN_SUPERADMIN", name: "SuperAdmin" } }
const OPERACIONAL_SESSION = { user: { id: "user-op", adminRole: "ADMIN_OPERACIONAL", name: "Operacional" } }

function makeRequest(key: string, value: string) {
  return new NextRequest(
    `http://localhost/api/admin/platform-config?key=${key}`,
    {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ value }),
    }
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPlatformConfigUpsert.mockResolvedValue({ id: "cfg-1", key: "autoCancelPendingHours", value: "12" })
})

// ---------------------------------------------------------------------------
// Gate de role
// ---------------------------------------------------------------------------

describe("PATCH /api/admin/platform-config — gate de role", () => {
  it("rejeita sessão nula com 403", async () => {
    mockAuth.mockResolvedValueOnce(null)
    mockRequireAdminRole.mockImplementation(() => { throw new Error("Acesso negado") })

    const res = await PATCH(makeRequest("autoCancelPendingHours", "12"))
    expect(res.status).toBe(403)
  })

  it("rejeita ADMIN_OPERACIONAL com 403", async () => {
    mockAuth.mockResolvedValueOnce(OPERACIONAL_SESSION)
    mockRequireAdminRole.mockImplementation(() => { throw new Error("Acesso negado") })

    const res = await PATCH(makeRequest("autoCancelPendingHours", "12"))
    expect(res.status).toBe(403)
  })

  it("aceita ADMIN_SUPERADMIN", async () => {
    mockAuth.mockResolvedValueOnce(SUPERADMIN_SESSION)
    mockRequireAdminRole.mockReturnValue(undefined) // não lança = autorizado

    const res = await PATCH(makeRequest("autoCancelPendingHours", "12"))
    expect(res.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Validação de faixa server-side para autoCancelPendingHours
// ---------------------------------------------------------------------------

describe("PATCH autoCancelPendingHours — validação de faixa (server-side)", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(SUPERADMIN_SESSION)
    mockRequireAdminRole.mockReturnValue(undefined)
  })

  it("aceita o valor mínimo permitido", async () => {
    const res = await PATCH(makeRequest("autoCancelPendingHours", String(AUTO_CANCEL_PENDING_HOURS_MIN)))
    expect(res.status).toBe(200)
  })

  it("aceita o valor máximo permitido", async () => {
    const res = await PATCH(makeRequest("autoCancelPendingHours", String(AUTO_CANCEL_PENDING_HOURS_MAX)))
    expect(res.status).toBe(200)
  })

  it("aceita o default atual de 12h", async () => {
    const res = await PATCH(makeRequest("autoCancelPendingHours", "12"))
    expect(res.status).toBe(200)
  })

  it.each([
    ["0",     "zero cancelaria imediatamente"],
    ["-1",    "negativo"],
    ["169",   `acima do máximo (${AUTO_CANCEL_PENDING_HOURS_MAX})`],
    ["abc",   "não numérico"],
    ["12.5",  "decimal — só inteiro é válido"],
  ])("rejeita '%s' (%s) com 422", async (value) => {
    const res = await PATCH(makeRequest("autoCancelPendingHours", value))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error).toBeTruthy()
  })

  it("NÃO valida outras chaves pela faixa de autoCancelPendingHours", async () => {
    // Chave sem validador específico — qualquer string não-vazia passa
    const res = await PATCH(makeRequest("algumaCnaveArbitraria", "999"))
    expect(res.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Caminho feliz: persiste e limpa cache
// ---------------------------------------------------------------------------

describe("PATCH autoCancelPendingHours — caminho feliz", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(SUPERADMIN_SESSION)
    mockRequireAdminRole.mockReturnValue(undefined)
  })

  it("chama upsert com a chave correta", async () => {
    await PATCH(makeRequest("autoCancelPendingHours", "24"))
    expect(mockPlatformConfigUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where:  { key: "autoCancelPendingHours" },
        create: expect.objectContaining({ key: "autoCancelPendingHours", value: "24" }),
        update: expect.objectContaining({ value: "24" }),
      })
    )
  })

  it("limpa o cache após persistir (admin não espera 60s para ver o novo valor)", async () => {
    await PATCH(makeRequest("autoCancelPendingHours", "24"))
    expect(mockClearCache).toHaveBeenCalledTimes(1)
  })

  it("registra auditLog com a chave e valor", async () => {
    await PATCH(makeRequest("autoCancelPendingHours", "24"))
    expect(mockAuditLog).toHaveBeenCalledWith(
      SUPERADMIN_SESSION.user.id,
      "PLATFORM_CONFIG_UPDATED",
      "PlatformConfig",
      expect.any(String),
      expect.objectContaining({ key: "autoCancelPendingHours", value: "24" }),
    )
  })
})
