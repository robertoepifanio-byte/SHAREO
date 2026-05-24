import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { ItemCard } from "@/components/items/ItemCard"

export const metadata: Metadata = {
  title:       "Explorar anúncios",
  description: "Encontre itens para alugar perto de você no ShareO.",
}

interface SearchParams {
  search?:     string
  categoryId?: string
  city?:       string
  state?:      string
  page?:       string
}

type Props = { searchParams: Promise<SearchParams> }

const PAGE_SIZE = 20

export default async function ExplorarPage({ searchParams }: Props) {
  const sp         = await searchParams
  const page       = Math.max(1, Number(sp.page ?? 1))
  const search     = sp.search?.trim()
  const categoryId = sp.categoryId
  const city       = sp.city?.trim()
  const state      = sp.state?.trim().toUpperCase()
  const skip       = (page - 1) * PAGE_SIZE

  const where = {
    isActive:   true,
    isApproved: true,
    deletedAt:  null,
    ...(search && {
      OR: [
        { title:       { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(categoryId && { categoryId }),
    ...(city  && { city:  { contains: city,  mode: "insensitive" as const } }),
    ...(state && { state }),
  }

  const [items, total, categories] = await Promise.all([
    prisma.item.findMany({
      where,
      skip,
      take:    PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      select: {
        id:           true,
        title:        true,
        pricePerDay:  true,
        pricePerWeek: true,
        condition:    true,
        city:         true,
        state:        true,
        neighborhood: true,
        isActive:     true,
        category:     { select: { name: true } },
        owner:        { select: { name: true, isVerified: true } },
        images:       { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
        _count:       { select: { reviews: true, favorites: true } },
      },
    }),
    prisma.item.count({ where }),
    prisma.category.findMany({
      where:   { parentId: null },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function buildUrl(overrides: { search?: string; categoryId?: string; city?: string; state?: string; page?: number }) {
    const params = new URLSearchParams()
    const merged = { search, categoryId, city, state, page, ...overrides }
    if (merged.search)              params.set("search",     merged.search)
    if (merged.categoryId)          params.set("categoryId", merged.categoryId)
    if (merged.city)                params.set("city",       merged.city)
    if (merged.state)               params.set("state",      merged.state)
    if (merged.page && merged.page > 1) params.set("page",  String(merged.page))
    const qs = params.toString()
    return `/itens${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container py-8">

        {/* Chips de categoria — scroll horizontal */}
        {categories.length > 0 && (
          <div className="mb-6 flex gap-2 overflow-x-auto scrollbar-hide pb-1" role="list" aria-label="Filtrar por categoria">
            <Link
              href="/itens"
              role="listitem"
              className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                !categoryId
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border bg-surface text-muted-foreground hover:border-brand/40"
              }`}
            >
              Todos
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={buildUrl({ categoryId: cat.id, page: 1 })}
                role="listitem"
                className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                  categoryId === cat.id
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border bg-surface text-muted-foreground hover:border-brand/40"
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        {/* Filtros */}
        <form method="GET" action="/itens" className="mb-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <label htmlFor="search" className="mb-1.5 block text-sm font-medium text-foreground">
                Buscar
              </label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  id="search"
                  name="search"
                  type="search"
                  defaultValue={search ?? ""}
                  placeholder="Furadeira, câmera, mesas..."
                  className="h-11 w-full rounded-md border border-input bg-surface pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
                />
              </div>
            </div>

            <div className="md:w-48">
              <label htmlFor="categoryId" className="mb-1.5 block text-sm font-medium text-foreground">
                Categoria
              </label>
              <select
                id="categoryId"
                name="categoryId"
                defaultValue={categoryId ?? ""}
                className="h-11 w-full appearance-none rounded-md border border-input bg-surface px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
              >
                <option value="">Todas</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="md:w-40">
              <label htmlFor="city" className="mb-1.5 block text-sm font-medium text-foreground">
                Cidade
              </label>
              <input
                id="city"
                name="city"
                type="text"
                defaultValue={city ?? ""}
                placeholder="Natal"
                className="h-11 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
              />
            </div>

            <button
              type="submit"
              className="h-11 px-6 rounded-md bg-brand text-sm font-medium text-white hover:bg-brand-hover transition-colors"
            >
              Buscar
            </button>

            {(search || categoryId || city || state) && (
              <Link
                href="/itens"
                className="h-11 px-4 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-background transition-colors inline-flex items-center"
              >
                Limpar
              </Link>
            )}
          </div>
        </form>

        {/* Resultado */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total === 0 ? "Nenhum anúncio encontrado" : `${total} anúncio${total !== 1 ? "s" : ""} encontrado${total !== 1 ? "s" : ""}`}
          </p>
        </div>

        {items.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                {page > 1 && (
                  <Link
                    href={buildUrl({ page: page - 1 })}
                    className="h-10 px-4 rounded-md border border-border text-sm text-foreground hover:bg-background transition-colors inline-flex items-center"
                  >
                    ← Anterior
                  </Link>
                )}
                <span className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={buildUrl({ page: page + 1 })}
                    className="h-10 px-4 rounded-md border border-border text-sm text-foreground hover:bg-background transition-colors inline-flex items-center"
                  >
                    Próxima →
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <h3 className="mb-2 font-semibold text-primary">Nenhum resultado</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Tente outros termos ou remova os filtros.
            </p>
            <Link href="/itens" className="text-sm text-brand hover:underline">
              Ver todos os anúncios
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
