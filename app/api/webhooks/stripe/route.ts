import { NextResponse } from "next/server"
import type { Stripe } from "stripe"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { dispatchWebhookEvent } from "@/lib/outboundWebhooks"

// Vercel/Next.js: o body deve ser lido como raw buffer para validar a assinatura
export const config = { api: { bodyParser: false } }

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

  try {
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

        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            paymentStatus:         "PAID",
            stripePaymentIntentId: typeof session.payment_intent === "string"
              ? session.payment_intent
              : (session.payment_intent?.id ?? null),
            paidAt: new Date(),
          },
        })

        // Webhook de saída + notificação para o locador
        const booking = await prisma.booking.findUnique({
          where:  { id: bookingId },
          select: { ownerId: true, item: { select: { title: true } } },
        })
        if (booking) {
          dispatchWebhookEvent(booking.ownerId, "booking.paid", {
            bookingId,
            itemTitle: booking.item.title,
          })

          prisma.notification.create({
            data: {
              userId: booking.ownerId,
              type:   "BOOKING_CONFIRMED",
              title:  "Pagamento recebido!",
              body:   `O aluguel de "${booking.item.title}" foi pago. Combine a entrega com o locatário.`,
              data:   { bookingId },
            },
          }).catch((e) => console.error("[stripe webhook notification]", e instanceof Error ? e.message : e))
        }

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

      default:
        // Ignora eventos não tratados
        break
    }
  } catch (e) {
    console.error(`[stripe webhook] error processing ${event.type}:`, e instanceof Error ? e.message : e)
    // Retornar 500 faz o Stripe retentar o webhook
    return NextResponse.json({ error: "Processing error" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
