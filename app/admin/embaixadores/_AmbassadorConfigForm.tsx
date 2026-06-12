"use client"

import { useState } from "react"

interface Props {
  bronzeRate:    number  // basis points (300 = 3%)
  silverRate:    number
  goldRate:      number
  payoutEnabled: boolean
}

export function AmbassadorConfigForm({ bronzeRate: b0, silverRate: s0, goldRate: g0, payoutEnabled: p0 }: Props) {
  const [bronze,        setBronze]        = useState(b0 / 100)  // % para exibição
  const [silver,        setSilver]        = useState(s0 / 100)
  const [gold,          setGold]          = useState(g0 / 100)
  const [payoutEnabled, setPayoutEnabled] = useState(p0)
  const [saving,        setSaving]        = useState(false)
  const [msg,           setMsg]           = useState("")
  const [error,         setError]         = useState("")

  async function save() {
    setSaving(true)
    setMsg("")
    setError("")
    try {
      const entries = [
        ["ambassadorBronzeRate",   String(Math.round(bronze * 100))],
        ["ambassadorSilverRate",   String(Math.round(silver * 100))],
        ["ambassadorGoldRate",     String(Math.round(gold   * 100))],
        ["ambassadorPayoutEnabled", payoutEnabled ? "true" : "false"],
      ]
      for (const [key, value] of entries) {
        const res = await fetch(`/api/admin/platform-config?key=${key}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ value }),
        })
        if (!res.ok) { setError("Não foi possível salvar. Tente novamente."); return }
      }
      setMsg("Configurações salvas. Aplicam-se apenas a comissões geradas daqui em diante.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <RateField label="Bronze (1–10 ativos)" icon="🥉" value={bronze} onChange={setBronze} />
        <RateField label="Prata (11–50 ativos)" icon="🥈" value={silver} onChange={setSilver} />
        <RateField label="Ouro (51+ ativos)"    icon="🥇" value={gold}   onChange={setGold} />
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-4">
        <input
          id="payout-toggle"
          type="checkbox"
          checked={payoutEnabled}
          onChange={(e) => setPayoutEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-border text-brand accent-brand"
        />
        <label htmlFor="payout-toggle" className="text-sm font-medium text-foreground cursor-pointer">
          Payout habilitado{" "}
          <span className="font-normal text-muted-foreground">
            (ativar somente após sign-off D4 jurídico)
          </span>
        </label>
      </div>

      {msg   && <p className="text-sm text-success">{msg}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Salvar configurações"}
      </button>

      <p className="text-xs text-muted-foreground">
        Os novos percentuais se aplicam somente a comissões geradas a partir de agora.
        Comissões já geradas não são recalculadas.
      </p>
    </div>
  )
}

function RateField({
  label, icon, value, onChange,
}: {
  label:    string
  icon:     string
  value:    number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        {icon} {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-9 w-24 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-brand transition-colors"
        />
        <span className="text-sm text-muted-foreground">% da taxa</span>
      </div>
    </div>
  )
}
