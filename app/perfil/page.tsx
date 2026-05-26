import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { ProfileForm } from "./_ProfileForm"

export const metadata: Metadata = { title: "Meu Perfil — ShareO" }

const REVIEW_TYPE_LABEL: Record<string, string> = {
  ITEM:     "sobre o item",
  OWNER:    "sobre você como proprietário",
  BORROWER: "sobre você como locatário",
}

export default async function ProfilePage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/perfil")

  const userId = session.user.id

  const [user, reviewStats] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: {
        id:           true,
        name:         true,
        email:        true,
        bio:          true,
        phone:        true,
        city:         true,
        state:        true,
        neighborhood: true,
        avatarUrl:    true,
        userType:     true,
        isVerified:   true,
        createdAt:    true,
        _count: {
          select: {
            items:              { where: { isActive: true, deletedAt: null } },
            bookingsAsBorrower: { where: { status: { in: ["RETURNED", "COMPLETED"] } } },
            bookingsAsOwner:    { where: { status: { in: ["RETURNED", "COMPLETED"] } } },
          },
        },
        reviewsReceived: {
          select: {
            rating:     true,
            comment:    true,
            reviewType: true,
            reviewer:   { select: { name: true } },
            createdAt:  true,
          },
          orderBy: { createdAt: "desc" },
          take:    5,
        },
      },
    }),
    prisma.review.aggregate({
      where: { revieweeId: userId },
      _avg:  { rating: true },
      _count: { _all: true },
    }),
  ])

  if (!user) redirect("/login")

  const avgRating    = reviewStats._avg.rating
  const reviewCount  = reviewStats._count._all
  const totalBookings = user._count.bookingsAsBorrower + user._count.bookingsAsOwner

  const fmtMemberSince = new Intl.DateTimeFormat("pt-BR", {
    month: "long", year: "numeric",
  }).format(user.createdAt)

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container py-8">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* ── Cabeçalho do perfil ── */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">

              {/* Avatar */}
              <div className="flex-shrink-0">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
                    {user.name[0]?.toUpperCase() ?? "U"}
                  </div>
                )}
              </div>

              {/* Info */}
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

                <p className="mt-1 text-sm text-muted-foreground">
                  {user.email}
                </p>
                <p className="text-sm text-muted-foreground">
                  Membro desde {fmtMemberSince}
                </p>

                {(user.city || user.state) && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    📍 {[user.neighborhood, user.city, user.state].filter(Boolean).join(", ")}
                  </p>
                )}

                {user.bio && (
                  <p className="mt-2 text-sm text-foreground">{user.bio}</p>
                )}

                {user.phone && (
                  <p className="mt-1 text-sm text-muted-foreground">📞 {user.phone}</p>
                )}
              </div>
            </div>

            <div className="mt-5 border-t border-border pt-5">
              <ProfileForm
                user={{
                  name:         user.name,
                  bio:          user.bio,
                  phone:        user.phone,
                  city:         user.city,
                  state:        user.state,
                  neighborhood: user.neighborhood,
                  avatarUrl:    user.avatarUrl,
                }}
              />
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
              <p className="text-2xl font-bold text-primary">{totalBookings}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {totalBookings === 1 ? "aluguel" : "aluguéis"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 text-center">
              {avgRating !== null ? (
                <>
                  <p className="text-2xl font-bold text-primary">{avgRating.toFixed(1)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    ★ nota média ({reviewCount})
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-muted-foreground">—</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">sem avaliações</p>
                </>
              )}
            </div>
          </div>

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
                  <div
                    key={i}
                    className="border-b border-border pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-yellow-400">
                          {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {REVIEW_TYPE_LABEL[review.reviewType] ?? review.reviewType}
                        </span>
                      </div>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("pt-BR", {
                          day: "2-digit", month: "short",
                        }).format(new Date(review.createdAt))}
                      </span>
                    </div>

                    {review.comment && (
                      <p className="mt-1 text-sm text-foreground">{review.comment}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      — {review.reviewer.name}
                    </p>
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
