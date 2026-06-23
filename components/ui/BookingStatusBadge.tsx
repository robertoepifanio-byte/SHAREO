/**
 * Selo de status de RESERVA — fonte única dos rótulos e cores dos 7 estados.
 * Antes, o mapa `STATUS_LABEL` estava copiado em /reservas, /reservas/[id],
 * /admin/reservas/[id] e /dashboard (com risco de divergir entre as telas).
 *
 * O mapa de rótulos é exportado para quem precisa só do texto (ex.: dashboard).
 */
export const BOOKING_STATUS_LABEL: Record<string, string> = {
  PENDING:   "Aguardando",
  CONFIRMED: "Confirmada",
  ACTIVE:    "Em andamento",
  RETURNED:  "Devolução em andamento",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
  DISPUTED:  "Em disputa",
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:   "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-medium/10 text-blue-medium",
  ACTIVE:    "bg-brand/10 text-brand",
  RETURNED:  "bg-purple-100 text-purple-700",
  COMPLETED: "bg-success/10 text-success",
  CANCELLED: "bg-destructive/10 text-destructive",
  DISPUTED:  "bg-orange-light text-orange-link",
}

export function BookingStatusBadge({
  status,
  size = "md",
  className = "",
}: {
  status: string
  size?: "sm" | "md"
  className?: string
}) {
  const sizeCls = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs"
  const color   = STATUS_COLOR[status] ?? "bg-muted text-muted-foreground"
  const label   = BOOKING_STATUS_LABEL[status] ?? status
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${color} ${sizeCls} ${className}`}>
      {label}
    </span>
  )
}
