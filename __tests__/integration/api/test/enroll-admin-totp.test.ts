/** @jest-environment node */
/**
 * POST /api/test/enroll-admin-totp — só o admin FIXTURE (@shareo-test.com) pode ser alcançado,
 * e só com o token E2E. Um admin real não pode ter o 2FA reescrito por esta rota.
 */
import { NextRequest } from "next/server"

const mockUpdateMany = jest.fn()

jest.mock("@/lib/prisma", () => ({ prisma: { user: { updateMany: (...a: unknown[]) => mockUpdateMany(...a) } } }))
jest.mock("@/lib/crypto", () => ({ encryptPII: (s: string) => `ENC(${s})` }))

import { POST } from "@/app/api/test/enroll-admin-totp/route"

const SEGREDO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
const req = (body: unknown, token: string | null = "e2e-secret") =>
  new NextRequest("http://localhost/api/test/enroll-admin-totp", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { "x-e2e-token": token } : {}) },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  jest.clearAllMocks()
  process.env.E2E_SECRET = "e2e-secret"
  delete process.env.E2E_BYPASS_DISABLED
  mockUpdateMany.mockResolvedValue({ count: 1 })
})

describe("guardas", () => {
  it("kill-switch de produção (E2E_BYPASS_DISABLED=true) → 404, sem tocar no banco", async () => {
    process.env.E2E_BYPASS_DISABLED = "true"
    expect((await POST(req({ email: "admin.fixture@shareo-test.com", secret: SEGREDO }))).status).toBe(404)
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it("sem token ou com token errado → 401", async () => {
    expect((await POST(req({ email: "admin.fixture@shareo-test.com", secret: SEGREDO }, null))).status).toBe(401)
    expect((await POST(req({ email: "admin.fixture@shareo-test.com", secret: SEGREDO }, "errado"))).status).toBe(401)
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })
})

describe("validação", () => {
  it.each([
    ["e-mail de admin REAL", { email: "admin@shareo.com.br", secret: SEGREDO }],
    ["e-mail com domínio parecido", { email: "x@shareo-test.com.evil.io", secret: SEGREDO }],
    ["outra conta @shareo-test.com que não é o admin fixture", { email: "locatario.fixture@shareo-test.com", secret: SEGREDO }],
    ["segredo curto", { email: "admin.fixture@shareo-test.com", secret: "ABC" }],
    ["segredo fora do alfabeto base32", { email: "admin.fixture@shareo-test.com", secret: "0".repeat(32) }],
    ["corpo sem campos", {}],
  ])("recusa %s → 400", async (_caso, body) => {
    expect((await POST(req(body))).status).toBe(400)
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })
})

describe("cadastro", () => {
  it("grava o segredo CIFRADO, ativa o 2FA e só age em role ADMIN não excluído", async () => {
    const res = await POST(req({ email: "Admin.Fixture@shareo-test.com", secret: SEGREDO }))

    expect(res.status).toBe(200)
    const { where, data } = mockUpdateMany.mock.calls[0][0]
    expect(where).toEqual({ email: "admin.fixture@shareo-test.com", role: "ADMIN", deletedAt: null })
    expect(data.totpSecretEnc).toBe(`ENC(${SEGREDO})`)
    expect(data.totpEnabledAt).toBeInstanceOf(Date)
    expect(data.totpRecoveryHashes).toEqual([])
  })

  it("admin fixture ausente (ou que deixou de ser admin) → 404", async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 })
    expect((await POST(req({ email: "admin.fixture@shareo-test.com", secret: SEGREDO }))).status).toBe(404)
  })
})
