/**
 * GET /api/cron/monthly-report
 * Executado no 1º dia de cada mês às 09:00 BRT (12:00 UTC).
 * Consolida o mês anterior e notifica ADMIN_FINANCEIRO com resumo.
 */
import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertCronAuth } from "@/lib/auth/cron-guard"
import { formatPrice } from "@/utils/format"

export const runtime     = "nodejs"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const denied = assertCronAuth(req)
  if (denied) return denied

  // Calcula janela do mês anterior
  const now       = new Date()
  const firstDay  = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastDay   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  const monthLabel = firstDay.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

  const [gmv, fees, payouts, disputes, newAccounts] = await Promise.all([
    // GMV — volume total de aluguéis concluídos no mês
    prisma.booking.aggregate({
      where: { status: "COMPLETED", updatedAt: { gte: firstDay, lte: lastDay } },
      _sum:  { totalPrice: true },
      _count: { _all: true },
    }),
    // Receita da plataforma
    prisma.booking.aggregate({
      where: { status: "COMPLETED", updatedAt: { gte: firstDay, lte: lastDay }, platformFeeAmount: { not: null } },
      _sum:  { platformFeeAmount: true, ownerNetAmount: true },
    }),
    // Repasses realizados no mês
    prisma.payout.aggregate({
      where: { status: "COMPLETED", processedAt: { gte: firstDay, lte: lastDay } },
      _sum:  { amount: true },
      _count: { _all: true },
    }),
    // Disputas abertas no mês
    prisma.booking.count({
      where: { disputeStatus: "OPEN", disputeOpenedAt: { gte: firstDay, lte: lastDay } },
    }),
    // Novas contas PIX cadastradas
    prisma.ownerPaymentAccount.count({
      where: { createdAt: { gte: firstDay, lte: lastDay } },
    }),
  ])

  const report = {
    month:          monthLabel,
    gmvCents:       gmv._sum.totalPrice ?? 0,
    gmvCount:       gmv._count._all,
    feeCents:       fees._sum.platformFeeAmount ?? 0,
    ownerNetCents:  fees._sum.ownerNetAmount ?? 0,
    payoutsCents:   payouts._sum.amount ?? 0,
    payoutsCount:   payouts._count._all,
    disputes,
    newPixAccounts: newAccounts,
  }

  // Notifica todos os admins financeiros
  const admins = await prisma.user.findMany({
    where:  { role: "ADMIN", adminRole: { in: ["ADMIN_FINANCEIRO", "ADMIN_SUPERADMIN"] } },
    select: { id: true, name: true },
  })

  const summaryText = [
    `📊 Relatório financeiro — ${monthLabel}`,
    `GMV: ${formatPrice(report.gmvCents)} (${report.gmvCount} locações)`,
    `Receita ShareO: ${formatPrice(report.feeCents)}`,
    `Repasse líquido proprietários: ${formatPrice(report.ownerNetCents)}`,
    `Repasses realizados: ${formatPrice(report.payoutsCents)} (${report.payoutsCount})`,
    `Disputas abertas: ${report.disputes}`,
    `Novas contas PIX: ${report.newPixAccounts}`,
  ].join(" · ")

  await Promise.all(
    admins.map((admin) =>
      prisma.notification.create({
        data: {
          userId: admin.id,
          type:   "BOOKING_CONFIRMED" as never,
          title:  `📊 Relatório financeiro — ${monthLabel}`,
          body:   summaryText,
          data:   report as never,
        },
      }).catch(() => undefined)
    )
  )

  console.warn(`[cron/monthly-report] ${monthLabel} — GMV ${formatPrice(report.gmvCents)}, receita ${formatPrice(report.feeCents)}, ${admins.length} admin(s) notificado(s)`)

  return NextResponse.json({ ok: true, report })
}
