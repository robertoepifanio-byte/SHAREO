"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"

export function FloatingCTA() {
  const { status } = useSession()
  if (status !== "authenticated") return null

  return (
    <Link
      href="/itens/novo"
      className={[
        "fixed bottom-6 right-4 z-40 md:hidden",
        "flex items-center gap-2 rounded-full shadow-lg",
        "bg-brand px-5 py-3 text-sm font-semibold text-white",
        "min-h-[44px] min-w-[44px]",
        "hover:opacity-90 active:scale-95 transition-all",
        "focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2",
      ].join(" ")}
      aria-label="Anunciar item"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Anunciar item
    </Link>
  )
}
