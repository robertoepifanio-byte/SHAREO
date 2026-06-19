import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { auth } from "@/lib/auth"
import { hasAdminRole } from "@/lib/auth/admin-guards"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const PatchSchema = z.object({
  action: z.enum(["approve", "reject", "toggle_active"]),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    // S14-M-14: itens pertencem a OPERACIONAL (+SUPERADMIN), não a FINANCEIRO
    if (!session || !hasAdminRole(session, "ADMIN_SUPERADMIN", "ADMIN_OPERACIONAL")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Acesso restrito a Operacional/Superadmin." } },
        { status: 403 },
      )
    }

    const { id } = await params
    const body   = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Ação inválida." } },
        { status: 400 },
      )
    }

    const item = await prisma.item.findFirst({
      where:  { id, deletedAt: null },
      select: { id: true, status: true, isApproved: true },
    })

    if (!item) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Item não encontrado." } },
        { status: 404 },
      )
    }

    const { action } = parsed.data
    const adminId    = session.user.id
    const now        = new Date()

    let data: Record<string, unknown>

    if (action === "approve") {
      data = { isApproved: true, status: "AVAILABLE", approvedAt: now, approvedById: adminId }
    } else if (action === "reject") {
      data = { isApproved: false, status: "PAUSED" }
    } else {
      // toggle_active: AVAILABLE ↔ PAUSED
      data = { status: item.status === "AVAILABLE" ? "PAUSED" : "AVAILABLE" }
    }

    const updated = await prisma.item.update({
      where:  { id },
      data,
      select: { id: true, isApproved: true, status: true, updatedAt: true },
    })

    // Log admin action — após a resposta
    after(() =>
      prisma.adminLog.create({
        data: {
          adminId,
          action:     action.toUpperCase(),
          entityType: "Item",
          entityId:   id,
        },
      }).catch((e) => console.error("[adminLog]", e instanceof Error ? e.message : e))
    )

    return NextResponse.json({ data: updated })
  } catch (e) {
    console.error("[PATCH /api/admin/items/:id]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
