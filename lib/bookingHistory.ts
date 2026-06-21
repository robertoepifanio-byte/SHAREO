/**
 * bookingHistory.ts — deriva a lista de eventos de histórico de uma locação
 * a partir dos timestamps do Booking (sem tabela de audit trail separada).
 *
 * DECISÃO: usamos derivação de timestamps + campo returnRequestedAt para
 * separar "Devolução solicitada" de "Devolução confirmada". Isso evita uma
 * tabela de eventos com 6+ pontos de gravação, mantendo fidelidade completa
 * para reservas pós-deploy e backfill razoável para as antigas.
 *
 * Limitação para reservas antigas (pré-deploy desta feature):
 *   - Se returnRequestedAt = null mas returnedAt != null, inferimos que a
 *     devolução foi solicitada e confirmada no mesmo instante (ou que a
 *     solicitação aconteceu antes deste deploy). Exibimos apenas 1 evento
 *     de devolução com nota "(momento exato da solicitação não registrado)".
 */

export interface BookingHistoryEvent {
  /** Identificador único do evento (usado como key em listas React) */
  key: string
  /** Timestamp do evento */
  at: Date
  /** Descrição legível do evento */
  label: string
  /** Nome do usuário responsável (quando aplicável) */
  actor: string | null
  /** Papel do ator: "borrower" | "owner" | "system" */
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

/**
 * Retorna os eventos em ORDEM CRONOLÓGICA CRESCENTE (mais antigo primeiro).
 * O componente de UI inverte para exibir o mais recente no topo.
 */
export function deriveBookingHistory(b: BookingForHistory): BookingHistoryEvent[] {
  const events: BookingHistoryEvent[] = []

  // 1. Criação da reserva (sempre presente)
  events.push({
    key:       "created",
    at:        b.createdAt,
    label:     "Solicitação criada",
    actor:     b.borrower.name,
    actorRole: "borrower",
  })

  // 2. Resposta do locador (aceite ou recusa na mesma data/hora)
  if (b.respondedAt) {
    if (b.status === "CANCELLED" && b.cancelledAt &&
        b.cancelledAt.getTime() === b.respondedAt.getTime()) {
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

  // 3. Pagamento confirmado
  if (b.paidAt) {
    events.push({
      key:       "paid",
      at:        b.paidAt,
      label:     "Pagamento confirmado",
      actor:     null,
      actorRole: "system",
    })
  }

  // 4. Produto retirado (retirada confirmada pelo locador)
  if (b.activatedAt) {
    events.push({
      key:       "activated",
      at:        b.activatedAt,
      label:     "Produto retirado — Locação iniciada",
      actor:     b.owner.name,
      actorRole: "owner",
    })
  }

  // 5a. Devolução solicitada pelo locatário (mark_returned)
  if (b.returnRequestedAt) {
    events.push({
      key:       "return_requested",
      at:        b.returnRequestedAt,
      label:     "Devolução solicitada pelo Locatário",
      actor:     b.borrower.name,
      actorRole: "borrower",
    })
  }

  // 5b. Devolução confirmada pelo locador (confirm_return)
  if (b.returnedAt) {
    // Só adiciona "Devolução confirmada" se for distinto de returnRequestedAt
    // (reservas antigas podem ter apenas returnedAt sem returnRequestedAt)
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

  // 6. Extensão de prazo solicitada
  if (b.extensionRequestedAt) {
    events.push({
      key:       "extension_requested",
      at:        b.extensionRequestedAt,
      label:     "Extensão de prazo solicitada",
      actor:     b.borrower.name,
      actorRole: "borrower",
    })
  }

  // 7. Extensão de prazo respondida
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

  // 8. Cancelamento
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

  // Ordena cronologicamente (mais antigo primeiro)
  events.sort((a, b) => a.at.getTime() - b.at.getTime())

  return events
}

/**
 * Campos necessários para selecionar do Prisma ao usar deriveBookingHistory.
 * Use no select do Prisma para não over-fetchar.
 */
export const BOOKING_HISTORY_SELECT = {
  createdAt:            true,
  respondedAt:          true,
  paidAt:               true,
  activatedAt:          true,
  returnRequestedAt:    true,
  returnedAt:           true,
  cancelledAt:          true,
  cancelReason:         true,
  extensionRequestedAt: true,
  extensionRespondedAt: true,
  extensionStatus:      true,
  status:               true,
} as const
