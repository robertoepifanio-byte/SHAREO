import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { FavoriteButton } from "@/components/items/FavoriteButton"
import { getOwnerResponseBadge } from "@/lib/ownerStats"
import { Gallery } from "./_Gallery"
import { PriceCalc } from "./_PriceCalc"
import { StickyBookingCTA } from "./_StickyBookingCTA"

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
    select: {
      title: true, description: true, city: true, state: true,
      images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
    },
  })
  if (!item) return { title: "Anúncio não encontrado" }

  const description = item.description.slice(0, 160)
  const location    = [item.city, item.state].filter(Boolean).join(", ")
  const ogImage     = item.images[0]?.url

  return {
    title:       item.title,
    description: `${description}${location ? ` — ${location}` : ""}`,
    openGraph: {
      title:       `${item.title} | ShareO`,
      description,
      type:        "website",
      locale:      "pt_BR",
      ...(ogImage && { images: [{ url: ogImage, width: 800, height: 600, alt: item.title }] }),
    },
    twitter: {
      card:        "summary_large_image",
      title:       item.title,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
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
        depositAmount: true, estimatedRetailPrice: true,
        city: true, state: true, neighborhood: true,
        isActive: true, ownerId: true, viewCount: true,
        voltage: true,
        requireIdVerification: true, requirePhone: true,
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

  const [responseBadge] = await Promise.all([
    getOwnerResponseBadge(item.ownerId),
  ])

  prisma.item.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {})

  const isOwner   = session?.user.id === item.ownerId
  const avgRating = item.reviews.length
    ? item.reviews.reduce((s, r) => s + r.rating, 0) / item.reviews.length
    : null

  const fmt = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

  const ownerInitial  = item.owner.name[0]?.toUpperCase() ?? "?"
  const ownerLocation = [item.owner.neighborhood, item.owner.city].filter(Boolean).join(", ")

  const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://shareo-rouge.vercel.app"
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type":    "Product",
    name:       item.title,
    description: item.description,
    image:      item.images.map((i) => i.url),
    category:   item.category.name,
    url:        `${BASE}/itens/${item.id}`,
    offers: {
      "@type":         "Offer",
      priceCurrency:   "BRL",
      price:           (item.pricePerDay / 100).toFixed(2),
      priceSpecification: {
        "@type":           "UnitPriceSpecification",
        price:             (item.pricePerDay / 100).toFixed(2),
        priceCurrency:     "BRL",
        unitText:          "DAY",
      },
      availability:    item.isActive
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Person",
        name:    item.owner.name,
      },
    },
    ...(avgRating && item._count.reviews > 0 && {
      aggregateRating: {
        "@type":       "AggregateRating",
        ratingValue:   avgRating.toFixed(1),
        reviewCount:   item._count.reviews,
        bestRating:    5,
        worstRating:   1,
      },
    }),
  }

  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
    />
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

      {/* CTA fixo mobile */}
      {!isOwner && (
        <StickyBookingCTA
          pricePerDay={item.pricePerDay}
          isLoggedIn={!!session}
          itemId={item.id}
        />
      )}

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
                {item.voltage && (
                  <span role="listitem" className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                    ⚡ {item.voltage}
                  </span>
                )}
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

              {/* Preço principal — exibido dentro do PriceCalc como tabs clicáveis */}

              {/* Caução */}
              {item.depositAmount != null && item.depositAmount > 0 && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span>
                    <strong>Caução:</strong> {fmt(item.depositAmount)} — retida no aluguel e devolvida após a devolução do item.
                  </span>
                </div>
              )}

              {/* Calculadora alugar vs comprar */}
              {item.estimatedRetailPrice != null && item.estimatedRetailPrice > 0 && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-brand/20 bg-brand/5 px-3 py-2 text-xs text-muted-foreground">
                  <span className="mt-0.5 shrink-0 text-base">💡</span>
                  <span>
                    Comprar este item custa <strong className="text-foreground">~{fmt(item.estimatedRetailPrice)}</strong>.
                    Alugar por 1 dia sai a{" "}
                    <strong className="text-brand">{fmt(item.pricePerDay)}</strong> —
                    economia de{" "}
                    <strong className="text-success">
                      {Math.round((1 - item.pricePerDay / item.estimatedRetailPrice) * 100)}%
                    </strong>{" "}
                    vs comprar novo.
                  </span>
                </div>
              )}

              {/* Requisitos para reserva */}
              {!isOwner && (item.requireIdVerification || item.requirePhone) && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-1.5 text-xs font-semibold text-amber-800">
                    📋 Requisitos do proprietário
                  </p>
                  <ul className="space-y-1">
                    {item.requireIdVerification && (
                      <li className="flex items-center gap-1.5 text-xs text-amber-700">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className="shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        Identidade verificada
                      </li>
                    )}
                    {item.requirePhone && (
                      <li className="flex items-center gap-1.5 text-xs text-amber-700">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className="shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        Telefone cadastrado
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Se for dono: botão de editar; senão: calculadora + CTA */}
              {isOwner ? (
                <Link
                  href={`/itens/${item.id}/editar`}
                  className="mb-2.5 block w-full rounded-lg border border-border py-3.5 text-center text-sm font-medium text-foreground hover:bg-background transition-colors"
                >
                  ✏️ Editar anúncio
                </Link>
              ) : (
                <div id="price-calc">
                  <PriceCalc
                    pricePerDay={item.pricePerDay}
                    pricePerWeek={item.pricePerWeek}
                    pricePerMonth={item.pricePerMonth}
                    depositAmount={item.depositAmount}
                    itemId={item.id}
                    isLoggedIn={!!session}
                  />
                </div>
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
                  {responseBadge && (
                    <p className="mt-0.5 text-xs font-medium text-brand">
                      ⚡ {responseBadge.label}
                    </p>
                  )}
                </div>
                <span className="text-lg text-muted-foreground" aria-hidden="true">›</span>
              </Link>

              {/* ─── Trust Box ─── */}
              <div className="mt-4 rounded-lg border border-brand/20 bg-brand/5 p-4">
                <p className="mb-3 text-xs font-bold text-brand">🔒 Sua locação está protegida</p>
                <ul className="space-y-2">
                  {[
                    "Pagamento liberado só após confirmação da retirada",
                    "Cancelamento gratuito até 24h antes",
                    "Item protegido durante a locação",
                    "Suporte ShareO disponível 7 dias por semana",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-foreground">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#007B3C" strokeWidth="2.5" className="mt-0.5 shrink-0" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
    </>
  )
}
