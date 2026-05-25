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

    const { id }   = await params
    const userId   = session.user.id

    const conv = await prisma.conversation.findUnique({
      where:  { id },
      select: { participants: { select: { userId: true } } },
    })

    if (!conv) {
      return NextResponse.json(
        { error: { code: "CONVERSATION_NOT_FOUND", message: "Conversa não encontrada." } },
        { status: 404 },
      )
    }

    if (!conv.participants.some((p) => p.userId === userId)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Acesso negado." } },
        { status: 403 },
      )
    }

    const [{ count }] = await Promise.all([
      prisma.message.updateMany({
        where: { conversationId: id, senderId: { not: userId }, readAt: null },
        data:  { readAt: new Date() },
      }),
      prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId: id, userId } },
        data:  { lastReadAt: new Date() },
      }),
    ])

    return NextResponse.json({ data: { markedRead: count } })
  } catch (e) {
    console.error("[PATCH /api/conversations/:id/read]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
