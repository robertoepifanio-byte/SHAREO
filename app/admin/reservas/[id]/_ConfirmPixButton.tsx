"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

/**
 * Botão de confirmação de recebimento do PIX (admin) — checkout PIX manual.
 * Marca a reserva como PAID e grava o split financeiro.
 */
export function ConfirmPixButton({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleConfirm() {
    if (!confirm("Confirmar que o pagamento via PIX caiu na conta da ShareO? A reserva será marcada como paga.")) return
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/admin/bookings/${bookingId}/confirm-pix`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error?.message ?? "Erro ao confirmar o pagamento.")
        setLoading(false)
        return
      }
      router.refresh()
    } catch {
      setError("Erro de conexão. Tente novamente.")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleConfirm}
        disabled={loading}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity sm:w-auto sm:px-6"
      >
        {loading ? "Confirmando…" : "Confirmar recebimento do PIX"}
      </button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
