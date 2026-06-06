"use client"

import { useState, useTransition, useRef } from "react"
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
  const inflight              = useRef(false)

  async function patch(body: object) {
    if (inflight.current) return
    setError(""); setLoading(true); inflight.current = true
    try {
      const res  = await fetch(`/api/admin/users/admins/${userId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? "Erro ao salvar."); return }
      startTransition(() => router.refresh())
    } finally {
      setLoading(false); inflight.current = false
    }
  }

  function handleToggle() {
    if (isActive && !confirm(`Desativar este admin? Ele perderá acesso imediatamente.`)) return
    patch({ action: isActive ? "deactivate" : "activate" })
  }

  function handleDemote() {
    if (
      !confirm(
        "Remover privilégios de admin?\n\nO usuário virará uma conta PF comum e perderá acesso ao painel imediatamente. Esta ação pode ser desfeita manualmente pelo banco de dados.",
      )
    )
      return
    patch({ action: "demote_to_user" })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
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
        onClick={handleToggle}
        disabled={loading}
        className={`rounded-md px-3 py-1 text-xs font-semibold disabled:opacity-50 transition-colors ${
          isActive
            ? "bg-red-50 text-red-600 hover:bg-red-100"
            : "bg-success/10 text-success hover:bg-success/20"
        }`}
      >
        {loading ? "…" : isActive ? "Desativar" : "Ativar"}
      </button>

      <button
        onClick={handleDemote}
        disabled={loading}
        className="rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
        title="Remover todos os privilégios admin — o usuário vira conta PF comum"
      >
        {loading ? "…" : "Remover admin"}
      </button>

      {error && <p className="mt-0.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}
