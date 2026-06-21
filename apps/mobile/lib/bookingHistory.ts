/**
 * bookingHistory.ts (mobile) — espelho do lib/bookingHistory.ts do projeto web.
 * Mantido separado porque apps/mobile é um projeto Expo independente com seu
 * próprio tsconfig (paths @/* → ./apps/mobile/*).
 *
 * Ao alterar a lógica de derivação, atualizar também: lib/bookingHistory.ts (web).
 */

export interface BookingHistoryEvent {
  key:       string
  at:        Date
  label:     string
  actor:     string | null
  actorRole: "borrower" | "owner" | "system"
}

interface BookingForHistory {
  createdAt:            Date
  respondedAt:          Date | null
  paidAt:               Date | null
  activatedAt:          Date | null
  returnRequestedAt:    Date | null
  returnedAt:           Date | null
  cancelledAt:          Date | null
  cancelReason:         string | null
  extensionRequestedAt: Date | null
  extensionRespondedAt: Date | null
  extensionStatus:      string | null
  status:               string
  borrower: { name: string }
  owner:    { name: string }
}

/** Retorna eventos em ordem cronológica crescente (mais antigo primeiro). */
export function deriveBookingHistory(b: BookingForHistory): BookingHistoryEvent[] {
  const events: BookingHistoryEvent[] = []

  events.push({
    key:       "created",
    at:        b.createdAt,
    label:     "Solicitação criada",
    actor:     b.borrower.name,
    actorRole: "borrower",
  })

  if (b.respondedAt) {
    if (
      b.status === "CANCELLED" &&
      b.cancelledAt &&
      b.cancelledAt.getTime() === b.respondedAt.getTime()
    ) {
      // Cancelado pelo owner logo na resposta — evento de cancelamento cobre isso
    } else {
      events.push({
        key:       "responded",
        at:        b.respondedAt,
        label:     "Solicitação aceita pelo Locador",
        actor:     b.owner.name,
        actorRole: "owner",
      })
    }
  }

  if (b.paidAt) {
    events.push({
      key:       "paid",
      at:        b.paidAt,
      label:     "Pagamento confirmado",
      actor:     null,
      actorRole: "system",
    })
  }

  if (b.activatedAt) {
    events.push({
      key:       "activated",
      at:        b.activatedAt,
      label:     "Produto retirado — Locação iniciada",
      actor:     b.owner.name,
      actorRole: "owner",
    })
  }

  if (b.returnRequestedAt) {
    events.push({
      key:       "return_requested",
      at:        b.returnRequestedAt,
      label:     "Devolução solicitada pelo Locatário",
      actor:     b.borrower.name,
      actorRole: "borrower",
    })
  }

  if (b.returnedAt) {
    const label = b.returnRequestedAt
      ? "Devolução confirmada pelo Locador"
      : "Devolução registrada"
    events.push({
      key:       "returned",
      at:        b.returnedAt,
      label,
      actor:     b.owner.name,
      actorRole: "owner",
    })
  }

  if (b.extensionRequestedAt) {
    events.push({
      key:       "extension_requested",
      at:        b.extensionRequestedAt,
      label:     "Extensão de prazo solicitada",
      actor:     b.borrower.name,
      actorRole: "borrower",
    })
  }

  if (b.extensionRespondedAt && b.extensionStatus) {
    const approved = b.extensionStatus === "APPROVED"
    events.push({
      key:       "extension_responded",
      at:        b.extensionRespondedAt,
      label:     approved ? "Extensão de prazo aprovada" : "Extensão de prazo recusada",
      actor:     b.owner.name,
      actorRole: "owner",
    })
  }

  if (b.cancelledAt) {
    events.push({
      key:       "cancelled",
      at:        b.cancelledAt,
      label:     b.cancelReason
        ? `Locação cancelada — ${b.cancelReason.slice(0, 80)}`
        : "Locação cancelada",
      actor:     null,
      actorRole: "system",
    })
  }

  events.sort((a, b) => a.at.getTime() - b.at.getTime())

  return events
}
