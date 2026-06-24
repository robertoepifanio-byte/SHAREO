/**
 * GET /api/cron/auto-cancel
 * Executado a cada 6h via Vercel Cron.
 * Cancela automaticamente reservas PENDING sem resposta do proprietário após 48h.
 */
import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAutoCancelConfig } from "@/lib/platform-config"
import { assertCronAuth } from "@/lib/auth/cron-guard"

export const runtime  = "nodejs"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const denied = assertCronAuth(req)
  if (denied) return denied

  // PlatformConfig: autoCancelOwnerHours (default 48)
  const { ownerHours } = await getAutoCancelConfig()
  const cutoff = new Date(Date.now() - ownerHours * 60 * 60 * 1000)

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
          cancelReason:  `Auto-cancelado: sem resposta do proprietário em ${ownerHours}h.`,
        },
      })

      // Notifica locatário
      await prisma.notification.create({
        data: {
          userId: booking.borrowerId,
          type:   "BOOKING_AUTO_CANCELLED",
          title:  "Reserva cancelada automaticamente",
          body:   `Sua solicitação de "${booking.item.title}" foi cancelada pois o proprietário não respondeu em ${ownerHours}h.`,
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
