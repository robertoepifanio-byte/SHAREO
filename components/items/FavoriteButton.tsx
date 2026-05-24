"use client"

import { useState } from "react"

interface FavoriteButtonProps {
  itemId:           string
  initialFavorited?: boolean
}

export function FavoriteButton({ itemId, initialFavorited = false }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited)

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setFavorited((v) => !v)
    // TODO Sprint 3: persist via /api/items/:id/favorite
    void itemId
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={favorited ? "Remover dos favoritos" : "Salvar nos favoritos"}
      aria-pressed={favorited}
      className="absolute top-1 right-1 flex h-11 w-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm" aria-hidden="true">
        {favorited ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#EF4444" stroke="#EF4444" strokeWidth="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        )}
      </div>
    </button>
  )
}
