import { NextResponse, after } from "next/server"
import { randomInt } from "node:crypto"
import type { Stripe } from "stripe"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { dispatchWebhookEvent } from "@/lib/outboundWebhooks"
import { processAmbassadorOnBookingPaid, cancelAmbassadorCommissions } from "@/lib/ambassador"

// App Router já entrega o body raw via req.text() — não há bodyParser para desabilitar
// (o `export const config = { api: { bodyParser } }` do Pages Router é ignorado aqui).

export async function POST(req: Request) {
  const body      = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET not set")
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // Idempotência (S14-A-04): Stripe reenvia webhooks em retry — dedup por event.id
  // usando StripeEventQueue (@unique stripeEventId). Eventos já COMPLETED saem 200.
  const prior = await prisma.stripeEventQueue
    .findUnique({ where: { stripeEventId: event.id }, select: { status: true } })
    .catch(() => null)
  if (prior?.status === "COMPLETED") {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    await prisma.stripeEventQueue.upsert({
      where:  { stripeEventId: event.id },
      create: { stripeEventId: event.id, type: event.type, payload: event as unknown as Prisma.InputJsonValue, status: "PROCESSING" },
      update: { status: "PROCESSING", attempts: { increment: 1 } },
    })

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const bookingId = session.metadata?.bookingId

        if (!bookingId) {
          console.warn("[stripe webhook] checkout.session.completed: no bookingId in metadata")
          break
        }

        if (session.payment_status !== "paid") {
          console.warn(`[stripe webhook] session ${session.id} completed but payment_status=${session.payment_status}`)
          break
        }

        const paymentIntentId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent?.id ?? null)

        const isLateFee = session.metadata?.type === "late_fee"

        if (isLateFee) {
          // Taxa de atraso paga — registra e notifica ambas as partes
          await prisma.booking.update({
            where: { id: bookingId },
            data:  { lateFeeAmount: session.amount_total ?? undefined },
          })

          const booking = await prisma.booking.findUnique({
            where:  { id: bookingId },
            select: {
              ownerId: true, borrowerId: true,
              item:    { select: { title: true } },
            },
          })
          if (booking) {
            after(() =>
              prisma.notification.create({
                data: {
                  userId: booking.ownerId,
                  type:   "LATE_FEE_APPLIED" as never,
                  title:  "Taxa de atraso recebida",
                  body:   `A taxa de atraso de "${booking.item.title}" foi paga.`,
                  data:   { bookingId },
                },
              }).catch(() => undefined)
            )

            after(() =>
              prisma.notification.create({
                data: {
                  userId: booking.borrowerId,
                  type:   "LATE_FEE_APPLIED" as never,
                  title:  "Taxa de atraso paga",
                  body:   `Pagamento da taxa de atraso de "${booking.item.title}" confirmado.`,
                  data:   { bookingId },
                },
              }).catch(() => undefined)
            )
          }

          console.warn(`[stripe webhook] late_fee paid for booking ${bookingId}`)
          break
        }

        // Pagamento de aluguel normal — gera token de retirada único de 6 dígitos
        let pickupToken: string
        for (;;) {
          const candidate = String(randomInt(100000, 1000000))
          const conflict  = await prisma.booking.findFirst({ where: { pickupToken: candidate }, select: { id: true } })
          if (!conflict) { pickupToken = candidate; break }
        }

        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            paymentStatus:         "PAID",
            stripePaymentIntentId: paymentIntentId,
            paidAt:                new Date(),
            pickupToken,
          },
        })

        const booking = await prisma.booking.findUnique({
          where:  { id: bookingId },
          select: {
            ownerId: true,
            pickupToken: true,
            item: { select: { title: true } },
            owner: {
              select: {
                name: true, cep: true, street: true,
                neighborhood: true, city: true, state: true,
              },
            },
          },
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
            }).catch((e) => console.error("[stripe webhook notification]", e instanceof Error ? e.message : e))
          )
        }

        // Gerar comissão do embaixador se o locatário foi indicado — após a resposta
        after(() =>
          processAmbassadorOnBookingPaid(bookingId).catch((e) =>
            console.error("[stripe webhook] ambassador commission error:", e instanceof Error ? e.message : e)
          )
        )

        console.warn(`[stripe webhook] booking ${bookingId} paid (session ${session.id})`)
        break
      }

      case "checkout.session.expired": {
        const session    = event.data.object as Stripe.Checkout.Session
        const bookingId  = session.metadata?.bookingId
        if (bookingId) {
          // Remove o stripeSessionId expirado para permitir nova tentativa de pagamento
          await prisma.booking.update({
            where: { id: bookingId },
            data:  { stripeSessionId: null },
          })
          console.warn(`[stripe webhook] checkout session expired for booking ${bookingId}`)
        }
        break
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge
        if (charge.payment_intent) {
          const intentId = typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent.id

          await prisma.booking.updateMany({
            where: { stripePaymentIntentId: intentId },
            data:  { paymentStatus: "REFUNDED" },
          })
          console.warn(`[stripe webhook] refund for intent ${intentId}`)
        }
        break
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute
        const intentId = typeof dispute.payment_intent === "string"
          ? dispute.payment_intent
          : (dispute.payment_intent?.id ?? null)

        if (!intentId) {
          console.warn("[stripe webhook] charge.dispute.created: no payment_intent")
          break
        }

        const updated = await prisma.booking.updateMany({
          where: { stripePaymentIntentId: intentId },
          data:  { status: "DISPUTED", stripeDisputeId: dispute.id },
        })

        if (updated.count > 0) {
          // Notifica admins financeiros sobre a disputa
          const admins = await prisma.user.findMany({
            where:  { role: "ADMIN", adminRole: "ADMIN_FINANCEIRO" },
            select: { id: true },
          })
          for (const admin of admins) {
            after(() =>
              prisma.notification.create({
                data: {
                  userId: admin.id,
                  type:   "BOOKING_CANCELLED" as never, // reuse existing type
                  title:  "⚠️ Disputa aberta no Stripe",
                  body:   `Chargeback criado: dispute ${dispute.id} (R$ ${((dispute.amount ?? 0) / 100).toFixed(2)})`,
                  data:   { disputeId: dispute.id, paymentIntentId: intentId },
                },
              }).catch(() => undefined)
            )
          }
          console.warn(`[stripe webhook] dispute created ${dispute.id} — booking marked DISPUTED`)
        } else {
          console.warn(`[stripe webhook] dispute ${dispute.id}: no booking found for intent ${intentId}`)
        }
        break
      }

      case "charge.dispute.closed": {
        const dispute = event.data.object as Stripe.Dispute
        const intentId = typeof dispute.payment_intent === "string"
          ? dispute.payment_intent
          : (dispute.payment_intent?.id ?? null)

        if (!intentId) break

        // Se a disputa foi perdida → CANCELLED (sem repasse)
        // Se ganhou ou fechou sem penalidade → volta a COMPLETED
        const newStatus = dispute.status === "lost" ? "CANCELLED" : "COMPLETED"

        await prisma.booking.updateMany({
          where: { stripePaymentIntentId: intentId, status: "DISPUTED" },
          data:  { status: newStatus },
        })

        // Cancelar comissões de embaixador se dispute perdida
        if (dispute.status === "lost") {
          const lostBooking = await prisma.booking.findFirst({
            where:  { stripePaymentIntentId: intentId },
            select: { id: true },
          })
          if (lostBooking) {
            after(() =>
              cancelAmbassadorCommissions(lostBooking.id, `Dispute ${dispute.id} lost`).catch(() => undefined)
            )
          }
        }

        console.warn(
          `[stripe webhook] dispute closed ${dispute.id} status=${dispute.status} → booking ${newStatus}`,
        )
        break
      }

      default:
        // Ignora eventos não tratados
        break
    }

    await prisma.stripeEventQueue.update({
      where: { stripeEventId: event.id },
      data:  { status: "COMPLETED", processedAt: new Date() },
    })
  } catch (e) {
    console.error(`[stripe webhook] error processing ${event.type}:`, e instanceof Error ? e.message : e)
    // Marca FAILED para permitir reprocessamento no retry do Stripe (dedup só bloqueia COMPLETED)
    await prisma.stripeEventQueue
      .update({ where: { stripeEventId: event.id }, data: { status: "FAILED", lastError: e instanceof Error ? e.message : String(e) } })
      .catch(() => undefined)
    // Retornar 500 faz o Stripe retentar o webhook
    return NextResponse.json({ error: "Processing error" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
