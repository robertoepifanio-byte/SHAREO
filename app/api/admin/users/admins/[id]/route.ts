import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAdminRole } from "@/lib/auth/admin-guards"
import { blockAdminToken, unblockAdminToken } from "@/lib/redis-admin-blocklist"

type Params = { params: Promise<{ id: string }> }

const PatchSchema = z.union([
  z.object({ adminRole: z.enum(["ADMIN_SUPERADMIN", "ADMIN_FINANCEIRO", "ADMIN_OPERACIONAL"]) }),
  z.object({ action: z.enum(["activate", "deactivate", "demote_to_user"]) }),
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

    // Revogar JWT imediatamente se rebaixado, removido de admin ou desativado; limpar se reativado
    if ("adminRole" in parsed.data || parsed.data.action === "deactivate" || parsed.data.action === "demote_to_user") {
      await blockAdminToken(id)
    } else if (parsed.data.action === "activate") {
      await unblockAdminToken(id)
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
