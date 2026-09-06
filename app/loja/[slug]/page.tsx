import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Avatar } from "@/components/ui/Avatar"
import { prisma } from "@/lib/prisma"
import { byStoreSlugOrId, canonicalStorePath } from "@/lib/store-url"
import { AppHeader } from "@/components/layout/AppHeader"
import { ItemCard } from "@/components/items/ItemCard"
import { EmptyState } from "@/components/shared/EmptyState"
import { RatingStars } from "@/components/ui/RatingStars"
import { formatMonthYear } from "@/utils/format"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const user = await getOwner(slug)
  if (!user) return { title: "Vitrine não encontrada" }
  return {
    title: `${user.name} — Vitrine`,
    description: user.bio ?? `Confira os itens disponíveis para aluguel de ${user.name} no ShareO.`,
    // Duas URLs servem esta vitrine (id e slug). Sem canonical isso é conteúdo
    // duplicado aos olhos do buscador; com ele, os sinais se consolidam na
    // forma descritiva — a mesma que o sitemap já publica.
    alternates: { canonical: canonicalStorePath(user) },
    openGraph: {
      title: `${user.name} — Vitrine ShareO`,
      description: user.bio ?? `Alugue itens de ${user.name} no ShareO.`,
      // 🪤 O Next NÃO deriva `og:url` do canonical — são campos independentes.
      // Sem esta linha, compartilhar a vitrine no WhatsApp fixaria no preview a
      // URL que a pessoa visitou, divergindo do canonical.
      url: canonicalStorePath(user),
      ...(user.avatarUrl && { images: [{ url: user.avatarUrl }] }),
    },
  }
}

async function getOwner(slug: string) {
  return prisma.user.findFirst({
    // slug customizado OU id do usuário (retrocompatível), só vitrine visível
    where: byStoreSlugOrId(slug),
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
                <Avatar name={owner.name} src={owner.avatarUrl} size={88} className="bg-primary text-white ring-2 ring-border" />
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
                  <span>Membro desde {formatMonthYear(owner.createdAt)}</span>
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
                      <RatingStars rating={avgRating} showValue size="md" count={reviewCount} />
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
            <EmptyState
              title="Nenhum item disponível"
              description={`${owner.name} ainda não tem itens ativos no momento.`}
            />
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
