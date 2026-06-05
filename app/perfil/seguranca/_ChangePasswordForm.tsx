"use client"

import { useState, useTransition } from "react"
import { signOut } from "next-auth/react"

export function ChangePasswordForm() {
  const [, startTransition] = useTransition()
  const [current,  setCurrent]  = useState("")
  const [next,     setNext]     = useState("")
  const [confirm,  setConfirm]  = useState("")
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState("")
  const [success,  setSuccess]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setSuccess(false)

    if (next !== confirm) { setError("As senhas não coincidem."); return }
    if (next.length < 8)  { setError("Mínimo 8 caracteres."); return }

    setLoading(true)
    try {
      const res  = await fetch("/api/user/password", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? "Erro ao alterar senha."); return }
      setSuccess(true)
      startTransition(() => {
        setCurrent(""); setNext(""); setConfirm("")
        setTimeout(() => signOut({ callbackUrl: "/login?msg=senha-alterada" }), 1500)
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Senha atual</label>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Nova senha</label>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Confirmar nova senha</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {error   && <p className="text-xs text-destructive">{error}</p>}
      {success && <p className="text-xs text-success">Senha alterada. Redirecionando para o login…</p>}

      <button
        type="submit"
        disabled={loading}
        className="h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {loading ? "Salvando…" : "Salvar nova senha"}
      </button>
    </form>
  )
}
