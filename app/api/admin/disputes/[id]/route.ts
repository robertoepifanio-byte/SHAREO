import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const PatchSchema = z.object({
  action:   z.enum(["resolve_completed", "resolve_cancelled"]),
  adminNote: z.string().max(500).optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Acesso restrito a administradores." } },
        { status: 403 },
      )
    }

    const { id } = await params
    const body   = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Ação inválida." } },
        { status: 400 },
      )
    }

    const booking = await prisma.booking.findUnique({
      where:  { id },
      select: { id: true, status: true, borrowerId: true, ownerId: true, item: { select: { title: true } } },
    })

    if (!booking) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Reserva não encontrada." } },
        { status: 404 },
      )
    }

    if (booking.status !== "DISPUTED") {
      return NextResponse.json(
        { error: { code: "INVALID_STATUS", message: "Reserva não está em disputa." } },
        { status: 422 },
      )
    }

    const { action, adminNote } = parsed.data
    const nextStatus = action === "resolve_completed" ? "COMPLETED" : "CANCELLED"
    const adminId    = session.user.id

    const updated = await prisma.booking.update({
      where: { id },
      data:  {
        status: nextStatus,
        ...(nextStatus === "CANCELLED" && {
          cancelledAt:   new Date(),
          cancelledById: adminId,
          cancelReason:  adminNote ?? "Resolvido pelo administrador.",
        }),
        ...(nextStatus === "COMPLETED" && adminNote && {
          ownerNote: adminNote,
        }),
      },
      select: { id: true, status: true, updatedAt: true },
    })

    after(() =>
      prisma.adminLog.create({
        data: {
          adminId,
          action:     action.toUpperCase(),
          entityType: "Booking",
          entityId:   id,
          metadata:   { adminNote: adminNote ?? null },
        },
      }).catch((e) => console.error("[adminLog]", e instanceof Error ? e.message : e))
    )

    // Notificar ambas as partes — após a resposta
    const resolution = nextStatus === "COMPLETED" ? "concluída" : "cancelada"
    after(() =>
      Promise.allSettled(
        [booking.borrowerId, booking.ownerId].map((userId) =>
          prisma.notification.create({
            data: {
              userId,
              type:  "BOOKING_CANCELLED",
              title: "Disputa resolvida",
              body:  `A reserva de "${booking.item.title}" foi ${resolution} pelo administrador.`,
              data:  { bookingId: id },
            },
          }).catch((e) => console.error("[notification dispute resolved]", e instanceof Error ? e.message : e))
        )
      )
    )

    return NextResponse.json({ data: updated })
  } catch (e) {
    console.error("[PATCH /api/admin/disputes/:id]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
