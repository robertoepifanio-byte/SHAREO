"use client"

/**
 * P1-27 — Formulário de extensão de prazo
 * Locatário solicita extensão (POST), proprietário aceita ou recusa (PATCH).
 */

import { useState, useCallback, type FormEvent } from "react"
import { useRouter } from "next/navigation"

interface Props {
  bookingId:   string
  currentEndDate: string // ISO string
  /** "borrower" vê formulário de solicitação; "owner" vê aceitar/recusar */
  role:        "borrower" | "owner"
  /** Data mínima de nova devolução (amanhã em relação ao endDate) */
  minNewEndDate?: string
}

function toDateInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function ExtendBookingForm({ bookingId, currentEndDate, role, minNewEndDate }: Props) {
  const router = useRouter()

  const minDate        = minNewEndDate ?? addDays(currentEndDate, 1)
  const [newEndDate, setNewEndDate] = useState(addDays(currentEndDate, 1))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [success, setSuccess]       = useState<string | null>(null)

  const handleBorrowerSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (newEndDate <= toDateInputValue(currentEndDate)) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/bookings/${bookingId}/extend`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ newEndDate }),
      })

      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } }
        throw new Error(json.error?.message ?? "Erro ao solicitar extensão.")
      }

      setSuccess("Solicitação de extensão enviada ao proprietário.")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.")
    } finally {
      setSubmitting(false)
    }
  }, [bookingId, currentEndDate, newEndDate, router])

  const handleOwnerAction = useCallback(async (action: "approve" | "reject") => {
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/bookings/${bookingId}/extend`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action }),
      })

      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } }
        throw new Error(json.error?.message ?? "Erro ao processar solicitação.")
      }

      setSuccess(action === "approve" ? "Extensão aprovada." : "Extensão recusada.")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.")
    } finally {
      setSubmitting(false)
    }
  }, [bookingId, router])

  if (success) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-success" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <p className="font-medium text-success">{success}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="mb-4 font-semibold text-foreground">
        {role === "borrower" ? "Solicitar extensão de prazo" : "Solicitação de extensão"}
      </h3>

      <div className="mb-4 rounded-lg bg-background px-4 py-2.5 text-sm">
        <span className="text-muted-foreground">Devolução atual: </span>
        <span className="font-semibold text-foreground">
          {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(currentEndDate))}
        </span>
      </div>

      {role === "borrower" && (
        <form onSubmit={(e) => { void handleBorrowerSubmit(e) }} className="space-y-4">
          <div>
            <label
              htmlFor={`extend-date-${bookingId}`}
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Nova data de devolução
            </label>
            <input
              id={`extend-date-${bookingId}`}
              type="date"
              value={newEndDate}
              min={minDate}
              onChange={(e) => setNewEndDate(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          {error && (
            <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || newEndDate <= toDateInputValue(currentEndDate)}
            className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-brand px-4 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            aria-busy={submitting}
          >
            {submitting ? "Enviando..." : "Solicitar extensão"}
          </button>
        </form>
      )}

      {role === "owner" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            O locatário solicitou uma extensão de prazo. Você pode aprovar ou recusar.
          </p>

          {error && (
            <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => void handleOwnerAction("approve")}
              disabled={submitting}
              className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-success px-4 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              aria-busy={submitting}
            >
              Aprovar
            </button>
            <button
              onClick={() => void handleOwnerAction("reject")}
              disabled={submitting}
              className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-destructive bg-background px-4 text-sm font-bold text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
              aria-busy={submitting}
            >
              Recusar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
