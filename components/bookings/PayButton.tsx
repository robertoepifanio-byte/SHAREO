"use client"

import { useState } from "react"

interface PayButtonProps {
  bookingId: string
}

export function PayButton({ bookingId }: PayButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handlePay() {
    setLoading(true)
    setError(null)

    try {
      const res  = await fetch("/api/payments/checkout", {
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

      // Redirecionar para o Stripe Checkout
      window.location.href = json.data.url
    } catch {
      setError("Erro de conexão. Tente novamente.")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handlePay}
        disabled={loading}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Redirecionando…
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            Pagar agora
          </>
        )}
      </button>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Pagamento seguro via{" "}
        <span className="font-semibold text-foreground">Stripe</span>
        {" "}· Seus dados são protegidos
      </p>
    </div>
  )
}
