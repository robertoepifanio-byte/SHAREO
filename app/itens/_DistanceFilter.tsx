"use client"

import { useState } from "react"

interface Props {
  dist?:    string
  userLat?: string
  userLng?: string
}

const OPTIONS = [
  { label: "Até 2 km",  value: "2"  },
  { label: "Até 5 km",  value: "5"  },
  { label: "Até 10 km", value: "10" },
  { label: "Qualquer",  value: ""   },
]

/**
 * Filtro de distância como participante de formulário (não usa router.push imediato).
 * Geolocalização preenche inputs ocultos ulat/ulng; submissão ocorre pelo botão
 * "Aplicar filtros" do FilterForm — funciona igualmente na sidebar e no bottom sheet.
 */
export function DistanceFilter({ dist, userLat, userLng }: Props) {
  const [selected, setSelected] = useState(dist ?? "")
  // Localização pode vir da URL (sessão anterior) ou ser obtida agora
  const [lat, setLat] = useState(userLat ?? "")
  const [lng, setLng] = useState(userLng ?? "")
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")

  const hasLocation = !!(lat && lng)
  const needsLocation = selected !== "" && !hasLocation

  function handleGetLocation() {
    setLoading(true)
    setError("")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false)
        setLat(String(pos.coords.latitude))
        setLng(String(pos.coords.longitude))
      },
      () => {
        setLoading(false)
        setError("Permita o acesso à localização nas configurações do browser.")
      },
      { timeout: 8000 },
    )
  }

  return (
    <fieldset>
      <legend className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Distância
      </legend>

      {/* Inputs ocultos — enviados junto com o form */}
      {lat && <input type="hidden" name="ulat" value={lat} />}
      {lng && <input type="hidden" name="ulng" value={lng} />}

      <div className="space-y-0.5">
        {OPTIONS.map((opt) => (
          <label key={opt.value} className="flex cursor-pointer items-center gap-2 py-1 text-sm text-foreground">
            <input
              type="radio"
              name="dist"
              value={opt.value}
              checked={selected === opt.value}
              onChange={() => {
                setSelected(opt.value)
                // Limpa localização ao selecionar "Qualquer"
                if (!opt.value) { setLat(""); setLng(""); setError("") }
              }}
              className="accent-brand"
            />
            {opt.label}
          </label>
        ))}
      </div>

      {/* Botão de localização — só aparece quando distância selecionada e sem coords */}
      {needsLocation && (
        <button
          type="button"
          onClick={handleGetLocation}
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand/40 bg-brand/5 px-3 py-2 text-xs font-semibold text-brand hover:bg-brand/10 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity=".25"/>
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
            </svg>
          )}
          {loading ? "Obtendo localização…" : "Usar minha localização"}
        </button>
      )}

      {hasLocation && selected !== "" && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-brand">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          Localização ativa
        </p>
      )}

      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </fieldset>
  )
}
