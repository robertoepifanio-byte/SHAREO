import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const notifications = await prisma.notification.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take:    30,
      select:  { id: true, type: true, title: true, body: true, data: true, readAt: true, createdAt: true },
    })

    const unreadCount = notifications.filter((n) => !n.readAt).length

    return NextResponse.json({ data: notifications, unreadCount })
  } catch (e) {
    console.error("[GET /api/notifications]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
