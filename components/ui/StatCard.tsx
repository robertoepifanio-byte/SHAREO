import type { ReactNode } from "react"

type Accent = "primary" | "brand" | "success" | "warning" | "danger" | "foreground"

const accentClasses: Record<Accent, string> = {
  primary:    "text-primary",
  brand:      "text-brand",
  success:    "text-success",
  warning:    "text-amber-600",
  danger:     "text-destructive",
  foreground: "text-foreground",
}

/**
 * Card de métrica (número grande + rótulo + subtexto opcional).
 * Substitui as ~5 implementações locais (`MetricCard`, `StatCard`, anônimas)
 * espalhadas pelas páginas admin e /meus-anuncios/desempenho.
 */
export function StatCard({
  label,
  value,
  sub,
  accent = "primary",
  className = "",
}: {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  accent?: Accent
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-4 ${className}`}>
      <p className={`text-2xl font-bold ${accentClasses[accent]}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      {sub != null && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}
