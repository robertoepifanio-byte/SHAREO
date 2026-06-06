"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function BottomNav() {
  const pathname = usePathname()

  const isHome    = pathname === "/"
  const isExplore = pathname.startsWith("/itens") && !pathname.includes("/novo")
  const isAnunciar = pathname.includes("/novo") || pathname.startsWith("/anunciar")
  const isChat    = pathname.startsWith("/mensagens")
  const isDash    = (
    pathname === "/dashboard" ||
    pathname.startsWith("/perfil") ||
    pathname === "/reservas" ||
    pathname.startsWith("/meus-anuncios")
  )

  const itemCls = (active: boolean) =>
    `flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors relative h-full ${
      active
        ? "text-primary"
        : "text-muted-foreground hover:text-foreground"
    }`

  const Indicator = ({ active }: { active: boolean }) =>
    active ? (
      <span
        className="absolute top-0 left-[18%] right-[18%] h-[2.5px] rounded-b bg-primary"
        aria-hidden="true"
      />
    ) : null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[200] flex h-[72px] items-stretch border-t border-border bg-surface shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:hidden"
      aria-label="Navegação mobile"
    >
      {/* Início */}
      <Link
        href="/"
        className={itemCls(isHome)}
        aria-current={isHome ? "page" : undefined}
      >
        <Indicator active={isHome} />
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isHome ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>Início</span>
      </Link>

      {/* Explorar */}
      <Link
        href="/itens"
        className={itemCls(isExplore)}
        aria-current={isExplore ? "page" : undefined}
      >
        <Indicator active={isExplore} />
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isExplore ? 2.5 : 2} strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <span>Explorar</span>
      </Link>

      {/* Anunciar — CTA elevado */}
      <Link
        href="/itens/novo"
        className="flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold relative"
        style={{ marginTop: "-10px" }}
        aria-label="Anunciar item"
      >
        <div
          className={`flex h-[52px] w-[52px] items-center justify-center rounded-full text-white transition-all hover:scale-105 ${
            isAnunciar
              ? "bg-brand/90 shadow-[0_4px_16px_rgba(0,123,60,0.55)]"
              : "bg-brand shadow-[0_4px_16px_rgba(0,123,60,0.40)]"
          }`}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
        <span className="text-brand">Anunciar</span>
      </Link>

      {/* Chat — em breve */}
      <button
        type="button"
        disabled
        className="flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-muted-foreground/40 cursor-default relative h-full"
        title="Mensagens disponível em breve"
        aria-disabled="true"
      >
        <Indicator active={isChat} />
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>Chat</span>
      </button>

      {/* Perfil */}
      <Link
        href="/dashboard"
        className={itemCls(isDash)}
        aria-current={isDash ? "page" : undefined}
      >
        <Indicator active={isDash} />
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isDash ? 2.5 : 2} strokeLinecap="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span>Perfil</span>
      </Link>
    </nav>
  )
}
