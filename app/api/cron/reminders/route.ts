/**
 * GET /api/cron/reminders
 * Executado diariamente às 08:00 BRT (11:00 UTC) via Vercel Cron.
 * Envia lembretes automáticos de reservas ao proprietário e locatário.
 */
import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { APP_URL } from "@/lib/app-url"
import { assertCronAuth } from "@/lib/auth/cron-guard"
import {
  sendReminderStartTomorrow,
  sendReminderReturnTomorrow,
  sendReminderOverdue,
  sendLateFeeEmail,
  bookingItemsLabel,
} from "@/lib/email"
import { getStripe } from "@/lib/stripe"
import { getLateFeeMultiplier, calcLateFee, STRIPE_CHARGE_EXPIRES_SECONDS } from "@/lib/platform-config"

export const runtime = "nodejs"
export const maxDuration = 60

const BATCH_SIZE = 10

function startOfDay(d: Date) {
  const r = new Date(d)
  r.setUTCHours(0, 0, 0, 0)
  return r
}
function endOfDay(d: Date) {
  const r = new Date(d)
  r.setUTCHours(23, 59, 59, 999)
  return r
}

// Processa items em lotes para evitar explodir o pool de conexões.
// Paralelo dentro do lote, sequencial entre lotes.
async function processInBatches<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<void>,
): Promise<{ ok: number; failed: number }> {
  let ok = 0, failed = 0
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize)
    const results = await Promise.allSettled(chunk.map(fn))
    for (const r of results) {
      if (r.status === "fulfilled") ok++
      else failed++
    }
  }
  return { ok, failed }
}

export async function GET(req: NextRequest) {
  const denied = assertCronAuth(req)
  if (denied) return denied

  const lateFeeMultiplier = await getLateFeeMultiplier()

  const today    = new Date()
  const tomorrow = new Date(today); tomorrow.setUTCDate(today.getUTCDate() + 1)

  const [startReminders, returnReminders, overdueBookings] = await Promise.all([
    // Reservas que começam amanhã (CONFIRMED ou ACTIVE)
    prisma.booking.findMany({
      where: {
        status:    { in: ["CONFIRMED", "ACTIVE"] },
        startDate: { gte: startOfDay(tomorrow), lte: endOfDay(tomorrow) },
        deletedAt: null,
      },
      select: {
        id: true, startDate: true, endDate: true, totalDays: true,
        item:     { select: { title: true } },
        borrower: { select: { email: true, name: true } },
        owner:    { select: { email: true, name: true } },
        _count:   { select: { bookingItems: true } },
      },
    }),

    // Reservas que vencem amanhã (ACTIVE)
    prisma.booking.findMany({
      where: {
        status:  "ACTIVE",
        endDate: { gte: startOfDay(tomorrow), lte: endOfDay(tomorrow) },
        deletedAt: null,
      },
      select: {
        id: true, startDate: true, endDate: true,
        item:     { select: { title: true } },
        borrower: { select: { email: true, name: true } },
        owner:    { select: { email: true, name: true } },
        _count:   { select: { bookingItems: true } },
      },
    }),

    // Reservas em atraso (ACTIVE e endDate < hoje)
    prisma.booking.findMany({
      where: {
        status:    "ACTIVE",
        endDate:   { lt: startOfDay(today) },
        deletedAt: null,
      },
      select: {
        id: true, startDate: true, endDate: true, dailyPrice: true, lateFeeAmount: true,
        item:     { select: { title: true, images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 } } },
        borrower: { select: { email: true, name: true } },
        owner:    { select: { email: true, name: true } },
        _count:   { select: { bookingItems: true } },
      },
    }),
  ])

  const sent:   string[] = []
  const failed: string[] = []

  const startStats = await processInBatches(startReminders, BATCH_SIZE, async (b) => {
    try {
      await sendReminderStartTomorrow(
        b.borrower.email, b.borrower.name,
        b.owner.email,    b.owner.name,
        bookingItemsLabel(b.item.title, b._count.bookingItems || 1), b.id,
        b.startDate,
      )
      sent.push(`start:${b.id}`)
    } catch (e) {
      console.error("[cron] start reminder", b.id, e)
      failed.push(`start:${b.id}`)
      throw e
    }
  })

  const returnStats = await processInBatches(returnReminders, BATCH_SIZE, async (b) => {
    try {
      await sendReminderReturnTomorrow(
        b.borrower.email, b.borrower.name,
        bookingItemsLabel(b.item.title, b._count.bookingItems || 1), b.id,
        b.endDate,
      )
      sent.push(`return:${b.id}`)
    } catch (e) {
      console.error("[cron] return reminder", b.id, e)
      failed.push(`return:${b.id}`)
      throw e
    }
  })

  const appUrl = APP_URL

  const overdueStats = await processInBatches(overdueBookings, BATCH_SIZE, async (b) => {
    const daysLate = Math.ceil(
      (startOfDay(today).getTime() - startOfDay(b.endDate).getTime()) / 86_400_000
    )
    const itemsLabel = bookingItemsLabel(b.item.title, b._count.bookingItems || 1)

    // Primeira detecção de atraso: grava lateFeeAmount + cria cobrança Stripe.
    // Ordem dentro de uma mesma reserva é intencional — não paralelizar.
    if (b.lateFeeAmount == null) {
      const lateFeeAmount = calcLateFee(b.dailyPrice, lateFeeMultiplier, daysLate)

      try {
        await prisma.booking.update({
          where: { id: b.id },
          data:  { lateFeeAmount },
        })

        const stripe = getStripe()
        const session = await stripe.checkout.sessions.create({
          mode:                 "payment",
          payment_method_types: ["card"],
          customer_email:       b.borrower.email,
          line_items: [{
            quantity: 1,
            price_data: {
              currency:     "brl",
              unit_amount:  lateFeeAmount,
              product_data: {
                name:        `Taxa de atraso — ${itemsLabel}`,
                description: `${daysLate} dia${daysLate > 1 ? "s" : ""} em atraso`,
                ...(b.item.images[0]?.url && { images: [b.item.images[0].url] }),
              },
            },
          }],
          metadata: { bookingId: b.id, type: "late_fee" },
          success_url: `${appUrl}/reservas/${b.id}?late_fee=paid`,
          cancel_url:  `${appUrl}/reservas/${b.id}`,
          // 🪤 Era `72 * 3600` aqui, e a Stripe recusa: o teto de `expires_at` é
          // 24h. Esta cobrança nunca foi exercitada, então o defeito ficou
          // latente até a mesma fórmula ser copiada para a cobrança de extensão
          // e falhar ao vivo (24/08/2026).
          expires_at:  Math.floor(Date.now() / 1000) + STRIPE_CHARGE_EXPIRES_SECONDS,
        })

        await sendLateFeeEmail(
          b.borrower.email, b.borrower.name,
          itemsLabel, b.id,
          lateFeeAmount, session.url!,
        )
        sent.push(`late_fee:${b.id}`)
      } catch (e) {
        console.error("[cron] late fee charge", b.id, e instanceof Error ? e.message : e)
        failed.push(`late_fee:${b.id}`)
        // Não propaga — o lembrete diário de atraso continua mesmo se a cobrança falhar
      }
    }

    // Lembrete diário de atraso (independente de já ter cobrado)
    try {
      await sendReminderOverdue(
        b.borrower.email, b.borrower.name,
        b.owner.email,    b.owner.name,
        itemsLabel,       b.id,
        b.endDate,        daysLate,
        b.dailyPrice,     lateFeeMultiplier,
      )
      sent.push(`overdue:${b.id}`)
    } catch (e) {
      console.error("[cron] overdue reminder", b.id, e)
      failed.push(`overdue:${b.id}`)
      throw e
    }
  })

  console.warn(
    `[cron/reminders] start=${startStats.ok}ok/${startStats.failed}fail` +
    ` return=${returnStats.ok}ok/${returnStats.failed}fail` +
    ` overdue=${overdueStats.ok}ok/${overdueStats.failed}fail`,
    { sent, failed },
  )

  return NextResponse.json({
    ok:        true,
    sent:      sent.length,
    failed:    failed.length,
    ids:       sent,
    failedIds: failed,
  })
}
