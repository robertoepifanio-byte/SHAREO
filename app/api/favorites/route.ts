import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { resolveUserId } from "@/lib/resolveUserId"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const favorites = await prisma.favorite.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
      // Sem paginação de verdade na tela (a página mostra tudo de uma vez) — este
      // take é só um teto defensivo contra uma conta com milhares de favoritos
      // carregando joins pesados numa lambda só.
      take: 300,
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
            status:      true,
            isApproved:  true,
            deletedAt:   true,
            images:   { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
            category: { select: { name: true, slug: true } },
            owner:    { select: { name: true, isVerified: true } },
            _count:   { select: { reviews: true, favorites: true } },
          },
        },
      },
    })

    // Filtra itens deletados ou desaprovados (pode ter sido alterado após favoritar)
    const data = favorites
      .filter((f) => f.item.status === "AVAILABLE" && f.item.isApproved && !f.item.deletedAt)
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
