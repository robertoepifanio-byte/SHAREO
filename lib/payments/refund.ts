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
 * Taxa REAL que a Stripe cobrou na cobrança original (não estimada).
 *
 * pauta-raimundo-2026-08-22, item 2 — decisão de Raimundo (25/08/2026): quando
 * é o locatário quem cancela, ele absorve essa taxa. Vem de
 * `balance_transaction.fee` (centavos), a mesma fonte que a Stripe usa para
 * o próprio extrato — nunca uma estimativa de percentual fixo.
 *
 * Retorna 0 (nunca lança) se a taxa não puder ser apurada — nesse caso quem
 * chama trata como "sem desconto", o que só pode favorecer o locatário, nunca
 * prejudicar (ver lib/cancellationPolicy.ts calcRefund).
 */
export async function getChargeFeeCents(paymentIntentId: string): Promise<number> {
  try {
    const stripe = getStripe()
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge.balance_transaction"],
    })
    const charge = intent.latest_charge
    if (!charge || typeof charge === "string") return 0
    const bt = charge.balance_transaction
    if (!bt || typeof bt === "string") return 0
    return bt.fee
  } catch (e) {
    console.error("[getChargeFeeCents]", e instanceof Error ? e.message : e)
    return 0
  }
}

/**
 * Emite o estorno ao cartão do locatário e registra em PlatformTransaction
 * para auditoria — devolve o Refund criado.
 *
 * `idempotencyKey` por `bookingId` + `motivo`: se a rota reprocessar por timeout
 * de rede DEPOIS do Refund já ter sido criado na Stripe, a segunda chamada
 * devolve o Refund original em vez de estornar duas vezes.
 *
 * 🪤 O `motivo` entra na chave de propósito. Com a chave só por `bookingId`,
 * uma reserva estornada parcialmente numa disputa NUNCA mais poderia receber
 * outro estorno — a Stripe devolveria o Refund antigo, no valor antigo, e o
 * segundo estorno sumiria em silêncio parecendo sucesso.
 *
 * NÃO engolir o erro do lado de fora: se a Stripe recusar, quem chama decide
 * (hoje: loga e segue — o cancelamento já foi gravado, e o valor a devolver
 * continua visível em `booking.refundAmount` para reprocessamento manual).
 */
export async function emitCancellationRefund({
  bookingId,
  paymentIntentId,
  amount,
  motivo = "cancellation",
}: {
  bookingId:       string
  paymentIntentId: string
  amount:          number
  /** Origem do estorno — separa a chave de idempotência e o registro contábil. */
  motivo?:         "cancellation" | "dispute-partial"
}) {
  const stripe = getStripe()

  const refund = await stripe.refunds.create(
    { payment_intent: paymentIntentId, amount },
    { idempotencyKey: `${motivo}-refund-${bookingId}` },
  )

  await prisma.platformTransaction.create({
    data: {
      bookingId,
      type:        "REFUND",
      amount,
      description: motivo === "dispute-partial"
        ? "Estorno parcial por decisão de disputa"
        : "Estorno automático por cancelamento",
      metadata:    { stripeRefundId: refund.id },
    },
  })

  return refund
}
