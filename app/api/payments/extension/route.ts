/**
 * POST /api/payments/extension — cobra as diárias extras de uma extensão aceita.
 *
 * ATOR-03. Quando a reserva JÁ estava paga, aprovar a extensão não move o
 * `endDate`: grava `extensionAmountCents` e o estado `AWAITING_PAYMENT`. Esta
 * rota cria a Checkout Session desse valor; o `endDate` só se move quando o
 * webhook confirma o pagamento.
 *
 * 🪤 Por que não reusar /api/payments/checkout: aquele cobra `booking.totalPrice`
 * INTEIRO. Apontar a extensão para ele cobraria a locação toda de novo.
 *
 * Espelha o desenho da taxa de atraso (app/api/cron/reminders/route.ts), que já
 * cobra um valor à parte pela mesma reserva: `metadata.type` distingue o que o
 * webhook deve fazer com a sessão.
 */
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { resolveUserId } from "@/lib/resolveUserId"
import { getStripe } from "@/lib/stripe"
import { APP_URL } from "@/lib/app-url"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"
import { CHECKOUT_MAX_CENTS, STRIPE_CHARGE_EXPIRES_SECONDS } from "@/lib/platform-config"
import { formatDateLong } from "@/utils/format"

const Schema = z.object({ bookingId: z.string().min(1) })

export async function POST(req: NextRequest) {
  try {
    // resolveUserId (e não auth()) para o app Android também conseguir pagar —
    // ver feedback-auth-cookie-only-mobile-401.
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const rl = await checkRateLimit(`checkout:${userId}`, RATE_LIMITS.checkout.limit, RATE_LIMITS.checkout.windowMs)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const parsed = Schema.safeParse(await req.json())
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
        id: true, borrowerId: true, status: true,
        extensionStatus: true, extensionAmountCents: true, extensionRequestedEndDate: true,
        item:     { select: { title: true, images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 } } },
        borrower: { select: { email: true } },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Reserva não encontrada." } },
        { status: 404 },
      )
    }
    if (booking.borrowerId !== userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Acesso negado." } },
        { status: 403 },
      )
    }
    if (booking.extensionStatus !== "AWAITING_PAYMENT" || !booking.extensionAmountCents) {
      return NextResponse.json(
        { error: { code: "NO_EXTENSION_TO_PAY", message: "Não há extensão aguardando pagamento nesta reserva." } },
        { status: 422 },
      )
    }
    // Mesmo teto do checkout comum (D2). Aplicado aqui também porque a extensão
    // é uma cobrança independente — sem isto, seria o caminho por onde passar
    // acima do limite que a locação respeita.
    if (booking.extensionAmountCents > CHECKOUT_MAX_CENTS) {
      return NextResponse.json(
        { error: { code: "EXCEEDS_MVP_LIMIT", message: "Valor acima do limite desta versão. Entre em contato com o suporte." } },
        { status: 422 },
      )
    }

    // formatDateLong e não Intl inline: o repo já centraliza as options, e a
    // notificação da aprovação usa o mesmo formato — inline aqui daria
    // "04 de agosto" num lugar e "4 de agosto" no outro, no mesmo fluxo.
    const dataLimite = booking.extensionRequestedEndDate
      ? formatDateLong(booking.extensionRequestedEndDate)
      : ""

    const session = await getStripe().checkout.sessions.create({
      mode:                 "payment",
      payment_method_types: ["card"], // mesma decisão do checkout comum: só cartão
      customer_email:       booking.borrower.email ?? undefined,
      line_items: [{
        quantity: 1,
        price_data: {
          currency:    "brl",
          unit_amount: booking.extensionAmountCents,
          product_data: {
            name:        `Extensão de prazo — ${booking.item.title}`,
            description: dataLimite ? `Diárias extras até ${dataLimite}` : "Diárias extras",
            ...(booking.item.images[0]?.url && { images: [booking.item.images[0].url] }),
          },
        },
      }],
      // `type` é o que o webhook lê para aplicar a extensão em vez de marcar a
      // reserva como paga (ela já está).
      metadata:    { bookingId, type: "extension" },
      // Mesmo grupo da locação, como o checkout comum faz — mantém as duas
      // cobranças da reserva rastreáveis juntas na Stripe, ainda que cada
      // Transfer saque da sua própria cobrança.
      payment_intent_data: { transfer_group: bookingId },
      success_url: `${APP_URL}/reservas/${bookingId}?extensao=paga`,
      cancel_url:  `${APP_URL}/reservas/${bookingId}`,
      expires_at:  Math.floor(Date.now() / 1000) + STRIPE_CHARGE_EXPIRES_SECONDS,
    })

    return NextResponse.json({ data: { url: session.url } })
  } catch (e) {
    console.error("[POST /api/payments/extension]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
