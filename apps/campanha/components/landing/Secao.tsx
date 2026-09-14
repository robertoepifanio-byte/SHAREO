import type { ReactNode } from "react"

/**
 * Casca das seções da landing.
 *
 * Existe por causa do `scroll-mt-16`: o cabeçalho é sticky com `h-16`, e sem
 * essa margem de rolagem toda seção alcançada por âncora nasce escondida atrás
 * dele. Centralizar aqui garante que a próxima seção criada não esqueça —
 * âncora quebrada por 64px é o tipo de defeito que passa despercebido no
 * desenvolvimento e só aparece no anúncio pago.
 *
 * As variantes `navy` usam cor FIXA (não token de superfície): são idênticas no
 * tema claro e no escuro, como no design. As variantes claras usam só tokens,
 * então acompanham o tema.
 */
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

/**
 * Título de seção. Centraliza a escala tipográfica para os `h2` não divergirem
 * de uma seção para outra conforme a página cresce.
 */
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
