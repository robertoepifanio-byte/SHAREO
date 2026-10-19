"use client"

import { useState } from "react"
import { formatPrice } from "@/utils/format"

/**
 * Pagamento da taxa de atraso pela tela da reserva (só o locatário vê).
 *
 * A Checkout Session da multa vale 24h; este botão pede uma nova ao servidor
 * (que recalcula o valor — o cliente não envia nada) e redireciona.
 * `amount` é só o que se mostra: o que a Stripe cobra vem da rota.
 */
export function LateFeePayButton({ bookingId, amount }: { bookingId: string; amount: number }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handlePay() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/bookings/${bookingId}/late-fee/pay`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error?.message ?? "Erro ao iniciar pagamento.")
        setLoading(false)
        return
      }
      window.location.href = json.data.url
    } catch {
      setError("Erro de conexão. Tente novamente.")
      setLoading(false)
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {loading ? "Redirecionando…" : `Pagar taxa de atraso (${formatPrice(amount)})`}
      </button>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
