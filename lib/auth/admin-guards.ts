import type { Session } from 'next-auth'

export type AdminRole = 'ADMIN_SUPERADMIN' | 'ADMIN_FINANCEIRO' | 'ADMIN_OPERACIONAL'

/**
 * Lança erro se a sessão não possuir um dos roles admin listados.
 * Use em Server Actions e Route Handlers do módulo financeiro.
 *
 * @throws 'UNAUTHENTICATED' — sessão ausente ou sem usuário
 * @throws 'FORBIDDEN'       — usuário não possui nenhum dos roles exigidos
 */
export function requireAdminRole(
  session: Session | null,
  ...roles: AdminRole[]
): void {
  if (!session?.user) throw new Error('UNAUTHENTICATED')
  const userRole = (session.user as { adminRole?: AdminRole }).adminRole
  if (!userRole || !roles.includes(userRole)) {
    throw new Error('FORBIDDEN')
  }
}

/**
 * Retorna true se a sessão possuir pelo menos um dos roles admin listados.
 * Use em condicionais de UI (ex.: exibir/ocultar menu financeiro).
 */
export function hasAdminRole(
  session: Session | null,
  ...roles: AdminRole[]
): boolean {
  const userRole = (session?.user as { adminRole?: AdminRole } | null)?.adminRole
  return !!userRole && roles.includes(userRole)
}
