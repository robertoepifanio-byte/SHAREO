import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveUserId } from "@/lib/resolveUserId"
import { PatchBookingSchema } from "@/lib/validations/bookings"
import type { BookingStatus } from "@prisma/client"
import { dispatchWebhookEvent } from "@/lib/outboundWebhooks"
import type { WebhookEvent } from "@/lib/outboundWebhooks"
import { sendBookingConfirmedEmail, sendBookingCancelledEmail } from "@/lib/email"
import { calcRefund } from "@/lib/cancellationPolicy"
import { getCancellationConfig, getPayoutWindowDays } from "@/lib/platform-config"
import { releaseCouponForBooking } from "@/lib/coupons"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const { id } = await params
    const booking = await prisma.booking.findUnique({
      where:  { id },
      select: {
        id:            true,
        status:        true,
        startDate:     true,
        endDate:       true,
        totalDays:     true,
        dailyPrice:    true,
        totalPrice:    true,
        depositAmount: true,
        borrowerNote:  true,
        ownerNote:     true,
        cancelledAt:   true,
        cancelReason:  true,
        createdAt:     true,
        updatedAt:     true,
        item: {
          select: {
            id:     true,
            title:  true,
            city:   true,
            state:  true,
            images: { select: { url: true }, orderBy: { order: "asc" } },
          },
        },
        borrower:     { select: { id: true, name: true, avatarUrl: true } },
        owner:        { select: { id: true, name: true, avatarUrl: true } },
        conversation: { select: { id: true } },
        pickupToken:  true,
      reviews:      {
          select: {
            id:         true,
            reviewType: true,
            rating:     true,
            comment:    true,
            reviewer:   { select: { id: true, name: true } },
            createdAt:  true,
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: { code: "BOOKING_NOT_FOUND", message: "Reserva não encontrada." } },
        { status: 404 },
      )
    }

    if (booking.borrower.id !== userId && booking.owner.id !== userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Acesso negado." } },
        { status: 403 },
      )
    }

    return NextResponse.json({ data: booking })
  } catch (e) {
    console.error("[GET /api/bookings/:id]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}

// Transições permitidas por status atual e ação
const TRANSITIONS: Record<
  string,
  { requiredStatus: BookingStatus[]; allowedRole: "owner" | "borrower" | "both"; nextStatus: BookingStatus; requiresReason?: boolean }
> = {
  confirm:       { requiredStatus: ["PENDING"],              allowedRole: "owner",    nextStatus: "CONFIRMED" },
  cancel:        { requiredStatus: ["PENDING", "CONFIRMED"], allowedRole: "both",     nextStatus: "CANCELLED", requiresReason: true },
  mark_active:   { requiredStatus: ["CONFIRMED"],            allowedRole: "owner",    nextStatus: "ACTIVE" },
  mark_returned:  { requiredStatus: ["ACTIVE"],               allowedRole: "borrower", nextStatus: "RETURNED"  },
  confirm_return: { requiredStatus: ["RETURNED"],             allowedRole: "owner",    nextStatus: "COMPLETED" },
  open_dispute:   { requiredStatus: ["ACTIVE", "RETURNED"],  allowedRole: "both",     nextStatus: "DISPUTED",  requiresReason: true },
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const { id } = await params
    const body   = await req.json()
    const parsed = PatchBookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Dados inválidos." } },
        { status: 400 },
      )
    }

    const { action, reason, actualTime, pickupToken } = parsed.data
    // Horário efetivo: usa o informado pelo usuário (se válido e no passado), senão o momento atual
    const effectiveTime = actualTime ? new Date(actualTime) : new Date()
    const userId = session.user.id

    const booking = await prisma.booking.findUnique({
      where:  { id },
      select: {
        id: true, status: true, borrowerId: true, ownerId: true,
        itemId: true, startDate: true, endDate: true, totalPrice: true, totalDays: true,
        pickupToken: true, pickupTokenUsedAt: true,
        item:     { select: { title: true } },
        borrower: { select: { email: true, name: true } },
        owner:    { select: { email: true, name: true } },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: { code: "BOOKING_NOT_FOUND", message: "Reserva não encontrada." } },
        { status: 404 },
      )
    }

    const isOwner    = booking.ownerId    === userId
    const isBorrower = booking.borrowerId === userId

    if (!isOwner && !isBorrower) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Acesso negado." } },
        { status: 403 },
      )
    }

    const transition = TRANSITIONS[action]
    if (!transition) {
      return NextResponse.json(
        { error: { code: "INVALID_ACTION", message: "Ação não permitida." } },
        { status: 422 },
      )
    }
    if (!transition.requiredStatus.includes(booking.status)) {
      return NextResponse.json(
        { error: { code: "INVALID_TRANSITION", message: "Esta ação não é permitida no momento." } },
        { status: 422 },
      )
    }

    if (transition.allowedRole === "owner" && !isOwner) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Apenas o locador pode executar esta ação." } },
        { status: 403 },
      )
    }
    if (transition.allowedRole === "borrower" && !isBorrower) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Apenas o locatário pode executar esta ação." } },
        { status: 403 },
      )
    }

    if (transition.requiresReason && !reason?.trim()) {
      return NextResponse.json(
        { error: { code: "REASON_REQUIRED", message: "Motivo obrigatório para esta ação." } },
        { status: 400 },
      )
    }

    const now  = new Date()
    const data: Record<string, unknown> = { status: transition.nextStatus }

    if (action === "cancel") {
      data.cancelledAt   = now
      data.cancelledById = userId
      data.cancelReason  = reason

      // Calcula o reembolso com base na política de cancelamento do ShareO
      const cancelConfig = await getCancellationConfig()
      const refund = calcRefund(
        new Date(booking.startDate),
        now,
        booking.totalPrice,
        cancelConfig,
      )
      data.refundAmount  = refund.refundAmount
      data.refundPercent = refund.refundPercent
      // O motivo do reembolso é registrado internamente — não é exposto ao usuário via API
      console.warn(
        `[booking.cancel] id=${id} refundPercent=${refund.refundPercent} refundAmount=${refund.refundAmount} reason="${refund.reason}"`,
      )
    }

    // Registra o tempo de resposta do proprietário (para badge de responsividade)
    // Apenas na primeira ação sobre uma reserva PENDING (confirm ou cancel pelo dono)
    if (
      booking.status === "PENDING" &&
      isOwner &&
      (action === "confirm" || action === "cancel")
    ) {
      data.respondedAt = now
    }

    // Grava horário real de retirada — exige token válido e o consome.
    // Regra: prazo de devolução = mesmo horário da retirada + totalDays.
    if (action === "mark_active") {
      if (!pickupToken) {
        return NextResponse.json(
          { error: { code: "TOKEN_REQUIRED", message: "Código de retirada obrigatório." } },
          { status: 400 },
        )
      }
      if (booking.pickupTokenUsedAt) {
        return NextResponse.json(
          { error: { code: "TOKEN_ALREADY_USED", message: "Este código já foi utilizado." } },
          { status: 409 },
        )
      }
      if (booking.pickupToken !== pickupToken) {
        return NextResponse.json(
          { error: { code: "TOKEN_INVALID", message: "Código de retirada inválido. Verifique com o locatário." } },
          { status: 422 },
        )
      }
      data.activatedAt      = effectiveTime
      data.pickupTokenUsedAt = effectiveTime
      data.endDate           = new Date(effectiveTime.getTime() + booking.totalDays * 24 * 60 * 60 * 1000)
    }

    // Grava horário real de devolução (informado pelo locatário ou server time).
    if (action === "mark_returned" || action === "confirm_return") {
      data.returnedAt = effectiveTime
    }

    // Gera pickupToken único no confirm (fluxo PIX/manual — Stripe gera o próprio via webhook).
    if (action === "confirm" && !booking.pickupToken) {
      for (;;) {
        const candidate = String(Math.floor(100000 + Math.random() * 900000))
        const conflict  = await prisma.booking.findFirst({ where: { pickupToken: candidate }, select: { id: true } })
        if (!conflict) { data.pickupToken = candidate; break }
      }
    }

    // Ao confirmar: verifica conflito de datas dentro de uma transação para evitar double-booking.
    // Dois PENDING podem coexistir; o segundo confirm falha se já houver um CONFIRMED/ACTIVE.
    if (action === "confirm") {
      const conflict = await prisma.booking.findFirst({
        where: {
          id:     { not: id },
          itemId: booking.itemId,
          status: { in: ["CONFIRMED", "ACTIVE"] },
          AND: [
            { startDate: { lt: booking.endDate } },
            { endDate:   { gt: booking.startDate } },
          ],
        },
        select: { id: true },
      })
      if (conflict) {
        return NextResponse.json(
          { error: { code: "DATE_CONFLICT", message: "Item já reservado para este período." } },
          { status: 409 },
        )
      }
    }

    const updated = await prisma.booking.update({
      where:  { id },
      data,
      select: {
        id:               true,
        status:           true,
        updatedAt:        true,
        ownerNetAmount:   true,
        ownerId:          true,
      },
    })

    // FIN-3.3 — criar Payout elegível N dias após devolução confirmada (PlatformConfig: payoutWindowDays)
    if (action === "confirm_return") {
      const payoutWindowDays = await getPayoutWindowDays()
      const eligibleAfter = new Date(now.getTime() + payoutWindowDays * 24 * 60 * 60 * 1000)
      const ownerAccount  = await prisma.ownerPaymentAccount.findUnique({
        where:  { userId: booking.ownerId },
        select: { id: true },
      })
      if (ownerAccount && updated.ownerNetAmount) {
        // await obrigatório — fire-and-forget morre quando a lambda congela e o payout se perde
        await prisma.payout.create({
          data: {
            ownerPaymentAccountId: ownerAccount.id,
            bookingId:             id,
            amount:                updated.ownerNetAmount,
            status:                "PENDING",
            eligibleAfter,
          },
        }).catch((e) => console.error("[FIN-3.3] payout.create:", e instanceof Error ? e.message : e))
      }
    }

    // E-mails transacionais — após a resposta
    if (action === "confirm") {
      after(() =>
        sendBookingConfirmedEmail(
          booking.borrower.email, booking.borrower.name,
          booking.item.title, id,
          booking.startDate, booking.endDate,
        ).catch((e) => console.error("[email] booking confirmed:", e instanceof Error ? e.message : e))
      )
    }
    if (action === "cancel") {
      const notifyEmail = isOwner ? booking.borrower.email : booking.owner.email
      const notifyName  = isOwner ? booking.borrower.name  : booking.owner.name
      const notifyRole  = isOwner ? "borrower" as const    : "owner" as const
      after(() =>
        sendBookingCancelledEmail(
          notifyEmail, notifyName, notifyRole,
          booking.item.title, id, reason ?? undefined,
        ).catch((e) => console.error("[email] booking cancelled:", e instanceof Error ? e.message : e))
      )
      // P3-20: devolve o cupom usado nesta reserva — após a resposta
      after(() => releaseCouponForBooking(id))
    }

    // Webhooks de saída — após a resposta
    const webhookEventMap: Partial<Record<typeof action, WebhookEvent>> = {
      confirm:        "booking.confirmed",
      cancel:         "booking.cancelled",
      mark_active:    "booking.active",
      mark_returned:  "booking.returned",
      confirm_return: "booking.completed",
    }
    const webhookEvent = webhookEventMap[action]
    if (webhookEvent) {
      after(() =>
        dispatchWebhookEvent(booking.ownerId, webhookEvent, {
          bookingId: id,
          itemTitle: booking.item.title,
          status:    transition.nextStatus,
          reason,
        })
      )
    }

    // Notificações — após a resposta
    const notifyUserId = isOwner ? booking.borrowerId : booking.ownerId
    const notifMap: Partial<Record<typeof action, { type: string; title: string; body: string }>> = {
      confirm:        { type: "BOOKING_CONFIRMED",  title: "Reserva confirmada!",        body: `Sua reserva de "${booking.item.title}" foi confirmada.` },
      cancel:         { type: "BOOKING_CANCELLED",  title: "Reserva cancelada",          body: `A reserva de "${booking.item.title}" foi cancelada.` },
      mark_returned:  { type: "BOOKING_RETURNED",   title: "Devolução registrada",       body: `"${booking.item.title}" foi devolvido. Avalie a experiência!` },
      confirm_return: { type: "BOOKING_RETURNED",   title: "Devolução confirmada!",      body: `O proprietário confirmou a devolução de "${booking.item.title}". A reserva está concluída.` },
    }
    const notif = notifMap[action]
    if (notif) {
      after(() =>
        prisma.notification.create({
          data: { userId: notifyUserId, type: notif.type as never, title: notif.title, body: notif.body, data: { bookingId: id } },
        }).catch((e) => console.error(`[notification] ${action}:`, e instanceof Error ? e.message : e))
      )
    }

    return NextResponse.json({ data: updated })
  } catch (e) {
    console.error("[PATCH /api/bookings/:id]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
