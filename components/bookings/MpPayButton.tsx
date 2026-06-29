"use client"

import { useState } from "react"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { formatPrice } from "@/utils/format"

/**
 * Botão "Pagar com Mercado Pago" (Modelo B / Checkout Pro — ADR-026).
 * Cria a preference com split no backend e redireciona o locatário para o
 * checkout hospedado do MP (PIX/cartão/boleto). Só é renderizado quando a flag
 * mercadoPagoEnabled está ativa.
 */
export function MpPayButton({ bookingId, totalPrice }: { bookingId: string; totalPrice: number }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handlePay() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch("/api/payments/mp/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ bookingId }),
      })
      const json = await res.json()
      if (!res.ok || !json?.data?.url) {
        setError(json?.error?.message ?? "Não foi possível iniciar o pagamento.")
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
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg bg-background px-4 py-3 text-sm">
        <span className="text-muted-foreground">Valor a pagar</span>
        <span className="font-bold text-foreground">{formatPrice(totalPrice)}</span>
      </div>
      <button
        onClick={handlePay}
        disabled={loading}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {loading ? (
          <>
            <LoadingSpinner size="sm" />
            Redirecionando…
          </>
        ) : "Pagar com Mercado Pago"}
      </button>
      <p className="text-center text-xs text-muted-foreground">PIX, cartão ou boleto · ambiente seguro do Mercado Pago</p>
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  )
}
