/** @jest-environment node */
/**
 * P1-17 — Testes de unidade para middleware.ts
 *
 * Verifica o comportamento de roteamento do middleware Next.js:
 * rotas públicas, protegidas, de autenticação e de admin.
 */

import { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// ---------------------------------------------------------------------------
// Mock de next-auth/jwt
// ---------------------------------------------------------------------------

jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}))

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>

// ---------------------------------------------------------------------------
// Helper para criar NextRequest com pathname
// ---------------------------------------------------------------------------

function makeReq(pathname: string): NextRequest {
  return new NextRequest(`http://localhost:3000${pathname}`)
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

  describe("rotas de admin", () => {
    it("rota admin /admin com token role=ADMIN → NextResponse.next() (sem redirect)", async () => {
      mockGetToken.mockResolvedValue({
        id: "admin-1",
        email: "admin@shareo.com",
        role: "ADMIN",
      } as never)

      const req = makeReq("/admin")
      const res = await middleware(req)

      expect(res.headers.get("location")).toBeNull()
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
  })
})
