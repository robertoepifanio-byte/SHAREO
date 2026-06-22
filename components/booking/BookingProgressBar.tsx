/**
 * BookingProgressBar — barra de progresso visual para o fluxo de reserva.
 * Server Component: recebe o status atual como prop e não usa estado.
 *
 * Responsividade: em telas pequenas (mobile) os rótulos por etapa são ocultados
 * e exibimos apenas a nomenclatura da etapa vigente, centralizada abaixo da
 * timeline — evita a sobreposição de textos. A partir de `sm` (desktop/tablet)
 * todos os rótulos aparecem sob cada indicador.
 */

type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "ACTIVE"
  | "RETURNED"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED"

interface Step {
  id:    number
  label: string
}

const STEPS: Step[] = [
  { id: 1, label: "Solicitação" },
  { id: 2, label: "Confirmação" },
  { id: 3, label: "Pagamento" },
  { id: 4, label: "Em uso" },
  { id: 5, label: "Devolução" },
  { id: 6, label: "Concluída" },
]

/** Retorna qual etapa está "ativa" dado o status do booking */
function statusToStep(status: BookingStatus, isPaid: boolean): number {
  switch (status) {
    case "PENDING":   return 1
    case "CONFIRMED": return isPaid ? 3 : 2
    case "ACTIVE":    return 4
    case "RETURNED":  return 5 // Devolução em andamento — aguardando confirmação do locador
    case "COMPLETED": return 6
    default:          return 1
  }
}

interface Props {
  status:        BookingStatus
  paymentStatus: string
}

export function BookingProgressBar({ status, paymentStatus }: Props) {
  if (status === "CANCELLED" || status === "DISPUTED") return null

  const isPaid       = paymentStatus === "PAID"
  const currentStep  = statusToStep(status, isPaid)
  const currentLabel = STEPS[currentStep - 1]?.label
  const fillWidth    = `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-4" aria-label="Progresso da reserva">
      {/* Label da etapa atual */}
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Etapa {currentStep} de {STEPS.length} — <span className="text-brand">{currentLabel}</span>
      </p>

      {/* Linha de progresso */}
      <div className="relative">
        {/* Track */}
        <div className="absolute top-3.5 left-[14px] right-[14px] h-0.5 bg-border" aria-hidden="true" />
        {/* Fill */}
        <div
          className="absolute top-3.5 left-[14px] h-0.5 bg-brand transition-all duration-500"
          style={{ width: fillWidth }}
          aria-hidden="true"
        />

        {/* Dots + labels */}
        <ol className="relative flex items-start justify-between">
          {STEPS.map((step) => {
            const done    = step.id < currentStep
            const current = step.id === currentStep

            return (
              <li key={step.id} className="flex flex-col items-center">
                {/* Dot */}
                <div
                  className={[
                    "relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all",
                    done
                      ? "bg-brand text-white shadow-sm"
                      : current
                      ? "bg-brand text-white shadow-md ring-4 ring-brand/20"
                      : "bg-surface border-2 border-border text-muted-foreground",
                  ].join(" ")}
                  aria-current={current ? "step" : undefined}
                >
                  {done ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>

                {/* Label por etapa — apenas no desktop (sm+); no mobile usamos o rótulo único abaixo */}
                <span
                  className={[
                    "mt-2 hidden text-center text-xs leading-tight sm:block sm:w-16",
                    done || current ? "font-semibold text-foreground" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Rótulo da etapa vigente — apenas no mobile, centralizado abaixo da timeline (sem sobreposição) */}
      <p className="mt-3 text-center text-sm font-semibold text-foreground sm:hidden">
        {currentLabel}
      </p>
    </div>
  )
}
