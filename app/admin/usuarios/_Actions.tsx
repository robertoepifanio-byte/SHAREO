"use client"

import { useState, useTransition } from "react"
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

  async function act() {
    setError(""); setLoading(true)
    try {
      const res  = await fetch(`/api/admin/users/${userId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: isActive ? "deactivate" : "activate" }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? "Erro."); return }
      startTransition(() => router.refresh())
    } finally {
      setLoading(false)
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
      {error && <p className="mt-0.5 text-[10px] text-red-600">{error}</p>}
    </div>
  )
}
