"use client"

import {
  useRef, useState, useCallback,
  type TouchEvent, type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { ItemCard } from "./ItemCard"

interface SwipeableItemCardProps {
  item: React.ComponentProps<typeof ItemCard>["item"]
  isFavorited?:   boolean
  /** Distância mínima de swipe-left em px para revelar o painel (padrão: 60) */
  threshold?: number
}

/**
 * P2-55 — Wrapper swipeable em torno de ItemCard.
 *
 * Swipe left >= threshold: revela painel de favoritar.
 * Ao liberar com o painel revelado: chama POST /api/favorites e
 * atualiza o estado otimisticamente.
 *
 * Não substitui o ItemCard existente — é um wrapper opcional que pode
 * ser usado em listagens onde se deseja o gesto de swipe.
 */
export function SwipeableItemCard({
  item,
  isFavorited: initialFavorited = false,
  threshold = 60,
}: SwipeableItemCardProps) {
  const router        = useRouter()
  const startXRef     = useRef<number | null>(null)
  const [offsetX,     setOffsetX]     = useState(0)
  const [favorited,   setFavorited]   = useState(initialFavorited)
  const [isActioning, setIsActioning] = useState(false)

  // Revelar painel quando offsetX >= threshold
  const revealed  = offsetX >= threshold
  // Clamp: máximo de 88px de deslocamento para não ultrapassar o card
  const clampedX  = Math.min(offsetX, 88)

  const onTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    startXRef.current = e.touches[0].clientX
  }, [])

  const onTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (startXRef.current === null) return
    const delta = startXRef.current - e.touches[0].clientX // positivo = swipe left
    if (delta < 0) { startXRef.current = null; return } // swipe right: cancela
    setOffsetX(delta)
  }, [])

  const onTouchEnd = useCallback(async () => {
    startXRef.current = null

    if (offsetX >= threshold && !isActioning) {
      // Acionar favoritar com optimistic update
      setIsActioning(true)
      const next = !favorited
      setFavorited(next)

      try {
        const res = await fetch(`/api/favorites`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ itemId: item.id }),
        })
        if (!res.ok) {
          // Rollback
          setFavorited(!next)
        } else {
          router.refresh()
        }
      } catch {
        setFavorited(!next)
      } finally {
        setIsActioning(false)
      }
    }

    // Retornar ao estado original (com animação)
    setOffsetX(0)
  }, [offsetX, threshold, favorited, isActioning, item.id, router])

  return (
    <div
      className="relative overflow-hidden rounded-lg"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Painel de fundo — revelado no swipe-left */}
      <div
        aria-hidden="true"
        className={[
          "absolute inset-y-0 right-0 flex items-center justify-center rounded-r-lg bg-brand px-5 transition-opacity",
          revealed ? "opacity-100" : "opacity-0",
        ].join(" ")}
        style={{ width: "88px" }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={favorited ? "white" : "none"}
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </div>

      {/* ItemCard deslizante */}
      <div
        style={{
          transform:  `translateX(-${clampedX}px)`,
          transition: offsetX === 0 ? "transform 0.25s ease" : "none",
          willChange: "transform",
        }}
      >
        <ItemCard item={item} isFavorited={favorited} />
      </div>
    </div>
  )
}
