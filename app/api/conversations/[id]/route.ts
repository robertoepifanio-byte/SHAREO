import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveUserId } from "@/lib/resolveUserId"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const { id }   = await params
    const { searchParams } = req.nextUrl
    const page     = Math.max(1, Number(searchParams.get("page")  ?? 1))
    const limit    = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)))
    const before   = searchParams.get("before")
    const skip     = (page - 1) * limit

    const conv = await prisma.conversation.findUnique({
      where:  { id },
      select: {
        id:        true,
        createdAt: true,
        booking: {
          select: {
            id:         true,
            status:     true,
            startDate:  true,
            endDate:    true,
            totalPrice: true,
            item: {
              select: {
                id:     true,
                title:  true,
                images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
                owner:  { select: { id: true, name: true, avatarUrl: true } },
              },
            },
          },
        },
        participants: {
          select: {
            userId:    true,
            lastReadAt: true,
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    })

    if (!conv) {
      return NextResponse.json(
        { error: { code: "CONVERSATION_NOT_FOUND", message: "Conversa não encontrada." } },
        { status: 404 },
      )
    }

    const isParticipant = conv.participants.some((p) => p.userId === userId)
    if (!isParticipant) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Acesso negado." } },
        { status: 403 },
      )
    }

    const msgWhere = {
      conversationId: id,
      ...(before && { createdAt: { lt: new Date(before) } }),
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where:   msgWhere,
        skip,
        take:    limit,
        orderBy: { createdAt: "asc" },
        select:  {
          id:        true,
          senderId:  true,
          content:   true,
          readAt:    true,
          createdAt: true,
          sender: { select: { id: true, name: true } },
        },
      }),
      prisma.message.count({ where: msgWhere }),
    ])

    // Fire-and-forget outside Promise.all to avoid blocking the response
    prisma.message.updateMany({
      where: { conversationId: id, senderId: { not: userId }, readAt: null },
      data:  { readAt: new Date() },
    }).then(() =>
      prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId: id, userId } },
        data:  { lastReadAt: new Date() },
      })
    ).catch((e) => console.error("[mark-as-read]", e instanceof Error ? e.message : e))

    const other = conv.participants.find((p) => p.userId !== userId)

    return NextResponse.json({
      data: {
        id:        conv.id,
        createdAt: conv.createdAt,
        booking:   conv.booking
          ? { item: { title: conv.booking.item.title } }
          : null,
        otherUser: other
          ? { id: other.user.id, name: other.user.name, avatarUrl: other.user.avatarUrl }
          : null,
        participants: conv.participants.map((p) => ({
          userId:    p.userId,
          name:      p.user.name,
          avatarUrl: p.user.avatarUrl,
          lastReadAt: p.lastReadAt,
        })),
        messages: messages.map((m) => ({
          id:        m.id,
          body:      m.content,
          createdAt: m.createdAt,
          sender:    { id: m.sender.id, name: m.sender.name },
        })),
        meta: { total, page, limit, hasMore: skip + messages.length < total },
      },
    })
  } catch (e) {
    console.error("[GET /api/conversations/:id]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
