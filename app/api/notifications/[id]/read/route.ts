import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { withUser } from "@/lib/withUser"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await withUser(req)
    if (user instanceof NextResponse) return user

    const { id } = await params

    // updateMany com userId no where garante que ninguém marca notificação alheia
    await prisma.notification.updateMany({
      where: { id, userId: user.id, readAt: null },
      data:  { readAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[PATCH /api/notifications/:id/read]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
