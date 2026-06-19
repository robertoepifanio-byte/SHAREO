/**
 * GET /api/cron/reminders
 * Executado diariamente às 08:00 BRT (11:00 UTC) via Vercel Cron.
 * Envia lembretes automáticos de reservas ao proprietário e locatário.
 */
import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { APP_URL } from "@/lib/app-url"
import {
  sendReminderStartTomorrow,
  sendReminderReturnTomorrow,
  sendReminderOverdue,
  sendLateFeeEmail,
} from "@/lib/email"
import { getStripe } from "@/lib/stripe"
import { getLateFeeMultiplier } from "@/lib/platform-config"

export const runtime = "nodejs"
export const maxDuration = 60

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

export async function GET(req: NextRequest) {
  // Proteção: apenas Vercel Cron ou CRON_SECRET correto
  const auth = req.headers.get("authorization")
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
      },
    }),
  ])

  const sent: string[] = []

  for (const b of startReminders) {
    await sendReminderStartTomorrow(
      b.borrower.email, b.borrower.name,
      b.owner.email,    b.owner.name,
      b.item.title,     b.id,
      b.startDate,
    ).catch((e) => console.error("[cron] start reminder", b.id, e))
    sent.push(`start:${b.id}`)
  }

  for (const b of returnReminders) {
    await sendReminderReturnTomorrow(
      b.borrower.email, b.borrower.name,
      b.item.title,     b.id,
      b.endDate,
    ).catch((e) => console.error("[cron] return reminder", b.id, e))
    sent.push(`return:${b.id}`)
  }

  const appUrl = APP_URL

  for (const b of overdueBookings) {
    const daysLate = Math.ceil(
      (startOfDay(today).getTime() - startOfDay(b.endDate).getTime()) / 86_400_000
    )

    // Primeira detecção de atraso: grava lateFeeAmount + cria cobrança Stripe
    if (b.lateFeeAmount == null) {
      const lateFeeAmount = Math.round(b.dailyPrice * lateFeeMultiplier * daysLate)

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
                name:        `Taxa de atraso — ${b.item.title}`,
                description: `${daysLate} dia${daysLate > 1 ? "s" : ""} em atraso`,
                ...(b.item.images[0]?.url && { images: [b.item.images[0].url] }),
              },
            },
          }],
          metadata: { bookingId: b.id, type: "late_fee" },
          success_url: `${appUrl}/reservas/${b.id}?late_fee=paid`,
          cancel_url:  `${appUrl}/reservas/${b.id}`,
          expires_at:  Math.floor(Date.now() / 1000) + 72 * 3600, // 72h
        })

        await sendLateFeeEmail(
          b.borrower.email, b.borrower.name,
          b.item.title, b.id,
          lateFeeAmount, session.url!,
        )
        sent.push(`late_fee:${b.id}`)
      } catch (e) {
        console.error("[cron] late fee charge", b.id, e instanceof Error ? e.message : e)
      }
    }

    // Lembrete diário de atraso (independente de já ter cobrado)
    await sendReminderOverdue(
      b.borrower.email, b.borrower.name,
      b.owner.email,    b.owner.name,
      b.item.title,     b.id,
      b.endDate,        daysLate,
      b.dailyPrice,     lateFeeMultiplier,
    ).catch((e) => console.error("[cron] overdue reminder", b.id, e))
    sent.push(`overdue:${b.id}`)
  }

  console.warn(`[cron/reminders] sent=${sent.length}`, sent)
  return NextResponse.json({ ok: true, sent: sent.length, ids: sent })
}
