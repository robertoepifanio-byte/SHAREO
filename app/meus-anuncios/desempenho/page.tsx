import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { PjGate } from "@/components/premium/PjGate"

export const metadata: Metadata = { title: "Desempenho dos Anúncios" }

const fmtBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

const fmtNum = (n: number) =>
  new Intl.NumberFormat("pt-BR").format(n)

function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className={`text-2xl font-extrabold ${accent ? "text-brand" : "text-primary"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export default async function DesempenhoPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/meus-anuncios/desempenho")

  // ── PJ gate ────────────────────────────────────────────────────────────────
  const isPj = session.user.userType === "PJ"

  if (!isPj) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-primary">Meus Anúncios</h1>
          </div>
          {/* Tabs */}
          <div className="mb-6 flex gap-1 rounded-lg border border-border bg-surface p-1 w-fit" role="tablist" aria-label="Seções">
            <Link href="/meus-anuncios" role="tab" aria-selected={false}
              className="inline-flex h-9 items-center rounded-md px-4 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
              Anúncios
            </Link>
            <Link href="/meus-anuncios/desempenho" role="tab" aria-selected={true}
              className="inline-flex h-9 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
              Desempenho
            </Link>
            <Link href="/meus-anuncios/importar" role="tab" aria-selected={false}
              className="inline-flex h-9 items-center rounded-md px-4 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
              Importar
            </Link>
            <Link href="/meus-anuncios/integracoes" role="tab" aria-selected={false}
              className="inline-flex h-9 items-center rounded-md px-4 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
              Integrações
            </Link>
          </div>
          <PjGate feature="analytics" />
        </main>
      </div>
    )
  }

  const userId = session.user.id

  const items = await prisma.item.findMany({
    where:   { ownerId: userId, deletedAt: null },
    orderBy: { viewCount: "desc" },
    select: {
      id:        true,
      title:     true,
      status:    true,
      viewCount: true,
      images:    { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
      _count:    { select: { favorites: true } },
      bookings: {
        where:  { status: { in: ["RETURNED", "COMPLETED"] } },
        select: { totalPrice: true },
      },
      reviews: {
        select: { rating: true },
      },
    },
  })

  // ── Totais ────────────────────────────────────────────────────────────────
  const totalViews    = items.reduce((s, i) => s + i.viewCount, 0)
  const totalRevenue  = items.reduce((s, i) => s + i.bookings.reduce((b, bk) => b + bk.totalPrice, 0), 0)
  const totalBookings = items.reduce((s, i) => s + i.bookings.length, 0)
  const allRatings    = items.flatMap((i) => i.reviews.map((r) => r.rating))
  const avgRating     = allRatings.length > 0
    ? allRatings.reduce((s, r) => s + r, 0) / allRatings.length
    : null

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container py-8">
        {/* ── Header + tabs ── */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Meus Anúncios</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? "anúncio" : "anúncios"}
            </p>
          </div>
          <Link
            href="/itens/novo"
            className="inline-flex h-11 items-center gap-1.5 rounded-md bg-brand px-5 text-sm font-semibold text-white hover:opacity-90 transition-opacity self-start sm:self-auto"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Novo anúncio
          </Link>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg border border-border bg-surface p-1 w-fit" role="tablist" aria-label="Seções">
          <Link
            href="/meus-anuncios"
            role="tab"
            aria-selected={false}
            className="inline-flex h-9 items-center rounded-md px-4 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Anúncios
          </Link>
          <Link
            href="/meus-anuncios/desempenho"
            role="tab"
            aria-selected={true}
            className="inline-flex h-9 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Desempenho
          </Link>
          <Link
            href="/meus-anuncios/importar"
            role="tab"
            aria-selected={false}
            className="inline-flex h-9 items-center rounded-md px-4 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Importar
          </Link>
          <Link
            href="/meus-anuncios/integracoes"
            role="tab"
            aria-selected={false}
            className="inline-flex h-9 items-center rounded-md px-4 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Integrações
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <h2 className="mb-2 font-semibold text-primary">Nenhum anúncio ainda</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Crie seu primeiro anúncio para ver as métricas aqui.
            </p>
            <Link href="/itens/novo" className="text-sm font-medium text-brand hover:underline">
              Criar anúncio →
            </Link>
          </div>
        ) : (
          <>
            {/* ── Cards de totais ── */}
            <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard
                label="Visualizações"
                value={fmtNum(totalViews)}
                sub="total acumulado"
              />
              <StatCard
                label="Reservas concluídas"
                value={fmtNum(totalBookings)}
                sub="devolvidas ou finalizadas"
              />
              <StatCard
                label="Receita total"
                value={fmtBRL(totalRevenue)}
                sub="locações finalizadas"
                accent
              />
              <StatCard
                label="Nota média"
                value={avgRating !== null ? `${avgRating.toFixed(1)} ★` : "—"}
                sub={avgRating !== null ? `${allRatings.length} avaliações` : "sem avaliações"}
              />
            </div>

            {/* ── Tabela por item ── */}
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="border-b border-border px-5 py-4">
                <h2 className="font-semibold text-foreground">Por anúncio</h2>
              </div>

              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background text-left">
                      <th className="px-5 py-3 font-semibold text-muted-foreground">Anúncio</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Views</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Favoritos</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Reservas</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Receita</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const revenue  = item.bookings.reduce((s, b) => s + b.totalPrice, 0)
                      const ratings  = item.reviews.map((r) => r.rating)
                      const avgItem  = ratings.length > 0
                        ? ratings.reduce((s, r) => s + r, 0) / ratings.length
                        : null
                      const img = item.images[0]?.url

                      return (
                        <tr key={item.id} className="border-b border-border last:border-0 hover:bg-background/60 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                                {img ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={img} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                                      <circle cx="8.5" cy="8.5" r="1.5"/>
                                      <polyline points="21 15 16 10 5 21"/>
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <Link
                                  href={`/itens/${item.id}`}
                                  className="line-clamp-1 font-medium text-foreground hover:text-brand transition-colors"
                                >
                                  {item.title}
                                </Link>
                                <span className={`text-xs ${item.status === "AVAILABLE" ? "text-success" : "text-muted-foreground"}`}>
                                  {item.status === "AVAILABLE" ? "Ativo" : "Pausado"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-foreground">
                            {fmtNum(item.viewCount)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-foreground">
                            {fmtNum(item._count.favorites)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-foreground">
                            {item.bookings.length}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">
                            {revenue > 0 ? fmtBRL(revenue) : <span className="text-muted-foreground font-normal">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {avgItem !== null ? (
                              <span className="font-semibold text-foreground">
                                {avgItem.toFixed(1)} <span className="text-yellow-400">★</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile — cards empilhados */}
              <div className="md:hidden divide-y divide-border">
                {items.map((item) => {
                  const revenue = item.bookings.reduce((s, b) => s + b.totalPrice, 0)
                  const ratings = item.reviews.map((r) => r.rating)
                  const avgItem = ratings.length > 0
                    ? ratings.reduce((s, r) => s + r, 0) / ratings.length
                    : null
                  const img = item.images[0]?.url

                  return (
                    <div key={item.id} className="p-4">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/itens/${item.id}`}
                            className="line-clamp-1 font-medium text-foreground hover:text-brand transition-colors"
                          >
                            {item.title}
                          </Link>
                          <span className={`text-xs ${item.status === "AVAILABLE" ? "text-success" : "text-muted-foreground"}`}>
                            {item.status === "AVAILABLE" ? "Ativo" : "Pausado"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-lg bg-background p-2.5">
                          <p className="text-xs text-muted-foreground">Views</p>
                          <p className="font-semibold text-foreground">{fmtNum(item.viewCount)}</p>
                        </div>
                        <div className="rounded-lg bg-background p-2.5">
                          <p className="text-xs text-muted-foreground">Favoritos</p>
                          <p className="font-semibold text-foreground">{fmtNum(item._count.favorites)}</p>
                        </div>
                        <div className="rounded-lg bg-background p-2.5">
                          <p className="text-xs text-muted-foreground">Reservas</p>
                          <p className="font-semibold text-foreground">{item.bookings.length}</p>
                        </div>
                        <div className="rounded-lg bg-background p-2.5">
                          <p className="text-xs text-muted-foreground">Receita</p>
                          <p className="font-semibold text-foreground">
                            {revenue > 0 ? fmtBRL(revenue) : "—"}
                          </p>
                        </div>
                        {avgItem !== null && (
                          <div className="col-span-2 rounded-lg bg-background p-2.5">
                            <p className="text-xs text-muted-foreground">Nota média</p>
                            <p className="font-semibold text-foreground">
                              {avgItem.toFixed(1)} <span className="text-yellow-400">★</span>
                              <span className="ml-1 text-xs font-normal text-muted-foreground">({ratings.length})</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
