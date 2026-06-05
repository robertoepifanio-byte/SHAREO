import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAdminRole } from "@/lib/auth/admin-guards"

type Params = { params: Promise<{ id: string }> }

const PatchSchema = z.union([
  z.object({ adminRole: z.enum(["ADMIN_SUPERADMIN", "ADMIN_FINANCEIRO", "ADMIN_OPERACIONAL"]) }),
  z.object({ action: z.enum(["activate", "deactivate"]) }),
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

    const target = await prisma.user.findFirst({
      where:  { id, deletedAt: null, role: "ADMIN" },
      select: { id: true, adminRole: true, isActive: true },
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
        : { isActive: parsed.data.action === "activate" }

    const updated = await prisma.user.update({
      where:  { id },
      data,
      select: { id: true, adminRole: true, isActive: true },
    })

    prisma.adminLog.create({
      data: {
        adminId:    session!.user.id,
        action:     "adminRole" in parsed.data ? "UPDATE_ADMIN_ROLE" : parsed.data.action.toUpperCase(),
        entityType: "User",
        entityId:   id,
        metadata:   JSON.stringify({
          before: { adminRole: target.adminRole, isActive: target.isActive },
          after:  { adminRole: updated.adminRole, isActive: updated.isActive },
        }),
      },
    }).catch((e) => console.warn("[adminLog]", e instanceof Error ? e.message : e))

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
