import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"

type Props = { params: Promise<{ id: string }> }

const CONDITION_LABEL: Record<string, string> = {
  NEW:       "Novo",
  EXCELLENT: "Excelente",
  GOOD:      "Bom",
  FAIR:      "Regular",
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const item = await prisma.item.findFirst({
    where:  { id, deletedAt: null },
    select: { title: true, description: true },
  })
  if (!item) return { title: "Anúncio não encontrado" }
  return {
    title:       item.title,
    description: item.description.slice(0, 160),
  }
}

export default async function ItemDetailPage({ params }: Props) {
  const { id } = await params

  const [item, session] = await Promise.all([
    prisma.item.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: { select: { name: true, slug: true } },
        owner:    {
          select: {
            id: true, name: true, avatarUrl: true, isVerified: true,
            city: true, state: true, createdAt: true,
          },
        },
        images:  { orderBy: { order: "asc" } },
        reviews: {
          where:   { reviewType: "ITEM" },
          select:  { id: true, rating: true, comment: true, reviewer: { select: { name: true } }, createdAt: true },
          orderBy: { createdAt: "desc" },
          take:    8,
        },
        _count: { select: { reviews: true, favorites: true } },
      },
    }),
    auth(),
  ])

  if (!item) notFound()

  // Fire-and-forget view count
  prisma.item.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {})

  const isOwner  = session?.user.id === item.ownerId
  const price    = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.pricePerDay / 100)
  const avgRating = item.reviews.length
    ? item.reviews.reduce((s, r) => s + r.rating, 0) / item.reviews.length
    : null

  const memberSince = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(item.owner.createdAt))

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container py-8">
        <div className="mx-auto max-w-4xl">

          {/* Breadcrumb */}
          <nav className="mb-4 flex items-center gap-2 text-xs text-muted-foreground" aria-label="Navegação">
            <Link href="/itens" className="hover:text-foreground transition-colors">Explorar</Link>
            <span aria-hidden="true">›</span>
            <span className="text-foreground">{item.category.name}</span>
          </nav>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">

            {/* Coluna esquerda */}
            <div className="space-y-6">

              {/* Galeria */}
              {item.images.length > 0 ? (
                <div className="space-y-2">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
                    <Image
                      src={item.images[0].url}
                      alt={item.title}
                      fill
                      priority
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 60vw"
                    />
                  </div>
                  {item.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {item.images.slice(1).map((img) => (
                        <div key={img.id} className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                          <Image src={img.url} alt="" fill className="object-cover" sizes="80px" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-muted text-muted-foreground/30">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
              )}

              {/* Título e badges */}
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {item.category.name}
                  </span>
                  <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                    {CONDITION_LABEL[item.condition] ?? item.condition}
                  </span>
                  {!item.isActive && (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">Pausado</span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-primary">{item.title}</h1>
                <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    {item.neighborhood ? `${item.neighborhood}, ` : ""}{item.city}, {item.state}
                  </span>
                  {avgRating && (
                    <span className="flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#F97316" stroke="#F97316" strokeWidth="1" aria-hidden="true">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                      {avgRating.toFixed(1)} ({item._count.reviews})
                    </span>
                  )}
                  <span>{item.viewCount} visualizações</span>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <h2 className="mb-3 font-semibold text-primary">Descrição</h2>
                <p className="whitespace-pre-line text-sm text-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Avaliações */}
              {item.reviews.length > 0 && (
                <div>
                  <h2 className="mb-4 font-semibold text-primary">
                    Avaliações ({item._count.reviews})
                  </h2>
                  <div className="space-y-4">
                    {item.reviews.map((review) => (
                      <div key={review.id} className="rounded-lg border border-border bg-surface p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">
                            {review.reviewer.name}
                          </span>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <svg
                                key={i}
                                width="14" height="14"
                                viewBox="0 0 24 24"
                                fill={i < review.rating ? "#F97316" : "none"}
                                stroke="#F97316"
                                strokeWidth="1"
                                aria-hidden="true"
                              >
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                              </svg>
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground">
                          {new Intl.DateTimeFormat("pt-BR").format(new Date(review.createdAt))}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Coluna direita — card de ação */}
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                <div className="mb-4">
                  <p className="text-3xl font-bold text-brand">
                    {price}
                    <span className="text-base font-normal text-muted-foreground">/dia</span>
                  </p>
                  {item.pricePerWeek && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.pricePerWeek / 100)}/semana
                    </p>
                  )}
                  {item.pricePerMonth && (
                    <p className="text-sm text-muted-foreground">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.pricePerMonth / 100)}/mês
                    </p>
                  )}
                  {item.depositAmount && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      + caução de {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.depositAmount / 100)}
                    </p>
                  )}
                </div>

                {isOwner ? (
                  <Link
                    href={`/itens/${item.id}/editar`}
                    className="block w-full rounded-md border border-border py-3 text-center text-sm font-medium text-foreground hover:bg-background transition-colors"
                  >
                    Editar anúncio
                  </Link>
                ) : session ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-md bg-brand py-3 text-sm font-medium text-white opacity-50 cursor-not-allowed"
                    title="Disponível em breve"
                  >
                    Solicitar locação
                  </button>
                ) : (
                  <Link
                    href={`/login?callbackUrl=/itens/${item.id}`}
                    className="block w-full rounded-md bg-brand py-3 text-center text-sm font-medium text-white hover:bg-brand-hover transition-colors"
                  >
                    Entrar para alugar
                  </Link>
                )}

                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Sem cobrança até a confirmação
                </p>
              </div>

              {/* Card do anunciante */}
              <div className="rounded-xl border border-border bg-surface p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-lg font-bold text-brand">
                    {item.owner.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-primary">{item.owner.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Membro desde {memberSince}
                    </p>
                    {item.owner.isVerified && (
                      <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-success">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Verificado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
