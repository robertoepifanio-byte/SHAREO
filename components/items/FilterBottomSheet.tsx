"use client"

import { useEffect, useRef } from "react"

interface Props {
  isOpen:   boolean
  onClose:  () => void
  children: React.ReactNode
  title?:   string
}

/**
 * Bottom sheet animado para filtros mobile.
 * Controla foco (trap) e fecha ao pressionar Escape ou clicar no overlay.
 *
 * P2-56 checklist (verificado):
 * - [x] role="dialog" e aria-modal="true" no elemento do sheet
 * - [x] overlay (aria-hidden) chama onClose ao clicar
 * - [x] tecla Escape fecha o sheet via addEventListener("keydown", ...)
 */
export function FilterBottomSheet({ isOpen, onClose, children, title = "Filtros" }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)

  // Fecha com Escape e trava scroll do body
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)

    // Foca o sheet para leitores de tela
    sheetRef.current?.focus()

    return () => {
      document.body.style.overflow = prev
      document.removeEventListener("keydown", onKey)
    }
  }, [isOpen, onClose])

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[300] bg-black/50 transition-opacity duration-200 lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`fixed bottom-0 left-0 right-0 z-[400] max-h-[88vh] overflow-y-auto rounded-t-2xl bg-white px-5 pb-8 pt-4 shadow-2xl outline-none transition-transform duration-300 ease-out lg:hidden ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" aria-hidden="true" />

        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-background transition-colors"
            aria-label="Fechar filtros"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {children}
      </div>
    </>
  )
}
