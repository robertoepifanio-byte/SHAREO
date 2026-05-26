"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

interface Props {
  bookingId: string
}

export function DisputeActions({ bookingId }: Props) {
  const router                = useRouter()
  const [, startTransition]   = useTransition()
  const [loading, setLoading] = useState<string | null>(null)
  const [error,   setError]   = useState("")
  const [note,    setNote]    = useState("")
  const [open,    setOpen]    = useState(false)

  async function resolve(action: "resolve_completed" | "resolve_cancelled") {
    setError(""); setLoading(action)
    try {
      const res  = await fetch(`/api/admin/disputes/${bookingId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, adminNote: note.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? "Erro."); return }
      setOpen(false)
      startTransition(() => router.refresh())
    } finally {
      setLoading(null)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
      >
        Resolver
      </button>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface p-3 text-xs">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Nota do administrador (opcional)…"
        className="w-full resize-none rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:border-brand"
      />
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex gap-1.5">
        <button
          onClick={() => resolve("resolve_completed")}
          disabled={!!loading}
          className="rounded bg-success/10 px-2 py-1 font-semibold text-success hover:bg-success/20 disabled:opacity-50"
        >
          {loading === "resolve_completed" ? "…" : "Concluir"}
        </button>
        <button
          onClick={() => resolve("resolve_cancelled")}
          disabled={!!loading}
          className="rounded bg-red-50 px-2 py-1 font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
        >
          {loading === "resolve_cancelled" ? "…" : "Cancelar"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded bg-muted px-2 py-1 text-foreground/60 hover:bg-border"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}
