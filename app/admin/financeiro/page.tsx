import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { hasAdminRole } from "@/lib/auth/admin-guards"
import { requireAdminPage } from "@/lib/auth/require-admin"
import { PayoutActions } from "./_PayoutActions"
import { FeeRateForm } from "./_FeeRateForm"
import { PricingMultipliersForm } from "./_PricingMultipliersForm"
import { getPlatformFeeRate, getPricingMultipliers } from "@/lib/platform-config"
import { formatPrice, formatDateShort, formatDateTime } from "@/utils/format"
import { StatCard } from "@/components/ui/StatCard"

export const metadata: Metadata = { title: "Admin — Financeiro" }

export default async function AdminFinanceiroPage() {
  const session = await requireAdminPage("ADMIN_SUPERADMIN", "ADMIN_FINANCEIRO")

  const isSuperAdmin = hasAdminRole(session, "ADMIN_SUPERADMIN")

  const [
    currentFeeRate,
    pricingMultipliers,
    gmvResult,
    feeResult,
    payoutStats,
    pendingPayouts,
    processingPayouts,
    pixAccountStats,
    disputedBookings,
  ] = await Promise.all([

    getPlatformFeeRate(),
    getPricingMultipliers(),
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
        <StatCard
          label="GMV"
          value={formatPrice(gmv)}
          sub="volume total de aluguéis"
          accent="primary"
        />
        <StatCard
          label="Receita ShareO"
          value={formatPrice(shareoFee)}
          sub={`taxa de ${currentFeeRate / 100}% sobre GMV`}
          accent="success"
        />
        <StatCard
          label="Repasse líquido"
          value={formatPrice(ownerNet)}
          sub="o que os proprietários recebem"
          accent="primary"
        />
        <StatCard
          label="Repasses pagos"
          value={formatPrice(completedPayouts)}
          sub={`${payoutByStatus["COMPLETED"]?.count ?? 0} transferências`}
          accent="success"
        />
        <StatCard
          label="Pendentes agora"
          value={pendingPayouts}
          sub="repasses elegíveis hoje"
          accent={pendingPayouts > 0 ? "warning" : "primary"}
        />
        <StatCard
          label="Contas PIX"
          value={pixByStatus["VERIFIED"] ?? 0}
          sub={`${pixByStatus["PENDING_VERIFICATION"] ?? 0} aguardando verificação`}
          accent="primary"
        />
        <StatCard
          label="Disputas abertas"
          value={disputeCount}
          sub="chargebacks Stripe ativos"
          accent={disputeCount > 0 ? "danger" : "primary"}
        />
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
                    {p.ownerPaymentAccount.pixKey
                      ? `${p.ownerPaymentAccount.holderName} · ${p.ownerPaymentAccount.pixKeyType}: ${p.ownerPaymentAccount.pixKey}`
                      : "Repasse via Mercado Pago"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Elegível desde {formatDateShort(p.eligibleAfter)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-success">{formatPrice(p.amount)}</p>
                  <Link
                    href={`/admin/reservas/${p.booking.id}`}
                    className="text-xs text-brand hover:underline"
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
                    Atualizado em {formatDateTime(b.updatedAt)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-destructive">{formatPrice(b.totalPrice)}</p>
                  <Link
                    href={`/admin/reservas/${b.id}`}
                    className="text-xs text-brand hover:underline"
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

      {/* ── Configurações (SUPERADMIN only) ── */}
      {isSuperAdmin && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-6">
          <h2 className="text-sm font-semibold text-foreground">Configurações da plataforma</h2>
          <div>
            <p className="mb-2 text-xs text-muted-foreground font-medium">Taxa da plataforma</p>
            <FeeRateForm currentRate={currentFeeRate} />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground font-medium">Multiplicadores de precificação sugerida</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Usados no botão &quot;Calcular&quot; do formulário de anúncio (semanal = N× diária, mensal = N× diária).
              Recomendado: semanal 3×, mensal 15×.
            </p>
            <PricingMultipliersForm
              weeklyMultiplier={pricingMultipliers.weeklyMultiplier}
              monthlyMultiplier={pricingMultipliers.monthlyMultiplier}
            />
          </div>
        </div>
      )}

      {/* ── PSP definitivo: Stripe Connect (ADR-028) ── */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">🔧 PSP definitivo: Stripe Connect</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Decisão ADR-028 (19/08/2026): Stripe Connect é o PSP definitivo, com split automático 85% proprietário / 15% ShareO — construção ainda não iniciada (só decisão + schema até aqui). Mercado Pago (ADR-026) segue dormente, código preservado.
            </p>
          </div>
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Decidido, construção não iniciada
          </span>
        </div>
      </div>
    </div>
  )
}
