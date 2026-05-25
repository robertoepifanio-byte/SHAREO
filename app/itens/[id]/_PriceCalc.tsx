"use client"

import { useState } from "react"
import Link from "next/link"

interface Props {
  pricePerDay:  number // centavos
  itemId:       string
  isLoggedIn:   boolean
}

const COMMISSION = 0.10
const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

export function PriceCalc({ pricePerDay, itemId, isLoggedIn }: Props) {
  const today = new Date().toISOString().split("T")[0]

  const [startDate, setStartDate] = useState("")
  const [endDate,   setEndDate]   = useState("")

  const days =
    startDate && endDate
      ? Math.max(
          0,
          Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0

  const dailyR   = pricePerDay / 100
  const subtotal = days * dailyR
  const fee      = subtotal * COMMISSION
  const total    = subtotal + fee

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
      <div
        className="mb-4 rounded-lg border border-border bg-background p-3 text-sm"
        aria-live="polite"
      >
        {days > 0 ? (
          <>
            <div className="mb-1.5 flex justify-between text-muted-foreground">
              <span>
                {days} dia{days !== 1 ? "s" : ""} × {fmt(dailyR)}
              </span>
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

      {/* CTA */}
      {isLoggedIn ? (
        <button
          className="mb-2.5 w-full rounded-lg bg-brand py-3.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          disabled={days === 0}
          onClick={() => {
            /* TODO Sprint 3: POST /api/bookings */
            alert("Funcionalidade em breve!")
          }}
        >
          💬 Solicitar locação
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
