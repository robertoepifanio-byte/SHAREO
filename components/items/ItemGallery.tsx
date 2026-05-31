"use client"

import { useState } from "react"
import Image from "next/image"

interface GalleryImage {
  url:   string
  order: number
}

interface Props {
  images: GalleryImage[]
  title:  string
}

/**
 * P2-54 — Galeria de fotos com suporte a pinch-to-zoom.
 * Em mobile, o browser nativo gerencia o pinch-to-zoom via
 * `touch-action: pinch-zoom` — sem bibliotecas extras.
 *
 * Em desktop: carrossel com setas de navegação.
 */
export function ItemGallery({ images, title }: Props) {
  const [active, setActive] = useState(0)

  if (images.length === 0) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-muted text-muted-foreground/30">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </div>
    )
  }

  const sorted  = [...images].sort((a, b) => a.order - b.order)
  const current = sorted[active]

  function prev() { setActive((i) => (i > 0 ? i - 1 : sorted.length - 1)) }
  function next() { setActive((i) => (i < sorted.length - 1 ? i + 1 : 0)) }

  return (
    <div className="space-y-3">
      {/* Imagem principal — overflow: auto + touch-action: pinch-zoom habilita o zoom nativo */}
      <div
        className="relative aspect-video w-full overflow-auto rounded-xl bg-muted"
        style={{ touchAction: "pinch-zoom" }}
        role="img"
        aria-label={`${title} — foto ${active + 1} de ${sorted.length}`}
      >
        <Image
          src={current.url}
          alt={`${title} — foto ${active + 1}`}
          fill
          priority={active === 0}
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 66vw, 50vw"
        />

        {/* Setas de navegação — visíveis quando há mais de 1 foto */}
        {sorted.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Foto anterior"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Próxima foto"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>

            {/* Contador */}
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
              {active + 1}/{sorted.length}
            </span>
          </>
        )}
      </div>

      {/* Thumbnails — visíveis quando há 2+ fotos */}
      {sorted.length > 1 && (
        <div
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
          role="list"
          aria-label="Miniaturas das fotos"
        >
          {sorted.map((img, idx) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActive(idx)}
              aria-label={`Ver foto ${idx + 1}`}
              aria-pressed={active === idx}
              className={[
                "relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand",
                active === idx
                  ? "ring-2 ring-brand ring-offset-1"
                  : "opacity-60 hover:opacity-90",
              ].join(" ")}
            >
              <Image
                src={img.url}
                alt={`Miniatura ${idx + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
