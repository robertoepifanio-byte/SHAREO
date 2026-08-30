import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { withUser } from "@/lib/withUser"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest) {
  try {
    const user = await withUser(req)
    if (user instanceof NextResponse) return user

    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data:  { readAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[PATCH /api/notifications/read-all]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
