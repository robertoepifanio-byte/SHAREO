import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getPlatformFeeRate } from "@/lib/platform-config"
import { formatPrice } from "@/utils/format"
import { StatCard } from "@/components/ui/StatCard"

export const metadata: Metadata = { title: "Admin — Visão Geral" }

export default async function AdminOverviewPage() {
  const [
    currentFeeRate,
    totalUsers,
    totalItems,
    pendingItems,
    inactiveUsers,
    bookingStats,
    disputes,
    gmvResult,
    feeResult,
  ] = await Promise.all([
    getPlatformFeeRate(),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.item.count({ where: { status: "AVAILABLE", isApproved: true, deletedAt: null } }),
    prisma.item.count({ where: { isApproved: false, deletedAt: null } }),
    prisma.user.count({ where: { isActive: false, deletedAt: null } }),
    prisma.booking.groupBy({
      by:    ["status"],
      _count: { _all: true },
    }),
    prisma.booking.count({ where: { status: "DISPUTED" } }),
    prisma.booking.aggregate({
      where: { status: "COMPLETED" },
      _sum:  { totalPrice: true },
    }),
    prisma.booking.aggregate({
      where: { status: "COMPLETED", platformFeeAmount: { not: null } },
      _sum:  { platformFeeAmount: true },
    }),
  ])

  const byStatus = Object.fromEntries(
    bookingStats.map((r) => [r.status, r._count._all])
  )

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-primary">Visão Geral</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Usuários"
          value={totalUsers}
          sub={`${inactiveUsers} desativados`}
          accent="primary"
        />
        <StatCard
          label="Itens ativos"
          value={totalItems}
          sub={`${pendingItems} aguardando aprovação`}
          accent={pendingItems > 0 ? "warning" : "primary"}
        />
        <StatCard
          label="Reservas ativas"
          value={byStatus["ACTIVE"] ?? 0}
          sub={`${byStatus["PENDING"] ?? 0} pendentes`}
          accent="primary"
        />
        <StatCard
          label="Disputas abertas"
          value={disputes}
          sub="bookings em disputa"
          accent={disputes > 0 ? "warning" : "primary"}
        />
        <StatCard
          label="Concluídas"
          value={byStatus["COMPLETED"] ?? 0}
          sub="reservas concluídas"
          accent="success"
        />
        <StatCard
          label="GMV"
          value={formatPrice(gmvResult._sum.totalPrice ?? 0)}
          sub="volume total de aluguéis"
          accent="success"
        />
        <StatCard
          label="Receita ShareO"
          value={formatPrice(feeResult._sum.platformFeeAmount ?? 0)}
          sub={`taxa ${currentFeeRate / 100}% sobre locações`}
          accent="success"
        />
      </div>

      {pendingItems > 0 && (
        <div className="mt-6 rounded-xl border border-orange/20 bg-orange-light p-4">
          <p className="text-sm font-semibold text-orange-link">
            ⚠ {pendingItems} {pendingItems === 1 ? "item aguarda" : "itens aguardam"} aprovação
          </p>
          <a href="/admin/itens" className="mt-1 text-sm text-orange-link underline hover:no-underline">
            Revisar itens →
          </a>
        </div>
      )}

      {disputes > 0 && (
        <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4">
          <p className="text-sm font-semibold text-destructive">
            🔴 {disputes} {disputes === 1 ? "disputa aberta" : "disputas abertas"}
          </p>
          <Link href="/admin/disputas" className="mt-1 text-sm text-destructive underline hover:no-underline">
            Resolver disputas →
          </Link>
        </div>
      )}
    </div>
  )
}
