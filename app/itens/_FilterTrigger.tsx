"use client"

import { useState } from "react"
import { FilterBottomSheet } from "@/components/items/FilterBottomSheet"

interface Props {
  hasFilters: boolean
  children:   React.ReactNode   // <FilterForm ... /> vindo do Server Component pai
}

/**
 * Botão "Filtros" + FilterBottomSheet para mobile.
 * Recebe FilterForm como children para respeitar o padrão
 * Server Component → Client Component do Next.js App Router.
 */
export function FilterTrigger({ hasFilters, children }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Botão trigger — visível apenas em mobile */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden mb-5 flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground hover:bg-background transition-colors"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
            <line x1="11" y1="18" x2="13" y2="18"/>
          </svg>
          Filtros
        </span>
        {hasFilters && (
          <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">
            Ativos
          </span>
        )}
      </button>

      {/* Bottom sheet com FilterForm como children */}
      <FilterBottomSheet isOpen={open} onClose={() => setOpen(false)}>
        {children}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full rounded-lg bg-brand py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
          >
            Ver resultados
          </button>
        </div>
      </FilterBottomSheet>
    </>
  )
}
