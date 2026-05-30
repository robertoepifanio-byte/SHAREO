"use client"

import { useRouter, useSearchParams } from "next/navigation"

interface SearchParamsShape {
  search?:     string
  categoryId?: string
  city?:       string
  priceMax?:   string
  dist?:       string
  minRating?:  string
  ulat?:       string
  ulng?:       string
  sort?:       string
  page?:       string
}

interface ActiveFilter {
  label:    string
  /** One or more param keys to remove when this chip is dismissed */
  keys:     string[]
}

interface Props {
  searchParams: SearchParamsShape
  categories:   { id: string; name: string }[]
}

function buildActiveFilters(
  sp: SearchParamsShape,
  categories: { id: string; name: string }[],
): ActiveFilter[] {
  const filters: ActiveFilter[] = []

  if (sp.search) {
    filters.push({ label: `"${sp.search}"`, keys: ["search"] })
  }

  if (sp.categoryId) {
    const cat = categories.find((c) => c.id === sp.categoryId)
    if (cat) filters.push({ label: cat.name, keys: ["categoryId"] })
  }

  if (sp.city) {
    filters.push({ label: sp.city, keys: ["city"] })
  }

  if (sp.priceMax && sp.priceMax !== "500") {
    filters.push({ label: `Até R$${sp.priceMax}`, keys: ["priceMax"] })
  }

  if (sp.dist) {
    const label =
      sp.dist === "2"  ? "Até 2 km"  :
      sp.dist === "5"  ? "Até 5 km"  :
      sp.dist === "10" ? "Até 10 km" :
      `${sp.dist} km`
    // Remove distance + coordinate params together
    filters.push({ label, keys: ["dist", "ulat", "ulng"] })
  }

  if (sp.minRating) {
    const stars = "★".repeat(Number(sp.minRating))
    const label = `${stars}${sp.minRating !== "5" ? "+" : ""} mín.`
    filters.push({ label, keys: ["minRating"] })
  }

  return filters
}

/**
 * Row of dismissible filter chips rendered when any filter is active.
 * Uses `"use client"` because it reads from the URL and pushes updates —
 * intentionally a leaf component, never used as a layout wrapper.
 */
export function ActiveFilterChips({ searchParams: sp, categories }: Props) {
  const router = useRouter()
  const params = useSearchParams()

  const filters = buildActiveFilters(sp, categories)

  if (filters.length === 0) return null

  function removeFilter(keys: string[]) {
    const next = new URLSearchParams(params.toString())
    for (const k of keys) next.delete(k)
    next.delete("page")
    router.push(`/itens?${next.toString()}`)
  }

  function clearAll() {
    router.push("/itens")
  }

  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-2"
      role="list"
      aria-label="Filtros ativos"
    >
      {filters.map((f) => (
        <span
          key={f.keys.join(",")}
          role="listitem"
          className="inline-flex items-center gap-1 rounded-full bg-navy px-3 py-1 text-xs font-semibold text-white"
        >
          {f.label}
          <button
            type="button"
            onClick={() => removeFilter(f.keys)}
            className="ml-1 flex h-4 w-4 items-center justify-center opacity-70 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded-full"
            aria-label={`Remover filtro: ${f.label}`}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </span>
      ))}

      {filters.length > 1 && (
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex h-7 min-w-[44px] items-center rounded-full border border-border px-3 text-xs text-muted-foreground hover:border-brand hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
          aria-label="Limpar todos os filtros"
        >
          Limpar tudo
        </button>
      )}
    </div>
  )
}
