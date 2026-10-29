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
import * as Sentry from "@sentry/nextjs"
import { getStripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

/** Origem do estorno — separa a chave de idempotência e o registro contábil. */
export type RefundMotivo = "cancellation" | "dispute-partial" | "dispute-full"

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
  motivo?:         RefundMotivo
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
        : motivo === "dispute-full"
        ? "Estorno integral por decisão de disputa"
        : "Estorno automático por cancelamento",
      metadata:    { stripeRefundId: refund.id },
    },
  })

  return refund
}

/**
 * Registra uma falha de estorno de forma VISÍVEL e REPROCESSÁVEL (follow-up do
 * #7, Red Team 2026-10-28). Chamada no catch dos pontos que emitem estorno
 * (cancelamento de reserva e desfecho de disputa).
 *
 * Faz três coisas, nesta ordem de importância:
 *  1. loga (operador lendo o console vê na hora);
 *  2. alerta no Sentry com a tag `refund-failure` (mantém o alerta que o #7 já
 *     tinha criado);
 *  3. enfileira um `PendingRefund` PENDING para o cron de reconciliação
 *     reprocessar — a parte que o #7 deixou como follow-up.
 *
 * 🪤 Upsert por (bookingId, motivo): se a mesma falha reaparecer (retry da rota),
 * NÃO cria uma segunda linha — soma +1 em `attempts` e atualiza `lastError`,
 * mantendo a linha em PENDING para o cron. Duas linhas PENDING para o mesmo
 * estorno fariam o cron disparar dois `refunds.create` concorrentes (a
 * idempotencyKey da Stripe os colapsa, mas é desperdício e ruído).
 *
 * NUNCA lança: um erro ao enfileirar não pode derrubar a rota que já respondeu
 * o cancelamento/a disputa. Se o próprio enqueue falhar, resta o log + Sentry.
 */
export async function recordRefundFailure({
  bookingId,
  paymentIntentId,
  amount,
  motivo,
  error,
}: {
  bookingId:       string
  paymentIntentId: string
  amount:          number
  motivo:          RefundMotivo
  error:           unknown
}): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error))

  console.error(`[refund] estorno (${motivo}) de ${amount} em ${bookingId} FALHOU:`, err.message)
  Sentry.captureException(err, {
    extra: { bookingId, amount, motivo },
    tags:  { pagamento: "refund-failure" },
  })

  try {
    await prisma.pendingRefund.upsert({
      where:  { bookingId_motivo: { bookingId, motivo } },
      create: { bookingId, paymentIntentId, amount, motivo, status: "PENDING", attempts: 0, lastError: err.message },
      // Reabre para reprocessamento: se uma tentativa anterior marcou FAILED e a
      // falha voltou a acontecer no fluxo normal, volta a PENDING. `attempts` NÃO
      // zera — o teto do cron continua valendo sobre o total histórico.
      update: { status: "PENDING", amount, paymentIntentId, lastError: err.message },
    })
  } catch (e) {
    // Último recurso: o enqueue não pode mascarar nem substituir o alerta acima.
    console.error(
      `[refund] id=${bookingId} motivo=${motivo} — enfileirar PendingRefund falhou:`,
      e instanceof Error ? e.message : e,
    )
  }
}
