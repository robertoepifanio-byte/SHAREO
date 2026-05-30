"use client"

/**
 * P1-34 — BookingStatusPoller
 * Faz polling a cada `intervalMs` para checar o status da reserva.
 * Quando o status sair de PENDING, redireciona para /reservas/[id].
 *
 * Renderiza null — é um componente de comportamento puro.
 */

import { useEffect } from "react"
import { useRouter } from "next/navigation"

interface Props {
  bookingId:  string
  intervalMs: number
}

interface BookingStatusResponse {
  data?: { status: string }
  error?: { code: string }
}

export function BookingStatusPoller({ bookingId, intervalMs }: Props) {
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      try {
        const res  = await fetch(`/api/bookings/${bookingId}`, { cache: "no-store" })
        if (!res.ok) return
        const json = (await res.json()) as BookingStatusResponse
        if (json.data && json.data.status !== "PENDING") {
          router.push(`/reservas/${bookingId}`)
        }
      } catch {
        // silently ignore network errors — will retry on next tick
      }
    }

    const id = setInterval(() => { void check() }, intervalMs)
    return () => clearInterval(id)
  }, [bookingId, intervalMs, router])

  return null
}
