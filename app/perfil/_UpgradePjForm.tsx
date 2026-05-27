"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }

function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
}

export function UpgradePjForm() {
  const router = useRouter()
  const [cnpj,  setCnpj]  = useState("")
  const [state, setState] = useState<State>({ status: "idle" })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState({ status: "loading" })

    try {
      const res  = await fetch("/api/users/me/upgrade-pj", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ cnpj: cnpj.replace(/\D/g, "") }),
      })
      const json = await res.json()

      if (!res.ok) {
        setState({ status: "error", message: json?.error?.message ?? "Erro no servidor." })
        return
      }

      // Reload para refletir novo userType na sessão
      router.refresh()
    } catch {
      setState({ status: "error", message: "Erro de conexão. Tente novamente." })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="cnpj-upgrade" className="mb-1.5 block text-sm font-medium text-foreground">
          CNPJ da empresa
        </label>
        <input
          id="cnpj-upgrade"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="00.000.000/0000-00"
          value={cnpj}
          onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </div>

      {state.status === "error" && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={cnpj.replace(/\D/g, "").length < 14 || state.status === "loading"}
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        {state.status === "loading" ? (
          <>
            <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Verificando CNPJ…
          </>
        ) : (
          "Confirmar upgrade para PJ"
        )}
      </button>
    </form>
  )
}
