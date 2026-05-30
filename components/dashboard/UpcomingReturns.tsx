"use client"

import Link from "next/link"
import { useState } from "react"

interface BookingRow {
  id:       string
  endDate:  Date | string
  item:     { title: string }
  borrower: { name: string }
}

interface Props {
  bookings: BookingRow[]
}

function countdownLabel(endDate: Date | string): string {
  const now    = new Date()
  const end    = new Date(endDate)
  // Zeramos as horas para comparar apenas dias
  const msLeft = end.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)
  const days   = Math.ceil(msLeft / 86_400_000)

  if (days < 0)  return `Atrasado ${Math.abs(days)} dia${Math.abs(days) !== 1 ? "s" : ""}`
  if (days === 0) return "Devolução hoje"
  if (days === 1) return "Devolução amanhã"
  return `Devolução em ${days} dias`
}

function countdownColor(endDate: Date | string): string {
  const now  = new Date()
  const end  = new Date(endDate)
  const days = Math.ceil((end.setHours(0,0,0,0) - now.setHours(0,0,0,0)) / 86_400_000)
  if (days < 0)  return "text-destructive"
  if (days <= 1) return "text-amber-600"
  return "text-muted-foreground"
}

/**
 * P2-58 + P2-59 — Próximas devoluções + botão "Enviar lembrete".
 * Client Component para suportar o feedback visual do botão de lembrete.
 */
export function UpcomingReturns({ bookings }: Props) {
  // Rastreia quais reservas já receberam lembrete nesta sessão
  const [reminded, setReminded] = useState<Set<string>>(new Set())
  const [sending,  setSending]  = useState<string | null>(null)
  const [errors,   setErrors]   = useState<Record<string, string>>({})

  async function sendReminder(bookingId: string) {
    setSending(bookingId)
    setErrors((prev) => { const n = { ...prev }; delete n[bookingId]; return n })
    try {
      const res  = await fetch(`/api/bookings/${bookingId}/reminder`, { method: "POST" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrors((prev) => ({
          ...prev,
          [bookingId]: json?.error?.message ?? "Erro ao enviar lembrete.",
        }))
      } else {
        setReminded((prev) => new Set([...prev, bookingId]))
      }
    } catch {
      setErrors((prev) => ({ ...prev, [bookingId]: "Erro de rede. Tente novamente." }))
    } finally {
      setSending(null)
    }
  }

  return (
    <section aria-label="Próximas devoluções">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-primary">Próximas devoluções</h2>
        <Link href="/reservas" className="text-sm font-semibold text-brand hover:underline">
          Ver todas →
        </Link>
      </div>

      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
        {bookings.map((b) => {
          const isReminded  = reminded.has(b.id)
          const isSending   = sending === b.id
          const errorMsg    = errors[b.id]
          const firstName   = b.borrower.name.split(" ")[0]

          return (
            <div key={b.id} className="flex items-center gap-3 px-4 py-3">
              {/* Ícone de calendário */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{b.item.title}</p>
                <p className="text-xs text-muted-foreground">Locatário: {firstName}</p>
                <p className={`text-xs font-semibold ${countdownColor(b.endDate)}`}>
                  {countdownLabel(b.endDate)}
                </p>
                {errorMsg && (
                  <p className="mt-0.5 text-xs text-destructive" role="alert">{errorMsg}</p>
                )}
              </div>

              {/* Botão lembrete (P2-59) */}
              <button
                type="button"
                onClick={() => sendReminder(b.id)}
                disabled={isReminded || isSending}
                aria-label={isReminded ? "Lembrete enviado" : `Enviar lembrete para ${firstName}`}
                className={[
                  "flex-shrink-0 min-w-[44px] min-h-[44px] rounded-md px-3 py-2 text-xs font-semibold transition-all",
                  "outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
                  isReminded
                    ? "bg-success/10 text-success cursor-default"
                    : isSending
                    ? "bg-muted text-muted-foreground cursor-wait"
                    : "bg-brand/10 text-brand hover:bg-brand/20",
                ].join(" ")}
              >
                {isSending ? (
                  <svg className="mx-auto h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : isReminded ? (
                  "Enviado ✓"
                ) : (
                  "Lembrar"
                )}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
