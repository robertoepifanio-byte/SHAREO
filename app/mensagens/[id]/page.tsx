import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { ChatWindow } from "./_ChatWindow"

type Props = { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: "Chat" }

export default async function ChatPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/mensagens")

  const { id }   = await params
  const userId   = session.user.id

  const conv = await prisma.conversation.findUnique({
    where:  { id },
    select: {
      id:        true,
      createdAt: true,
      booking: {
        select: {
          id:     true,
          status: true,
          item: {
            select: {
              id:    true,
              title: true,
            },
          },
        },
      },
      participants: {
        select: {
          userId: true,
          user:   { select: { id: true, name: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        take:    50,
        select:  { id: true, senderId: true, content: true, readAt: true, createdAt: true },
      },
    },
  })

  if (!conv) notFound()
  if (!conv.participants.some((p) => p.userId === userId)) notFound()

  // Marca mensagens, participante e notificações da conversa como lidos
  await Promise.all([
    prisma.message.updateMany({
      where: { conversationId: id, senderId: { not: userId }, readAt: null },
      data:  { readAt: new Date() },
    }).then(() =>
      prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId: id, userId } },
        data:  { lastReadAt: new Date() },
      })
    ),
    prisma.notification.updateMany({
      where: {
        userId,
        type:   "NEW_MESSAGE",
        readAt: null,
        data:   { path: ["conversationId"], equals: id },
      },
      data: { readAt: new Date() },
    }),
  ]).catch((e) => console.error("[mark-as-read SSR]", e instanceof Error ? e.message : e))

  const other = conv.participants.find((p) => p.userId !== userId)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />

      {/* Barra de contexto */}
      <div className="border-b border-border bg-surface">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Link href="/mensagens" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ←
            </Link>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              {other?.user.name[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{other?.user.name ?? "Usuário"}</p>
              {conv.booking && (
                <Link
                  href={`/itens/${conv.booking.item.id}`}
                  className="text-xs text-brand hover:underline"
                >
                  {conv.booking.item.title}
                </Link>
              )}
            </div>
          </div>
          {conv.booking && (
            <Link
              href={`/reservas/${conv.booking.id}`}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-background transition-colors"
            >
              Ver reserva
            </Link>
          )}
        </div>
      </div>

      {/* Janela de chat (client component) */}
      <ChatWindow
        conversationId={id}
        currentUserId={userId}
        initialMessages={conv.messages.map((m) => ({
          ...m,
          readAt:    m.readAt    ? m.readAt.toISOString()    : null,
          createdAt: m.createdAt.toISOString(),
        }))}
        otherName={other?.user.name ?? "Usuário"}
      />
    </div>
  )
}
