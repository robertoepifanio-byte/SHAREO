"use client"

import { useEffect, useState } from "react"

interface Props {
  pricePerDay: number   // centavos
  isLoggedIn:  boolean
  itemId:      string
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

/**
 * CTA fixo no rodapé — visível apenas em mobile (lg:hidden).
 * Desaparece quando o usuário rola até a seção #price-calc (PriceCalc já visível).
 */
export function StickyBookingCTA({ pricePerDay, isLoggedIn, itemId }: Props) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const calc = document.getElementById("price-calc")
    if (!calc) return

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0.1 },
    )
    observer.observe(calc)
    return () => observer.disconnect()
  }, [])

  if (!visible) return null

  const href = isLoggedIn
    ? `/reservas/nova?itemId=${itemId}`
    : `/login?next=/itens/${itemId}`

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[150] flex items-center justify-between gap-4 border-t border-border bg-white px-4 py-3 pb-[env(safe-area-inset-bottom,12px)] shadow-[0_-4px_16px_rgba(0,0,0,.1)] lg:hidden"
      role="complementary"
      aria-label="Reservar item"
    >
      <div>
        <p className="text-xl font-extrabold text-brand leading-none">
          {fmt(pricePerDay)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">/dia</span>
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Pagamento protegido</p>
      </div>
      <a
        href={href}
        className="inline-flex h-11 items-center rounded-lg bg-brand px-6 text-sm font-bold text-white hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none"
      >
        Reservar agora
      </a>
    </div>
  )
}
