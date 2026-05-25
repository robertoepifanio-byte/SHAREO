import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CreateBookingSchema, ListBookingsQuerySchema } from "@/lib/validations/bookings"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
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
    const userId = session.user.id
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
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
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
    const borrowerId = session.user.id

    // Carrega item e valida disponibilidade
    const item = await prisma.item.findFirst({
      where:  { id: itemId, isActive: true, isApproved: true, deletedAt: null },
      select: { id: true, ownerId: true, pricePerDay: true, depositAmount: true },
    })

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

    // Verifica conflito de datas
    const conflict = await prisma.booking.findFirst({
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

    if (conflict) {
      return NextResponse.json(
        { error: { code: "DATE_CONFLICT", message: "Item indisponível no período selecionado." } },
        { status: 409 },
      )
    }

    const totalDays  = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000,
    )
    const totalPrice = item.pricePerDay * totalDays

    // Cria booking + conversation atomicamente
    const booking = await prisma.$transaction(async (tx) => {
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
    })

    // Notificação para o locador (fire-and-forget)
    prisma.notification.create({
      data: {
        userId: item.ownerId,
        type:   "BOOKING_REQUEST",
        title:  "Nova solicitação de aluguel",
        body:   `${session.user.name} quer alugar "${booking.item.title}"`,
        data:   { bookingId: booking.id },
      },
    }).catch(() => {})

    return NextResponse.json({ data: booking }, { status: 201 })
  } catch (e) {
    console.error("[POST /api/bookings]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
