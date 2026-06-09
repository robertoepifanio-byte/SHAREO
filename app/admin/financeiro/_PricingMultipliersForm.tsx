"use client"

import { useState } from "react"

interface Props {
  weeklyMultiplier:  number
  monthlyMultiplier: number
}

export function PricingMultipliersForm({ weeklyMultiplier, monthlyMultiplier }: Props) {
  const [weekly,  setWeekly]  = useState(String(weeklyMultiplier))
  const [monthly, setMonthly] = useState(String(monthlyMultiplier))
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  async function saveKey(key: string, value: string) {
    const res = await fetch(`/api/admin/platform-config?key=${key}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ value }),
    })
    if (!res.ok) throw new Error(await res.text())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const w = parseInt(weekly,  10)
    const m = parseInt(monthly, 10)
    if (isNaN(w) || w < 1 || w > 52) {
      setMsg({ ok: false, text: "Multiplicador semanal inválido (1–52)." })
      setSaving(false)
      return
    }
    if (isNaN(m) || m < 1 || m > 90) {
      setMsg({ ok: false, text: "Multiplicador mensal inválido (1–90)." })
      setSaving(false)
      return
    }
    try {
      await Promise.all([
        saveKey("pricingWeeklyMultiplier",  String(w)),
        saveKey("pricingMonthlyMultiplier", String(m)),
      ])
      setMsg({ ok: true, text: "Multiplicadores atualizados com sucesso." })
    } catch {
      setMsg({ ok: false, text: "Erro ao salvar. Tente novamente." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="weekly-mult" className="text-xs font-medium text-muted-foreground">
          Semanal (× diária)
        </label>
        <input
          id="weekly-mult"
          type="number"
          min={1}
          max={52}
          value={weekly}
          onChange={(e) => setWeekly(e.target.value)}
          className="w-20 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="monthly-mult" className="text-xs font-medium text-muted-foreground">
          Mensal (× diária)
        </label>
        <input
          id="monthly-mult"
          type="number"
          min={1}
          max={90}
          value={monthly}
          onChange={(e) => setMonthly(e.target.value)}
          className="w-20 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
        />
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
