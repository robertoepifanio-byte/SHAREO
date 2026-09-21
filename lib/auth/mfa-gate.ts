import type { AdminRole } from "@/lib/auth/admin-guards"

/**
 * O que a sessão (e o middleware) enxerga de um token. Admin sem 2FA verificado é
 * REBAIXADO a usuário comum: um único ponto cobre todos os guards do código,
 * inclusive rotas fora de /admin. Token anterior ao 2FA não tem `mfa` e cai aqui
 * também. Puro e sem imports de runtime — roda no Edge.
 */
export function sessionAccess(token: { role?: string; adminRole?: string; mfa?: boolean }): {
  role:       "USER" | "ADMIN"
  adminRole:  AdminRole | undefined
  mfaPending: boolean
} {
  const adminSemMfa = token.role === "ADMIN" && token.mfa !== true
  return {
    role:       adminSemMfa ? "USER" : (token.role as "USER" | "ADMIN"),
    adminRole:  adminSemMfa ? undefined : (token.adminRole as AdminRole | undefined),
    mfaPending: adminSemMfa,
  }
}
