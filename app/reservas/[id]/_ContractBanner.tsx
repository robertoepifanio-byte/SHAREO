"use client"

import { useState } from "react"

interface Props {
  bookingId:       string
  itemTitle:       string
  ownerName:       string
  startDate:       string
  endDate:         string
  totalPrice:      number
  depositAmount:   number | null
  contractSigned:  boolean
}

const fmt = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100)

export function ContractBanner({
  bookingId, itemTitle, ownerName,
  startDate, endDate, totalPrice, depositAmount,
  contractSigned: initialSigned,
}: Props) {
  const [signed,  setSigned]  = useState(initialSigned)
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")

  if (signed) {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span><strong>Contrato assinado digitalmente.</strong> Ambas as partes estão protegidas.</span>
      </div>
    )
  }

  async function sign() {
    setLoading(true); setError("")
    const res  = await fetch(`/api/bookings/${bookingId}/contract`, { method: "POST" })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error?.message ?? "Erro ao assinar."); return }
    setSigned(true); setOpen(false)
  }

  return (
    <>
      {/* Aviso de contrato pendente */}
      <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xl" aria-hidden="true">📄</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">Assinatura do contrato pendente</p>
            <p className="mt-0.5 text-xs text-amber-700">
              Leia e assine o termo de locação para confirmar sua responsabilidade sobre o item.
            </p>
            <button
              onClick={() => setOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
            >
              📝 Ler e assinar contrato
            </button>
          </div>
        </div>
      </div>

      {/* Modal do contrato */}
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface shadow-2xl">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold text-primary">Termo de Locação</h2>
              <p className="text-xs text-muted-foreground">ShareO · Contrato digital</p>
            </div>

            <div className="max-h-80 overflow-y-auto px-6 py-4 text-sm text-foreground leading-relaxed space-y-3">
              <p>Este termo formaliza o acordo de locação entre as partes:</p>
              <ul className="space-y-1 pl-4 list-disc text-muted-foreground">
                <li><strong>Item:</strong> {itemTitle}</li>
                <li><strong>Proprietário:</strong> {ownerName}</li>
                <li><strong>Período:</strong> {new Date(startDate).toLocaleDateString("pt-BR")} a {new Date(endDate).toLocaleDateString("pt-BR")}</li>
                <li><strong>Valor total:</strong> {fmt(totalPrice)}</li>
                {depositAmount ? <li><strong>Caução:</strong> {fmt(depositAmount)} (devolvida após vistoria)</li> : null}
              </ul>
              <p className="font-semibold text-foreground">O locatário se compromete a:</p>
              <ol className="space-y-1 pl-4 list-decimal text-muted-foreground">
                <li>Utilizar o item exclusivamente para o fim acordado.</li>
                <li>Devolver o item na data e condição combinadas.</li>
                <li>Arcar com taxas de atraso em caso de devolução fora do prazo.</li>
                <li>Responsabilizar-se por danos causados ao item durante o período de locação.</li>
                <li>Não sublocar ou transferir o item a terceiros.</li>
              </ol>
              <p className="text-xs text-muted-foreground">
                A ShareO atua como plataforma intermediária e não se responsabiliza por danos
                resultantes da utilização do item. Este contrato tem validade legal nos termos do
                Art. 565 do Código Civil Brasileiro.
              </p>
            </div>

            {error && <p className="px-6 text-xs text-destructive">{error}</p>}

            <div className="flex gap-3 border-t border-border px-6 py-4">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-background transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={sign}
                disabled={loading}
                className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? "Assinando…" : "✅ Aceito e assino"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
