import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"

export const metadata: Metadata = { title: "Admin — Visão Geral" }

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

export default async function AdminOverviewPage() {
  const [
    totalUsers,
    totalItems,
    pendingItems,
    inactiveUsers,
    bookingStats,
    disputes,
    gmvResult,
    feeResult,
  ] = await Promise.all([
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

  const stats = [
    { label: "Usuários",         value: totalUsers,                     sub: `${inactiveUsers} desativados`,   color: "text-primary" },
    { label: "Itens ativos",     value: totalItems,                     sub: `${pendingItems} aguardando aprovação`, color: pendingItems > 0 ? "text-[#9A4700]" : "text-primary" },
    { label: "Reservas ativas",  value: byStatus["ACTIVE"]    ?? 0,     sub: `${byStatus["PENDING"] ?? 0} pendentes`, color: "text-primary" },
    { label: "Disputas abertas", value: disputes,                       sub: "bookings em disputa",            color: disputes > 0 ? "text-[#9A4700]" : "text-primary" },
    { label: "Concluídas",     value: byStatus["COMPLETED"] ?? 0,                    sub: "reservas concluídas",        color: "text-success" },
    { label: "GMV",            value: fmt(gmvResult._sum.totalPrice ?? 0),        sub: "volume total de aluguéis",   color: "text-success", isString: true },
    { label: "Receita ShareO", value: fmt(feeResult._sum.platformFeeAmount ?? 0), sub: "taxa 15% sobre locações",    color: "text-success", isString: true },
  ]

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-primary">Visão Geral</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">{s.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {pendingItems > 0 && (
        <div className="mt-6 rounded-xl border border-orange/20 bg-orange-light p-4">
          <p className="text-sm font-semibold text-[#9A4700]">
            ⚠ {pendingItems} {pendingItems === 1 ? "item aguarda" : "itens aguardam"} aprovação
          </p>
          <a href="/admin/itens" className="mt-1 text-sm text-[#9A4700] underline hover:no-underline">
            Revisar itens →
          </a>
        </div>
      )}

      {disputes > 0 && (
        <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4">
          <p className="text-sm font-semibold text-destructive">
            🔴 {disputes} {disputes === 1 ? "disputa aberta" : "disputas abertas"}
          </p>
          <a href="/admin/disputas" className="mt-1 text-sm text-destructive underline hover:no-underline">
            Resolver disputas →
          </a>
        </div>
      )}
    </div>
  )
}
