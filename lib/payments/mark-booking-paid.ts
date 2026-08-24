import { after } from "next/server"
import { randomInt } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { dispatchWebhookEvent } from "@/lib/outboundWebhooks"
import { processAmbassadorOnBookingPaid } from "@/lib/ambassador"

/**
 * Efeitos de "aluguel pago" — ÚNICA implementação, compartilhada pelos dois
 * PSPs (pickupToken + notificações + comissão de embaixador).
 *
 * Este arquivo já existia espelhando o handler do Stripe "para manter paridade
 * de comportamento entre PSPs". Em 20/08/2026 (ADR-028) o caminho Stripe passou
 * a ter DOIS gatilhos — `checkout.session.completed` (cartão) e
 * `checkout.session.async_payment_succeeded` (Pix/boleto, que confirmam depois)
 * — e a cópia virou a chamada certa em vez de uma terceira duplicata.
 *
 * A guarda de idempotência abaixo é o motivo prático de existir um lugar só:
 * a fila `StripeEventQueue` deduplica por `event.id`, mas `completed` e
 * `async_payment_succeeded` são eventos DIFERENTES — só esta guarda impede
 * que um reprocessamento regenere o `pickupToken` e invalide o código que o
 * locatário já tem em mãos.
 */
export async function markRentalPaid({
  bookingId,
  stripePaymentIntentId,
}: {
  bookingId:              string
  stripePaymentIntentId?: string | null
}): Promise<void> {
  const current = await prisma.booking.findUnique({
    where:  { id: bookingId },
    select: { paymentStatus: true },
  })
  if (!current || current.paymentStatus === "PAID") return

  // Token de retirada único de 6 dígitos (crypto, não Math.random) — SEC-MAJ-09.
  let pickupToken: string | null = null
  for (let attempt = 0; attempt < 12 && !pickupToken; attempt++) { // ARQ-ALTO-14: teto de tentativas
    const candidate = String(randomInt(100000, 1000000))
    const conflict  = await prisma.booking.findFirst({ where: { pickupToken: candidate }, select: { id: true } })
    if (!conflict) pickupToken = candidate
  }
  if (!pickupToken) throw new Error("pickupToken generation exhausted") // o PSP re-tenta o webhook

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      paymentStatus: "PAID",
      paidAt:        new Date(),
      pickupToken,
      // Prisma trata `undefined` como "não mexe na coluna".
      stripePaymentIntentId: stripePaymentIntentId ?? undefined,
    },
    select: { ownerId: true, item: { select: { title: true } } },
  })

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

  after(() =>
    processAmbassadorOnBookingPaid(bookingId).catch((e) =>
      console.error("[markRentalPaid] ambassador commission error:", e instanceof Error ? e.message : e)
    )
  )
}
