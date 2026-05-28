"use client"

/**
 * ItemsMap — mapa interativo Mapbox com marcadores de itens.
 *
 * Renderizado exclusivamente no cliente (import via next/dynamic + ssr:false).
 * Exibe fallback visual quando NEXT_PUBLIC_MAPBOX_TOKEN não estiver configurado.
 */

import { useState } from "react"
import Map, { Marker, Popup, NavigationControl } from "react-map-gl"
import Link from "next/link"
import "mapbox-gl/dist/mapbox-gl.css"

export type ItemPin = {
  id:          string
  title:       string
  pricePerDay: number  // centavos
  lat:         number
  lng:         number
}

interface Props {
  items:        ItemPin[]
  height?:      number   // px — padrão 192 (h-48)
  defaultLat?:  number
  defaultLng?:  number
  defaultZoom?: number
}

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""
const IS_PLACEHOLDER = !TOKEN || TOKEN === "pk.eyJ..." || TOKEN.endsWith("...")

export function ItemsMap({
  items,
  height      = 192,
  defaultLat  = Number(process.env.NEXT_PUBLIC_DEFAULT_LAT  ?? -5.7945),
  defaultLng  = Number(process.env.NEXT_PUBLIC_DEFAULT_LNG  ?? -35.211),
  defaultZoom = 11,
}: Props) {
  const [popup, setPopup] = useState<ItemPin | null>(null)

  /* ── Fallback quando token não configurado ─────────────────────────── */
  if (IS_PLACEHOLDER) {
    return (
      <div
        style={{ height }}
        className="relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-gradient-to-br from-[#ccd9e5] to-[#a8c0d4]"
        role="img"
        aria-label="Mapa de itens próximos — aguardando configuração"
      >
        <span className="text-5xl" aria-hidden="true">🗺️</span>
        <Link
          href="/itens"
          className="absolute bottom-3 right-3 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-primary shadow-sm hover:bg-white/90 transition-colors"
        >
          Ver anúncios →
        </Link>
      </div>
    )
  }

  /* ── Filtra itens com coords válidas (descarta 0,0) ────────────────── */
  const pins = items.filter((i) => i.lat !== 0 || i.lng !== 0)

  return (
    <div style={{ height }} className="overflow-hidden rounded-lg border border-border">
      <Map
        mapboxAccessToken={TOKEN}
        initialViewState={{ latitude: defaultLat, longitude: defaultLng, zoom: defaultZoom }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onClick={() => setPopup(null)}
        aria-label="Mapa de itens disponíveis para aluguel"
      >
        <NavigationControl position="top-right" showCompass={false} />

        {/* ── Marcadores ─────────────────────────────────────────────── */}
        {pins.map((item) => (
          <Marker
            key={item.id}
            latitude={item.lat}
            longitude={item.lng}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation()
              setPopup(item)
            }}
          >
            <div
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-brand text-white shadow-md transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              tabIndex={0}
              role="button"
              aria-label={item.title}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setPopup(item)
              }}
            >
              {/* Pin icon */}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </div>
          </Marker>
        ))}

        {/* ── Popup ao clicar num marcador ────────────────────────────── */}
        {popup && (
          <Popup
            latitude={popup.lat}
            longitude={popup.lng}
            anchor="top"
            onClose={() => setPopup(null)}
            closeButton
            offset={8}
            maxWidth="200px"
          >
            <Link
              href={`/itens/${popup.id}`}
              onClick={() => setPopup(null)}
              className="block p-1"
            >
              <p className="text-sm font-semibold leading-snug text-primary line-clamp-2">
                {popup.title}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-brand">
                R${" "}
                {(popup.pricePerDay / 100).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                /dia
              </p>
            </Link>
          </Popup>
        )}

        {/* ── Link "Ver todos" sobreposto ─────────────────────────────── */}
        <div className="absolute bottom-3 right-3 z-10 pointer-events-none">
          <Link
            href="/itens"
            className="pointer-events-auto rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-primary shadow-sm hover:bg-white/90 transition-colors"
          >
            Ver todos →
          </Link>
        </div>
      </Map>
    </div>
  )
}
