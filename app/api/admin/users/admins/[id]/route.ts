import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAdminRole } from "@/lib/auth/admin-guards"
import { invalidateUserSessions } from "@/lib/redis-admin-blocklist"
import { resetSecondFactor } from "@/lib/auth/mfa"

type Params = { params: Promise<{ id: string }> }

const PatchSchema = z.union([
  z.object({ adminRole: z.enum(["ADMIN_SUPERADMIN", "ADMIN_FINANCEIRO", "ADMIN_OPERACIONAL"]) }),
  z.object({ action: z.enum(["activate", "deactivate", "demote_to_user", "reset_2fa"]) }),
])

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    requireAdminRole(session, "ADMIN_SUPERADMIN")

    const { id } = await params

    if (id === session!.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Não é possível alterar sua própria conta." } },
        { status: 403 },
      )
    }

    const body   = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Dados inválidos." } },
        { status: 400 },
      )
    }

    const isDemote = "action" in parsed.data && parsed.data.action === "demote_to_user"

    const target = await prisma.user.findFirst({
      where:  { id, deletedAt: null, role: isDemote ? undefined : "ADMIN" },
      select: { id: true, role: true, adminRole: true, isActive: true },
    })
    if (!target) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Admin não encontrado." } },
        { status: 404 },
      )
    }

    // Perdeu o celular e os códigos de recuperação: outro superadmin zera o 2FA. O admin
    // entra só com a senha, sem `mfa` (rebaixado na sessão), e refaz o cadastro do autenticador.
    if ("action" in parsed.data && parsed.data.action === "reset_2fa") {
      await Promise.all([resetSecondFactor(id), invalidateUserSessions(id)])
      after(() =>
        prisma.adminLog.create({
          data: { adminId: session!.user.id, action: "MFA_RESET", entityType: "User", entityId: id },
        }).catch((e) => console.warn("[adminLog]", e instanceof Error ? e.message : e))
      )
      return NextResponse.json({ data: { id, totpReset: true } })
    }

    const data =
      "adminRole" in parsed.data
        ? { adminRole: parsed.data.adminRole }
        : parsed.data.action === "demote_to_user"
          ? { role: "USER" as const, adminRole: null, isActive: true }
          : { isActive: parsed.data.action === "activate" }

    const updated = await prisma.user.update({
      where:  { id },
      data,
      select: { id: true, role: true, adminRole: true, isActive: true },
    })

    // Rebaixou role/adminRole, desativou ou removeu do admin → invalida as sessões
    // ANTIGAS via epoch: o token atual morre no middleware (loginAt < epoch), mas
    // um login novo reflete o estado atual (e o authorize() barra conta inativa).
    // "activate" não exige nada — o usuário simplesmente loga de novo.
    if ("adminRole" in parsed.data || parsed.data.action === "deactivate" || parsed.data.action === "demote_to_user") {
      await invalidateUserSessions(id)
    }

    const auditAction =
      "adminRole" in parsed.data
        ? "UPDATE_ADMIN_ROLE"
        : parsed.data.action === "demote_to_user"
          ? "DEMOTE_TO_USER"
          : parsed.data.action.toUpperCase()

    after(() =>
      prisma.adminLog.create({
        data: {
          adminId:    session!.user.id,
          action:     auditAction,
          entityType: "User",
          entityId:   id,
          metadata:   JSON.stringify({
            before: { adminRole: target.adminRole, isActive: target.isActive },
            after:  { adminRole: updated.adminRole, isActive: updated.isActive },
          }),
        },
      }).catch((e) => console.warn("[adminLog]", e instanceof Error ? e.message : e))
    )

    return NextResponse.json({ data: updated })
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 })
    if (e instanceof Error && e.message === "FORBIDDEN")
      return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 })
    console.warn("[PATCH /api/admin/users/admins/:id]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 })
  }
}
