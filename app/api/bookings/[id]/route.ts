import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PatchBookingSchema } from "@/lib/validations/bookings"
import type { BookingStatus } from "@prisma/client"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session) {
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

    const userId = session.user.id
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
  mark_returned: { requiredStatus: ["ACTIVE"],               allowedRole: "borrower", nextStatus: "RETURNED" },
  open_dispute:  { requiredStatus: ["ACTIVE", "RETURNED"],   allowedRole: "both",     nextStatus: "DISPUTED",  requiresReason: true },
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

    const { action, reason } = parsed.data
    const userId = session.user.id

    const booking = await prisma.booking.findUnique({
      where:  { id },
      select: { id: true, status: true, borrowerId: true, ownerId: true, startDate: true, item: { select: { title: true } } },
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
    if (!transition.requiredStatus.includes(booking.status)) {
      return NextResponse.json(
        { error: { code: "INVALID_TRANSITION", message: `Ação '${action}' não permitida no status '${booking.status}'.` } },
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
    }

    const updated = await prisma.booking.update({
      where:  { id },
      data,
      select: { id: true, status: true, updatedAt: true },
    })

    // Notificações (fire-and-forget)
    const notifyUserId = isOwner ? booking.borrowerId : booking.ownerId
    const notifMap: Partial<Record<typeof action, { type: string; title: string; body: string }>> = {
      confirm:       { type: "BOOKING_CONFIRMED",  title: "Reserva confirmada!",     body: `Sua reserva de "${booking.item.title}" foi confirmada.` },
      cancel:        { type: "BOOKING_CANCELLED",  title: "Reserva cancelada",       body: `A reserva de "${booking.item.title}" foi cancelada.` },
      mark_returned: { type: "BOOKING_RETURNED",   title: "Devolução registrada",    body: `"${booking.item.title}" foi devolvido. Avalie a experiência!` },
    }
    const notif = notifMap[action]
    if (notif) {
      prisma.notification.create({
        data: { userId: notifyUserId, type: notif.type as never, title: notif.title, body: notif.body, data: { bookingId: id } },
      }).catch(() => {})
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
