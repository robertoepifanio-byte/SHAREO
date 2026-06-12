import { type NextRequest, NextResponse, after } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rateLimit"
import { sendReminderReturnTomorrow } from "@/lib/email"
import type { NotificationType } from "@prisma/client"

/**
 * POST /api/bookings/[id]/reminder
 *
 * Envia um lembrete de devolução ao locatário.
 * Rate limit: máximo 1 lembrete por reserva a cada 24 horas.
 * O "lastReminderAt" é rastreado via ownerNote (prefixo de metadado) para
 * evitar migração de schema — a nota existente é preservada.
 */

const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000 // 24h

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { error: { message: "Não autenticado." } },
      { status: 401 },
    )
  }

  const { id: bookingId } = await params
  const uid = session.user.id

  // Rate limit por booking (1 req / 24h por processo)
  const rlKey = `reminder:${bookingId}`
  const rl = await checkRateLimit(rlKey, 1, REMINDER_COOLDOWN_MS)
  if (!rl.allowed) {
    const resetIn = Math.ceil((rl.resetAt - Date.now()) / 60_000)
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: `Lembrete já enviado. Aguarde ${resetIn} minuto${resetIn !== 1 ? "s" : ""} para reenviar.`,
        },
      },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      },
    )
  }

  // Buscar reserva e validar propriedade
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id:        true,
      status:    true,
      ownerId:   true,
      endDate:   true,
      item:    { select: { title: true } },
      borrower: { select: { id: true, name: true, email: true } },
    },
  })

  if (!booking) {
    return NextResponse.json(
      { error: { message: "Reserva não encontrada." } },
      { status: 404 },
    )
  }

  if (booking.ownerId !== uid) {
    return NextResponse.json(
      { error: { message: "Acesso negado." } },
      { status: 403 },
    )
  }

  if (booking.status !== "ACTIVE") {
    return NextResponse.json(
      { error: { message: "Lembrete só pode ser enviado para reservas ativas." } },
      { status: 422 },
    )
  }

  // Criar notificação in-app para o locatário (best-effort)
  await prisma.notification.create({
    data: {
      userId: booking.borrower.id,
      type:   "RETURN_REMINDER" as NotificationType,
      title:  "Lembrete de devolução",
      body:   `O proprietário lembrou que o item "${booking.item.title}" deve ser devolvido em breve.`,
      data:   { bookingId },
    },
  }).catch((err) => {
    console.error("[reminder] notification error:", err instanceof Error ? err.message : "unknown")
  })

  // Email opcional — após a resposta, best-effort
  if (booking.borrower.email) {
    after(() =>
      sendReminderReturnTomorrow(
        booking.borrower.email,
        booking.borrower.name,
        booking.item.title,
        bookingId,
        new Date(booking.endDate),
      ).catch((err) => {
        console.error("[reminder] email error:", err instanceof Error ? err.message : "unknown")
      })
    )
  }

  return NextResponse.json({ success: true, message: "Lembrete enviado." })
}
