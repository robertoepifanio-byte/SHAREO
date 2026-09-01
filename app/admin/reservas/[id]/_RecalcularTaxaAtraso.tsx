"use client"

/**
 * Recálculo manual da taxa de atraso — só admin.
 *
 * O cálculo automático para no teto de 30 dias. Depois disso o valor só muda
 * aqui, com justificativa, e o registro vai para o adminLog. Deliberadamente
 * não existe equivalente na tela do proprietário: seria uma parte aumentando a
 * dívida da outra sem mediação.
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

type Resposta = {
  dias: number
  valor: number
  emitida: boolean
  motivo: string | null
  anterior: number | null
}

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export function RecalcularTaxaAtraso({ bookingId }: { bookingId: string }) {
  const router                 = useRouter()
  const [, startTransition]    = useTransition()
  const [aberto,  setAberto]   = useState(false)
  const [nota,    setNota]     = useState("")
  const [loading, setLoading]  = useState(false)
  const [erro,    setErro]     = useState("")
  const [ok,      setOk]       = useState<Resposta | null>(null)

  async function recalcular() {
    setErro(""); setLoading(true)
    try {
      const res  = await fetch(`/api/admin/bookings/${bookingId}/late-fee`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ adminNote: nota.trim() }),
      })
      const json = await res.json()
      if (!res.ok) { setErro(json.error?.message ?? "Erro."); return }
      setOk(json.data as Resposta)
      setNota("")
      startTransition(() => router.refresh())
    } catch {
      setErro("Erro de conexão.")
    } finally {
      setLoading(false)
    }
  }

  if (ok) {
    return (
      <div className="rounded-lg border border-border bg-surface p-3 text-xs">
        <p className="font-semibold text-foreground">
          {ok.emitida
            ? `Nova cobrança emitida: ${brl(ok.valor)} (${ok.dias} dias)`
            : "Nada a alterar"}
        </p>
        <p className="mt-0.5 text-muted-foreground">
          {ok.emitida
            ? `Valor anterior: ${ok.anterior != null ? brl(ok.anterior) : "—"}. O locatário recebeu o novo link por e-mail.`
            : ok.motivo === "COBRANCA_ATUAL_VIVA"
              ? "A cobrança em aberto já está pelo valor correto."
              : `Não emitida (${ok.motivo}).`}
        </p>
        <button onClick={() => setOk(null)} className="mt-2 text-muted-foreground hover:text-foreground">
          Fechar
        </button>
      </div>
    )
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="rounded-md bg-orange-light px-3 py-1 text-xs font-semibold text-orange-link hover:bg-orange-light/80 transition-colors"
      >
        Recalcular taxa de atraso
      </button>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface p-3 text-xs">
      <p className="text-muted-foreground">
        Recalcula a taxa pelos dias de atraso reais, sem o teto de 30 dias do cálculo
        automático, e emite uma cobrança nova. A cobrança anterior é invalidada.
      </p>
      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Motivo do recálculo (obrigatório)…"
        className="w-full resize-none rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:border-brand"
      />
      {erro && <p className="text-red-600">{erro}</p>}
      <div className="flex gap-1.5">
        <button
          onClick={recalcular}
          disabled={loading || nota.trim().length < 10}
          className="rounded bg-brand px-2 py-1 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "…" : "Recalcular e cobrar"}
        </button>
        <button
          onClick={() => { setAberto(false); setErro("") }}
          className="rounded bg-muted px-2 py-1 text-foreground/60 hover:bg-border"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
