import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendIdVerifiedEmail, sendIdRejectedEmail } from "@/lib/email"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const Schema = z.object({
  action:          z.enum(["approve", "reject"]),
  rejectionReason: z.string().min(10).max(500).optional(),
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
    const body   = await req.json()
    const parsed = Schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Dados inválidos.", details: parsed.error.flatten().fieldErrors } },
        { status: 400 },
      )
    }

    const { action, rejectionReason } = parsed.data

    if (action === "reject" && !rejectionReason) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Motivo da rejeição é obrigatório." } },
        { status: 400 },
      )
    }

    const user = await prisma.user.findFirst({
      where:  { id, deletedAt: null },
      select: { id: true, idVerificationStatus: true, name: true, email: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Usuário não encontrado." } },
        { status: 404 },
      )
    }

    if (user.idVerificationStatus !== "PENDING") {
      return NextResponse.json(
        { error: { code: "INVALID_STATE", message: "Usuário não tem verificação pendente." } },
        { status: 409 },
      )
    }

    const isApprove = action === "approve"
    const now       = new Date()

    const updated = await prisma.user.update({
      where: { id },
      data: {
        idVerificationStatus: isApprove ? "VERIFIED" : "REJECTED",
        isVerified:           isApprove ? true : undefined,
        idVerifiedAt:         isApprove ? now  : undefined,
        idRejectionReason:    isApprove ? null : rejectionReason,
      },
      select: { id: true, idVerificationStatus: true, isVerified: true, updatedAt: true },
    })

    // E-mail de resultado — após a resposta
    after(() =>
      (isApprove
        ? sendIdVerifiedEmail(user.email, user.name)
        : sendIdRejectedEmail(user.email, user.name, rejectionReason!)
      ).catch((e) => console.error("[id-verification email]", e instanceof Error ? e.message : e))
    )

    // Notificar usuário
    const notifType = isApprove ? "ID_VERIFIED" : "ID_REJECTED"
    const notifMsg  = isApprove
      ? "Sua identidade foi verificada com sucesso! ✅"
      : `Sua verificação foi rejeitada: ${rejectionReason}`

    after(() =>
      prisma.notification.create({
        data: {
          userId: id,
          type:   notifType,
          title:  isApprove ? "Identidade verificada" : "Verificação rejeitada",
          body:   notifMsg,
        },
      }).catch((e) => console.error("[id-verification notify]", e instanceof Error ? e.message : e))
    )

    // Admin log — após a resposta
    after(() =>
      prisma.adminLog.create({
        data: {
          adminId:    session.user.id,
          action:     isApprove ? "ID_APPROVED" : "ID_REJECTED",
          entityType: "User",
          entityId:   id,
          metadata:   rejectionReason ? { rejectionReason } : undefined,
        },
      }).catch((e) => console.error("[adminLog]", e instanceof Error ? e.message : e))
    )

    return NextResponse.json({ data: updated })
  } catch (e) {
    console.error("[PATCH /api/admin/users/:id/id-verification]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
