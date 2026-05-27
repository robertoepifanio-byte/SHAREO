/**
 * GET /api/cron/auto-cancel
 * Executado a cada 6h via Vercel Cron.
 * Cancela automaticamente reservas PENDING sem resposta do proprietário após 48h.
 */
import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime  = "nodejs"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  // Proteção: apenas Vercel Cron ou CRON_SECRET correto
  const auth   = req.headers.get("authorization")
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000) // 48h atrás

  // Busca reservas PENDING criadas há mais de 48h
  const stale = await prisma.booking.findMany({
    where: {
      status:    "PENDING",
      createdAt: { lt: cutoff },
      deletedAt: null,
    },
    select: {
      id:         true,
      ownerId:    true,
      borrowerId: true,
      item:       { select: { title: true } },
    },
  })

  if (stale.length === 0) {
    return NextResponse.json({ ok: true, cancelled: 0, ids: [] })
  }

  const now       = new Date()
  const cancelled: string[] = []

  for (const booking of stale) {
    try {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status:        "CANCELLED",
          cancelledAt:   now,
          cancelledById: booking.ownerId,
          cancelReason:  "Auto-cancelado: sem resposta do proprietário em 48h.",
        },
      })

      // Notifica locatário
      await prisma.notification.create({
        data: {
          userId: booking.borrowerId,
          type:   "BOOKING_AUTO_CANCELLED",
          title:  "Reserva cancelada automaticamente",
          body:   `Sua solicitação de "${booking.item.title}" foi cancelada pois o proprietário não respondeu em 48h.`,
          data:   { bookingId: booking.id },
        },
      })

      // Notifica proprietário
      await prisma.notification.create({
        data: {
          userId: booking.ownerId,
          type:   "BOOKING_AUTO_CANCELLED",
          title:  "Solicitação expirada",
          body:   `A reserva de "${booking.item.title}" foi cancelada automaticamente por falta de resposta.`,
          data:   { bookingId: booking.id },
        },
      })

      cancelled.push(booking.id)
    } catch (e) {
      console.error("[cron/auto-cancel] booking", booking.id, e)
    }
  }

  console.warn(`[cron/auto-cancel] cancelled=${cancelled.length}`, cancelled)
  return NextResponse.json({ ok: true, cancelled: cancelled.length, ids: cancelled })
}
