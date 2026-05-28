"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Props {
  userId: string
  userName: string
}

export function VerificationActions({ userId, userName }: Props) {
  const router  = useRouter()
  const [loading, setLoading]   = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason]     = useState("")
  const [error, setError]       = useState("")

  async function handle(action: "approve" | "reject") {
    if (action === "reject" && reason.trim().length < 10) {
      setError("Descreva o motivo (mínimo 10 caracteres).")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/users/${userId}/id-verification`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, rejectionReason: action === "reject" ? reason : undefined }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error?.message ?? "Erro ao processar.")
        setLoading(false)
        return
      }
      router.refresh()
    } catch {
      setError("Erro de rede.")
      setLoading(false)
    }
  }

  if (showReject) {
    return (
      <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
        <p className="mb-2 text-xs font-semibold text-red-700">Motivo da rejeição</p>
        <textarea
          className="w-full rounded border border-red-200 bg-white px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-red-400"
          rows={3}
          placeholder={`Ex: Documento ilegível, selfie não corresponde ao documento, etc.`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={loading}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => handle("reject")}
            disabled={loading}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Processando…" : "Confirmar Rejeição"}
          </button>
          <button
            onClick={() => { setShowReject(false); setReason(""); setError("") }}
            disabled={loading}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-background"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 flex gap-2">
      {error && <p className="mb-2 w-full text-xs text-red-600">{error}</p>}
      <button
        onClick={() => handle("approve")}
        disabled={loading}
        className="rounded-md bg-success px-3 py-1.5 text-xs font-semibold text-white hover:bg-success/90 disabled:opacity-50"
      >
        {loading ? "…" : "✓ Aprovar"}
      </button>
      <button
        onClick={() => setShowReject(true)}
        disabled={loading}
        className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        ✕ Rejeitar
      </button>
    </div>
  )
}
