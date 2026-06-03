"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { BookingStatus } from "@prisma/client"

interface Props {
  bookingId:      string
  status:         BookingStatus
  isOwner:        boolean
  isBorrower:     boolean
  conversationId?: string
}

type Action = "confirm" | "cancel" | "mark_active" | "mark_returned" | "confirm_return" | "open_dispute"

export function BookingActions({ bookingId, status, isOwner, isBorrower, conversationId }: Props) {
  const router          = useRouter()
  const [pending, startTransition] = useTransition()
  const [loading,  setLoading]  = useState(false)
  const [error, setError]   = useState("")
  const [reason, setReason] = useState("")
  const [showReason, setShowReason] = useState<Action | null>(null)

  async function execute(action: Action, r?: string) {
    setError("")
    setLoading(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, reason: r }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message ?? "Erro ao executar ação.")
        return
      }
      startTransition(() => router.refresh())
    } finally {
      setLoading(false)
    }
  }

  function handleAction(action: Action) {
    if (action === "cancel" || action === "open_dispute") {
      setShowReason(action)
    } else {
      execute(action)
    }
  }

  function submitReason() {
    if (!showReason) return
    execute(showReason, reason)
    setShowReason(null)
    setReason("")
  }

  const actions: { action: Action; label: string; variant: "primary" | "danger" | "ghost" }[] = []

  if (isOwner) {
    if (status === "PENDING")    actions.push({ action: "confirm",        label: "✅ Confirmar reserva",    variant: "primary" })
    if (status === "CONFIRMED")  actions.push({ action: "mark_active",    label: "▶️ Marcar como ativo",     variant: "primary" })
    if (status === "RETURNED")   actions.push({ action: "confirm_return", label: "📦 Confirmar devolução",   variant: "primary" })
  }
  if (isBorrower) {
    if (status === "ACTIVE") actions.push({ action: "mark_returned", label: "📦 Confirmar devolução", variant: "primary" })
  }
  if (status === "PENDING" || status === "CONFIRMED") {
    actions.push({ action: "cancel", label: "Cancelar reserva", variant: "danger" })
  }
  if (status === "ACTIVE" || status === "RETURNED") {
    actions.push({ action: "open_dispute", label: "Abrir disputa", variant: "ghost" })
  }

  if (actions.length === 0 && !conversationId) return null

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
      )}

      {showReason && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-2 text-sm font-semibold text-foreground">
            {showReason === "cancel" ? "Motivo do cancelamento" : "Motivo da disputa"}
            <span className="text-destructive"> *</span>
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Descreva o motivo..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand resize-none"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={submitReason}
              disabled={!reason.trim() || loading || pending}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Confirmar
            </button>
            <button
              onClick={() => { setShowReason(null); setReason("") }}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-background transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {conversationId && (
          <Link
            href={`/mensagens/${conversationId}`}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            💬 Abrir chat
          </Link>
        )}
        {actions.map(({ action, label, variant }) => (
          <button
            key={action}
            onClick={() => handleAction(action)}
            disabled={loading || pending}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${
              variant === "primary" ? "bg-brand text-white hover:opacity-90" :
              variant === "danger"  ? "border border-red-300 text-red-600 hover:bg-red-50" :
              "border border-border text-foreground hover:bg-background"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
