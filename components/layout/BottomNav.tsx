"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function BottomNav() {
  const pathname = usePathname()

  const isHome    = pathname === "/"
  const isExplore = pathname.startsWith("/itens") && !pathname.includes("/novo")
  const isDash    = pathname === "/dashboard" || pathname === "/meus-anuncios"

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[200] flex h-16 border-t border-border bg-surface md:hidden"
      aria-label="Navegação mobile"
    >
      <Link
        href="/"
        className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
          isHome ? "text-brand" : "text-muted-foreground"
        }`}
        aria-current={isHome ? "page" : undefined}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isHome ? 2.5 : 2} aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>Início</span>
      </Link>

      <Link
        href="/itens"
        className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
          isExplore ? "text-brand" : "text-muted-foreground"
        }`}
        aria-current={isExplore ? "page" : undefined}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isExplore ? 2.5 : 2} aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span>Explorar</span>
      </Link>

      <Link
        href="/itens/novo"
        className="flex flex-1 flex-col items-center justify-center"
        aria-label="Anunciar item"
      >
        <div className="-mt-2 flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white shadow-md hover:opacity-90 transition-opacity">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
      </Link>

      <button
        type="button"
        disabled
        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium text-muted-foreground/40 cursor-default"
        title="Chat disponível em breve"
        aria-disabled="true"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>Chat</span>
      </button>

      <Link
        href="/dashboard"
        className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
          isDash ? "text-brand" : "text-muted-foreground"
        }`}
        aria-current={isDash ? "page" : undefined}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isDash ? 2.5 : 2} aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span>Perfil</span>
      </Link>
    </nav>
  )
}
