"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"

interface Props {
  userId:   string
  isActive: boolean
}

export function UserActions({ userId, isActive }: Props) {
  const router                = useRouter()
  const [, startTransition]   = useTransition()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  const inflight              = useRef(false)

  async function act() {
    if (inflight.current) return
    if (isActive && !confirm("Desativar este usuário? Ele perderá acesso imediatamente.")) return
    setError(""); setLoading(true); inflight.current = true
    try {
      const res  = await fetch(`/api/admin/users/${userId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: isActive ? "deactivate" : "activate" }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? "Erro ao salvar."); return }
      startTransition(() => router.refresh())
    } finally {
      setLoading(false); inflight.current = false
    }
  }

  return (
    <div>
      <button
        onClick={act}
        disabled={loading}
        className={`rounded-md px-3 py-1 text-xs font-semibold disabled:opacity-50 transition-colors ${
          isActive
            ? "bg-red-50 text-red-600 hover:bg-red-100"
            : "bg-success/10 text-success hover:bg-success/20"
        }`}
      >
        {loading ? "…" : isActive ? "Desativar" : "Ativar"}
      </button>
      {error && <p className="mt-0.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}
