/**
 * Estorno automático de cancelamento (pauta-raimundo-2026-08-22, item 1 —
 * decisão "automatizar" confirmada por Raimundo em 25/08/2026).
 *
 * Antes disto, `PATCH /api/bookings/:id` (action=cancel) só CALCULAVA
 * `refundAmount` e gravava no banco — o dinheiro só voltava ao cartão quando
 * alguém da equipe emitia o estorno à mão no Dashboard da Stripe. A parte
 * difícil (devolver ao proprietário o repasse que já tinha saído) já existia
 * em `reverseOwnerTransfer` e roda via webhook `charge.refunded` — este
 * módulo só cobre a ponta que faltava: emitir o `refunds.create` que dispara
 * esse webhook.
 */
import { getStripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

/**
 * Emite o estorno ao cartão do locatário e registra em PlatformTransaction
 * para auditoria — devolve o Refund criado.
 *
 * `idempotencyKey` por `bookingId`: se a rota de cancelamento reprocessar por
 * timeout de rede DEPOIS do Refund já ter sido criado na Stripe, a segunda
 * chamada devolve o Refund original em vez de estornar duas vezes.
 *
 * NÃO engolir o erro do lado de fora: se a Stripe recusar, quem chama decide
 * (hoje: loga e segue — o cancelamento já foi gravado, e o valor a devolver
 * continua visível em `booking.refundAmount` para reprocessamento manual).
 */
export async function emitCancellationRefund({
  bookingId,
  paymentIntentId,
  amount,
}: {
  bookingId:       string
  paymentIntentId: string
  amount:          number
}) {
  const stripe = getStripe()

  const refund = await stripe.refunds.create(
    { payment_intent: paymentIntentId, amount },
    { idempotencyKey: `cancellation-refund-${bookingId}` },
  )

  await prisma.platformTransaction.create({
    data: {
      bookingId,
      type:        "REFUND",
      amount,
      description: "Estorno automático por cancelamento",
      metadata:    { stripeRefundId: refund.id },
    },
  })

  return refund
}
