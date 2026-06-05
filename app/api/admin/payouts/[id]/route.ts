import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAdminRole } from "@/lib/auth/admin-guards"
import { auditLog } from "@/lib/audit"

const ActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note:   z.string().max(500).optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  try {
    requireAdminRole(session, "ADMIN_SUPERADMIN", "ADMIN_FINANCEIRO")
  } catch {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
  }

  const { id } = await params
  const body   = await req.json()
  const parsed = ActionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const { action, note } = parsed.data
  const adminId = session!.user.id

  const payout = await prisma.payout.findUnique({
    where:  { id },
    select: { id: true, status: true, amount: true, bookingId: true },
  })

  if (!payout) return NextResponse.json({ error: "Repasse não encontrado" }, { status: 404 })

  // Four-eyes: só repasses em PROCESSING podem ser aprovados/rejeitados
  if (payout.status !== "PROCESSING") {
    return NextResponse.json(
      { error: `Repasse com status '${payout.status}' não pode ser ${action === "approve" ? "aprovado" : "rejeitado"}` },
      { status: 422 },
    )
  }

  if (action === "approve") {
    await prisma.payout.update({
      where: { id },
      data:  { status: "COMPLETED", processedAt: new Date(), failureReason: null },
    })
    auditLog(adminId, "PAYOUT_MARKED_COMPLETED", "Payout", id, {
      amount: payout.amount, bookingId: payout.bookingId, note,
    })
    return NextResponse.json({ ok: true, status: "COMPLETED" })
  }

  // reject → volta para PENDING com failureReason
  await prisma.payout.update({
    where: { id },
    data:  { status: "PENDING", failureReason: note ?? "Rejeitado pelo admin" },
  })
  auditLog(adminId, "PAYOUT_REJECTED", "Payout", id, {
    amount: payout.amount, bookingId: payout.bookingId, note,
  })
  return NextResponse.json({ ok: true, status: "PENDING" })
}
