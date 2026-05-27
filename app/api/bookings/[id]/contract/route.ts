/**
 * POST /api/bookings/[id]/contract
 * Registra a aceitação do contrato digital pelo locatário.
 */
import type { NextRequest } from "next/server"
import { NextResponse }     from "next/server"
import { auth }             from "@/lib/auth"
import { prisma }           from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })

  const { id } = await params

  const booking = await prisma.booking.findFirst({
    where:  { id, deletedAt: null },
    select: { borrowerId: true, status: true, contractSignedAt: true },
  })

  if (!booking)
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })

  if (booking.borrowerId !== session.user.id)
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 })

  if (booking.contractSignedAt)
    return NextResponse.json({ data: { alreadySigned: true } })

  const ip        = req.headers.get("x-forwarded-for")?.split(",")[0] ?? null
  const userAgent = req.headers.get("user-agent") ?? null

  await prisma.$transaction([
    prisma.booking.update({
      where: { id },
      data:  { contractSignedAt: new Date() },
    }),
    prisma.contractAcceptance.create({
      data: { bookingId: id, ipAddress: ip, userAgent },
    }),
  ])

  return NextResponse.json({ data: { signed: true } })
}
