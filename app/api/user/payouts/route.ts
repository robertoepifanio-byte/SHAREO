/**
 * GET /api/user/payouts
 * Lista os repasses (payouts) do proprietário autenticado.
 *
 * Suporta Bearer JWT (app mobile via resolveUserId) e cookie NextAuth (site).
 * Replica a mesma query de app/perfil/repasses/page.tsx — não altera lógica de negócio.
 *
 * Nota de segurança: valores monetários não são logados (dado sensível).
 */
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveUserId } from "@/lib/resolveUserId"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    // Mesma query de app/perfil/repasses/page.tsx
    const account = await prisma.ownerPaymentAccount.findUnique({
      where:  { userId },
      select: { id: true, pixKey: true, pixKeyType: true, holderName: true, status: true },
    })

    const payouts = account
      ? await prisma.payout.findMany({
          where:   { ownerPaymentAccountId: account.id },
          orderBy: { createdAt: "desc" },
          take:    50,
          select: {
            id:            true,
            amount:        true,
            status:        true,
            eligibleAfter: true,
            processedAt:   true,
            failureReason: true,
            booking: {
              select: {
                id:        true,
                startDate: true,
                endDate:   true,
                item:      { select: { title: true } },
              },
            },
          },
        })
      : []

    return NextResponse.json({ data: { account, payouts } })
  } catch (e) {
    console.error("[GET /api/user/payouts]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
