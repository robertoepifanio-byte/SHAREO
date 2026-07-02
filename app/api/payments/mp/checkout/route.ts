import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { resolveUserId } from "@/lib/resolveUserId"
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
  sandboxSellerTokenOverride,
  MP_WEBHOOK_PATH,
} from "@/lib/mercadopago"

// `client` opcional: "mobile" → back_urls por deep-link (shareo://) para o app Android;
// omitido/"web" → back_urls do site (comportamento atual inalterado).
const Schema = z.object({
  bookingId: z.string().min(1),
  client:    z.enum(["web", "mobile"]).optional(),
})

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

    // resolveUserId aceita Bearer JWT (app Android) ou cookie de sessão (web) —
    // mesmo padrão já usado em /api/bookings, /api/conversations, /api/users/me.
    const userId = await resolveUserId(req)
    if (!userId) return err("UNAUTHORIZED", "Autenticação necessária.", 401)

    const rl = await checkRateLimit(`checkout:${userId}`, RATE_LIMITS.checkout.limit, RATE_LIMITS.checkout.windowMs)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const parsed = Schema.safeParse(await req.json())
    if (!parsed.success) return err("VALIDATION_ERROR", "bookingId inválido.", 400)
    const { bookingId, client } = parsed.data

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
    if (booking.borrowerId !== userId) return err("FORBIDDEN", "Acesso negado.", 403)
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
    // Sandbox: override via env (OAuth real com test users é inviável — ver helper).
    const sandboxToken = sandboxSellerTokenOverride()
    let sellerToken = sandboxToken ?? decryptPII(ownerAccount.mpAccessToken)
    if (!sandboxToken && ownerAccount.mpTokenExpiresAt && ownerAccount.mpTokenExpiresAt < new Date()) {
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

    // Retorno do Checkout Pro: web volta para o site; o app Android volta por
    // deep-link (scheme shareo:// já registrado no app.json).
    const backUrls =
      client === "mobile"
        ? {
            success: `shareo://pagamento/sucesso?bookingId=${bookingId}`,
            failure: `shareo://pagamento/cancelado?bookingId=${bookingId}`,
            pending: `shareo://pagamento/pendente?bookingId=${bookingId}`,
          }
        : {
            success: `${APP_URL}/reservas/sucesso?bookingId=${bookingId}`,
            failure: `${APP_URL}/reservas/${bookingId}?payment=cancelled`,
            pending: `${APP_URL}/reservas/${bookingId}?payment=pending`,
          }

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
        // Excluir boleto ("ticket"): compensa em 1–3 dias úteis, incompatível com a
        // confirmação da locação em 24h. Checkout fica cartão + Pix (bate com a FAQ da
        // Central de Ajuda). Ver docs/mp-pendencias-go-live.md item 3.
        payment_methods:    { excluded_payment_types: [{ id: "ticket" }] },
        payer:              booking.borrower.email ? { email: booking.borrower.email } : undefined,
        back_urls:          backUrls,
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
