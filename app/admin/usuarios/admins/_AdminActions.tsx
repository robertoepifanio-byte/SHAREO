"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

type AdminRole = "ADMIN_SUPERADMIN" | "ADMIN_FINANCEIRO" | "ADMIN_OPERACIONAL"

const ROLE_LABELS: Record<AdminRole, string> = {
  ADMIN_SUPERADMIN:   "Superadmin",
  ADMIN_FINANCEIRO:   "Financeiro",
  ADMIN_OPERACIONAL:  "Operacional",
}

interface Props {
  userId:    string
  adminRole: AdminRole
  isActive:  boolean
}

export function AdminActions({ userId, adminRole, isActive }: Props) {
  const router                = useRouter()
  const [, startTransition]   = useTransition()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")

  async function patch(body: object) {
    setError(""); setLoading(true)
    try {
      const res  = await fetch(`/api/admin/users/admins/${userId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? "Erro."); return }
      startTransition(() => router.refresh())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        defaultValue={adminRole}
        disabled={loading}
        onChange={(e) => patch({ adminRole: e.target.value })}
        className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground disabled:opacity-50"
        aria-label="Alterar role"
      >
        {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
        ))}
      </select>

      <button
        onClick={() => patch({ action: isActive ? "deactivate" : "activate" })}
        disabled={loading}
        className={`rounded-md px-3 py-1 text-xs font-semibold disabled:opacity-50 transition-colors ${
          isActive
            ? "bg-red-50 text-red-600 hover:bg-red-100"
            : "bg-success/10 text-success hover:bg-success/20"
        }`}
      >
        {loading ? "…" : isActive ? "Desativar" : "Ativar"}
      </button>

      {error && <p className="text-[10px] text-red-600">{error}</p>}
    </div>
  )
}
