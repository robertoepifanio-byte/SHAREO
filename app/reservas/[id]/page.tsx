import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
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
import { getPlatformFeeRate } from "@/lib/platform-config"

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

function fmtOwnerAddress(owner: {
  cep?: string | null; street?: string | null
  neighborhood?: string | null; city?: string | null; state?: string | null
}) {
  const parts: string[] = []
  if (owner.street)       parts.push(owner.street)
  if (owner.neighborhood) parts.push(owner.neighborhood)
  if (owner.city && owner.state) parts.push(`${owner.city} — ${owner.state}`)
  else if (owner.city)   parts.push(owner.city)
  if (owner.cep)         parts.push(`CEP ${owner.cep.replace(/(\d{5})(\d{3})/, "$1-$2")}`)
  return parts.length ? parts.join(", ") : null
}

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(d))
}

function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Fortaleza",
  }).format(new Date(d))
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
      activatedAt:   true,
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
      extensionStatus:           true,
      extensionRequestedEndDate: true,
      pickupToken:       true,
      pickupTokenUsedAt: true,
      borrower:     { select: { id: true, name: true } },
      owner:        {
        select: {
          id: true, name: true,
          cep: true, street: true, neighborhood: true, city: true, state: true,
        },
      },
      conversation: { select: { id: true } },
      reviews: {
        where:  { reviewerId: userId },
        select: { reviewType: true, rating: true, comment: true },
      },
    },
  })

  if (!booking) notFound()

  const feeRateBps = await getPlatformFeeRate()
  const feeRatePct = feeRateBps / 100

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
              <div className="relative h-48 w-full">
                <Image src={img} alt={booking.item.title} fill sizes="(max-width: 768px) 100vw, 640px" className="object-cover" />
              </div>
            )}
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Retirada</p>
                  <p className="font-semibold text-foreground">
                    {booking.activatedAt ? fmtDateTime(booking.activatedAt) : fmtDate(booking.startDate)}
                  </p>
                  {booking.activatedAt && (
                    <p className="text-[10px] text-success">✓ Confirmada pelo locador</p>
                  )}
                </div>
                <div>
                  <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Devolução até</p>
                  <p className="font-semibold text-foreground">
                    {booking.activatedAt ? fmtDateTime(booking.endDate) : fmtDate(booking.endDate)}
                  </p>
                  {booking.activatedAt && (
                    <p className="text-[10px] text-muted-foreground">Mesmo horário da retirada</p>
                  )}
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
                  <span>Taxa Shareo ({feeRatePct % 1 === 0 ? feeRatePct.toFixed(0) : feeRatePct}%)</span>
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
                <p className="text-xs text-success/80">O locador foi notificado. Apresente o código abaixo na retirada.</p>
              </div>
            </div>
          )}

          {/* ── Token de retirada — exibido ao locatário enquanto não foi usado ── */}
          {isBorrower && booking.pickupToken && !booking.pickupTokenUsedAt && (
            <div className="mb-6 rounded-xl border-2 border-brand/40 bg-brand/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <p className="font-semibold text-brand text-sm">Código de retirada</p>
              </div>

              <p className="mb-1 text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Apresente este código ao proprietário na retirada
              </p>
              <div className="my-3 flex justify-center">
                <span className="rounded-xl bg-white border-2 border-brand/30 px-8 py-4 text-4xl font-extrabold tracking-[0.35em] text-primary shadow-sm select-all">
                  {booking.pickupToken}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                O proprietário digitará este código no app para confirmar a entrega. Guarde-o.
              </p>

              {/* Endereço de retirada */}
              {(() => {
                const addr = fmtOwnerAddress(booking.owner)
                return addr ? (
                  <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
                    <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      Local de retirada (endereço cadastrado do proprietário)
                    </p>
                    <p className="text-sm font-medium text-amber-900">{addr}</p>
                    <p className="mt-1 text-[10px] text-amber-700">
                      Por segurança, a retirada deve ocorrer exclusivamente neste endereço. Não aceite outro local.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
                    <p className="text-xs text-amber-800">
                      O proprietário ainda não cadastrou endereço. Entre em contato pelo chat para combinar o local de retirada.
                    </p>
                  </div>
                )
              })()}
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
                  <PayButton bookingId={booking.id} totalPrice={booking.totalPrice} />
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
            extensionStatus={booking.extensionStatus ?? null}
            extensionRequestedEndDate={booking.extensionRequestedEndDate?.toISOString() ?? null}
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
