"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

interface Props {
  itemId:     string
  isApproved: boolean
  isActive:   boolean
}

export function ItemActions({ itemId, isApproved, isActive }: Props) {
  const router                 = useRouter()
  const [, startTransition]    = useTransition()
  const [loading, setLoading]  = useState<string | null>(null)
  const [error,   setError]    = useState("")

  async function act(action: string) {
    setError(""); setLoading(action)
    try {
      const res  = await fetch(`/api/admin/items/${itemId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? "Erro."); return }
      startTransition(() => router.refresh())
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {!isApproved && (
        <button
          onClick={() => act("approve")}
          disabled={!!loading}
          className="flex h-11 items-center justify-center rounded-md bg-success/10 px-3 text-xs font-semibold text-success hover:bg-success/20 disabled:opacity-50 transition-colors"
        >
          {loading === "approve" ? "…" : "Aprovar"}
        </button>
      )}
      {isApproved && (
        <button
          onClick={() => act("reject")}
          disabled={!!loading}
          className="flex h-11 items-center justify-center rounded-md bg-red-50 px-3 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
        >
          {loading === "reject" ? "…" : "Rejeitar"}
        </button>
      )}
      <button
        onClick={() => act("toggle_active")}
        disabled={!!loading}
        className="flex h-11 items-center justify-center rounded-md bg-muted px-3 text-xs font-semibold text-foreground hover:bg-border disabled:opacity-50 transition-colors"
      >
        {loading === "toggle_active" ? "…" : isActive ? "Desativar" : "Ativar"}
      </button>
      {error && <p className="text-[10px] text-red-600">{error}</p>}
    </div>
  )
}
