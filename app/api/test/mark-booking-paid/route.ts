/**
 * POST /api/test/mark-booking-paid
 *
 * Rota de apoio exclusiva para a suíte E2E: marca uma reserva como PAGA
 * (paymentStatus = "PAID", paidAt = agora) SEM regenerar o pickupToken —
 * o confirm() já gerou o token; o objetivo desta rota é apenas habilitar
 * o guard de pagamento no mark_active sem simular um webhook Stripe inteiro.
 *
 * As três camadas de segurança (kill-switch, E2E_SECRET e x-e2e-token)
 * estão centralizadas em lib/e2eGuard.ts via withE2EGuard().
 */
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withE2EGuard } from "@/lib/e2eGuard"

async function handler(req: NextRequest) {
  let bookingId: string | undefined
  try {
    const body = await req.json() as { bookingId?: string }
    bookingId = body.bookingId
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Body JSON inválido." } },
      { status: 400 },
    )
  }

  if (!bookingId || typeof bookingId !== "string") {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "bookingId obrigatório." } },
      { status: 400 },
    )
  }

  const booking = await prisma.booking.findUnique({
    where:  { id: bookingId },
    select: { id: true, paymentStatus: true },
  })

  if (!booking) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Reserva não encontrada." } },
      { status: 404 },
    )
  }

  // Idempotente: se já estiver PAID, não faz nada
  if (booking.paymentStatus === "PAID") {
    return NextResponse.json({ ok: true, alreadyPaid: true })
  }

  // Grava apenas paymentStatus e paidAt — pickupToken NÃO é tocado
  // (o confirm() já gerou o token; regenerar aqui invalidaria o código
  // que o teste obteve via GET /api/bookings/[id])
  await prisma.booking.update({
    where: { id: bookingId },
    data:  { paymentStatus: "PAID", paidAt: new Date() },
  })

  return NextResponse.json({ ok: true, alreadyPaid: false })
}

export const POST = withE2EGuard(handler)
