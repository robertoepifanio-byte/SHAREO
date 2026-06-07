"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"

const BR_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
] as const

interface Props {
  cep:          string | null
  street:       string | null
  city:         string | null
  state:        string | null
  neighborhood: string | null
}

const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand transition-colors placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"

// Formata CEP enquanto o usuário digita: "12345678" → "12345-678"
function fmtCep(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8)
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

interface ViaCepResponse {
  erro?:        boolean
  logradouro:   string
  bairro:       string
  localidade:   string
  uf:           string
}

export function EnderecoForm({ cep, street, city, state, neighborhood }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [cepVal,    setCepVal]    = useState(cep    ? `${cep.slice(0, 5)}-${cep.slice(5)}` : "")
  const [streetVal, setStreetVal] = useState(street       ?? "")
  const [neighVal,  setNeighVal]  = useState(neighborhood ?? "")
  const [cityVal,   setCityVal]   = useState(city         ?? "")
  const [stateVal,  setStateVal]  = useState(state        ?? "")

  const [cepLoading, setCepLoading] = useState(false)
  const [cepError,   setCepError]   = useState("")
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState("")
  const [success,    setSuccess]    = useState(false)

  // Evita busca duplicada se o usuário sair/entrar no campo sem mudar o valor
  const lastFetchedCep = useRef("")

  // ── Busca ViaCEP ao sair do campo (onBlur) ────────────────────────────────
  async function handleCepBlur() {
    const digits = cepVal.replace(/\D/g, "")
    if (digits.length !== 8 || digits === lastFetchedCep.current) return

    setCepLoading(true)
    setCepError("")
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json() as ViaCepResponse

      if (data.erro) {
        setCepError("CEP não encontrado. Verifique e tente novamente.")
        return
      }

      lastFetchedCep.current = digits

      // Preenche apenas campos que estejam vazios OU que foram preenchidos
      // automaticamente antes — não sobrescreve edições manuais.
      // (regra simples: preenche sempre, pois o usuário pode corrigir depois)
      if (data.logradouro) setStreetVal(data.logradouro)
      if (data.bairro)     setNeighVal(data.bairro)
      if (data.localidade) setCityVal(data.localidade)
      if (data.uf)         setStateVal(data.uf)
    } catch {
      setCepError("Erro ao consultar o CEP. Verifique sua conexão.")
    } finally {
      setCepLoading(false)
    }
  }

  // ── Salva no banco ────────────────────────────────────────────────────────
  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaveError(""); setSuccess(false); setSaving(true)
    try {
      const cepDigits = cepVal.replace(/\D/g, "") || null
      const res  = await fetch("/api/users/me", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          cep:          cepDigits,
          street:       streetVal.trim()  || null,
          neighborhood: neighVal.trim()   || null,
          city:         cityVal.trim()    || null,
          state:        stateVal          || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        const detail = json.error?.details
          ? Object.values(json.error.details as Record<string, string[]>)[0]?.[0]
          : undefined
        setSaveError(detail ?? json.error?.message ?? "Erro ao salvar.")
        return
      }
      setSuccess(true)
      startTransition(() => {
        setTimeout(() => router.push("/perfil"), 1200)
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">

      {/* ── CEP ── */}
      <div>
        <label htmlFor="end-cep" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          CEP <span className="font-normal normal-case text-muted-foreground">(opcional)</span>
        </label>
        <div className="relative">
          <input
            id="end-cep"
            type="text"
            inputMode="numeric"
            value={cepVal}
            onChange={(e) => {
              setCepVal(fmtCep(e.target.value))
              setCepError("")
            }}
            onBlur={handleCepBlur}
            placeholder="00000-000"
            maxLength={9}
            className={inputCls}
          />
          {cepLoading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">
              Buscando…
            </span>
          )}
        </div>
        {cepError && (
          <p className="mt-1 text-xs text-red-500">{cepError}</p>
        )}
        {!cepError && !cepLoading && cepVal.replace(/\D/g, "").length === 8 && (
          <p className="mt-1 text-xs text-success">✓ CEP válido — campos preenchidos automaticamente</p>
        )}
      </div>

      {/* ── Rua ── */}
      <div>
        <label htmlFor="end-street" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Rua / Logradouro <span className="font-normal normal-case text-muted-foreground">(opcional)</span>
        </label>
        <input
          id="end-street"
          type="text"
          value={streetVal}
          onChange={(e) => setStreetVal(e.target.value)}
          placeholder="Ex: Avenida Engenheiro Roberto Freire"
          maxLength={200}
          className={inputCls}
        />
      </div>

      {/* ── Bairro ── */}
      <div>
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

      {/* ── Cidade + Estado ── */}
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
      </div>

      <p className="text-xs text-muted-foreground">
        💡 Ao salvar, sua localização será atualizada automaticamente para centralizar o mapa.
      </p>

      {saveError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{saveError}</p>}
      {success   && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm font-semibold text-success">Endereço atualizado! Redirecionando…</p>}

      <button
        type="submit"
        disabled={saving || cepLoading}
        className="h-11 rounded-lg bg-brand px-6 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {saving ? "Salvando…" : "Salvar endereço"}
      </button>
    </form>
  )
}
