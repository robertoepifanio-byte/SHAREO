import type { ReactNode } from "react"
import Link from "next/link"

/**
 * Estado vazio padrão (ícone em círculo + título + descrição + CTA opcional).
 * Substitui o bloco `flex flex-col items-center justify-center py-20 …` copiado
 * em /reservas, /mensagens, /favoritos, /loja, MyItemsGrid, desempenho, etc.
 *
 * `icon` recebe o SVG/emoji concreto; o wrapper circular é do componente.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: { label: string; href: string }
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 text-center ${className}`}>
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <h2 className="mb-2 font-semibold text-primary">{title}</h2>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-flex h-11 items-center rounded-lg bg-brand px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
