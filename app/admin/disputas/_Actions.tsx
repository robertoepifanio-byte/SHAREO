"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

type Desfecho = "resolve_completed" | "resolve_cancelled" | "dismiss_dispute" | "resolve_partial"

interface Props {
  bookingId: string
}

export function DisputeActions({ bookingId }: Props) {
  const router                = useRouter()
  const [, startTransition]   = useTransition()
  const [loading, setLoading] = useState<string | null>(null)
  const [error,   setError]   = useState("")
  const [note,    setNote]    = useState("")
  // Valor a devolver no desfecho proporcional, em reais (o servidor recebe centavos).
  const [parcial, setParcial] = useState("")
  const [open,    setOpen]    = useState(false)

  async function resolve(action: Desfecho) {
    setError(""); setLoading(action)
    try {
      const res  = await fetch(`/api/admin/disputes/${bookingId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          action,
          adminNote: note.trim() || undefined,
          // Reais → centavos. `Math.round` porque 12,30 vira 1229.9999… em float.
          ...(action === "resolve_partial" && {
            refundAmount: Math.round(parseFloat(parcial.replace(",", ".")) * 100),
          }),
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? "Erro."); return }
      setOpen(false)
      startTransition(() => router.refresh())
    } finally {
      setLoading(null)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-orange-light px-3 py-1 text-xs font-semibold text-orange-link hover:bg-orange-light/80 transition-colors"
      >
        Resolver
      </button>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface p-3 text-xs">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Nota do administrador (obrigatória para encerrar a disputa)…"
        className="w-full resize-none rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:border-brand"
      />
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex gap-1.5">
        <button
          onClick={() => resolve("resolve_completed")}
          disabled={!!loading}
          className="rounded bg-success/10 px-2 py-1 font-semibold text-success hover:bg-success/20 disabled:opacity-50"
        >
          {loading === "resolve_completed" ? "…" : "Concluir"}
        </button>
        <button
          onClick={() => resolve("resolve_cancelled")}
          disabled={!!loading}
          title="Dá ganho de causa ao locatário: cancela a reserva e estorna 100%."
          className="rounded bg-red-50 px-2 py-1 font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
        >
          {loading === "resolve_cancelled" ? "…" : "Cancelar reserva e estornar"}
        </button>
        {/* Terceiro desfecho (Thiago, QA 01/09): encerrar a disputa sem decidir
            nada sobre a locação. O botão ao lado dizia só "Cancelar" e lia-se
            como "cancelar a disputa" — mas cancelava a RESERVA e estornava. */}
        <button
          onClick={() => resolve("dismiss_dispute")}
          disabled={!!loading || !note.trim()}
          title="Encerra a disputa e mantém a locação em curso. Exige justificativa."
          className="rounded bg-muted px-2 py-1 font-semibold text-foreground hover:bg-border disabled:opacity-50"
        >
          {loading === "dismiss_dispute" ? "…" : "Encerrar disputa"}
        </button>
      </div>

      {/* Desfecho PROPORCIONAL — Políticas 3.3 prometem "reembolso parcial", e
          até 01/09/2026 o sistema só sabia tudo-ou-nada. Um item devolvido
          funcionando mas riscado não tinha desfecho no meio do caminho. */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
        <label htmlFor="disputa-parcial" className="text-foreground/70">
          Devolver ao locatário: R$
        </label>
        <input
          id="disputa-parcial"
          type="text"
          inputMode="decimal"
          value={parcial}
          onChange={(e) => setParcial(e.target.value.replace(/[^\d.,]/g, ""))}
          placeholder="0,00"
          className="w-24 rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:border-brand"
        />
        <button
          onClick={() => resolve("resolve_partial")}
          disabled={!!loading || !note.trim() || !parcial.trim()}
          title="Estorna esse valor ao locatário e repassa o restante ao proprietário. Exige justificativa."
          className="rounded bg-blue-medium/10 px-2 py-1 font-semibold text-blue-medium hover:bg-blue-medium/20 disabled:opacity-50"
        >
          {loading === "resolve_partial" ? "…" : "Dividir"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded bg-muted px-2 py-1 text-foreground/60 hover:bg-border"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}
