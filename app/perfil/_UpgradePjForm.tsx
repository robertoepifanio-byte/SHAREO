"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PJ_DECLARATION_TEXT } from "@/lib/legal-config"
import { maskCNPJ } from "@/lib/forms/masks"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; razaoSocial: string | null; pendingReview: boolean }

export function UpgradePjForm() {
  const router = useRouter()
  const [cnpj,             setCnpj]             = useState("")
  const [responsavelLegal, setResponsavelLegal] = useState("")
  const [declaracao,       setDeclaracao]       = useState(false)
  const [state,            setState]            = useState<State>({ status: "idle" })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState({ status: "loading" })

    try {
      const res = await fetch("/api/users/me/upgrade-pj", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          cnpj: cnpj.replace(/\D/g, ""),
          responsavelLegal: responsavelLegal.trim(),
          declaracaoVinculo: declaracao,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        setState({ status: "error", message: json?.error?.message ?? "Erro no servidor." })
        return
      }

      setState({
        status:        "success",
        razaoSocial:   json?.data?.razaoSocial ?? null,
        pendingReview: json?.data?.pendingReview ?? false,
      })
      // Atualiza a sessão/UI para refletir o novo userType. A tela de perfil re-renderiza.
      router.refresh()
    } catch {
      setState({ status: "error", message: "Erro de conexão. Tente novamente." })
    }
  }

  if (state.status === "success") {
    return (
      <div className="rounded-lg bg-success/10 px-4 py-3 text-sm text-foreground">
        <p className="font-semibold text-success">✓ Conta atualizada para Pessoa Jurídica</p>
        {state.razaoSocial && (
          <p className="mt-1 text-muted-foreground">
            Empresa confirmada na Receita: <strong className="text-foreground">{state.razaoSocial}</strong>
          </p>
        )}
        {state.pendingReview && (
          <p className="mt-1 text-muted-foreground">
            Estamos confirmando seu CNPJ na Receita Federal — você será avisado em até 24h.
          </p>
        )}
      </div>
    )
  }

  const canSubmit =
    cnpj.replace(/\D/g, "").length === 14 &&
    responsavelLegal.trim().length >= 3 &&
    declaracao &&
    state.status !== "loading"

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
          onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <p className="mt-1 text-xs text-muted-foreground">Validamos a situação cadastral na Receita Federal.</p>
      </div>

      <div>
        <label htmlFor="resp-legal" className="mb-1.5 block text-sm font-medium text-foreground">
          Nome do responsável legal
        </label>
        <input
          id="resp-legal"
          type="text"
          autoComplete="name"
          placeholder="Nome completo de quem representa a empresa"
          value={responsavelLegal}
          onChange={(e) => setResponsavelLegal(e.target.value)}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-background px-3 py-2.5">
        <input
          type="checkbox"
          checked={declaracao}
          onChange={(e) => setDeclaracao(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
        />
        <span className="text-xs leading-snug text-muted-foreground">{PJ_DECLARATION_TEXT}</span>
      </label>

      {state.status === "error" && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        {state.status === "loading" ? (
          <>
            <LoadingSpinner size="sm" />
            Verificando CNPJ…
          </>
        ) : (
          "Confirmar upgrade para PJ"
        )}
      </button>
    </form>
  )
}
