"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Props {
  /** Grafia canônica, só para exibir na confirmação. */
  city:    string
  /** Chave normalizada — é ela que seleciona os leads (ver comentário abaixo). */
  cityNorm: string | null
  state:   string | null
  pending: number
  /** Restringe a um bairro dentro da cidade (drill-down nível 3). */
  neighborhoodNorm?: string | null
}

/**
 * Convida (cria conta mínima + e-mail "defina sua senha") todos os leads PENDING
 * de uma cidade — base para abrir uma cidade-piloto. Pede confirmação porque
 * dispara e-mails reais.
 *
 * Envia `cityNorm`, não `city`: a linha do ranking agrupa todas as grafias da
 * mesma cidade ("São Paulo" + "sao paulo"), e filtrar por texto convidaria só
 * uma delas — deixando o resto do grupo para trás sem nenhum aviso.
 */
export function InviteCityButton({ city, cityNorm, state, pending, neighborhoodNorm }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [msg,     setMsg]     = useState("")
  const [error,   setError]   = useState("")

  async function invite() {
    if (!window.confirm(
      `Convidar ${pending} interessado(s) de ${city}${state ? `/${state}` : ""}?\n\n` +
      "Cada um recebe um e-mail para definir a senha e acessar o piloto. Esta ação envia e-mails reais."
    )) return

    setLoading(true)
    setMsg("")
    setError("")
    try {
      const res = await fetch("/api/admin/founders/invite", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          cityNorm:         cityNorm ?? undefined,
          neighborhoodNorm: neighborhoodNorm ?? undefined,
          state:            state ?? undefined,
          limit:            200,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? "Falha ao convidar."); return }
      setMsg(`${json.data.invited} convidado(s).`)
      router.refresh()
    } catch {
      setError("Falha de conexão.")
    } finally {
      setLoading(false)
    }
  }

  if (pending === 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={invite}
        disabled={loading}
        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? "Convidando…" : `Convidar (${pending})`}
      </button>
      {msg   && <span className="text-[11px] text-success">{msg}</span>}
      {error && <span className="text-[11px] text-destructive">{error}</span>}
    </div>
  )
}
