import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasAdminRole } from "@/lib/auth/admin-guards"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const PatchSchema = z.object({
  action: z.enum(["activate", "deactivate"]),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Acesso restrito a administradores." } },
        { status: 403 },
      )
    }
    if (!hasAdminRole(session, "ADMIN_SUPERADMIN", "ADMIN_OPERACIONAL")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Sem permissão para gerenciar usuários." } },
        { status: 403 },
      )
    }

    const { id } = await params

    if (id === session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Não é possível alterar sua própria conta." } },
        { status: 403 },
      )
    }

    const body   = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Ação inválida." } },
        { status: 400 },
      )
    }

    const user = await prisma.user.findFirst({
      where:  { id, deletedAt: null },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Usuário não encontrado." } },
        { status: 404 },
      )
    }

    const isActive = parsed.data.action === "activate"

    const updated = await prisma.user.update({
      where:  { id },
      data:   { isActive },
      select: { id: true, isActive: true, updatedAt: true },
    })

    prisma.adminLog.create({
      data: {
        adminId:    session.user.id,
        action:     parsed.data.action.toUpperCase(),
        entityType: "User",
        entityId:   id,
        metadata:   JSON.stringify({
          actorRole: (session.user as { adminRole?: string }).adminRole ?? null,
          isActive:  updated.isActive,
        }),
      },
    }).catch((e) => console.error("[adminLog]", e instanceof Error ? e.message : e))

    return NextResponse.json({ data: updated })
  } catch (e) {
    console.error("[PATCH /api/admin/users/:id]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
