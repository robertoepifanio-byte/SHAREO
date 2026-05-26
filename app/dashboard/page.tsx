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
      <main className="container py-8">
        <div className="mx-auto max-w-3xl">

          {/* Saudação */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-primary">
              Olá, {firstName}!
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Bem-vindo ao ShareO — Use Mais. Possua Menos.
            </p>
          </div>

          {/* Stats */}
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface p-5">
              <p className="text-2xl font-bold text-primary">{itemCount}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {itemCount === 1 ? "Anúncio" : "Anúncios"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-5">
              <p className="text-2xl font-bold text-primary">
                {totalViews._sum.viewCount ?? 0}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Visualizações</p>
            </div>
            <div className="col-span-2 rounded-lg border border-border bg-surface p-5 md:col-span-1">
              <p className="text-2xl font-bold text-primary">{activeBookings}</p>
              <p className="mt-1 text-sm text-muted-foreground">Locações ativas</p>
            </div>
          </div>

          {/* Ações rápidas */}
          <h2 className="mb-4 font-semibold text-primary">Ações rápidas</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Link
              href="/itens/novo"
              className="flex items-center gap-4 rounded-lg border border-border bg-surface p-5 hover:border-brand/40 hover:bg-brand/5 transition-colors group"
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
              className="flex items-center gap-4 rounded-lg border border-border bg-surface p-5 hover:border-brand/40 hover:bg-brand/5 transition-colors group"
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
              className="flex items-center gap-4 rounded-lg border border-border bg-surface p-5 hover:border-brand/40 hover:bg-brand/5 transition-colors group"
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

            <div className="flex items-center gap-4 rounded-lg border border-border bg-surface p-5 opacity-60 cursor-not-allowed">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div>
                <p className="font-medium text-foreground">Chat</p>
                <p className="text-sm text-muted-foreground">Em desenvolvimento — Sprint 3</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
