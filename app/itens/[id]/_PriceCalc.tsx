"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { calcBookingTotal } from "@/lib/pricing"

interface Props {
  pricePerDay:    number           // centavos
  pricePerWeek?:  number | null    // centavos
  pricePerMonth?: number | null    // centavos
  depositAmount?: number | null    // centavos — mostrado no resumo
  itemId:         string
  isLoggedIn:     boolean
}

const COMMISSION = 0.10
const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

/** Monta a linha de breakdown (ex: "2 semanas × R$160 + 3 dias × R$35") */
function buildBreakdown(
  days:          number,
  pricePerDay:   number,
  pricePerWeek?: number | null,
  pricePerMonth?:number | null,
): string {
  if (days >= 30 && pricePerMonth) {
    const months   = Math.floor(days / 30)
    const restDays = days % 30
    const parts: string[] = []
    if (months > 0)   parts.push(`${months} mês${months > 1 ? "es" : ""} × ${fmt(pricePerMonth / 100)}`)
    if (restDays > 0) parts.push(`${restDays} dia${restDays > 1 ? "s" : ""} × ${fmt(pricePerDay / 100)}`)
    return parts.join(" + ")
  }
  if (days >= 7 && pricePerWeek) {
    const weeks    = Math.floor(days / 7)
    const restDays = days % 7
    const parts: string[] = []
    if (weeks > 0)    parts.push(`${weeks} sem${weeks > 1 ? "anas" : "ana"} × ${fmt(pricePerWeek / 100)}`)
    if (restDays > 0) parts.push(`${restDays} dia${restDays > 1 ? "s" : ""} × ${fmt(pricePerDay / 100)}`)
    return parts.join(" + ")
  }
  return `${days} dia${days > 1 ? "s" : ""} × ${fmt(pricePerDay / 100)}`
}

export function PriceCalc({ pricePerDay, pricePerWeek, pricePerMonth, depositAmount, itemId, isLoggedIn }: Props) {
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

  const { totalPrice: subtotalCents, savings: savingsCents } =
    days > 0
      ? calcBookingTotal(days, pricePerDay, pricePerWeek, pricePerMonth)
      : { totalPrice: 0, savings: 0 }

  const subtotal = subtotalCents / 100
  const savings  = savingsCents  / 100
  const fee      = subtotal * COMMISSION
  const total    = subtotal + fee

  const breakdown = days > 0
    ? buildBreakdown(days, pricePerDay, pricePerWeek, pricePerMonth)
    : ""

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
            {/* Breakdown (diário, semanal ou mensal) */}
            <div className="mb-1.5 flex justify-between text-muted-foreground">
              <span className="mr-2 min-w-0 break-words">{breakdown}</span>
              <span className="shrink-0">{fmt(subtotal)}</span>
            </div>

            {/* Desconto por período */}
            {savings > 0 && (
              <div className="mb-1.5 flex justify-between text-xs font-medium text-success">
                <span>🏷️ Desconto por período</span>
                <span>-{fmt(savings)}</span>
              </div>
            )}

            {/* Taxa Shareo */}
            <div className="mb-1.5 flex justify-between text-muted-foreground">
              <span>Taxa Shareo (10%)</span>
              <span>{fmt(fee)}</span>
            </div>

            {/* Caução (se definida) */}
            {depositAmount != null && depositAmount > 0 && (
              <div className="mb-1.5 flex justify-between text-amber-700 text-xs">
                <span className="flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Caução (devolvida)
                </span>
                <span>+{fmt(depositAmount / 100)}</span>
              </div>
            )}

            <div className="my-2 h-px bg-border" />

            <div className="flex justify-between font-bold text-foreground">
              <span>Total do aluguel</span>
              <span>{fmt(total)}</span>
            </div>
            {depositAmount != null && depositAmount > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                <span>Total com caução</span>
                <span>{fmt(total + depositAmount / 100)}</span>
              </div>
            )}
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
