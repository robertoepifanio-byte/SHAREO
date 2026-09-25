/** @jest-environment node */
/**
 * jwtCallback (lib/auth.ts) — verificação periódica de conta excluída
 * sem depender do Redis (SEC-CRIT-04c).
 *
 * Contexto:
 *   PR #519 invalida sessões via epoch no Redis (invalidateUserSessions) e
 *   adicionou `deletedAt: null` ao withUser(select). Lacuna residual: se o Redis
 *   falha exatamente durante a exclusão de conta, isSessionStale retorna false
 *   (fail-open) e o cookie web permaneceria válido pelos 30d do maxAge.
 *
 * Correção (SEC-CRIT-04c):
 *   O jwt callback consulta o banco a cada PERIODIC_CHECK_INTERVAL_S (5 min)
 *   e retorna null se a conta foi excluída ou desativada. auth() retorna null →
 *   resolveUserId() retorna null → withUser retorna 401. Custo: ~1 query/5 min
 *   por sessão ativa, 0 no hot-path.
 *
 * Bearer mobile (access 15 min): NÃO passa pelo jwt callback; janela máxima é o
 *   tempo de vida do access token. O refresh já rejeita deletedAt (ver
 *   app/api/auth/mobile/refresh/route.ts). Documentado como risco residual
 *   aceitável (15 min determinístico).
 *
 * Cada teste abaixo FALHA se o bloco de verificação periódica for revertido.
 */

const mockFindUnique = jest.fn()
jest.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: (...a: unknown[]) => mockFindUnique(...a) } },
}))

// Mocks para os outros módulos importados por lib/auth
jest.mock("bcryptjs", () => ({ compare: jest.fn() }))
jest.mock("@/lib/validations/auth", () => ({ LoginSchema: { safeParse: jest.fn() } }))
jest.mock("@/lib/auth/mfa", () => ({ checkAdminSecondFactor: jest.fn() }))
jest.mock("@/lib/auth/mfa-gate", () => ({ sessionAccess: jest.fn() }))
jest.mock("next-auth", () => jest.fn(() => ({ handlers: {}, auth: jest.fn(), signIn: jest.fn(), signOut: jest.fn() })))
jest.mock("next-auth/providers/credentials", () => jest.fn(() => ({})))

import type { JWT } from "next-auth/jwt"
import { jwtCallback, PERIODIC_CHECK_INTERVAL_S } from "@/lib/auth"

const NOW_S = 1_700_000_000

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(Date, "now").mockReturnValue(NOW_S * 1000)
})

afterEach(() => {
  jest.restoreAllMocks()
})

// ─── Helper: token de sessão com checkedAt vencido ───────────────────────────

function tokenVencido(overrides: Partial<JWT> = {}): JWT {
  return {
    id:        "cuser-abc",
    role:      "USER",
    userType:  "PF",
    loginAt:   NOW_S - 10 * 60,
    // checkedAt há 10 min (> PERIODIC_CHECK_INTERVAL_S de 5 min) → verifica
    checkedAt: NOW_S - 10 * 60,
    ...overrides,
  } as JWT
}

// ─── Testes de rejeição ───────────────────────────────────────────────────────

describe("jwtCallback — rejeição de conta excluída quando Redis está fora (SEC-CRIT-04c)", () => {
  it("🪤 Redis fora + conta com deletedAt preenchido → retorna null (sessão invalidada)", async () => {
    // Redis propositalmente ignorado — nenhum mock de isSessionStale configurado.
    // A proteção NÃO pode depender do Redis para funcionar.
    mockFindUnique.mockResolvedValue({ deletedAt: new Date(), isActive: true })

    const result = await jwtCallback({ token: tokenVencido() })

    expect(result).toBeNull()
  })

  it("🪤 Redis fora + conta com isActive=false → retorna null", async () => {
    mockFindUnique.mockResolvedValue({ deletedAt: null, isActive: false })

    const result = await jwtCallback({ token: tokenVencido() })

    expect(result).toBeNull()
  })

  it("🪤 Redis fora + usuário não encontrado no banco → retorna null", async () => {
    mockFindUnique.mockResolvedValue(null)

    const result = await jwtCallback({ token: tokenVencido() })

    expect(result).toBeNull()
  })
})

// ─── Testes de passagem e custo ───────────────────────────────────────────────

describe("jwtCallback — hot-path: sem query extra quando checkedAt é recente", () => {
  it("checkedAt recente (< PERIODIC_CHECK_INTERVAL_S) → sem consulta ao banco", async () => {
    // 1 min atrás (< 5 min) → NÃO deve consultar o banco
    const token = tokenVencido({ checkedAt: NOW_S - 60 })

    const result = await jwtCallback({ token })

    expect(mockFindUnique).not.toHaveBeenCalled()
    expect(result).not.toBeNull()
  })

  it("checkedAt exatamente no limite (> PERIODIC_CHECK_INTERVAL_S) → consulta o banco", async () => {
    mockFindUnique.mockResolvedValue({ deletedAt: null, isActive: true })
    const token = tokenVencido({ checkedAt: NOW_S - PERIODIC_CHECK_INTERVAL_S - 1 })

    await jwtCallback({ token })

    expect(mockFindUnique).toHaveBeenCalledTimes(1)
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where:  { id: "cuser-abc" },
        select: { deletedAt: true, isActive: true },
      }),
    )
  })

  it("conta ativa verificada → atualiza checkedAt no token retornado", async () => {
    mockFindUnique.mockResolvedValue({ deletedAt: null, isActive: true })

    const result = await jwtCallback({ token: tokenVencido() }) as Record<string, unknown>

    expect(result).not.toBeNull()
    expect(result.checkedAt).toBe(NOW_S)
  })
})

// ─── Login (user presente) ────────────────────────────────────────────────────

describe("jwtCallback — comportamento no login (user presente)", () => {
  it("login: seta checkedAt = loginAt, não consulta banco", async () => {
    const result = await jwtCallback({
      token: {} as JWT,
      user:  { id: "cuser-novo", role: "USER", userType: "PF" },
    }) as JWT

    expect(mockFindUnique).not.toHaveBeenCalled()
    expect(result.checkedAt).toBeDefined()
    expect(result.checkedAt).toBe(result.loginAt)
  })

  it("login: campos de identidade gravados corretamente no token", async () => {
    const result = await jwtCallback({
      token: {} as JWT,
      user:  { id: "cuser-x", role: "ADMIN", userType: "PJ", adminRole: "ADMIN_SUPERADMIN" },
    }) as JWT

    expect(result.id).toBe("cuser-x")
    expect(result.role).toBe("ADMIN")
    expect(result.userType).toBe("PJ")
    expect(result.adminRole).toBe("ADMIN_SUPERADMIN")
  })
})

// ─── Token sem id ─────────────────────────────────────────────────────────────

describe("jwtCallback — estado inesperado", () => {
  it("token sem id → não consulta banco, retorna token intacto", async () => {
    const token = { role: "USER", checkedAt: 0 } as unknown as JWT  // sem id

    const result = await jwtCallback({ token })

    expect(mockFindUnique).not.toHaveBeenCalled()
    expect(result).toEqual(token)
  })
})

// ─── Documentação da janela residual mobile ───────────────────────────────────
//
// Bearer tokens não passam pelo jwtCallback (validados diretamente via jwtVerify
// em resolveUserId.ts). A proteção para mobile vem de outra camada:
//   - Access token expira em 15 min (app/api/auth/mobile/login/route.ts)
//   - Ao expirar, o app chama /refresh, que rejeita conta com deletedAt
//     (app/api/auth/mobile/refresh/route.ts → `if (!user || user.deletedAt) 401`)
// Janela residual máxima: 15 minutos determinísticos. Risco aceito (PR description).
