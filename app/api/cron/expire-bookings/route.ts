/**
 * GET /api/cron/expire-bookings
 * P1-24 — Timeout automático de reservas PENDING após 2h.
 *
 * Protegido por `Authorization: Bearer {CRON_SECRET}`.
 * Invocado via Vercel Cron (ex.: a cada 30min) ou manualmente.
 *
 * Retorna JSON: { ok: true, cancelled: number, ids: string[] }
 */

import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime     = "nodejs"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  // Proteção: apenas chamadas com o CRON_SECRET correto
  const auth   = req.headers.get("authorization")
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Reservas PENDING criadas há mais de 2h
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000)

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
          cancelReason:  "Auto-cancelado: proprietário não respondeu em 2h.",
          refundAmount:  0, // reserva nunca foi paga — sem reembolso necessário
          refundPercent: 100,
        },
      })

      // Notifica o locatário
      await prisma.notification.create({
        data: {
          userId: booking.borrowerId,
          type:   "BOOKING_AUTO_CANCELLED",
          title:  "Reserva cancelada automaticamente",
          body:   `Sua solicitação de "${booking.item.title}" foi cancelada pois o proprietário não respondeu em 2h.`,
          data:   { bookingId: booking.id },
        },
      })

      // Notifica o proprietário
      await prisma.notification.create({
        data: {
          userId: booking.ownerId,
          type:   "BOOKING_AUTO_CANCELLED",
          title:  "Solicitação expirada",
          body:   `A reserva de "${booking.item.title}" foi cancelada por falta de resposta no prazo de 2h.`,
          data:   { bookingId: booking.id },
        },
      })

      cancelled.push(booking.id)
    } catch (e) {
      console.error("[cron/expire-bookings] booking", booking.id, e instanceof Error ? e.message : e)
    }
  }

  console.warn(`[cron/expire-bookings] cancelled=${cancelled.length}`, cancelled)
  return NextResponse.json({ ok: true, cancelled: cancelled.length, ids: cancelled })
}
