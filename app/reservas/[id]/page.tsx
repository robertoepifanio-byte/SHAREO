import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { BookingActions }      from "./_BookingActions"
import { ReviewForm }          from "./_ReviewForm"
import { PayButton }           from "@/components/bookings/PayButton"
import { ContractBanner }      from "./_ContractBanner"
import { CheckInOut }          from "./_CheckInOut"
import { BookingProgressBar }  from "@/components/booking/BookingProgressBar"
import { ReturnCountdown }    from "@/components/booking/ReturnCountdown"
import { ReturnChecklist }    from "@/components/booking/ReturnChecklist"
import { ReturnConditionForm } from "@/components/booking/ReturnConditionForm"

type Props = {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ payment?: string }>
}

export const metadata: Metadata = { title: "Detalhe da Reserva" }

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:   { label: "Aguardando resposta", color: "bg-amber-100 text-amber-800" },
  CONFIRMED: { label: "Confirmada",          color: "bg-[#144D81]/10 text-[#144D81]" },
  ACTIVE:    { label: "Em andamento",        color: "bg-brand/10 text-brand" },
  RETURNED:  { label: "Devolvido",           color: "bg-purple-100 text-purple-700" },
  COMPLETED: { label: "Concluída",           color: "bg-success/10 text-success" },
  CANCELLED: { label: "Cancelada",           color: "bg-destructive/10 text-destructive" },
  DISPUTED:  { label: "Em disputa",          color: "bg-orange-100 text-[#9A4700]" },
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(d))
}

export default async function BookingDetailPage({ params, searchParams }: Props) {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/reservas")

  const { id }      = await params
  const { payment } = await searchParams
  const userId       = session.user.id

  const booking = await prisma.booking.findUnique({
    where:  { id },
    select: {
      id:            true,
      status:        true,
      paymentStatus: true,
      paidAt:        true,
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
      contractSignedAt: true,
      returnedAt:    true,
      lateFeeAmount: true,
      photos:        { select: { id: true, url: true, phase: true, createdAt: true }, orderBy: { createdAt: "asc" } },
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

          {/* ─── Progress bar ─── */}
          <BookingProgressBar
            status={booking.status as Parameters<typeof BookingProgressBar>[0]["status"]}
            paymentStatus={booking.paymentStatus}
          />

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

          {/* ── Pagamento ── */}
          {/* Banner de retorno do Stripe */}
          {payment === "success" && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 p-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 text-success" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <div>
                <p className="font-semibold text-success text-sm">Pagamento confirmado!</p>
                <p className="text-xs text-success/80">O locador foi notificado. Combine a entrega do item.</p>
              </div>
            </div>
          )}
          {payment === "cancelled" && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-yellow-300 bg-yellow-50 p-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 text-yellow-600" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-sm text-yellow-700">Pagamento não finalizado. Clique em <strong>Pagar agora</strong> quando estiver pronto.</p>
            </div>
          )}

          {/* Bloco de pagamento — só para o locatário em reserva CONFIRMED */}
          {isBorrower && booking.status === "CONFIRMED" && (
            <div className="mb-6 rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-3 font-semibold text-foreground">Pagamento</h2>

              {booking.paymentStatus === "PAID" ? (
                <div className="flex items-center gap-3 rounded-lg bg-success/10 p-3 text-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 text-success" aria-hidden="true">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <div>
                    <p className="font-semibold text-success">Pago com sucesso</p>
                    {booking.paidAt && (
                      <p className="text-xs text-success/80">
                        {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(booking.paidAt))}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Sua reserva foi confirmada! Faça o pagamento para o locador combinar a entrega do item.
                  </p>
                  <div className="mb-3 flex items-center justify-between rounded-lg bg-background px-4 py-3 text-sm">
                    <span className="text-muted-foreground">Valor a pagar</span>
                    <span className="font-bold text-foreground">{fmt(booking.totalPrice)}</span>
                  </div>
                  <PayButton bookingId={booking.id} />
                </>
              )}
            </div>
          )}

          {/* Status de pagamento para o locador */}
          {isOwner && booking.status === "CONFIRMED" && (
            <div className={`mb-6 flex items-center gap-3 rounded-xl border p-4 text-sm ${
              booking.paymentStatus === "PAID"
                ? "border-success/30 bg-success/10"
                : "border-yellow-300 bg-yellow-50"
            }`}>
              {booking.paymentStatus === "PAID" ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 text-success" aria-hidden="true">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <p className="text-success">
                    <span className="font-semibold">Pagamento recebido.</span>{" "}
                    Combine a entrega com o locatário e marque como Ativo quando entregar.
                  </p>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 text-yellow-600" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p className="text-yellow-700">Aguardando pagamento do locatário.</p>
                </>
              )}
            </div>
          )}

          {/* ── P2-47 — Countdown de devolução ── */}
          {booking.status === "ACTIVE" && (
            <div className="mb-6">
              <ReturnCountdown endDateIso={booking.endDate.toISOString()} />
            </div>
          )}

          {/* ── Contrato digital ── */}
          {isBorrower && (booking.status === "CONFIRMED" || booking.status === "ACTIVE") && (
            <ContractBanner
              bookingId={booking.id}
              itemTitle={booking.item.title}
              ownerName={booking.owner.name}
              startDate={booking.startDate.toISOString()}
              endDate={booking.endDate.toISOString()}
              totalPrice={booking.totalPrice}
              depositAmount={booking.depositAmount ?? null}
              contractSigned={!!booking.contractSignedAt}
            />
          )}

          {/* ── Fotos de check-in / check-out ── */}
          {(booking.status === "ACTIVE" || booking.status === "RETURNED" || booking.status === "COMPLETED") && (
            <div className="mb-6 rounded-xl border border-border bg-surface p-5 space-y-4">
              <h2 className="font-semibold text-foreground">Fotos do item</h2>
              <CheckInOut
                bookingId={booking.id}
                phase="CHECKIN"
                label="Retirada"
                existingPhotos={booking.photos.filter((p) => p.phase === "CHECKIN").map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))}
                canUpload={isOwner && booking.status === "ACTIVE"}
              />
              <div className="h-px bg-border" />
              <CheckInOut
                bookingId={booking.id}
                phase="CHECKOUT"
                label="Devolução"
                existingPhotos={booking.photos.filter((p) => p.phase === "CHECKOUT").map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))}
                canUpload={isOwner && (booking.status === "RETURNED" || booking.status === "COMPLETED")}
              />
            </div>
          )}

          {/* ── Taxa de atraso ── */}
          {booking.lateFeeAmount != null && booking.lateFeeAmount > 0 && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-4">
              <span className="text-xl" aria-hidden="true">⏱</span>
              <div>
                <p className="text-sm font-semibold text-red-800">Taxa de atraso aplicada</p>
                <p className="text-xs text-red-700">
                  Item devolvido após o prazo. Taxa adicional:{" "}
                  <strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(booking.lateFeeAmount / 100)}</strong>
                </p>
              </div>
            </div>
          )}

          {/* ── P2-49 — Checklist de devolução (borrower em ACTIVE) ── */}
          {isBorrower && booking.status === "ACTIVE" && (
            <div className="mb-6">
              <ReturnChecklist bookingId={booking.id} />
            </div>
          )}

          {/* ── P2-50 — Confirmação de estado pelo proprietário (owner em RETURNED) ── */}
          {isOwner && booking.status === "RETURNED" && (
            <div className="mb-6">
              <ReturnConditionForm bookingId={booking.id} />
            </div>
          )}

          {/* Ações — hideReturnActions=true quando ReturnChecklist/ReturnConditionForm já exibe o botão */}
          <BookingActions
            bookingId={booking.id}
            status={booking.status}
            isOwner={isOwner}
            isBorrower={isBorrower}
            conversationId={booking.conversation?.id}
            hideReturnActions={
              (isBorrower && booking.status === "ACTIVE") ||
              (isOwner    && booking.status === "RETURNED")
            }
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
