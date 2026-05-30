"use client"

/**
 * P1-34 — Countdown Timer
 * Mostra tempo restante até o deadline em formato HH:MM:SS.
 * Exibe mensagem de expirado quando atingir zero.
 */

import { useState, useEffect } from "react"

interface Props {
  /** ISO string da data/hora limite */
  deadlineIso: string
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00:00"
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":")
}

export function CountdownTimer({ deadlineIso }: Props) {
  const deadline = new Date(deadlineIso).getTime()

  const [remaining, setRemaining] = useState<number>(() => deadline - Date.now())

  useEffect(() => {
    const tick = () => setRemaining(deadline - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadline])

  const isExpired = remaining <= 0

  return (
    <div className="flex flex-col items-center gap-1" aria-live="polite" aria-atomic="true">
      <p
        className={[
          "font-mono text-4xl font-extrabold tabular-nums tracking-widest",
          isExpired ? "text-destructive" : "text-yellow-800",
        ].join(" ")}
        aria-label={isExpired ? "Prazo expirado" : `Tempo restante: ${formatRemaining(remaining)}`}
      >
        {formatRemaining(remaining)}
      </p>
      {isExpired && (
        <p className="text-xs font-medium text-destructive">
          Prazo expirado — aguardando processamento automático.
        </p>
      )}
    </div>
  )
}
