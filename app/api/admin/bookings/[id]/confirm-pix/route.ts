import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAdminRole } from "@/lib/auth/admin-guards"
import { auditLog } from "@/lib/audit"
import { getPlatformFeeRate, calcSplit } from "@/lib/platform-config"
import { dispatchWebhookEvent } from "@/lib/outboundWebhooks"
import { processAmbassadorOnBookingPaid } from "@/lib/ambassador"

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/admin/bookings/[id]/confirm-pix
 *
 * Checkout PIX manual (validação em staging): um ADMIN confirma que o pagamento
 * via PIX caiu na conta da plataforma. Marca a reserva como PAID e grava o split
 * financeiro — espelha exatamente o que o webhook do Stripe faz no pagamento.
 *
 * O pickupToken já é gerado no `confirm` do locador (fluxo PIX/manual), então
 * aqui não precisamos gerá-lo.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth()
  try {
    requireAdminRole(session, "ADMIN_SUPERADMIN", "ADMIN_FINANCEIRO")
  } catch {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Acesso negado." } },
      { status: 403 },
    )
  }

  const adminId = session!.user.id
  const { id }  = await params

  try {
    const booking = await prisma.booking.findUnique({
      where:  { id },
      select: {
        id: true, status: true, paymentStatus: true,
        totalPrice: true, discountCents: true, ownerId: true, borrowerId: true,
        item: { select: { title: true } },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Reserva não encontrada." } },
        { status: 404 },
      )
    }

    if (booking.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: { code: "BOOKING_NOT_CONFIRMED", message: "A reserva precisa estar confirmada para registrar o pagamento." } },
        { status: 422 },
      )
    }

    if (booking.paymentStatus === "PAID") {
      return NextResponse.json(
        { error: { code: "ALREADY_PAID", message: "Esta reserva já está marcada como paga." } },
        { status: 409 },
      )
    }

    // Split da plataforma — idêntico ao checkout Stripe (lib/platform-config).
    const feeRate    = await getPlatformFeeRate()
    const discount   = booking.discountCents ?? 0
    const grossSplit = calcSplit(booking.totalPrice + discount, feeRate)
    const split = {
      platformFeeRate:   grossSplit.platformFeeRate,
      platformFeeAmount: Math.max(0, grossSplit.platformFeeAmount - discount),
      ownerNetAmount:    grossSplit.ownerNetAmount,
    }

    // Update condicional: só marca PAID se ainda estiver PENDING (evita corrida/duplo-clique).
    const res = await prisma.booking.updateMany({
      where: { id, paymentStatus: { not: "PAID" } },
      data:  {
        paymentStatus:     "PAID",
        paidAt:            new Date(),
        platformFeeRate:   split.platformFeeRate,
        platformFeeAmount: split.platformFeeAmount,
        ownerNetAmount:    split.ownerNetAmount,
      },
    })
    if (res.count === 0) {
      return NextResponse.json(
        { error: { code: "ALREADY_PAID", message: "Esta reserva já está marcada como paga." } },
        { status: 409 },
      )
    }

    auditLog(adminId, "PIX_PAYMENT_CONFIRMED", "Booking", id, {
      totalPrice: booking.totalPrice, ...split,
    })

    // Notifica o locador (pagamento recebido) e o locatário (pagamento confirmado) — após a resposta
    after(() =>
      prisma.notification.create({
        data: {
          userId: booking.ownerId,
          type:   "BOOKING_CONFIRMED",
          title:  "Pagamento recebido!",
          body:   `O aluguel de "${booking.item.title}" foi pago via PIX. Combine a entrega com o locatário.`,
          data:   { bookingId: id },
        },
      }).catch((e) => console.error("[confirm-pix notification owner]", e instanceof Error ? e.message : e))
    )
    after(() =>
      prisma.notification.create({
        data: {
          userId: booking.borrowerId,
          type:   "BOOKING_CONFIRMED",
          title:  "Pagamento confirmado!",
          body:   `A ShareO confirmou o recebimento do PIX de "${booking.item.title}". Combine a retirada com o locador.`,
          data:   { bookingId: id },
        },
      }).catch((e) => console.error("[confirm-pix notification borrower]", e instanceof Error ? e.message : e))
    )

    // Comissão de embaixador (se o locatário foi indicado) + webhook de saída — após a resposta
    after(() =>
      processAmbassadorOnBookingPaid(id).catch((e) =>
        console.error("[confirm-pix] ambassador commission:", e instanceof Error ? e.message : e)
      )
    )
    after(() =>
      dispatchWebhookEvent(booking.ownerId, "booking.paid", { bookingId: id, itemTitle: booking.item.title })
    )

    return NextResponse.json({ data: { paymentStatus: "PAID" } })
  } catch (e) {
    console.error("[POST /api/admin/bookings/:id/confirm-pix]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
