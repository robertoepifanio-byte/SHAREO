import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import Image from "next/image"
import { SuggestCard } from "@/components/dashboard/SuggestCard"
import { MonthlyGoalProgress } from "@/components/dashboard/MonthlyGoalProgress"
import { UpcomingReturns } from "@/components/dashboard/UpcomingReturns"

export const metadata: Metadata = { title: "Dashboard" }

const fmtCurrency = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

/** Formato de data seguro para SSR: DD/MM/AAAA — sem depender do ICU do Node.js */
function fmtDateSafe(d: Date | string): string {
  const dt   = new Date(d)
  const day  = String(dt.getUTCDate()).padStart(2, "0")
  const mon  = String(dt.getUTCMonth() + 1).padStart(2, "0")
  const year = dt.getUTCFullYear()
  return `${day}/${mon}/${year}`
}

const BOOKING_STATUS_LABEL: Record<string, string> = {
  PENDING:   "Pendente",
  CONFIRMED: "Confirmada",
  ACTIVE:    "Em uso",
  RETURNED:  "Devolvida",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
  DISPUTED:  "Em disputa",
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const now          = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const uid          = session.user.id

  // Queries paralelas — Sprint 2 + P2-58/P2-60
  const [
    itemCount,
    totalViews,
    activeBookings,
    monthEarnings,
    recentBookings,
    lastBookingCategories,
    userProfile,
    upcomingReturns,
  ] = await Promise.all([
    // itens anunciados
    prisma.item.count({ where: { ownerId: uid, deletedAt: null } }),

    // visualizações totais
    prisma.item.aggregate({
      where: { ownerId: uid, deletedAt: null },
      _sum:  { viewCount: true },
    }),

    // reservas ativas (como locatário ou locador)
    prisma.booking.count({
      where: {
        status: { in: ["CONFIRMED", "ACTIVE"] },
        OR: [{ borrowerId: uid }, { ownerId: uid }],
      },
    }),

    // ganhos do mês (como locador — bookings PAID no mês atual)
    prisma.booking.aggregate({
      where: {
        ownerId:       uid,
        paymentStatus: "PAID",
        status:        { in: ["ACTIVE", "RETURNED", "COMPLETED"] },
        startDate:     { gte: startOfMonth },
      },
      _sum: { totalPrice: true },
    }).catch(() => ({ _sum: { totalPrice: null } })),

    // últimas 3 reservas (como locatário ou locador)
    prisma.booking.findMany({
      where: {
        OR: [{ borrowerId: uid }, { ownerId: uid }],
        status: { not: "CANCELLED" },
      },
      orderBy: { createdAt: "desc" },
      take:    3,
      select: {
        id: true, status: true, startDate: true, endDate: true, totalPrice: true,
        item: {
          select: {
            title:  true,
            images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
          },
        },
      },
    }).catch(() => []),

    // categorias das últimas reservas (para sugestões personalizadas)
    prisma.booking.findMany({
      where: { borrowerId: uid, status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      take:    3,
      select: { item: { select: { categoryId: true } } },
    }).catch(() => []),

    // cidade/estado do usuário para personalizar textos
    prisma.user.findUnique({
      where:  { id: uid },
      select: { city: true, state: true },
    }).catch(() => null),

    // P2-58 — Próximas devoluções (proprietário): reservas ACTIVE ordenadas por endDate ASC
    prisma.booking.findMany({
      where: { ownerId: uid, status: "ACTIVE" },
      orderBy: { endDate: "asc" },
      take: 5,
      select: {
        id:       true,
        endDate:  true,
        item:     { select: { title: true } },
        borrower: { select: { name: true } },
      },
    }).catch(() => []),
  ])

  // Sugestões personalizadas
  const categoryIds = [...new Set(
    lastBookingCategories.map((b) => b.item?.categoryId).filter(Boolean) as string[]
  )]
  const suggestions = await prisma.item.findMany({
    where: {
      isActive:   true,
      isApproved: true,
      deletedAt:  null,
      ownerId:    { not: uid },
      ...(categoryIds.length > 0 ? { categoryId: { in: categoryIds } } : {}),
    },
    take:    8,
    orderBy: { viewCount: "desc" },
    select: {
      id:          true,
      title:       true,
      pricePerDay: true,
      images:      { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
    },
  }).catch(() => [])

  // CO₂ calculado: 0.5 kg por dia de aluguel concluído
  const completedBookings = await prisma.booking.findMany({
    where:  { borrowerId: uid, status: "COMPLETED" },
    select: { startDate: true, endDate: true },
  }).catch(() => [])
  const totalDays = completedBookings.reduce((acc, b) => {
    const days = Math.max(1, Math.ceil(
      (new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) / 86_400_000
    ))
    return acc + days
  }, 0)
  const co2Kg = +(totalDays * 0.5).toFixed(1)

  const earningsCents = monthEarnings._sum.totalPrice ?? 0
  const firstName     = session.user.name?.split(" ")[0] ?? "você"

  const userCity     = userProfile?.city  ?? "Natal"
  const userState    = userProfile?.state ?? "RN"
  const userLocation = userState ? `${userCity}, ${userState}` : userCity

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      {/* ─── HEADER GRADIENTE ─── */}
      <section className="bg-gradient-to-br from-primary to-[#144D81] px-4 py-8">
        <div className="container">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-white">
                Olá, {firstName}! 👋
              </h1>
              <p className="mt-1 text-sm text-white/65">
                {userLocation} · Bem-vindo de volta ao ShareO
              </p>
            </div>
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border-2 border-white/20 bg-brand text-xl font-extrabold text-white">
              {firstName[0]?.toUpperCase()}
            </div>
          </div>
        </div>
      </section>

      <main className="container py-8">
        <div className="mx-auto max-w-3xl">

          {/* Stats — 4 métricas em 2×2 */}
          <div className="mb-8 grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-surface p-5">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Reservas ativas</p>
              <p className="text-2xl font-bold text-primary">{activeBookings}</p>
              <p className="mt-1 text-xs text-muted-foreground">em andamento</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-5">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Meus itens</p>
              <p className="text-2xl font-bold text-primary">{itemCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">{itemCount === 1 ? "anunciado" : "anunciados"}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-5">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ganhos este mês</p>
              <p className="text-2xl font-bold text-brand">{fmtCurrency(earningsCents)}</p>
              <p className="mt-1 text-xs text-muted-foreground">como locador</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-5">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Visualizações</p>
              <p className="text-2xl font-bold text-primary">{totalViews._sum.viewCount ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">nos seus anúncios</p>
            </div>
          </div>

          {/* Reservas recentes */}
          {recentBookings.length > 0 && (
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-primary">Minhas Reservas</h2>
                <Link href="/reservas" className="text-sm font-semibold text-brand hover:underline">Ver histórico →</Link>
              </div>
              <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
                {recentBookings.map((b) => (
                  <Link key={b.id} href={`/reservas/${b.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-background transition-colors">
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      {b.item.images[0]?.url && (
                        <Image src={b.item.images[0].url} alt={b.item.title} fill className="object-cover" sizes="48px" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{b.item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDateSafe(b.startDate)} – {fmtDateSafe(b.endDate)}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      b.status === "ACTIVE"    ? "bg-success/10 text-success" :
                      b.status === "CONFIRMED" ? "bg-blue-100 text-blue-700"  :
                      b.status === "PENDING"   ? "bg-amber-100 text-amber-700" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Sugestões personalizadas */}
          {suggestions.length > 0 && (
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-primary">Sugestões para Você</h2>
                <Link href="/itens" className="text-sm font-semibold text-brand hover:underline">Ver mais →</Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {suggestions.map((item) => (
                  <SuggestCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Ações rápidas */}
          <h2 className="mb-4 font-semibold text-primary">Ações rápidas</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Link
              href="/itens/novo"
              className="flex items-center gap-4 rounded-lg border border-border bg-surface p-5 hover:border-brand/40 hover:bg-brand/5 transition-colors group outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand group-hover:bg-brand/20 transition-colors">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </div>
              <div>
                <p className="font-medium text-primary">Criar anúncio</p>
                <p className="text-sm text-muted-foreground">Anuncie um item para alugar</p>
              </div>
            </Link>

            <Link
              href="/meus-anuncios"
              className="flex items-center gap-4 rounded-lg border border-border bg-surface p-5 hover:border-brand/40 hover:bg-brand/5 transition-colors group outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand group-hover:bg-brand/20 transition-colors">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <div>
                <p className="font-medium text-primary">Meus anúncios</p>
                <p className="text-sm text-muted-foreground">Gerencie o que você anuncia</p>
              </div>
            </Link>

            <Link
              href="/itens"
              className="flex items-center gap-4 rounded-lg border border-border bg-surface p-5 hover:border-brand/40 hover:bg-brand/5 transition-colors group outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand group-hover:bg-brand/20 transition-colors">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <div>
                <p className="font-medium text-primary">Explorar itens</p>
                <p className="text-sm text-muted-foreground">Encontre o que você precisa alugar</p>
              </div>
            </Link>

            <Link
              href="/mensagens"
              className="flex items-center gap-4 rounded-lg border border-border bg-surface p-5 hover:border-brand/40 hover:bg-brand/5 transition-colors group outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand group-hover:bg-brand/20 transition-colors">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div>
                <p className="font-medium text-primary">Chat</p>
                <p className="text-sm text-muted-foreground">Veja suas conversas</p>
              </div>
            </Link>
          </div>
        </div>

        {/* ─── SHAREO SUSTENTÁVEL ─── */}
        <section className="mt-10 rounded-xl bg-brand p-6 text-white" aria-label="ShareO Sustentável">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-lg">🌿</span>
            <h2 className="text-lg font-bold">ShareO Sustentável</h2>
            <span className="ml-auto rounded-full bg-white/15 px-3 py-0.5 text-xs font-semibold">{userLocation}</span>
          </div>
          <p className="mb-5 text-sm text-white/70">Iniciativas de economia circular na sua região</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { icon: "👕", title: "Troca Circular",  desc: "Troque roupas que não usa com vizinhos da sua região." },
              { icon: "🔧", title: "Eco Centro",      desc: "Doe ou repare equipamentos. Evite o descarte desnecessário." },
              { icon: "♻️", title: `Recicla ${userCity}`,   desc: "Descubra pontos de coleta seletiva perto de você." },
            ].map((card) => (
              <div key={card.title} className="rounded-lg bg-white/10 p-4">
                <div className="mb-2 text-2xl">{card.icon}</div>
                <p className="font-semibold text-sm mb-1">{card.title}</p>
                <p className="text-xs text-white/75 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── CO₂ BAR ─── */}
        <div className="mt-4 flex items-center gap-4 rounded-xl bg-[#004d2a] px-6 py-4">
          <span className="text-3xl">🌍</span>
          <div>
            <p className="text-xl font-extrabold text-white">
              {co2Kg > 0 ? `${co2Kg} kg CO₂` : "Comece a alugar e economize CO₂"}
            </p>
            <p className="text-sm text-white/65">economizados através de aluguel e reuso em {userCity}</p>
          </div>
        </div>

      </main>
    </div>
  )
}
