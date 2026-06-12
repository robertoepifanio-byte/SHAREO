import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const { id } = await params

    // updateMany com userId no where garante que ninguém marca notificação alheia
    await prisma.notification.updateMany({
      where: { id, userId: session.user.id, readAt: null },
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
