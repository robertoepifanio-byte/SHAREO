import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

// POST toggles: adds if not present, removes if present
export async function POST(_req: NextRequest, { params }: Params) {
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

    const item = await prisma.item.findFirst({
      where:  { id, deletedAt: null },
      select: { id: true },
    })

    if (!item) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Item não encontrado." } },
        { status: 404 },
      )
    }

    const existing = await prisma.favorite.findUnique({
      where:  { userId_itemId: { userId, itemId: id } },
      select: { userId: true },
    })

    if (existing) {
      await prisma.favorite.delete({ where: { userId_itemId: { userId, itemId: id } } })
      return NextResponse.json({ data: { favorited: false } })
    }

    await prisma.favorite.create({ data: { userId, itemId: id } })
    return NextResponse.json({ data: { favorited: true } }, { status: 201 })
  } catch (e) {
    console.error("[POST /api/items/:id/favorite]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
