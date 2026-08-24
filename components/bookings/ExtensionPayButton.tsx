"use client"

import { useState } from "react"
import { formatPrice } from "@/utils/format"

/**
 * Pagamento das diárias extras de uma extensão aceita (ATOR-03).
 *
 * Aparece só quando `extensionStatus === "AWAITING_PAYMENT"`: o proprietário já
 * aceitou, mas a extensão NÃO vale até isto ser pago — o `endDate` só se move
 * quando o webhook confirma.
 *
 * Componente próprio, e não uma variante do PayButton, porque o endpoint é
 * outro: `/api/payments/checkout` cobra o `totalPrice` INTEIRO da locação, e
 * reusá-lo aqui cobraria a reserva de novo.
 */
interface ExtensionPayButtonProps {
  bookingId: string
  amount:    number
  newEndDate: string
}

export function ExtensionPayButton({ bookingId, amount, newEndDate }: ExtensionPayButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handlePay() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch("/api/payments/extension", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ bookingId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error?.message ?? "Erro ao iniciar pagamento.")
        setLoading(false)
        return
      }
      window.location.href = json.data.url
    } catch {
      // 🪤 "Erro de conexão" sem erro de rede aparente costuma ser CSP —
      // ver a regra do connect-src no CLAUDE.md. Aqui a chamada é same-origin.
      setError("Erro de conexão. Tente novamente.")
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-yellow-800">Extensão aceita — falta pagar</p>
        <p className="mt-1 text-xs text-yellow-700">
          O proprietário aceitou estender a devolução para {newEndDate}. O novo prazo
          passa a valer assim que as diárias extras forem pagas.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
        <span className="text-muted-foreground">Diárias extras</span>
        <span className="font-bold text-foreground">{formatPrice(amount)}</span>
      </div>

      <button
        onClick={handlePay}
        disabled={loading}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {loading ? "Redirecionando…" : "Pagar diárias extras"}
      </button>

      {error && (
        <p role="alert" className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
