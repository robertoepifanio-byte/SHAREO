import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { APP_URL } from "@/lib/app-url"
import { encryptPII, decryptPII } from "@/lib/crypto"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"
import { getPlatformFeeRate, calcSplit, CHECKOUT_MAX_CENTS } from "@/lib/platform-config"
import { formatDateMonthDay } from "@/utils/format"
import {
  isMercadoPagoActive,
  getPreferenceClient,
  refreshSellerToken,
  MP_WEBHOOK_PATH,
} from "@/lib/mercadopago"

const Schema = z.object({ bookingId: z.string().min(1) })

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

/**
 * Checkout com split (Modelo B / Checkout Pro — ADR-026).
 * Cria uma Preference EM NOME DO LOCADOR (token OAuth do dono) com `marketplace_fee`
 * = taxa ShareO (15%). O valor do locador vai direto para a conta MP dele; a ShareO
 * nunca retém o dinheiro de terceiros (afasta a Lei 12.865 — ver parecer D4).
 *
 * Mantém os guards do checkout atual: CONFIRMED, só o locatário paga, teto R$500,
 * não pago ainda. Gating: flag mercadoPagoEnabled + credenciais → senão 404.
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await isMercadoPagoActive())) {
      return err("NOT_FOUND", "Recurso indisponível.", 404)
    }

    const session = await auth()
    if (!session?.user?.id) return err("UNAUTHORIZED", "Autenticação necessária.", 401)

    const rl = await checkRateLimit(`checkout:${session.user.id}`, RATE_LIMITS.checkout.limit, RATE_LIMITS.checkout.windowMs)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const parsed = Schema.safeParse(await req.json())
    if (!parsed.success) return err("VALIDATION_ERROR", "bookingId inválido.", 400)
    const { bookingId } = parsed.data

    const booking = await prisma.booking.findUnique({
      where:  { id: bookingId },
      select: {
        id: true, borrowerId: true, ownerId: true, status: true, paymentStatus: true,
        totalPrice: true, discountCents: true, totalDays: true, startDate: true, endDate: true,
        item:     { select: { title: true } },
        borrower: { select: { email: true } },
      },
    })

    if (!booking) return err("NOT_FOUND", "Reserva não encontrada.", 404)
    if (booking.borrowerId !== session.user.id) return err("FORBIDDEN", "Acesso negado.", 403)
    if (booking.status !== "CONFIRMED") {
      return err("BOOKING_NOT_CONFIRMED", "A reserva precisa ser confirmada pelo locador antes do pagamento.", 422)
    }
    if (booking.paymentStatus === "PAID") return err("ALREADY_PAID", "Esta reserva já foi paga.", 409)
    if (booking.totalPrice > CHECKOUT_MAX_CENTS) {
      return err("EXCEEDS_MVP_LIMIT", "Locações acima de R$ 500 não estão disponíveis nesta versão.", 422)
    }

    // O locador precisa ter conectado a conta Mercado Pago (Modelo B).
    const ownerAccount = await prisma.ownerPaymentAccount.findUnique({
      where:  { userId: booking.ownerId },
      select: { mpAccessToken: true, mpRefreshToken: true, mpTokenExpiresAt: true },
    })
    if (!ownerAccount?.mpAccessToken || !ownerAccount.mpRefreshToken) {
      return err("OWNER_NOT_CONNECTED", "O locador ainda não conectou uma conta Mercado Pago para receber.", 422)
    }

    // Token do vendedor — renova se expirado (access tokens do MP expiram ~180 dias).
    let sellerToken = decryptPII(ownerAccount.mpAccessToken)
    if (ownerAccount.mpTokenExpiresAt && ownerAccount.mpTokenExpiresAt < new Date()) {
      const refreshed = await refreshSellerToken(decryptPII(ownerAccount.mpRefreshToken))
      sellerToken = refreshed.accessToken
      await prisma.ownerPaymentAccount.update({
        where: { userId: booking.ownerId },
        data: {
          mpAccessToken:    encryptPII(refreshed.accessToken),
          mpRefreshToken:   encryptPII(refreshed.refreshToken),
          mpTokenExpiresAt: refreshed.expiresAt,
        },
      })
    }

    // Split — idêntico ao caminho Stripe: usa valor BRUTO; o cupom sai da taxa da plataforma.
    const feeRate    = await getPlatformFeeRate()
    const discount   = booking.discountCents ?? 0
    const grossSplit = calcSplit(booking.totalPrice + discount, feeRate)
    const platformFeeAmount = Math.max(0, grossSplit.platformFeeAmount - discount)

    const pref = await getPreferenceClient(sellerToken).create({
      body: {
        items: [
          {
            id:          bookingId,
            title:       `Aluguel — ${booking.item.title}`,
            description: `${booking.totalDays} ${booking.totalDays === 1 ? "dia" : "dias"} · ${formatDateMonthDay(booking.startDate)} até ${formatDateMonthDay(booking.endDate)}`,
            quantity:    1,
            currency_id: "BRL",
            unit_price:  booking.totalPrice / 100, // MP usa reais (não centavos)
          },
        ],
        marketplace_fee:    platformFeeAmount / 100, // taxa ShareO em reais
        external_reference: bookingId,
        notification_url:   `${APP_URL}${MP_WEBHOOK_PATH}`,
        auto_return:        "approved",
        payer:              booking.borrower.email ? { email: booking.borrower.email } : undefined,
        back_urls: {
          success: `${APP_URL}/reservas/sucesso?bookingId=${bookingId}`,
          failure: `${APP_URL}/reservas/${bookingId}?payment=cancelled`,
          pending: `${APP_URL}/reservas/${bookingId}?payment=pending`,
        },
      },
    })

    if (!pref.id) return err("MP_ERROR", "Não foi possível iniciar o pagamento.", 502)

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        mpPreferenceId:    pref.id,
        platformFeeRate:   grossSplit.platformFeeRate,
        platformFeeAmount,
        ownerNetAmount:    grossSplit.ownerNetAmount,
      },
    })

    const url = pref.init_point ?? pref.sandbox_init_point
    return NextResponse.json({ data: { url } })
  } catch (e: unknown) {
    console.error("[POST /api/payments/mp/checkout]", e instanceof Error ? e.message : e)
    return err("INTERNAL_ERROR", "Erro interno.", 500)
  }
}
