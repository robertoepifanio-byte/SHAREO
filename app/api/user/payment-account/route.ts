import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PaymentAccountSchema } from "@/lib/validations/payment-account"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const account = await prisma.ownerPaymentAccount.findUnique({
    where:  { userId: session.user.id },
    select: { id: true, pixKeyType: true, pixKey: true, holderName: true, bankName: true, status: true, updatedAt: true },
  })

  return NextResponse.json({ account })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const body = await req.json()
  const parsed = PaymentAccountSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await prisma.ownerPaymentAccount.findUnique({ where: { userId: session.user.id } })
  if (existing) {
    return NextResponse.json({ error: "Conta já existe. Use PATCH para atualizar." }, { status: 409 })
  }

  const account = await prisma.ownerPaymentAccount.create({
    data: {
      userId:     session.user.id,
      pixKeyType: parsed.data.pixKeyType,
      pixKey:     parsed.data.pixKey.trim(),
      holderName: parsed.data.holderName.trim(),
      bankName:   parsed.data.bankName?.trim() ?? null,
      status:     "PENDING_VERIFICATION",
    },
    select: { id: true, pixKeyType: true, pixKey: true, holderName: true, bankName: true, status: true },
  })

  return NextResponse.json({ account }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const body = await req.json()
  const parsed = PaymentAccountSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 })
  }

  const account = await prisma.ownerPaymentAccount.upsert({
    where:  { userId: session.user.id },
    create: {
      userId:     session.user.id,
      pixKeyType: parsed.data.pixKeyType,
      pixKey:     parsed.data.pixKey.trim(),
      holderName: parsed.data.holderName.trim(),
      bankName:   parsed.data.bankName?.trim() ?? null,
      status:     "PENDING_VERIFICATION",
    },
    update: {
      pixKeyType: parsed.data.pixKeyType,
      pixKey:     parsed.data.pixKey.trim(),
      holderName: parsed.data.holderName.trim(),
      bankName:   parsed.data.bankName?.trim() ?? null,
      // Volta para PENDING_VERIFICATION ao alterar a chave
      status:     "PENDING_VERIFICATION",
    },
    select: { id: true, pixKeyType: true, pixKey: true, holderName: true, bankName: true, status: true },
  })

  return NextResponse.json({ account })
}
