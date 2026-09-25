/** @jest-environment node */
/**
 * PATCH /api/admin/platform-config?key=billingEnabled — o interruptor da cobrança real.
 *
 * Referência: app/api/admin/platform-config/route.ts
 *             lib/platform-config.ts — getBillingConfig()
 *
 * 🪤 Por que o validador existe: getBillingConfig() só abre com a string exata
 * "true". Sem a trava, o SuperAdmin gravaria "True" (ou "1", ou "sim"), receberia
 * 200 e acharia que abriu — a cobrança continuaria fechada, sem nenhum aviso.
 */
import { NextRequest } from "next/server"
import { PATCH } from "@/app/api/admin/platform-config/route"

const mockAuth             = jest.fn()
const mockRequireAdminRole = jest.fn()
const mockUpsert           = jest.fn()
const mockAuditLog         = jest.fn()

jest.mock("@/lib/auth", () => ({ auth: () => mockAuth() }))
jest.mock("@/lib/auth/admin-guards", () => ({
  requireAdminRole: (...a: unknown[]) => mockRequireAdminRole(...a),
}))
jest.mock("@/lib/prisma", () => ({
  prisma: { platformConfig: { findMany: jest.fn(), upsert: (...a: unknown[]) => mockUpsert(...a) } },
}))
jest.mock("@/lib/audit", () => ({ auditLog: (...a: unknown[]) => mockAuditLog(...a) }))

const SUPERADMIN = { user: { id: "user-sa", adminRole: "ADMIN_SUPERADMIN" } }

function patch(value: string) {
  return new NextRequest("http://localhost/api/admin/platform-config?key=billingEnabled", {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ value }),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue(SUPERADMIN)
  mockRequireAdminRole.mockReturnValue(undefined)
  mockUpsert.mockResolvedValue({ id: "cfg-1", key: "billingEnabled", value: "true" })
})

describe("PATCH billingEnabled", () => {
  it.each(["true", "false"])("aceita %j e grava a chave certa", async (value) => {
    const res = await PATCH(patch(value))
    expect(res.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where:  { key: "billingEnabled" },
      update: expect.objectContaining({ value }),
    }))
    expect(mockAuditLog).toHaveBeenCalledWith(
      "user-sa", "PLATFORM_CONFIG_UPDATED", "PlatformConfig", expect.any(String),
      expect.objectContaining({ key: "billingEnabled", value }),
    )
  })

  it.each(["True", "1", " true"])(
    "🪤 recusa %j com 422 — não grava nada",
    async (value) => {
      const res = await PATCH(patch(value))
      expect(res.status).toBe(422)
      expect((await res.json()).error).toContain('"true" ou "false"')
      expect(mockUpsert).not.toHaveBeenCalled()
    },
  )
})
