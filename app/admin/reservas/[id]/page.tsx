import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPlatformFeeRate, calcSplit } from "@/lib/platform-config"

export const metadata: Metadata = { title: "Admin — Detalhe da reserva" }

type Props = { params: Promise<{ id: string }> }

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }).format(new Date(d))

const fmtDateTime = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(d))

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:   { label: "Aguardando resposta", color: "bg-amber-100 text-amber-800" },
  CONFIRMED: { label: "Confirmada",          color: "bg-blue-medium/10 text-blue-medium" },
  ACTIVE:    { label: "Em andamento",        color: "bg-brand/10 text-brand" },
  RETURNED:  { label: "Devolução em andamento", color: "bg-purple-100 text-purple-700" },
  COMPLETED: { label: "Concluída",           color: "bg-success/10 text-success" },
  CANCELLED: { label: "Cancelada",           color: "bg-destructive/10 text-destructive" },
  DISPUTED:  { label: "Em disputa",          color: "bg-orange-light text-orange-link" },
}

/**
 * Visão SOMENTE LEITURA do detalhe de uma reserva, para o admin.
 *
 * A página de usuário (/reservas/[id]) faz notFound() para quem não é o
 * locatário nem o proprietário (linha 140) — o admin nunca é nenhum dos dois,
 * então sempre tomava 404 ao clicar em "Ver reserva" no Financeiro/Disputas.
 * Aqui o admin é OBSERVADOR: sem ações (pagar/avaliar/check-in), sem mutação.
 */
export default async function AdminReservaPage({ params }: Props) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard")

  const { id } = await params

  const booking = await prisma.booking.findUnique({
    where:  { id },
    select: {
      id:                true,
      status:            true,
      paymentStatus:     true,
      paidAt:            true,
      startDate:         true,
      endDate:           true,
      totalDays:         true,
      dailyPrice:        true,
      totalPrice:        true,
      discountCents:     true,
      depositAmount:     true,
      lateFeeAmount:     true,
      platformFeeAmount: true,
      ownerNetAmount:    true,
      borrowerNote:      true,
      ownerNote:         true,
      cancelReason:      true,
      cancelledAt:       true,
      createdAt:         true,
      contractSignedAt:  true,
      activatedAt:       true,
      returnedAt:        true,
      item:         { select: { id: true, title: true, city: true, state: true } },
      borrower:     { select: { id: true, name: true, email: true } },
      owner:        { select: { id: true, name: true, email: true } },
      conversation: { select: { id: true } },
    },
  })

  if (!booking) notFound()

  const statusInfo = STATUS_LABEL[booking.status] ?? { label: booking.status, color: "bg-muted text-foreground" }

  // Split: prioriza os valores PERSISTIDOS (capturados no checkout); se ausentes
  // (reserva sem pagamento ainda), recalcula com calcSplit como a tela do usuário.
  const discountCents = booking.discountCents ?? 0
  const feeRateBps    = await getPlatformFeeRate()
  const gross         = calcSplit(booking.totalPrice + discountCents, feeRateBps)
  const platformFee   = booking.platformFeeAmount ?? Math.max(0, gross.platformFeeAmount - discountCents)
  const ownerNet      = booking.ownerNetAmount ?? gross.ownerNetAmount

  const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold text-foreground" : "text-foreground"}>{value}</span>
    </div>
  )

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/financeiro" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Financeiro
          </Link>
          <h1 className="mt-1 text-xl font-bold text-primary">{booking.item.title}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {booking.item.city && booking.item.state ? `${booking.item.city} — ${booking.item.state} · ` : ""}
            Criada em {fmtDateTime(booking.createdAt)}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Partes */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Partes</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Locatário</p>
              <p className="font-medium text-foreground">{booking.borrower.name}</p>
              <p className="text-xs text-muted-foreground break-all">{booking.borrower.email}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Proprietário</p>
              <p className="font-medium text-foreground">{booking.owner.name}</p>
              <p className="text-xs text-muted-foreground break-all">{booking.owner.email}</p>
            </div>
          </div>
          {booking.conversation && (
            <Link
              href={`/admin/disputas/${booking.conversation.id}`}
              className="mt-3 inline-block text-xs text-brand hover:underline"
            >
              Ver conversa →
            </Link>
          )}
        </div>

        {/* Período */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Período</p>
          <Row label="Retirada"  value={fmtDate(booking.startDate)} />
          <Row label="Devolução" value={fmtDate(booking.endDate)} />
          <Row label="Diárias"   value={`${booking.totalDays} × ${fmt(booking.dailyPrice)}`} />
          {booking.activatedAt && <Row label="Ativada em"   value={fmtDateTime(booking.activatedAt)} />}
          {booking.returnedAt  && <Row label="Devolvida em" value={fmtDateTime(booking.returnedAt)} />}
          {booking.contractSignedAt && <Row label="Contrato aceito" value={fmtDateTime(booking.contractSignedAt)} />}
        </div>

        {/* Financeiro */}
        <div className="rounded-xl border border-border bg-surface p-5 md:col-span-2">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Financeiro</p>
          <Row label="Total da locação" value={fmt(booking.totalPrice)} strong />
          {discountCents > 0 && <Row label="Cupom/desconto" value={`− ${fmt(discountCents)}`} />}
          <Row label={`Taxa ShareO (${feeRateBps / 100}%, retida do repasse)`} value={`− ${fmt(platformFee)}`} />
          <Row label="Repasse ao proprietário" value={fmt(ownerNet)} strong />
          {booking.lateFeeAmount ? <Row label="Multa por atraso" value={fmt(booking.lateFeeAmount)} /> : null}
          {booking.depositAmount ? <Row label="Caução" value={fmt(booking.depositAmount)} /> : null}
          <div className="mt-2 border-t border-border pt-2">
            <Row label="Status do pagamento" value={booking.paymentStatus} />
            {booking.paidAt && <Row label="Pago em" value={fmtDateTime(booking.paidAt)} />}
          </div>
        </div>

        {/* Observações / disputa */}
        {(booking.borrowerNote || booking.ownerNote || booking.cancelReason) && (
          <div className="rounded-xl border border-border bg-surface p-5 md:col-span-2 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Observações</p>
            {booking.borrowerNote && (
              <p className="text-sm text-foreground"><span className="font-semibold">Locatário: </span>{booking.borrowerNote}</p>
            )}
            {booking.ownerNote && (
              <p className="text-sm text-foreground"><span className="font-semibold">Proprietário: </span>{booking.ownerNote}</p>
            )}
            {booking.cancelReason && (
              <div className="rounded-lg bg-orange-light p-2.5 text-xs text-orange-link">
                <span className="font-semibold">Motivo do cancelamento/disputa: </span>{booking.cancelReason}
                {booking.cancelledAt && <span className="text-orange-link/70"> · {fmtDateTime(booking.cancelledAt)}</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
