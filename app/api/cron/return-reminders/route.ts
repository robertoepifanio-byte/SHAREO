/**
 * GET /api/cron/return-reminders
 * P2-48 — Lembrete de devolução por notificação in-app
 *
 * Executado diariamente às 09:00 UTC via Vercel Cron (ver vercel.json).
 * Busca reservas ACTIVE com endDate entre agora e agora + 24h e cria
 * uma notificação in-app para o borrower, sem duplicatas no mesmo dia.
 *
 * Proteção: Authorization: Bearer {CRON_SECRET}
 */

import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import type { NotificationType } from "@prisma/client"

export const runtime    = "nodejs"
export const maxDuration = 60

// Cast explícito necessário enquanto o cliente Prisma não reflete a migration
// 20260530200000_add_item_rules_and_return_reminder (RETURN_REMINDER já estava
// no schema antes desta tarefa, mas o enum na geração local pode estar desatualizado).
const RETURN_REMINDER_TYPE = "RETURN_REMINDER" as NotificationType

export async function GET(req: NextRequest) {
  // ── Autenticação do cron ──────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET
  const auth   = req.headers.get("authorization")
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now   = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  // ── Reservas que vencem nas próximas 24 horas ─────────────────────────────
  const bookings = await prisma.booking.findMany({
    where: {
      status:    "ACTIVE",
      deletedAt: null,
      endDate: {
        gte: now,
        lte: in24h,
      },
    },
    select: {
      id:         true,
      borrowerId: true,
      endDate:    true,
      item:       { select: { title: true } },
    },
  })

  if (bookings.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, ids: [] })
  }

  // ── Início do dia de hoje (UTC) para checar duplicatas ────────────────────
  const todayStart = new Date(now)
  todayStart.setUTCHours(0, 0, 0, 0)

  // Coleta todas as notificações RETURN_REMINDER criadas hoje para qualquer
  // dos borrowers relevantes. Verificação de duplicata por bookingId no campo `data`.
  const bookingIds       = bookings.map((b) => b.id)
  const borrowerIds      = [...new Set(bookings.map((b) => b.borrowerId))]

  const existingToday = await prisma.notification.findMany({
    where: {
      type:      RETURN_REMINDER_TYPE,
      userId:    { in: borrowerIds },
      createdAt: { gte: todayStart },
    },
    select: { data: true },
  })

  // Extrai bookingIds já notificados hoje
  const alreadyNotified = new Set<string>(
    existingToday
      .map((n) => {
        const d = n.data as Record<string, unknown> | null
        return d?.bookingId as string | undefined
      })
      .filter((id): id is string =>
        typeof id === "string" && bookingIds.includes(id),
      ),
  )

  // ── Cria notificações para reservas sem lembrete hoje ────────────────────
  const sent:    string[] = []
  const skipped: string[] = []

  for (const booking of bookings) {
    if (alreadyNotified.has(booking.id)) {
      skipped.push(booking.id)
      continue
    }

    await prisma.notification.create({
      data: {
        userId: booking.borrowerId,
        type:   RETURN_REMINDER_TYPE,
        title:  "Lembrete de devolução",
        body:   `Sua locação de ${booking.item.title} vence hoje. Não esqueça de devolver!`,
        data:   { bookingId: booking.id },
      },
    }).catch((e) => {
      console.error(
        "[cron/return-reminders] create notification",
        booking.id,
        e instanceof Error ? e.message : e,
      )
    })

    sent.push(booking.id)
  }

  console.warn(
    `[cron/return-reminders] sent=${sent.length} skipped=${skipped.length}`,
    { sent, skipped },
  )

  return NextResponse.json({ ok: true, sent: sent.length, skipped: skipped.length, ids: sent })
}
