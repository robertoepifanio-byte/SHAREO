import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { requireAdminPage } from "@/lib/auth/require-admin"
import { PayoutActions } from "../_PayoutActions"
import { formatPrice, formatDateTime } from "@/utils/format"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { PAYOUT_STATUS_LABEL as STATUS_LABEL, PAYOUT_STATUS_VARIANT as STATUS_VARIANT } from "@/lib/payout-status"
import { parsePayoutFilters, PAYOUT_STATUS_OPTIONS as STATUS_OPTIONS } from "@/lib/payout-filters"

export const metadata: Metadata = { title: "Admin — Repasses" }

// Repasses aqui não têm o ID do Transfer da Stripe — só amount/status/eligibleAfter/
// processedAt (ver lib/payout.ts). Conferir se o dinheiro chegou de verdade exige o
// Dashboard da Stripe: use sourcePaymentIntentId (ou o stripeSessionId da reserva,
// quando sourcePaymentIntentId é null = cobrança original) pra achar o Transfer lá.

type Props = {
  searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string }>
}

export default async function AdminRepassesPage({ searchParams }: Props) {
  await requireAdminPage("ADMIN_SUPERADMIN", "ADMIN_FINANCEIRO")

  const rawParams = await searchParams
  const { q, status, from, to, where } = parsePayoutFilters(rawParams)

  // take:200 corta silenciosamente o resto — essencial pra reconciliação com a
  // Stripe (o objetivo desta tela) poder restringir por período em vez de só
  // torcer pra reserva/repasse que se procura estar entre os 200 mais recentes.
  const payouts = await prisma.payout.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take:    200,
    select: {
      id:                    true,
      amount:                true,
      status:                true,
      sourcePaymentIntentId: true,
      eligibleAfter:         true,
      processedAt:           true,
      failureReason:         true,
      createdAt:             true,
      booking: {
        select: {
          id:              true,
          stripeSessionId: true,
          item:            { select: { title: true } },
        },
      },
      ownerPaymentAccount: {
        select: { user: { select: { name: true, email: true } } },
      },
    },
  })

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-primary">
          Repasses
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({payouts.length}{payouts.length === 200 ? "+" : ""}{q || status || from || to ? " encontrados" : " total"})
          </span>
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/api/admin/export/repasses?${new URLSearchParams({
              ...(q ? { q } : {}),
              ...(status ? { status } : {}),
              ...(from ? { from } : {}),
              ...(to ? { to } : {}),
            }).toString()}`}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
          >
            ↓ Exportar CSV
          </Link>
          <Link
            href="/admin/financeiro"
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
          >
            ← Financeiro
          </Link>
        </div>
      </div>

      <form method="GET" className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por item, proprietário ou ID exato da reserva…"
          aria-label="Buscar repasse"
          className="min-h-11 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          aria-label="Filtrar por status"
          className="min-h-11 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          De
          <input
            type="date"
            name="from"
            defaultValue={from}
            aria-label="Criado a partir de"
            className="min-h-11 rounded-lg border border-border bg-surface px-2 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Até
          <input
            type="date"
            name="to"
            defaultValue={to}
            aria-label="Criado até"
            className="min-h-11 rounded-lg border border-border bg-surface px-2 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          Buscar
        </button>
        {(q || status || from || to) && (
          <Link
            href="/admin/financeiro/repasses"
            className="min-h-11 flex items-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
          >
            Limpar
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Item / Proprietário</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Valor</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Status</th>
              <th className="hidden px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground lg:table-cell">Elegível / Processado</th>
              <th className="hidden px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground xl:table-cell">Cobrança (Stripe)</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum repasse encontrado{q ? ` para "${q}"` : ""}.
                </td>
              </tr>
            )}
            {payouts.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 align-top">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground truncate max-w-[220px]">{p.booking.item.title}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                    {p.ownerPaymentAccount.user.name} · {p.ownerPaymentAccount.user.email}
                  </p>
                  <Link href={`/admin/reservas/${p.booking.id}`} className="text-xs text-brand hover:underline">
                    Ver reserva →
                  </Link>
                </td>
                <td className="px-3 py-3 text-right font-semibold text-foreground whitespace-nowrap">
                  {formatPrice(p.amount)}
                </td>
                <td className="px-3 py-3">
                  <StatusBadge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</StatusBadge>
                  {p.failureReason && (
                    <p className="mt-1 max-w-[180px] text-xs text-destructive">{p.failureReason}</p>
                  )}
                </td>
                <td className="hidden px-3 py-3 text-xs text-muted-foreground lg:table-cell whitespace-nowrap">
                  <p>Elegível: {formatDateTime(p.eligibleAfter)}</p>
                  {p.processedAt && <p>Processado: {formatDateTime(p.processedAt)}</p>}
                </td>
                <td className="hidden px-3 py-3 text-xs font-mono text-muted-foreground xl:table-cell">
                  {p.sourcePaymentIntentId ?? p.booking.stripeSessionId ?? "—"}
                </td>
                <td className="px-3 py-3">
                  {p.status === "PROCESSING" ? (
                    <PayoutActions payoutId={p.id} />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Nenhum repasse guarda o ID do Transfer da Stripe — para confirmar que o dinheiro
        chegou de verdade, use a coluna &quot;Cobrança (Stripe)&quot; para localizar a
        sessão/PaymentIntent no Dashboard (Connect → Transfers) e cruzar pelo valor e
        horário processado.
      </p>
    </div>
  )
}
