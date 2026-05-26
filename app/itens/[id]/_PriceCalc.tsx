"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Props {
  pricePerDay: number // centavos
  itemId:      string
  isLoggedIn:  boolean
}

const COMMISSION = 0.10
const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

export function PriceCalc({ pricePerDay, itemId, isLoggedIn }: Props) {
  const router  = useRouter()
  const today   = new Date().toISOString().split("T")[0]

  const [startDate, setStartDate] = useState("")
  const [endDate,   setEndDate]   = useState("")
  const [note,      setNote]      = useState("")
  const [error,     setError]     = useState("")
  const [pending,   startTransition] = useTransition()

  const days =
    startDate && endDate
      ? Math.max(0, Math.ceil(
          (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000,
        ))
      : 0

  const dailyR   = pricePerDay / 100
  const subtotal = days * dailyR
  const fee      = subtotal * COMMISSION
  const total    = subtotal + fee

  async function solicitar() {
    setError("")
    startTransition(async () => {
      const res = await fetch("/api/bookings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          startDate: new Date(startDate).toISOString(),
          endDate:   new Date(endDate).toISOString(),
          borrowerNote: note || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        const detail = json.error?.details
          ? Object.values(json.error.details).flat().join(" ")
          : json.error?.message ?? "Erro ao solicitar reserva."
        setError(detail)
        return
      }
      router.push(`/reservas/${json.data.id}`)
    })
  }

  return (
    <>
      {/* Seleção de datas */}
      <div className="mb-4 grid grid-cols-2 gap-2.5">
        <div>
          <label
            htmlFor="date-start"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Retirada
          </label>
          <input
            id="date-start"
            type="date"
            min={today}
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value)
              if (endDate && endDate <= e.target.value) setEndDate("")
            }}
            className="h-10 w-full rounded-lg border border-input px-2.5 text-sm text-foreground outline-none focus:border-brand transition-colors"
          />
        </div>
        <div>
          <label
            htmlFor="date-end"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Devolução
          </label>
          <input
            id="date-end"
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-10 w-full rounded-lg border border-input px-2.5 text-sm text-foreground outline-none focus:border-brand transition-colors"
          />
        </div>
      </div>

      {/* Resumo de preço */}
      <div className="mb-4 rounded-lg border border-border bg-background p-3 text-sm" aria-live="polite">
        {days > 0 ? (
          <>
            <div className="mb-1.5 flex justify-between text-muted-foreground">
              <span>{days} dia{days !== 1 ? "s" : ""} × {fmt(dailyR)}</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="mb-1.5 flex justify-between text-muted-foreground">
              <span>Taxa Shareo (10%)</span>
              <span>{fmt(fee)}</span>
            </div>
            <div className="my-2 h-px bg-border" />
            <div className="flex justify-between font-bold text-foreground">
              <span>Total</span>
              <span>{fmt(total)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-muted-foreground">
            <span>Selecione as datas acima</span>
            <span>—</span>
          </div>
        )}
      </div>

      {/* Nota opcional */}
      {days > 0 && isLoggedIn && (
        <div className="mb-4">
          <label htmlFor="borrower-note" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Mensagem ao proprietário (opcional)
          </label>
          <textarea
            id="borrower-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Ex.: Preciso para um evento no fim de semana…"
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand transition-colors placeholder:text-muted-foreground"
          />
        </div>
      )}

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      {/* CTA */}
      {isLoggedIn ? (
        <button
          className="mb-2.5 w-full rounded-lg bg-brand py-3.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          disabled={days === 0 || pending}
          onClick={solicitar}
        >
          {pending ? "Enviando…" : "💬 Solicitar locação"}
        </button>
      ) : (
        <Link
          href={`/login?callbackUrl=/itens/${itemId}`}
          className="mb-2.5 flex w-full items-center justify-center rounded-lg bg-brand py-3.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          💬 Solicitar locação
        </Link>
      )}
    </>
  )
}
