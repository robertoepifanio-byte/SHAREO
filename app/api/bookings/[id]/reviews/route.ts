import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CreateReviewSchema } from "@/lib/validations/reviews"
import type { ReviewType } from "@prisma/client"

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

    const { id }   = await params
    const userId   = session.user.id

    const booking = await prisma.booking.findUnique({
      where:  { id },
      select: { borrowerId: true, ownerId: true },
    })

    if (!booking) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Reserva não encontrada." } },
        { status: 404 },
      )
    }

    if (booking.borrowerId !== userId && booking.ownerId !== userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Acesso negado." } },
        { status: 403 },
      )
    }

    const reviews = await prisma.review.findMany({
      where:   { bookingId: id },
      select:  {
        id:         true,
        reviewType: true,
        rating:     true,
        comment:    true,
        reviewer:   { select: { id: true, name: true, avatarUrl: true } },
        createdAt:  true,
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ data: reviews })
  } catch (e) {
    console.error("[GET /api/bookings/:id/reviews]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const { id }  = await params
    const body    = await req.json()
    const parsed  = CreateReviewSchema.safeParse(body)

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

    const { reviewType, rating, comment } = parsed.data
    const userId = session.user.id

    const booking = await prisma.booking.findUnique({
      where:  { id },
      select: { id: true, status: true, borrowerId: true, ownerId: true, itemId: true },
    })

    if (!booking) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Reserva não encontrada." } },
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

    if (booking.status !== "RETURNED" && booking.status !== "COMPLETED") {
      return NextResponse.json(
        { error: { code: "BOOKING_NOT_REVIEWABLE", message: "Reserva ainda não pode ser avaliada." } },
        { status: 422 },
      )
    }

    // Borrower can review the item and the owner; owner can review the borrower
    const allowedTypes: ReviewType[] = isBorrower ? ["ITEM", "OWNER"] : ["BORROWER"]
    if (!allowedTypes.includes(reviewType)) {
      return NextResponse.json(
        { error: { code: "INVALID_REVIEW_TYPE", message: "Tipo de avaliação não permitido para seu papel." } },
        { status: 422 },
      )
    }

    const revieweeId = reviewType === "BORROWER" ? booking.borrowerId : booking.ownerId

    const existing = await prisma.review.findUnique({
      where:  { bookingId_reviewerId_reviewType: { bookingId: id, reviewerId: userId, reviewType } },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json(
        { error: { code: "ALREADY_REVIEWED", message: "Você já avaliou este tipo nesta reserva." } },
        { status: 409 },
      )
    }

    const review = await prisma.review.create({
      data: {
        bookingId:  id,
        reviewerId: userId,
        revieweeId,
        itemId:     reviewType === "ITEM" ? booking.itemId : null,
        reviewType,
        rating,
        comment:    comment?.trim() || null,
      },
      select: { id: true, reviewType: true, rating: true, comment: true, createdAt: true },
    })

    // Auto-complete booking once all 3 review types have been submitted (fire-and-forget)
    if (booking.status === "RETURNED") {
      prisma.review.count({ where: { bookingId: id } })
        .then(async (count) => {
          if (count >= 3) {
            await prisma.booking.update({
              where: { id, status: "RETURNED" },
              data:  { status: "COMPLETED" },
            })
          }
        })
        .catch((e) => console.error("[auto-complete booking]", e instanceof Error ? e.message : e))
    }

    return NextResponse.json({ data: review }, { status: 201 })
  } catch (e) {
    console.error("[POST /api/bookings/:id/reviews]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
