"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

interface Props {
  name:      string
  avatarUrl?: string | null
  role?:     string | null
}

const ATIVIDADE = [
  { href: "/reservas",   label: "Reservas",   icon: "📅" },
  { href: "/mensagens",  label: "Mensagens",  icon: "💬" },
  { href: "/dashboard",  label: "Dashboard",  icon: "📊" },
]

const ADMIN_ATALHOS = [
  { href: "/admin",            label: "Visão Geral", icon: "🏠" },
  { href: "/admin/usuarios",   label: "Usuários",    icon: "👥" },
  { href: "/admin/disputas",   label: "Disputas",    icon: "⚖️" },
]

const CONTA = [
  { href: "/perfil",            label: "Ver Perfil",   icon: "👤" },
  { href: "/perfil/editar",     label: "Editar dados", icon: "✏️" },
  { href: "/perfil/endereco",   label: "Endereço",     icon: "📍" },
  { href: "/perfil/seguranca",  label: "Segurança",    icon: "🔒" },
  { href: "/perfil/documentos", label: "Documentos",   icon: "🪪" },
  { href: "/perfil/indicacoes", label: "Indicações",   icon: "🎁" },
]

export function UserDropdown({ name, avatarUrl, role }: Props) {
  const isAdmin = role != null && role !== "USER"
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
          <Image src={avatarUrl} alt={name} width={36} height={36} className="h-full w-full object-cover" />
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

          {/* Seção: Atividade (usuário comum) / Atalhos admin */}
          <div className="px-4 pt-2.5 pb-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {isAdmin ? "Admin" : "Atividade"}
            </p>
          </div>
          <ul className="pb-1">
            {(isAdmin ? ADMIN_ATALHOS : ATIVIDADE).map((item) => (
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

          {/* Seção: Minha conta */}
          <div className="border-t border-border px-4 pt-2.5 pb-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Minha conta</p>
          </div>
          <ul className="pb-1">
            {CONTA.map((item) => (
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

          {/* Link Admin — apenas para admins */}
          {isAdmin && (
            <div className="border-t border-border py-1">
              <Link
                href="/admin"
                role="menuitem"
                className="flex h-10 items-center gap-3 px-4 text-sm font-semibold text-brand hover:bg-brand/5 transition-colors outline-none focus-visible:bg-brand/5"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
                Painel Admin
              </Link>
            </div>
          )}

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
