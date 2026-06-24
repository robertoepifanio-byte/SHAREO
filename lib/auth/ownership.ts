/**
 * Guard de propriedade de recurso.
 * Centraliza a checagem IDOR que era duplicada nas rotas de items.
 *
 * Retorna true se o usuário é dono do recurso OU se é admin.
 * Preserva EXATAMENTE a semântica das checagens inline originais:
 *   existing.ownerId !== session.user.id && session.user.role !== "ADMIN"
 *
 * IMPORTANTE: a lógica de retornar 403 permanece no handler — este helper
 * apenas encapsula o TESTE booleano, sem alterar o comportamento observável.
 */
import type { Session } from "next-auth"

export function assertOwnerOrAdmin(
  resourceOwnerId: string,
  session: Session,
): boolean {
  return resourceOwnerId === session.user.id || session.user.role === "ADMIN"
}
