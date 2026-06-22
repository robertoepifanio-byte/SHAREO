import type { Prisma } from "@prisma/client"

/**
 * Disponibilidade de itens (Story B / ADR-025).
 *
 * A fonte de verdade da ocupação é a tabela `booking_items` — NÃO o `Booking.itemId`,
 * que enxerga apenas o item principal de uma locação. Numa locação com vários itens
 * do mesmo dono, os itens secundários só existem em `booking_items`; consultar por
 * `Booking.itemId` deixaria esses itens "sempre livres" (double-booking silencioso).
 */

// Status que efetivamente bloqueiam a disponibilidade de um item numa janela.
const BLOCKING_STATUSES: Prisma.BookingWhereInput["status"] = { in: ["CONFIRMED", "ACTIVE"] }

/**
 * Procura, entre os itens informados, o primeiro que já está reservado numa janela
 * que sobrepõe [startDate, endDate). Deve rodar DENTRO da transação que cria/confirma
 * a reserva (o check + write na mesma transação evitam corrida de double-booking).
 *
 * Retorna o `itemId` em conflito, ou `null` se todos estão livres.
 */
export async function findOverlappingItem(
  tx: Prisma.TransactionClient,
  itemIds: string[],
  startDate: Date,
  endDate: Date,
  excludeBookingId?: string,
): Promise<string | null> {
  const hit = await tx.bookingItem.findFirst({
    where: {
      itemId: { in: itemIds },
      booking: {
        status: BLOCKING_STATUSES,
        deletedAt: null, // não bloquear por reservas soft-deletadas (defesa em profundidade)
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        AND: [
          { startDate: { lt: endDate } },
          { endDate: { gt: startDate } },
        ],
      },
    },
    select: { itemId: true },
  })
  return hit?.itemId ?? null
}
