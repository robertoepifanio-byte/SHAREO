import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { userMiniSelect } from "@/lib/prisma/selects"
import { Avatar } from "@/components/ui/Avatar"

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
          user: { select: userMiniSelect },
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
          <EmptyState
            title="Nenhuma conversa ainda"
            description="Quando você solicitar ou receber uma reserva, a conversa aparecerá aqui."
          />
        ) : (
          <div className="mx-auto max-w-2xl divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
            {conversations.map((conv) => {
              const other      = conv.participants.find((p) => p.userId !== userId)
              const myLastRead = conv.participants.find((p) => p.userId === userId)?.lastReadAt
              const lastMsg    = conv.messages[0]
              const isUnread   = myLastRead && lastMsg && lastMsg.senderId !== userId
                && new Date(lastMsg.createdAt) > new Date(myLastRead)

              return (
                <Link
                  key={conv.id}
                  href={`/mensagens/${conv.id}`}
                  className="flex items-center gap-3 px-4 py-4 hover:bg-background transition-colors"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <Avatar name={other?.user.name} src={other?.user.avatarUrl} size={48} className="bg-primary text-white" />
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
