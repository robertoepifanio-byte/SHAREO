"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function KybActions({ userId }: { userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<"verify" | "override" | null>(null)
  const [error, setError]     = useState("")

  async function handle(action: "verify" | "override") {
    setLoading(action)
    setError("")
    try {
      const res = await fetch(`/api/admin/users/${userId}/kyb-approve`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error?.message ?? "Erro ao processar.")
        setLoading(null)
        return
      }
      router.refresh()
    } catch {
      setError("Erro de rede.")
      setLoading(null)
    }
  }

  return (
    <div className="mt-3">
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => handle("verify")}
          disabled={loading !== null}
          className="rounded-md bg-success px-3 py-1.5 text-xs font-semibold text-white hover:bg-success/90 disabled:opacity-50"
        >
          {loading === "verify" ? "Consultando…" : "↻ Verificar na Receita"}
        </button>
        <button
          onClick={() => handle("override")}
          disabled={loading !== null}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-background disabled:opacity-50"
        >
          {loading === "override" ? "…" : "✓ Aprovar manualmente"}
        </button>
      </div>
    </div>
  )
}
