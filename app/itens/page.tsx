import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { ItemCard } from "@/components/items/ItemCard"
import { CategoryIcon } from "@/components/ui/CategoryIcon"
import { SortSelect } from "./_SortSelect"
import { ItemsMapLoader } from "@/components/items/ItemsMapLoader"
import type { ItemPin } from "@/components/items/ItemsMap"
import { DistanceFilter } from "./_DistanceFilter"
import { FilterTrigger } from "./_FilterTrigger"
import { haversineKm } from "@/lib/haversine"

export const metadata: Metadata = {
  title:       "Explorar anúncios",
  description: "Encontre itens para alugar perto de você no ShareO.",
}

interface SearchParams {
  search?:    string
  categoryId?: string
  city?:      string
  sort?:      string
  priceMax?:  string
  minRating?: string
  page?:      string
  dist?:      string
  ulat?:      string
  ulng?:      string
}

type Props = { searchParams: Promise<SearchParams> }

const PAGE_SIZE = 20



function getOrderBy(sort?: string) {
  switch (sort) {
    case "price_asc":  return { pricePerDay: "asc"  as const }
    case "price_desc": return { pricePerDay: "desc" as const }
    case "views":      return { viewCount:   "desc" as const }
    default:           return { createdAt:   "desc" as const }
  }
}

export default async function ExplorarPage({ searchParams }: Props) {
  const sp         = await searchParams
  const page       = Math.max(1, Number(sp.page ?? 1))
  const search     = sp.search?.trim() || undefined
  const categoryId = sp.categoryId    || undefined
  const city       = sp.city?.trim()  || undefined
  const sort       = sp.sort          || undefined
  const priceMaxR  = sp.priceMax ? Number(sp.priceMax) : undefined // reais
  const dist       = sp.dist     || undefined
  const userLat    = sp.ulat ? Number(sp.ulat) : undefined
  const userLng    = sp.ulng ? Number(sp.ulng) : undefined
  const minRating  = sp.minRating ? Number(sp.minRating) : undefined
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
    ...(city       && { city: { contains: city, mode: "insensitive" as const } }),
    ...(priceMaxR  && { pricePerDay: { lte: priceMaxR * 100 } }),
    ...(minRating  && {
      reviews: { some: { reviewType: "ITEM" as const } },
    }),
  }

  // Se o texto de busca bate exatamente com um nome de categoria, redireciona para filtro por categoria
  if (search && !categoryId) {
    const cats = await prisma.category.findMany({
      where:   { parentId: null },
      select:  { id: true, name: true },
    })
    const match = cats.find((c) => c.name.toLowerCase() === search.toLowerCase())
    if (match) {
      const params = new URLSearchParams({ categoryId: match.id })
      if (sort)       params.set("sort",     sort)
      if (sp.priceMax) params.set("priceMax", sp.priceMax)
      redirect(`/itens?${params.toString()}`)
    }
  }

  const useDistFilter = !!(dist && userLat !== undefined && userLng !== undefined)

  const [rawItems, total, categories] = await Promise.all([
    prisma.item.findMany({
      where,
      ...(useDistFilter ? {} : { skip, take: PAGE_SIZE }),
      orderBy: getOrderBy(sort),
      select: {
        id: true, title: true, pricePerDay: true, pricePerWeek: true,
        condition: true, city: true, state: true, neighborhood: true, isActive: true,
        latitude: true, longitude: true,
        category: { select: { name: true } },
        owner:    { select: { name: true, isVerified: true } },
        images:   { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
        _count:   { select: { reviews: true, favorites: true } },
        reviews:  { select: { rating: true }, where: { reviewType: "ITEM" } },
      },
    }),
    prisma.item.count({ where }),
    prisma.category.findMany({
      where:   { parentId: null },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  // Filtros em JS: distância e avaliação mínima
  function avgRating(i: { reviews: { rating: number }[] }) {
    if (!i.reviews.length) return 0
    return i.reviews.reduce((s, r) => s + r.rating, 0) / i.reviews.length
  }

  function passesJsFilters(i: typeof rawItems[number]) {
    if (useDistFilter) {
      if (!i.latitude || !i.longitude || (i.latitude === 0 && i.longitude === 0)) return false
      if (haversineKm(userLat!, userLng!, i.latitude, i.longitude) > Number(dist)) return false
    }
    if (minRating && avgRating(i) < minRating) return false
    return true
  }

  const useJsFilter = useDistFilter || !!minRating
  const jsFiltered  = useJsFilter ? rawItems.filter(passesJsFilters) : rawItems

  const items        = useJsFilter ? jsFiltered.slice(skip, skip + PAGE_SIZE) : rawItems
  const filteredTotal = useJsFilter ? jsFiltered.length : total

  const totalPages = Math.ceil(filteredTotal / PAGE_SIZE)
  const hasFilters = !!(search || categoryId || city || priceMaxR || dist || minRating)

  function buildUrl(overrides: {
    search?: string | undefined
    categoryId?: string | undefined
    sort?: string | undefined
    priceMax?: string | undefined
    page?: number
  }) {
    const params  = new URLSearchParams()
    const merged  = {
      search,
      categoryId,
      city,
      sort,
      priceMax: sp.priceMax,
      page,
      ...overrides,
    }
    if (merged.search)     params.set("search",     merged.search)
    if (merged.categoryId) params.set("categoryId", merged.categoryId)
    if (merged.city)       params.set("city",       merged.city)
    if (merged.sort)       params.set("sort",       merged.sort)
    if (merged.priceMax)   params.set("priceMax",   String(merged.priceMax))
    if (sp.dist)           params.set("dist",       sp.dist)
    if (sp.ulat)           params.set("ulat",       sp.ulat)
    if (sp.ulng)           params.set("ulng",       sp.ulng)
    if (sp.minRating)      params.set("minRating",  sp.minRating)
    if (merged.page && merged.page > 1) params.set("page", String(merged.page))
    const qs = params.toString()
    return `/itens${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container py-6">

        {/* ─── BARRA DE BUSCA ─── */}
        <form method="GET" action="/itens" className="mb-4 flex gap-2" role="search">
          {/* hidden: preserva filtros ativos ao fazer nova busca */}
          {categoryId && <input type="hidden" name="categoryId" value={categoryId} />}
          {sort       && <input type="hidden" name="sort"       value={sort} />}
          {sp.priceMax && <input type="hidden" name="priceMax"  value={sp.priceMax} />}

          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <label htmlFor="search-field" className="sr-only">Buscar itens</label>
            <input
              id="search-field"
              name="search"
              type="search"
              defaultValue={search ?? ""}
              placeholder="Buscar itens…"
              className="h-11 w-full rounded-lg border border-input bg-surface pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-white hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Buscar
          </button>
        </form>

        {/* ─── CHIPS DE CATEGORIA ─── */}
        {categories.length > 0 && (
          <div
            className="mb-5 flex gap-2 overflow-x-auto scrollbar-hide pb-1"
            role="list"
            aria-label="Filtrar por categoria"
          >
            <Link
              href={buildUrl({ categoryId: undefined, page: 1 })}
              role="listitem"
              className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                !categoryId
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border bg-surface text-muted-foreground hover:border-brand/40 hover:text-foreground"
              }`}
            >
              Todos
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={buildUrl({ categoryId: cat.id, page: 1 })}
                role="listitem"
                className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  categoryId === cat.id
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border bg-surface text-muted-foreground hover:border-brand/40 hover:text-foreground"
                }`}
              >
                <CategoryIcon name={cat.name} size={52} />
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        {/* ─── FILTROS MOBILE (bottom sheet) ─── */}
        <FilterTrigger hasFilters={hasFilters}>
          <FilterForm
            categories={categories}
            categoryId={categoryId}
            priceMax={sp.priceMax}
            search={search}
            sort={sort}
            dist={sp.dist}
            userLat={sp.ulat}
            userLng={sp.ulng}
            minRating={sp.minRating}
          />
        </FilterTrigger>

        {/* ─── LAYOUT: SIDEBAR + RESULTADOS ─── */}
        <div className="flex gap-6 items-start">

          {/* Sidebar de filtros — visível apenas em ≥1024px */}
          <aside className="hidden lg:block w-60 flex-shrink-0 sticky top-20" aria-label="Painel de filtros">
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="mb-4 text-[15px] font-bold text-primary">Filtros</p>
              <FilterForm
                key={`sidebar-${categoryId ?? "all"}`}
                categories={categories}
                categoryId={categoryId}
                priceMax={sp.priceMax}
                search={search}
                sort={sort}
                dist={sp.dist}
                userLat={sp.ulat}
                userLng={sp.ulng}
              />
            </div>
          </aside>

          {/* Área de resultados */}
          <div className="min-w-0 flex-1">

            {/* Resultado count + ordenação */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {total === 0
                  ? "Nenhum anúncio encontrado"
                  : `${total} anúncio${total !== 1 ? "s" : ""} encontrado${total !== 1 ? "s" : ""}`}
              </p>
              <Suspense fallback={
                <select disabled className="h-10 rounded-lg border border-input bg-surface px-3 text-sm opacity-50">
                  <option>Mais próximos</option>
                </select>
              }>
                <SortSelect current={sort} />
              </Suspense>
            </div>

            {/* Mapa */}
            {items.length > 0 && (() => {
              const pins: ItemPin[] = items
                .filter((i) => i.latitude != null && i.longitude != null && (i.latitude !== 0 || i.longitude !== 0))
                .map((i) => ({
                  id:          i.id,
                  title:       i.title,
                  pricePerDay: i.pricePerDay,
                  lat:         i.latitude!,
                  lng:         i.longitude!,
                }))
              return pins.length > 0 ? (
                <div className="mb-4 overflow-hidden rounded-xl border border-border">
                  <ItemsMapLoader items={pins} height={260} />
                </div>
              ) : null
            })()}

            {/* Grade de itens */}
            {items.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
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
                        className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm text-foreground hover:bg-background transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
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
                        className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm text-foreground hover:bg-background transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
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
                <Link href="/itens" className="text-sm font-medium text-brand hover:underline">
                  Ver todos os anúncios
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

/* ─── Sub-componente: formulário de filtros (reutilizado mobile e desktop) ─── */
function FilterForm({
  categories,
  categoryId,
  priceMax,
  search,
  sort,
  dist,
  userLat,
  userLng,
  minRating,
}: {
  categories: { id: string; name: string }[]
  categoryId?: string
  priceMax?:   string
  search?:     string
  sort?:       string
  dist?:       string
  userLat?:    string
  userLng?:    string
  minRating?:  string
}) {
  return (
    <form method="GET" action="/itens" className="space-y-5">
      {search   && <input type="hidden" name="search" value={search} />}
      {sort     && <input type="hidden" name="sort"   value={sort} />}
      {userLat  && <input type="hidden" name="ulat"   value={userLat} />}
      {userLng  && <input type="hidden" name="ulng"   value={userLng} />}

      {/* Categoria */}
      <fieldset>
        <legend className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Categoria
        </legend>
        <div className="space-y-0.5">
          <label className="flex cursor-pointer items-center gap-2 py-1 text-sm text-foreground">
            <input
              type="radio"
              name="categoryId"
              value=""
              defaultChecked={!categoryId}
              className="accent-brand"
            />
            Todas
          </label>
          {categories.map((cat) => (
            <label key={cat.id} className="flex cursor-pointer items-center gap-2 py-1 text-sm text-foreground">
              <input
                type="radio"
                name="categoryId"
                value={cat.id}
                defaultChecked={categoryId === cat.id}
                className="accent-brand"
              />
              {cat.name}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Preço máximo / dia */}
      <fieldset>
        <legend className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Preço máx./dia
        </legend>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">R$0</span>
          <input
            type="range"
            name="priceMax"
            min="0"
            max="500"
            step="10"
            defaultValue={priceMax ?? "500"}
            aria-label="Preço máximo por dia em reais"
            className="flex-1 accent-brand"
          />
          <span className="min-w-[44px] text-right text-xs font-semibold text-foreground">
            R${priceMax ?? "500"}
          </span>
        </div>
      </fieldset>

      {/* Distância — componente cliente com geolocalização */}
      <Suspense fallback={null}>
        <DistanceFilter dist={dist} userLat={userLat} userLng={userLng} />
      </Suspense>

      {/* Avaliação mínima */}
      <fieldset>
        <legend className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Avaliação mínima
        </legend>
        <div className="space-y-0.5">
          {[
            { label: "★★★★★ 5 estrelas", value: "5" },
            { label: "★★★★+ 4+",          value: "4" },
            { label: "★★★+  3+",           value: "3" },
          ].map((opt) => (
            <label key={opt.value} className="flex cursor-pointer items-center gap-2 py-1 text-sm text-foreground">
              <input
                type="radio"
                name="minRating"
                value={opt.value}
                defaultChecked={minRating === opt.value}
                className="accent-brand"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        className="w-full h-11 rounded-lg bg-brand text-sm font-semibold text-white hover:opacity-90 transition-opacity"
      >
        Aplicar filtros
      </button>
    </form>
  )
}
