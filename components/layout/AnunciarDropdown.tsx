"use client"

import { useRef, useState } from "react"
import Link from "next/link"

const OPCOES = [
  {
    href:  "/itens/novo",
    icon:  "📦",
    label: "Cadastre seu Item",
    desc:  "Anuncie em poucos minutos",
  },
  {
    href:  "/anunciar/estimativa",
    icon:  "💰",
    label: "Estimativa de Ganhos",
    desc:  "Veja quanto pode ganhar por mês",
  },
  {
    href:  "/anunciar/dicas",
    icon:  "💡",
    label: "Dicas para Anfitriões",
    desc:  "Como alugar mais e melhor",
  },
]

export function AnunciarDropdown() {
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
      <Link
        href="/itens/novo"
        className="rounded-md px-3 py-1.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white flex items-center gap-1"
        aria-haspopup="true"
        aria-expanded={open}
      >
        Anunciar
        <svg
          width="10" height="10" viewBox="0 0 12 12"
          fill="none" stroke="currentColor" strokeWidth="2"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </Link>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 z-[300] w-64 overflow-hidden rounded-xl border border-border bg-white shadow-xl"
        >
          <div className="border-b border-border bg-muted/40 px-4 py-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Anunciar item
            </p>
          </div>
          <ul className="py-1">
            {OPCOES.map((op) => (
              <li key={op.href} role="none">
                <Link
                  href={op.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-2.5 hover:bg-brand/5 hover:text-brand transition-colors outline-none focus-visible:bg-brand/5"
                >
                  <span className="text-lg leading-none mt-0.5" aria-hidden="true">{op.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground leading-tight">{op.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{op.desc}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
