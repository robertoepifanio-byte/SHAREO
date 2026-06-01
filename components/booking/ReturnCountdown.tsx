"use client"

/**
 * P2-47 — Countdown de devolução da reserva ativa
 * Exibe tempo restante até endDate com granularidade de minutos (atualiza a cada 60s).
 * Quando expirado, exibe mensagem de urgência.
 */

import { useState, useEffect } from "react"

interface Props {
  /** ISO string da data de devolução (booking.endDate) */
  endDateIso: string
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  expired: boolean
}

function calcTimeLeft(endDateIso: string): TimeLeft {
  const diff = new Date(endDateIso).getTime() - Date.now()
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, expired: true }
  }
  const totalMinutes = Math.floor(diff / 60_000)
  const days         = Math.floor(totalMinutes / (60 * 24))
  const hours        = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes      = totalMinutes % 60
  return { days, hours, minutes, expired: false }
}

function buildAriaLabel({ days, hours, minutes, expired }: TimeLeft): string {
  if (expired) return "Prazo de devolução encerrado"
  const parts: string[] = []
  if (days > 0)     parts.push(`${days} dia${days !== 1 ? "s" : ""}`)
  if (hours > 0)    parts.push(`${hours}h`)
  if (minutes >= 0) parts.push(`${minutes}min`)
  return `Devolução em ${parts.join(", ")}`
}

export function ReturnCountdown({ endDateIso }: Props) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calcTimeLeft(endDateIso))

  useEffect(() => {
    // Atualiza imediatamente (hidrata SSR com valor preciso) e a cada 60s
    setTimeLeft(calcTimeLeft(endDateIso))
    const id = setInterval(() => {
      setTimeLeft(calcTimeLeft(endDateIso))
    }, 60_000)
    return () => clearInterval(id)
  }, [endDateIso])

  const label = buildAriaLabel(timeLeft)

  if (timeLeft.expired) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label={label}
        className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-4"
      >
        <span className="mt-0.5 text-xl leading-none" aria-hidden="true">⏰</span>
        <div>
          <p className="text-sm font-bold text-destructive">
            Prazo de devolução encerrado
          </p>
          <p className="mt-0.5 text-xs text-destructive/80">
            Devolva o item agora para evitar taxas de atraso adicionais.
          </p>
        </div>
      </div>
    )
  }

  const { days, hours, minutes } = timeLeft
  const isUrgent = days === 0 && hours < 4

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={label}
      className={[
        "flex items-start gap-3 rounded-xl border px-4 py-4",
        isUrgent
          ? "border-orange/40 bg-orange-light"
          : "border-brand/30 bg-brand/5",
      ].join(" ")}
    >
      <span className="mt-0.5 text-xl leading-none" aria-hidden="true">
        {isUrgent ? "⚠️" : "📅"}
      </span>
      <div>
        <p className={[
          "text-sm font-semibold",
          isUrgent ? "text-orange-link" : "text-primary",
        ].join(" ")}>
          {isUrgent ? "Devolução urgente" : "Devolução em"}
        </p>
        <p className={[
          "mt-0.5 text-sm font-bold",
          isUrgent ? "text-orange-link" : "text-brand",
        ].join(" ")}>
          {days > 0 && <span>{days} dia{days !== 1 ? "s" : ""}, </span>}
          {hours}h e {minutes}min
        </p>
      </div>
    </div>
  )
}
