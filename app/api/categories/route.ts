import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      select: {
        id: true,
        slug: true,
        name: true,
        icon: true,
        children: { select: { id: true, slug: true, name: true } },
      },
      orderBy: { name: "asc" },
    })
    return NextResponse.json({ data: categories })
  } catch (e) {
    console.error("[GET /api/categories]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 }
    )
  }
}
