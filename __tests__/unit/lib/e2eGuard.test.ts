/** @jest-environment node */
/**
 * Testes unitários para lib/e2eGuard.ts — withE2EGuard()
 */

import { NextRequest, NextResponse } from "next/server"
import { withE2EGuard } from "@/lib/e2eGuard"

function makeReq(path: string, token?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (token !== undefined) headers["x-e2e-token"] = token
  return new NextRequest(`http://localhost:3000${path}`, { method: "POST", headers })
}

const successHandler = jest.fn(async () =>
  NextResponse.json({ ok: true }, { status: 200 }),
)

describe("withE2EGuard", () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...OLD_ENV }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  describe("kill-switch E2E_BYPASS_DISABLED", () => {
    it("retorna 404 quando E2E_BYPASS_DISABLED=true, independente dos outros parâmetros", async () => {
      process.env.E2E_BYPASS_DISABLED = "true"
      process.env.E2E_SECRET = "secret-abc"

      const guarded = withE2EGuard(successHandler)
      const res = await guarded(makeReq("/api/test/foo", "secret-abc"))

      expect(res.status).toBe(404)
      expect(successHandler).not.toHaveBeenCalled()
    })

    it("não aciona quando E2E_BYPASS_DISABLED=false", async () => {
      process.env.E2E_BYPASS_DISABLED = "false"
      process.env.E2E_SECRET = "secret-abc"

      const guarded = withE2EGuard(successHandler)
      await guarded(makeReq("/api/test/foo", "secret-abc"))

      expect(successHandler).toHaveBeenCalled()
    })

    it("não aciona quando E2E_BYPASS_DISABLED está ausente", async () => {
      delete process.env.E2E_BYPASS_DISABLED
      process.env.E2E_SECRET = "secret-abc"

      const guarded = withE2EGuard(successHandler)
      await guarded(makeReq("/api/test/foo", "secret-abc"))

      expect(successHandler).toHaveBeenCalled()
    })
  })

  describe("ausência de E2E_SECRET", () => {
    it("retorna 404 quando E2E_SECRET não está configurado no ambiente", async () => {
      delete process.env.E2E_BYPASS_DISABLED
      delete process.env.E2E_SECRET

      const guarded = withE2EGuard(successHandler)
      const res = await guarded(makeReq("/api/test/foo", "qualquer-token"))

      expect(res.status).toBe(404)
      expect(successHandler).not.toHaveBeenCalled()
    })

    it("retorna 404 quando E2E_SECRET é string vazia", async () => {
      delete process.env.E2E_BYPASS_DISABLED
      process.env.E2E_SECRET = ""

      const guarded = withE2EGuard(successHandler)
      const res = await guarded(makeReq("/api/test/foo", ""))

      expect(res.status).toBe(404)
      expect(successHandler).not.toHaveBeenCalled()
    })
  })

  describe("validação do header x-e2e-token", () => {
    beforeEach(() => {
      delete process.env.E2E_BYPASS_DISABLED
      process.env.E2E_SECRET = "secret-correto"
    })

    it("retorna 401 quando o header x-e2e-token está ausente", async () => {
      const guarded = withE2EGuard(successHandler)
      const res = await guarded(makeReq("/api/test/foo")) // sem token

      expect(res.status).toBe(401)
      const body = await res.json() as { error: { code: string } }
      expect(body.error.code).toBe("UNAUTHORIZED")
      expect(successHandler).not.toHaveBeenCalled()
    })

    it("retorna 401 quando o header x-e2e-token é inválido", async () => {
      const guarded = withE2EGuard(successHandler)
      const res = await guarded(makeReq("/api/test/foo", "token-errado"))

      expect(res.status).toBe(401)
      expect(successHandler).not.toHaveBeenCalled()
    })

    it("delega para o handler quando todas as camadas passam", async () => {
      const guarded = withE2EGuard(successHandler)
      const res = await guarded(makeReq("/api/test/foo", "secret-correto"))

      expect(res.status).toBe(200)
      expect(successHandler).toHaveBeenCalledTimes(1)
    })
  })
})
