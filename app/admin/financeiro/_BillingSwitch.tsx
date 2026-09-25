"use client"

import { useState } from "react"

interface Props {
  /** PlatformConfig.billingEnabled hoje (ausente = false). */
  enabled:  boolean
  /** Chave Stripe de TESTE: a cobrança funciona sem o interruptor. */
  testMode: boolean
}

/**
 * Interruptor da cobrança REAL — chave `billingEnabled` em PlatformConfig, lida
 * por getBillingConfig() (lib/platform-config.ts) e aplicada em lib/payments/charge-guards.ts.
 *
 * Exibido só ao ADMIN_SUPERADMIN (o PATCH também exige, no servidor). Só vale com
 * chave Stripe live: em chave de teste o checkout abre sempre, e o texto avisa.
 */
export function BillingSwitch({ enabled, testMode }: Props) {
  const [on,     setOn]     = useState(enabled)
  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState<{ ok: boolean; text: string } | null>(null)

  async function handleToggle() {
    const next = !on
    // Abrir é o gesto irreversível na prática (dinheiro real): confirmar.
    if (next && !window.confirm(
      "Abrir a cobrança REAL?\n\nReservas confirmadas passarão a cobrar cartão de verdade " +
      "(com a chave Stripe live). Fechar de novo não devolve o que já foi cobrado.",
    )) return

    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch("/api/admin/platform-config?key=billingEnabled", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ value: next ? "true" : "false" }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      setOn(next)
      setMsg({ ok: true, text: next ? "Cobrança real aberta." : "Cobrança real fechada." })
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Erro ao salvar. Tente novamente." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-foreground">
        Estado:{" "}
        <strong className={on ? "text-success" : "text-destructive"}>
          {on ? "ABERTA" : "FECHADA"}
        </strong>
        {testMode && " — mas a chave Stripe atual é de TESTE, então o checkout funciona de qualquer forma (sem dinheiro real)."}
      </p>
      <button
        type="button"
        onClick={handleToggle}
        disabled={saving}
        className="min-h-11 rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {saving ? "Salvando…" : on ? "Fechar cobrança real" : "Abrir cobrança real"}
      </button>
      {msg && (
        <p role="status" className={`text-sm font-medium ${msg.ok ? "text-success" : "text-destructive"}`}>
          {msg.text}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Com chave Stripe <strong>live</strong> e a cobrança fechada, checkout, extensão e taxa de atraso
        respondem &quot;pagamentos ainda não estão abertos&quot; e nenhuma cobrança NOVA é criada. Pode levar até
        1 minuto para valer em todas as instâncias. Links de pagamento que já foram emitidos continuam valendo até
        expirarem (30 min no checkout; até 24 h na extensão e na taxa de atraso) e, se pagos, são processados
        normalmente. Webhooks e reembolsos seguem funcionando.
      </p>
    </div>
  )
}
