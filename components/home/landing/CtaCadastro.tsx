// Fonte: apps/campanha/components/landing/CtaAncora.tsx — adaptado para
// apontar a /cadastro (conta real) em vez da âncora do formulário de lead.
import Link from "next/link"
import { UiIcon } from "./icons/UiIcon"

type Variante = "solido" | "azul"

const ESTILO: Record<Variante, string> = {
  solido:
    "border-transparent bg-brand text-white hover:bg-brand-hover focus-visible:ring-brand",
  azul:
    "border-transparent bg-blue-medium text-white hover:bg-primary focus-visible:ring-blue-medium",
}

export function CtaCadastro({
  children,
  href = "/cadastro",
  variante = "solido",
  larguraTotal = false,
  className = "",
}: {
  children: React.ReactNode
  href?: string
  variante?: Variante
  larguraTotal?: boolean
  className?: string
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-tap items-center justify-center gap-2 rounded-lg border px-6 py-3 text-center text-sm font-bold uppercase tracking-[0.4px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        ESTILO[variante]
      } ${larguraTotal ? "w-full" : ""} ${className}`}
    >
      {children}
      <UiIcon name="seta-direita" size={16} className="shrink-0" />
    </Link>
  )
}
