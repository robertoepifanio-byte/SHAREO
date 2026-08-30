import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { requireAdminPage } from "@/lib/auth/require-admin"
import { PayoutActions } from "../_PayoutActions"
import { formatPrice, formatDateTime } from "@/utils/format"
import { StatusBadge } from "@/components/ui/StatusBadge"
import type { PayoutStatus } from "@prisma/client"

export const metadata: Metadata = { title: "Admin — Repasses" }

const STATUS_OPTIONS: PayoutStatus[] = ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "BLOCKED"]

const STATUS_LABEL: Record<PayoutStatus, string> = {
  PENDING:    "Pendente",
  PROCESSING: "Processando",
  COMPLETED:  "Concluído",
  FAILED:     "Falhou",
  BLOCKED:    "Bloqueado",
}

const STATUS_VARIANT: Record<PayoutStatus, "warning" | "info" | "success" | "danger"> = {
  PENDING:    "warning",
  PROCESSING: "info",
  COMPLETED:  "success",
  FAILED:     "danger",
  BLOCKED:    "danger",
}

// Repasses aqui não têm o ID do Transfer da Stripe — só amount/status/eligibleAfter/
// processedAt (ver lib/payout.ts). Conferir se o dinheiro chegou de verdade exige o
// Dashboard da Stripe: use sourcePaymentIntentId (ou o stripeSessionId da reserva,
// quando sourcePaymentIntentId é null = cobrança original) pra achar o Transfer lá.

type Props = {
  searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string }>
}

export default async function AdminRepassesPage({ searchParams }: Props) {
  await requireAdminPage("ADMIN_SUPERADMIN", "ADMIN_FINANCEIRO")

  const params = await searchParams
  const q      = params.q?.trim() ?? ""
  const status = STATUS_OPTIONS.includes(params.status as PayoutStatus) ? (params.status as PayoutStatus) : undefined
  // Data pura (YYYY-MM-DD) do <input type="date"> — sem componente de hora, então
  // "from" e "to" já cobrem o dia inteiro sem precisar de +1 dia no "to" (lt do dia
  // seguinte seria necessário só se comparássemos contra hora; aqui basta lte no fim
  // do dia informado).
  const from = params.from ? new Date(`${params.from}T00:00:00`) : undefined
  const to   = params.to   ? new Date(`${params.to}T23:59:59.999`) : undefined

  // take:200 corta silenciosamente o resto — essencial pra reconciliação com a
  // Stripe (o objetivo desta tela) poder restringir por período em vez de só
  // torcer pra reserva/repasse que se procura estar entre os 200 mais recentes.
  const payouts = await prisma.payout.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      ...(q
        ? {
            OR: [
              { booking: { item: { title: { contains: q, mode: "insensitive" } } } },
              { ownerPaymentAccount: { user: { name:  { contains: q, mode: "insensitive" } } } },
              { ownerPaymentAccount: { user: { email: { contains: q, mode: "insensitive" } } } },
              // Só casa com o ID EXATO da reserva (é um cuid, não dá pra busca parcial) —
              // útil quando se cola o ID vindo da URL de /admin/reservas/[id].
              { bookingId: { equals: q } },
            ],
          }
        : {}),
    },
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
        <Link
          href="/admin/financeiro"
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
        >
          ← Financeiro
        </Link>
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
            defaultValue={params.from ?? ""}
            aria-label="Criado a partir de"
            className="min-h-11 rounded-lg border border-border bg-surface px-2 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Até
          <input
            type="date"
            name="to"
            defaultValue={params.to ?? ""}
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
        {(q || status || params.from || params.to) && (
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
