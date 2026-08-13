/**
 * GET /api/cron/expire-bookings
 * P1-24 — Timeout automático de reservas PENDING após 12h (padrão; configurável via PlatformConfig: autoCancelPendingHours).
 *
 * Protegido por `Authorization: Bearer {CRON_SECRET}`.
 * Invocado via Vercel Cron a cada 6h (schedule "20 *\/6 * * *" — 00:20, 06:20, 12:20, 18:20 UTC) ou manualmente.
 * Com threshold de 12h, a janela efetiva de cancelamento é entre 12h e 18h após a criação da reserva.
 *
 * Idempotência: a query filtra status: PENDING. Reserva já cancelada não volta a aparecer.
 * Notificações são criadas apenas uma vez — não há risco de duplicação por execuções frequentes.
 *
 * Retorna JSON: { ok: true, cancelled: number, ids: string[] }
 */

import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAutoCancelConfig } from "@/lib/platform-config"
import { assertCronAuth } from "@/lib/auth/cron-guard"

export const runtime     = "nodejs"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const denied = assertCronAuth(req)
  if (denied) return denied

  // Reservas PENDING criadas há mais de N horas (PlatformConfig: autoCancelPendingHours)
  const { pendingHours } = await getAutoCancelConfig()
  const cutoff = new Date(Date.now() - pendingHours * 60 * 60 * 1000)

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
          cancelReason:  `Auto-cancelado: proprietário não respondeu em ${pendingHours}h.`,
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
          body:   `Sua solicitação de "${booking.item.title}" foi cancelada pois o proprietário não respondeu em ${pendingHours}h.`,
          data:   { bookingId: booking.id },
        },
      })

      // Notifica o proprietário
      await prisma.notification.create({
        data: {
          userId: booking.ownerId,
          type:   "BOOKING_AUTO_CANCELLED",
          title:  "Solicitação expirada",
          body:   `A reserva de "${booking.item.title}" foi cancelada por falta de resposta no prazo de ${pendingHours}h.`,
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
