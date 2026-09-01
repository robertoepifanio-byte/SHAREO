/**
 * PATCH /api/admin/bookings/[id]/late-fee — recálculo MANUAL da taxa de atraso.
 *
 * 🪤 Por que só o admin: o cálculo automático para no teto de 30 dias
 * (`TETO_DIAS_CALCULO_AUTOMATICO`), e depois disso alguém precisa poder mover o
 * valor. Esse "alguém" NÃO pode ser o proprietário — seria uma parte da locação
 * aumentando unilateralmente a dívida da outra, sem mediação, num contrato de
 * adesão. Aqui é decisão de mediação: tem autor, exige justificativa e fica no
 * adminLog. Decisão de Roberto, 01/09/2026.
 */
import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getLateFeeMultiplier, calcLateFee } from "@/lib/platform-config"
import { diasDeAtraso, emitirCobrancaTaxaAtraso, taxaDeAtrasoQuitada } from "@/lib/lateFee"

type Params = { params: Promise<{ id: string }> }

const PatchSchema = z.object({
  // Justificativa obrigatória: este é o único caminho em que o valor da multa
  // muda por decisão humana. Sem o porquê, ninguém reconstrói o caso depois.
  adminNote: z.string().trim().min(10, "Explique o motivo do recálculo (mín. 10 caracteres)."),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Acesso restrito a administradores." } },
        { status: 403 },
      )
    }

    const { id } = await params
    const parsed = PatchSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados inválidos." } },
        { status: 400 },
      )
    }

    const booking = await prisma.booking.findUnique({
      where:  { id },
      select: {
        id: true, status: true, endDate: true, dailyPrice: true,
        returnRequestedAt: true, returnedAt: true,
        lateFeeAmount: true, lateFeePaymentIntentId: true,
        lateFeeSessionId: true, lateFeeSessionExpiresAt: true,
        borrower: { select: { email: true, name: true } },
        item:     { select: { title: true, images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 } } },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Reserva não encontrada." } },
        { status: 404 },
      )
    }

    if (taxaDeAtrasoQuitada(booking)) {
      return NextResponse.json(
        { error: { code: "JA_QUITADA", message: "A taxa desta reserva já foi paga." } },
        { status: 422 },
      )
    }

    // Mesma regra do cron: o atraso corre até hoje enquanto o item não voltou,
    // e congela na devolução. O que muda aqui é a AUSÊNCIA do teto de 30 dias.
    const fimDoAtraso = booking.returnRequestedAt ?? booking.returnedAt ?? new Date()
    const dias        = diasDeAtraso(booking.endDate, fimDoAtraso)
    const multiplier  = await getLateFeeMultiplier()
    const valor       = calcLateFee(booking.dailyPrice, multiplier, dias)

    const r = await emitirCobrancaTaxaAtraso(
      booking,
      booking.item.title,
      valor,
      dias,
      fimDoAtraso,
    )

    after(() =>
      prisma.adminLog.create({
        data: {
          adminId:    session.user.id,
          action:     "RECALCULAR_TAXA_ATRASO",
          entityType: "Booking",
          entityId:   id,
          metadata:   {
            adminNote: parsed.data.adminNote,
            dias,
            valorAnterior: booking.lateFeeAmount,
            valorNovo:     r.emitida ? r.valor : booking.lateFeeAmount,
            emitida:       r.emitida,
          },
        },
      }).catch((e) => console.error("[adminLog recalcular taxa]", e instanceof Error ? e.message : e))
    )

    return NextResponse.json({
      data: {
        dias,
        valor,
        calculadoAte: fimDoAtraso.toISOString(),
        emitida:  r.emitida,
        // Quando não emite, o motivo importa: "a cobrança viva já está pelo
        // valor certo" é sucesso, não falha — o admin precisa distinguir.
        motivo:   r.emitida ? null : r.motivo,
        anterior: booking.lateFeeAmount,
      },
    })
  } catch (e) {
    console.error("[PATCH /api/admin/bookings/:id/late-fee]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
