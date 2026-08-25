/**
 * POST /api/test/mark-booking-paid
 *
 * Rota de apoio exclusiva para a suíte E2E: marca uma reserva como PAGA
 * (paymentStatus = "PAID", paidAt = agora) SEM regenerar o pickupToken —
 * o confirm() já gerou o token; o objetivo desta rota é apenas habilitar
 * o guard de pagamento no mark_active sem simular um webhook Stripe inteiro.
 *
 * Segurança em camadas:
 *  1. E2E_BYPASS_DISABLED=true desabilita a rota (kill-switch para produção).
 *  2. E2E_SECRET deve estar setado no ambiente.
 *  3. O header x-e2e-token deve corresponder a E2E_SECRET.
 *
 * Em produção NUNCA setar E2E_SECRET nem deixar E2E_BYPASS_DISABLED em branco.
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  // Kill-switch: se E2E_BYPASS_DISABLED=true, a rota não existe
  if (process.env.E2E_BYPASS_DISABLED === "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Exige E2E_SECRET configurado no ambiente
  const e2eSecret = process.env.E2E_SECRET
  if (!e2eSecret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Verifica o header de autenticação E2E
  const token = req.headers.get("x-e2e-token")
  if (token !== e2eSecret) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Token E2E inválido." } },
      { status: 401 },
    )
  }

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
