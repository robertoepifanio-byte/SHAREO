/**
 * Envelope de idempotência dos webhooks do Stripe (S14-A-04).
 *
 * Extraído quando o webhook de Connect (ADR-028) virou a SEGUNDA rota a
 * gravar na mesma tabela `StripeEventQueue` — duas cópias do mesmo contrato
 * sobre a mesma tabela é o ponto em que a divergência vira risco, não
 * abstração prematura.
 *
 * O contrato que este arquivo passa a declarar em um lugar só:
 *   - `COMPLETED` bloqueia reprocessamento (a Stripe reentrega em retry).
 *   - `FAILED` deliberadamente NÃO bloqueia — é o que permite o retry
 *     consertar uma falha transitória.
 *   - erro no handler ⇒ 500, porque é assim que se pede retry à Stripe.
 *
 * NÃO cobre o webhook do Mercado Pago (app/api/mp/webhook/route.ts): tabela
 * diferente (`MercadoPagoEventQueue`) e semântica de retry própria.
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

interface QueuedEvent {
  id:      string
  type:    string
  payload: unknown
}

/**
 * Roda `handler` sob a fila de eventos e devolve a resposta HTTP que a Stripe
 * espera. O handler deve LANÇAR para pedir retry — o 500 e a marcação
 * `FAILED` saem daqui.
 */
export async function withStripeEventQueue(
  event: QueuedEvent,
  logPrefix: string,
  handler: () => Promise<void>,
): Promise<NextResponse> {
  const prior = await prisma.stripeEventQueue
    .findUnique({ where: { stripeEventId: event.id }, select: { status: true } })
    .catch(() => null)
  if (prior?.status === "COMPLETED") {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    await prisma.stripeEventQueue.upsert({
      where:  { stripeEventId: event.id },
      create: {
        stripeEventId: event.id,
        type:          event.type,
        payload:       event.payload as Prisma.InputJsonValue,
        status:        "PROCESSING",
      },
      update: { status: "PROCESSING", attempts: { increment: 1 } },
    })

    await handler()

    await prisma.stripeEventQueue.update({
      where: { stripeEventId: event.id },
      data:  { status: "COMPLETED", processedAt: new Date() },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`${logPrefix} error processing ${event.type}:`, msg)
    await prisma.stripeEventQueue
      .update({ where: { stripeEventId: event.id }, data: { status: "FAILED", lastError: msg } })
      .catch(() => undefined)
    return NextResponse.json({ error: "Processing error" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
