"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function PixAccountActions({ accountId }: { accountId: string }) {
  const router  = useRouter()
  const [loading, setLoading] = useState<"verify" | "reject" | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  async function act(action: "verify" | "reject") {
    setLoading(action)
    setError(null)
    try {
      const res = await fetch(`/api/admin/pix-accounts/${accountId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        setError(d.error ?? "Erro ao atualizar")
      } else {
        router.refresh()
      }
    } catch {
      setError("Erro de conexão")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          onClick={() => act("verify")}
          disabled={!!loading}
          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading === "verify" ? "…" : "Verificar"}
        </button>
        <button
          onClick={() => act("reject")}
          disabled={!!loading}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          {loading === "reject" ? "…" : "Rejeitar"}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
