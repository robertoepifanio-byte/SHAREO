"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

type AdminRole = "ADMIN_SUPERADMIN" | "ADMIN_FINANCEIRO" | "ADMIN_OPERACIONAL"

const ROLE_LABELS: Record<AdminRole, { label: string; desc: string }> = {
  ADMIN_SUPERADMIN:  { label: "Superadmin",   desc: "Acesso total — incluindo gestão de admins" },
  ADMIN_FINANCEIRO:  { label: "Financeiro",   desc: "Painel financeiro, repasses, contas PIX, exportação" },
  ADMIN_OPERACIONAL: { label: "Operacional",  desc: "Painel geral — itens, usuários, disputas, verificações" },
}

export function CreateAdminForm() {
  const router                = useRouter()
  const [, startTransition]   = useTransition()
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  const [form, setForm] = useState({
    name:      "",
    email:     "",
    password:  "",
    adminRole: "ADMIN_OPERACIONAL" as AdminRole,
  })

  function update(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setLoading(true)
    try {
      const res  = await fetch("/api/admin/users/admins", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? "Erro ao criar admin."); return }
      setOpen(false)
      setForm({ name: "", email: "", password: "", adminRole: "ADMIN_OPERACIONAL" })
      startTransition(() => router.refresh())
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
      >
        + Novo admin
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-brand/20 bg-brand/5 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-primary">Novo administrador</h2>
        <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">
          Cancelar
        </button>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Nome</label>
            <input
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Nome completo"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">E-mail</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="email@shareo.com.br"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Senha</label>
            <input
              required
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Role</label>
            <select
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

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Criando…" : "Criar administrador"}
          </button>
        </div>
      </form>
    </div>
  )
}
