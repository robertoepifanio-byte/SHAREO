import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { BookingProgressBar } from "@/components/booking/BookingProgressBar"
import { TrackEvent } from "@/components/analytics/TrackEvent"

export const metadata: Metadata = { title: "Reserva confirmada! — ShareO" }

type Props = { searchParams: Promise<{ bookingId?: string }> }

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day:   "2-digit",
    month: "long",
    year:  "numeric",
  }).format(new Date(d))
}

export default async function BookingSuccessPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const { bookingId } = await searchParams
  if (!bookingId) notFound()

  const booking = await prisma.booking.findUnique({
    where:  { id: bookingId },
    select: {
      id:            true,
      status:        true,
      paymentStatus: true,
      startDate:     true,
      endDate:       true,
      totalDays:     true,
      totalPrice:    true,
      paidAt:        true,
      createdAt:     true,
      item: {
        select: {
          id:     true,
          title:  true,
          city:   true,
          images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
        },
      },
      owner:    { select: { id: true, name: true } },
      borrower: { select: { id: true, name: true } },
      conversation: { select: { id: true } },
    },
  })

  if (!booking) notFound()

  // Só quem fez a reserva pode ver esta página
  const userId = session.user.id
  if (booking.borrower.id !== userId) notFound()

  const img = booking.item.images[0]?.url

  // P1-25 — código da reserva: #SHR-{ANO}-{MMDD}-{3 chars do ID}
  const createdDate = new Date(booking.createdAt)
  const year        = createdDate.getFullYear()
  const mm          = String(createdDate.getMonth() + 1).padStart(2, "0")
  const dd          = String(createdDate.getDate()).padStart(2, "0")
  const shortId     = booking.id.slice(-3).toUpperCase()
  const bookingCode = `#SHR-${year}-${mm}${dd}-${shortId}`

  return (
    <div className="min-h-screen bg-background">
      <TrackEvent event={{ name: "booking_completed", params: { booking_id: booking.id, value: booking.totalPrice / 100 } }} />
      <AppHeader />

      <main className="container py-10">
        <div className="mx-auto max-w-lg">

          {/* Ícone de sucesso */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand/10">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#007B3C" strokeWidth="2" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-primary">Reserva confirmada!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Seu pagamento foi processado com sucesso. O proprietário foi notificado e entrará em contato para combinar a retirada.
            </p>
          </div>

          {/* P1-25 — Código da reserva */}
          <div className="mb-6 rounded-xl border border-brand/20 bg-brand/5 px-5 py-4 text-center">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-brand">
              Código da reserva
            </p>
            <p className="font-mono text-2xl font-extrabold tracking-wider text-primary">
              {bookingCode}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Guarde este código para referência em caso de dúvidas com o suporte.
            </p>
          </div>

          {/* P1-25 — Próximos passos */}
          <div className="mb-6 rounded-xl border border-border bg-surface p-5">
            <p className="mb-3 text-sm font-bold text-foreground">Próximos passos</p>
            <ol className="space-y-3" aria-label="Próximos passos para sua locação">
              <li className="flex items-start gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white" aria-hidden="true">1</span>
                <span className="text-muted-foreground">
                  <strong className="text-foreground">Aguarde a confirmação</strong> — o proprietário tem até 2h para aceitar sua solicitação.
                </span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white" aria-hidden="true">2</span>
                <span className="text-muted-foreground">
                  <strong className="text-foreground">Combine a retirada</strong> — use o chat para acertar o local e horário de entrega com o proprietário.
                </span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white" aria-hidden="true">3</span>
                <span className="text-muted-foreground">
                  <strong className="text-foreground">Aproveite e avalie</strong> — após devolver o item, deixe uma avaliação e ajude a comunidade ShareO.
                </span>
              </li>
            </ol>
          </div>

          {/* Progress bar */}
          <BookingProgressBar
            status={booking.status as Parameters<typeof BookingProgressBar>[0]["status"]}
            paymentStatus={booking.paymentStatus}
          />

          {/* Resumo da reserva */}
          <div className="mb-6 overflow-hidden rounded-xl border border-border bg-surface">
            {img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt={booking.item.title} className="h-40 w-full object-cover" />
            )}
            <div className="p-5">
              <h2 className="mb-4 font-bold text-primary">{booking.item.title}</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Proprietário</span>
                  <span className="font-medium">{booking.owner.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Retirada</span>
                  <span className="font-medium">{fmtDate(booking.startDate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Devolução</span>
                  <span className="font-medium">{fmtDate(booking.endDate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duração</span>
                  <span className="font-medium">{booking.totalDays} dia{booking.totalDays !== 1 ? "s" : ""}</span>
                </div>
                <div className="my-2 h-px bg-border" />
                <div className="flex justify-between font-bold">
                  <span>Total pago</span>
                  <span className="text-brand">{fmt(booking.totalPrice)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Segurança */}
          <div className="mb-6 rounded-xl border border-brand/20 bg-brand/5 p-4">
            <p className="mb-2 text-xs font-bold text-brand">🔒 Sua locação está protegida</p>
            <ul className="space-y-1.5 text-xs text-foreground">
              {[
                "O valor é repassado ao proprietário via PIX 3 dias após a devolução confirmada",
                "Cancelamento gratuito até 24h antes da data de retirada",
                "Suporte ShareO disponível 7 dias por semana",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#007B3C" strokeWidth="2.5" className="mt-0.5 shrink-0" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <Link
              href={`/reservas/${booking.id}`}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-brand text-sm font-bold text-white hover:opacity-90 transition-opacity"
            >
              Ver minha reserva →
            </Link>

            {booking.conversation?.id && (
              <Link
                href={`/mensagens/${booking.conversation.id}`}
                className="flex h-12 w-full items-center justify-center rounded-xl border border-border bg-surface text-sm font-semibold text-foreground hover:bg-background transition-colors"
              >
                💬 Enviar mensagem ao proprietário
              </Link>
            )}

            <Link
              href="/itens"
              className="flex h-12 w-full items-center justify-center rounded-xl border border-border bg-surface text-sm font-semibold text-muted-foreground hover:bg-background transition-colors"
            >
              Explorar mais itens
            </Link>
          </div>

        </div>
      </main>
    </div>
  )
}
