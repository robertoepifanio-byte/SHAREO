/**
 * GET /api/cron/reminders
 * Executado diariamente às 08:00 BRT (11:00 UTC) via Vercel Cron.
 * Envia lembretes automáticos de reservas ao proprietário e locatário.
 */
import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  sendReminderStartTomorrow,
  sendReminderReturnTomorrow,
  sendReminderOverdue,
} from "@/lib/email"

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
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
        id: true, startDate: true, endDate: true, dailyPrice: true,
        item:     { select: { title: true } },
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

  for (const b of overdueBookings) {
    const daysLate = Math.ceil(
      (startOfDay(today).getTime() - startOfDay(b.endDate).getTime()) / 86_400_000
    )
    await sendReminderOverdue(
      b.borrower.email, b.borrower.name,
      b.owner.email,    b.owner.name,
      b.item.title,     b.id,
      b.endDate,        daysLate,
      b.dailyPrice,
    ).catch((e) => console.error("[cron] overdue reminder", b.id, e))
    sent.push(`overdue:${b.id}`)
  }

  console.log(`[cron/reminders] sent=${sent.length}`, sent)
  return NextResponse.json({ ok: true, sent: sent.length, ids: sent })
}
