"use client"

import { useState } from "react"
import { ItemsMapLoader } from "@/components/items/ItemsMapLoader"
import { haversineKm } from "@/lib/haversine"
import type { ItemPin } from "@/components/items/ItemsMap"

interface Props {
  items:      ItemPin[]
  defaultLat: number
  defaultLng: number
  defaultZoom: number
  userCity?:  string
}

const DISTANCES = [2, 5, 10, 99]

export function HomeMapPanel({ items, defaultLat, defaultLng, defaultZoom, userCity }: Props) {
  const [maxKm, setMaxKm] = useState(99)

  // Pré-computa quantos itens existem para cada faixa de distância
  const hasCoords = items.some((p) => p.lat && p.lng)

  function countForDist(km: number) {
    if (km === 99) return items.length
    return items.filter((p) => {
      if (!p.lat || !p.lng) return false
      return haversineKm(defaultLat, defaultLng, p.lat, p.lng) <= km
    }).length
  }

  const filtered = maxKm === 99
    ? items
    : items.filter((pin) => {
        if (!pin.lat || !pin.lng) return false
        return haversineKm(defaultLat, defaultLng, pin.lat, pin.lng) <= maxKm
      })

  const OPTIONS = [
    { label: "Até 2 km",  value: 2,  count: countForDist(2) },
    { label: "Até 5 km",  value: 5,  count: countForDist(5) },
    { label: "Até 10 km", value: 10, count: countForDist(10) },
    { label: "Qualquer",  value: 99, count: items.length },
  ]

  return (
    <div className="flex gap-4 items-stretch">
      {/* Painel de distância */}
      <div className="hidden md:flex flex-col bg-surface border border-border rounded-xl p-5 min-w-[155px] flex-shrink-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Distância
        </p>
        <div className="flex flex-col gap-2">
          {OPTIONS.map((opt) => {
            const disabled = !hasCoords && opt.value !== 99
            return (
              <label
                key={opt.value}
                className={`flex items-center justify-between gap-2 text-sm font-medium ${
                  disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="dist-home"
                    value={opt.value}
                    checked={maxKm === opt.value}
                    onChange={() => !disabled && setMaxKm(opt.value)}
                    disabled={disabled}
                    className="accent-brand w-4 h-4"
                  />
                  {opt.label}
                </span>
                <span className={`text-xs font-semibold rounded-full px-1.5 py-0.5 ${
                  maxKm === opt.value
                    ? "bg-brand text-white"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {opt.count}
                </span>
              </label>
            )
          })}
        </div>
        {!hasCoords && (
          <p className="mt-2 text-[10px] text-muted-foreground leading-tight">
            Itens sem localização cadastrada
          </p>
        )}

        {/* Cidade do usuário */}
        <div className="mt-auto pt-4 border-t border-border mt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Sua cidade
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-brand text-sm">📍</span>
            <span className="text-sm font-bold text-primary">
              {userCity ?? "Natal, RN"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Baseado na sua conta</p>
        </div>

        {/* Contador */}
        <p className="mt-3 text-xs font-semibold text-brand">
          {filtered.length} {filtered.length === 1 ? "item" : "itens"} no mapa
        </p>
      </div>

      {/* Mapa — key força remount quando filtro muda */}
      <div className="flex-1 min-w-0 overflow-hidden rounded-xl border border-border">
        <ItemsMapLoader
          key={maxKm}
          items={filtered}
          height={260}
          defaultLat={defaultLat}
          defaultLng={defaultLng}
          defaultZoom={defaultZoom}
        />
      </div>
    </div>
  )
}
