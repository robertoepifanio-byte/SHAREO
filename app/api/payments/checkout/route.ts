import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit"

const Schema = z.object({
  bookingId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const rl = await checkRateLimit(`checkout:${session.user.id}`, 10, 60_000)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const body   = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "bookingId inválido." } },
        { status: 400 },
      )
    }

    const { bookingId } = parsed.data

    const booking = await prisma.booking.findUnique({
      where:  { id: bookingId },
      select: {
        id:            true,
        borrowerId:    true,
        status:        true,
        paymentStatus: true,
        totalPrice:    true,
        totalDays:     true,
        startDate:     true,
        endDate:       true,
        item:          { select: { title: true, images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 } } },
        borrower:      { select: { email: true, name: true } },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Reserva não encontrada." } },
        { status: 404 },
      )
    }

    // Apenas o locatário pode pagar
    if (booking.borrowerId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Acesso negado." } },
        { status: 403 },
      )
    }

    // Pagamento só liberado após o locador confirmar
    if (booking.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: { code: "BOOKING_NOT_CONFIRMED", message: "A reserva precisa ser confirmada pelo locador antes do pagamento." } },
        { status: 422 },
      )
    }

    if (booking.paymentStatus === "PAID") {
      return NextResponse.json(
        { error: { code: "ALREADY_PAID", message: "Esta reserva já foi paga." } },
        { status: 409 },
      )
    }

    const appUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"

    const fmtDate = (d: Date) =>
      new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(d)

    const checkoutSession = await stripe.checkout.sessions.create({
      mode:                "payment",
      payment_method_types: ["card"],
      customer_email:       booking.borrower.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency:     "brl",
            unit_amount:  booking.totalPrice, // já em centavos
            product_data: {
              name: `Aluguel — ${booking.item.title}`,
              description: `${booking.totalDays} ${booking.totalDays === 1 ? "dia" : "dias"} · ${fmtDate(booking.startDate)} até ${fmtDate(booking.endDate)}`,
              ...(booking.item.images[0]?.url && { images: [booking.item.images[0].url] }),
            },
          },
        },
      ],
      metadata: {
        bookingId,
        userId: session.user.id,
      },
      success_url: `${appUrl}/reservas/sucesso?bookingId=${bookingId}`,
      cancel_url:  `${appUrl}/reservas/${bookingId}?payment=cancelled`,
      expires_at:  Math.floor(Date.now() / 1000) + 30 * 60, // 30 min
    })

    // Salva o Session ID para idempotência (não usar antes do pagamento confirmado)
    await prisma.booking.update({
      where: { id: bookingId },
      data:  { stripeSessionId: checkoutSession.id },
    })

    return NextResponse.json({ data: { url: checkoutSession.url } })
  } catch (e: unknown) {
    console.error("[POST /api/payments/checkout]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
