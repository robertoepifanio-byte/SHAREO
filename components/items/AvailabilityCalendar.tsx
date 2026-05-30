"use client"

/**
 * P1-22 — Calendário de disponibilidade
 * Exibe mês atual e próximo com dias coloridos:
 *   verde  = livre
 *   vermelho = ocupado
 *   cinza  = passado (não selecionável)
 */

import { useState, useEffect, useCallback } from "react"

interface Props {
  itemId: string
}

type OccupiedSet = Set<string> // "YYYY-MM-DD"

function toKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function buildMonths(baseDate: Date): Array<{ year: number; month: number }> {
  return [
    { year: baseDate.getFullYear(), month: baseDate.getMonth() },
    {
      year:  baseDate.getMonth() === 11 ? baseDate.getFullYear() + 1 : baseDate.getFullYear(),
      month: (baseDate.getMonth() + 1) % 12,
    },
  ]
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

function CalendarMonth({
  year,
  month,
  occupied,
  today,
}: {
  year:     number
  month:    number
  occupied: OccupiedSet
  today:    Date
}) {
  const firstDay     = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const todayKey     = toKey(today.getFullYear(), today.getMonth(), today.getDate())

  const cells: Array<{ day: number | null; key: string | null }> = []

  // leading empty cells
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null, key: null })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, key: toKey(year, month, d) })
  }

  return (
    <div>
      <p className="mb-3 text-center text-sm font-semibold text-foreground">
        {MONTH_NAMES[month]} {year}
      </p>

      {/* Day-of-week headers */}
      <div className="mb-1 grid grid-cols-7 gap-px" role="row">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground" aria-label={d}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px" role="grid" aria-label={`${MONTH_NAMES[month]} ${year}`}>
        {cells.map((cell, idx) => {
          if (!cell.day || !cell.key) {
            return <div key={`e-${idx}`} aria-hidden="true" />
          }

          const isPast    = cell.key < todayKey
          const isOccupied = occupied.has(cell.key)

          let bgClass = "bg-success/15 text-success hover:bg-success/25"
          let label   = `${cell.day} de ${MONTH_NAMES[month]}: disponível`

          if (isPast) {
            bgClass = "bg-muted text-muted-foreground cursor-not-allowed"
            label   = `${cell.day} de ${MONTH_NAMES[month]}: passado`
          } else if (isOccupied) {
            bgClass = "bg-destructive/15 text-destructive"
            label   = `${cell.day} de ${MONTH_NAMES[month]}: ocupado`
          }

          const isToday = cell.key === todayKey

          return (
            <div
              key={cell.key}
              role="gridcell"
              aria-label={label}
              aria-disabled={isPast || isOccupied}
              className={[
                "flex h-8 w-full items-center justify-center rounded text-xs font-medium transition-colors",
                bgClass,
                isToday ? "ring-1 ring-brand ring-offset-1" : "",
              ].join(" ")}
            >
              {cell.day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AvailabilityCalendar({ itemId }: Props) {
  const [occupied, setOccupied] = useState<OccupiedSet>(new Set())
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)

  const today  = new Date()
  const months = buildMonths(today)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res  = await fetch(`/api/items/${itemId}/availability`, { cache: "no-store" })
      if (!res.ok) throw new Error("fetch failed")
      const json = await res.json() as { data: string[] }
      setOccupied(new Set(json.data))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [itemId])

  useEffect(() => { void load() }, [load])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2" aria-busy="true" aria-label="Carregando calendário">
        {[0, 1].map((i) => (
          <div key={i} className="animate-pulse space-y-2">
            <div className="mx-auto h-4 w-28 rounded bg-muted" />
            <div className="grid grid-cols-7 gap-px">
              {Array.from({ length: 35 }).map((_, j) => (
                <div key={j} className="h-8 rounded bg-muted" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        Não foi possível carregar o calendário.
        <button onClick={() => void load()} className="ml-1 underline hover:no-underline">
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-success/20 ring-1 ring-success/40" aria-hidden="true" />
          Disponível
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-destructive/20 ring-1 ring-destructive/40" aria-hidden="true" />
          Ocupado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-muted ring-1 ring-border" aria-hidden="true" />
          Passado
        </span>
      </div>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {months.map((m) => (
          <CalendarMonth
            key={`${m.year}-${m.month}`}
            year={m.year}
            month={m.month}
            occupied={occupied}
            today={today}
          />
        ))}
      </div>
    </div>
  )
}
