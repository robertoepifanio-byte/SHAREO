"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function PayoutActions({ payoutId }: { payoutId: string }) {
  const router  = useRouter()
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null)
  const [note,    setNote]    = useState("")
  const [error,   setError]   = useState<string | null>(null)
  const [open,    setOpen]    = useState(false)

  async function act(action: "approve" | "reject") {
    setLoading(action)
    setError(null)
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, note: note.trim() || undefined }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        setError(d.error ?? "Erro ao processar")
      } else {
        setOpen(false)
        router.refresh()
      }
    } catch {
      setError("Erro de conexão")
    } finally {
      setLoading(null)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-background transition-colors"
      >
        Processar
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nota (opcional)"
        rows={2}
        className="w-56 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground resize-none focus:border-brand focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          onClick={() => act("approve")}
          disabled={!!loading}
          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading === "approve" ? "…" : "✓ Confirmar pago"}
        </button>
        <button
          onClick={() => act("reject")}
          disabled={!!loading}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          {loading === "reject" ? "…" : "✗ Devolver"}
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={!!loading}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-background transition-colors"
        >
          Cancelar
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
