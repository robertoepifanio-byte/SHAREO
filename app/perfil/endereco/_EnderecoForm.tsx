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

  const [cepLoading,  setCepLoading]  = useState(false)
  const [cepError,    setCepError]    = useState("")
  const [cepFilled,   setCepFilled]   = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState("")
  const [success,     setSuccess]     = useState(false)
  const [gettingLoc,  setGettingLoc]  = useState(false)
  const [locError,    setLocError]    = useState("")

  // Evita busca duplicada se o usuário sair/entrar no campo sem mudar o valor
  const lastFetchedCep = useRef("")

  // ── Busca ViaCEP ao sair do campo (onBlur) ────────────────────────────────
  async function handleCepBlur() {
    const digits = cepVal.replace(/\D/g, "")
    if (digits.length !== 8 || digits === lastFetchedCep.current) return

    setCepLoading(true)
    setCepError("")
    setCepFilled(false)
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json() as ViaCepResponse

      if (data.erro) {
        setCepError("CEP não encontrado. Verifique e tente novamente.")
        return
      }

      lastFetchedCep.current = digits

      if (data.logradouro) setStreetVal(data.logradouro)
      if (data.bairro)     setNeighVal(data.bairro)
      // Cidade e estado sempre sobrescritos — vêm sempre preenchidos no ViaCEP
      setStateVal(data.uf        ?? stateVal)
      setCityVal(data.localidade ?? cityVal)
      setCepFilled(true)
    } catch {
      setCepError("Erro ao consultar o CEP. Verifique sua conexão.")
    } finally {
      setCepLoading(false)
    }
  }

  // ── Geolocalização GPS → Mapbox geocoding reverso ─────────────────────────
  function handleGetLocation() {
    if (!navigator.geolocation) {
      setLocError("Geolocalização não suportada neste navegador.")
      return
    }
    setGettingLoc(true)
    setLocError("")
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords
          const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
          if (!token || token.endsWith("...")) {
            setLocError("Token de mapa não configurado.")
            return
          }
          const url =
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
            `?access_token=${token}&country=BR&language=pt&types=place,locality,neighborhood,address&limit=1`
          const res  = await fetch(url)
          const data = await res.json() as {
            features?: {
              place_type: string[]
              text: string
              context?: { id: string; text: string }[]
            }[]
          }
          const feature = data?.features?.[0]
          if (feature) {
            const ctx = feature.context ?? []
            const place  = ctx.find((c) => c.id.startsWith("place"))?.text
            const region = ctx.find((c) => c.id.startsWith("region"))?.text
            const neigh  = ctx.find((c) => c.id.startsWith("neighborhood"))?.text
                        ?? (feature.place_type.includes("neighborhood") ? feature.text : "")
            if (place)  setCityVal(place)
            if (region) setStateVal(stateAbbr(region))
            if (neigh)  setNeighVal(neigh)
          } else {
            setLocError("Não foi possível identificar o endereço a partir do GPS.")
          }
        } catch {
          setLocError("Erro ao buscar localização. Tente novamente.")
        } finally {
          setGettingLoc(false)
        }
      },
      () => {
        setGettingLoc(false)
        setLocError("Não foi possível obter a localização. Permita o acesso ao GPS.")
      },
      { timeout: 8000 }
    )
  }

  // Converte nome do estado (ex.: "Rio Grande do Norte") para sigla (ex.: "RN")
  function stateAbbr(name: string): string {
    const map: Record<string, string> = {
      "Acre": "AC", "Alagoas": "AL", "Amapá": "AP", "Amazonas": "AM",
      "Bahia": "BA", "Ceará": "CE", "Distrito Federal": "DF", "Espírito Santo": "ES",
      "Goiás": "GO", "Maranhão": "MA", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS",
      "Minas Gerais": "MG", "Pará": "PA", "Paraíba": "PB", "Paraná": "PR",
      "Pernambuco": "PE", "Piauí": "PI", "Rio de Janeiro": "RJ",
      "Rio Grande do Norte": "RN", "Rio Grande do Sul": "RS", "Rondônia": "RO",
      "Roraima": "RR", "Santa Catarina": "SC", "São Paulo": "SP", "Sergipe": "SE",
      "Tocantins": "TO",
    }
    return map[name] ?? name.slice(0, 2).toUpperCase()
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

      {/* ── Usar minha localização ── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Sua localização é usada para centralizar o mapa e exibir itens próximos.
        </p>
        <button
          type="button"
          onClick={handleGetLocation}
          disabled={gettingLoc}
          className="flex shrink-0 items-center gap-1.5 text-xs text-brand hover:underline disabled:opacity-50 outline-none focus-visible:ring-1 focus-visible:ring-brand rounded ml-3"
        >
          {gettingLoc ? (
            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          )}
          Usar minha localização
        </button>
      </div>
      {locError && <p className="text-xs text-red-500">{locError}</p>}

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
        {cepFilled && !cepError && (
          <p className="mt-1 text-xs text-success">✓ Endereço preenchido automaticamente</p>
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
