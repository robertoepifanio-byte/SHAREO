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
  disputeStatus,
  size = "md",
  className = "",
}: {
  status: string
  /**
   * Disputa é PARALELA ao status: a reserva em disputa continua "Em andamento"
   * ou "Devolução em andamento". Por isso o selo de disputa é um segundo selo,
   * ao lado do primeiro, e não um valor de `status` que substitui o ciclo de
   * vida — que era como funcionava até 01/09/2026.
   */
  disputeStatus?: string | null
  size?: "sm" | "md"
  className?: string
}) {
  const sizeCls = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs"
  const color   = STATUS_COLOR[status] ?? "bg-muted text-muted-foreground"
  const label   = BOOKING_STATUS_LABEL[status] ?? status
  const base    = "inline-flex items-center rounded-full font-semibold"
  return (
    <>
      <span className={`${base} ${color} ${sizeCls} ${className}`}>
        {label}
      </span>
      {disputeStatus === "OPEN" && (
        <span className={`${base} bg-orange-light text-orange-link ${sizeCls} ${className}`}>
          Em disputa
        </span>
      )}
    </>
  )
}
