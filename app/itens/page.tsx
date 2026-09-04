import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { AppHeader } from "@/components/layout/AppHeader"
import { ItemCard } from "@/components/items/ItemCard"
import { CategoryIcon } from "@/components/ui/CategoryIcon"
import { SortSelect } from "./_SortSelect"
import { ItemsMapLoader } from "@/components/items/ItemsMapLoader"
import type { ItemPin } from "@/components/items/ItemsMap"
import { FilterForm } from "./_FilterForm"
import { FilterTrigger } from "./_FilterTrigger"
import { ActiveFilterChips } from "./_ActiveFilterChips"
import { haversineKm } from "@/lib/haversine"
import { getUserCoords, BRAZIL_DEFAULT } from "@/lib/userLocation"
import { getSearchMaxDistanceKm } from "@/lib/platform-config"
import { MapToggle } from "./_MapToggle"
import { PullToRefresh } from "@/components/items/PullToRefresh"
import { FloatingCTA } from "@/components/items/FloatingCTA"
import { TrackEvent } from "@/components/analytics/TrackEvent"
import { RentBanner } from "./_RentBanner"

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
  view?:      string
  intent?:    string
}

type Props = { searchParams: Promise<SearchParams> }

const PAGE_SIZE = 20



function getOrderBy(sort?: string) {
  // id como tiebreaker garante ordenação estável entre queries (evita duplicatas em offset pagination)
  const id = { id: "asc" as const }
  switch (sort) {
    case "price_asc":  return [{ pricePerDay: "asc"  as const }, id]
    case "price_desc": return [{ pricePerDay: "desc" as const }, id]
    case "views":      return [{ viewCount:   "desc" as const }, id]
    case "rented":     return [{ bookingsCount: "desc" as const }, id]
    default:           return [{ createdAt:   "desc" as const }, id]
  }
}

export default async function ExplorarPage({ searchParams }: Props) {
  const [sp, session] = await Promise.all([
    searchParams,
    auth().catch(() => null),
  ])
  const profileCoords = await getUserCoords(session?.user?.id)
  const page       = Math.max(1, Number(sp.page ?? 1))
  const search     = sp.search?.trim() || undefined
  const categoryId = sp.categoryId    || undefined
  const city       = sp.city?.trim()  || undefined
  const sort       = sp.sort          || undefined
  const priceMaxR  = sp.priceMax ? Number(sp.priceMax) : undefined // reais
  const dist       = sp.dist     || undefined
  // Sem GPS na URL, a distância é medida a partir da localização do perfil
  const userLat    = sp.ulat ? Number(sp.ulat) : (dist ? profileCoords?.lat : undefined)
  const userLng    = sp.ulng ? Number(sp.ulng) : (dist ? profileCoords?.lng : undefined)
  // Centro do mapa: com filtro de distância ativo, centra na ORIGEM do filtro (GPS da URL
  // ou localização do perfil); senão no perfil; senão no Brasil. (Antes ignorava o GPS → mapa estático.)
  const userLoc =
    userLat !== undefined && userLng !== undefined && Number.isFinite(userLat) && Number.isFinite(userLng)
      ? { lat: userLat as number, lng: userLng as number, zoom: 13 }
      : profileCoords
        ? { lat: profileCoords.lat, lng: profileCoords.lng, zoom: profileCoords.source === "profile" ? 15 : 12 }
        : BRAZIL_DEFAULT
  const minRating  = sp.minRating ? Number(sp.minRating) : undefined
  const skip       = (page - 1) * PAGE_SIZE

  const where = {
    status:     "AVAILABLE" as const,
    isApproved: true,
    deletedAt:  null,
    images:     { some: {} },
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
    }).catch(() => [] as { id: string; name: string }[])
    const match = cats.find((c) => c.name.toLowerCase() === search.toLowerCase())
    if (match) {
      const params = new URLSearchParams({ categoryId: match.id })
      if (sort)       params.set("sort",     sort)
      if (sp.priceMax) params.set("priceMax", sp.priceMax)
      redirect(`/itens?${params.toString()}`)
    }
  }

  /*
   * Ordenação por proximidade (sort=nearest).
   *
   * Antes deste bloco, o rótulo "Mais próximos" apontava para `sort=recent` e
   * ordenava por `createdAt desc` — o nome mentia. Agora ele ordena de fato pela
   * distância até o visitante, e recorta pelo teto que o admin define em
   * /admin/itens (default 50 km).
   *
   * O teto vale SÓ aqui: nas outras ordenações o catálogo inteiro continua
   * visível, senão quem mora longe de qualquer anunciante veria vitrine vazia.
   *
   * Precisa de origem. Sem GPS na URL e sem localização de perfil, `nearestOrigin`
   * fica indefinido e a página pede a localização (ver _SortSelect) em vez de
   * fingir uma ordem que não pode calcular.
   */
  const wantsNearest   = sort === "nearest"
  const nearestLat     = sp.ulat ? Number(sp.ulat) : profileCoords?.lat
  const nearestLng     = sp.ulng ? Number(sp.ulng) : profileCoords?.lng
  const hasNearestOrigin = wantsNearest
    && Number.isFinite(nearestLat) && Number.isFinite(nearestLng)
  const nearestMaxKm   = wantsNearest ? await getSearchMaxDistanceKm() : 0

  const useDistFilter = !!(dist && userLat !== undefined && userLng !== undefined)
  // useJsFilter calculado antes da query para controlar skip/take no Prisma.
  // Quando qualquer filtro JS está ativo, Prisma busca todos os itens para que
  // a paginação JS opere sobre o conjunto completo — evita dupla paginação.
  // A ordenação por proximidade também é JS (Haversine pós-fetch), então entra
  // no mesmo caminho: Prisma traz o conjunto e a paginação acontece depois.
  const useJsFilter = useDistFilter || !!minRating || hasNearestOrigin

  // NFR-BL1: bounding box reduz drasticamente linhas retornadas pelo banco antes do
  // Haversine em JS. A caixa retangular (lat/lng offsets) sobre-seleciona; o Haversine
  // abaixo refina para o círculo exato. Ativo só quando há ponto de referência (dist filter).
  // Sem filtro de distância mas com minRating, não há bbox possível — mantém take:500.
  // Number.isFinite: ulat/ulng vêm de query string — um valor malformado (?ulat=abc)
  // vira NaN aqui, e NaN no WHERE do Prisma lança em vez de devolver vazio como o
  // path só-JS fazia antes. Sem bbox válido, cai pro Haversine puro em JS (useDistFilter
  // continua true, só bboxWhere fica undefined).
  const distRadius = Number(dist)
  const bboxWhere = (useDistFilter && Number.isFinite(userLat) && Number.isFinite(userLng) && Number.isFinite(distRadius))
    ? (() => {
      const dlat = distRadius / 111.32
      const dlng = distRadius / (111.32 * Math.cos((userLat as number) * (Math.PI / 180)))
      return {
        latitude:  { gte: (userLat as number) - dlat, lte: (userLat as number) + dlat },
        longitude: { gte: (userLng as number) - dlng, lte: (userLng as number) + dlng },
      }
    })()
    : undefined

  const dbResult = await Promise.all([
    prisma.item.findMany({
      where: bboxWhere ? { ...where, ...bboxWhere } : where,
      // Com bbox ativo o banco já filtra a maior parte — take reduzido para PAGE_SIZE*5 (100).
      // Sem bbox (só minRating, ou ulat/ulng/dist malformados na URL): mantém 500 — sem
      // pré-filtro geográfico no banco, precisa da rede mais larga pro Haversine em JS.
      // ARQ-ALTO-09 (origem): paliativo pré-PostGIS; bbox é a melhoria incremental.
      take: bboxWhere ? PAGE_SIZE * 5 : useJsFilter ? 500 : PAGE_SIZE,
      ...(useJsFilter ? {} : { skip }),
      orderBy: getOrderBy(sort),
      select: {
        id: true, title: true, pricePerDay: true, pricePerWeek: true,
        condition: true, city: true, state: true, neighborhood: true, status: true,
        latitude: true, longitude: true,
        category: { select: { name: true } },
        owner:    { select: { name: true, isVerified: true } },
        images:   { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
        _count:   { select: { reviews: true, favorites: true, bookings: { where: { status: { in: ["CONFIRMED", "ACTIVE"] } } } } },
        // ARQ-ALTO-10: a listagem NÃO exibe nota no card — as reviews servem só ao
        // filtro opcional `minRating`. Carrega as linhas APENAS quando ele está ativo
        // (elimina o N+1 de reviews no caso comum, sem migração/denormalização).
        ...(minRating ? { reviews: { select: { rating: true }, where: { reviewType: "ITEM" as const } } } : {}),
      },
    }),
    prisma.item.count({ where }),
    prisma.category.findMany({
      where:   { parentId: null },
      select:  { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]).catch((err) => {
    console.error("[/itens] DB query failed:", err instanceof Error ? err.message : String(err))
    return null
  })

  if (!dbResult) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container flex flex-col items-center justify-center py-20 text-center">
          <p className="mb-4 text-base text-muted-foreground">
            Serviço temporariamente indisponível. Tente novamente em instantes.
          </p>
          <Link href="/" className="text-sm font-medium text-brand hover:underline">
            Voltar ao início
          </Link>
        </main>
      </div>
    )
  }

  const [rawItems, total, categories] = dbResult

  // Filtros em JS: distância e avaliação mínima
  function avgRating(i: { reviews?: { rating: number }[] }) {
    if (!i.reviews?.length) return 0
    return i.reviews.reduce((s, r) => s + r.rating, 0) / i.reviews.length
  }

  /** Distância até o visitante, ou null quando o item não tem coordenada usável. */
  function distanceFrom(i: typeof rawItems[number], lat: number, lng: number) {
    if (!i.latitude || !i.longitude || (i.latitude === 0 && i.longitude === 0)) return null
    return haversineKm(lat, lng, i.latitude, i.longitude)
  }

  function passesJsFilters(i: typeof rawItems[number]) {
    if (useDistFilter) {
      const d = distanceFrom(i, userLat!, userLng!)
      if (d === null || d > Number(dist)) return false
    }
    // Teto da ordenação por proximidade. Item sem coordenada sai: não dá para
    // afirmar que está perto de nada.
    if (hasNearestOrigin) {
      const d = distanceFrom(i, nearestLat as number, nearestLng as number)
      if (d === null || d > nearestMaxKm) return false
    }
    if (minRating && avgRating(i) < minRating) return false
    return true
  }

  const jsFiltered = useJsFilter ? rawItems.filter(passesJsFilters) : rawItems

  // Ordena do mais perto ao mais longe. Depois dos filtros e ANTES da paginação —
  // ordenar só a página atual daria uma lista ordenada por página, não no total.
  if (hasNearestOrigin) {
    jsFiltered.sort((a, b) =>
      (distanceFrom(a, nearestLat as number, nearestLng as number) ?? Infinity) -
      (distanceFrom(b, nearestLat as number, nearestLng as number) ?? Infinity),
    )
  }

  const pagedItems   = useJsFilter ? jsFiltered.slice(skip, skip + PAGE_SIZE) : rawItems
  const filteredTotal = useJsFilter ? jsFiltered.length : total

  // Attach computed distanceKm to each item for display in ItemCard
  const items = pagedItems.map((i) => ({
    ...i,
    // Também na ordenação por proximidade: ordenar por distância sem MOSTRAR a
    // distância deixaria a ordem sem explicação visível no card.
    distanceKm:
      useDistFilter && i.latitude && i.longitude
        ? haversineKm(userLat!, userLng!, i.latitude, i.longitude)
        : hasNearestOrigin
          ? distanceFrom(i, nearestLat as number, nearestLng as number)
          : null,
  }))

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
    if (sp.view)           params.set("view",       sp.view)
    if (merged.page && merged.page > 1) params.set("page", String(merged.page))
    const qs = params.toString()
    return `/itens${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* P2-53 — Pull-to-refresh wrapper (mobile) */}
      <PullToRefresh>
      <main className="container py-6">

        {/* ─── BANNER "COMO ALUGAR" (intent=rent) ─── */}
        {sp.intent === "rent" && <RentBanner />}

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

        {/* ─── CHIPS DE CATEGORIA ─── (oculto em desktop — sidebar já filtra por categoria) */}
        {categories.length > 0 && (
          <div
            className="mb-5 flex gap-2 overflow-x-auto scrollbar-hide pb-1 lg:hidden"
            role="list"
            aria-label="Filtrar por categoria"
          >
            <Link
              href={buildUrl({ categoryId: undefined, page: 1 })}
              role="listitem"
              className={`inline-flex min-h-11 flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                !categoryId
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border bg-surface text-muted-foreground hover:border-brand/40 hover:text-foreground"
              }`}
            >
              <CategoryIcon name="Todos" slug="todas" size={96} />
              <span className="flex flex-col items-center leading-tight">
                <span>Todas</span>
                <span>Categorias</span>
              </span>
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={buildUrl({ categoryId: cat.id, page: 1 })}
                role="listitem"
                className={`inline-flex min-h-11 flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                  categoryId === cat.id
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border bg-surface text-muted-foreground hover:border-brand/40 hover:text-foreground"
                }`}
              >
                <CategoryIcon name={cat.name} slug={cat.slug} size={96} />
                <span className="flex flex-col items-center leading-tight text-center max-w-[72px]">
                  {cat.name.split(" ").length > 1
                    ? (() => {
                        const words = cat.name.split(" ")
                        const mid = Math.ceil(words.length / 2)
                        return (
                          <>
                            <span>{words.slice(0, mid).join(" ")}</span>
                            <span>{words.slice(mid).join(" ")}</span>
                          </>
                        )
                      })()
                    : cat.name}
                </span>
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
            view={sp.view}
            hasProfileLocation={!!profileCoords}
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
                minRating={sp.minRating}
                view={sp.view}
                hasProfileLocation={!!profileCoords}
              />
            </div>
          </aside>

          {/* Área de resultados */}
          <div className="min-w-0 flex-1">

            {search && (
              <TrackEvent
                key={`search-${search}-${total}`}
                event={{ name: "search", params: { search_term: search, results_count: total } }}
              />
            )}

            {/* Chips de filtros ativos — Suspense obrigatório: useSearchParams no interior */}
            <Suspense fallback={null}>
              <ActiveFilterChips searchParams={sp} categories={categories} />
            </Suspense>

            {/* Resultado count + ordenação */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {filteredTotal === 0
                  ? "Nenhum anúncio encontrado"
                  : `${filteredTotal} anúncio${filteredTotal !== 1 ? "s" : ""} encontrado${filteredTotal !== 1 ? "s" : ""}`}
              </p>
              <Suspense fallback={
                <select disabled className="h-10 rounded-lg border border-input bg-surface px-3 text-sm opacity-50">
                  <option>Mais próximos</option>
                </select>
              }>
                <SortSelect current={sort} hasProfileLocation={!!profileCoords} />
              </Suspense>
            </div>

            {/* P2-57 — Toggle Mapa / Lista */}
            {items.length > 0 ? (() => {
              const pins: ItemPin[] = items
                .filter((i) => i.latitude != null && i.longitude != null && (i.latitude !== 0 || i.longitude !== 0))
                .map((i) => ({
                  id:          i.id,
                  title:       i.title,
                  pricePerDay: i.pricePerDay,
                  lat:         Math.round(i.latitude! * 1000) / 1000,  // ~110m (SEC-MIN-06): não expor coord exata ao client
                  lng:         Math.round(i.longitude! * 1000) / 1000,
                }))

              const mapView = pins.length > 0 ? (
                <ItemsMapLoader
                  items={pins}
                  height={480}
                  defaultLat={userLoc.lat}
                  defaultLng={userLoc.lng}
                  defaultZoom={userLoc.zoom}
                />
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                  Nenhum item com localização para exibir no mapa.
                </div>
              )

              const listView = (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                    {items.map((item) => (
                      <ItemCard key={item.id} item={item} backHref={buildUrl({ page })} />
                    ))}
                  </div>
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
              )

              return (
                <Suspense fallback={listView}>
                  <MapToggle mapContent={mapView} listContent={listView} initialView={sp.view === "map" ? "map" : "list"} />
                </Suspense>
              )
            })() : (
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
      </PullToRefresh>
      {/* P3-77: CTA flutuante mobile */}
      <FloatingCTA />
    </div>
  )
}

