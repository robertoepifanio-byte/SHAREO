import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getStripe } from "@/lib/stripe"
import { APP_URL } from "@/lib/app-url"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"
import { getPlatformFeeRate, calcSplit, CHECKOUT_MAX_CENTS, STRIPE_CHECKOUT_EXPIRES_SECONDS } from "@/lib/platform-config"
import { formatDateMonthDay } from "@/utils/format"

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

    const rl = await checkRateLimit(`checkout:${session.user.id}`, RATE_LIMITS.checkout.limit, RATE_LIMITS.checkout.windowMs)
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
        discountCents: true,
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

    // FIN-MVP-TETO (D2): teto de R$ 500 por locação no MVP
    if (booking.totalPrice > CHECKOUT_MAX_CENTS) {
      return NextResponse.json(
        { error: { code: "EXCEEDS_MVP_LIMIT", message: "Locações acima de R$ 500 não estão disponíveis nesta versão. Entre em contato com o suporte." } },
        { status: 422 },
      )
    }

    // FIN-2.2: calcular split da plataforma antes de criar a Checkout Session.
    // P3-20: o split usa o valor BRUTO (sem cupom) — o proprietário recebe o valor cheio
    // e o desconto é deduzido da taxa da plataforma.
    const feeRate  = await getPlatformFeeRate()
    const discount = booking.discountCents ?? 0
    const grossSplit = calcSplit(booking.totalPrice + discount, feeRate)
    const split = {
      platformFeeRate:   grossSplit.platformFeeRate,
      platformFeeAmount: Math.max(0, grossSplit.platformFeeAmount - discount),
      ownerNetAmount:    grossSplit.ownerNetAmount,
    }

    const appUrl = APP_URL

    const checkoutSession = await getStripe().checkout.sessions.create({
      mode:                "payment",
      // SÓ CARTÃO — e isto é decisão, não pendência de implementação.
      //
      // Em 20/08/2026 esta lista chegou a incluir "boleto" e "pix", pelo item 1
      // do ADR-028. Voltou pra cartão no mesmo dia, por dois motivos separados:
      //
      // 1. BOLETO: descartado pelos fundadores. Ele NÃO aceita reembolso — nem
      //    parcial nem total (tabela de capacidades da Stripe) — e a política
      //    de cancelamento publicada promete estorno em três faixas. Coerente
      //    com a decisão de 30/06 sobre boleto (docs/adr/ADR-028-reversao-stripe-connect.md).
      // 2. PIX: a Stripe exige "good standing E no mínimo 60 DIAS de pagamentos
      //    processados" pra liberar Pix em conta brasileira — é convite, não
      //    autoatendimento. A ShareO processou zero pagamentos reais (produção
      //    travada pelo D4), então o Pix só é pedível ~60 dias DEPOIS do
      //    go-live com cartão.
      //
      // ⚠️ Esta lista é EXPLÍCITA, então um método não habilitado na conta faz
      // a Checkout Session FALHAR INTEIRA — não degrada, não esconde o método.
      // Só acrescente "pix" aqui quando ele estiver ativo no Dashboard, senão
      // ninguém consegue pagar nem de cartão.
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
              description: `${booking.totalDays} ${booking.totalDays === 1 ? "dia" : "dias"} · ${formatDateMonthDay(booking.startDate)} até ${formatDateMonthDay(booking.endDate)}`,
              ...(booking.item.images[0]?.url && { images: [booking.item.images[0].url] }),
            },
          },
        },
      ],
      metadata: {
        bookingId,
        userId: session.user.id,
      },
      // ADR-028 — split real: agrupa a cobrança para o Transfer que o cron de
      // repasse (app/api/cron/payout/route.ts) cria depois, quando o payout
      // fica elegível (N dias após a devolução). O Transfer NÃO acontece aqui
      // — mantém a retenção/proteção contra disputa que já existe hoje.
      payment_intent_data: {
        transfer_group: bookingId,
      },
      success_url: `${appUrl}/reservas/sucesso?bookingId=${bookingId}`,
      cancel_url:  `${appUrl}/reservas/${bookingId}?payment=cancelled`,
      expires_at:  Math.floor(Date.now() / 1000) + STRIPE_CHECKOUT_EXPIRES_SECONDS,
    })

    // Salva Session ID + valores financeiros do split (FIN-2.2)
    await prisma.booking.update({
      where: { id: bookingId },
      data:  {
        stripeSessionId:  checkoutSession.id,
        platformFeeRate:  split.platformFeeRate,
        platformFeeAmount: split.platformFeeAmount,
        ownerNetAmount:   split.ownerNetAmount,
      },
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
