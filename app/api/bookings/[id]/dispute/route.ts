/**
 * POST /api/bookings/[id]/dispute
 * P1-26 — Abre uma disputa em uma reserva ACTIVE ou RETURNED.
 * Muda o status para DISPUTED e registra o motivo e descrição.
 */

import { NextResponse, after, type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isOwnStoragePhotoUrl } from "@/lib/validations/storageUrl"
import { checkDisputeWindow } from "@/lib/disputeWindow"

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
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

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
    const userId = session.user.id

    const booking = await prisma.booking.findUnique({
      where:  { id },
      select: {
        id:         true,
        status:     true,
        borrowerId: true,
        ownerId:    true,
        returnRequestedAt: true, // janela de 48h do locador — ver checagem abaixo
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

    const reasonLabel = REASON_LABELS[reason] ?? reason
    const cancelReason = `[Disputa] ${reasonLabel}: ${description}`

    const updated = await prisma.booking.update({
      where: { id },
      data:  {
        status:       "DISPUTED",
        cancelReason: cancelReason,
      },
      select: { id: true, status: true, updatedAt: true },
    })

    // Notifica a outra parte.
    //
    // 🪤 `notifyRole` descrevia QUEM RECEBE, mas o texto usa como QUEM ABRIU —
    // então o destinatário lia "O locatário abriu uma disputa" quando ele mesmo
    // era o locatário. Os dois papéis são opostos: quem recebe é o outro lado de
    // quem agiu. Nomes explícitos para não voltar a confundir.
    const notifyUserId  = isOwner ? booking.borrowerId : booking.ownerId
    const papelDeQuemAbriu = isOwner ? "locador" : "locatário"

    after(() =>
      prisma.notification.create({
        data: {
          userId: notifyUserId,
          type:   "BOOKING_CANCELLED", // reutiliza tipo existente; o body indica disputa
          title:  "Disputa aberta",
          body:   `O ${papelDeQuemAbriu} abriu uma disputa em "${booking.item.title}": ${reasonLabel}.`,
          data:   { bookingId: id, photoUrl: photoUrl ?? null },
        },
      }).catch((e) => console.error("[dispute] notification:", e instanceof Error ? e.message : e))
    )

    return NextResponse.json({ data: updated }, { status: 200 })
  } catch (e) {
    console.error("[POST /api/bookings/:id/dispute]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
