"use client"

import { useState } from "react"
import Image from "next/image"

interface Props {
  images: { url: string }[]
  title:  string
}

export function Gallery({ images, title }: Props) {
  const [active, setActive] = useState(0)

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-muted text-muted-foreground/30">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </div>
    )
  }

  return (
    <>
      {/* Foto principal */}
      <div className="relative mb-2 aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
        <Image
          src={images[active].url}
          alt={title}
          fill
          className="object-cover transition-opacity duration-200"
          sizes="(max-width: 1024px) 100vw, 60vw"
          priority={active === 0}
        />
      </div>

      {/* Miniaturas */}
      {images.length > 1 && (
        <div className="flex gap-2" role="list" aria-label="Miniaturas da galeria">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              role="listitem"
              aria-label={`Foto ${i + 1}`}
              aria-current={i === active ? "true" : undefined}
              className={`relative h-[54px] w-[72px] flex-shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                i === active
                  ? "border-brand"
                  : "border-transparent hover:border-border"
              }`}
            >
              <Image src={img.url} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </>
  )
}
