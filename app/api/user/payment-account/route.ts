import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { resolveUserId } from "@/lib/resolveUserId"
import { prisma } from "@/lib/prisma"
import { getPlatformFeeRate } from "@/lib/platform-config"
import { isStripeConnectActive } from "@/lib/stripe-connect"
import { PaymentAccountSchema } from "@/lib/validations/payment-account"

// Consumido pelo site (app/perfil/recebimentos/page.tsx faz a mesma leitura
// direto via Prisma/Server Component) e pelo app mobile (Bearer via
// resolveUserId — apps/mobile/app/perfil/recebimentos.tsx). Os campos
// stripe* e `stripeConnectActive` foram adicionados junto com o onboarding
// Stripe Connect (ADR-028) para o app renderizar a mesma seção que o site.
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const [account, feeRateBps, stripeConnectActive] = await Promise.all([
    prisma.ownerPaymentAccount.findUnique({
      where:  { userId },
      select: {
        id: true, pixKeyType: true, pixKey: true, holderName: true, bankName: true, status: true, updatedAt: true,
        stripeAccountId: true, stripeChargesEnabled: true, stripePayoutsEnabled: true,
      },
    }),
    getPlatformFeeRate(),
    isStripeConnectActive(),
  ])

  return NextResponse.json({ account, feeRateBps, stripeConnectActive })
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const body = await req.json()
  const parsed = PaymentAccountSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await prisma.ownerPaymentAccount.findUnique({ where: { userId } })
  if (existing) {
    return NextResponse.json({ error: "Conta já existe. Use PATCH para atualizar." }, { status: 409 })
  }

  const account = await prisma.ownerPaymentAccount.create({
    data: {
      userId,
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
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const body = await req.json()
  const parsed = PaymentAccountSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 })
  }

  const account = await prisma.ownerPaymentAccount.upsert({
    where:  { userId },
    create: {
      userId,
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
