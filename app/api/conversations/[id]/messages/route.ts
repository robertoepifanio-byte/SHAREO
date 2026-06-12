import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveUserId } from "@/lib/resolveUserId"
import { z } from "zod"

const MessageSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  body:    z.string().min(1).max(2000).optional(),
}).refine((d) => d.content ?? d.body, {
  message: "Mensagem não pode ser vazia",
})

// Remove dangerous tag blocks entirely (including inner content), then strips remaining tags.
function stripHtml(input: string): string {
  return input
    .replace(/<(script|style|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim()
}

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const { id }   = await params

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

    const rawBody = await req.json()
    const parsed  = MessageSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "CONTENT_REQUIRED", message: parsed.error.errors[0]?.message ?? "Conteúdo inválido." } },
        { status: 400 },
      )
    }

    const rawContent = stripHtml(parsed.data.content ?? parsed.data.body ?? "")

    const [message] = await Promise.all([
      prisma.message.create({
        data:   { conversationId: id, senderId: userId, content: rawContent },
        select: { id: true, conversationId: true, senderId: true, content: true, readAt: true, createdAt: true },
      }),
      prisma.conversation.update({
        where: { id },
        data:  { lastMessageAt: new Date() },
      }),
    ])

    // Notifica os outros participantes — após a resposta
    const others = conv.participants.filter((p) => p.userId !== userId)
    after(() =>
      prisma.notification.createMany({
        data: others.map((p) => ({
          userId: p.userId,
          type:   "NEW_MESSAGE" as const,
          title:  "Nova mensagem",
          body:   rawContent.slice(0, 80),
          data:   { conversationId: id },
        })),
      }).catch(() => {})
    )

    return NextResponse.json({ data: { ...message, body: message.content } }, { status: 201 })
  } catch (e) {
    console.error("[POST /api/conversations/:id/messages]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
