import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const favorites = await prisma.favorite.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        item: {
          select: {
            id:          true,
            title:       true,
            pricePerDay: true,
            condition:   true,
            city:        true,
            state:       true,
            neighborhood: true,
            isActive:    true,
            isApproved:  true,
            deletedAt:   true,
            images:   { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
            category: { select: { name: true } },
            owner:    { select: { name: true, isVerified: true } },
            _count:   { select: { reviews: true, favorites: true } },
          },
        },
      },
    })

    // Filtra itens deletados ou desaprovados (pode ter sido alterado após favoritar)
    const data = favorites
      .filter((f) => f.item.isActive && f.item.isApproved && !f.item.deletedAt)
      .map((f) => ({ ...f.item, favoritedAt: f.createdAt }))

    return NextResponse.json({ data })
  } catch (e) {
    console.error("[GET /api/favorites]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
