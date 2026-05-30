/**
 * GET /api/items/[id]/availability
 * Retorna array de datas ocupadas ("YYYY-MM-DD") para o item.
 * Considera reservas com status CONFIRMED, ACTIVE, RETURNED ou COMPLETED.
 */

import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params

    // Confirmar que o item existe e está ativo
    const item = await prisma.item.findFirst({
      where: { id, deletedAt: null, isActive: true, isApproved: true },
      select: { id: true },
    })

    if (!item) {
      return NextResponse.json(
        { error: { code: "ITEM_NOT_FOUND", message: "Item não encontrado." } },
        { status: 404 },
      )
    }

    // Busca reservas que ocupam o item — janela de 12 meses a partir de hoje
    const today   = new Date()
    today.setHours(0, 0, 0, 0)
    const horizon = new Date(today)
    horizon.setMonth(horizon.getMonth() + 12)

    const bookings = await prisma.booking.findMany({
      where: {
        itemId:    id,
        deletedAt: null,
        status:    { in: ["CONFIRMED", "ACTIVE", "RETURNED", "COMPLETED"] },
        // sobrepõe com a janela de interesse
        startDate: { lt: horizon },
        endDate:   { gte: today },
      },
      select: { startDate: true, endDate: true },
    })

    // Expande cada booking para a lista de dias individuais
    const occupied: string[] = []

    for (const b of bookings) {
      const start = new Date(b.startDate)
      const end   = new Date(b.endDate)
      start.setHours(0, 0, 0, 0)
      end.setHours(0, 0, 0, 0)

      const cur = new Date(start)
      while (cur <= end) {
        const key = cur.toISOString().slice(0, 10) // "YYYY-MM-DD"
        if (!occupied.includes(key)) occupied.push(key)
        cur.setDate(cur.getDate() + 1)
      }
    }

    return NextResponse.json(
      { data: occupied },
      {
        headers: {
          // cache 5 min no CDN, revalidado em background
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    )
  } catch (e) {
    console.error("[GET /api/items/:id/availability]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
