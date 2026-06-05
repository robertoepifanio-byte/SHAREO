/**
 * GET /api/user/informe-rendimentos?year=2026
 * Retorna total de repasses COMPLETED do proprietário no ano solicitado.
 * Usado para declaração de Imposto de Renda.
 */
import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const yearParam = req.nextUrl.searchParams.get("year")
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

  if (isNaN(year) || year < 2024 || year > new Date().getFullYear()) {
    return NextResponse.json({ error: "Ano inválido" }, { status: 400 })
  }

  const start = new Date(`${year}-01-01T00:00:00.000Z`)
  const end   = new Date(`${year}-12-31T23:59:59.999Z`)

  const account = await prisma.ownerPaymentAccount.findUnique({
    where:  { userId: session.user.id },
    select: { id: true, holderName: true, pixKey: true, pixKeyType: true },
  })

  if (!account) {
    return NextResponse.json({
      year,
      totalPaidCents: 0,
      payoutCount: 0,
      account: null,
    })
  }

  const payouts = await prisma.payout.findMany({
    where: {
      ownerPaymentAccountId: account.id,
      status:                "COMPLETED",
      processedAt:           { gte: start, lte: end },
    },
    select: {
      id:          true,
      amount:      true,
      processedAt: true,
      booking: {
        select: {
          id:        true,
          startDate: true,
          endDate:   true,
          item:      { select: { title: true } },
        },
      },
    },
    orderBy: { processedAt: "asc" },
  })

  const totalPaidCents = payouts.reduce((s, p) => s + p.amount, 0)

  return NextResponse.json({
    year,
    totalPaidCents,
    totalPaidBrl: (totalPaidCents / 100).toFixed(2),
    payoutCount: payouts.length,
    account: {
      holderName:  account.holderName,
      pixKey:      account.pixKey,
      pixKeyType:  account.pixKeyType,
    },
    payouts: payouts.map((p) => ({
      id:          p.id,
      amount:      p.amount,
      amountBrl:   (p.amount / 100).toFixed(2),
      processedAt: p.processedAt,
      item:        p.booking.item.title,
      bookingId:   p.booking.id,
      period:      `${p.booking.startDate.toISOString().slice(0, 10)} – ${p.booking.endDate.toISOString().slice(0, 10)}`,
    })),
  })
}
