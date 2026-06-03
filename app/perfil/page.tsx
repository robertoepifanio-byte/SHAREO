import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { DeleteAccountButton } from "./_DeleteAccountButton"
import { UpgradePjForm } from "./_UpgradePjForm"
import { ReferralSection } from "./_ReferralSection"
import { IdVerification }  from "./_IdVerification"
import { getReferralStats } from "@/lib/referral"
import Link from "next/link"

export const metadata: Metadata = { title: "Meu Perfil" }

const REVIEW_TYPE_LABEL: Record<string, string> = {
  ITEM:     "sobre o item",
  OWNER:    "sobre você como proprietário",
  BORROWER: "sobre você como locatário",
}

export default async function ProfilePage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/perfil")

  const userId = session.user.id

  const [user, reviewStats, referralStats] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: {
        id:                   true,
        name:                 true,
        email:                true,
        bio:                  true,
        phone:                true,
        city:                 true,
        state:                true,
        neighborhood:         true,
        avatarUrl:            true,
        slug:                 true,
        userType:             true,
        isVerified:           true,
        idVerificationStatus: true,
        idRejectionReason:    true,
        createdAt:            true,
        _count: {
          select: {
            items:              { where: { status: { in: ["AVAILABLE", "PAUSED", "DRAFT"] }, deletedAt: null } },
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
    getReferralStats(userId),
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

            {/* Link da vitrine (PJ) / CTA upgrade (PF) */}
            {user.userType === "PJ" ? (
              <div className="mt-4 flex items-center gap-3">
                <Link
                  href={`/loja/${user.slug ?? user.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:bg-background transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                  Ver minha vitrine
                </Link>
                <span className="text-xs text-muted-foreground">
                  shareo.com.br/loja/{user.slug ?? user.id}
                </span>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-brand/20 bg-brand/5 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                    PJ
                  </span>
                  <p className="text-sm font-semibold text-foreground">Desbloqueie recursos para negócios</p>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Vitrine personalizada, analytics avançado e importação em massa de itens.
                </p>
                <UpgradePjForm />
              </div>
            )}

            <div className="mt-4">
              <Link
                href="/perfil/editar"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-foreground hover:bg-background transition-colors"
              >
                ✏️ Editar perfil
              </Link>
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

          {/* ── Programa de Indicação ── */}
          <ReferralSection stats={referralStats} />

          {/* ── Privacidade & dados (LGPD) ── */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="mb-4 font-semibold text-foreground">Privacidade e dados</h2>

            {/* Verificação de identidade */}
            <IdVerification
              status={user.idVerificationStatus}
              rejectionReason={user.idRejectionReason}
            />

            <div className="h-px bg-border my-4" />


            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Exportar meus dados</p>
                <p className="text-xs text-muted-foreground">
                  Baixe um arquivo JSON com todos os seus dados (LGPD art. 20).
                </p>
              </div>
              <a
                href="/api/users/me/export"
                download
                className="inline-flex h-11 items-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground hover:bg-background transition-colors"
              >
                Exportar
              </a>
            </div>

            <div className="h-px bg-border my-4" />

            <DeleteAccountButton />
          </div>

        </div>
      </main>
    </div>
  )
}
