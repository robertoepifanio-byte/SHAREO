"use client"

import { useState } from "react"

interface Props {
  maxDistanceKm: number
  limiteKm:      number
}

/**
 * Raio máximo da ordenação "Mais próximos" em /itens.
 *
 * Vive aqui e não em /admin/financeiro — onde estão os outros campos de
 * PlatformConfig — porque não é parâmetro financeiro: é alcance de descoberta do
 * catálogo, e este painel é o que ADMIN_OPERACIONAL enxerga.
 */
export function SearchRadiusForm({ maxDistanceKm, limiteKm }: Props) {
  const [km,     setKm]     = useState(String(maxDistanceKm))
  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)

    const v = parseInt(km, 10)
    if (isNaN(v) || v < 1 || v > limiteKm) {
      setMsg({ ok: false, text: `Valor inválido (1–${limiteKm} km).` })
      setSaving(false)
      return
    }

    try {
      const res = await fetch("/api/admin/platform-config?key=searchMaxDistanceKm", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ value: String(v) }),
      })
      if (!res.ok) throw new Error(await res.text())
      setMsg({ ok: true, text: `Raio atualizado para ${v} km.` })
    } catch {
      setMsg({ ok: false, text: "Erro ao salvar. Tente novamente." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="search-radius" className="text-xs font-medium text-muted-foreground">
          Raio máximo (km)
        </label>
        <input
          id="search-radius"
          type="number"
          min={1}
          max={limiteKm}
          value={km}
          onChange={(e) => setKm(e.target.value)}
          className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="min-h-11 rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {saving ? "Salvando…" : "Salvar"}
      </button>
      {msg && (
        <p className={`text-sm font-medium ${msg.ok ? "text-success" : "text-destructive"}`} role="status">
          {msg.text}
        </p>
      )}
    </form>
  )
}
