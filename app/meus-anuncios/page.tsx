import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { MyItemsGrid } from "@/components/items/MyItemsGrid"

export const metadata: Metadata = { title: "Meus Anúncios" }

export default async function MeusAnunciosPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/meus-anuncios")

  const items = await prisma.item.findMany({
    where:   { ownerId: session.user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id:           true,
      title:        true,
      pricePerDay:  true,
      condition:    true,
      city:         true,
      state:        true,
      neighborhood: true,
      isActive:     true,
      category:     { select: { name: true } },
      owner:        { select: { name: true, isVerified: true } },
      images:       { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
      _count:       { select: { reviews: true, favorites: true } },
    },
  })

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Meus Anúncios</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? "anúncio" : "anúncios"}
            </p>
          </div>
          <Link
            href="/itens/novo"
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-md bg-brand text-sm font-medium text-white hover:bg-brand-hover transition-colors self-start sm:self-auto"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Novo anúncio
          </Link>
        </div>

        <MyItemsGrid initialItems={items} />
      </main>
    </div>
  )
}
