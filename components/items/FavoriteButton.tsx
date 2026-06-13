"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { trackEvent } from "@/components/analytics/GoogleAnalytics"

interface FavoriteButtonProps {
  itemId:           string
  initialFavorited?: boolean
}

export function FavoriteButton({ itemId, initialFavorited = false }: FavoriteButtonProps) {
  const router            = useRouter()
  const [faved,   setFaved]   = useState(initialFavorited)
  const [loading, setLoading] = useState(false)

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    try {
      const res  = await fetch(`/api/items/${itemId}/favorite`, { method: "POST" })
      if (res.status === 401) { router.push("/login?callbackUrl=/favoritos"); return }
      const json = await res.json()
      if (res.ok) {
        setFaved(json.data.favorited)
        if (json.data.favorited) trackEvent({ name: "favorite_added", params: { item_id: itemId } })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label={faved ? "Remover dos favoritos" : "Salvar nos favoritos"}
      aria-pressed={faved}
      className="absolute top-1 right-1 flex h-11 w-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 disabled:opacity-60"
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm" aria-hidden="true">
        <svg
          width="14" height="14" viewBox="0 0 24 24"
          fill={faved ? "#E74C3C" : "none"}
          stroke={faved ? "#E74C3C" : "#0F172A"}
          strokeWidth="1.5"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </div>
    </button>
  )
}
