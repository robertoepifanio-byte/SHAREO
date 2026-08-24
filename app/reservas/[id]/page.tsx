import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formatPickupAddress, hasPickupAddress } from "@/lib/ownerAddress"
import { AppHeader } from "@/components/layout/AppHeader"
import { BookingActions }      from "./_BookingActions"
import { ReviewForm }          from "./_ReviewForm"
import { PayButton }           from "@/components/bookings/PayButton"
import { ContractBanner }      from "./_ContractBanner"
import { CheckInOut }          from "./_CheckInOut"
import { BookingProgressBar }  from "@/components/booking/BookingProgressBar"
import { BookingHistory }     from "@/components/booking/BookingHistory"
import { ReturnCountdown }    from "@/components/booking/ReturnCountdown"
import { ReturnChecklist }    from "@/components/booking/ReturnChecklist"
import { ReturnConditionForm } from "@/components/booking/ReturnConditionForm"
import { getPlatformFeeRate, calcSplit } from "@/lib/platform-config"
import { deriveBookingHistory } from "@/lib/bookingHistory"
import { BookingStatusBadge } from "@/components/ui/BookingStatusBadge"
import { formatPrice, formatDate, formatDateLong } from "@/utils/format"

// Data+hora no fuso do Brasil (BRT) e por extenso — o servidor roda em UTC,
// então o timeZone explícito é obrigatório para não exibir a hora 3h adiantada.
const fmtDateTimeBR = (d: Date | string) =>
  formatDate(d, {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Fortaleza",
  })

type Props = {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ payment?: string }>
}

export const metadata: Metadata = { title: "Detalhe da Reserva" }



export default async function BookingDetailPage({ params, searchParams }: Props) {
  const { id }      = await params
  const { payment } = await searchParams

  const session = await auth()
  // Preserva a reserva no callbackUrl: ao voltar do login o usuário cai NA reserva
  // que clicou (ex.: link "Ver reserva" do e-mail de lembrete), não na lista.
  // /reservas não está em PROTECTED_PREFIXES do middleware, então este é o guard real.
  if (!session) redirect(`/login?callbackUrl=/reservas/${id}`)

  const userId       = session.user.id

  const booking = await prisma.booking.findUnique({
    where:  { id },
    select: {
      id:            true,
      status:        true,
      paymentStatus: true,
      startDate:     true,
      endDate:       true,
      totalDays:     true,
      dailyPrice:    true,
      totalPrice:    true,
      discountCents: true,
      depositAmount: true,
      borrowerNote:  true,
      ownerNote:     true,
      // timestamps de histórico
      createdAt:            true,
      respondedAt:          true,
      paidAt:               true,
      contractSignedAt:     true,
      activatedAt:          true,
      returnRequestedAt:    true,
      returnedAt:           true,
      cancelledAt:          true,
      cancelReason:         true,
      extensionRequestedAt: true,
      extensionRespondedAt: true,
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
      // Story B — itens da locação (>1 quando é locação multi-item do mesmo dono)
      bookingItems: {
        select: {
          itemId:     true,
          totalPrice: true,
          item: { select: { title: true, images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 } } },
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
  const feeRateLabel = feeRatePct % 1 === 0 ? feeRatePct.toFixed(0) : String(feeRatePct)

  // Split da plataforma — espelha exatamente o checkout (lib/platform-config.calcSplit):
  // o locatário paga booking.totalPrice; a taxa é RETIDA do repasse ao proprietário
  // (não somada). platformFee + ownerNet = totalPrice. Cupom é absorvido pela taxa.
  const discountCents = booking.discountCents ?? 0
  const grossSplit    = calcSplit(booking.totalPrice + discountCents, feeRateBps)
  const platformFee   = Math.max(0, grossSplit.platformFeeAmount - discountCents)
  const ownerNet      = grossSplit.ownerNetAmount

  const isOwner    = booking.owner.id    === userId
  const isBorrower = booking.borrower.id === userId
  if (!isOwner && !isBorrower) notFound()

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

          {/* ─── Histórico de eventos ─── */}
          {(() => {
            const historyEvents = deriveBookingHistory({
              createdAt:            booking.createdAt,
              respondedAt:          booking.respondedAt,
              paidAt:               booking.paidAt,
              activatedAt:          booking.activatedAt,
              returnRequestedAt:    booking.returnRequestedAt,
              returnedAt:           booking.returnedAt,
              cancelledAt:          booking.cancelledAt,
              cancelReason:         booking.cancelReason,
              extensionRequestedAt: booking.extensionRequestedAt,
              extensionRespondedAt: booking.extensionRespondedAt,
              extensionStatus:      booking.extensionStatus ?? null,
              status:               booking.status,
              borrower:             { name: booking.borrower.name },
              owner:                { name: booking.owner.name },
            })
            // Serializa Date → ISO string para passar ao Client Component
            const serialized = historyEvents.map((e) => ({
              ...e,
              at: e.at.toISOString(),
            }))
            return <BookingHistory events={serialized} />
          })()}

          {/* Header do booking */}
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-primary">
                {booking.item.title}
                {booking.bookingItems.length > 1 && (
                  <span className="text-base font-semibold text-muted-foreground"> + {booking.bookingItems.length - 1} {booking.bookingItems.length - 1 === 1 ? "item" : "itens"}</span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isOwner ? "Locatário" : "Proprietário"}:{" "}
                <span className="font-medium text-foreground">{counterpart.name}</span>
              </p>
            </div>
            <BookingStatusBadge status={booking.status} size="md" />
          </div>

          {/* Story B — itens desta locação (só quando há mais de um) */}
          {booking.bookingItems.length > 1 && (
            <div className="mb-6 rounded-xl border border-border bg-surface p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Itens desta locação ({booking.bookingItems.length})
              </p>
              <ul className="divide-y divide-border">
                {booking.bookingItems.map((bi) => (
                  <li key={bi.itemId} className="flex items-center gap-3 py-2">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                      {bi.item.images[0]?.url && (
                        <Image src={bi.item.images[0].url} alt={bi.item.title} fill sizes="40px" className="object-cover" />
                      )}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{bi.item.title}</span>
                    <span className="shrink-0 text-sm font-medium text-muted-foreground">{formatPrice(bi.totalPrice)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

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
                    {booking.activatedAt ? fmtDateTimeBR(booking.activatedAt) : formatDateLong(booking.startDate)}
                  </p>
                  {booking.activatedAt && (
                    <p className="text-[10px] text-success">✓ Confirmada pelo locador</p>
                  )}
                </div>
                <div>
                  <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Devolução até</p>
                  <p className="font-semibold text-foreground">
                    {booking.activatedAt ? fmtDateTimeBR(booking.endDate) : formatDateLong(booking.endDate)}
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
                  <span>{booking.totalDays} dia{booking.totalDays !== 1 ? "s" : ""} × {formatPrice(booking.dailyPrice)}</span>
                  <span>{formatPrice(booking.dailyPrice * booking.totalDays)}</span>
                </div>
                {discountCents > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Desconto (cupom)</span>
                    <span>− {formatPrice(discountCents)}</span>
                  </div>
                )}
                <div className="my-1 h-px bg-border" />
                <div className="flex justify-between font-bold text-foreground">
                  <span>Total da locação</span>
                  <span>{formatPrice(booking.totalPrice)}</span>
                </div>
                {booking.depositAmount && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Caução (reembolsável)</span>
                    <span>{formatPrice(booking.depositAmount)}</span>
                  </div>
                )}

                {/* Repartição — a taxa é retida do repasse ao proprietário, não somada ao locatário */}
                <div className="mt-3 space-y-1.5 rounded-lg bg-background p-3">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxa Shareo ({feeRateLabel}%)</span>
                    <span className="text-destructive">− {formatPrice(platformFee)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-foreground">
                    <span>{isOwner ? "Você recebe" : "Proprietário recebe"}</span>
                    <span className="text-brand">{formatPrice(ownerNet)}</span>
                  </div>
                </div>
              </div>

              {/* Notas */}
              {booking.borrowerNote && (
                <div className="mt-4 rounded-lg bg-background p-3 text-sm">
                  <p className="mb-1 font-semibold text-foreground">Mensagem do locatário:</p>
                  <p className="text-muted-foreground">{booking.borrowerNote}</p>
                </div>
              )}

              {/* 🪤 `cancelReason` guarda DOIS motivos distintos: o de cancelamento
                  e o da disputa (o #343 passou a gravar o da disputa no mesmo campo,
                  como a rota /dispute já fazia). Rotular sempre como "cancelamento"
                  fazia a tela dizer "Motivo do cancelamento" numa reserva marcada
                  "Em disputa". O painel do admin já distinguia; esta tela não. */}
              {booking.cancelReason && (
                <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm">
                  <p className="mb-1 font-semibold text-red-700">
                    {booking.status === "DISPUTED" ? "Motivo da disputa:" : "Motivo do cancelamento:"}
                  </p>
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

          {/* ── Endereço pendente — só o proprietário vê, e só quando a locação existe ──
              Regra dos fundadores (22/08/2026): endereço completo não é exigência de
              cadastro, vira exigência quando há locação. Este aviso é o par visível
              do guard em `confirm` — o proprietário descobre aqui, não no erro. */}
          {isOwner && !hasPickupAddress(booking.owner) && ["PENDING", "CONFIRMED"].includes(booking.status) && (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                Cadastre seu endereço para a retirada
              </p>
              <p className="mt-1 text-xs text-amber-800">
                O locatário precisa saber onde buscar o item. Sem a rua cadastrada,
                ele vê apenas a orientação de combinar o local pelo chat.
              </p>
              <Link
                href="/perfil/endereco"
                className="mt-2 inline-block text-sm font-medium text-amber-900 underline hover:no-underline"
              >
                Cadastrar endereço →
              </Link>
            </div>
          )}

          {/* ── Token de retirada — só após o pagamento confirmado, e enquanto não foi usado ── */}
          {isBorrower && booking.paymentStatus === "PAID" && booking.pickupToken && !booking.pickupTokenUsedAt && (
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
                <span className="rounded-xl bg-surface border-2 border-brand/30 px-8 py-4 text-4xl font-extrabold tracking-[0.35em] text-primary shadow-sm select-all">
                  {booking.pickupToken}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                O proprietário digitará este código no app para confirmar a entrega. Guarde-o.
              </p>

              {/* Endereço de retirada */}
              {(() => {
                const addr = formatPickupAddress(booking.owner)
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
                        {formatDate(booking.paidAt, { dateStyle: "short", timeStyle: "short" })}
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
                    <span className="font-bold text-foreground">{formatPrice(booking.totalPrice)}</span>
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
                  <p className="text-yellow-700">
                    Aguardando pagamento do locatário.
                  </p>
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
                  <strong>{formatPrice(booking.lateFeeAmount)}</strong>
                </p>
              </div>
            </div>
          )}

          {/* ── Locador aguardando o locatário devolver (owner em ACTIVE) ── */}
          {isOwner && booking.status === "ACTIVE" && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-medium/30 bg-blue-medium/5 px-4 py-4">
              <span className="text-xl" aria-hidden="true">⏳</span>
              <div>
                <p className="text-sm font-semibold text-foreground">Aguardando a devolução</p>
                <p className="text-xs text-muted-foreground">
                  O locatário ainda está com o item. Quando ele iniciar a devolução, a reserva ficará como
                  <strong> Devolução em andamento</strong> e você poderá confirmar o recebimento aqui.
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

          {/* ── Locatário aguardando o locador confirmar (borrower em "Devolução em andamento") ── */}
          {isBorrower && booking.status === "RETURNED" && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50 px-4 py-4">
              <span className="text-xl" aria-hidden="true">🔄</span>
              <div>
                <p className="text-sm font-semibold text-foreground">Devolução em andamento</p>
                <p className="text-xs text-muted-foreground">
                  Você iniciou a devolução. Aguardando o locador confirmar o recebimento do item para concluir a locação.
                </p>
              </div>
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
            endDate={booking.endDate.toISOString()}
            hideReturnActions={
              (isBorrower && booking.status === "ACTIVE") ||
              (isOwner    && booking.status === "RETURNED")
            }
          />

          {/* Avaliações — disponíveis após devolução */}
          {(booking.status === "RETURNED" || booking.status === "COMPLETED") && (
            <div id="avaliar" className="mt-6 space-y-4 scroll-mt-24">
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
