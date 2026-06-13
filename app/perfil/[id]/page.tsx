import type { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { ItemCard } from "@/components/items/ItemCard"
import { getOwnerResponseBadge } from "@/lib/ownerStats"
import { getBorrowerBadge, getNextBorrowerBadge, isActiveReviewer, ACTIVE_REVIEWER_BADGE } from "@/lib/badges"
import { ReviewDetails, ReviewSentiment } from "@/components/reviews/ReviewDetails"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const user = await prisma.user.findFirst({
    where:  { id, deletedAt: null },
    select: { name: true },
  })
  if (!user) return { title: "Perfil não encontrado" }
  return { title: `${user.name}` }
}

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params

  const [user, reviewStats] = await Promise.all([
    prisma.user.findFirst({
      where:  { id, deletedAt: null, isActive: true },
      select: {
        id:               true,
        name:             true,
        bio:              true,
        city:             true,
        state:            true,
        neighborhood:     true,
        avatarUrl:        true,
        userType:         true,
        isVerified:       true,
        createdAt:        true,
        reputationPoints: true,
        _count: {
          select: {
            items:              { where: { status: { in: ["AVAILABLE", "PAUSED", "DRAFT"] }, deletedAt: null } },
            bookingsAsOwner:    { where: { status: { in: ["RETURNED", "COMPLETED"] } } },
            bookingsAsBorrower: { where: { status: { in: ["RETURNED", "COMPLETED"] } } },
          },
        },
        items: {
          where:   { status: "AVAILABLE", isApproved: true, deletedAt: null },
          orderBy: { createdAt: "desc" },
          take:    6,
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
        },
        reviewsReceived: {
          select: {
            rating:          true,
            comment:         true,
            reviewType:      true,
            sentiment:       true,
            itemAsDescribed: true,
            punctuality:     true,
            communication:   true,
            conservation:    true,
            photoUrl:        true,
            reviewer:        { select: { name: true } },
            createdAt:       true,
          },
          orderBy: { createdAt: "desc" },
          take:    5,
        },
      },
    }),
    prisma.review.aggregate({
      where: { revieweeId: id },
      _avg:  { rating: true },
      _count: { _all: true },
    }),
  ])

  if (!user) notFound()

  const [responseBadge, lastReview] = await Promise.all([
    getOwnerResponseBadge(user.id),
    prisma.review.findFirst({
      where:   { reviewerId: user.id },
      orderBy: { createdAt: "desc" },
      select:  { createdAt: true },
    }).catch(() => null),
  ])

  const borrowerBadge  = getBorrowerBadge(user._count.bookingsAsBorrower)
  const nextBadge      = getNextBorrowerBadge(user._count.bookingsAsBorrower)
  const activeReviewer = isActiveReviewer(lastReview?.createdAt)

  const avgRating   = reviewStats._avg.rating
  const reviewCount = reviewStats._count._all
  const totalDeals  = user._count.bookingsAsOwner + user._count.bookingsAsBorrower

  const fmtMemberSince = new Intl.DateTimeFormat("pt-BR", {
    month: "long", year: "numeric",
  }).format(user.createdAt)

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="border-b border-border bg-surface">
        <div className="container py-3">
          <Link
            href="/itens"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar para anúncios
          </Link>
        </div>
      </div>

      <main className="container py-8">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* ── Cabeçalho ── */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex-shrink-0">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.name}
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
                    {user.name[0]?.toUpperCase() ?? "U"}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-primary">{user.name}</h1>
                  {user.isVerified && (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                      ✓ Verificado
                    </span>
                  )}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {user.userType === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
                  </span>
                </div>

                <p className="mt-1 text-sm text-muted-foreground">Membro desde {fmtMemberSince}</p>

                {responseBadge && (
                  <p className="mt-1 text-xs font-medium text-brand">
                    ⚡ {responseBadge.label}
                  </p>
                )}

                {(user.city || user.state) && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    📍 {[user.neighborhood, user.city, user.state].filter(Boolean).join(", ")}
                  </p>
                )}

                {user.bio && (
                  <p className="mt-2 text-sm text-foreground">{user.bio}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Estatísticas ── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-surface p-4 text-center">
              <p className="text-2xl font-bold text-primary">{user._count.items}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {user._count.items === 1 ? "item anunciado" : "itens anunciados"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 text-center">
              <p className="text-2xl font-bold text-primary">{totalDeals}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {totalDeals === 1 ? "aluguel" : "aluguéis"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 text-center">
              {avgRating !== null ? (
                <>
                  <p className="text-2xl font-bold text-primary">{avgRating.toFixed(1)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">★ nota média</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-muted-foreground">—</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">sem avaliações</p>
                </>
              )}
            </div>
          </div>

          {/* ── P3-70/71/72/74: Reputação, badges e progresso ── */}
          {(borrowerBadge || activeReviewer || nextBadge || user.reputationPoints > 0) && (
            <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
              <h2 className="font-semibold text-foreground">Conquistas</h2>

              {/* Pontos de reputação */}
              {user.reputationPoints > 0 && (
                <p className="text-sm text-muted-foreground">
                  ⭐ <strong className="text-foreground">{user.reputationPoints}</strong> pontos de reputação
                </p>
              )}

              {/* Badges ativos */}
              <div className="flex flex-wrap gap-2">
                {borrowerBadge && (
                  <span className={`inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold ${borrowerBadge.color}`}>
                    {borrowerBadge.emoji} Locatário {borrowerBadge.label}
                  </span>
                )}
                {activeReviewer && (
                  <span className={`inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold ${ACTIVE_REVIEWER_BADGE.color}`}>
                    {ACTIVE_REVIEWER_BADGE.emoji} {ACTIVE_REVIEWER_BADGE.label}
                  </span>
                )}
              </div>

              {/* P3-74: Progress bar para próximo badge */}
              {nextBadge && (
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Próximo: {nextBadge.badge.emoji} {nextBadge.badge.label} ({nextBadge.badge.minBookings} aluguéis)</span>
                    <span>{nextBadge.progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={nextBadge.progress} aria-valuemin={0} aria-valuemax={100}>
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-500"
                      style={{ width: `${nextBadge.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Anúncios ativos ── */}
          {user.items.length > 0 && (
            <div>
              <h2 className="mb-4 font-semibold text-foreground">
                Anúncios de {user.name.split(" ")[0]}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {user.items.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* ── Avaliações recebidas ── */}
          {user.reviewsReceived.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="mb-4 font-semibold text-foreground">
                Avaliações recebidas
                {reviewCount > 5 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    (últimas 5 de {reviewCount})
                  </span>
                )}
              </h2>

              <div className="space-y-4">
                {user.reviewsReceived.map((review, i) => (
                  <div key={i} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex items-center gap-2 text-yellow-400">
                        <span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                        <ReviewSentiment sentiment={review.sentiment} />
                      </span>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("pt-BR", {
                          day: "2-digit", month: "short",
                        }).format(new Date(review.createdAt))}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="mt-1 text-sm text-foreground">{review.comment}</p>
                    )}
                    <ReviewDetails review={review} />
                    <p className="mt-1 text-xs text-muted-foreground">— {review.reviewer.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
