import { after } from "next/server"
import type { Stripe } from "stripe"
import { getStripe, idOf } from "@/lib/stripe"
import { verifyStripeWebhookRequest } from "@/lib/payments/stripe-webhook"
import { prisma } from "@/lib/prisma"
import { cancelAmbassadorCommissions } from "@/lib/ambassador"
import { markRentalPaid } from "@/lib/payments/mark-booking-paid"
import { aplicarExtensao } from "@/lib/payments/extension"
import { reverseOwnerTransfer } from "@/lib/payments/owner-transfer"
import { withStripeEventQueue } from "@/lib/payments/stripe-event-queue"

// App Router já entrega o body raw via req.text() — não há bodyParser para desabilitar
// (o `export const config = { api: { bodyParser } }` do Pages Router é ignorado aqui).

const LOG = "[stripe webhook]"

/** Taxa de atraso paga — registra o valor e avisa as duas partes. */
async function handleLateFeePaid(session: Stripe.Checkout.Session, bookingId: string): Promise<void> {
  const booking = await prisma.booking.update({
    where:  { id: bookingId },
    data:   { lateFeeAmount: session.amount_total ?? undefined },
    select: { ownerId: true, borrowerId: true, item: { select: { title: true } } },
  })

  after(() =>
    prisma.notification.createMany({
      data: [
        {
          userId: booking.ownerId,
          type:   "LATE_FEE_APPLIED" as never,
          title:  "Taxa de atraso recebida",
          body:   `A taxa de atraso de "${booking.item.title}" foi paga.`,
          data:   { bookingId },
        },
        {
          userId: booking.borrowerId,
          type:   "LATE_FEE_APPLIED" as never,
          title:  "Taxa de atraso paga",
          body:   `Pagamento da taxa de atraso de "${booking.item.title}" confirmado.`,
          data:   { bookingId },
        },
      ],
    }).catch(() => undefined)
  )

  console.warn(`${LOG} late_fee paid for booking ${bookingId}`)
}

/**
 * Diárias extras de uma extensão pagas — é AQUI que a extensão passa a valer
 * (ATOR-03; o racional completo está em lib/payments/extension.ts).
 *
 * O `payment_intent` é gravado na reserva porque é dele que sai o Transfer da
 * extensão: a cobrança da locação não tem esse dinheiro, e a Stripe exige
 * `source_transaction` no Brasil.
 */
async function handleExtensionPaid(session: Stripe.Checkout.Session, bookingId: string): Promise<void> {
  const resultado = await aplicarExtensao(bookingId, idOf(session.payment_intent))

  if (!resultado.aplicada) {
    // Retorno silencioso aqui significaria "a Stripe recebeu o dinheiro e nada
    // aconteceu" — o desfecho que mais precisa de rastro.
    console.warn(`${LOG} extensão NÃO aplicada em ${bookingId}: ${resultado.motivo} (session ${session.id})`)
    return
  }

  const booking = await prisma.booking.findUnique({
    where:  { id: bookingId },
    select: { ownerId: true, borrowerId: true, endDate: true, item: { select: { title: true } } },
  })
  if (!booking) return

  // As duas partes precisam saber: o proprietário aceitou e ficou esperando o
  // dinheiro; o locatário precisa ver que a data mudou de fato.
  const ate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Fortaleza" })
    .format(booking.endDate)

  after(() =>
    prisma.notification.createMany({
      data: [
        {
          userId: booking.borrowerId,
          type:   "EXTENSION_APPROVED",
          title:  "Extensão confirmada",
          body:   `As diárias extras de "${booking.item.title}" foram pagas. A devolução passa a ser ${ate}.`,
          data:   { bookingId },
        },
        {
          userId: booking.ownerId,
          type:   "EXTENSION_APPROVED",
          title:  "Extensão paga",
          body:   `O locatário pagou as diárias extras de "${booking.item.title}". A devolução passa a ser ${ate}.`,
          data:   { bookingId },
        },
      ],
    }).catch((e) => console.error(`${LOG} notificação de extensão:`, e instanceof Error ? e.message : e))
  )

  console.warn(`${LOG} extensão aplicada em ${bookingId}: +${resultado.dias}d, ${resultado.valor} centavos (session ${session.id})`)
}

/**
 * Sessão de Checkout efetivamente paga. Dois gatilhos chegam aqui:
 * `checkout.session.completed` (cartão — já nasce "paid") e
 * `checkout.session.async_payment_succeeded` (Pix/boleto, ADR-028 — a sessão
 * "completa" antes e o pagamento confirma depois).
 */
async function handleCheckoutSessionPaid(session: Stripe.Checkout.Session): Promise<void> {
  const bookingId = session.metadata?.bookingId
  if (!bookingId) {
    console.warn(`${LOG} ${session.id}: sem bookingId em metadata`)
    return
  }

  if (session.metadata?.type === "late_fee") {
    await handleLateFeePaid(session, bookingId)
    return
  }

  // ATOR-03 — diárias extras de uma extensão aceita. A reserva JÁ está paga:
  // esta cobrança é do valor adicional, e é aqui que a extensão passa a valer.
  // Sem este ramo, cairia em markRentalPaid e o `endDate` nunca se moveria.
  if (session.metadata?.type === "extension") {
    await handleExtensionPaid(session, bookingId)
    return
  }

  await markRentalPaid({ bookingId, stripePaymentIntentId: idOf(session.payment_intent) })
  console.warn(`${LOG} booking ${bookingId} paid (session ${session.id})`)
}

export async function POST(req: Request) {
  const verified = await verifyStripeWebhookRequest<Stripe.Event>(req, {
    logPrefix:    LOG,
    secretEnvVar: "STRIPE_WEBHOOK_SECRET",
    verify:       (body, signature, secret) => getStripe().webhooks.constructEvent(body, signature, secret),
  })
  if (!verified.ok) return verified.response
  const event = verified.payload

  return withStripeEventQueue({ id: event.id, type: event.type, payload: event }, LOG, async () => {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.payment_status !== "paid") {
          // Pix/boleto (ADR-028): a sessão completa antes do pagamento
          // confirmar — quem marca pago é async_payment_succeeded.
          console.warn(`${LOG} session ${session.id} completed but payment_status=${session.payment_status} (aguardando confirmação assíncrona)`)
          break
        }

        await handleCheckoutSessionPaid(session)
        break
      }

      case "checkout.session.async_payment_succeeded": {
        // Pix/boleto confirmados (ADR-028) — já chega "paid".
        await handleCheckoutSessionPaid(event.data.object as Stripe.Checkout.Session)
        break
      }

      // Sessão morreu sem pagar: expirou, ou o Pix/boleto não foi compensado
      // (ADR-028). Mesmo desfecho — solta o stripeSessionId pra permitir nova
      // tentativa. `updateMany` e não `update`: se a reserva sumiu, `update`
      // lançaria P2025 → 500 → a Stripe retentaria pra sempre um evento que
      // nunca vai dar certo.
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const session   = event.data.object as Stripe.Checkout.Session
        const bookingId = session.metadata?.bookingId
        if (bookingId) {
          await prisma.booking.updateMany({
            where: { id: bookingId, paymentStatus: { not: "PAID" } },
            data:  { stripeSessionId: null },
          })
          console.warn(`${LOG} ${event.type} → booking ${bookingId} liberado para nova tentativa (session ${session.id})`)
        }
        break
      }

      case "charge.refunded": {
        const charge   = event.data.object as Stripe.Charge
        const intentId = idOf(charge.payment_intent)
        if (!intentId) break

        const bookings = await prisma.booking.updateManyAndReturn({
          where:  { stripePaymentIntentId: intentId },
          data:   { paymentStatus: "REFUNDED" },
          select: { id: true },
        })

        // ADR-028 — o dinheiro voltou pro locatário: se o repasse ao
        // proprietário já tinha saído, traz de volta a parte proporcional.
        // NÃO engolir o erro: deixar propagar marca o evento FAILED e faz a
        // Stripe retentar, que é o que se quer quando dinheiro ficou no
        // lugar errado. `charge.amount_refunded` é cumulativo por cobrança.
        await Promise.all(bookings.map((booking) =>
          reverseOwnerTransfer({
            bookingId:      booking.id,
            clawbackAmount: charge.amount_refunded,
            chargedAmount:  charge.amount,
            reason:         `Reembolso da reserva ${booking.id}`,
          })
        ))

        console.warn(`${LOG} refund for intent ${intentId}`)
        break
      }

      case "charge.dispute.created": {
        const dispute  = event.data.object as Stripe.Dispute
        const intentId = idOf(dispute.payment_intent)

        if (!intentId) {
          console.warn(`${LOG} charge.dispute.created: no payment_intent`)
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
          if (admins.length > 0) {
            after(() =>
              prisma.notification.createMany({
                data: admins.map((admin) => ({
                  userId: admin.id,
                  type:   "BOOKING_CANCELLED" as never, // reuse existing type
                  title:  "⚠️ Disputa aberta no Stripe",
                  body:   `Chargeback criado: dispute ${dispute.id} (R$ ${((dispute.amount ?? 0) / 100).toFixed(2)})`,
                  data:   { disputeId: dispute.id, paymentIntentId: intentId },
                })),
              }).catch(() => undefined)
            )
          }
          console.warn(`${LOG} dispute created ${dispute.id} — booking marked DISPUTED`)
        } else {
          console.warn(`${LOG} dispute ${dispute.id}: no booking found for intent ${intentId}`)
        }
        break
      }

      case "charge.dispute.closed": {
        const dispute  = event.data.object as Stripe.Dispute
        const intentId = idOf(dispute.payment_intent)
        if (!intentId) break

        // Se a disputa foi perdida → CANCELLED (sem repasse)
        // Se ganhou ou fechou sem penalidade → volta a COMPLETED
        const isLost    = dispute.status === "lost"
        const newStatus = isLost ? "CANCELLED" : "COMPLETED"

        const affected = await prisma.booking.updateManyAndReturn({
          where:  { stripePaymentIntentId: intentId, status: "DISPUTED" },
          data:   { status: newStatus },
          select: { id: true, totalPrice: true },
        })

        if (isLost) {
          // ADR-028 — disputa perdida é o outro caminho de "o dinheiro voltou
          // pro locatário". `dispute.amount` é o valor contestado e
          // `booking.totalPrice` é o que foi cobrado (o mesmo `unit_amount`
          // mandado pra Checkout Session), então dá pra proporcionalizar sem
          // uma ida extra à API buscar o charge.
          await Promise.all(affected.map(async (booking) => {
            after(() =>
              cancelAmbassadorCommissions(booking.id, `Dispute ${dispute.id} lost`).catch(() => undefined)
            )
            await reverseOwnerTransfer({
              bookingId:      booking.id,
              clawbackAmount: dispute.amount ?? booking.totalPrice,
              chargedAmount:  booking.totalPrice,
              reason:         `Disputa perdida ${dispute.id}`,
            })
          }))
        }

        console.warn(`${LOG} dispute closed ${dispute.id} status=${dispute.status} → booking ${newStatus}`)
        break
      }

      // `account.updated` (v1) não é assinado por este endpoint de propósito:
      // as connected accounts que criamos hoje são Accounts v2 (ver
      // lib/stripe-connect.ts), que não disparam esse evento — usam Event
      // Destinations ("thin"), tratados em
      // app/api/webhooks/stripe-connect/route.ts. Cai aqui no default.
      default:
        // Ignora eventos não tratados
        break
    }
  })
}
