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
  // Baseline do que está salvo no banco — atualizado após cada save bem-sucedido.
  const [saved,         setSaved]         = useState({ bronze: b0 / 100, silver: s0 / 100, gold: g0 / 100, payoutEnabled: p0 })
  const [saving,        setSaving]        = useState(false)
  const [msg,           setMsg]           = useState("")
  const [error,         setError]         = useState("")

  // "Sujo" = algum campo difere do estado salvo. O botão só habilita quando há
  // o que salvar — evita regravar valores idênticos sem querer.
  const isDirty =
    bronze !== saved.bronze ||
    silver !== saved.silver ||
    gold   !== saved.gold   ||
    payoutEnabled !== saved.payoutEnabled

  function togglePayout(checked: boolean) {
    // Habilitar o payout é uma ação sensível (libera pagamento de comissões) e
    // só pode ocorrer após o sign-off D4 jurídico — exige confirmação explícita.
    if (checked && !window.confirm(
      "Habilitar o payout libera o PAGAMENTO das comissões de embaixador.\n\n" +
      "Só ative após o sign-off D4 (jurídico). Deseja realmente habilitar?"
    )) {
      return
    }
    setPayoutEnabled(checked)
  }

  async function save() {
    if (!isDirty) return
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
      // Atualiza a baseline para o novo estado salvo → botão volta a desabilitar.
      setSaved({ bronze, silver, gold, payoutEnabled })
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
          onChange={(e) => togglePayout(e.target.checked)}
          className="form-checkbox h-4 w-4 rounded border-border text-brand accent-brand"
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
        disabled={saving || !isDirty}
        title={!isDirty ? "Nenhuma alteração para salvar" : undefined}
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Salvando…" : isDirty ? "Salvar configurações" : "Sem alterações"}
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
