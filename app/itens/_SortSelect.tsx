"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

/**
 * `recent` é o default e sai da URL quando escolhido — por isso o valor tem que
 * casar com o `default` de getOrderBy() em page.tsx.
 *
 * "Mais próximos" ERA o rótulo de `recent`, que ordena por data. O nome mentia:
 * não havia ordenação por distância no produto. Agora são duas opções distintas.
 */
const OPTIONS = [
  { value: "recent",     label: "Mais recentes" },
  { value: "nearest",    label: "Mais próximos" },
  { value: "price_asc",  label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "views",      label: "Mais vistos" },
  { value: "rented",     label: "Mais alugados" },
]

interface Props {
  current?: string
  /** Usuário logado com endereço no perfil — o servidor ordena sem pedir GPS. */
  hasProfileLocation?: boolean
}

export function SortSelect({ current, hasProfileLocation }: Props) {
  const router  = useRouter()
  const params  = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")

  function navigate(sort: string, coords?: { lat: string; lng: string }) {
    const next = new URLSearchParams(params.toString())
    if (sort && sort !== "recent") next.set("sort", sort)
    else next.delete("sort")
    if (coords) {
      next.set("ulat", coords.lat)
      next.set("ulng", coords.lng)
    }
    next.delete("page")
    router.push(`/itens?${next.toString()}`)
  }

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    setError("")

    // Proximidade precisa de origem. Se a URL já tem GPS ou o perfil tem
    // endereço, o servidor resolve; senão pedimos ao navegador na hora — mesmo
    // comportamento do filtro de distância da barra lateral, para o usuário não
    // encontrar duas mecânicas diferentes para a mesma necessidade.
    const jaTemOrigem = (params.has("ulat") && params.has("ulng")) || hasProfileLocation
    if (value === "nearest" && !jaTemOrigem) {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setError("Seu navegador não suporta localização.")
        return
      }
      setLoading(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoading(false)
          navigate("nearest", {
            lat: String(pos.coords.latitude),
            lng: String(pos.coords.longitude),
          })
        },
        () => {
          setLoading(false)
          setError("Permita o acesso à localização para ordenar por proximidade.")
        },
        { timeout: 8000 },
      )
      return
    }

    navigate(value)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        defaultValue={current ?? "recent"}
        onChange={onChange}
        disabled={loading}
        className="h-10 cursor-pointer rounded-lg border border-input bg-surface px-3 text-sm text-foreground outline-none focus:border-ring transition-colors disabled:opacity-60"
        aria-label="Ordenar resultados"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {loading && <p className="text-[11px] text-muted-foreground">Obtendo localização…</p>}
      {error && <p role="alert" className="max-w-[220px] text-right text-[11px] text-destructive">{error}</p>}
    </div>
  )
}
