import type { ReactNode } from "react"

type Variant = "success" | "warning" | "danger" | "info" | "brand" | "neutral"
type Size = "sm" | "md"

const variantClasses: Record<Variant, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-amber-100 text-amber-800",
  danger:  "bg-destructive/10 text-destructive",
  info:    "bg-blue-medium/10 text-blue-medium",
  brand:   "bg-brand/10 text-brand",
  neutral: "bg-muted text-muted-foreground",
}

const sizeClasses: Record<Size, string> = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-0.5 text-xs",
}

/**
 * Pill genérico de status/papel. Use para selos como "Verificado", "ADMIN",
 * "Loja", "inativo", status de PIX/repasse, etc. — em vez de repetir as classes
 * Tailwind inline em cada tela. Para status de RESERVA, prefira
 * <BookingStatusBadge> (cores específicas por estado).
 */
export function StatusBadge({
  variant = "neutral",
  size = "md",
  children,
  className = "",
}: {
  variant?: Variant
  size?: Size
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  )
}
