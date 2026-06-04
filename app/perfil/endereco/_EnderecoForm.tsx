"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

const BR_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
] as const

interface Props {
  city:         string | null
  state:        string | null
  neighborhood: string | null
}

const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand transition-colors placeholder:text-muted-foreground"

export function EnderecoForm({ city, state, neighborhood }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [cityVal,  setCityVal]  = useState(city         ?? "")
  const [stateVal, setStateVal] = useState(state        ?? "")
  const [neighVal, setNeighVal] = useState(neighborhood ?? "")

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  const [success, setSuccess] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setSuccess(false); setLoading(true)
    try {
      const res  = await fetch("/api/users/me", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          city:         cityVal.trim()  || null,
          state:        stateVal        || null,
          neighborhood: neighVal.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        const detail = json.error?.details
          ? Object.values(json.error.details as Record<string, string[]>)[0]?.[0]
          : undefined
        setError(detail ?? json.error?.message ?? "Erro ao salvar.")
        return
      }
      setSuccess(true)
      startTransition(() => {
        setTimeout(() => router.push("/perfil"), 1000)
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="end-city" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cidade
          </label>
          <input
            id="end-city"
            type="text"
            value={cityVal}
            onChange={(e) => setCityVal(e.target.value)}
            placeholder="Ex: Natal"
            maxLength={100}
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="end-state" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Estado
          </label>
          <select
            id="end-state"
            value={stateVal}
            onChange={(e) => setStateVal(e.target.value)}
            className={inputCls}
          >
            <option value="">Selecione</option>
            {BR_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="end-neighborhood" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bairro <span className="font-normal normal-case text-muted-foreground">(opcional)</span>
          </label>
          <input
            id="end-neighborhood"
            type="text"
            value={neighVal}
            onChange={(e) => setNeighVal(e.target.value)}
            placeholder="Ex: Ponta Negra"
            maxLength={100}
            className={inputCls}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        💡 Ao salvar, sua localização será atualizada automaticamente para centralizar o mapa.
      </p>

      {error   && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {success && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm font-semibold text-success">Endereço atualizado!</p>}

      <button
        type="submit"
        disabled={loading}
        className="h-11 rounded-lg bg-brand px-6 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {loading ? "Salvando…" : "Salvar endereço"}
      </button>
    </form>
  )
}
