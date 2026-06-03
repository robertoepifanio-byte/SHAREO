import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// LGPD art. 20 — portabilidade de dados
export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const userId = session.user.id

    const [user, items, bookings, reviews, favorites] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id:           true,
          name:         true,
          email:        true,
          phone:        true,
          bio:          true,
          city:         true,
          state:        true,
          neighborhood: true,
          userType:     true,
          isVerified:   true,
          consentAt:    true,
          consentVersion: true,
          createdAt:    true,
        },
      }),
      prisma.item.findMany({
        where: { ownerId: userId, deletedAt: null },
        select: {
          id:          true,
          title:       true,
          description: true,
          pricePerDay: true,
          condition:   true,
          city:        true,
          state:       true,
          status:      true,
          createdAt:   true,
          category:    { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.booking.findMany({
        where: { OR: [{ borrowerId: userId }, { ownerId: userId }] },
        select: {
          id:         true,
          status:     true,
          startDate:  true,
          endDate:    true,
          totalDays:  true,
          totalPrice: true,
          createdAt:  true,
          item:       { select: { title: true } },
          borrower:   { select: { name: true } },
          owner:      { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.review.findMany({
        where: { reviewerId: userId },
        select: {
          id:         true,
          rating:     true,
          comment:    true,
          reviewType: true,
          createdAt:  true,
          reviewee:   { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.favorite.findMany({
        where: { userId },
        select: {
          createdAt: true,
          item: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ])

    const payload = {
      exportedAt: new Date().toISOString(),
      user,
      items,
      bookings,
      reviews,
      favorites,
    }

    const filename = `shareo-meus-dados-${new Date().toISOString().split("T")[0]}.json`

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (e: unknown) {
    console.error("[GET /api/users/me/export]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
