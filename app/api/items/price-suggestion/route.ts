import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/items/price-suggestion?city=Natal&categoryId=xxx
 *
 * Retorna o preço médio (min/max) de itens ativos na mesma cidade e categoria.
 * Exige no mínimo 3 itens para retornar dados — evita sugestões com pouca amostra.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const city       = searchParams.get("city")?.trim()
  const categoryId = searchParams.get("categoryId")?.trim()

  if (!city || !categoryId) {
    return NextResponse.json(
      { error: { message: "city e categoryId são obrigatórios." } },
      { status: 400 },
    )
  }

  try {
    const result = await prisma.item.aggregate({
      where: {
        isActive:   true,
        isApproved: true,
        deletedAt:  null,
        categoryId,
        city: { contains: city, mode: "insensitive" },
      },
      _avg:   { pricePerDay: true },
      _min:   { pricePerDay: true },
      _max:   { pricePerDay: true },
      _count: { _all: true },
    })

    const count = result._count._all

    if (count < 3) {
      // Amostra insuficiente — frontend não exibe o hint
      return NextResponse.json({ data: null, count })
    }

    const avgCents = result._avg.pricePerDay ?? 0
    const minCents = result._min.pricePerDay ?? 0
    const maxCents = result._max.pricePerDay ?? 0

    // Calcular intervalo ±25% em torno da média (ou usar min/max quando mais representativo)
    const rangeMin = Math.round(avgCents * 0.75)
    const rangeMax = Math.round(avgCents * 1.25)

    return NextResponse.json({
      data: {
        avgCents,
        rangeMinCents: Math.max(rangeMin, minCents),
        rangeMaxCents: Math.min(rangeMax, maxCents),
        count,
      },
    })
  } catch (err) {
    console.error("[price-suggestion] error:", err instanceof Error ? err.message : "unknown")
    return NextResponse.json(
      { error: { message: "Erro ao buscar sugestão de preço." } },
      { status: 500 },
    )
  }
}
