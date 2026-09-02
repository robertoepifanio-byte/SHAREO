import { redirect } from "next/navigation"
import { NextResponse } from "next/server"
import type { Session } from "next-auth"
import { auth } from "@/lib/auth"
import { hasAdminRole, type AdminRole } from "@/lib/auth/admin-guards"

/**
 * Guard de PÁGINA admin (Server Components). Centraliza o par
 *   if (!session || session.user.role !== "ADMIN") redirect("/dashboard")
 *   if (!hasAdminRole(session, ...)) redirect("/admin")
 * que estava copiado em 14+ páginas. Sem `roles`, exige apenas role ADMIN.
 * Retorna a sessão já validada (não-nula).
 */
export async function requireAdminPage(...roles: AdminRole[]): Promise<Session> {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard")
  if (roles.length > 0 && !hasAdminRole(session, ...roles)) redirect("/admin")
  return session
}

type AdminApiOk  = { session: Session; error: null }
type AdminApiErr = { session: null; error: NextResponse }

/**
 * Guard de ROTA admin (Route Handlers). Retorna `{ session }` quando autorizado,
 * ou `{ error }` já pronto (401/403) para dar `return error`.
 *
 *   const { session, error } = await requireAdminApi("ADMIN_FINANCEIRO")
 *   if (error) return error
 *   // ...usa session
 */
export async function requireAdminApi(...roles: AdminRole[]): Promise<AdminApiOk | AdminApiErr> {
  const session = await auth()

  // 401 SÓ para quem não tem sessão nenhuma — é o único caso em que "faça
  // login" resolve. Antes o não-admin logado também levava 401, divergindo do
  // resto de /api/admin, que devolve 403 para permissão insuficiente.
  if (!session) {
    return { session: null, error: NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 }) }
  }
  // Autenticado, porém sem permissão: 403 nos dois casos — não é admin, ou é
  // admin do papel errado. Duas guardas irmãs em vez de uma condição composta,
  // simétricas com requireAdminPage logo acima.
  const proibido = () => ({
    session: null as null,
    error:   NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 }),
  })
  if (session.user.role !== "ADMIN") return proibido()
  if (roles.length > 0 && !hasAdminRole(session, ...roles)) return proibido()
  return { session, error: null }
}
