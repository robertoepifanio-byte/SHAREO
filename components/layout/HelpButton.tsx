"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const HELP_ITEMS = [
  { href: "/ajuda#primeiros-passos", label: "Primeiros passos", icon: "🚀" },
  { href: "/ajuda#locatario",        label: "Quero alugar",     icon: "🛒" },
  { href: "/ajuda#locador",          label: "Quero anunciar",   icon: "📦" },
  { href: "/ajuda#taxas-secao",      label: "Taxas",            icon: "🧾" },
  { href: "/ajuda#disputas",         label: "Disputas",         icon: "⚖️" },
  { href: "/ajuda#suporte",          label: "Suporte",          icon: "🎧" },
  { href: "/ajuda#pagamento",        label: "Pagamento",        icon: "🔒" },
  { href: "/ajuda#legal",            label: "Legal e Fiscal",   icon: "📋" },
]

export function HelpButton() {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)
  const pathname        = usePathname()

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
      {/* Botão ? */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Central de Ajuda"
        aria-haspopup="true"
        aria-expanded={open}
        className="h-9 w-9 rounded-full bg-white/15 border border-white/30 text-white text-sm font-bold hover:bg-white/25 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary flex items-center justify-center"
      >
        ?
      </button>

      {/* Popover desktop */}
      {open && (
        <div className="absolute right-0 top-11 z-[300] w-56 rounded-xl border border-border bg-white shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-muted/40">
            <p className="text-xs text-muted-foreground font-semibold">Central de Ajuda</p>
          </div>

          {/* Links */}
          <ul>
            {HELP_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex h-10 items-center gap-3 px-4 text-sm text-foreground hover:bg-brand/5 hover:text-brand transition-colors outline-none focus-visible:bg-brand/5"
                  onClick={() => setOpen(false)}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Rodapé */}
          <div className="border-t border-border py-2 px-4">
            <Link
              href="/ajuda"
              className="text-xs text-brand hover:underline"
              onClick={() => setOpen(false)}
            >
              Ver tudo →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
