import { after } from "next/server"
import { randomInt } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { dispatchWebhookEvent } from "@/lib/outboundWebhooks"
import { processAmbassadorOnBookingPaid } from "@/lib/ambassador"

/**
 * Efeitos de "aluguel pago" para o caminho Mercado Pago — espelha o handler de
 * `checkout.session.completed` do webhook do Stripe (pickupToken + notificações +
 * comissão de embaixador), para manter paridade de comportamento entre PSPs.
 *
 * Idempotente: se a reserva já está PAID, não faz nada (o webhook do MP pode
 * reentregar a mesma notificação; a fila já deduplicar, isto é cinto-e-suspensório).
 */
export async function markRentalPaid({
  bookingId,
  mpPaymentId,
}: {
  bookingId: string
  mpPaymentId: string
}): Promise<void> {
  const current = await prisma.booking.findUnique({
    where:  { id: bookingId },
    select: { paymentStatus: true },
  })
  if (!current || current.paymentStatus === "PAID") return

  // Token de retirada único de 6 dígitos (crypto, não Math.random) — SEC-MAJ-09.
  let pickupToken: string | null = null
  for (let attempt = 0; attempt < 12 && !pickupToken; attempt++) {
    const candidate = String(randomInt(100000, 1000000))
    const conflict  = await prisma.booking.findFirst({ where: { pickupToken: candidate }, select: { id: true } })
    if (!conflict) pickupToken = candidate
  }
  if (!pickupToken) throw new Error("pickupToken generation exhausted") // o MP re-tenta o webhook

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      paymentStatus: "PAID",
      mpPaymentId,
      paidAt:        new Date(),
      pickupToken,
    },
  })

  const booking = await prisma.booking.findUnique({
    where:  { id: bookingId },
    select: { ownerId: true, item: { select: { title: true } } },
  })
  if (booking) {
    after(() =>
      dispatchWebhookEvent(booking.ownerId, "booking.paid", {
        bookingId,
        itemTitle: booking.item.title,
      })
    )
    after(() =>
      prisma.notification.create({
        data: {
          userId: booking.ownerId,
          type:   "BOOKING_CONFIRMED",
          title:  "Pagamento recebido!",
          body:   `O aluguel de "${booking.item.title}" foi pago. Combine a entrega com o locatário.`,
          data:   { bookingId },
        },
      }).catch((e) => console.error("[markRentalPaid notification]", e instanceof Error ? e.message : e))
    )
  }

  after(() =>
    processAmbassadorOnBookingPaid(bookingId).catch((e) =>
      console.error("[markRentalPaid] ambassador commission error:", e instanceof Error ? e.message : e)
    )
  )
}
