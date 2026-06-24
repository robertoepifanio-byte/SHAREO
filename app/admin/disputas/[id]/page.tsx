import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { requireAdminPage } from "@/lib/auth/require-admin"
import { prisma } from "@/lib/prisma"
import { formatDateTime } from "@/utils/format"

export const metadata: Metadata = { title: "Admin — Conversa da disputa" }

type Props = { params: Promise<{ id: string }> }

/**
 * Visão SOMENTE LEITURA da conversa de uma disputa, para o admin.
 *
 * Diferente de /mensagens/[id] (que faz notFound() para quem não é participante
 * e marca mensagens como lidas / abre o chat realtime), aqui o admin é um
 * OBSERVADOR: nenhuma mutação (read receipts), nenhum envio de mensagem.
 * `[id]` é o ID da conversa.
 */
export default async function AdminDisputaConversaPage({ params }: Props) {
  await requireAdminPage()

  const { id } = await params

  const conv = await prisma.conversation.findUnique({
    where:  { id },
    select: {
      id: true,
      booking: {
        select: {
          id:       true,
          status:   true,
          borrower: { select: { id: true, name: true } },
          owner:    { select: { id: true, name: true } },
          item:     { select: { id: true, title: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select:  { id: true, senderId: true, content: true, createdAt: true },
      },
    },
  })

  if (!conv) notFound()

  const borrowerId = conv.booking?.borrower.id
  const ownerId    = conv.booking?.owner.id
  const labelFor = (senderId: string) =>
    senderId === borrowerId
      ? { name: conv.booking?.borrower.name ?? "Locatário", role: "Locatário" as const }
      : senderId === ownerId
        ? { name: conv.booking?.owner.name ?? "Proprietário", role: "Proprietário" as const }
        : { name: "Usuário", role: null }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/disputas" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Disputas
          </Link>
          <h1 className="mt-1 text-xl font-bold text-primary">
            {conv.booking?.item.title ?? "Conversa"}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Locatário <span className="font-medium text-foreground">{conv.booking?.borrower.name}</span>
            {" · "}
            Proprietário <span className="font-medium text-foreground">{conv.booking?.owner.name}</span>
          </p>
        </div>
        {conv.booking && (
          <Link
            href={`/admin/reservas/${conv.booking.id}`}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-background transition-colors"
          >
            Ver reserva
          </Link>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Conversa (somente leitura)
        </p>

        {conv.messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma mensagem nesta conversa.
          </p>
        ) : (
          <ul className="space-y-4">
            {conv.messages.map((m) => {
              const who = labelFor(m.senderId)
              const isBorrower = m.senderId === borrowerId
              return (
                <li key={m.id} className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-foreground">{who.name}</span>
                    {who.role && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          isBorrower
                            ? "bg-primary/10 text-primary"
                            : "bg-brand/10 text-brand"
                        }`}
                      >
                        {who.role}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">{formatDateTime(m.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{m.content}</p>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
