"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

const KEY_TYPE_LABEL: Record<string, string> = {
  PHONE: "Telefone", CPF: "CPF", CNPJ: "CNPJ", EMAIL: "E-mail", RANDOM: "Chave aleatória",
}

interface Props {
  bookingId:  string
  totalPrice: number
  pixKey:     string
  pixKeyType: string | null
  holder:     string | null
  bank:       string | null
}

/**
 * Painel de pagamento PIX manual (fase de validação em staging).
 * O locatário copia a chave da plataforma, paga no app do banco e clica
 * "Já paguei" → registra a declaração; um admin confirma o recebimento.
 */
export function PixPaymentPanel({ bookingId, totalPrice, pixKey, pixKeyType, holder, bank }: Props) {
  const router = useRouter()
  const [copied,  setCopied]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(pixKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Não foi possível copiar. Copie a chave manualmente.")
    }
  }

  async function handleDeclare() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/bookings/${bookingId}/declare-pix`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error?.message ?? "Erro ao informar o pagamento.")
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
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-background p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Chave PIX da ShareO
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 break-all rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground">
            {pixKey}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-foreground hover:bg-surface transition-colors"
            aria-label="Copiar chave PIX"
          >
            {copied ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                Copiado
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copiar
              </>
            )}
          </button>
        </div>
        <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
          {pixKeyType && <div className="flex justify-between"><dt>Tipo de chave</dt><dd className="font-medium text-foreground">{KEY_TYPE_LABEL[pixKeyType] ?? pixKeyType}</dd></div>}
          {holder     && <div className="flex justify-between"><dt>Titular</dt><dd className="font-medium text-foreground">{holder}</dd></div>}
          {bank       && <div className="flex justify-between"><dt>Banco</dt><dd className="font-medium text-foreground">{bank}</dd></div>}
          <div className="flex justify-between"><dt>Valor</dt><dd className="font-bold text-foreground">{fmt(totalPrice)}</dd></div>
        </dl>
      </div>

      <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
        <li>Abra o app do seu banco e escolha pagar com PIX por chave.</li>
        <li>Use a chave acima, confira o titular e pague {fmt(totalPrice)}.</li>
        <li>Volte aqui e toque em <strong>Já paguei</strong> — a ShareO confirmará o recebimento.</li>
      </ol>

      <button
        onClick={handleDeclare}
        disabled={loading}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            Enviando…
          </>
        ) : "Já paguei"}
      </button>

      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  )
}
