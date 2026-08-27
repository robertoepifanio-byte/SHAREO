"use client"

import { useState } from "react"

interface Props {
  currentHours: number
  podeEditar:   boolean
  min:          number
  max:          number
  /** Intervalo do cron em horas (usado no texto explicativo). */
  cronIntervalHours: number
}

/**
 * Formulário de configuração do prazo de auto-cancelamento de reservas PENDING.
 *
 * Exibido em /admin/reservas. Visível para ADMIN_SUPERADMIN (editável) e
 * ADMIN_OPERACIONAL (somente leitura) — o PATCH exige SUPERADMIN no servidor.
 *
 * A chave gravada é `autoCancelPendingHours` em PlatformConfig, lida por
 * getAutoCancelConfig() em lib/platform-config.ts e consumida pelo cron
 * app/api/cron/expire-bookings/route.ts.
 */
export function AutoCancelForm({ currentHours, podeEditar, min, max, cronIntervalHours }: Props) {
  const [hours,  setHours]  = useState(String(currentHours))
  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)

    const v = parseInt(hours, 10)
    if (isNaN(v) || v < min || v > max) {
      setMsg({ ok: false, text: `Valor inválido. Use um inteiro entre ${min}h e ${max}h (${max / 24} dias).` })
      setSaving(false)
      return
    }

    try {
      const res = await fetch("/api/admin/platform-config?key=autoCancelPendingHours", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ value: String(v) }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      setMsg({ ok: true, text: `Prazo atualizado para ${v}h. O cron usará o novo valor na próxima execução.` })
      setHours(String(v))
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Erro ao salvar. Tente novamente." })
    } finally {
      setSaving(false)
    }
  }

  const effectiveMax = Number(hours) + cronIntervalHours

  return (
    <div className="space-y-4">
      {podeEditar ? (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="auto-cancel-hours" className="text-xs font-medium text-muted-foreground">
              Prazo (horas)
            </label>
            <input
              id="auto-cancel-hours"
              type="number"
              min={min}
              max={max}
              value={hours}
              onChange={(e) => { setHours(e.target.value); setMsg(null) }}
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
            <p
              className={`text-sm font-medium ${msg.ok ? "text-success" : "text-destructive"}`}
              role="status"
            >
              {msg.text}
            </p>
          )}
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Atualmente <strong className="text-foreground">{currentHours}h</strong>.
          Só o superadmin pode alterar.
        </p>
      )}

      <div className="rounded-lg border border-border bg-background p-4 text-xs text-muted-foreground space-y-1">
        <p>
          <strong className="text-foreground">Como funciona:</strong> reservas com status PENDING há mais de{" "}
          <strong className="text-foreground">{hours || currentHours}h</strong> sem resposta do proprietário são
          canceladas automaticamente.
        </p>
        <p>
          <strong className="text-foreground">Cadência do cron:</strong> o job roda a cada{" "}
          <strong className="text-foreground">{cronIntervalHours}h</strong> (00:20, 06:20, 12:20, 18:20 UTC).
          Isso significa que a janela real de cancelamento é entre{" "}
          <strong className="text-foreground">{hours || currentHours}h</strong> e{" "}
          <strong className="text-foreground">{isNaN(effectiveMax) ? "?" : effectiveMax}h</strong> após a criação da
          reserva — um admin que configurar 2h deve saber que na prática o cancelamento pode ocorrer em até{" "}
          {2 + cronIntervalHours}h.
        </p>
        <p>
          <strong className="text-foreground">Faixa permitida:</strong> {min}h a {max}h ({max / 24} dias).
        </p>
      </div>
    </div>
  )
}
