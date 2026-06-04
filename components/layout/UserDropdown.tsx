"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

interface Props {
  name:      string
  avatarUrl?: string | null
}

const MENU_ITEMS = [
  { href: "/perfil",            label: "Ver Perfil",    icon: "👤" },
  { href: "/perfil/editar",     label: "Editar dados",  icon: "✏️" },
  { href: "/perfil/endereco",   label: "Endereço",      icon: "📍" },
  { href: "/perfil/seguranca",  label: "Segurança",     icon: "🔒" },
  { href: "/perfil/documentos", label: "Documentos",    icon: "🪪" },
  { href: "/perfil/indicacoes", label: "Indicações",    icon: "🎁" },
  { href: "/dashboard",         label: "Dashboard",     icon: "📊" },
  { href: "/ajuda",             label: "Ajuda",         icon: "❓" },
]

export function UserDropdown({ name, avatarUrl }: Props) {
  const [open, setOpen]   = useState(false)
  const ref               = useRef<HTMLDivElement>(null)
  const pathname          = usePathname()
  const initial           = name[0]?.toUpperCase() ?? "U"
  const firstName         = name.split(" ")[0]

  // Fecha ao navegar
  useEffect(() => { setOpen(false) }, [pathname])

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  // Fecha com Esc
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    if (open) document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      {/* Botão avatar */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Menu do usuário — ${firstName}`}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand border-2 border-white/30 text-sm font-bold text-white hover:opacity-90 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary overflow-hidden"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-[300] w-52 overflow-hidden rounded-xl border border-border bg-white shadow-xl"
        >
          {/* Header com nome */}
          <div className="border-b border-border bg-muted/40 px-4 py-3">
            <p className="text-xs text-muted-foreground">Conectado como</p>
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          </div>

          {/* Links */}
          <ul className="py-1">
            {MENU_ITEMS.map((item) => (
              <li key={item.href} role="none">
                <Link
                  href={item.href}
                  role="menuitem"
                  className="flex h-10 items-center gap-3 px-4 text-sm text-foreground hover:bg-brand/5 hover:text-brand transition-colors outline-none focus-visible:bg-brand/5"
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Divisor + Sair */}
          <div className="border-t border-border py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex h-10 w-full items-center gap-3 px-4 text-sm text-red-600 hover:bg-red-50 transition-colors outline-none focus-visible:bg-red-50"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
