"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { DistanceFilter } from "./_DistanceFilter"

interface FilterFormProps {
  categories:  { id: string; name: string }[]
  categoryId?: string
  priceMax?:   string
  search?:     string
  sort?:       string
  dist?:       string
  userLat?:    string
  userLng?:    string
  minRating?:  string
  view?:       string
}

function buildFilterUrl(props: FilterFormProps, overrides: Record<string, string>): string {
  const base: Record<string, string | undefined> = {
    search:     props.search,
    sort:       props.sort,
    view:       props.view,
    categoryId: props.categoryId,
    priceMax:   props.priceMax && props.priceMax !== "500" ? props.priceMax : undefined,
    dist:       props.dist,
    ulat:       props.userLat,
    ulng:       props.userLng,
    minRating:  props.minRating,
  }
  const merged = { ...base, ...overrides }
  const p = new URLSearchParams()
  for (const [key, value] of Object.entries(merged)) {
    if (value && value !== "") p.set(key, value)
  }
  return `/itens${p.toString() ? `?${p.toString()}` : ""}`
}

export function FilterForm(props: FilterFormProps) {
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [priceDisplay, setPriceDisplay] = useState(props.priceMax ?? "500")

  useEffect(() => {
    setPriceDisplay(props.priceMax ?? "500")
  }, [props.priceMax])

  function navigate(overrides: Record<string, string>) {
    router.push(buildFilterUrl(props, overrides))
  }

  function handlePriceChange(value: string) {
    setPriceDisplay(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => navigate({ priceMax: value }), 400)
  }

  function handleDistanceReady(dist: string, lat: string, lng: string) {
    navigate({ dist, ulat: lat, ulng: lng })
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
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
              checked={!props.categoryId}
              onChange={() => navigate({ categoryId: "" })}
              className="accent-brand"
            />
            Todas
          </label>
          {props.categories.map((cat) => (
            <label key={cat.id} className="flex cursor-pointer items-center gap-2 py-1 text-sm text-foreground">
              <input
                type="radio"
                name="categoryId"
                value={cat.id}
                checked={props.categoryId === cat.id}
                onChange={() => navigate({ categoryId: cat.id })}
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
            min="0"
            max="500"
            step="10"
            value={priceDisplay}
            aria-label="Preço máximo por dia em reais"
            onChange={(e) => handlePriceChange(e.target.value)}
            className="flex-1 accent-brand"
          />
          <span className="min-w-[44px] text-right text-xs font-semibold text-foreground">
            R${priceDisplay}
          </span>
        </div>
      </fieldset>

      {/* Distância */}
      <DistanceFilter
        dist={props.dist}
        userLat={props.userLat}
        userLng={props.userLng}
        onAutoSubmit={handleDistanceReady}
      />

      {/* Avaliação mínima */}
      <fieldset>
        <legend className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Avaliação mínima
        </legend>
        <div className="space-y-0.5">
          {[
            { label: "Qualquer avaliação", value: "" },
            { label: "★★★★★ 5 estrelas",  value: "5" },
            { label: "★★★★+ 4+",           value: "4" },
            { label: "★★★+  3+",            value: "3" },
          ].map((opt) => (
            <label key={opt.value} className="flex cursor-pointer items-center gap-2 py-1 text-sm text-foreground">
              <input
                type="radio"
                name="minRating"
                value={opt.value}
                checked={(props.minRating ?? "") === opt.value}
                onChange={() => navigate({ minRating: opt.value })}
                className="accent-brand"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>
    </form>
  )
}
