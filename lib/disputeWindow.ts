/**
 * Janela de abertura de disputa — assimétrica por quem abre.
 *
 * pauta-raimundo-2026-08-22, item 3 — decisão de Raimundo (25/08/2026):
 *   - Locatário: só durante a locação ativa (entre a retirada e a devolução)
 *     — nunca depois de já ter devolvido.
 *   - Locador: só depois que o locatário devolveu (mark_returned), e só até
 *     48h depois disso — `returnRequestedAt`, não `returnedAt` (esse último
 *     só é gravado em confirm_return, que já tira a reserva de RETURNED e
 *     encerra a janela de qualquer forma).
 *
 * Usado por PATCH /api/bookings/:id (action=open_dispute) e pela rota
 * dedicada POST /api/bookings/:id/dispute — as duas checavam a mesma regra
 * copiada, com risco de uma mudar (ex.: 48h → 72h) e a outra ficar pra trás.
 */
const DISPUTE_WINDOW_HOURS = 48

export type DisputeWindowResult =
  | { ok: true }
  | { ok: false; message: string }

export function checkDisputeWindow(
  booking: { status: string; returnRequestedAt: Date | null },
  role: { isBorrower: boolean; isOwner: boolean },
): DisputeWindowResult {
  if (role.isBorrower && booking.status !== "ACTIVE") {
    return {
      ok:      false,
      message: "Como locatário, você só pode abrir uma disputa entre a retirada e a devolução do item.",
    }
  }

  if (role.isOwner) {
    if (booking.status !== "RETURNED") {
      return {
        ok:      false,
        message: "Como locador, você só pode abrir uma disputa depois que o locatário devolver o item.",
      }
    }
    const deadline = booking.returnRequestedAt
      ? new Date(booking.returnRequestedAt.getTime() + DISPUTE_WINDOW_HOURS * 60 * 60 * 1000)
      : null
    if (deadline && new Date() > deadline) {
      return {
        ok:      false,
        message: `O prazo de ${DISPUTE_WINDOW_HOURS}h após a devolução para abrir disputa já passou.`,
      }
    }
  }

  return { ok: true }
}
