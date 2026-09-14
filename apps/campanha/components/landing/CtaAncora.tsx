import { CTA_HREF } from "@/lib/landing-content"
import { UiIcon } from "./icons/UiIcon"

/**
 * Botão-âncora da landing.
 *
 * O destino é fixo, e isso é a decisão de conversão do redesenho: a landing
 * anterior tinha três botões concorrentes no hero, e dividir a atenção entre
 * destinos diferentes foi um dos diagnósticos. Não aceitar `href` faz a
 * decisão valer por construção — quem quiser um link para outro lugar escreve
 * um `<a>`, e fica evidente na revisão que abriu uma segunda saída.
 *
 * É `<a>` puro, sem JS: funciona antes da hidratação e para quem navega por
 * teclado. `min-h-tap` (44px) é o mínimo do projeto para alvo de toque.
 */
type Variante = "solido" | "azul"

const ESTILO: Record<Variante, string> = {
  solido:
    "border-transparent bg-brand text-white hover:bg-brand-hover focus-visible:ring-brand",
  azul:
    "border-transparent bg-blue-medium text-white hover:bg-primary focus-visible:ring-blue-medium",
}

/**
 * Classes do botão, exportadas para quem precisa do MESMO visual com um destino
 * diferente — hoje só o cabeçalho das páginas legais, que volta para a landing
 * em vez de rolar até o formulário. Evita uma segunda cópia de ~40 classes.
 */
export const ESTILO_CTA =
  "inline-flex min-h-tap items-center justify-center gap-2 rounded-lg border px-6 py-3 text-center text-sm font-bold uppercase tracking-[0.4px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 border-transparent bg-brand text-white hover:bg-brand-hover focus-visible:ring-brand"

export function CtaAncora({
  children,
  variante = "solido",
  larguraTotal = false,
  className = "",
}: {
  children: React.ReactNode
  variante?: Variante
  larguraTotal?: boolean
  className?: string
}) {
  return (
    <a
      href={CTA_HREF}
      className={`inline-flex min-h-tap items-center justify-center gap-2 rounded-lg border px-6 py-3 text-center text-sm font-bold uppercase tracking-[0.4px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        ESTILO[variante]
      } ${larguraTotal ? "w-full" : ""} ${className}`}
    >
      {children}
      <UiIcon name="seta-direita" size={16} className="shrink-0" />
    </a>
  )
}
