import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { ItemCard } from "@/components/items/ItemCard"

export const metadata: Metadata = { title: "Favoritos" }

export default async function FavoritosPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/favoritos")

  const userId = session.user.id

  const favorites = await prisma.favorite.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
    select: {
      item: {
        select: {
          id:           true,
          title:        true,
          pricePerDay:  true,
          condition:    true,
          city:         true,
          state:        true,
          neighborhood: true,
          isActive:     true,
          isApproved:   true,
          deletedAt:    true,
          images:   { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
          category: { select: { id: true, name: true, slug: true } },
          owner:    { select: { name: true, isVerified: true } },
          _count:   { select: { reviews: true, favorites: true } },
        },
      },
    },
  })

  const items = favorites
    .filter((f) => f.item.isActive && f.item.isApproved && !f.item.deletedAt)
    .map((f) => f.item)

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">Favoritos</h1>
          <p className="text-sm text-muted-foreground">
            {items.length === 0
              ? "Nenhum item salvo ainda."
              : `${items.length} ${items.length === 1 ? "item salvo" : "itens salvos"}`}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/40" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <p className="max-w-xs text-muted-foreground">
              Toque no coração em qualquer item para salvá-lo aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                isFavorited={true}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
