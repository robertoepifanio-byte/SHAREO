import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { BookingActions } from "./_BookingActions"
import { ReviewForm }    from "./_ReviewForm"

type Props = { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: "Detalhe da Reserva — ShareO" }

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:   { label: "Aguardando resposta", color: "bg-yellow-100 text-yellow-800" },
  CONFIRMED: { label: "Confirmada",          color: "bg-blue-100 text-blue-800" },
  ACTIVE:    { label: "Em andamento",        color: "bg-brand/10 text-brand" },
  RETURNED:  { label: "Devolvido",           color: "bg-purple-100 text-purple-700" },
  COMPLETED: { label: "Concluída",           color: "bg-success/10 text-success" },
  CANCELLED: { label: "Cancelada",           color: "bg-red-100 text-red-700" },
  DISPUTED:  { label: "Em disputa",          color: "bg-orange-100 text-orange-700" },
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(d))
}

export default async function BookingDetailPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/reservas")

  const { id } = await params
  const userId  = session.user.id

  const booking = await prisma.booking.findUnique({
    where:  { id },
    select: {
      id:            true,
      status:        true,
      startDate:     true,
      endDate:       true,
      totalDays:     true,
      dailyPrice:    true,
      totalPrice:    true,
      depositAmount: true,
      borrowerNote:  true,
      ownerNote:     true,
      cancelledAt:   true,
      cancelReason:  true,
      createdAt:     true,
      item: {
        select: {
          id:     true,
          title:  true,
          city:   true,
          state:  true,
          images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
        },
      },
      borrower:     { select: { id: true, name: true } },
      owner:        { select: { id: true, name: true } },
      conversation: { select: { id: true } },
      reviews: {
        where:  { reviewerId: userId },
        select: { reviewType: true, rating: true, comment: true },
      },
    },
  })

  if (!booking) notFound()

  const isOwner    = booking.owner.id    === userId
  const isBorrower = booking.borrower.id === userId
  if (!isOwner && !isBorrower) notFound()

  const statusInfo  = STATUS_LABEL[booking.status] ?? { label: booking.status, color: "bg-muted text-foreground" }
  const counterpart = isOwner ? booking.borrower : booking.owner
  const img         = booking.item.images[0]?.url

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="border-b border-border bg-surface">
        <div className="container py-3">
          <Link href="/reservas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Minhas Reservas
          </Link>
        </div>
      </div>

      <main className="container py-8">
        <div className="mx-auto max-w-2xl">

          {/* Header do booking */}
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-primary">{booking.item.title}</h1>
              <p className="text-sm text-muted-foreground">
                {isOwner ? "Locatário" : "Proprietário"}:{" "}
                <span className="font-medium text-foreground">{counterpart.name}</span>
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          {/* Imagem + datas */}
          <div className="mb-6 overflow-hidden rounded-xl border border-border bg-surface">
            {img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt={booking.item.title} className="h-48 w-full object-cover" />
            )}
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Retirada</p>
                  <p className="font-semibold text-foreground">{fmtDate(booking.startDate)}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Devolução</p>
                  <p className="font-semibold text-foreground">{fmtDate(booking.endDate)}</p>
                </div>
              </div>

              <div className="my-4 h-px bg-border" />

              {/* Resumo financeiro */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{booking.totalDays} dia{booking.totalDays !== 1 ? "s" : ""} × {fmt(booking.dailyPrice)}</span>
                  <span>{fmt(booking.dailyPrice * booking.totalDays)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Taxa Shareo (10%)</span>
                  <span>{fmt(booking.totalPrice - booking.dailyPrice * booking.totalDays)}</span>
                </div>
                {booking.depositAmount && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Caução</span>
                    <span>{fmt(booking.depositAmount)}</span>
                  </div>
                )}
                <div className="my-1 h-px bg-border" />
                <div className="flex justify-between font-bold text-foreground">
                  <span>Total</span>
                  <span>{fmt(booking.totalPrice)}</span>
                </div>
              </div>

              {/* Notas */}
              {booking.borrowerNote && (
                <div className="mt-4 rounded-lg bg-background p-3 text-sm">
                  <p className="mb-1 font-semibold text-foreground">Mensagem do locatário:</p>
                  <p className="text-muted-foreground">{booking.borrowerNote}</p>
                </div>
              )}

              {booking.cancelReason && (
                <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm">
                  <p className="mb-1 font-semibold text-red-700">Motivo do cancelamento:</p>
                  <p className="text-red-600">{booking.cancelReason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Ações */}
          <BookingActions
            bookingId={booking.id}
            status={booking.status}
            isOwner={isOwner}
            isBorrower={isBorrower}
            conversationId={booking.conversation?.id}
          />

          {/* Avaliações — disponíveis após devolução */}
          {(booking.status === "RETURNED" || booking.status === "COMPLETED") && (
            <div className="mt-6 space-y-4">
              <h2 className="font-semibold text-foreground">Avaliações</h2>

              {isBorrower && (
                <>
                  <ReviewForm
                    bookingId={booking.id}
                    reviewType="ITEM"
                    targetName={booking.item.title}
                    existing={booking.reviews.find((r) => r.reviewType === "ITEM") ?? null}
                  />
                  <ReviewForm
                    bookingId={booking.id}
                    reviewType="OWNER"
                    targetName={booking.owner.name}
                    existing={booking.reviews.find((r) => r.reviewType === "OWNER") ?? null}
                  />
                </>
              )}

              {isOwner && (
                <ReviewForm
                  bookingId={booking.id}
                  reviewType="BORROWER"
                  targetName={booking.borrower.name}
                  existing={booking.reviews.find((r) => r.reviewType === "BORROWER") ?? null}
                />
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
