import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DisputeActions } from "./_Actions"

export const metadata: Metadata = { title: "Admin — Disputas" }

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

export default async function AdminDisputasPage() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard")

  const disputes = await prisma.booking.findMany({
    where:   { status: "DISPUTED" },
    orderBy: { updatedAt: "desc" },
    select: {
      id:           true,
      totalPrice:   true,
      cancelReason: true,
      updatedAt:    true,
      item:     { select: { id: true, title: true } },
      borrower: { select: { id: true, name: true, email: true } },
      owner:    { select: { id: true, name: true, email: true } },
      conversation: { select: { id: true } },
    },
  })

  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d)

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-primary">
        Disputas
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          ({disputes.length} {disputes.length === 1 ? "aberta" : "abertas"})
        </span>
      </h1>

      {disputes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/40" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <p className="text-muted-foreground">Nenhuma disputa aberta.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((d) => (
            <div key={d.id} className="rounded-xl border border-orange-200 bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{d.item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Valor: {fmt(d.totalPrice)} · Em disputa desde {fmtDate(d.updatedAt)}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Locatário</p>
                      <p className="font-medium text-foreground">{d.borrower.name}</p>
                      <p className="text-xs text-muted-foreground">{d.borrower.email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Proprietário</p>
                      <p className="font-medium text-foreground">{d.owner.name}</p>
                      <p className="text-xs text-muted-foreground">{d.owner.email}</p>
                    </div>
                  </div>

                  {d.cancelReason && (
                    <div className="mt-3 rounded-lg bg-orange-50 p-2.5 text-xs text-[#9A4700]">
                      <span className="font-semibold">Motivo: </span>{d.cancelReason}
                    </div>
                  )}

                  {d.conversation && (
                    <a
                      href={`/mensagens/${d.conversation.id}`}
                      className="mt-2 inline-block text-xs text-brand hover:underline"
                    >
                      Ver conversa →
                    </a>
                  )}
                </div>

                <DisputeActions bookingId={d.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
