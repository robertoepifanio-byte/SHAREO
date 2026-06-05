import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAdminRole } from "@/lib/auth/admin-guards"
import { auditLog } from "@/lib/audit"

const ActionSchema = z.object({
  action: z.enum(["verify", "reject"]),
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

  const account = await prisma.ownerPaymentAccount.findUnique({
    where:  { id },
    select: { id: true, status: true, userId: true, pixKey: true },
  })

  if (!account) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 })

  const newStatus = action === "verify" ? "VERIFIED" : "REJECTED"

  await prisma.ownerPaymentAccount.update({
    where: { id },
    data:  { status: newStatus },
  })

  auditLog(
    adminId,
    action === "verify" ? "PIX_ACCOUNT_VERIFIED" : "PIX_ACCOUNT_REJECTED",
    "OwnerPaymentAccount",
    id,
    { userId: account.userId, pixKey: account.pixKey, note },
  )

  return NextResponse.json({ ok: true, status: newStatus })
}
