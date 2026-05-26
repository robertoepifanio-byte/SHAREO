import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"

export const metadata: Metadata = {
  title: "Minhas Reservas — ShareO",
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:   { label: "Aguardando",  color: "bg-yellow-100 text-yellow-800" },
  CONFIRMED: { label: "Confirmada",  color: "bg-blue-100 text-blue-800" },
  ACTIVE:    { label: "Em andamento", color: "bg-brand/10 text-brand" },
  RETURNED:  { label: "Devolvido",   color: "bg-purple-100 text-purple-700" },
  COMPLETED: { label: "Concluída",   color: "bg-success/10 text-success" },
  CANCELLED: { label: "Cancelada",   color: "bg-red-100 text-red-700" },
  DISPUTED:  { label: "Em disputa",  color: "bg-orange-100 text-orange-700" },
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d))
}

type Tab = "borrower" | "owner"

type Props = { searchParams: Promise<{ tab?: string }> }

export default async function ReservasPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/reservas")

  const sp  = await searchParams
  const tab = (sp.tab === "owner" ? "owner" : "borrower") as Tab
  const userId = session.user.id

  const bookings = await prisma.booking.findMany({
    where: tab === "borrower" ? { borrowerId: userId } : { ownerId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id:         true,
      status:     true,
      startDate:  true,
      endDate:    true,
      totalDays:  true,
      totalPrice: true,
      createdAt:  true,
      item: {
        select: {
          id:     true,
          title:  true,
          images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
        },
      },
      borrower:     { select: { id: true, name: true } },
      owner:        { select: { id: true, name: true } },
      conversation: { select: { id: true } },
    },
  })

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container py-8">
        <h1 className="mb-6 text-2xl font-bold text-primary">Minhas Reservas</h1>

        {/* Abas */}
        <div className="mb-6 flex gap-1 rounded-lg border border-border bg-surface p-1 w-fit">
          {([
            { value: "borrower", label: "Como locatário" },
            { value: "owner",    label: "Como locador" },
          ] as const).map((t) => (
            <Link
              key={t.value}
              href={`/reservas?tab=${t.value}`}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                tab === t.value
                  ? "bg-brand text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <h3 className="mb-2 font-semibold text-primary">Nenhuma reserva ainda</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              {tab === "borrower"
                ? "Explore itens disponíveis e faça sua primeira reserva."
                : "Quando alguém solicitar um item seu, aparecerá aqui."}
            </p>
            {tab === "borrower" && (
              <Link href="/itens" className="text-sm font-medium text-brand hover:underline">
                Explorar anúncios →
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {bookings.map((b) => {
              const statusInfo = STATUS_LABEL[b.status] ?? { label: b.status, color: "bg-muted text-foreground" }
              const counterpart = tab === "borrower" ? b.owner : b.borrower
              const img = b.item.images[0]?.url

              return (
                <div key={b.id} className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted sm:h-24 sm:w-24">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={b.item.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                        <Link
                          href={`/itens/${b.item.id}`}
                          className="text-sm font-semibold text-foreground hover:text-brand transition-colors"
                        >
                          {b.item.title}
                        </Link>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      <p className="mb-2 text-xs text-muted-foreground">
                        {tab === "borrower" ? "Proprietário" : "Locatário"}:{" "}
                        <span className="font-medium text-foreground">{counterpart.name}</span>
                      </p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>📅 {fmtDate(b.startDate)} → {fmtDate(b.endDate)}</span>
                        <span>· {b.totalDays} dia{b.totalDays !== 1 ? "s" : ""}</span>
                        <span className="font-semibold text-foreground">· {fmt(b.totalPrice)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                    <Link
                      href={`/reservas/${b.id}`}
                      className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-background transition-colors"
                    >
                      Ver detalhes
                    </Link>
                    {b.conversation && (
                      <Link
                        href={`/mensagens/${b.conversation.id}`}
                        className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                      >
                        💬 Mensagens
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
