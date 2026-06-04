"use client"

import { useRef, useState } from "react"
import Link from "next/link"

const SECTIONS = [
  { href: "/",                  label: "Topo da página",          icon: "🏠" },
  { href: "/#simulador",        label: "Quanto posso ganhar?",    icon: "💰" },
  { href: "/#categorias",       label: "Explorar por categoria",  icon: "🏷️" },
  { href: "/#como-funciona",    label: "Como funciona",           icon: "⚙️" },
  { href: "/#casos-renda",      label: "Quem já está ganhando",   icon: "⭐" },
  { href: "/#itens-procurados", label: "Itens mais procurados",   icon: "🔥" },
  { href: "/#seguranca",        label: "Segurança",               icon: "🔒" },
]

export function HomeDropdown() {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }

  function handleLeave() {
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Trigger — mesmo estilo dos links do nav */}
      <Link
        href="/"
        className="rounded-md px-3 py-1.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white flex items-center gap-1"
        aria-haspopup="true"
        aria-expanded={open}
      >
        Início
        <svg
          width="10" height="10" viewBox="0 0 12 12"
          fill="none" stroke="currentColor" strokeWidth="2"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </Link>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 z-[300] w-56 overflow-hidden rounded-xl border border-border bg-white shadow-xl"
        >
          <div className="border-b border-border bg-muted/40 px-4 py-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Ir para
            </p>
          </div>
          <ul className="py-1">
            {SECTIONS.map((s) => (
              <li key={s.href} role="none">
                <Link
                  href={s.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex h-10 items-center gap-3 px-4 text-sm text-foreground hover:bg-brand/5 hover:text-brand transition-colors outline-none focus-visible:bg-brand/5"
                >
                  <span aria-hidden="true">{s.icon}</span>
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
