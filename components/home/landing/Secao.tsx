// Fonte: apps/campanha/components/landing/Secao.tsx
import type { ReactNode } from "react"

type Variante = "navy" | "clara" | "suave"

const FUNDO: Record<Variante, string> = {
  navy: "bg-navy-deep text-white",
  clara: "bg-background text-foreground",
  suave: "bg-surface-muted text-foreground",
}

export function Secao({
  id,
  variante = "clara",
  rotuladoPor,
  className = "",
  children,
}: {
  id?: string
  variante?: Variante
  rotuladoPor?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={rotuladoPor}
      className={`scroll-mt-16 px-5 py-14 sm:px-6 xl:py-20 ${FUNDO[variante]} ${className}`}
    >
      <div className="mx-auto max-w-[1200px]">{children}</div>
    </section>
  )
}

export function TituloSecao({
  id,
  children,
  className = "",
  sobreNavy = false,
}: {
  id?: string
  children: ReactNode
  className?: string
  sobreNavy?: boolean
}) {
  return (
    <h2
      id={id}
      className={`font-display text-[24px] font-extrabold leading-tight xl:text-[32px] ${
        sobreNavy ? "text-white" : "text-primary"
      } ${className}`}
    >
      {children}
    </h2>
  )
}
