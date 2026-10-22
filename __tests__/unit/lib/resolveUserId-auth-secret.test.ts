/** @jest-environment node */
/**
 * resolveUserId — fail-closed sem AUTH_SECRET (por quê: lib/auth-secret.ts).
 * jose REAL de propósito: mockado, o teste não provaria que a chave vazia é
 * aceita. Os casos "vitima" FALHAM se o `?? ""` antigo for restaurado.
 */
import crypto from "node:crypto"
import { NextRequest } from "next/server"

const mockAuth = jest.fn()
jest.mock("@/lib/auth", () => ({ auth: () => mockAuth() }))
jest.mock("@/lib/redis-admin-blocklist", () => ({
  isSessionStale: jest.fn().mockResolvedValue(false),
}))

import { resolveUserId } from "@/lib/resolveUserId"

const SECRET = "segredo-de-teste-nao-usar-em-producao"

/** JWT HS256 montado à mão — permite assinar com chave vazia. */
function hs256(payload: object, secret: string): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url")
  const body = `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}`
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url")
  return `${body}.${sig}`
}

function reqWithBearer(token: string): NextRequest {
  return new NextRequest("http://localhost:3000/api/x", {
    headers: { authorization: `Bearer ${token}` },
  })
}

describe("resolveUserId — AUTH_SECRET", () => {
  const original = process.env.AUTH_SECRET
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    mockAuth.mockReset().mockResolvedValue(null)
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
  })
  afterEach(() => {
    errorSpy.mockRestore()
    if (original === undefined) delete process.env.AUTH_SECRET
    else process.env.AUTH_SECRET = original
  })

  it.each([
    ["ausente", undefined],
    ["vazio", ""],
  ])("AUTH_SECRET %s: Bearer forjado com chave vazia NÃO autentica", async (_, value) => {
    if (value === undefined) delete process.env.AUTH_SECRET
    else process.env.AUTH_SECRET = value

    await expect(resolveUserId(reqWithBearer(hs256({ sub: "vitima" }, "")))).resolves.toBeNull()
    expect(mockAuth).toHaveBeenCalled() // caiu no caminho da sessão-cookie
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("AUTH_SECRET ausente"))
  })

  it("controle: com AUTH_SECRET, Bearer assinado com ele autentica", async () => {
    process.env.AUTH_SECRET = SECRET

    await expect(resolveUserId(reqWithBearer(hs256({ sub: "user-1" }, SECRET)))).resolves.toBe("user-1")
    expect(mockAuth).not.toHaveBeenCalled()
  })
})
