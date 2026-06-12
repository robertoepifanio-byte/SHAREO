"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { calcBookingTotal } from "@/lib/pricing"

interface Props {
  pricePerDay:      number
  pricePerWeek?:    number | null
  pricePerMonth?:   number | null
  depositAmount?:   number | null
  itemId:           string
  isLoggedIn:       boolean
  feeRatePct:       number   // ex: 15.0 para 15%
  checkoutMaxCents: number   // teto por transação (D2) — ex: 50000 = R$500
}

type Mode = "daily" | "weekly" | "monthly"

// feeRatePct vem como prop do Server Component pai (ex: 15.0)

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

/** Adiciona N dias a uma data ISO (YYYY-MM-DD) */
function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

function buildBreakdown(
  days:           number,
  pricePerDay:    number,
  pricePerWeek?:  number | null,
  pricePerMonth?: number | null,
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

export function PriceCalc({
  pricePerDay, pricePerWeek, pricePerMonth,
  depositAmount, itemId, isLoggedIn, feeRatePct, checkoutMaxCents,
}: Props) {
  const router = useRouter()
  const today  = new Date().toISOString().split("T")[0]

  const availableModes: Mode[] = [
    "daily",
    ...(pricePerWeek  ? ["weekly"  as Mode] : []),
    ...(pricePerMonth ? ["monthly" as Mode] : []),
  ]

  const [mode,      setMode]      = useState<Mode>("daily")
  const [startDate, setStartDate] = useState("")
  const [numDays,   setNumDays]   = useState(1)
  const [note,      setNote]      = useState("")
  const [error,     setError]     = useState("")
  const [pending,   startTransition] = useTransition()

  // Data de devolução calculada automaticamente
  const endDate = useMemo(() => {
    if (!startDate) return ""
    if (mode === "weekly")  return addDays(startDate, 7)
    if (mode === "monthly") return addDays(startDate, 30)
    return addDays(startDate, numDays)
  }, [startDate, mode, numDays])

  const days = useMemo(() => {
    if (!startDate) return 0
    if (mode === "weekly")  return 7
    if (mode === "monthly") return 30
    return numDays
  }, [startDate, mode, numDays])

  const { totalPrice: subtotalCents, savings: savingsCents } =
    days > 0
      ? calcBookingTotal(days, pricePerDay, pricePerWeek, pricePerMonth)
      : { totalPrice: 0, savings: 0 }

  const subtotal  = subtotalCents / 100
  const savings   = savingsCents  / 100
  const fee       = subtotal * (feeRatePct / 100)
  const total     = subtotal + fee
  const breakdown = days > 0
    ? buildBreakdown(days, pricePerDay, pricePerWeek, pricePerMonth)
    : ""

  // Teto D2: o checkout compara booking.totalPrice (subtotal, sem taxa) com o teto
  const overLimit      = subtotalCents > checkoutMaxCents
  const checkoutMaxFmt = fmt(checkoutMaxCents / 100)

  const isReady = !!startDate && days > 0 && !overLimit

  function handleModeChange(m: Mode) {
    setMode(m)
    setError("")
    if (m === "daily") setNumDays(1)
  }

  function handleStartChange(val: string) {
    setStartDate(val)
    setError("")
  }

  async function solicitar() {
    setError("")
    startTransition(async () => {
      const res = await fetch("/api/bookings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          startDate: new Date(`${startDate}T12:00:00`).toISOString(),
          endDate:   new Date(`${endDate}T12:00:00`).toISOString(),
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

  const MODE_PRICE: Record<Mode, { label: string; price: number; unit: string }> = {
    daily:   { label: "Diário",  price: pricePerDay,          unit: "/dia" },
    weekly:  { label: "Semanal", price: pricePerWeek  ?? 0,   unit: "/sem" },
    monthly: { label: "Mensal",  price: pricePerMonth ?? 0,   unit: "/mês" },
  }

  return (
    <>
      {/* Preço + seleção de modalidade */}
      {availableModes.length === 1 ? (
        /* Apenas diário — exibe preço estático */
        <div className="mb-5 flex items-baseline gap-1">
          <span className="text-3xl font-extrabold text-foreground">{fmt(pricePerDay / 100)}</span>
          <span className="text-sm text-muted-foreground">/dia</span>
        </div>
      ) : (
        /* Múltiplas modalidades — tabs clicáveis com preço */
        <div className="mb-5 flex gap-2">
          {availableModes.map((m) => {
            const { label, price, unit } = MODE_PRICE[m]
            const active = mode === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => handleModeChange(m)}
                className={`flex flex-1 flex-col items-center rounded-xl border py-3 px-2 transition-all ${
                  active
                    ? "border-brand bg-brand/5 shadow-sm"
                    : "border-border bg-background hover:border-brand/40 hover:bg-brand/5"
                }`}
              >
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${active ? "text-brand" : "text-muted-foreground"}`}>
                  {label}
                </span>
                <span className={`mt-0.5 text-base font-extrabold leading-tight ${active ? "text-foreground" : "text-muted-foreground"}`}>
                  {fmt(price / 100)}
                </span>
                <span className={`text-[10px] ${active ? "text-brand" : "text-muted-foreground"}`}>
                  {unit}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Data de retirada */}
      <div className="mb-3">
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
          onChange={(e) => handleStartChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-input px-2.5 text-sm text-foreground outline-none focus:border-brand transition-colors"
        />
      </div>

      {/* Quantidade de dias (só no modo diário) */}
      {mode === "daily" && (
        <div className="mb-3">
          <label
            htmlFor="num-days"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Quantidade de dias
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNumDays((n) => Math.max(1, n - 1))}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-input text-lg text-muted-foreground hover:bg-background transition-colors"
              aria-label="Diminuir"
            >
              −
            </button>
            <input
              id="num-days"
              type="number"
              min={1}
              max={365}
              value={numDays}
              onChange={(e) => setNumDays(Math.max(1, parseInt(e.target.value) || 1))}
              className="h-10 w-full rounded-lg border border-input px-2.5 text-center text-sm font-semibold text-foreground outline-none focus:border-brand transition-colors"
            />
            <button
              type="button"
              onClick={() => setNumDays((n) => Math.min(365, n + 1))}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-input text-lg text-muted-foreground hover:bg-background transition-colors"
              aria-label="Aumentar"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Data de devolução — calculada automaticamente */}
      <div className="mb-4">
        <label
          htmlFor="date-end"
          className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Devolução
          <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal normal-case text-muted-foreground">
            calculado automaticamente
          </span>
        </label>
        <div
          id="date-end"
          className="flex h-10 w-full items-center rounded-lg border border-input bg-muted/40 px-2.5 text-sm text-foreground"
          aria-readonly="true"
        >
          {endDate ? fmtDate(endDate) : <span className="text-muted-foreground">—</span>}
        </div>
        {endDate && (
          <p className="mt-1 text-[10px] text-muted-foreground">
            {mode === "daily"
              ? `Retirada + ${numDays} dia${numDays > 1 ? "s" : ""} — devolução no mesmo horário da retirada`
              : mode === "weekly"
              ? "Retirada + 7 dias — devolução no mesmo horário da retirada"
              : "Retirada + 30 dias — devolução no mesmo horário da retirada"}
          </p>
        )}
      </div>

      {/* Resumo de preço */}
      <div className="mb-4 rounded-lg border border-border bg-background p-3 text-sm" aria-live="polite">
        {days > 0 && startDate ? (
          <>
            <div className="mb-1.5 flex justify-between text-muted-foreground">
              <span className="mr-2 min-w-0 break-words">{breakdown}</span>
              <span className="shrink-0">{fmt(subtotal)}</span>
            </div>

            {savings > 0 && (
              <div className="mb-1.5 flex justify-between text-xs font-medium text-success">
                <span>🏷️ Desconto por período</span>
                <span>-{fmt(savings)}</span>
              </div>
            )}

            <div className="mb-1.5 flex justify-between text-muted-foreground">
              <span>Taxa Shareo ({feeRatePct % 1 === 0 ? feeRatePct.toFixed(0) : feeRatePct}%)</span>
              <span>{fmt(fee)}</span>
            </div>

            {depositAmount != null && depositAmount > 0 && (
              <div className="mb-1.5 flex justify-between text-xs text-amber-700">
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
              <div className="mt-0.5 flex justify-between text-xs text-muted-foreground">
                <span>Total com caução</span>
                <span>{fmt(total + depositAmount / 100)}</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex justify-between text-muted-foreground">
            <span>Selecione a data de retirada</span>
            <span>—</span>
          </div>
        )}
      </div>

      {/* Nota opcional */}
      {isReady && isLoggedIn && (
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

      {/* Aviso de teto por transação (D2) */}
      {overLimit && (
        <div role="alert" className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>
            O total excede o limite de <strong>{checkoutMaxFmt}</strong> por locação.
            Reduza a quantidade de dias ou escolha outra modalidade.
          </span>
        </div>
      )}

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      {/* CTA */}
      {isLoggedIn ? (
        <button
          className="mb-2.5 w-full rounded-lg bg-brand py-3.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          disabled={!isReady || pending}
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
