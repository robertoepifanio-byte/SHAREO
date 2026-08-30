/**
 * GET /api/items/[id]/availability
 * Retorna array de datas ocupadas ("YYYY-MM-DD") para o item.
 * Considera reservas com status CONFIRMED, ACTIVE, RETURNED ou COMPLETED.
 *
 * 🪤 Devolução antecipada: o campo `endDate` é a data PLANEJADA da locação e não
 * muda quando o locatário devolve antes do prazo — só `returnRequestedAt` (gravado
 * no mark_returned, quando o item volta fisicamente às mãos do locador) reflete
 * isso. Sem considerar esse campo, os dias entre a devolução real e o `endDate`
 * original continuavam marcados como ocupados na agenda, mesmo já estando livres
 * para nova locação (findOverlappingItem, que decide de verdade, só bloqueia
 * CONFIRMED/ACTIVE — RETURNED nunca bloqueou a criação, só a exibição mentia).
 */

import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params

    // Confirmar que o item existe e está ativo
    const item = await prisma.item.findFirst({
      where: { id, deletedAt: null, status: "AVAILABLE", isApproved: true },
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

    // Ocupação via booking_items (cobre locações multi-item — Story B): um item pode
    // estar reservado como item secundário de uma locação cujo Booking.itemId é outro.
    const occupiedRows = await prisma.bookingItem.findMany({
      where: {
        itemId: id,
        booking: {
          deletedAt: null,
          status:    { in: ["CONFIRMED", "ACTIVE", "RETURNED", "COMPLETED"] },
          // sobrepõe com a janela de interesse
          startDate: { lt: horizon },
          endDate:   { gte: today },
        },
      },
      select: {
        booking: {
          select: { startDate: true, endDate: true, status: true, returnRequestedAt: true },
        },
      },
    })
    const bookings = occupiedRows.map((r) => r.booking)

    // Expande cada booking para a lista de dias individuais
    const occupied: string[] = []

    for (const b of bookings) {
      // Devolvido (RETURNED/COMPLETED) com devolução antecipada: a ocupação real
      // termina em returnRequestedAt, não no endDate planejado.
      const isReturned  = b.status === "RETURNED" || b.status === "COMPLETED"
      const effectiveEnd = isReturned && b.returnRequestedAt ? b.returnRequestedAt : b.endDate

      // UTC, não local: a chave abaixo vem de toISOString() (sempre UTC). Truncar com
      // setHours (local) e comparar com uma chave gerada em UTC descasa em qualquer
      // timezone negativo (ex.: BRT) — um booking podia perder ou ganhar um dia nas
      // pontas. Mesma classe de bug de feedback-new-date-string-sem-fuso.
      const start = new Date(b.startDate)
      const end   = new Date(effectiveEnd)
      start.setUTCHours(0, 0, 0, 0)
      end.setUTCHours(0, 0, 0, 0)

      const cur = new Date(start)
      while (cur <= end) {
        const key = cur.toISOString().slice(0, 10) // "YYYY-MM-DD"
        if (!occupied.includes(key)) occupied.push(key)
        cur.setUTCDate(cur.getUTCDate() + 1)
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
