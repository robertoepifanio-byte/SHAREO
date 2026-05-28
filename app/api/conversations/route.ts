import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveUserId } from "@/lib/resolveUserId"

export async function GET(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

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
        id:          conv.id,
        updatedAt:   conv.lastMessageAt,
        unreadCount,
        booking:     conv.booking
          ? { item: { title: conv.booking.item.title } }
          : null,
        otherUser: other
          ? { id: other.user.id, name: other.user.name, avatarUrl: other.user.avatarUrl }
          : null,
        lastMessage: lastMsg
          ? { body: lastMsg.content.slice(0, 100), createdAt: lastMsg.createdAt }
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
