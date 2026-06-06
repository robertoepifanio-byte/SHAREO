"use client"

import { useState } from "react"

export function FeeRateForm({ currentRate }: { currentRate: number }) {
  const [rate, setRate] = useState((currentRate / 100).toFixed(1))
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const bps = Math.round(parseFloat(rate) * 100)
    if (isNaN(bps) || bps < 0 || bps > 10000) {
      setMsg({ ok: false, text: "Taxa inválida (0% a 100%)." })
      setSaving(false)
      return
    }
    try {
      const res = await fetch("/api/admin/platform-config?key=platformFeeRate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: String(bps) }),
      })
      if (!res.ok) throw new Error(await res.text())
      setMsg({ ok: true, text: "Taxa atualizada com sucesso." })
    } catch {
      setMsg({ ok: false, text: "Erro ao salvar. Tente novamente." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="fee-rate" className="text-xs font-medium text-muted-foreground">
          Taxa da plataforma (%)
        </label>
        <div className="flex items-center gap-1">
          <input
            id="fee-rate"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {saving ? "Salvando…" : "Salvar"}
      </button>
      {msg && (
        <p className={`text-sm font-medium ${msg.ok ? "text-success" : "text-destructive"}`}>
          {msg.text}
        </p>
      )}
    </form>
  )
}
