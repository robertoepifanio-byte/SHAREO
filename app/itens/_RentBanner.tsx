"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

const DISMISS_KEY = "shareo-rent-banner-dismissed"

export function RentBanner() {
  // Começa oculto para evitar hydration mismatch; useEffect decide com base no localStorage
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) !== "1") setVisible(true)
  }, [])

  function dismiss() {
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, "1")
  }

  if (!visible) return null

  return (
    <div className="mb-6 rounded-xl border border-brand/30 bg-brand/5 px-5 py-4 flex gap-4 items-start">
      {/* Ícone */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-xl">
        🛒
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Como alugar no ShareO</p>
        <ol className="mt-2 space-y-1 text-sm text-muted-foreground list-none">
          <li className="flex items-center gap-2">
            <span className="inline-flex w-5 h-5 rounded-full bg-brand text-white text-[10px] font-bold items-center justify-center flex-shrink-0">1</span>
            Escolha um item e clique em <strong className="text-foreground">&ldquo;Reservar&rdquo;</strong>
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-flex w-5 h-5 rounded-full bg-brand text-white text-[10px] font-bold items-center justify-center flex-shrink-0">2</span>
            Informe as datas e aguarde a aprovação do dono
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-flex w-5 h-5 rounded-full bg-brand text-white text-[10px] font-bold items-center justify-center flex-shrink-0">3</span>
            Combine a retirada e aproveite!
          </li>
        </ol>
        <Link
          href="/ajuda#como-alugar"
          className="mt-2 inline-block text-xs font-medium text-brand hover:underline"
        >
          Saiba mais na Central de Ajuda →
        </Link>
      </div>

      {/* Fechar */}
      <button
        onClick={dismiss}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Fechar dica"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}
