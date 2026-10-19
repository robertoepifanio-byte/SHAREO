/**
 * POST /api/bookings/[id]/late-fee/pay — o locatário paga a taxa de atraso
 * pela tela da reserva, sem depender do link do e-mail.
 *
 * 🪤 Por que existe: a Checkout Session da multa vale 24h (teto da Stripe) e o
 * cron só reemite por 7 dias após a devolução. Passado isso o locatário ficava
 * sem como pagar. Aqui a sessão é criada SOB DEMANDA, pelo mesmo
 * `emitirCobrancaTaxaAtraso` do cron e do admin (sem e-mail: o link volta na
 * resposta). O valor é sempre recalculado no servidor — o cliente não envia nada.
 */
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveUserId } from "@/lib/resolveUserId"
import { getStripe } from "@/lib/stripe"
import { bookingItemsLabel } from "@/lib/email"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"
import { getLateFeeMultiplier, calcLateFee } from "@/lib/platform-config"
import {
  atrasoParaCobrar, emitirCobrancaTaxaAtraso,
  taxaDeAtrasoAplicada, taxaDeAtrasoQuitada,
} from "@/lib/lateFee"

type Params = { params: Promise<{ id: string }> }

const erro = (status: number, code: string, message: string) =>
  NextResponse.json({ error: { code, message } }, { status })

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return erro(401, "UNAUTHORIZED", "Autenticação necessária.")

    const rl = await checkRateLimit(`checkout:${userId}`, RATE_LIMITS.checkout.limit, RATE_LIMITS.checkout.windowMs)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { id } = await params
    const booking = await prisma.booking.findUnique({
      where:  { id },
      select: {
        id: true, status: true, deletedAt: true, borrowerId: true,
        endDate: true, dailyPrice: true,
        returnRequestedAt: true, returnedAt: true,
        lateFeeAmount: true, lateFeePaymentIntentId: true,
        lateFeeSessionId: true, lateFeeSessionExpiresAt: true,
        borrower: { select: { email: true, name: true } },
        item:     { select: { title: true, images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 } } },
        _count:   { select: { bookingItems: true } },
      },
    })

    if (!booking || booking.deletedAt) return erro(404, "NOT_FOUND", "Reserva não encontrada.")
    if (booking.borrowerId !== userId)  return erro(403, "FORBIDDEN", "Acesso negado.")

    if (taxaDeAtrasoQuitada(booking)) return erro(422, "JA_QUITADA", "A taxa de atraso desta reserva já foi paga.")
    if (booking.status === "CANCELLED" || !taxaDeAtrasoAplicada(booking)) {
      return erro(422, "SEM_TAXA", "Não há taxa de atraso a pagar nesta reserva.")
    }

    const agora  = new Date()
    const atraso = atrasoParaCobrar(booking, agora)
    if (!atraso) {
      return erro(422, "SEM_ATRASO", "O item foi devolvido dentro do prazo — não há taxa de atraso a pagar.")
    }
    const { fimDoAtraso, dias } = atraso
    const valor = calcLateFee(booking.dailyPrice, await getLateFeeMultiplier(), dias)

    const r = await emitirCobrancaTaxaAtraso(
      booking,
      bookingItemsLabel(booking.item.title, booking._count.bookingItems || 1),
      valor, dias, fimDoAtraso, agora,
      false, // sem e-mail: o locatário acabou de pedir e recebe o link na resposta
    )

    if (r.emitida) return NextResponse.json({ data: { url: r.url } })

    if (r.motivo === "COBRANCA_ATUAL_VIVA" && booking.lateFeeSessionId) {
      // Já existe sessão viva pelo valor certo: reaproveita em vez de trocar.
      const s = await getStripe().checkout.sessions.retrieve(booking.lateFeeSessionId)
      if (s.url && s.status === "open") return NextResponse.json({ data: { url: s.url } })
    }
    if (r.motivo === "COBRANCA_FECHADA") {
      return erro(403, "BILLING_CLOSED", "Os pagamentos ainda não estão abertos. Tente novamente em breve.")
    }
    return erro(422, r.motivo, "Não foi possível gerar a cobrança da taxa de atraso.")
  } catch (e) {
    console.error("[POST /api/bookings/:id/late-fee/pay]", e instanceof Error ? e.message : e)
    return erro(500, "INTERNAL_ERROR", "Erro interno.")
  }
}
