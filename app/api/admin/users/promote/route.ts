import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAdminRole } from "@/lib/auth/admin-guards"
import { unblockAdminToken } from "@/lib/redis-admin-blocklist"

const PromoteSchema = z.object({
  email:     z.string().email().transform((e) => e.toLowerCase()),
  adminRole: z.enum(["ADMIN_SUPERADMIN", "ADMIN_FINANCEIRO", "ADMIN_OPERACIONAL"]),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    requireAdminRole(session, "ADMIN_SUPERADMIN")

    const body   = await req.json()
    const parsed = PromoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "E-mail ou role inválidos." } },
        { status: 400 },
      )
    }

    const { email, adminRole } = parsed.data

    const target = await prisma.user.findUnique({
      where:  { email },
      select: { id: true, name: true, email: true, role: true, deletedAt: true },
    })

    if (!target || target.deletedAt) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Nenhum usuário encontrado com este e-mail." } },
        { status: 404 },
      )
    }

    if (target.role === "ADMIN") {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Este usuário já é administrador." } },
        { status: 409 },
      )
    }

    // Não permitir promover a si próprio (já é superadmin, mas por consistência)
    if (target.id === session!.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Não é possível alterar sua própria conta." } },
        { status: 403 },
      )
    }

    const updated = await prisma.user.update({
      where:  { id: target.id },
      data:   { role: "ADMIN", adminRole, isActive: true },
      select: { id: true, name: true, email: true, adminRole: true, isActive: true, createdAt: true },
    })

    // Garantir que o token não esteja bloqueado
    await unblockAdminToken(updated.id)

    prisma.adminLog.create({
      data: {
        adminId:    session!.user.id,
        action:     "PROMOTE_TO_ADMIN",
        entityType: "User",
        entityId:   updated.id,
        metadata:   JSON.stringify({ adminRole, previousRole: target.role }),
      },
    }).catch((e) => console.warn("[adminLog]", e instanceof Error ? e.message : e))

    return NextResponse.json({ data: updated }, { status: 200 })
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 })
    if (e instanceof Error && e.message === "FORBIDDEN")
      return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 })
    console.warn("[POST /api/admin/users/promote]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 })
  }
}
