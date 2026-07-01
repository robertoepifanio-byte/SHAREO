import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { ItemCard } from "@/components/items/ItemCard"
import { EmptyState } from "@/components/shared/EmptyState"

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
          status:       true,
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
    .filter((f) => f.item.status === "AVAILABLE" && f.item.isApproved && !f.item.deletedAt)
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
          <EmptyState
            title="Nenhum favorito ainda"
            description="Toque no coração em qualquer item para salvá-lo aqui."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                isFavorited={true}
                backHref="/favoritos"
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
