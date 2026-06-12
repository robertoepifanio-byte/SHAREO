import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveUserId } from "@/lib/resolveUserId"
import { CreateBookingSchema, ListBookingsQuerySchema } from "@/lib/validations/bookings"
import { dispatchWebhookEvent } from "@/lib/outboundWebhooks"
import { calcBookingTotal } from "@/lib/pricing"

export async function GET(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const { searchParams } = req.nextUrl
    const query = ListBookingsQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!query.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Parâmetros inválidos." } },
        { status: 400 },
      )
    }

    const { role, status, page, limit } = query.data
    const skip   = (page - 1) * limit

    const where = {
      ...(role === "borrower" ? { borrowerId: userId } :
          role === "owner"    ? { ownerId: userId }    :
          { OR: [{ borrowerId: userId }, { ownerId: userId }] }),
      ...(status && { status }),
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: "desc" },
        select: {
          id:         true,
          status:     true,
          startDate:  true,
          endDate:    true,
          totalDays:  true,
          totalPrice: true,
          dailyPrice: true,
          createdAt:  true,
          item: {
            select: {
              id:    true,
              title: true,
              city:  true,
              state: true,
              images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
            },
          },
          borrower: { select: { id: true, name: true, avatarUrl: true } },
          owner:    { select: { id: true, name: true, avatarUrl: true } },
          conversation: { select: { id: true } },
        },
      }),
      prisma.booking.count({ where }),
    ])

    return NextResponse.json({
      data: bookings,
      meta: { total, page, limit, hasMore: skip + bookings.length < total },
    })
  } catch (e) {
    console.error("[GET /api/bookings]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const borrowerId = await resolveUserId(req)
    if (!borrowerId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const userCheck = await prisma.user.findUnique({
      where:  { id: borrowerId },
      select: { emailVerified: true },
    })
    if (!userCheck?.emailVerified) {
      return NextResponse.json(
        { error: { code: "EMAIL_NOT_VERIFIED", message: "Confirme seu e-mail antes de realizar uma reserva." } },
        { status: 403 },
      )
    }

    const body   = await req.json()
    const parsed = CreateBookingSchema.safeParse(body)
    if (!parsed.success) {
      const details: Record<string, string[]> = {}
      for (const e of parsed.error.errors) {
        const key = e.path.join(".") || "form"
        details[key] = [...(details[key] ?? []), e.message]
      }
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Dados inválidos.", details } },
        { status: 400 },
      )
    }

    const { itemId, startDate, endDate, borrowerNote } = parsed.data

    // Carrega item e valida disponibilidade
    const [item, borrower] = await Promise.all([
      prisma.item.findFirst({
        where:  { id: itemId, status: "AVAILABLE", isApproved: true, deletedAt: null },
        select: {
          id: true, ownerId: true, title: true,
          pricePerDay: true, pricePerWeek: true, pricePerMonth: true, depositAmount: true,
          requireIdVerification: true,
          requirePhone:          true,
        },
      }),
      prisma.user.findUnique({
        where:  { id: borrowerId },
        select: { idVerificationStatus: true, phone: true, name: true },
      }),
    ])

    if (!item) {
      return NextResponse.json(
        { error: { code: "ITEM_UNAVAILABLE", message: "Item não disponível." } },
        { status: 422 },
      )
    }

    if (item.ownerId === borrowerId) {
      return NextResponse.json(
        { error: { code: "CANNOT_BOOK_OWN_ITEM", message: "Você não pode alugar o próprio item." } },
        { status: 403 },
      )
    }

    // Valida requisitos do proprietário
    if (item.requireIdVerification && borrower?.idVerificationStatus !== "VERIFIED") {
      return NextResponse.json(
        { error: { code: "ID_VERIFICATION_REQUIRED", message: "O proprietário exige identidade verificada para alugar este item. Acesse seu perfil e envie seus documentos." } },
        { status: 422 },
      )
    }

    if (item.requirePhone && !borrower?.phone) {
      return NextResponse.json(
        { error: { code: "PHONE_REQUIRED", message: "O proprietário exige telefone cadastrado para alugar este item. Acesse seu perfil e adicione um número de telefone." } },
        { status: 422 },
      )
    }

    const totalDays  = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000,
    )
    const { totalPrice } = calcBookingTotal(
      totalDays, item.pricePerDay, item.pricePerWeek, item.pricePerMonth,
    )

    // Cria booking + conversation atomicamente (conflict check dentro da transação evita double-booking)
    const booking = await prisma.$transaction(async (tx) => {
      const conflict = await tx.booking.findFirst({
        where: {
          itemId,
          status: { in: ["CONFIRMED", "ACTIVE"] },
          AND: [
            { startDate: { lt: new Date(endDate) } },
            { endDate:   { gt: new Date(startDate) } },
          ],
        },
        select: { id: true },
      })
      if (conflict) throw Object.assign(new Error("DATE_CONFLICT"), { code: "DATE_CONFLICT" })

      const b = await tx.booking.create({
        data: {
          itemId,
          borrowerId,
          ownerId:       item.ownerId,
          startDate:     new Date(startDate),
          endDate:       new Date(endDate),
          totalDays,
          dailyPrice:    item.pricePerDay,
          totalPrice,
          depositAmount: item.depositAmount ?? null,
          borrowerNote:  borrowerNote ?? null,
        },
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
          createdAt:     true,
          item: {
            select: {
              title:  true,
              images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
              owner:  { select: { id: true, name: true, avatarUrl: true } },
            },
          },
        },
      })

      const conv = await tx.conversation.create({
        data: {
          bookingId:    b.id,
          participants: {
            create: [
              { userId: borrowerId },
              { userId: item.ownerId },
            ],
          },
        },
        select: { id: true },
      })

      return { ...b, conversationId: conv.id }
    }, { timeout: 5000 })

    // Webhook de saída para o locador — após a resposta
    after(() =>
      dispatchWebhookEvent(item.ownerId, "booking.created", {
        bookingId:  booking.id,
        itemTitle:  booking.item.title,
        borrower:   booking.item.owner.name,
        startDate:  booking.startDate,
        endDate:    booking.endDate,
        totalPrice: booking.totalPrice,
      })
    )

    // Notificação para o locador — após a resposta
    after(() =>
      prisma.notification.create({
        data: {
          userId: item.ownerId,
          type:   "BOOKING_REQUEST",
          title:  "Nova solicitação de aluguel",
          body:   `${borrower?.name ?? "Um usuário"} quer alugar "${booking.item.title}"`,
          data:   { bookingId: booking.id },
        },
      }).catch((e) => console.error("[notification] BOOKING_REQUEST:", e instanceof Error ? e.message : e))
    )

    return NextResponse.json({ data: booking }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && (e as NodeJS.ErrnoException).code === "DATE_CONFLICT") {
      return NextResponse.json(
        { error: { code: "DATE_CONFLICT", message: "Item indisponível no período selecionado." } },
        { status: 409 },
      )
    }
    console.error("[POST /api/bookings]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
