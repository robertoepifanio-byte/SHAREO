/**
 * POST   /api/bookings/[id]/extend  — locatário solicita extensão de prazo
 * PATCH  /api/bookings/[id]/extend  — proprietário aprova ou recusa a solicitação
 *
 * P1-27 — Extensão de prazo de locação
 *
 * Nota: os campos extensionRequestedEndDate, extensionStatus, extensionRequestedAt,
 * extensionRespondedAt foram adicionados na migration 20260530100000.
 * Enquanto o cliente Prisma não for regenerado (prisma generate), usamos
 * $queryRaw / $executeRaw para acessar esses campos.
 */

import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

// Locatário solicita extensão
const PostExtendSchema = z.object({
  newEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida. Use o formato YYYY-MM-DD."),
})

// Proprietário responde à solicitação
const PatchExtendSchema = z.object({
  action: z.enum(["approve", "reject"], {
    errorMap: () => ({ message: "Ação inválida. Use 'approve' ou 'reject'." }),
  }),
})

interface BookingExtRow {
  id:                       string
  status:                   string
  borrowerId:               string
  ownerId:                  string
  endDate:                  Date
  itemTitle:                string
  extensionStatus:          string | null
  extensionRequestedEndDate: Date | null
}

/** POST — locatário solicita nova data de devolução */
export async function POST(req: NextRequest, { params }: Params) {
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
    const parsed = PostExtendSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados inválidos." } },
        { status: 400 },
      )
    }

    const { newEndDate } = parsed.data
    const userId          = session.user.id

    const rows = await prisma.$queryRaw<BookingExtRow[]>`
      SELECT
        b.id,
        b.status,
        b."borrowerId",
        b."ownerId",
        b."endDate",
        i.title AS "itemTitle",
        b."extensionStatus",
        b."extensionRequestedEndDate"
      FROM bookings b
      JOIN items i ON i.id = b."itemId"
      WHERE b.id = ${id}
        AND b."deletedAt" IS NULL
      LIMIT 1
    `
    const booking = rows[0]

    if (!booking) {
      return NextResponse.json(
        { error: { code: "BOOKING_NOT_FOUND", message: "Reserva não encontrada." } },
        { status: 404 },
      )
    }

    if (booking.borrowerId !== userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Apenas o locatário pode solicitar extensão." } },
        { status: 403 },
      )
    }

    if (booking.status !== "ACTIVE") {
      return NextResponse.json(
        { error: { code: "INVALID_STATUS", message: "Extensão só pode ser solicitada em reservas ativas." } },
        { status: 422 },
      )
    }

    if (booking.extensionStatus === "PENDING") {
      return NextResponse.json(
        { error: { code: "EXTENSION_PENDING", message: "Já existe uma solicitação de extensão aguardando resposta." } },
        { status: 409 },
      )
    }

    const requestedDate = new Date(newEndDate)
    if (requestedDate <= new Date(booking.endDate)) {
      return NextResponse.json(
        { error: { code: "INVALID_DATE", message: "A nova data deve ser posterior à data de devolução atual." } },
        { status: 400 },
      )
    }

    const now = new Date()
    await prisma.$executeRaw`
      UPDATE bookings
      SET
        "extensionRequestedEndDate" = ${requestedDate},
        "extensionStatus"           = 'PENDING',
        "extensionRequestedAt"      = ${now},
        "extensionRespondedAt"      = NULL,
        "updatedAt"                 = ${now}
      WHERE id = ${id}
    `

    // Notifica o proprietário
    prisma.notification.create({
      data: {
        userId: booking.ownerId,
        type:   "BOOKING_CONFIRMED",
        title:  "Solicitação de extensão",
        body:   `O locatário solicitou estender a devolução de "${booking.itemTitle}" até ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(requestedDate)}.`,
        data:   { bookingId: id },
      },
    }).catch((e) => console.error("[extend] notification owner:", e instanceof Error ? e.message : e))

    return NextResponse.json(
      { data: { id, extensionStatus: "PENDING", extensionRequestedEndDate: requestedDate } },
      { status: 200 },
    )
  } catch (e) {
    console.error("[POST /api/bookings/:id/extend]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}

/** PATCH — proprietário aprova ou recusa a extensão */
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
    const parsed = PatchExtendSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados inválidos." } },
        { status: 400 },
      )
    }

    const { action } = parsed.data
    const userId      = session.user.id

    const rows = await prisma.$queryRaw<BookingExtRow[]>`
      SELECT
        b.id,
        b.status,
        b."borrowerId",
        b."ownerId",
        b."endDate",
        i.title AS "itemTitle",
        b."extensionStatus",
        b."extensionRequestedEndDate"
      FROM bookings b
      JOIN items i ON i.id = b."itemId"
      WHERE b.id = ${id}
        AND b."deletedAt" IS NULL
      LIMIT 1
    `
    const booking = rows[0]

    if (!booking) {
      return NextResponse.json(
        { error: { code: "BOOKING_NOT_FOUND", message: "Reserva não encontrada." } },
        { status: 404 },
      )
    }

    if (booking.ownerId !== userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Apenas o proprietário pode responder à solicitação." } },
        { status: 403 },
      )
    }

    if (booking.extensionStatus !== "PENDING") {
      return NextResponse.json(
        { error: { code: "NO_PENDING_EXTENSION", message: "Não há solicitação de extensão pendente." } },
        { status: 422 },
      )
    }

    const now            = new Date()
    const isApproved     = action === "approve"
    const newExtStatus   = isApproved ? "APPROVED" : "REJECTED"

    if (isApproved && booking.extensionRequestedEndDate) {
      await prisma.$executeRaw`
        UPDATE bookings
        SET
          "extensionStatus"      = ${newExtStatus},
          "extensionRespondedAt" = ${now},
          "endDate"              = ${new Date(booking.extensionRequestedEndDate)},
          "updatedAt"            = ${now}
        WHERE id = ${id}
      `
    } else {
      await prisma.$executeRaw`
        UPDATE bookings
        SET
          "extensionStatus"      = ${newExtStatus},
          "extensionRespondedAt" = ${now},
          "updatedAt"            = ${now}
        WHERE id = ${id}
      `
    }

    // Notifica o locatário
    const dateStr = booking.extensionRequestedEndDate
      ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(booking.extensionRequestedEndDate))
      : ""
    const notifBody = isApproved
      ? `Sua extensão de prazo para "${booking.itemTitle}" até ${dateStr} foi aprovada.`
      : `Sua solicitação de extensão para "${booking.itemTitle}" foi recusada pelo proprietário.`

    prisma.notification.create({
      data: {
        userId: booking.borrowerId,
        type:   "BOOKING_CONFIRMED",
        title:  isApproved ? "Extensão aprovada" : "Extensão recusada",
        body:   notifBody,
        data:   { bookingId: id },
      },
    }).catch((e) => console.error("[extend] notification borrower:", e instanceof Error ? e.message : e))

    return NextResponse.json(
      {
        data: {
          id,
          extensionStatus: newExtStatus,
          ...(isApproved && booking.extensionRequestedEndDate && {
            endDate: new Date(booking.extensionRequestedEndDate),
          }),
        },
      },
      { status: 200 },
    )
  } catch (e) {
    console.error("[PATCH /api/bookings/:id/extend]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
