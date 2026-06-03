import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { ItemCard } from "@/components/items/ItemCard"
import { CountdownTimer } from "@/components/booking/CountdownTimer"
import { BookingStatusPoller } from "@/components/booking/BookingStatusPoller"

export const metadata: Metadata = { title: "Aguardando confirmação — ShareO" }

type Props = { params: Promise<{ id: string }> }

// P1-25 helper — mesma lógica da página de sucesso
function buildBookingCode(bookingId: string, createdAt: Date): string {
  const year    = createdAt.getFullYear()
  const mm      = String(createdAt.getMonth() + 1).padStart(2, "0")
  const dd      = String(createdAt.getDate()).padStart(2, "0")
  const shortId = bookingId.slice(-3).toUpperCase()
  return `#SHR-${year}-${mm}${dd}-${shortId}`
}

export default async function AguardandoConfirmacaoPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/reservas")

  const { id } = await params
  const userId  = session.user.id

  const booking = await prisma.booking.findUnique({
    where:  { id },
    select: {
      id:         true,
      status:     true,
      createdAt:  true,
      item: {
        select: {
          id:         true,
          categoryId: true,
          city:       true,
        },
      },
      borrower: { select: { id: true } },
    },
  })

  if (!booking) notFound()
  // Só o locatário vê esta página
  if (booking.borrower.id !== userId) notFound()

  // Se a reserva já saiu do estado PENDING, redireciona para a página de detalhe
  if (booking.status !== "PENDING") {
    redirect(`/reservas/${id}`)
  }

  // Deadline = createdAt + 2h
  const deadline = new Date(booking.createdAt.getTime() + 2 * 60 * 60 * 1000)
  const bookingCode = buildBookingCode(booking.id, booking.createdAt)

  // P1-34 — itens similares (Server Component)
  const similarItems = await prisma.item.findMany({
    where: {
      categoryId: booking.item.categoryId,
      city:       booking.item.city,
      deletedAt:  null,
      status:     "AVAILABLE",
      isApproved: true,
      id:         { not: booking.item.id },
      owner:      { deletedAt: null },
    },
    select: {
      id: true, title: true, pricePerDay: true, condition: true,
      city: true, state: true, neighborhood: true, status: true,
      images:   { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
      category: { select: { name: true } },
      owner:    { select: { name: true, isVerified: true } },
      _count:   { select: { reviews: true, favorites: true } },
    },
    orderBy: { viewCount: "desc" },
    take: 4,
  })

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="border-b border-border bg-surface">
        <div className="container py-3">
          <Link
            href="/reservas"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Minhas Reservas
          </Link>
        </div>
      </div>

      <main className="container py-10">
        <div className="mx-auto max-w-lg">

          {/* Ícone de aguardando */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CA8A04" strokeWidth="1.5" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-primary">Aguardando confirmação</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sua solicitação foi enviada ao proprietário. Assim que ele responder, você receberá uma notificação.
            </p>
          </div>

          {/* Código da reserva */}
          <div className="mb-6 rounded-xl border border-brand/20 bg-brand/5 px-5 py-4 text-center">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-brand">
              Código da reserva
            </p>
            <p className="font-mono text-2xl font-extrabold tracking-wider text-primary">
              {bookingCode}
            </p>
          </div>

          {/* P1-34 — Countdown */}
          <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-4">
            <p className="mb-3 text-center text-sm font-semibold text-yellow-800">
              O proprietário tem 2h para responder
            </p>
            <CountdownTimer deadlineIso={deadline.toISOString()} />
            <p className="mt-3 text-center text-xs text-yellow-700">
              Se não houver resposta dentro do prazo, a reserva será cancelada automaticamente e você não será cobrado.
            </p>
          </div>

          {/* P1-34 — Polling: redireciona ao mudar de PENDING */}
          <BookingStatusPoller bookingId={booking.id} intervalMs={30_000} />

          {/* CTA ver reserva */}
          <Link
            href={`/reservas/${booking.id}`}
            className="mb-8 flex h-12 w-full items-center justify-center rounded-xl border border-border bg-surface text-sm font-semibold text-foreground hover:bg-background transition-colors"
          >
            Ver detalhes da reserva
          </Link>

        </div>

        {/* P1-34 — Itens similares */}
        {similarItems.length > 0 && (
          <section className="mx-auto max-w-3xl border-t border-border pt-10" aria-labelledby="similar-heading-aguardando">
            <h2 id="similar-heading-aguardando" className="mb-6 text-lg font-bold text-primary text-center">
              Enquanto espera, que tal explorar?
            </h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {similarItems.map((si) => (
                <ItemCard key={si.id} item={si} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
