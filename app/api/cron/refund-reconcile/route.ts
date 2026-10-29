/**
 * GET /api/cron/refund-reconcile
 * Executado de hora em hora via Vercel Cron.
 *
 * Fila de reprocessamento de estornos (follow-up do #7, Red Team 2026-10-28).
 * Quando `emitCancellationRefund` falha no cancelamento de uma reserva ou no
 * desfecho de uma disputa, `recordRefundFailure` (lib/payments/refund.ts)
 * enfileira um `PendingRefund` PENDING. Este cron pega os PENDING e reexecuta o
 * mesmo `emitCancellationRefund` — a idempotencyKey por `${motivo}-${bookingId}`
 * garante que uma tentativa que de fato criou o Refund na Stripe (mas falhou
 * depois, ao gravar o PlatformTransaction) NÃO estorna de novo.
 *
 * Desfecho por linha:
 *  - sucesso           → COMPLETED
 *  - falha, attempts < teto → continua PENDING (tenta de novo no próximo ciclo)
 *  - falha, attempts = teto → FAILED + alerta no Sentry (exige intervenção)
 */
import { NextResponse, type NextRequest } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { prisma } from "@/lib/prisma"
import { assertCronAuth } from "@/lib/auth/cron-guard"
import { emitCancellationRefund, type RefundMotivo } from "@/lib/payments/refund"

export const runtime     = "nodejs"
export const maxDuration = 60

const BATCH_SIZE = 20
// Teto de tentativas: depois disto o estorno para de ser reprocessado sozinho e
// vira trabalho manual (com alerta no Sentry). 5 ciclos de 1h cobrem uma queda
// prolongada da Stripe sem martelar um estorno que nunca vai passar (ex.: cartão
// cancelado), que só um humano resolve com outro meio de devolução.
const MAX_ATTEMPTS = 5

export async function GET(req: NextRequest) {
  const denied = assertCronAuth(req)
  if (denied) return denied

  const pendentes = await prisma.pendingRefund.findMany({
    where:   { status: "PENDING" },
    take:    BATCH_SIZE,
    orderBy: { createdAt: "asc" },
    select:  { id: true, bookingId: true, paymentIntentId: true, amount: true, motivo: true, attempts: true },
  })

  let done    = 0
  let retried = 0
  let failed  = 0

  for (const p of pendentes) {
    // Claim por optimistic lock: incrementa `attempts` só se a linha ainda está
    // PENDING. Se um ciclo concorrente já a pegou, count===0 e seguimos — e,
    // mesmo que dois ciclos a peguem, a idempotencyKey da Stripe colapsa os dois
    // `refunds.create` num único Refund.
    const claimed = await prisma.pendingRefund.updateMany({
      where: { id: p.id, status: "PENDING" },
      data:  { attempts: { increment: 1 } },
    })
    if (claimed.count === 0) continue

    const attempts = p.attempts + 1

    try {
      await emitCancellationRefund({
        bookingId:       p.bookingId,
        paymentIntentId: p.paymentIntentId,
        amount:          p.amount,
        motivo:          p.motivo as RefundMotivo,
      })
      await prisma.pendingRefund.update({
        where: { id: p.id },
        data:  { status: "COMPLETED", lastError: null },
      })
      done++
      console.warn(`[cron/refund-reconcile] COMPLETED id=${p.id} booking=${p.bookingId} motivo=${p.motivo} amount=${p.amount} attempts=${attempts}`)
    } catch (e) {
      const err     = e instanceof Error ? e : new Error(String(e))
      const esgotou  = attempts >= MAX_ATTEMPTS

      await prisma.pendingRefund.update({
        where: { id: p.id },
        data:  { status: esgotou ? "FAILED" : "PENDING", lastError: err.message },
      }).catch((dbErr) =>
        console.error(`[cron/refund-reconcile] id=${p.id} — atualizar status falhou:`, dbErr instanceof Error ? dbErr.message : dbErr),
      )

      if (esgotou) {
        failed++
        // Esgotou o reprocessamento automático: o estorno NÃO saiu depois de
        // MAX_ATTEMPTS ciclos. Alerta para que um operador devolva o valor por
        // outro meio — o dinheiro devido segue em booking.refundAmount.
        console.error(`[cron/refund-reconcile] FAILED (teto ${MAX_ATTEMPTS}) id=${p.id} booking=${p.bookingId} motivo=${p.motivo}: ${err.message}`)
        Sentry.captureException(err, {
          extra: { pendingRefundId: p.id, bookingId: p.bookingId, amount: p.amount, motivo: p.motivo, attempts },
          tags:  { pagamento: "refund-reconcile-exhausted" },
        })
      } else {
        retried++
        console.warn(`[cron/refund-reconcile] RETRY id=${p.id} booking=${p.bookingId} attempts=${attempts}/${MAX_ATTEMPTS}: ${err.message}`)
      }
    }
  }

  return NextResponse.json({
    ok:        true,
    done,
    retried,
    failed,
    timestamp: new Date().toISOString(),
  })
}
