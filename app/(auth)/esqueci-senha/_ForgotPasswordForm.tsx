"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

export function ForgotPasswordForm() {
  const [email,   setEmail]   = useState("")
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState("")

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.includes("@")) { setError("E-mail inválido"); return }
    setError(""); setLoading(true)

    try {
      await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      // Sempre mostra sucesso — a API não vaza se o e-mail existe ou não
      setSent(true)
    } catch {
      setError("Falha de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 shadow-card text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#007B3C" strokeWidth="2" aria-hidden="true">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-primary">Verifique seu e-mail</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Se <span className="font-medium text-foreground">{email}</span> estiver cadastrado,
          você receberá as instruções para redefinir a senha em breve.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Não recebeu? Verifique a caixa de spam ou{" "}
          <button
            onClick={() => { setSent(false); setEmail("") }}
            className="text-brand hover:underline"
          >
            tente novamente
          </button>
          .
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-brand hover:underline"
        >
          ← Voltar para o login
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-8 shadow-card">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-primary">Recuperar senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe seu e-mail e enviaremos um link para criar uma nova senha.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {error && (
          <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-hover">
            {error}
          </div>
        )}

        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError("") }}
          required
          disabled={loading}
        />

        <Button type="submit" size="lg" loading={loading} className="w-full">
          Enviar link de recuperação
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Lembrou a senha?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
