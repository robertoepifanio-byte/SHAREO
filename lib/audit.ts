import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export type AuditAction =
  | "PAYOUT_APPROVED"
  | "PAYOUT_REJECTED"
  | "PAYOUT_MARKED_COMPLETED"
  | "PIX_ACCOUNT_VERIFIED"
  | "PIX_ACCOUNT_REJECTED"
  | "PLATFORM_CONFIG_UPDATED"
  | "ADMIN_ROLE_GRANTED"
  | "EXPORT_FINANCIAL"

/** Grava uma entrada no audit log de forma fire-and-forget. Nunca lança exceção. */
export function auditLog(
  adminId:    string,
  action:     AuditAction,
  entityType: string,
  entityId:   string,
  metadata?:  Prisma.InputJsonValue,
): void {
  prisma.adminLog.create({
    data: { adminId, action, entityType, entityId, metadata: metadata ?? Prisma.JsonNull },
  }).catch((e) =>
    console.error("[auditLog]", action, entityId, e instanceof Error ? e.message : e),
  )
}
