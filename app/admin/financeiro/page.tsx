import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasAdminRole } from "@/lib/auth/admin-guards"
import { PayoutActions } from "./_PayoutActions"

export const metadata: Metadata = { title: "Admin — Financeiro" }

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

export default async function AdminFinanceiroPage() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard")
  if (!hasAdminRole(session, "ADMIN_SUPERADMIN", "ADMIN_FINANCEIRO")) {
    redirect("/admin")
  }

  const [
    gmvResult,
    feeResult,
    payoutStats,
    pendingPayouts,
    processingPayouts,
    pixAccountStats,
    disputedBookings,
  ] = await Promise.all([
    // GMV — volume total de aluguéis concluídos
    prisma.booking.aggregate({
      where: { status: "COMPLETED" },
      _sum:  { totalPrice: true },
    }),
    // Receita ShareO — soma das taxas cobradas
    prisma.booking.aggregate({
      where: { status: "COMPLETED", platformFeeAmount: { not: null } },
      _sum:  { platformFeeAmount: true, ownerNetAmount: true },
    }),
    // Contagem de repasses por status
    prisma.payout.groupBy({
      by:    ["status"],
      _count: { _all: true },
      _sum:   { amount: true },
    }),
    // Repasses PENDING elegíveis agora
    prisma.payout.count({
      where: { status: "PENDING", eligibleAfter: { lte: new Date() } },
    }),
    // Repasses aguardando execução manual
    prisma.payout.findMany({
      where:   { status: "PROCESSING" },
      take:    20,
      orderBy: { eligibleAfter: "asc" },
      select: {
        id:           true,
        amount:       true,
        eligibleAfter: true,
        booking: { select: { id: true, item: { select: { title: true } } } },
        ownerPaymentAccount: { select: { pixKey: true, pixKeyType: true, holderName: true } },
      },
    }),
    // Contas PIX por status
    prisma.ownerPaymentAccount.groupBy({
      by:    ["status"],
      _count: { _all: true },
    }),
    // Reservas com disputa aberta no Stripe
    prisma.booking.findMany({
      where:   { status: "DISPUTED" },
      take:    20,
      orderBy: { updatedAt: "desc" },
      select: {
        id:             true,
        stripeDisputeId: true,
        totalPrice:     true,
        updatedAt:      true,
        item:           { select: { title: true } },
        owner:          { select: { name: true } },
        borrower:       { select: { name: true } },
      },
    }),
  ])

  const payoutByStatus = Object.fromEntries(
    payoutStats.map((r) => [r.status, { count: r._count._all, amount: r._sum.amount ?? 0 }])
  )
  const pixByStatus = Object.fromEntries(
    pixAccountStats.map((r) => [r.status, r._count._all])
  )

  const gmv         = gmvResult._sum.totalPrice ?? 0
  const shareoFee   = feeResult._sum.platformFeeAmount ?? 0
  const ownerNet    = feeResult._sum.ownerNetAmount ?? 0
  const completedPayouts = payoutByStatus["COMPLETED"]?.amount ?? 0
  const disputeCount = disputedBookings.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">Financeiro</h1>
        <Link
          href="/admin/financeiro/exportar"
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          ↓ Exportar CSV
        </Link>
      </div>

      {/* ── Métricas principais ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "GMV",              value: fmt(gmv),       sub: "volume total de aluguéis",        color: "text-primary" },
          { label: "Receita ShareO",   value: fmt(shareoFee), sub: "taxa de 15% sobre GMV",           color: "text-success" },
          { label: "Repasse líquido",  value: fmt(ownerNet),  sub: "o que os proprietários recebem",  color: "text-primary" },
          { label: "Repasses pagos",   value: fmt(completedPayouts), sub: `${payoutByStatus["COMPLETED"]?.count ?? 0} transferências`, color: "text-success" },
          { label: "Pendentes agora",  value: pendingPayouts, sub: "repasses elegíveis hoje",         color: pendingPayouts > 0 ? "text-[#9A4700]" : "text-primary" },
          { label: "Contas PIX",       value: pixByStatus["VERIFIED"] ?? 0, sub: `${pixByStatus["PENDING_VERIFICATION"] ?? 0} aguardando verificação`, color: "text-primary" },
          { label: "Disputas abertas", value: disputeCount, sub: "chargebacks Stripe ativos", color: disputeCount > 0 ? "text-destructive" : "text-primary" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">{s.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Contas PIX aguardando verificação ── */}
      {(pixByStatus["PENDING_VERIFICATION"] ?? 0) > 0 && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm font-semibold text-yellow-800">
            ⏳ {pixByStatus["PENDING_VERIFICATION"]} conta(s) PIX aguardando verificação manual
          </p>
          <Link href="/admin/financeiro/contas-pix" className="mt-1 text-sm text-yellow-700 underline hover:no-underline">
            Verificar contas →
          </Link>
        </div>
      )}

      {/* ── Repasses aguardando execução manual ── */}
      {processingPayouts.length > 0 && (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold text-foreground">
              Repasses aguardando execução manual
              <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                {processingPayouts.length}
              </span>
            </h2>
          </div>
          <div className="divide-y divide-border">
            {processingPayouts.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{p.booking.item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.ownerPaymentAccount.holderName} · {p.ownerPaymentAccount.pixKeyType}: {p.ownerPaymentAccount.pixKey}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Elegível desde {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(p.eligibleAfter))}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-success">{fmt(p.amount)}</p>
                  <Link
                    href={`/reservas/${p.booking.id}`}
                    className="text-xs text-brand hover:underline"
                    target="_blank"
                  >
                    Ver reserva →
                  </Link>
                  <PayoutActions payoutId={p.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Disputas abertas (chargebacks) ── */}
      {disputedBookings.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 overflow-hidden">
          <div className="flex items-center justify-between border-b border-destructive/20 px-5 py-4">
            <h2 className="font-semibold text-destructive">
              ⚠️ Disputas abertas (chargebacks)
              <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                {disputedBookings.length}
              </span>
            </h2>
          </div>
          <div className="divide-y divide-destructive/10">
            {disputedBookings.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{b.item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Proprietário: {b.owner.name} · Locatário: {b.borrower.name}
                  </p>
                  {b.stripeDisputeId && (
                    <p className="text-xs font-mono text-muted-foreground">{b.stripeDisputeId}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Atualizado em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(b.updatedAt))}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-destructive">{fmt(b.totalPrice)}</p>
                  <Link
                    href={`/reservas/${b.id}`}
                    className="text-xs text-brand hover:underline"
                    target="_blank"
                  >
                    Ver reserva →
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 bg-destructive/5 border-t border-destructive/20">
            <p className="text-xs text-destructive/80">
              Repasses bloqueados automaticamente enquanto a disputa estiver aberta. Acesse o Stripe Dashboard para responder.
            </p>
          </div>
        </div>
      )}

      {processingPayouts.length === 0 && pendingPayouts === 0 && (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          Nenhum repasse pendente no momento.
        </div>
      )}
    </div>
  )
}
