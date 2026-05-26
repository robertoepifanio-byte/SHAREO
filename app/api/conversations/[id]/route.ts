import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
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
        select:  { id: true, senderId: true, content: true, readAt: true, createdAt: true },
      }),
      prisma.message.count({ where: msgWhere }),

      // Marca mensagens do outro como lidas (fire-and-forget)
      prisma.message.updateMany({
        where: { conversationId: id, senderId: { not: userId }, readAt: null },
        data:  { readAt: new Date() },
      }).then(() =>
        prisma.conversationParticipant.update({
          where: { conversationId_userId: { conversationId: id, userId } },
          data:  { lastReadAt: new Date() },
        })
      ).catch(() => {}),
    ])

    return NextResponse.json({
      data: {
        ...conv,
        participants: conv.participants.map((p) => ({
          userId:    p.userId,
          name:      p.user.name,
          avatarUrl: p.user.avatarUrl,
          lastReadAt: p.lastReadAt,
        })),
        messages,
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
