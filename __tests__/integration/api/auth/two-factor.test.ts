/** @jest-environment node */
/**
 * Rotas do 2FA de administrador:
 *  - POST /api/auth/2fa/setup  — inicia o cadastro (exige SENHA de novo)
 *  - POST /api/auth/2fa/enable — confirma com código do app, devolve códigos de recuperação
 *  - PATCH /api/admin/users/admins/:id { action: "reset_2fa" } — só ADMIN_SUPERADMIN, nunca em si mesmo
 */

import { NextRequest } from "next/server"

const mockAuth        = jest.fn()
const mockFindUnique  = jest.fn()
const mockFindFirst   = jest.fn()
const mockAdminLog    = jest.fn().mockResolvedValue({})
const mockCompare     = jest.fn()
const mockStartEnroll = jest.fn()
const mockConfirm     = jest.fn()
const mockReset       = jest.fn()
const mockInvalidate  = jest.fn().mockResolvedValue(true)
const mockRateLimit   = jest.fn()

jest.mock("@/lib/auth", () => ({ auth: () => mockAuth() }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user:     { findUnique: (...a: unknown[]) => mockFindUnique(...a), findFirst: (...a: unknown[]) => mockFindFirst(...a) },
    adminLog: { create: (...a: unknown[]) => mockAdminLog(...a) },
  },
}))
jest.mock("bcryptjs", () => ({ __esModule: true, default: { compare: (...a: unknown[]) => mockCompare(...a) } }))
jest.mock("qrcode", () => ({ __esModule: true, default: { toDataURL: jest.fn().mockResolvedValue("data:image/png;base64,QR") } }))
jest.mock("@/lib/auth/mfa", () => ({
  startEnrollment:    (...a: unknown[]) => mockStartEnroll(...a),
  confirmEnrollment:  (...a: unknown[]) => mockConfirm(...a),
  resetSecondFactor:  (...a: unknown[]) => mockReset(...a),
}))
jest.mock("@/lib/redis-admin-blocklist", () => ({ invalidateUserSessions: (...a: unknown[]) => mockInvalidate(...a) }))
jest.mock("@/lib/rateLimit", () => ({
  checkRateLimit:     (...a: unknown[]) => mockRateLimit(...a),
  rateLimitResponse:  () => new Response(null, { status: 429 }),
  RATE_LIMITS:        { passwordChange: { limit: 5, windowMs: 1 }, adminMfa: { limit: 10, windowMs: 1 } },
}))
jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server")
  return { ...actual, after: (fn: () => void) => fn() }
})

import { POST as setup } from "@/app/api/auth/2fa/setup/route"
import { POST as enable } from "@/app/api/auth/2fa/enable/route"
import { PATCH as adminPatch } from "@/app/api/admin/users/admins/[id]/route"

const json = (url: string, method: string, body: unknown) =>
  new NextRequest(`http://localhost${url}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })

// A sessão de admin SEM 2FA chega rebaixada (role USER): as rotas de cadastro têm de ler o papel do banco.
const SESSAO_PENDENTE = { user: { id: "adm-1", role: "USER" } }
const ADMIN_DB = { email: "adm@shareo.com.br", role: "ADMIN", passwordHash: "hash", isActive: true, deletedAt: null, totpEnabledAt: null }

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue(SESSAO_PENDENTE)
  mockRateLimit.mockResolvedValue({ allowed: true, remaining: 4, resetAt: 0 })
  mockFindUnique.mockResolvedValue(ADMIN_DB)
  mockCompare.mockResolvedValue(true)
  mockStartEnroll.mockResolvedValue({ secret: "SEGREDO", uri: "otpauth://x" })
  mockConfirm.mockResolvedValue(["AAAAA-BBBBB"])
})

describe("POST /api/auth/2fa/setup", () => {
  it("sem sessão → 401", async () => {
    mockAuth.mockResolvedValue(null)
    expect((await setup(json("/api/auth/2fa/setup", "POST", { password: "x" }) as never)).status).toBe(401)
  })

  it("usuário que não é admin → 403 (o 2FA é só de admin)", async () => {
    mockFindUnique.mockResolvedValue({ ...ADMIN_DB, role: "USER" })
    expect((await setup(json("/api/auth/2fa/setup", "POST", { password: "x" }))).status).toBe(403)
    expect(mockStartEnroll).not.toHaveBeenCalled()
  })

  it("senha errada → 403 e NENHUM segredo é gerado (sessão aberta não basta para cadastrar o autenticador)", async () => {
    mockCompare.mockResolvedValue(false)
    const res = await setup(json("/api/auth/2fa/setup", "POST", { password: "errada" }))
    expect(res.status).toBe(403)
    expect(mockStartEnroll).not.toHaveBeenCalled()
  })

  it("admin que já tem 2FA → 409 (trocar de aparelho passa pelo reset de outro superadmin)", async () => {
    mockFindUnique.mockResolvedValue({ ...ADMIN_DB, totpEnabledAt: new Date() })
    const res = await setup(json("/api/auth/2fa/setup", "POST", { password: "x" }))
    expect(res.status).toBe(409)
    expect(mockStartEnroll).not.toHaveBeenCalled()
  })

  it("caminho feliz → QR + segredo, com Cache-Control: no-store", async () => {
    const res = await setup(json("/api/auth/2fa/setup", "POST", { password: "certa" }))
    expect(res.status).toBe(200)
    expect(res.headers.get("cache-control")).toBe("no-store")
    expect((await res.json()).data).toEqual({ secret: "SEGREDO", qr: "data:image/png;base64,QR" })
  })

  it("rate limit → 429 antes de conferir a senha", async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: 0 })
    expect((await setup(json("/api/auth/2fa/setup", "POST", { password: "x" }))).status).toBe(429)
    expect(mockCompare).not.toHaveBeenCalled()
  })
})

describe("POST /api/auth/2fa/enable", () => {
  it("código errado → 400 e nada é invalidado nem auditado", async () => {
    mockConfirm.mockResolvedValue(null)
    const res = await enable(json("/api/auth/2fa/enable", "POST", { code: "000000" }))
    expect(res.status).toBe(400)
    expect(mockInvalidate).not.toHaveBeenCalled()
    expect(mockAdminLog).not.toHaveBeenCalled()
  })

  it("código certo → devolve os códigos de recuperação, encerra as sessões antigas e audita", async () => {
    const res = await enable(json("/api/auth/2fa/enable", "POST", { code: "123456" }))
    expect(res.status).toBe(200)
    expect((await res.json()).data.recoveryCodes).toEqual(["AAAAA-BBBBB"])
    expect(res.headers.get("cache-control")).toBe("no-store")
    expect(mockInvalidate).toHaveBeenCalledWith("adm-1")
    expect(mockAdminLog.mock.calls[0][0].data).toMatchObject({ action: "MFA_ENABLED", adminId: "adm-1" })
  })

  it("sem sessão → 401", async () => {
    mockAuth.mockResolvedValue(null)
    expect((await enable(json("/api/auth/2fa/enable", "POST", { code: "123456" }))).status).toBe(401)
    expect(mockConfirm).not.toHaveBeenCalled()
  })
})

describe("PATCH /api/admin/users/admins/:id — reset_2fa", () => {
  const SUPER = { user: { id: "sa-1", role: "ADMIN", adminRole: "ADMIN_SUPERADMIN" } }
  const params = (id: string) => ({ params: Promise.resolve({ id }) })

  beforeEach(() => {
    mockAuth.mockResolvedValue(SUPER)
    mockFindFirst.mockResolvedValue({ id: "adm-2", role: "ADMIN", adminRole: "ADMIN_FINANCEIRO", isActive: true })
  })

  it("superadmin reinicia o 2FA de outro admin: zera, derruba as sessões dele e audita", async () => {
    const res = await adminPatch(json("/x", "PATCH", { action: "reset_2fa" }), params("adm-2"))
    expect(res.status).toBe(200)
    expect(mockReset).toHaveBeenCalledWith("adm-2")
    expect(mockInvalidate).toHaveBeenCalledWith("adm-2")
    expect(mockAdminLog.mock.calls[0][0].data).toMatchObject({ action: "MFA_RESET", adminId: "sa-1", entityId: "adm-2" })
  })

  it("não vale sobre si mesmo (senão um superadmin com a sessão roubada zeraria o próprio 2FA)", async () => {
    const res = await adminPatch(json("/x", "PATCH", { action: "reset_2fa" }), params("sa-1"))
    expect(res.status).toBe(403)
    expect(mockReset).not.toHaveBeenCalled()
  })

  it("admin que não é superadmin → 403", async () => {
    mockAuth.mockResolvedValue({ user: { id: "fin-1", role: "ADMIN", adminRole: "ADMIN_FINANCEIRO" } })
    const res = await adminPatch(json("/x", "PATCH", { action: "reset_2fa" }), params("adm-2"))
    expect(res.status).toBe(403)
    expect(mockReset).not.toHaveBeenCalled()
  })
})
