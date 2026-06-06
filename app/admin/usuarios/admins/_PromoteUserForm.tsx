"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

type AdminRole = "ADMIN_SUPERADMIN" | "ADMIN_FINANCEIRO" | "ADMIN_OPERACIONAL"

const ROLE_LABELS: Record<AdminRole, { label: string; desc: string }> = {
  ADMIN_SUPERADMIN:  { label: "Superadmin",  desc: "Acesso total — incluindo gestão de admins" },
  ADMIN_FINANCEIRO:  { label: "Financeiro",  desc: "Painel financeiro, repasses, contas PIX, exportação" },
  ADMIN_OPERACIONAL: { label: "Operacional", desc: "Painel geral — itens, usuários, disputas, verificações" },
}

export function PromoteUserForm() {
  const router              = useRouter()
  const [, startTransition] = useTransition()
  const [open,    setOpen]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  const [success, setSuccess] = useState("")
  const [form, setForm] = useState({
    email:     "",
    adminRole: "ADMIN_OPERACIONAL" as AdminRole,
  })

  function update(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
    setError(""); setSuccess("")
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!confirm(`Promover ${form.email} a ${ROLE_LABELS[form.adminRole].label}?\n\nO usuário terá acesso ao painel administrativo imediatamente.`)) return
    setError(""); setSuccess(""); setLoading(true)
    try {
      const res  = await fetch("/api/admin/users/promote", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? "Erro ao promover usuário."); return }
      setSuccess(`${json.data.name} promovido com sucesso.`)
      setForm({ email: "", adminRole: "ADMIN_OPERACIONAL" })
      startTransition(() => router.refresh())
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/5 transition-colors"
      >
        Promover usuário existente
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-primary">Promover usuário existente a admin</h2>
        <button
          onClick={() => { setOpen(false); setError(""); setSuccess("") }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="promote-email" className="mb-1 block text-xs font-medium text-foreground">
              E-mail do usuário
            </label>
            <input
              id="promote-email"
              required
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="email@exemplo.com"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              O usuário deve ter uma conta PF ativa no ShareO.
            </p>
          </div>
          <div>
            <label htmlFor="promote-role" className="mb-1 block text-xs font-medium text-foreground">
              Role
            </label>
            <select
              id="promote-role"
              value={form.adminRole}
              onChange={(e) => update("adminRole", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
            >
              {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r].label}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {ROLE_LABELS[form.adminRole].desc}
            </p>
          </div>
        </div>

        {error   && <p className="text-xs text-red-600">{error}</p>}
        {success && <p className="text-xs text-green-600">{success}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Promovendo…" : "Promover a admin"}
          </button>
        </div>
      </form>
    </div>
  )
}
