"use client"

import Link from "next/link"
import { useCart } from "@/components/cart/useCart"

/**
 * Ícone de carrinho no header (Story B). Só aparece quando há itens — não polui o
 * header no fluxo normal de item único. Leva para /carrinho.
 */
export function CartIndicator() {
  const { count, hydrated } = useCart()

  if (!hydrated || count === 0) return null

  return (
    <Link
      href="/carrinho"
      aria-label={`Carrinho de locação — ${count} ${count === 1 ? "item" : "itens"}`}
      className="relative flex h-11 w-11 items-center justify-center rounded-lg text-white hover:bg-white/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
        {count}
      </span>
    </Link>
  )
}
