"use client"

import { useRouter, useSearchParams } from "next/navigation"

const OPTIONS = [
  { value: "recent",     label: "Mais recentes" },
  { value: "price_asc",  label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "views",      label: "Mais vistos" },
]

export function SortSelect({ current }: { current?: string }) {
  const router = useRouter()
  const params = useSearchParams()

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(params.toString())
    if (e.target.value && e.target.value !== "recent") next.set("sort", e.target.value)
    else next.delete("sort")
    next.delete("page")
    router.push(`/itens?${next.toString()}`)
  }

  return (
    <select
      defaultValue={current ?? "recent"}
      onChange={onChange}
      className="h-10 cursor-pointer rounded-lg border border-input bg-surface px-3 text-sm text-foreground outline-none focus:border-ring transition-colors"
      aria-label="Ordenar resultados"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
