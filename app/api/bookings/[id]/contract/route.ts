/**
 * POST /api/bookings/[id]/contract
 * Registra a aceitação do contrato digital pelo locatário.
 *
 * Endpoint mantido para compatibilidade com fluxos alternativos (ex.: aceite
 * após criação da reserva, fora do fluxo principal do PriceCalc).
 * Quando a flag rentalContractAcceptanceEnabled está ON, o aceite é preferencialmente
 * gravado de forma atômica no POST /api/bookings junto com a criação da reserva.
 * Este endpoint cobre o caso em que a reserva já existe mas ainda não tem aceite.
 */
import type { NextRequest } from "next/server"
import { NextResponse }     from "next/server"
import { resolveUserId }    from "@/lib/resolveUserId"
import { prisma }           from "@/lib/prisma"
import { RENTAL_CONTRACT_VERSION, RENTAL_CONTRACT_TEXT_HASH } from "@/lib/rental-contract"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })

  const { id } = await params

  const booking = await prisma.booking.findFirst({
    where:  { id, deletedAt: null },
    select: { borrowerId: true, status: true, contractSignedAt: true },
  })

  if (!booking)
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })

  if (booking.borrowerId !== userId)
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
      data: {
        bookingId:        id,
        ipAddress:        ip,
        userAgent:        userAgent,
        // Campos aditivos (migração 20260628000000) — registram qual versão
        // e qual hash do texto o locatário aceitou, para trilha de auditoria D4.
        contractVersion:  RENTAL_CONTRACT_VERSION,
        contractTextHash: RENTAL_CONTRACT_TEXT_HASH,
      },
    }),
  ])

  return NextResponse.json({ data: { signed: true } })
}
