/**
 * POST /api/bookings/[id]/dispute
 * P1-26 — Abre uma disputa em uma reserva ACTIVE ou RETURNED.
 * Muda o status para DISPUTED e registra o motivo e descrição.
 */

import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { withUser } from "@/lib/withUser"
import { prisma } from "@/lib/prisma"
import { isOwnStoragePhotoUrl } from "@/lib/validations/storageUrl"
import { checkDisputeWindow } from "@/lib/disputeWindow"
import { openDispute } from "@/lib/openDispute"

type Params = { params: Promise<{ id: string }> }

const DisputeSchema = z.object({
  reason: z.enum([
    "NAO_FUNCIONA",
    "VEIO_DANIFICADO",
    "FALTAM_ACESSORIOS",
    "OUTRO",
  ], { errorMap: () => ({ message: "Motivo inválido." }) }),
  description: z
    .string()
    .min(10, "Descrição deve ter ao menos 10 caracteres.")
    .max(500, "Descrição: máximo 500 caracteres."),
  photoUrl: z.string().url("URL de foto inválida.").refine(isOwnStoragePhotoUrl, "A foto deve ser enviada pela plataforma.").optional(),
})

const REASON_LABELS: Record<string, string> = {
  NAO_FUNCIONA:      "Não funciona",
  VEIO_DANIFICADO:   "Veio danificado",
  FALTAM_ACESSORIOS: "Faltam acessórios",
  OUTRO:             "Outro",
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await withUser(req)
    if (user instanceof NextResponse) return user

    const { id } = await params
    const body   = await req.json()
    const parsed = DisputeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code:    "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
          },
        },
        { status: 400 },
      )
    }

    const { reason, description, photoUrl } = parsed.data
    const userId = user.id

    const booking = await prisma.booking.findUnique({
      where:  { id },
      select: {
        id:         true,
        status:     true,
        borrowerId: true,
        ownerId:    true,
        returnRequestedAt: true, // janela de 48h do locador — ver checagem abaixo
        disputeStatus:     true, // trava de disputa duplicada — ver checagem abaixo
        item:       { select: { title: true } },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: { code: "BOOKING_NOT_FOUND", message: "Reserva não encontrada." } },
        { status: 404 },
      )
    }

    const isOwner    = booking.ownerId    === userId
    const isBorrower = booking.borrowerId === userId

    if (!isOwner && !isBorrower) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Acesso negado." } },
        { status: 403 },
      )
    }

    // 🪤 Trava de disputa duplicada — antes era implícita no status DISPUTED,
    // que tirava a reserva da faixa ACTIVE|RETURNED. Com a disputa em paralelo
    // ao ciclo de vida, o status não muda mais e a trava tem de ser explícita.
    if (booking.disputeStatus === "OPEN") {
      return NextResponse.json(
        { error: { code: "DISPUTE_ALREADY_OPEN", message: "Já existe uma disputa aberta nesta reserva." } },
        { status: 422 },
      )
    }

    // Disputa só pode ser aberta em reservas ACTIVE ou RETURNED
    if (!["ACTIVE", "RETURNED"].includes(booking.status)) {
      return NextResponse.json(
        {
          error: {
            code:    "INVALID_STATUS",
            message: "Disputa só pode ser aberta em reservas ativas ou devolvidas.",
          },
        },
        { status: 422 },
      )
    }

    // pauta-raimundo-2026-08-22, item 3 — decisão de Raimundo (25/08/2026):
    // janela assimétrica por quem abre. Regra compartilhada com PATCH
    // /api/bookings/:id (action=open_dispute) via lib/disputeWindow.ts.
    const windowCheck = checkDisputeWindow(booking, { isBorrower, isOwner })
    if (!windowCheck.ok) {
      return NextResponse.json(
        { error: { code: "DISPUTE_WINDOW_CLOSED", message: windowCheck.message } },
        { status: 422 },
      )
    }

    const reasonLabel  = REASON_LABELS[reason] ?? reason
    const cancelReason = `[Disputa] ${reasonLabel}: ${description}`

    // Mutação + notificação compartilhadas com PATCH /api/bookings/:id
    // (action=open_dispute) via lib/openDispute.ts — achado de altitude da
    // revisão /simplify (pauta-raimundo-2026-08-22 item 3): as duas rotas
    // tinham cada uma sua própria cópia dessa lógica.
    const updated = await openDispute({
      bookingId:    id,
      cancelReason,
      isOwner,
      openedById:   userId,
      ownerId:      booking.ownerId,
      borrowerId:   booking.borrowerId,
      itemTitle:    booking.item.title,
      reasonLabel,
      photoUrl,
    })

    return NextResponse.json({ data: updated }, { status: 200 })
  } catch (e) {
    console.error("[POST /api/bookings/:id/dispute]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
