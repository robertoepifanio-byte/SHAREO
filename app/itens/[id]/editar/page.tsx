import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { ItemForm } from "@/components/items/ItemForm"

type Props = { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: "Editar anúncio" }

export default async function EditarItemPage({ params }: Props) {
  const { id } = await params

  const session = await auth()
  if (!session) redirect(`/login?callbackUrl=/itens/${id}/editar`)

  const item = await prisma.item.findFirst({
    where:   { id, deletedAt: null },
    include: { images: { orderBy: { order: "asc" } } },
  })

  if (!item) notFound()

  // Somente o dono ou admin pode editar
  if (item.ownerId !== session.user.id && session.user.role !== "ADMIN") {
    redirect("/meus-anuncios")
  }

  const initialData = {
    id:            item.id,
    title:         item.title,
    description:   item.description,
    categoryId:    item.categoryId,
    condition:     item.condition,
    pricePerDay:   item.pricePerDay,
    pricePerWeek:  item.pricePerWeek,
    pricePerMonth: item.pricePerMonth,
    depositAmount: item.depositAmount,
    address:       item.address,
    city:          item.city,
    state:         item.state,
    neighborhood:  item.neighborhood,
    latitude:      item.latitude,
    longitude:     item.longitude,
    images:        item.images,
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-primary">Editar anúncio</h1>
            <p className="mt-1 text-sm text-muted-foreground truncate">{item.title}</p>
          </div>
          <ItemForm mode="edit" initialData={initialData} />
        </div>
      </main>
    </div>
  )
}
