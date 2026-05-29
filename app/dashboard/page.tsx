import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"

export const metadata: Metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const [itemCount, totalViews, activeBookings] = await Promise.all([
    prisma.item.count({
      where: { ownerId: session.user.id, deletedAt: null },
    }),
    prisma.item.aggregate({
      where:   { ownerId: session.user.id, deletedAt: null },
      _sum:    { viewCount: true },
    }),
    prisma.booking.count({
      where: {
        status: { in: ["CONFIRMED", "ACTIVE"] },
        OR: [{ borrowerId: session.user.id }, { ownerId: session.user.id }],
      },
    }),
  ])

  const firstName = session.user.name?.split(" ")[0] ?? "você"

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
                Natal, RN · Bem-vindo de volta ao ShareO
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
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Visualizações</p>
              <p className="text-2xl font-bold text-brand">{totalViews._sum.viewCount ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">nos seus anúncios</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-5">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Locações ativas</p>
              <p className="text-2xl font-bold text-primary">{activeBookings}</p>
              <p className="mt-1 text-xs text-muted-foreground">confirmadas</p>
            </div>
          </div>

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
            <span className="ml-auto rounded-full bg-white/15 px-3 py-0.5 text-xs font-semibold">Natal, RN</span>
          </div>
          <p className="mb-5 text-sm text-white/70">Iniciativas de economia circular na sua região</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { icon: "👕", title: "Troca Circular",  desc: "Troque roupas que não usa com vizinhos da sua região." },
              { icon: "🔧", title: "Eco Centro",      desc: "Doe ou repare equipamentos. Evite o descarte desnecessário." },
              { icon: "♻️", title: "Recicla Natal",   desc: "Descubra pontos de coleta seletiva perto de você." },
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
            <p className="text-xl font-extrabold text-white">759 kg CO₂</p>
            <p className="text-sm text-white/65">economizados através de aluguel e reuso em Natal</p>
          </div>
        </div>

      </main>
    </div>
  )
}
