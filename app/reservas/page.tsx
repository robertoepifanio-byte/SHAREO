import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { BookingStatusBadge } from "@/components/ui/BookingStatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { formatPrice, formatDateShort } from "@/utils/format"

export const metadata: Metadata = {
  title: "Minhas Reservas",
}

type Tab = "borrower" | "owner"

type Props = { searchParams: Promise<{ tab?: string }> }

export default async function ReservasPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/reservas")

  const sp  = await searchParams
  const tab = (sp.tab === "owner" ? "owner" : "borrower") as Tab
  const userId = session.user.id

  // Contagem de solicitações pendentes (para banner de aprovação)
  const pendingCount = tab === "owner"
    ? await prisma.booking.count({ where: { ownerId: userId, status: "PENDING" } })
    : 0

  const bookings = await prisma.booking.findMany({
    where: tab === "borrower" ? { borrowerId: userId } : { ownerId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id:         true,
      status:     true,
      // Sem isto o CTA nao distingue pago de nao pago: `status` continua
      // CONFIRMED depois do pagamento, ate a retirada (mark_active).
      paymentStatus: true,
      disputeStatus: true,
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
      _count: {
        select: {
          bookingItems: true,                                   // Story B — quantos itens na locação
          reviews: { where: { reviewerId: userId } },          // F6 — já avaliou esta reserva?
        },
      },
    },
  })

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container py-8">
        <h1 className="mb-6 text-2xl font-bold text-primary">Minhas Reservas</h1>

        {/* Abas */}
        <div className="mb-6 flex gap-1 rounded-lg border border-border bg-surface p-1 w-fit" role="tablist" aria-label="Papel na reserva">
          {([
            { value: "borrower", label: "Como locatário" },
            { value: "owner",    label: "Como locador" },
          ] as const).map((t) => (
            <Link
              key={t.value}
              href={`/reservas?tab=${t.value}`}
              role="tab"
              aria-selected={tab === t.value}
              className={`inline-flex h-11 items-center rounded-md px-4 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                tab === t.value
                  ? "bg-brand text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* Banner de solicitações pendentes — só aparece na aba "Como locador" */}
        {tab === "owner" && pendingCount > 0 && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-4" role="alert">
            <span className="mt-0.5 text-xl" aria-hidden="true">🔔</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {pendingCount === 1
                  ? "Você tem 1 solicitação aguardando sua aprovação"
                  : `Você tem ${pendingCount} solicitações aguardando sua aprovação`}
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                Confirme ou recuse cada solicitação para liberar o período no calendário.
              </p>
            </div>
          </div>
        )}

        {bookings.length === 0 ? (
          <EmptyState
            title="Nenhuma reserva ainda"
            description={
              tab === "borrower"
                ? "Explore itens disponíveis e faça sua primeira reserva."
                : "Quando alguém solicitar um item seu, aparecerá aqui."
            }
            action={
              tab === "borrower" ? (
                <Link href="/itens" className="text-sm font-medium text-brand hover:underline">
                  Explorar anúncios →
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {bookings.map((b) => {
              const counterpart = tab === "borrower" ? b.owner : b.borrower
              const img = b.item.images[0]?.url

              return (
                <div key={b.id} className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted sm:h-24 sm:w-24">
                      {img ? (
                        <Image src={img} alt={b.item.title} width={96} height={96} className="h-full w-full object-cover" />
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
                          {b._count.bookingItems > 1 && (
                            <span className="ml-1 font-normal text-muted-foreground">+ {b._count.bookingItems - 1} {b._count.bookingItems - 1 === 1 ? "item" : "itens"}</span>
                          )}
                        </Link>
                        <BookingStatusBadge status={b.status} disputeStatus={b.disputeStatus} />
                      </div>

                      <p className="mb-2 text-xs text-muted-foreground">
                        {tab === "borrower" ? "Proprietário" : "Locatário"}:{" "}
                        <span className="font-medium text-foreground">{counterpart.name}</span>
                      </p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>📅 {formatDateShort(b.startDate)} → {formatDateShort(b.endDate)}</span>
                        <span>· {b.totalDays} dia{b.totalDays !== 1 ? "s" : ""}</span>
                        <span className="font-semibold text-foreground">· {formatPrice(b.totalPrice)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  {(() => {
                    // CTA primário contextual por status + papel
                    const isBorrower = b.borrower.id === userId
                    const isOwner    = b.owner.id    === userId
                    let primaryLabel = "Ver detalhes"
                    let primaryStyle = "border border-border text-foreground hover:bg-background"
                    if (isBorrower && b.status === "ACTIVE") {
                      primaryLabel = "📦 Devolver"
                      primaryStyle = "bg-brand text-white hover:opacity-90"
                    } else if (isOwner && b.status === "PENDING") {
                      primaryLabel = "✅ Aprovar solicitação"
                      primaryStyle = "bg-brand text-white hover:opacity-90"
                    } else if (isOwner && b.status === "RETURNED") {
                      primaryLabel = "📦 Confirmar recebimento"
                      primaryStyle = "bg-brand text-white hover:opacity-90"
                    } else if (b.status === "CONFIRMED" && b.paymentStatus !== "PAID") {
                      primaryLabel = "💳 Ver pagamento"
                      primaryStyle = "bg-brand text-white hover:opacity-90"
                    } else if (b.status === "CONFIRMED" && isBorrower) {
                      // 🪤 Relato do Raimundo (02/09/2026): pago e confirmado, e o
                      // botao verde continuava "Ver pagamento" — mandava o locatario
                      // para uma tela sem nada a fazer. O que ele precisa agora e o
                      // codigo de 6 digitos que o proprietario vai pedir na entrega
                      // (pickupToken, exibido em /reservas/[id]).
                      primaryLabel = "🔑 Ver código de retirada"
                      primaryStyle = "bg-brand text-white hover:opacity-90"
                    }
                    // CTA "Avaliar": aparece para RETURNED/COMPLETED sem avaliação do usuário
                    const canReview = (b.status === "RETURNED" || b.status === "COMPLETED") && b._count.reviews === 0

                    return (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                        <Link
                          href={`/reservas/${b.id}`}
                          className={`inline-flex h-11 items-center rounded-lg px-4 text-sm font-semibold transition-all ${primaryStyle}`}
                        >
                          {primaryLabel}
                        </Link>
                        {/* Botão "Ver detalhes" secundário quando o primário já é uma ação */}
                        {primaryLabel !== "Ver detalhes" && (
                          <Link
                            href={`/reservas/${b.id}`}
                            className="inline-flex h-11 items-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground hover:bg-background transition-colors"
                          >
                            Ver detalhes
                          </Link>
                        )}
                        {/* CTA Avaliar — só quando ainda não avaliou e o status permite */}
                        {canReview && (
                          <Link
                            href={`/reservas/${b.id}#avaliar`}
                            className="inline-flex h-11 items-center rounded-lg border border-brand px-4 text-sm font-semibold text-brand hover:bg-brand/5 transition-colors"
                          >
                            ⭐ Avaliar
                          </Link>
                        )}
                        {b.conversation && (
                          <Link
                            href={`/mensagens/${b.conversation.id}`}
                            className="inline-flex h-11 items-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground hover:bg-background transition-colors"
                          >
                            💬 Mensagens
                          </Link>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
