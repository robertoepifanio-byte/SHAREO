import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SendMessageSchema } from "@/lib/validations/messages"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
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
      select: { id: true, participants: { select: { userId: true } } },
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

    const body   = await req.json()
    const parsed = SendMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "CONTENT_REQUIRED", message: parsed.error.errors[0]?.message ?? "Conteúdo inválido." } },
        { status: 400 },
      )
    }

    // Sanitiza HTML básico
    const content = parsed.data.content.replace(/<[^>]*>/g, "").trim()

    const [message] = await Promise.all([
      prisma.message.create({
        data:   { conversationId: id, senderId: userId, content },
        select: { id: true, conversationId: true, senderId: true, content: true, readAt: true, createdAt: true },
      }),
      prisma.conversation.update({
        where: { id },
        data:  { lastMessageAt: new Date() },
      }),
    ])

    // Notifica os outros participantes (fire-and-forget)
    const others = conv.participants.filter((p) => p.userId !== userId)
    prisma.notification.createMany({
      data: others.map((p) => ({
        userId: p.userId,
        type:   "NEW_MESSAGE" as const,
        title:  "Nova mensagem",
        body:   content.slice(0, 80),
        data:   { conversationId: id },
      })),
    }).catch(() => {})

    return NextResponse.json({ data: message }, { status: 201 })
  } catch (e) {
    console.error("[POST /api/conversations/:id/messages]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
