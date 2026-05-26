import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const userId = session.user.id

    const conversations = await prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      orderBy: { lastMessageAt: "desc" },
      select: {
        id:            true,
        lastMessageAt: true,
        booking: {
          select: {
            id:     true,
            status: true,
            item: {
              select: {
                id:     true,
                title:  true,
                images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
              },
            },
          },
        },
        participants: {
          select: {
            userId: true,
            user:   { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take:    1,
          select:  { content: true, senderId: true, createdAt: true },
        },
        _count: {
          select: {
            messages: {
              where: { senderId: { not: userId }, readAt: null },
            },
          },
        },
      },
    })

    const data = conversations.map((conv) => {
      const other       = conv.participants.find((p) => p.userId !== userId)
      const lastMsg     = conv.messages[0]
      const unreadCount = conv._count.messages

      return {
        id:            conv.id,
        lastMessageAt: conv.lastMessageAt,
        unreadCount,
        booking:       conv.booking,
        otherParticipant: other
          ? { id: other.user.id, name: other.user.name, avatarUrl: other.user.avatarUrl }
          : null,
        lastMessage: lastMsg
          ? { content: lastMsg.content.slice(0, 100), senderId: lastMsg.senderId, createdAt: lastMsg.createdAt }
          : null,
      }
    })

    return NextResponse.json({ data })
  } catch (e) {
    console.error("[GET /api/conversations]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
