"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

export function ChangeEmailForm() {
  const [open,        setOpen]        = useState(false)
  const [newEmail,    setNewEmail]    = useState("")
  const [password,    setPassword]    = useState("")
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState("")
  const [success,     setSuccess]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const res = await fetch("/api/user/email", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ newEmail, currentPassword: password }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? "Erro ao alterar e-mail. Tente novamente.")
      return
    }

    setSuccess(true)
    // Sessão usa o e-mail antigo — forçar novo login após 3s
    setTimeout(() => signOut({ callbackUrl: "/login" }), 3000)
  }

  if (success) {
    return (
      <div className="mt-4 border-t border-border pt-4">
        <div className="flex items-start gap-2 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mt-0.5 shrink-0" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>
            E-mail alterado! Enviamos um link de verificação para o novo endereço.
            Você será desconectado em instantes para fazer login novamente.
          </span>
        </div>
      </div>
    )
  }

  if (!open) {
    return (
      <div className="mt-4 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-medium text-brand hover:underline outline-none focus-visible:ring-1 focus-visible:ring-brand rounded"
        >
          Alterar e-mail
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      {/* Aviso de verificação */}
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>
          O novo e-mail precisará ser <strong>verificado</strong> antes de ser ativado.
          Você receberá um link de confirmação no novo endereço e será desconectado para fazer login novamente.
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          label="Novo e-mail"
          type="email"
          autoComplete="email"
          placeholder="novo@email.com"
          value={newEmail}
          onChange={(e) => { setNewEmail(e.target.value); setError("") }}
          disabled={loading}
          required
        />

        <Input
          label="Confirme sua senha"
          type="password"
          autoComplete="current-password"
          placeholder="Sua senha atual"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError("") }}
          disabled={loading}
          required
        />

        {error && (
          <p role="alert" className="text-xs text-destructive">{error}</p>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="submit" size="sm" loading={loading}>
            Confirmar alteração
          </Button>
          <button
            type="button"
            onClick={() => { setOpen(false); setNewEmail(""); setPassword(""); setError("") }}
            disabled={loading}
            className="h-9 rounded-lg border border-border px-4 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
