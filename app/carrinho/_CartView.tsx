"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { calcBookingTotal } from "@/lib/pricing"
import { useCart } from "@/components/cart/useCart"
import { removeFromCart, clearCart } from "@/lib/cart"
import { trackEvent } from "@/components/analytics/GoogleAnalytics"

interface Props {
  feeRatePct:       number
  checkoutMaxCents: number
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

// Data local de hoje (não UTC): permite locação no MESMO dia e evita o bug de
// "virar o dia" à noite no Brasil que o toISOString() causaria.
function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function CartView({ feeRatePct, checkoutMaxCents }: Props) {
  const router = useRouter()
  const { cart, hydrated } = useCart()

  const [startDate, setStartDate] = useState("")
  const [numDays,   setNumDays]   = useState(1)
  const [note,      setNote]      = useState("")
  const [coupon,    setCoupon]    = useState("")
  const [error,     setError]     = useState("")
  const [needsComplete, setNeedsComplete] = useState(false)
  const [pending, startTransition] = useTransition()

  const minDate = todayISO()
  const endDate = useMemo(() => (startDate ? addDays(startDate, numDays) : ""), [startDate, numDays])

  const items = useMemo(() => cart?.items ?? [], [cart])

  // Preço por item no período escolhido (estimativa; o servidor recalcula no POST)
  const lines = useMemo(
    () =>
      items.map((it) => ({
        ...it,
        lineTotal:
          numDays > 0 ? calcBookingTotal(numDays, it.pricePerDay, it.pricePerWeek, it.pricePerMonth).totalPrice : 0,
      })),
    [items, numDays],
  )
  const subtotalCents = lines.reduce((s, l) => s + l.lineTotal, 0)
  const depositCents  = items.reduce((s, i) => s + (i.depositAmount ?? 0), 0)
  const overLimit     = subtotalCents > checkoutMaxCents
  const feeLabel      = feeRatePct % 1 === 0 ? feeRatePct.toFixed(0) : String(feeRatePct)
  const isReady       = !!startDate && numDays > 0 && items.length > 0 && !overLimit

  function solicitar() {
    if (!cart || cart.items.length === 0) return
    setError("")
    setNeedsComplete(false)
    startTransition(async () => {
      const [first, ...rest] = cart.items
      const res = await fetch("/api/bookings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: first.itemId,
          additionalItemIds: rest.map((i) => i.itemId),
          startDate: new Date(`${startDate}T12:00:00`).toISOString(),
          endDate:   new Date(`${endDate}T12:00:00`).toISOString(),
          borrowerNote: note || undefined,
          couponCode:   coupon.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.error?.code === "REGISTRATION_INCOMPLETE") {
          setNeedsComplete(true)
          setError(json.error?.message ?? "Complete seu cadastro para alugar.")
          return
        }
        const detail = json.error?.details
          ? Object.values(json.error.details).flat().join(" ")
          : json.error?.message ?? "Erro ao solicitar a locação."
        setError(detail)
        return
      }
      trackEvent({ name: "booking_started", params: { item_id: first.itemId, price: subtotalCents / 100 } })
      clearCart()
      router.push(`/reservas/${json.data.id}`)
    })
  }

  if (!hydrated) {
    return <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">Carregando…</div>
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted-foreground">Sua locação está vazia.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Abra um item e use <strong>“Adicionar a uma locação”</strong> para juntar vários itens do mesmo anunciante.
        </p>
        <Link
          href="/itens"
          className="mt-4 inline-flex h-11 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Explorar itens
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Anunciante */}
      <p className="text-sm text-muted-foreground">
        Anunciante: <strong className="text-foreground">{cart?.ownerName}</strong>
      </p>

      {/* Itens */}
      <ul className="space-y-3">
        {lines.map((l) => (
          <li key={l.itemId} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
              {l.image ? (
                <Image src={l.image} alt={l.title} fill sizes="64px" className="object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/itens/${l.itemId}`} className="line-clamp-1 text-sm font-semibold text-foreground hover:text-brand">
                {l.title}
              </Link>
              <p className="text-xs text-muted-foreground">{fmt(l.pricePerDay)}/dia</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">{numDays > 0 ? fmt(l.lineTotal) : "—"}</p>
              <button
                type="button"
                onClick={() => removeFromCart(l.itemId)}
                className="mt-0.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Remover
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Período */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Período da locação</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="cart-start" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Retirada
            </label>
            <input
              id="cart-start"
              type="date"
              min={minDate}
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setError("") }}
              className="h-10 w-full rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus:border-brand transition-colors"
            />
          </div>
          <div>
            <label htmlFor="cart-days" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Dias
            </label>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setNumDays((n) => Math.max(1, n - 1))}
                className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg border border-input text-lg text-muted-foreground hover:bg-background" aria-label="Diminuir">−</button>
              <input
                id="cart-days"
                type="number" min={1} max={365} value={numDays}
                onChange={(e) => setNumDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
                className="h-10 w-full rounded-lg border border-input bg-surface px-2 text-center text-sm font-semibold text-foreground outline-none focus:border-brand"
              />
              <button type="button" onClick={() => setNumDays((n) => Math.min(365, n + 1))}
                className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg border border-input text-lg text-muted-foreground hover:bg-background" aria-label="Aumentar">+</button>
            </div>
          </div>
        </div>
        {endDate && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Devolução em <strong className="text-foreground">{fmtDate(endDate)}</strong> — todos os itens no mesmo período.
          </p>
        )}
      </div>

      {/* Resumo */}
      <div className="rounded-xl border border-border bg-surface p-4 text-sm" aria-live="polite">
        <div className="mb-1.5 flex justify-between text-muted-foreground">
          <span>{items.length} {items.length === 1 ? "item" : "itens"} × {numDays} {numDays === 1 ? "dia" : "dias"}</span>
          <span>{startDate ? fmt(subtotalCents) : "—"}</span>
        </div>
        {depositCents > 0 && (
          <div className="mb-1.5 flex justify-between text-xs text-amber-700">
            <span>Caução (devolvida)</span>
            <span>+{fmt(depositCents)}</span>
          </div>
        )}
        <div className="my-2 h-px bg-border" />
        <div className="flex justify-between font-bold text-foreground">
          <span>Total do aluguel</span>
          <span>{startDate ? fmt(subtotalCents) : "—"}</span>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          Você paga apenas o valor da locação. A ShareO retém {feeLabel}% do repasse ao proprietário.
        </p>
      </div>

      {/* Nota + cupom */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="cart-note" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Mensagem ao proprietário (opcional)
          </label>
          <textarea id="cart-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand" />
        </div>
        <div>
          <label htmlFor="cart-coupon" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cupom (opcional)
          </label>
          <input id="cart-coupon" type="text" maxLength={30} autoComplete="off" value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm uppercase text-foreground outline-none focus:border-brand" />
        </div>
      </div>

      {/* Teto R$500 */}
      {overLimit && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <span aria-hidden="true">⚠️</span>
          <span>
            O total excede o limite de <strong>{fmt(checkoutMaxCents)}</strong> por locação.
            Remova um item ou reduza os dias.
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          <p>{error}</p>
          {needsComplete && (
            <Link href="/cadastro/completar?callbackUrl=/carrinho" className="mt-1.5 inline-block font-semibold text-brand hover:underline">
              Completar cadastro →
            </Link>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={solicitar}
          disabled={!isReady || pending}
          className="flex-1 rounded-lg bg-brand py-3.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {pending ? "Enviando…" : "💬 Solicitar locação"}
        </button>
        <button
          type="button"
          onClick={() => { if (window.confirm("Esvaziar a locação?")) clearCart() }}
          className="rounded-lg border border-border px-4 py-3.5 text-sm font-medium text-muted-foreground hover:bg-surface transition-colors"
        >
          Esvaziar
        </button>
      </div>
    </div>
  )
}
