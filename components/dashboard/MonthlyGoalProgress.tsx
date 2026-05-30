/**
 * P2-60 — Meta mensal com progress bar.
 * Server Component puro: recebe os dados já calculados pelo DashboardPage.
 */

interface Props {
  /** Receita do mês atual em centavos */
  earnedCents: number
  /** Meta mensal em centavos (padrão: R$ 500,00) */
  goalCents?:  number
}

const DEFAULT_GOAL_CENTS = 50_000 // R$ 500,00

function fmtCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
}

export function MonthlyGoalProgress({ earnedCents, goalCents = DEFAULT_GOAL_CENTS }: Props) {
  const pct       = Math.min(Math.round((earnedCents / goalCents) * 100), 100)
  const reached   = earnedCents >= goalCents

  return (
    <div
      className={[
        "rounded-lg border p-5",
        reached
          ? "border-success/30 bg-success/5"
          : "border-border bg-surface",
      ].join(" ")}
      aria-label={`Meta mensal: ${fmtCurrency(earnedCents)} de ${fmtCurrency(goalCents)} (${pct}%)`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Meta mensal
        </p>
        {reached && (
          <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-bold text-success">
            Meta atingida!
          </span>
        )}
      </div>

      <div className="mb-2 flex items-baseline gap-1.5">
        <span className={`text-2xl font-bold ${reached ? "text-success" : "text-brand"}`}>
          {fmtCurrency(earnedCents)}
        </span>
        <span className="text-sm text-muted-foreground">/ {fmtCurrency(goalCents)}</span>
      </div>

      {/* Barra de progresso */}
      <div
        className="relative h-3 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct}% da meta atingida`}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            reached ? "bg-success" : "bg-brand"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-1.5 text-right text-xs font-semibold text-muted-foreground">
        {pct}%
        {reached && <span className="ml-1">🎉</span>}
      </p>
    </div>
  )
}
