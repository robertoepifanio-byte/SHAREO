"use client"

/**
 * ItemsMap — mapa interativo Mapbox com marcadores de itens.
 *
 * Renderizado exclusivamente no cliente (import via next/dynamic + ssr:false).
 * Exibe fallback visual quando NEXT_PUBLIC_MAPBOX_TOKEN não estiver configurado.
 */

import { useState, useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import Map, { Marker, Popup, NavigationControl } from "react-map-gl"
import type { MapRef } from "react-map-gl"
import Link from "next/link"
import Image from "next/image"
import { BRAZIL_DEFAULT } from "@/lib/geo-constants"
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
  mapZoom?:     number   // zoom controlado externamente (filtro de distância)
}

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""
const IS_PLACEHOLDER = !TOKEN || TOKEN === "pk.eyJ..." || TOKEN.endsWith("...")

export function ItemsMap({
  items,
  height      = 192,
  defaultLat  = Number(process.env.NEXT_PUBLIC_DEFAULT_LAT  ?? BRAZIL_DEFAULT.lat),
  defaultLng  = Number(process.env.NEXT_PUBLIC_DEFAULT_LNG  ?? BRAZIL_DEFAULT.lng),
  defaultZoom = 11,
  mapZoom,
}: Props) {
  const [popup, setPopup] = useState<ItemPin | null>(null)
  const mapRef   = useRef<MapRef>(null)
  const mounted  = useRef(false)
  const loaded   = useRef(false)
  const [mapError, setMapError] = useState(false)

  // Guard de montagem para tema — evita mismatch SSR/cliente com next-themes
  const [themeMounted, setThemeMounted] = useState(false)
  const { resolvedTheme } = useTheme()
  useEffect(() => { setThemeMounted(true) }, [])

  const mapStyle =
    themeMounted && resolvedTheme === "dark"
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/streets-v12"

  useEffect(() => { setPopup(null) }, [items])

  // Voa para o zoom correto quando o filtro de distância muda
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    if (mapZoom === undefined) return
    mapRef.current?.flyTo({
      center:   [defaultLng, defaultLat],
      zoom:     mapZoom,
      duration: 600,
    })
  }, [mapZoom, defaultLat, defaultLng])

  /* ── Fallback: token ausente OU falha de carregamento do mapa ───────── */
  const fallback = (
    <div
      style={{ height }}
      className="relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-gradient-to-br from-[#ccd9e5] to-[#a8c0d4]"
      role="img"
      aria-label={mapError ? "Mapa indisponível no momento" : "Mapa de itens próximos — aguardando configuração"}
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

  if (IS_PLACEHOLDER || mapError) return fallback

  /* ── Filtra itens com coords válidas ───────────────────────────────── */
  const pins = items.filter((i) => i.lat != null && i.lng != null)

  return (
    <div style={{ height }} className="overflow-hidden rounded-lg border border-border">
      <Map
        ref={mapRef}
        mapboxAccessToken={TOKEN}
        initialViewState={{ latitude: defaultLat, longitude: defaultLng, zoom: defaultZoom }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle}
        onClick={() => setPopup(null)}
        onLoad={() => { loaded.current = true }}
        onError={(e) => {
          // Só degrada se o mapa nem chegou a carregar (token inválido, rede, style).
          // Erros de tile pós-carga não derrubam o mapa.
          if (!loaded.current) {
            console.error("Mapbox falhou ao carregar:", e?.error)
            setMapError(true)
          }
        }}
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
              // items-end (não items-center): a área de toque cresce pra 44px, mas o
              // pin fica ancorado embaixo — anchor="bottom" do Marker alinha o pino ao
              // ponto real do mapa; centralizar verticalmente deslocaria a ponta do pin
              // pra cima do coord real.
              className="flex min-h-[44px] min-w-[44px] cursor-pointer items-end justify-center drop-shadow-md transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:rounded-full"
              tabIndex={0}
              role="button"
              aria-label={item.title}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setPopup(item)
              }}
            >
              {/* Pin ShareO */}
              <Image
                src="/icons/pin-shareo.png"
                alt=""
                width={96}
                height={132}
                className="h-9 w-auto"
                aria-hidden="true"
              />
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
            className="pointer-events-auto rounded-md bg-surface px-3 py-1.5 text-xs font-semibold text-primary shadow-sm hover:bg-surface/90 transition-colors"
          >
            Ver todos →
          </Link>
        </div>
      </Map>
    </div>
  )
}
