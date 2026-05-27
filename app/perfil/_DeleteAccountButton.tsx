"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"

export function DeleteAccountButton() {
  const [step, setStep]       = useState<"idle" | "confirm" | "loading">("idle")
  const [error, setError]     = useState<string | null>(null)

  async function handleDelete() {
    setStep("loading")
    setError(null)

    try {
      const res = await fetch("/api/users/me", { method: "DELETE" })
      const json = await res.json()

      if (!res.ok) {
        setError(json?.error?.message ?? "Erro ao excluir conta.")
        setStep("confirm")
        return
      }

      await signOut({ callbackUrl: "/" })
    } catch {
      setError("Erro de conexão. Tente novamente.")
      setStep("confirm")
    }
  }

  if (step === "idle") {
    return (
      <button
        onClick={() => setStep("confirm")}
        className="text-sm text-destructive hover:underline"
      >
        Excluir minha conta
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <p className="mb-1 font-semibold text-destructive">Excluir conta permanentemente</p>
      <p className="mb-4 text-sm text-muted-foreground">
        Seus dados pessoais serão removidos. Histórico de locações concluídas é mantido por
        obrigação fiscal. Esta ação não pode ser desfeita.
      </p>

      {error && (
        <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleDelete}
          disabled={step === "loading"}
          className="inline-flex h-11 items-center rounded-lg bg-destructive px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {step === "loading" ? "Excluindo…" : "Confirmar exclusão"}
        </button>
        <button
          onClick={() => { setStep("idle"); setError(null) }}
          disabled={step === "loading"}
          className="inline-flex h-11 items-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground hover:bg-background transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
