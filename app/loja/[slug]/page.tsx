import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { ItemCard } from "@/components/items/ItemCard"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const user = await getOwner(slug)
  if (!user) return { title: "Vitrine não encontrada" }
  return {
    title: `${user.name} — Vitrine`,
    description: user.bio ?? `Confira os itens disponíveis para aluguel de ${user.name} no ShareO.`,
    openGraph: {
      title: `${user.name} — Vitrine ShareO`,
      description: user.bio ?? `Alugue itens de ${user.name} no ShareO.`,
      ...(user.avatarUrl && { images: [{ url: user.avatarUrl }] }),
    },
  }
}

async function getOwner(slug: string) {
  return prisma.user.findFirst({
    where: {
      // slug customizado OU id do usuário (retrocompatível)
      OR: [{ slug }, { id: slug }],
      deletedAt: null,
      isActive:  true,
    },
    select: {
      id:           true,
      name:         true,
      slug:         true,
      bio:          true,
      avatarUrl:    true,
      city:         true,
      state:        true,
      userType:     true,
      isVerified:   true,
      createdAt:    true,
      _count: {
        select: {
          items:    { where: { status: { in: ["AVAILABLE", "PAUSED", "DRAFT"] }, deletedAt: null } },
          reviewsReceived: true,
        },
      },
    },
  })
}

const fmtMembro = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d)

export default async function LojaPage({ params }: Props) {
  const { slug } = await params
  const owner = await getOwner(slug)
  if (!owner) notFound()

  const [items, reviewStats] = await Promise.all([
    prisma.item.findMany({
      where: {
        ownerId:  owner.id,
        status:   { in: ["AVAILABLE", "PAUSED", "DRAFT"] },
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id:           true,
        title:        true,
        pricePerDay:  true,
        condition:    true,
        city:         true,
        state:        true,
        neighborhood: true,
        status:       true,
        images:       { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
        category:     { select: { name: true } },
        owner:        { select: { name: true, isVerified: true } },
        _count:       { select: { reviews: true, favorites: true } },
      },
    }),
    prisma.review.aggregate({
      where: { revieweeId: owner.id },
      _avg:  { rating: true },
      _count: { _all: true },
    }),
  ])

  const avgRating   = reviewStats._avg.rating
  const reviewCount = reviewStats._count._all

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main>
        {/* ── Banner / Cabeçalho da vitrine ── */}
        <div className="border-b border-border bg-surface">
          <div className="container py-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">

              {/* Avatar */}
              <div className="flex-shrink-0">
                {owner.avatarUrl ? (
                  <Image
                    src={owner.avatarUrl}
                    alt={owner.name}
                    width={88}
                    height={88}
                    className="h-20 w-20 rounded-full object-cover ring-2 ring-border sm:h-22 sm:w-22"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-3xl font-bold text-white">
                    {owner.name[0]?.toUpperCase()}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-primary">{owner.name}</h1>
                  {owner.isVerified && (
                    <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                      ✓ Verificado
                    </span>
                  )}
                  {owner.userType === "PJ" && (
                    <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
                      Loja
                    </span>
                  )}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {(owner.city || owner.state) && (
                    <span>📍 {[owner.city, owner.state].filter(Boolean).join(", ")}</span>
                  )}
                  <span>Membro desde {fmtMembro(owner.createdAt)}</span>
                </div>

                {owner.bio && (
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground">
                    {owner.bio}
                  </p>
                )}

                {/* Stats inline */}
                <div className="mt-3 flex flex-wrap gap-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-primary">{owner._count.items}</p>
                    <p className="text-xs text-muted-foreground">
                      {owner._count.items === 1 ? "item" : "itens"}
                    </p>
                  </div>
                  {avgRating !== null && (
                    <div className="text-center">
                      <p className="text-lg font-bold text-primary">
                        {avgRating.toFixed(1)} <span className="text-yellow-400 text-base">★</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {reviewCount} {reviewCount === 1 ? "avaliação" : "avaliações"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Perfil público */}
              <Link
                href={`/perfil/${owner.id}`}
                className="inline-flex h-11 items-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground hover:bg-background transition-colors self-start flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                Ver perfil
              </Link>
            </div>
          </div>
        </div>

        {/* ── Grid de itens ── */}
        <div className="container py-8">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <h2 className="mb-2 font-semibold text-primary">Nenhum item disponível</h2>
              <p className="text-sm text-muted-foreground">
                {owner.name} ainda não tem itens ativos no momento.
              </p>
            </div>
          ) : (
            <>
              <h2 className="mb-4 font-semibold text-foreground">
                {items.length} {items.length === 1 ? "item disponível" : "itens disponíveis"}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {items.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
