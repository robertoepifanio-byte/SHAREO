import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { FavoriteButton } from "@/components/items/FavoriteButton"
import { Gallery } from "./_Gallery"
import { PriceCalc } from "./_PriceCalc"

type Props = { params: Promise<{ id: string }> }

const CONDITION_LABEL: Record<string, string> = {
  NEW:       "Novo",
  EXCELLENT: "Seminovo",
  GOOD:      "Bom estado",
  FAIR:      "Regular",
}

function relativeTime(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (days === 0) return "hoje"
  if (days === 1) return "há 1 dia"
  if (days < 7)  return `há ${days} dias`
  if (days < 14) return "há 1 semana"
  if (days < 30) return `há ${Math.floor(days / 7)} semanas`
  if (days < 60) return "há 1 mês"
  return `há ${Math.floor(days / 30)} meses`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const item = await prisma.item.findFirst({
    where:  { id, deletedAt: null },
    select: { title: true, description: true },
  })
  if (!item) return { title: "Anúncio não encontrado" }
  return {
    title:       `${item.title} — ShareO`,
    description: item.description.slice(0, 160),
  }
}

export default async function ItemDetailPage({ params }: Props) {
  const { id } = await params

  const [item, session] = await Promise.all([
    prisma.item.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true, title: true, description: true, condition: true,
        pricePerDay: true, pricePerWeek: true, pricePerMonth: true,
        depositAmount: true, city: true, state: true, neighborhood: true,
        isActive: true, ownerId: true, viewCount: true,
        category: { select: { name: true } },
        owner: {
          select: {
            id: true, name: true, isVerified: true,
            city: true, neighborhood: true, createdAt: true,
          },
        },
        images:  { select: { url: true }, orderBy: { order: "asc" } },
        reviews: {
          where:   { reviewType: "ITEM" },
          select:  { id: true, rating: true, comment: true, createdAt: true, reviewer: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take:    8,
        },
        _count: { select: { reviews: true, favorites: true } },
      },
    }),
    auth(),
  ])

  if (!item) notFound()

  prisma.item.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {})

  const isOwner   = session?.user.id === item.ownerId
  const avgRating = item.reviews.length
    ? item.reviews.reduce((s, r) => s + r.rating, 0) / item.reviews.length
    : null

  const fmt = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

  const ownerInitial  = item.owner.name[0]?.toUpperCase() ?? "?"
  const ownerLocation = [item.owner.neighborhood, item.owner.city].filter(Boolean).join(", ")

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Barra de volta */}
      <div className="border-b border-border bg-surface">
        <div className="container py-3">
          <Link
            href="/itens"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar para resultados
          </Link>
        </div>
      </div>

      <main className="container py-8">
        <h1 className="sr-only">{item.title}</h1>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

          {/* ─── ESQUERDA: Galeria + Descrição + Avaliações ─── */}
          <div className="min-w-0 flex-1">

            {/* Galeria interativa (client component) */}
            <Gallery images={item.images} title={item.title} />

            {/* Descrição */}
            <div className="mt-6">
              <h2 className="mb-3 text-lg font-bold text-primary">Sobre o item</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>

              {/* Tags */}
              <div className="mt-3 flex flex-wrap gap-2" role="list" aria-label="Características">
                <span role="listitem" className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                  {item.category.name}
                </span>
                <span role="listitem" className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                  {CONDITION_LABEL[item.condition] ?? item.condition}
                </span>
                {item.neighborhood && (
                  <span role="listitem" className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                    📍 {item.neighborhood}
                  </span>
                )}
              </div>

              <div className="my-6 h-px bg-border" />

              {/* Avaliações */}
              <h2 className="mb-4 text-lg font-bold text-primary">
                Avaliações ({item._count.reviews})
              </h2>

              {item.reviews.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {item.reviews.map((review) => (
                    <div key={review.id} className="rounded-lg border border-border bg-background p-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">
                          {review.reviewer.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {relativeTime(new Date(review.createdAt))}
                        </span>
                      </div>
                      <div className="mb-1 text-sm text-yellow-500" aria-label={`${review.rating} estrelas`}>
                        {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma avaliação ainda. Seja o primeiro a alugar!
                </p>
              )}
            </div>
          </div>

          {/* ─── DIREITA: Card de locação (sticky) ─── */}
          <div className="w-full lg:w-[360px] lg:flex-shrink-0">
            <div className="sticky top-20 rounded-xl border border-border bg-surface p-6">

              {/* Categoria */}
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-brand">
                {item.category.name}
              </p>

              {/* Título */}
              <p className="mb-2 text-xl font-bold leading-snug text-primary" aria-hidden="true">
                {item.title}
              </p>

              {/* Rating */}
              {avgRating !== null && (
                <div className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                  <span className="text-yellow-500" aria-label={`${avgRating.toFixed(1)} estrelas`}>
                    {"★".repeat(Math.round(avgRating))}{"☆".repeat(5 - Math.round(avgRating))}
                  </span>
                  <strong className="text-foreground">{avgRating.toFixed(1)}</strong>
                  <span>·</span>
                  <span>{item._count.reviews} avaliação{item._count.reviews !== 1 ? "ões" : ""}</span>
                  <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                    🌿 Eco
                  </span>
                </div>
              )}

              {/* Preço principal */}
              <div className="mb-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-foreground">{fmt(item.pricePerDay)}</span>
                  <span className="text-sm text-muted-foreground">/dia</span>
                </div>
                {(item.pricePerWeek || item.pricePerMonth) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">Também:</span>
                    {item.pricePerWeek && (
                      <span className="rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                        {fmt(item.pricePerWeek)}/sem
                      </span>
                    )}
                    {item.pricePerMonth && (
                      <span className="rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                        {fmt(item.pricePerMonth)}/mês
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Se for dono: botão de editar; senão: calculadora + CTA */}
              {isOwner ? (
                <Link
                  href={`/itens/${item.id}/editar`}
                  className="mb-2.5 block w-full rounded-lg border border-border py-3.5 text-center text-sm font-medium text-foreground hover:bg-background transition-colors"
                >
                  ✏️ Editar anúncio
                </Link>
              ) : (
                <PriceCalc
                  pricePerDay={item.pricePerDay}
                  pricePerWeek={item.pricePerWeek}
                  pricePerMonth={item.pricePerMonth}
                  itemId={item.id}
                  isLoggedIn={!!session}
                />
              )}

              {/* Favoritar */}
              {!isOwner && (
                <div className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-background transition-colors cursor-pointer">
                  <FavoriteButton itemId={item.id} />
                  <span>Salvar nos favoritos</span>
                </div>
              )}

              {/* Mini card do proprietário */}
              <Link
                href={`/perfil/${item.owner.id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-3.5 hover:bg-muted/40 transition-colors"
                aria-label={`Ver perfil de ${item.owner.name}`}
              >
                <div
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-white"
                  aria-hidden="true"
                >
                  {ownerInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {item.owner.name}
                    {item.owner.isVerified && (
                      <span className="ml-1.5 text-success" title="Verificado">✓</span>
                    )}
                  </p>
                  {ownerLocation && (
                    <p className="truncate text-xs text-muted-foreground">📍 {ownerLocation}</p>
                  )}
                </div>
                <span className="text-lg text-muted-foreground" aria-hidden="true">›</span>
              </Link>

              {/* Segurança */}
              <p className="mt-3 text-center text-xs text-muted-foreground">
                🔒 Pagamento seguro via Shareo · Seguro incluso
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
