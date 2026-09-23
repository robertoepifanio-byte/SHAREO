/** @jest-environment node */
/**
 * P1-17 — Testes de unidade para middleware.ts
 *
 * Verifica o comportamento de roteamento do middleware Next.js:
 * rotas públicas, protegidas, de autenticação e de admin.
 */

import { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { jwtVerify } from "jose"
import { isSessionStale } from "@/lib/redis-admin-blocklist"

// ---------------------------------------------------------------------------
// Mock de next-auth/jwt, jose e redis-admin-blocklist
// ---------------------------------------------------------------------------

jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}))
jest.mock("jose", () => ({
  jwtVerify: jest.fn(),
}))
jest.mock("@/lib/redis-admin-blocklist", () => ({
  isSessionStale: jest.fn(),
}))

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>
const mockJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>
const mockIsSessionStale = isSessionStale as jest.MockedFunction<typeof isSessionStale>

// ---------------------------------------------------------------------------
// Helper para criar NextRequest com pathname (e Bearer token opcional)
// ---------------------------------------------------------------------------

function makeReq(pathname: string, bearerToken?: string): NextRequest {
  const headers = bearerToken ? { authorization: `Bearer ${bearerToken}` } : undefined
  return new NextRequest(`http://localhost:3000${pathname}`, { headers })
}

// ---------------------------------------------------------------------------
// Import do middleware DEPOIS dos mocks
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { middleware } = require("@/middleware") as {
  middleware: (req: NextRequest) => Promise<Response>
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsSessionStale.mockResolvedValue(false)
  })

  describe("rotas públicas", () => {
    it("rota pública / com token → NextResponse.next() (status 200)", async () => {
      mockGetToken.mockResolvedValue({
        id: "user-1",
        email: "user@shareo.com",
        role: "USER",
      } as never)

      const req = makeReq("/")
      const res = await middleware(req)

      // next() não define Location — apenas repassa a requisição
      expect(res.headers.get("location")).toBeNull()
    })

    it("rota pública / sem token → NextResponse.next() (sem redirect)", async () => {
      mockGetToken.mockResolvedValue(null)

      const req = makeReq("/")
      const res = await middleware(req)

      expect(res.headers.get("location")).toBeNull()
    })
  })

  describe("rotas protegidas", () => {
    it("rota protegida /dashboard sem token → redireciona para /login?callbackUrl=/dashboard", async () => {
      mockGetToken.mockResolvedValue(null)

      const req = makeReq("/dashboard")
      const res = await middleware(req)

      const location = res.headers.get("location")
      expect(location).not.toBeNull()
      expect(location).toContain("/login")
      expect(location).toContain("callbackUrl=%2Fdashboard")
    })

    it("rota protegida /dashboard com token válido → NextResponse.next() (sem redirect)", async () => {
      mockGetToken.mockResolvedValue({
        id: "user-1",
        email: "user@shareo.com",
        role: "USER",
      } as never)

      const req = makeReq("/dashboard")
      const res = await middleware(req)

      const location = res.headers.get("location")
      expect(location).toBeNull()
    })
  })

  describe("rotas de autenticação", () => {
    it("rota auth /login com token → redireciona para /dashboard", async () => {
      mockGetToken.mockResolvedValue({
        id: "user-1",
        email: "user@shareo.com",
        role: "USER",
      } as never)

      const req = makeReq("/login")
      const res = await middleware(req)

      const location = res.headers.get("location")
      expect(location).not.toBeNull()
      expect(location).toContain("/dashboard")
    })

    it("rota auth /login sem token → NextResponse.next() (sem redirect)", async () => {
      mockGetToken.mockResolvedValue(null)

      const req = makeReq("/login")
      const res = await middleware(req)

      expect(res.headers.get("location")).toBeNull()
    })
  })

  describe("Bearer token (mobile) em rota protegida não-admin", () => {
    it("/api/bookings sem cookie mas com Bearer válido → NextResponse.next() (sem 401)", async () => {
      mockGetToken.mockResolvedValue(null)
      mockJwtVerify.mockResolvedValue({
        payload: { sub: "user-1", iat: 1000 },
      } as never)

      const req = makeReq("/api/bookings", "valid-token")
      const res = await middleware(req)

      expect(res.status).not.toBe(401)
      expect(res.headers.get("location")).toBeNull()
    })

    it("/api/bookings sem cookie e sem Bearer → 401 JSON", async () => {
      mockGetToken.mockResolvedValue(null)

      const req = makeReq("/api/bookings")
      const res = await middleware(req)

      expect(res.status).toBe(401)
    })

    it("/api/bookings sem cookie com Bearer inválido (jwtVerify lança) → 401 JSON", async () => {
      mockGetToken.mockResolvedValue(null)
      mockJwtVerify.mockRejectedValue(new Error("invalid signature"))

      const req = makeReq("/api/bookings", "bad-token")
      const res = await middleware(req)

      expect(res.status).toBe(401)
    })

    it("/api/bookings sem cookie com Bearer de sessão stale (isSessionStale=true) → 401 JSON", async () => {
      mockGetToken.mockResolvedValue(null)
      mockJwtVerify.mockResolvedValue({
        payload: { sub: "user-1", iat: 1000 },
      } as never)
      mockIsSessionStale.mockResolvedValue(true)

      const req = makeReq("/api/bookings", "stale-token")
      const res = await middleware(req)

      expect(res.status).toBe(401)
    })
  })

  describe("rotas de admin", () => {
    it("rota admin /admin com token role=ADMIN e 2FA verificado → NextResponse.next() (sem redirect)", async () => {
      mockGetToken.mockResolvedValue({
        id: "admin-1",
        email: "admin@shareo.com",
        role: "ADMIN",
        mfa: true,
      } as never)

      const req = makeReq("/admin")
      const res = await middleware(req)

      expect(res.headers.get("location")).toBeNull()
    })

    describe("2FA obrigatório", () => {
      // `mfa` ausente cobre os dois casos: admin que ainda não cadastrou o autenticador
      // e token emitido ANTES do 2FA existir. `mfa: false` é o login de admin sem 2FA.
      it.each([
        ["mfa ausente (token anterior ao 2FA)", { id: "a", role: "ADMIN" }],
        ["mfa=false (admin sem 2FA cadastrado)", { id: "a", role: "ADMIN", mfa: false }],
      ])("página /admin com %s → redireciona ao cadastro do 2FA", async (_caso, token) => {
        mockGetToken.mockResolvedValue(token as never)

        const res = await middleware(makeReq("/admin/financeiro"))

        expect(res.headers.get("location")).toContain("/perfil/seguranca/2fa")
      })

      it("/api/admin sem 2FA verificado → 403 MFA_REQUIRED (JSON, não redirect)", async () => {
        mockGetToken.mockResolvedValue({ id: "a", role: "ADMIN" } as never)

        const res = await middleware(makeReq("/api/admin/users"))

        expect(res.status).toBe(403)
        expect((await res.json()).error.code).toBe("MFA_REQUIRED")
      })

      it("/dashboard (destino padrão do login) leva o admin sem 2FA direto ao cadastro", async () => {
        mockGetToken.mockResolvedValue({ id: "a", role: "ADMIN" } as never)

        const res = await middleware(makeReq("/dashboard"))

        expect(res.headers.get("location")).toContain("/perfil/seguranca/2fa")
      })

      it("/dashboard com 2FA verificado segue normal", async () => {
        mockGetToken.mockResolvedValue({ id: "a", role: "ADMIN", mfa: true } as never)

        const res = await middleware(makeReq("/dashboard"))

        expect(res.headers.get("location")).toBeNull()
      })

      it("a tela de cadastro do 2FA NÃO é barrada para o admin sem 2FA (senão ninguém cadastraria)", async () => {
        mockGetToken.mockResolvedValue({ id: "a", role: "ADMIN" } as never)

        const res = await middleware(makeReq("/perfil/seguranca/2fa"))

        expect(res.headers.get("location")).toBeNull()
      })

      it("usuário comum com mfa ausente não é afetado (o 2FA é só de admin)", async () => {
        mockGetToken.mockResolvedValue({ id: "u", role: "USER" } as never)

        const res = await middleware(makeReq("/dashboard"))

        expect(res.headers.get("location")).toBeNull()
      })
    })

    it("rota admin /admin com token role=USER → redireciona para /dashboard", async () => {
      mockGetToken.mockResolvedValue({
        id: "user-1",
        email: "user@shareo.com",
        role: "USER",
      } as never)

      const req = makeReq("/admin")
      const res = await middleware(req)

      const location = res.headers.get("location")
      expect(location).not.toBeNull()
      expect(location).toContain("/dashboard")
    })

    it("/api/admin sem cookie mas com Bearer válido → 401 (Bearer não abre painel admin)", async () => {
      mockGetToken.mockResolvedValue(null)
      mockJwtVerify.mockResolvedValue({
        payload: { sub: "admin-1", iat: 1000 },
      } as never)

      const req = makeReq("/api/admin/users", "valid-admin-token")
      const res = await middleware(req)

      expect(res.status).toBe(401)
      expect(mockJwtVerify).not.toHaveBeenCalled()
    })
  })

  describe("rotas /api/test/* — guard de ambiente", () => {
    const OLD_ENV = process.env

    beforeEach(() => {
      process.env = { ...OLD_ENV }
      mockGetToken.mockResolvedValue(null)
    })

    afterAll(() => {
      process.env = OLD_ENV
    })

    it("bloqueia /api/test/* com 404 quando E2E_BYPASS_DISABLED=true", async () => {
      process.env.E2E_BYPASS_DISABLED = "true"

      const req = makeReq("/api/test/mark-booking-paid")
      const res = await middleware(req)

      expect(res.status).toBe(404)
    })

    it("deixa /api/test/* passar quando E2E_BYPASS_DISABLED não está setado", async () => {
      delete process.env.E2E_BYPASS_DISABLED

      const req = makeReq("/api/test/mark-booking-paid")
      const res = await middleware(req)

      // O middleware não barra — a rota em si aplica as demais camadas
      expect(res.status).not.toBe(404)
    })

    it("deixa /api/test/* passar quando E2E_BYPASS_DISABLED=false", async () => {
      process.env.E2E_BYPASS_DISABLED = "false"

      const req = makeReq("/api/test/mark-booking-paid")
      const res = await middleware(req)

      expect(res.status).not.toBe(404)
    })

    it("não afeta rotas fora de /api/test/ com E2E_BYPASS_DISABLED=true", async () => {
      process.env.E2E_BYPASS_DISABLED = "true"

      const req = makeReq("/api/bookings")
      const res = await middleware(req)

      // /api/bookings é rota protegida — deve pedir autenticação (401), nunca 404
      expect(res.status).toBe(401)
    })
  })
})
