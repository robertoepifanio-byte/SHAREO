"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

function PasswordHints({ password }: { password: string }) {
  const checks = [
    { label: "8 caracteres",    ok: password.length >= 8 },
    { label: "Letra maiúscula", ok: /[A-Z]/.test(password) },
    { label: "Número",          ok: /[0-9]/.test(password) },
  ]
  if (!password) return null
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
      {checks.map(({ label, ok }) => (
        <span key={label} className={`flex items-center gap-1 text-xs ${ok ? "text-success" : "text-muted-foreground"}`}>
          {ok ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><circle cx="12" cy="12" r="10"/></svg>
          )}
          {label}
        </span>
      ))}
    </div>
  )
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()

  const [password,     setPassword]     = useState("")
  const [confirm,      setConfirm]      = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [success,      setSuccess]      = useState(false)
  const [error,        setError]        = useState("")

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError("As senhas não coincidem."); return }
    setError(""); setLoading(true)

    try {
      const res  = await fetch("/api/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, password }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error?.message ?? "Erro ao redefinir senha.")
        return
      }

      setSuccess(true)
      setTimeout(() => router.push("/login"), 2500)
    } catch {
      setError("Falha de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 shadow-card text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#007B3C" strokeWidth="2.5" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-primary">Senha redefinida!</h2>
        <p className="mt-2 text-sm text-muted-foreground">Redirecionando para o login…</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-8 shadow-card">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-primary">Criar nova senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha uma senha segura para a sua conta.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {error && (
          <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-hover">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Input
            label="Nova senha"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Mín. 8 caracteres"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError("") }}
            required
            disabled={loading}
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="outline-none focus-visible:ring-1 focus-visible:ring-brand rounded"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            }
          />
          <PasswordHints password={password} />
        </div>

        <Input
          label="Confirmar nova senha"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Repita a senha"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setError("") }}
          required
          disabled={loading}
        />

        <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
          Redefinir senha
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-brand hover:underline">
          ← Voltar para o login
        </Link>
      </p>
    </div>
  )
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}
