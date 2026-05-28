import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"

export const metadata: Metadata = { title: "Mensagens" }

function timeAgo(d: Date | null) {
  if (!d) return ""
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60_000)
  if (mins < 1)   return "agora"
  if (mins < 60)  return `${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export default async function MensagensPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/mensagens")

  const userId = session.user.id

  const conversations = await prisma.conversation.findMany({
    where:   { participants: { some: { userId } } },
    orderBy: { lastMessageAt: "desc" },
    select: {
      id:            true,
      lastMessageAt: true,
      booking: {
        select: {
          status: true,
          item: {
            select: {
              title:  true,
              images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
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
      messages: {
        orderBy: { createdAt: "desc" },
        take:    1,
        select:  { content: true, senderId: true, createdAt: true },
      },
    },
  })

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container py-8">
        <h1 className="mb-6 text-2xl font-bold text-primary">Mensagens</h1>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3 className="mb-2 font-semibold text-primary">Nenhuma conversa ainda</h3>
            <p className="text-sm text-muted-foreground">
              Quando você solicitar ou receber uma reserva, a conversa aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
            {conversations.map((conv) => {
              const other      = conv.participants.find((p) => p.userId !== userId)
              const myLastRead = conv.participants.find((p) => p.userId === userId)?.lastReadAt
              const lastMsg    = conv.messages[0]
              const isUnread   = myLastRead && lastMsg && lastMsg.senderId !== userId
                && new Date(lastMsg.createdAt) > new Date(myLastRead)
              const initial    = other?.user.name[0]?.toUpperCase() ?? "?"

              return (
                <Link
                  key={conv.id}
                  href={`/mensagens/${conv.id}`}
                  className="flex items-center gap-3 px-4 py-4 hover:bg-background transition-colors"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                      {initial}
                    </div>
                    {isUnread && (
                      <span className="absolute right-0 top-0 h-3 w-3 rounded-full bg-brand ring-2 ring-surface" aria-hidden="true" />
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-semibold ${isUnread ? "text-foreground" : "text-foreground/80"}`}>
                        {other?.user.name ?? "Usuário"}
                      </p>
                      <span className="flex-shrink-0 text-xs text-muted-foreground">
                        {timeAgo(conv.lastMessageAt)}
                      </span>
                    </div>
                    {conv.booking && (
                      <p className="truncate text-xs text-brand">{conv.booking.item.title}</p>
                    )}
                    {lastMsg && (
                      <p className={`truncate text-xs ${isUnread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {lastMsg.senderId === userId ? "Você: " : ""}{lastMsg.content}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
